/**
 * Advanced profanity matcher with context-aware detection
 * Handles severity scoring, word boundaries, and false positive reduction
 */

import type {
  DetectionMatch,
  SeverityLevel,
  ProfanityCategory,
  LanguageCode,
  CustomWord
} from '../types/index.js'
import { ProfanityTrie, type TrieMatch, type TrieNodeData } from './trie.js'
import { textNormalizer } from '../utils/text-normalizer.js'

/**
 * Context information for a potential match
 */
interface MatchContext {
  /** Text before the match */
  before: string
  /** Text after the match */
  after: string
  /** Full sentence containing the match */
  sentence: string
  /** Position within the sentence */
  sentencePosition: number
}

/**
 * Configuration for the profanity matcher
 */
export interface MatcherConfig {
  /** Languages to detect */
  languages: LanguageCode[]
  /** Minimum severity level to report */
  minSeverity: SeverityLevel
  /** Categories to detect */
  categories: ProfanityCategory[]
  /** Enable fuzzy matching */
  fuzzyMatching: boolean
  /** Fuzzy matching threshold (0-1) */
  fuzzyThreshold: number
  /** Words to whitelist */
  whitelist: string[]
  /** Enable context-aware filtering */
  contextAware: boolean
  /** Minimum word length to consider */
  minWordLength: number
  /** Maximum edit distance for fuzzy matches */
  maxEditDistance: number
}

/**
 * High-performance profanity matcher with advanced features
 */
export class ProfanityMatcher {
  private tries: Map<LanguageCode, ProfanityTrie> = new Map()
  private whitelist: Set<string> = new Set()
  private config: MatcherConfig
  private commonWords: Set<string> = new Set()
  private contextPatterns: Map<string, RegExp> = new Map()

  constructor(config: MatcherConfig) {
    this.config = config
    this.initializeWhitelist()
    this.initializeCommonWords()
    this.initializeContextPatterns()
  }

  /**
   * Load profanity words for a specific language
   */
  async loadLanguage(
    language: LanguageCode,
    words: Array<{
      word: string
      severity: SeverityLevel
      categories: ProfanityCategory[]
      variations?: string[]
      caseSensitive?: boolean
    }>
  ): Promise<void> {
    const trie = new ProfanityTrie()

    for (const wordData of words) {
      if (!this.shouldIncludeWord(wordData)) {
        continue
      }

      const trieData: TrieNodeData = {
        word: wordData.word,
        severity: wordData.severity,
        categories: wordData.categories,
        language,
        caseSensitive: wordData.caseSensitive ?? false,
        confidence: 1.0
      }

      // Insert base word
      trie.insert(wordData.word, trieData)

      // Insert variations if provided
      if (wordData.variations && wordData.variations.length > 0) {
        trie.insertWithVariations(wordData.word, wordData.variations, trieData)
      }
    }

    // Compile for optimal performance
    trie.compile()
    this.tries.set(language, trie)
  }

  /**
   * Add custom words to the matcher
   */
  addCustomWords(customWords: CustomWord[]): void {
    for (const customWord of customWords) {
      const trie = this.tries.get(customWord.language)
      if (!trie) continue

      const trieData: TrieNodeData = {
        word: customWord.word,
        severity: customWord.severity,
        categories: customWord.categories,
        language: customWord.language,
        caseSensitive: customWord.caseSensitive ?? false,
        confidence: 0.9 // Slightly lower confidence for custom words
      }

      trie.insert(customWord.word, trieData)

      // Insert variations if provided
      if (customWord.variations && customWord.variations.length > 0) {
        trie.insertWithVariations(customWord.word, customWord.variations, trieData)
      }
    }
  }

