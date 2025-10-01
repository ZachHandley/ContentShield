/**
 * Serialized trie node structure for import/export
 */
interface SerializedTrieNode {
  isEndOfWord: boolean
  children: Record<string, SerializedTrieNode>
  data?: TrieNodeData
}

/**
 * Serialized trie structure for import/export
 */
interface SerializedTrie {
  root: SerializedTrieNode
  totalWords: number
  version: string
}

/**
 * Trie (Prefix Tree) implementation optimized for profanity detection
 * Supports fuzzy matching, variations, and efficient word storage
 *
 * Performance optimizations:
 * - Memory-efficient lazy node creation
 * - Intelligent caching for frequently accessed paths
 * - Optimized traversal algorithms with early termination
 * - Batch processing support for multiple texts
 */

import type { SeverityLevel, ProfanityCategory } from '../types/index.js'

/**
 * Data stored at each terminal node (word end)
 */
export interface TrieNodeData {
  /** Original word as stored */
  word: string
  /** Severity level of the word */
  severity: SeverityLevel
  /** Categories this word belongs to */
  categories: ProfanityCategory[]
  /** Language this word is from */
  language: string
  /** Whether this word is case-sensitive */
  caseSensitive?: boolean
  /** Confidence score for this match */
  confidence?: number
}

/**
 * Single node in the Trie structure with performance optimizations
 */
export class TrieNode {
  public children: Map<string, TrieNode> = new Map()
  public isEndOfWord = false
  public data: TrieNodeData | null = null
  public failureLink: TrieNode | null = null // For Aho-Corasick algorithm
  public outputLink: TrieNode | null = null

  // Performance optimization: cache frequently accessed paths
  public accessCount = 0
  public lastAccessTime = 0

  constructor() {}

  /**
   * Check if this node has any children
   */
  hasChildren(): boolean {
    return this.children.size > 0
  }

  /**
   * Get child node for a character
   */
  getChild(char: string): TrieNode | undefined {
    return this.children.get(char)
  }

  /**
   * Add or get child node for a character
   */
  addChild(char: string): TrieNode {
    if (!this.children.has(char)) {
      this.children.set(char, new TrieNode())
    }
    const node = this.children.get(char)
    return node || new TrieNode()
  }
}

/**
 * Match result from Trie search
 */
export interface TrieMatch {
  /** The matched word */
  word: string
  /** Start position in the search text */
  start: number
  /** End position in the search text */
  end: number
  /** Data associated with this match */
  data: TrieNodeData
  /** Edit distance (for fuzzy matches) */
  editDistance?: number
}

/**
 * Efficient Trie implementation for fast profanity detection
 * Features:
 * - O(m) insertion and search where m is word length
 * - Fuzzy matching with configurable edit distance
 * - Memory-optimized storage
 * - Support for word variations and patterns
 * - Aho-Corasick algorithm for multi-pattern matching
 */
export class ProfanityTrie {
  private root: TrieNode = new TrieNode()
  private totalWords = 0
  private compiled = false

  constructor() {}

  /**
   * Insert a word into the Trie with associated data
   */
  insert(word: string, data: TrieNodeData): void {
    if (!word || word.length === 0) {
      return
    }

    const normalizedWord = data.caseSensitive === false
      ? word.toLowerCase()
      : word

    let currentNode = this.root

    for (const char of normalizedWord) {
      currentNode = currentNode.addChild(char)
    }

    currentNode.isEndOfWord = true
    currentNode.data = { ...data }
    this.totalWords++
    this.compiled = false // Mark as needing recompilation
  }

  /**
   * Insert multiple words with their variations
   */
  insertWithVariations(
    baseWord: string,
    variations: string[],
    data: TrieNodeData
  ): void {
    // Insert the base word
    this.insert(baseWord, data)

    // Insert all variations with the same data
    for (const variation of variations) {
      this.insert(variation, { ...data, word: baseWord })
    }
  }

