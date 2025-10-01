/**
 * SymSpell (Symmetric Delete) algorithm for ultra-fast fuzzy string matching
 *
 * Performance: 1,000-100,000x faster than traditional edit distance approaches
 * Memory trade-off: Preprocesses all delete variants for O(1) lookup speed
 *
 * Algorithm:
 * 1. Preprocessing: Generate all possible character deletions up to max edit distance
 * 2. Query: Generate deletions of query string and lookup in hash map
 * 3. Result: All dictionary words within edit distance in constant time
 *
 * Example:
 * - Dictionary word "shit" with max_edit=1 generates: ["shit", "hit", "sit", "sht", "shi"]
 * - Query "sht" (from normalized "sh!t") → instant hash lookup → matches "shit"
 */

export interface SymSpellMatch {
  /** The original dictionary word */
  word: string
  /** Edit distance from query to dictionary word */
  editDistance: number
}

export interface SymSpellOptions {
  /** Maximum edit distance to consider (1-2 recommended, 3+ expensive) */
  maxEditDistance: number
  /** Prefix length for memory optimization (0 = disabled, 7 = recommended) */
  prefixLength?: number
  /** Case sensitive matching */
  caseSensitive?: boolean
}

/**
 * SymSpell index for ultra-fast fuzzy string matching
 */
export class SymSpellIndex {
  /** Map from delete variant → set of original words that generate it */
  private deletes: Map<string, Set<string>> = new Map()

  /** Original dictionary words */
  private dictionary: Set<string> = new Set()

  /** Configuration options */
  private options: Required<SymSpellOptions>

  constructor(options: SymSpellOptions) {
    this.options = {
      maxEditDistance: options.maxEditDistance,
      prefixLength: options.prefixLength ?? 0,
      caseSensitive: options.caseSensitive ?? false
    }
  }

  /**
   * Build the SymSpell index from a dictionary of words
   */
  buildIndex(words: string[]): void {
    this.deletes.clear()
    this.dictionary.clear()

    for (const word of words) {
      if (!word || word.trim().length === 0) continue

      const normalizedWord = this.options.caseSensitive ? word : word.toLowerCase()
      this.dictionary.add(normalizedWord)

      // Generate all delete variants for this word
      const deleteVariants = this.generateDeletes(normalizedWord, this.options.maxEditDistance)

      for (const variant of deleteVariants) {
        if (!this.deletes.has(variant)) {
          this.deletes.set(variant, new Set())
        }
        this.deletes.get(variant)!.add(normalizedWord)
      }
    }
  }

  /**
   * Lookup fuzzy matches for a query string
   * Returns all dictionary words within maxEditDistance
   */
  lookup(query: string, maxEditDistance?: number): SymSpellMatch[] {
    const searchDistance = maxEditDistance ?? this.options.maxEditDistance
    const normalizedQuery = this.options.caseSensitive ? query : query.toLowerCase()

    if (normalizedQuery.length === 0) return []

    // Track candidates and their edit distances
    const candidates = new Map<string, number>()

    // Exact match check (edit distance 0)
    if (this.dictionary.has(normalizedQuery)) {
      candidates.set(normalizedQuery, 0)
    }

    // Generate delete variants of query and look them up
    const queryDeletes = this.generateDeletes(normalizedQuery, searchDistance)

    for (const deleteVariant of queryDeletes) {
      const matchingWords = this.deletes.get(deleteVariant)
      if (!matchingWords) continue

      // Calculate actual edit distance for each candidate
      for (const word of matchingWords) {
        if (candidates.has(word)) continue // Already found with lower distance

        const distance = this.calculateEditDistance(normalizedQuery, word)
        if (distance <= searchDistance) {
          candidates.set(word, distance)
        }
      }
    }

    // Convert to result format and sort by edit distance
    return Array.from(candidates.entries())
      .map(([word, editDistance]) => ({ word, editDistance }))
      .sort((a, b) => a.editDistance - b.editDistance)
  }

  /**
   * Generate all delete variants of a word up to maxDistance
   * Uses prefix optimization if enabled
   */
  private generateDeletes(word: string, maxDistance: number): Set<string> {
    const deletes = new Set<string>()

    // Note: Don't add original word to deletes, only its delete variants
    // The original word is stored in dictionary

    // Use prefix optimization to reduce memory during index building
    // But for lookups, we need to handle the full word
    const effectiveWord = this.options.prefixLength > 0 && word.length > this.options.prefixLength
      ? word.substring(0, this.options.prefixLength)
      : word

    // BFS to generate all possible deletions
    const queue: Array<{ str: string; distance: number }> = [{ str: effectiveWord, distance: 0 }]
    const visited = new Set<string>([effectiveWord])

    while (queue.length > 0) {
      const current = queue.shift()!

      // Add current state to deletes (including the starting word)
      deletes.add(current.str)

      if (current.distance >= maxDistance) continue

      // Generate all single-character deletions
      for (let i = 0; i < current.str.length; i++) {
        const deleted = current.str.substring(0, i) + current.str.substring(i + 1)

        if (!visited.has(deleted)) {
          visited.add(deleted)
          queue.push({ str: deleted, distance: current.distance + 1 })
        }
      }
    }

    return deletes
  }

  /**
   * Calculate Levenshtein edit distance between two strings
   * Optimized for short strings (profanity words typically 3-15 chars)
   */
  private calculateEditDistance(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length

    // Quick checks
    if (len1 === 0) return len2
    if (len2 === 0) return len1
    if (str1 === str2) return 0

    // Use single array for space optimization (only need previous row)
    const prev = new Array(len2 + 1)
    const curr = new Array(len2 + 1)

    // Initialize first row
    for (let j = 0; j <= len2; j++) {
      prev[j] = j
    }

    // Dynamic programming
    for (let i = 1; i <= len1; i++) {
      curr[0] = i

      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1

        curr[j] = Math.min(
          prev[j] + 1,      // deletion
          curr[j - 1] + 1,  // insertion
          prev[j - 1] + cost // substitution
        )
      }

      // Swap arrays
      for (let j = 0; j <= len2; j++) {
        prev[j] = curr[j]
      }
    }

    return prev[len2]
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    dictionarySize: number
    deleteVariants: number
    avgVariantsPerWord: number
    memoryEstimateMB: number
  } {
    const dictionarySize = this.dictionary.size
    const deleteVariants = this.deletes.size

    // Estimate memory usage (very rough)
    // Each string ~50 bytes, each Set entry ~20 bytes
    const memoryEstimateBytes = (dictionarySize * 50) + (deleteVariants * 70)
    const memoryEstimateMB = memoryEstimateBytes / (1024 * 1024)

    return {
      dictionarySize,
      deleteVariants,
      avgVariantsPerWord: dictionarySize > 0 ? deleteVariants / dictionarySize : 0,
      memoryEstimateMB: memoryEstimateMB > 0 ? Math.max(0.01, Math.round(memoryEstimateMB * 100) / 100) : 0
    }
  }

  /**
   * Clear the index to free memory
   */
  clear(): void {
    this.deletes.clear()
    this.dictionary.clear()
  }
}