  /**
   * Find all profanity matches in text
   */
  findMatches(
    text: string,
    detectedLanguages: LanguageCode[] = ['en'],
    caseSensitive = false
  ): DetectionMatch[] {
    if (!text || text.length === 0) {
      return []
    }

    const normalizedText = textNormalizer.normalize(text, {
      removeAccents: true,
      expandContractions: true,
      normalizeWhitespace: true,
      preserveCase: caseSensitive
    })

    const allMatches: DetectionMatch[] = []

    // Search in each detected language
    for (const language of detectedLanguages) {
      if (language === 'auto') continue

      const trie = this.tries.get(language)
      if (!trie) continue

      // Find exact matches
      const exactMatches = trie.multiPatternSearch(normalizedText, caseSensitive)

      // Find fuzzy matches if enabled
      let fuzzyMatches: TrieMatch[] = []
      if (this.config.fuzzyMatching) {
        fuzzyMatches = trie.fuzzySearch(
          normalizedText,
          this.config.maxEditDistance,
          caseSensitive
        )
      }

      // Convert to detection matches
      const languageMatches = [
        ...exactMatches.map(match => this.convertToDetectionMatch(match, text, language)),
        ...fuzzyMatches.map(match => this.convertToDetectionMatch(match, text, language))
      ]

      allMatches.push(...languageMatches)
    }

    // Filter and process matches
    const filteredMatches = this.filterMatches(allMatches, text)
    const contextFilteredMatches = this.config.contextAware
      ? this.applyContextFiltering(filteredMatches, text)
      : filteredMatches

    // Remove overlapping matches (keep highest severity)
    const deduplicatedMatches = this.deduplicateMatches(contextFilteredMatches)

    // Sort by position and apply final confidence adjustments
    return deduplicatedMatches
      .map(match => this.adjustConfidence(match, text))
      .sort((a, b) => a.start - b.start)
  }

  /**
   * Convert Trie match to Detection match
   */
  private convertToDetectionMatch(
    trieMatch: TrieMatch,
    originalText: string,
    language: LanguageCode
  ): DetectionMatch {
    let confidence = trieMatch.data.confidence || 1.0

    // Reduce confidence for fuzzy matches
    if (trieMatch.editDistance && trieMatch.editDistance > 0) {
      confidence *= Math.max(0.3, 1.0 - (trieMatch.editDistance * 0.2))
    }

    // Map back to original text positions (accounting for normalization)
    const actualStart = trieMatch.start
    const actualEnd = trieMatch.end
    const actualWord = originalText.substring(actualStart, actualEnd)

    return {
      word: actualWord,
      match: trieMatch.data.word,
      start: actualStart,
      end: actualEnd,
      severity: trieMatch.data.severity,
      categories: trieMatch.data.categories,
      language,
      confidence
    }
  }

  /**
   * Filter matches based on configuration and common patterns
   */
  private filterMatches(matches: DetectionMatch[], text: string): DetectionMatch[] {
    return matches.filter(match => {
      // Check minimum severity
      if (match.severity < this.config.minSeverity) {
        return false
      }

      // Check categories
      if (this.config.categories.length > 0) {
        const hasRequiredCategory = match.categories.some(cat =>
          this.config.categories.includes(cat)
        )
        if (!hasRequiredCategory) {
          return false
        }
      }

      // Check whitelist
      if (this.isWhitelisted(match.word)) {
        return false
      }

      // Check minimum word length
      if (match.word.length < this.config.minWordLength) {
        return false
      }

      // Check if it's a common word (potential false positive)
      if (this.isCommonWord(match.word) && match.severity <= 2) {
        return false
      }

      // Check word boundaries
      if (!this.hasProperWordBoundaries(match, text)) {
        return false
      }

      return true
    })
  }

  /**
   * Apply context-aware filtering to reduce false positives
   */
  private applyContextFiltering(matches: DetectionMatch[], text: string): DetectionMatch[] {
    return matches.filter(match => {
      const context = this.getMatchContext(match, text)

      // Check for negating context (e.g., "not bad")
      if (this.hasNegatingContext(context)) {
        return false
      }

      // Check for technical/medical context
      if (this.hasTechnicalContext(context)) {
        return false
      }

      // Check for quoted context (might be discussing the word)
      if (this.hasQuotedContext(context)) {
        match.confidence *= 0.7 // Reduce confidence but don't eliminate
      }

      // Adjust confidence based on context
      const contextConfidence = this.calculateContextConfidence(context)
      match.confidence *= contextConfidence

      return match.confidence >= 0.3 // Minimum confidence threshold
    })
  }