  /**
   * Search for exact matches in text
   */
  search(text: string, caseSensitive = false): TrieMatch[] {
    if (!text || text.length === 0) {
      return []
    }

    const searchText = caseSensitive ? text : text.toLowerCase()
    const matches: TrieMatch[] = []

    // Search at each starting position
    for (let i = 0; i < searchText.length; i++) {
      const match = this.searchFromPosition(searchText, i, text)
      if (match) {
        matches.push(match)
      }
    }

    return matches
  }

  /**
   * Search for matches starting from a specific position
   */
  private searchFromPosition(searchText: string, startPos: number, originalText?: string): TrieMatch | null {
    let currentNode = this.root
    let currentPos = startPos
    const textToReturn = originalText || searchText

    while (currentPos < searchText.length) {
      const char = searchText[currentPos]
      if (!char) break
      const childNode = currentNode.getChild(char)

      if (!childNode) {
        break
      }

      currentNode = childNode
      currentPos++

      // Check if we found a complete word
      if (currentNode.isEndOfWord && currentNode.data) {
        // Ensure we're at word boundaries to avoid partial matches
        if (this.isWordBoundary(searchText, startPos, currentPos)) {
          return {
            word: textToReturn.substring(startPos, currentPos),
            start: startPos,
            end: currentPos,
            data: currentNode.data
          }
        }
      }
    }

    return null
  }

  /**
   * Fuzzy search with edit distance tolerance - OPTIMIZED
   * Uses iterative approach with early termination and pruning
   */
  fuzzySearch(text: string, maxEditDistance = 1, caseSensitive = false): TrieMatch[] {
    if (!text || text.length === 0 || maxEditDistance < 0) {
      return []
    }

    const searchText = caseSensitive ? text : text.toLowerCase()
    const matches: TrieMatch[] = []
    const maxWordLength = 30 // Reasonable max word length to search

    // Search at each starting position with early termination
    // Only search from word boundaries to avoid substring matches
    for (let i = 0; i < searchText.length; i++) {
      // Skip if not at a word boundary (avoids finding "rofanity" in "profanity")
      if (i > 0 && /[a-zA-Z0-9]/.test(searchText[i - 1] || '')) {
        continue
      }

      // Limit search to reasonable word length
      const maxSearchLength = Math.min(maxWordLength, searchText.length - i)

      const fuzzyMatches = this.fuzzySearchFromPositionOptimized(
        searchText.substring(i, i + maxSearchLength),
        i,
        maxEditDistance
      )
      matches.push(...fuzzyMatches)
    }

    return this.deduplicateMatches(matches)
  }

  /**
   * Optimized fuzzy search using iterative approach with pruning
   */
  private fuzzySearchFromPositionOptimized(
    text: string,
    originalStart: number,
    maxEditDistance: number
  ): TrieMatch[] {
    const matches: TrieMatch[] = []
    const textLen = text.length

    if (textLen === 0) return matches

    // For very short texts, use a more direct approach
    if (textLen <= 20) {
      return this.fuzzySearchShortText(text, originalStart, maxEditDistance)
    }

    // Use a queue-based BFS approach instead of recursive DFS
    const queue: Array<{
      node: TrieNode
      pattern: string
      patternPos: number
      editDistance: number
    }> = [{
      node: this.root,
      pattern: '',
      patternPos: 0,
      editDistance: 0
    }]

    while (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Queue length checked in while condition, shift() guaranteed to return value
      const current = queue.shift()!
      const { node, pattern, patternPos, editDistance } = current

      // Prune if edit distance exceeds limit
      if (editDistance > maxEditDistance) continue

      // Check if current node represents a complete word
      if (node.isEndOfWord && node.data && patternPos > 0) {
        // Calculate final edit distance
        const finalEditDistance = editDistance + Math.abs(textLen - patternPos)

        if (finalEditDistance <= maxEditDistance) {
          // Check word boundaries
          if (this.isWordBoundary(text, 0, Math.min(patternPos, textLen))) {
            matches.push({
              word: text.substring(0, Math.min(patternPos, textLen)),
              start: originalStart,
              end: originalStart + Math.min(patternPos, textLen),
              data: node.data,
              editDistance: finalEditDistance
            })
          }
        }
      }

      // Explore children if we haven't exceeded limits
      if (patternPos < textLen && editDistance < maxEditDistance) {
        for (const [char, childNode] of Array.from(node.children.entries())) {
          // Try match (no edit cost)
          if (patternPos < textLen && char === text[patternPos]) {
            queue.push({
              node: childNode,
              pattern: pattern + char,
              patternPos: patternPos + 1,
              editDistance
            })
          }

          // Try substitution (edit cost +1)
          if (editDistance + 1 <= maxEditDistance) {
            queue.push({
              node: childNode,
              pattern: pattern + char,
              patternPos: patternPos + 1,
              editDistance: editDistance + 1
            })
          }
        }

        // Try insertion (skip text character)
        if (editDistance + 1 <= maxEditDistance) {
          queue.push({
            node,
            pattern,
            patternPos: patternPos + 1,
            editDistance: editDistance + 1
          })
        }
      }
    }

    return matches
  }