  /**
   * Get context information for a match
   */
  private getMatchContext(match: DetectionMatch, text: string): MatchContext {
    const beforeStart = Math.max(0, match.start - 50)
    const afterEnd = Math.min(text.length, match.end + 50)

    const before = text.substring(beforeStart, match.start).trim()
    const after = text.substring(match.end, afterEnd).trim()

    // Find sentence boundaries
    const sentences = text.split(/[.!?]+/)
    let sentence = ''
    let sentencePosition = 0

    for (const sent of sentences) {
      const sentStart = text.indexOf(sent)
      const sentEnd = sentStart + sent.length

      if (match.start >= sentStart && match.end <= sentEnd) {
        sentence = sent.trim()
        sentencePosition = match.start - sentStart
        break
      }
    }

    return {
      before,
      after,
      sentence,
      sentencePosition
    }
  }

  /**
   * Check for negating context
   */
  private hasNegatingContext(context: MatchContext): boolean {
    const negatingWords = ['not', "don't", "doesn't", 'never', 'hardly', 'barely']
    const beforeWords = context.before.toLowerCase().split(/\s+/)

    // Check if negating word appears within 3 words before
    for (let i = Math.max(0, beforeWords.length - 3); i < beforeWords.length; i++) {
      const word = beforeWords[i]
      if (word && negatingWords.includes(word)) {
        return true
      }
    }

    return false
  }

  /**
   * Check for technical/medical context
   */
  private hasTechnicalContext(context: MatchContext): boolean {
    const technicalIndicators = [
      'medical', 'technical', 'definition', 'terminology', 'glossary',
      'dictionary', 'research', 'study', 'analysis', 'academic'
    ]

    const fullContext = (context.before + ' ' + context.after).toLowerCase()

    return technicalIndicators.some(indicator => fullContext.includes(indicator))
  }

  /**
   * Check for quoted context
   */
  private hasQuotedContext(context: MatchContext): boolean {
    const quoteBefore = context.before.includes('"') || context.before.includes("'")
    const quoteAfter = context.after.includes('"') || context.after.includes("'")

    return quoteBefore && quoteAfter
  }

  /**
   * Calculate confidence based on context
   */
  private calculateContextConfidence(context: MatchContext): number {
    let confidence = 1.0

    // Reduce confidence for very short sentences
    if (context.sentence.length < 20) {
      confidence *= 0.8
    }

    // Reduce confidence if word is at the very beginning or end of text
    if (context.sentencePosition < 5 || context.sentencePosition > context.sentence.length - 10) {
      confidence *= 0.9
    }

    // Check for surrounding profanity (increases confidence)
    const surroundingText = context.before + ' ' + context.after
    if (this.hasSurroundingProfanity(surroundingText)) {
      confidence *= 1.2
    }

    return Math.min(1.0, Math.max(0.1, confidence))
  }

  /**
   * Check if there's surrounding profanity (quick check)
   */
  private hasSurroundingProfanity(text: string): boolean {
    // Quick regex-based check for common profanity patterns
    const patterns = [
      /\b(damn|hell|crap|shit|fuck|ass|bitch)\b/i,
      /[!@#$%^&*]{2,}/, // Multiple special characters
      /[A-Z]{3,}/ // All caps words
    ]

    return patterns.some(pattern => pattern.test(text))
  }

  /**
   * Remove overlapping matches, keeping the highest severity
   */
  private deduplicateMatches(matches: DetectionMatch[]): DetectionMatch[] {
    if (matches.length === 0) return matches

    // Sort by start position, then by severity (descending)
    const sorted = matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start
      return b.severity - a.severity
    })

    const result: DetectionMatch[] = []
    let lastEnd = -1

    for (const match of sorted) {
      // Skip if this match overlaps with the previous one
      if (match.start < lastEnd) {
        // Check if this match is significantly better
        const lastMatch = result[result.length - 1]
        if (lastMatch && (match.severity > lastMatch.severity ||
            (match.severity === lastMatch.severity && match.confidence > lastMatch.confidence))) {
          // Replace the last match with this better one
          result[result.length - 1] = match
          lastEnd = match.end
        }
        continue
      }

      result.push(match)
      lastEnd = match.end
    }