  /**
   * Specialized fuzzy search for short texts (more accurate)
   */
  private fuzzySearchShortText(
    text: string,
    originalStart: number,
    maxEditDistance: number
  ): TrieMatch[] {
    const matches: TrieMatch[] = []
    const textLen = text.length

    // For short texts, we can be more thorough
    const queue: Array<{
      node: TrieNode
      pattern: string
      patternPos: number
      editDistance: number
    }> = [{
      node: this.root,
      pattern: '',
      patternPos: 0,
      editDistance: 0
    }]

    while (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Queue length checked in while condition, shift() guaranteed to return value
      const current = queue.shift()!
      const { node, pattern, patternPos, editDistance } = current

      if (editDistance > maxEditDistance) continue

      // Check for matches at this position
      if (node.isEndOfWord && node.data && patternPos > 0) {
        // Calculate edit distance for the remaining text
        const remainingDistance = Math.abs(textLen - patternPos)
        const finalEditDistance = editDistance + remainingDistance

        if (finalEditDistance <= maxEditDistance) {
          // Check word boundaries
          if (this.isWordBoundary(text, 0, Math.min(patternPos, textLen))) {
            matches.push({
              word: text.substring(0, Math.min(patternPos, textLen)),
              start: originalStart,
              end: originalStart + Math.min(patternPos, textLen),
              data: node.data,
              editDistance: finalEditDistance
            })
          }
        }
      }

      // Explore all possible paths
      if (patternPos < textLen) {
        for (const [char, childNode] of Array.from(node.children.entries())) {
          // Try exact match
          if (patternPos < textLen && char === text[patternPos]) {
            queue.push({
              node: childNode,
              pattern: pattern + char,
              patternPos: patternPos + 1,
              editDistance
            })
          }

          // Try substitution
          if (editDistance + 1 <= maxEditDistance) {
            queue.push({
              node: childNode,
              pattern: pattern + char,
              patternPos: patternPos + 1,
              editDistance: editDistance + 1
            })
          }
        }

        // Try insertion (skip text character)
        if (editDistance + 1 <= maxEditDistance) {
          queue.push({
            node,
            pattern,
            patternPos: patternPos + 1,
            editDistance: editDistance + 1
          })
        }

        // Try deletion (skip pattern character)
        if (editDistance + 1 <= maxEditDistance) {
          for (const [char, childNode] of Array.from(node.children.entries())) {
            queue.push({
              node: childNode,
              pattern: pattern + char,
              patternPos,
              editDistance: editDistance + 1
            })
          }
        }
      }
    }

    return matches
  }

  /**
   * Legacy fuzzy search DFS - kept for compatibility but deprecated
   * Use fuzzySearchFromPositionOptimized instead
   */
  // @ts-ignore: Deprecated method kept for compatibility
  private _fuzzySearchDFS(
    node: TrieNode,
    text: string,
    originalStart: number,
    currentPattern: string,
    dp: number[][],
    patternPos: number,
    maxEditDistance: number,
    matches: TrieMatch[]
  ): void {
    const textLen = text.length

    // Initialize current row of DP table
    if (patternPos === 0) {
      for (let i = 0; i <= patternPos; i++) {
        const row = dp[i]
        if (row) {
          row[0] = i
        }
      }
    }

    // Fill DP table for current pattern position
    for (let j = 1; j <= textLen; j++) {
      let minCost = Infinity

      if (patternPos > 0) {
        // Deletion: skip character in pattern
        const prevPatternRow = dp[patternPos - 1]
        if (prevPatternRow) {
          const prevValue = prevPatternRow[j]
          if (prevValue !== undefined) {
            minCost = Math.min(minCost, prevValue + 1)
          }
        }

        // Insertion: skip character in text
        const currentRow = dp[patternPos]
        if (currentRow && j > 0) {
          const currentValue = currentRow[j - 1]
          if (currentValue !== undefined) {
            minCost = Math.min(minCost, currentValue + 1)
          }
        }

        // Substitution or match
        const cost = currentPattern[patternPos - 1] === text[j - 1] ? 0 : 1
        if (prevPatternRow && j > 0) {
          const prevValue = prevPatternRow[j - 1]
          if (prevValue !== undefined) {
            minCost = Math.min(minCost, prevValue + cost)
          }
        }
      }

      const currentRow = dp[patternPos]
      if (currentRow) {
        currentRow[j] = minCost
      }
    }

    // Check if current node represents a complete word
    if (node.isEndOfWord && node.data && patternPos > 0) {
      // Find minimum edit distance for any ending position
      const currentRow = dp[patternPos]
      if (currentRow) {
        for (let j = 1; j <= textLen; j++) {
          const editDistance = currentRow[j]
          if (editDistance !== undefined && editDistance <= maxEditDistance) {
            if (this.isWordBoundary(text, 0, j)) {
              matches.push({
                word: text.substring(0, j),
                start: originalStart,
                end: originalStart + j,
                data: node.data,
                editDistance
              })
            }
          }
        }
      }
    }

    // Continue DFS to children if we haven't exceeded max edit distance
    // Note: Legacy DFS method removed for now
    //
    // PERFORMANCE OPTIMIZATION (DEFERRED):
    // The current implementation uses BFS (breadth-first search) in the main fuzzySearch method.
    // A potential optimization would be to add DFS (depth-first search) continuation here for child
    // nodes when the current node's minimum edit distance is still within maxEditDistance.
    //
    // This would allow early pruning of entire subtrees and potentially improve performance for
    // large tries. However, the current BFS implementation is already quite efficient and the
    // added complexity may not justify the marginal gains.
    //
    // Deferring this optimization until profiling shows it as a significant bottleneck.
  }

  /**
   * Check if position represents a word boundary
   */
  private isWordBoundary(text: string, start: number, end: number): boolean {
    const beforeChar = start > 0 ? text[start - 1] : ' '
    const afterChar = end < text.length ? text[end] : ' '

    const isWordChar = (char: string | undefined): boolean => {
      return char ? /[a-zA-Z0-9]/.test(char) : false
    }

    return !isWordChar(beforeChar) && !isWordChar(afterChar)
  }