    return result
  }

  /**
   * Adjust confidence based on various factors
   */
  private adjustConfidence(match: DetectionMatch, _text: string): DetectionMatch {
    let confidence = match.confidence

    // Boost confidence for exact matches
    if (match.word.toLowerCase() === match.match.toLowerCase()) {
      confidence *= 1.1
    }

    // Reduce confidence for very short words
    if (match.word.length <= 3) {
      confidence *= 0.8
    }

    // Boost confidence for high-severity words
    if (match.severity >= 3) {
      confidence *= 1.1
    }

    // Reduce confidence if word contains numbers (often false positives)
    if (/\d/.test(match.word)) {
      confidence *= 0.7
    }

    // Cap confidence at 1.0
    confidence = Math.min(1.0, Math.max(0.1, confidence))

    return {
      ...match,
      confidence: Math.round(confidence * 100) / 100 // Round to 2 decimal places
    }
  }

  /**
   * Check if word should be included based on config
   */
  private shouldIncludeWord(wordData: {
    word: string
    severity: SeverityLevel
    categories: ProfanityCategory[]
  }): boolean {
    // Check minimum severity
    if (wordData.severity < this.config.minSeverity) {
      return false
    }

    // Check categories
    if (this.config.categories.length > 0) {
      const hasRequiredCategory = wordData.categories.some(cat =>
        this.config.categories.includes(cat)
      )
      if (!hasRequiredCategory) {
        return false
      }
    }

    return true
  }

  /**
   * Check if word is whitelisted
   */
  private isWhitelisted(word: string): boolean {
    return this.whitelist.has(word.toLowerCase())
  }

  /**
   * Check if word is a common word (potential false positive)
   */
  private isCommonWord(word: string): boolean {
    return this.commonWords.has(word.toLowerCase())
  }

  /**
   * Check if match has proper word boundaries
   */
  private hasProperWordBoundaries(match: DetectionMatch, text: string): boolean {
    const beforeChar = match.start > 0 ? text[match.start - 1] : ' '
    const afterChar = match.end < text.length ? text[match.end] : ' '

    const isWordChar = (char: string | undefined) => char ? /[a-zA-Z0-9]/.test(char) : false

    return !isWordChar(beforeChar) && !isWordChar(afterChar)
  }

  /**
   * Initialize whitelist with common false positives
   */
  private initializeWhitelist(): void {
    const defaultWhitelist = [
      'assess', 'assessment', 'classic', 'glass', 'class', 'pass',
      'bass', 'mass', 'grass', 'brass', 'assistance', 'associate',
      'assumption', 'expression', 'impression', 'depression',
      'aggression', 'regression', 'progression', 'succession'
    ]

    for (const word of [...defaultWhitelist, ...this.config.whitelist]) {
      this.whitelist.add(word.toLowerCase())
    }
  }

  /**
   * Initialize common words that might cause false positives
   */
  private initializeCommonWords(): void {
    const commonWords = [
      'bad', 'hell', 'damn', 'god', 'ass', 'gay', 'sex', 'sexy',
      'kill', 'die', 'dead', 'hate', 'stupid', 'idiot', 'moron'
    ]

    for (const word of commonWords) {
      this.commonWords.add(word.toLowerCase())
    }
  }

  /**
   * Initialize context patterns for better detection
   */
  private initializeContextPatterns(): void {
    this.contextPatterns.set('technical', /\b(definition|meaning|term|word|etymology|origin)\b/i)
    this.contextPatterns.set('quoted', /["'].*?["']/g)
    this.contextPatterns.set('medical', /\b(medical|clinical|diagnosis|symptom|condition)\b/i)
    this.contextPatterns.set('academic', /\b(research|study|paper|thesis|academic|scholarly)\b/i)
  }

  /**
   * Get matcher statistics
   */
  getStats(): {
    totalLanguages: number
    totalWords: number
    trieStats: Record<string, any>
  } {
    const trieStats: Record<string, any> = {}
    let totalWords = 0

    for (const [language, trie] of this.tries) {
      const stats = trie.getStats()
      trieStats[language] = stats
      totalWords += stats.totalWords
    }

    return {
      totalLanguages: this.tries.size,
      totalWords,
      trieStats
    }
  }

  /**
   * Update matcher configuration
   */
  updateConfig(newConfig: Partial<MatcherConfig>): void {
    this.config = { ...this.config, ...newConfig }

    // Reinitialize whitelist if it changed
    if (newConfig.whitelist) {
      this.whitelist.clear()
      this.initializeWhitelist()
    }
  }
}