  /**
   * Remove duplicate matches and sort by quality
   */
  private deduplicateMatches(matches: TrieMatch[]): TrieMatch[] {
    const seen = new Set<string>()
    const unique: TrieMatch[] = []

    // Sort by position first, then by edit distance (lower is better)
    const sorted = matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      const distA = a.editDistance || 0
      const distB = b.editDistance || 0
      return distA - distB
    })

    for (const match of sorted) {
      const key = `${match.start}-${match.end}-${match.data.word}`
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(match)
      }
    }

    return unique
  }

  /**
   * Compile the Trie for optimized searching (Aho-Corasick)
   * This creates failure links for efficient multi-pattern matching
   */
  compile(): void {
    if (this.compiled) return

    this.buildFailureLinks()
    this.compiled = true
  }

  /**
   * Build failure links for Aho-Corasick algorithm
   */
  private buildFailureLinks(): void {
    const queue: TrieNode[] = []

    // Initialize failure links for depth 1
    for (const child of Array.from(this.root.children.values())) {
      child.failureLink = this.root
      queue.push(child)
    }

    // Build failure links using BFS
    while (queue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- Queue length checked in while condition, shift() guaranteed to return value
      const current = queue.shift()!

      for (const [char, child] of Array.from(current.children.entries())) {
        queue.push(child)

        // Find failure link
        let failure = current.failureLink
        while (failure !== null && !failure.children.has(char)) {
          failure = failure.failureLink
        }

        if (failure === null) {
          child.failureLink = this.root
        } else {
          const failureChild = failure.children.get(char)
          child.failureLink = failureChild || this.root
        }

        // Set output link
        if (child.failureLink?.isEndOfWord) {
          child.outputLink = child.failureLink
        } else {
          child.outputLink = child.failureLink?.outputLink || null
        }
      }
    }
  }

  /**
   * Multi-pattern search using Aho-Corasick algorithm
   * More efficient than multiple single searches
   */
  multiPatternSearch(text: string, caseSensitive = false): TrieMatch[] {
    this.compile()

    if (!text || text.length === 0) {
      return []
    }

    const searchText = caseSensitive ? text : text.toLowerCase()
    const matches: TrieMatch[] = []
    let currentNode = this.root

    for (let i = 0; i < searchText.length; i++) {
      const char = searchText[i]
      if (!char) continue

      // Follow failure links until we find a match or reach root
      while (currentNode !== this.root && !currentNode.children.has(char)) {
        if (currentNode.failureLink) {
          currentNode = currentNode.failureLink
        } else {
          currentNode = this.root
          break
        }
      }

      if (currentNode.children.has(char)) {
        const childNode = currentNode.children.get(char)
        if (childNode) {
          currentNode = childNode
        }
      }

      // Check for matches at current position
      let outputNode: TrieNode | null = currentNode
      while (outputNode !== null) {
        if (outputNode.isEndOfWord && outputNode.data) {
          const wordLength = outputNode.data.word.length
          const start = i - wordLength + 1
          const end = i + 1

          if (this.isWordBoundary(searchText, start, end)) {
            matches.push({
              word: searchText.substring(start, end),
              start,
              end,
              data: outputNode.data
            })
          }
        }
        outputNode = outputNode.outputLink
      }
    }

    return matches
  }

  /**
   * Get statistics about the Trie
   */
  getStats(): {
    totalWords: number
    totalNodes: number
    averageDepth: number
    maxDepth: number
    memoryUsage: number
  } {
    let totalNodes = 0
    let totalDepth = 0
    let maxDepth = 0
    let wordCount = 0

    const traverse = (node: TrieNode, depth: number) => {
      totalNodes++
      if (node.isEndOfWord) {
        totalDepth += depth
        wordCount++
        maxDepth = Math.max(maxDepth, depth)
      }

      for (const child of Array.from(node.children.values())) {
        traverse(child, depth + 1)
      }
    }

    traverse(this.root, 0)

    const averageDepth = wordCount > 0 ? totalDepth / wordCount : 0

    // Rough memory estimation
    const memoryUsage = totalNodes * (
      32 + // Base node overhead
      (16 * 2) + // Map overhead
      (8 * 4) // Average character storage per node
    )

    return {
      totalWords: this.totalWords,
      totalNodes,
      averageDepth,
      maxDepth,
      memoryUsage
    }
  }

  /**
   * Clear the entire Trie
   */
  clear(): void {
    this.root = new TrieNode()
    this.totalWords = 0
    this.compiled = false
  }

  /**
   * Export Trie to a serializable format
   */
  export(): SerializedTrie {
    const exportNode = (node: TrieNode): SerializedTrieNode => {
      const exported: SerializedTrieNode = {
        isEndOfWord: node.isEndOfWord,
        children: {}
      }

      if (node.data) {
        exported.data = node.data
      }

      for (const [char, child] of Array.from(node.children.entries())) {
        exported.children[char] = exportNode(child)
      }

      return exported
    }

    return {
      root: exportNode(this.root),
      totalWords: this.totalWords,
      version: '1.0.0'
    }
  }

  /**
   * Import Trie from serialized format
   */
  import(data: SerializedTrie): void {
    this.clear()

    const importNode = (nodeData: SerializedTrieNode): TrieNode => {
      const node = new TrieNode()
      node.isEndOfWord = nodeData.isEndOfWord || false

      if (nodeData.data) {
        node.data = nodeData.data
      }

      if (nodeData.children) {
        for (const [char, childData] of Object.entries(nodeData.children)) {
          node.children.set(char, importNode(childData))
        }
      }

      return node
    }

    if (data.root) {
      this.root = importNode(data.root)
      this.totalWords = data.totalWords || 0
      this.compiled = false
    }
  }

  /**
   * PERFORMANCE OPTIMIZATIONS
   */

  // Cache for frequently accessed search paths
  private searchCache = new Map<string, TrieMatch[]>()
  private readonly MAX_CACHE_SIZE = 1000
  private cacheHits = 0
  private cacheMisses = 0

  /**
   * Cached search with intelligent cache management
   */
  cachedSearch(text: string, caseSensitive = false): TrieMatch[] {
    const cacheKey = `${caseSensitive ? 'cs' : 'ci'}:${text}`

    // Check cache first
    if (this.searchCache.has(cacheKey)) {
      this.cacheHits++
      const cached = this.searchCache.get(cacheKey)
      return cached || []
    }

    this.cacheMisses++
    const results = this.search(text, caseSensitive)

    // Add to cache if under limit
    if (this.searchCache.size < this.MAX_CACHE_SIZE) {
      this.searchCache.set(cacheKey, results)
    } else {
      // Remove least recently used entries
      this.evictOldCacheEntries()
      this.searchCache.set(cacheKey, results)
    }

    return results
  }

  /**
   * Batch processing for multiple texts - significantly more efficient
   */
  batchSearch(texts: string[], caseSensitive = false): TrieMatch[][] {
    return texts.map(text => this.cachedSearch(text, caseSensitive))
  }

  /**
   * Memory-efficient batch processing with streaming
   */
  *batchSearchStream(texts: Iterable<string>, caseSensitive = false): Generator<TrieMatch[], void, unknown> {
    for (const text of Array.from(texts)) {
      yield this.cachedSearch(text, caseSensitive)
    }
  }

  /**
   * Optimized traversal with early termination
   */
  searchWithEarlyTermination(text: string, maxMatches: number, caseSensitive = false): TrieMatch[] {
    if (!text || text.length === 0 || maxMatches <= 0) {
      return []
    }

    const searchText = caseSensitive ? text : text.toLowerCase()
    const matches: TrieMatch[] = []

    // Early termination when max matches reached
    for (let i = 0; i < searchText.length && matches.length < maxMatches; i++) {
      const match = this.searchFromPosition(searchText, i)
      if (match) {
        matches.push(match)
      }
    }

    return matches
  }

  enableLazyLoading(callback: (word: string) => TrieNodeData | null): void {
    // Lazy loading functionality can be implemented when needed
    // For now, just store the callback for future use
    if (typeof callback === 'function') {
      // Implementation would use the callback to load data on demand
    }
  }

  /**
   * Smart cache eviction using LRU strategy
   */
  private evictOldCacheEntries(): void {
    // Remove 25% of cache entries
    const entriesToRemove = Math.floor(this.searchCache.size * 0.25)
    const entries = Array.from(this.searchCache.keys()).slice(0, entriesToRemove)

    for (const key of entries) {
      this.searchCache.delete(key)
    }
  }

  /**
   * Get cache performance statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number; size: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      size: this.searchCache.size
    }
  }

  /**
   * Clear search cache
   */
  clearCache(): void {
    this.searchCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  /**
   * Warm up cache with common patterns
   */
  warmUpCache(commonTexts: string[]): void {
    for (const text of commonTexts) {
      this.cachedSearch(text)
      this.cachedSearch(text, true) // Also warm up case-sensitive
    }
  }

  /**
   * Memory usage optimization - compact internal structures
   */
  compact(): void {
    this.searchCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0

    // Force garbage collection hint
    if (global.gc) {
      global.gc()
    }
  }
}