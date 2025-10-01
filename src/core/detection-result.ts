/**
 * Comprehensive detection result system with detailed analysis and metadata
 */

import type {
  DetectionResult,
  DetectionMatch,
  SeverityLevel,
  ProfanityCategory,
  LanguageCode
} from '../types/index.js'
import { SeverityLevel as SeverityEnum } from '../types/index.js'
import { ALL_CATEGORIES } from '../config/default-config.js'

/**
 * Comprehensive emoji regex (same as in text-processing)
 */
const EMOJI_REGEX = /(?:[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F700}-\u{1F77F}]|[\u{1F780}-\u{1F7FF}]|[\u{1F800}-\u{1F8FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}])/gu

/**
 * Performance metrics for detection operation
 */
export interface PerformanceMetrics {
  /** Total processing time in milliseconds */
  totalTime: number
  /** Time spent on language detection */
  languageDetectionTime: number
  /** Time spent on text normalization */
  normalizationTime: number
  /** Time spent on pattern matching */
  matchingTime: number
  /** Time spent on context analysis */
  contextAnalysisTime: number
  /** Time spent on filtering */
  filteringTime: number
  /** Number of characters processed */
  charactersProcessed: number
  /** Processing rate in characters per millisecond */
  processingRate: number
}

/**
 * Statistical analysis of detection results
 */
export interface DetectionStatistics {
  /** Total words in the text */
  totalWords: number
  /** Total unique words detected */
  uniqueProfaneWords: number
  /** Percentage of text that is profane */
  profanityDensity: number
  /** Distribution by severity level */
  severityDistribution: Record<SeverityLevel, number>
  /** Distribution by category */
  categoryDistribution: Record<ProfanityCategory, number>
  /** Distribution by language */
  languageDistribution: Record<LanguageCode, number>
  /** Average confidence score */
  averageConfidence: number
  /** Confidence score distribution */
  confidenceDistribution: {
    high: number // >= 0.8
    medium: number // 0.5-0.8
    low: number // < 0.5
  }
}

/**
 * Context information about the analyzed text
 */
export interface TextContext {
  /** Detected text type (social media, formal, email, etc.) */
  textType: 'unknown' | 'social_media' | 'formal' | 'email' | 'chat' | 'article' | 'comment'
  /** Estimated reading level */
  readingLevel: 'elementary' | 'middle' | 'high_school' | 'college' | 'graduate'
  /** Emotional tone indicators */
  emotionalTone: {
    aggressive: number
    neutral: number
    positive: number
    negative: number
  }
  /** Presence of special patterns */
  patterns: {
    hasUrls: boolean
    hasEmails: boolean
    hasMentions: boolean
    hasHashtags: boolean
    hasEmojis: boolean
    hasRepeatedChars: boolean
    hasAllCaps: boolean
  }
}

/**
 * Detailed position information for matches
 */
export interface MatchPosition {
  /** Absolute character position in text */
  absoluteStart: number
  absoluteEnd: number
  /** Line number (1-based) */
  lineNumber: number
  /** Column position in line (1-based) */
  columnStart: number
  columnEnd: number
  /** Word index in text */
  wordIndex: number
  /** Sentence index */
  sentenceIndex: number
}

/**
 * Enhanced detection match with additional metadata
 */
export interface EnhancedDetectionMatch extends DetectionMatch {
  /** Detailed position information */
  position: MatchPosition
  /** Context around the match */
  context: {
    before: string
    after: string
    sentence: string
  }
  /** Alternative suggestions for replacement */
  suggestions: string[]
  /** Reason for detection */
  detectionReason: string
  /** Whether this is a fuzzy match */
  isFuzzyMatch: boolean
  /** Edit distance for fuzzy matches */
  editDistance?: number
  /** Original match score before confidence adjustments */
  rawScore: number
}

/**
 * Enhanced detection result with comprehensive analysis
 */
export interface EnhancedDetectionResult extends DetectionResult {
  /** Enhanced matches with additional metadata */
  enhancedMatches: EnhancedDetectionMatch[]
  /** Performance metrics */
  performance: PerformanceMetrics
  /** Statistical analysis */
  statistics: DetectionStatistics
  /** Text context information */
  textContext: TextContext
  /** Warnings about potential issues */
  warnings: string[]
  /** Recommendations for improvement */
  recommendations: string[]
  /** Detection metadata */
  metadata: {
    version: string
    algorithm: string
    configHash: string
    timestamp: Date
  }
}

/**
 * Builder for creating detection results with comprehensive analysis
 */
export class DetectionResultBuilder {
  private result: Partial<EnhancedDetectionResult> = {}
  private startTime: number = Date.now()
  private performanceMarkers: Map<string, number> = new Map()

  constructor(originalText: string = '') {
    const safeText = originalText || ''
    this.result = {
      originalText: safeText,
      filteredText: safeText,
      hasProfanity: false,
      totalMatches: 0,
      maxSeverity: SeverityEnum.LOW,
      matches: [],
      enhancedMatches: [],
      detectedLanguages: [],
      confidence: 1.0,
      processingTime: 0,
      performance: {
        totalTime: 0,
        languageDetectionTime: 0,
        normalizationTime: 0,
        matchingTime: 0,
        contextAnalysisTime: 0,
        filteringTime: 0,
        charactersProcessed: originalText.length,
        processingRate: 0
      },
      statistics: {
        totalWords: this.countWords(originalText),
        uniqueProfaneWords: 0,
        profanityDensity: 0,
        severityDistribution: {
          [SeverityEnum.LOW]: 0,
          [SeverityEnum.MODERATE]: 0,
          [SeverityEnum.HIGH]: 0,
          [SeverityEnum.SEVERE]: 0
        },
        categoryDistribution: ALL_CATEGORIES.reduce((acc, cat) => {
          acc[cat] = 0
          return acc
        }, {} as Record<ProfanityCategory, number>),
        languageDistribution: {} as Record<LanguageCode, number>,
        averageConfidence: 0,
        confidenceDistribution: {
          high: 0,
          medium: 0,
          low: 0
        }
      },
      textContext: {
        textType: 'unknown',
        readingLevel: 'middle',
        emotionalTone: {
          aggressive: 0,
          neutral: 1,
          positive: 0,
          negative: 0
        },
        patterns: {
          hasUrls: false,
          hasEmails: false,
          hasMentions: false,
          hasHashtags: false,
          hasEmojis: false,
          hasRepeatedChars: false,
          hasAllCaps: false
        }
      },
      warnings: [],
      recommendations: [],
      metadata: {
        version: '1.0.0',
        algorithm: 'trie-based-fuzzy-matching',
        configHash: '',
        timestamp: new Date()
      }
    }

    this.markPerformance('start')
  }

  /**
   * Mark a performance checkpoint
   */
  markPerformance(label: string): void {
    this.performanceMarkers.set(label, Date.now())
  }

  /**
   * Set detected languages
   */
  setLanguages(languages: LanguageCode[]): this {
    this.result.detectedLanguages = languages
    return this
  }

  /**
   * Add detection matches
   */
  addMatches(matches: DetectionMatch[]): this {
    this.result.matches = matches
    this.result.totalMatches = matches.length
    this.result.hasProfanity = matches.length > 0

    // Calculate max severity
    this.result.maxSeverity = matches.reduce(
      (max, match) => Math.max(max, match.severity),
      SeverityEnum.LOW
    )

    // Create enhanced matches
    this.result.enhancedMatches = matches.map(match => this.enhanceMatch(match))

    // Update statistics
    this.updateStatistics()

    return this
  }

  /**
   * Set filtered text
   */
  setFilteredText(filteredText: string): this {
    this.result.filteredText = filteredText
    return this
  }

  /**
   * Set overall confidence
   */
  setConfidence(confidence: number): this {
    this.result.confidence = Math.max(0, Math.min(1, confidence))
    return this
  }

  /**
   * Add a warning
   */
  addWarning(warning: string): this {
    if (this.result.warnings) {
      this.result.warnings.push(warning)
    } else {
      this.result.warnings = [warning]
    }
    return this
  }

  /**
   * Add a recommendation
   */
  addRecommendation(recommendation: string): this {
    if (this.result.recommendations) {
      this.result.recommendations.push(recommendation)
    } else {
      this.result.recommendations = [recommendation]
    }
    return this
  }

  /**
   * Set configuration hash for caching
   */
  setConfigHash(hash: string): this {
    if (this.result.metadata) {
      this.result.metadata.configHash = hash
    }
    return this
  }

  /**
   * Build the final result
   */
  build(): EnhancedDetectionResult {
    this.markPerformance('end')

    // Calculate final performance metrics
    this.calculatePerformanceMetrics()

    // Analyze text context
    this.analyzeTextContext()

    // Generate recommendations
    this.generateRecommendations()

    // Set final processing time
    this.result.processingTime = Date.now() - this.startTime

    return this.result as EnhancedDetectionResult
  }

  /**
   * Enhance a basic match with additional metadata
   */
  private enhanceMatch(match: DetectionMatch): EnhancedDetectionMatch {
    const position = this.calculatePosition(match, this.result.originalText || '')
    const context = this.extractContext(match, this.result.originalText || '')
    const suggestions = this.generateSuggestions(match)

    return {
      ...match,
      position,
      context,
      suggestions,
      detectionReason: this.getDetectionReason(match),
      isFuzzyMatch: match.word.toLowerCase() !== match.match.toLowerCase(),
      editDistance: this.calculateEditDistance(match.word, match.match),
      rawScore: match.confidence
    }
  }

  /**
   * Calculate detailed position information
   */
  private calculatePosition(match: DetectionMatch, text: string): MatchPosition {
    // Calculate line and column numbers
    let lineNumber = 1
    let columnStart = 1
    let wordIndex = 0
    let sentenceIndex = 0

    for (let i = 0; i < match.start; i++) {
      if (text[i] === '\n') {
        lineNumber++
        columnStart = 1
      } else {
        columnStart++
      }

      const currentChar = text[i]
      const prevChar = text[i - 1]

      if (i > 0 && currentChar && prevChar && /\s/.test(currentChar) && !/\s/.test(prevChar)) {
        wordIndex++
      }

      if (currentChar && /[.!?]/.test(currentChar)) {
        sentenceIndex++
      }
    }

    const columnEnd = columnStart + (match.end - match.start)

    return {
      absoluteStart: match.start,
      absoluteEnd: match.end,
      lineNumber,
      columnStart,
      columnEnd,
      wordIndex,
      sentenceIndex
    }
  }

  /**
   * Extract context around a match
   */
  private extractContext(match: DetectionMatch, text: string): {
    before: string
    after: string
    sentence: string
  } {
    const contextLength = 50
    const beforeStart = Math.max(0, match.start - contextLength)
    const afterEnd = Math.min(text.length, match.end + contextLength)

    const before = text.substring(beforeStart, match.start).trim()
    const after = text.substring(match.end, afterEnd).trim()

    // Find the sentence containing this match
    const sentences = text.split(/[.!?]+/)
    let sentence = ''

    for (const sent of sentences) {
      const sentStart = text.indexOf(sent)
      const sentEnd = sentStart + sent.length

      if (match.start >= sentStart && match.end <= sentEnd) {
        sentence = sent.trim()
        break
      }
    }

    return { before, after, sentence }
  }

  /**
   * Generate replacement suggestions
   */
  private generateSuggestions(match: DetectionMatch): string[] {
    const suggestions: string[] = []

    // Generate based on category
    if (match.categories.includes('general')) {
      suggestions.push('[censored]', '[removed]', '***')
    }

    if (match.categories.includes('sexual')) {
      suggestions.push('[inappropriate content]', '[explicit content removed]')
    }

    if (match.categories.includes('violence')) {
      suggestions.push('[violent content]', '[aggressive language]')
    }

    if (match.categories.includes('hate_speech')) {
      suggestions.push('[hate speech removed]', '[offensive content]')
    }

    // Generate asterisk replacement
    const asteriskReplacement = '*'.repeat(match.word.length)
    suggestions.unshift(asteriskReplacement)

    // Generate partial replacement (keep first and last letter)
    if (match.word.length > 3) {
      const partial = match.word[0] + '*'.repeat(match.word.length - 2) + match.word[match.word.length - 1]
      suggestions.unshift(partial)
    }

    return Array.from(new Set(suggestions)) // Remove duplicates
  }

  /**
   * Get reason for detection
   */
  private getDetectionReason(match: DetectionMatch): string {
    const reasons: string[] = []

    if (match.confidence < 0.7) {
      reasons.push('fuzzy match')
    }

    if (match.severity >= SeverityEnum.HIGH) {
      reasons.push('high severity')
    }

    if (match.categories.includes('hate_speech')) {
      reasons.push('hate speech')
    }

    if (match.categories.includes('sexual')) {
      reasons.push('sexual content')
    }

    if (match.categories.includes('violence')) {
      reasons.push('violent content')
    }

    return reasons.length > 0 ? reasons.join(', ') : 'profanity detected'
  }

  /**
   * Calculate edit distance between two strings
   */
  private calculateEditDistance(str1: string, str2: string): number {
    // Simple implementation without complex matrix
    if (str1 === str2) return 0
    if (str1.length === 0) return str2.length
    if (str2.length === 0) return str1.length

    // Type assertion to help TypeScript understand the matrix is properly initialized
    const matrix = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(0)
    ) as number[][]

    // Initialize first row and column
    for (let i = 0; i <= str1.length; i++) {
      // Matrix row 0 is guaranteed to exist by Array.from above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      matrix[0]![i] = i
    }
    for (let j = 0; j <= str2.length; j++) {
      // All matrix rows are guaranteed to exist by Array.from above
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      matrix[j]![0] = j
    }

    // Fill matrix - all matrix indices within bounds are guaranteed by loop conditions
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        matrix[j]![i] = Math.min(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          matrix[j - 1]![i]! + 1,     // deletion
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          matrix[j]![i - 1]! + 1,     // insertion
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          matrix[j - 1]![i - 1]! + cost // substitution
        )
      }
    }

    // Final indices guaranteed by matrix initialization
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return matrix[str2.length]![str1.length]!
  }

  /**
   * Update statistics based on matches
   */
  private updateStatistics(): void {
    const matches = this.result.matches || []
    const stats = this.result.statistics

    // Count unique profane words
    const uniqueWords = new Set(matches.map(m => m.match.toLowerCase()))
    if (stats) {
      stats.uniqueProfaneWords = uniqueWords.size
    }

    // Calculate profanity density
    if (stats) {
      stats.profanityDensity = stats.totalWords > 0 ? (matches.length / stats.totalWords) : 0
    }

    // Update severity distribution
    for (const match of matches) {
      if (stats && stats.severityDistribution) {
        stats.severityDistribution[match.severity]++
      }
    }

    // Update category distribution
    for (const match of matches) {
      for (const category of match.categories) {
        if (stats && stats.categoryDistribution) {
          stats.categoryDistribution[category]++
        }
      }
    }

    // Update language distribution
    for (const match of matches) {
      if (stats && stats.languageDistribution) {
        stats.languageDistribution[match.language] =
          (stats.languageDistribution[match.language] || 0) + 1
      }
    }

    // Calculate confidence statistics
    if (matches.length > 0 && stats) {
      stats.averageConfidence = matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length

      const confidenceCounts = matches.reduce(
        (acc, m) => {
          if (m.confidence >= 0.8) acc.high++
          else if (m.confidence >= 0.5) acc.medium++
          else acc.low++
          return acc
        },
        { high: 0, medium: 0, low: 0 }
      )

      stats.confidenceDistribution = confidenceCounts
    }
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(): void {
    const performance = this.result.performance
    if (!performance) return

    const start = this.performanceMarkers.get('start') || this.startTime
    const end = this.performanceMarkers.get('end') || Date.now()

    performance.totalTime = end - start

    // Calculate component times if markers exist
    const langStart = this.performanceMarkers.get('language_detection_start')
    const langEnd = this.performanceMarkers.get('language_detection_end')
    if (langStart && langEnd) {
      performance.languageDetectionTime = langEnd - langStart
    }

    const normStart = this.performanceMarkers.get('normalization_start')
    const normEnd = this.performanceMarkers.get('normalization_end')
    if (normStart && normEnd) {
      performance.normalizationTime = normEnd - normStart
    }

    const matchStart = this.performanceMarkers.get('matching_start')
    const matchEnd = this.performanceMarkers.get('matching_end')
    if (matchStart && matchEnd) {
      performance.matchingTime = matchEnd - matchStart
    }

    const contextStart = this.performanceMarkers.get('context_start')
    const contextEnd = this.performanceMarkers.get('context_end')
    if (contextStart && contextEnd) {
      performance.contextAnalysisTime = contextEnd - contextStart
    }

    const filterStart = this.performanceMarkers.get('filtering_start')
    const filterEnd = this.performanceMarkers.get('filtering_end')
    if (filterStart && filterEnd) {
      performance.filteringTime = filterEnd - filterStart
    }

    // Calculate processing rate
    if (performance.totalTime > 0) {
      performance.processingRate = performance.charactersProcessed / performance.totalTime
    }
  }

  /**
   * Analyze text context
   */
  private analyzeTextContext(): void {
    const text = this.result.originalText || ''
    const context = this.result.textContext
    if (!context) return

    // Detect patterns
    context.patterns.hasUrls = /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/i.test(text)
    context.patterns.hasEmails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(text)
    context.patterns.hasMentions = /@\w+/.test(text)
    context.patterns.hasHashtags = /#\w+/.test(text)
    // Comprehensive emoji detection
    context.patterns.hasEmojis = EMOJI_REGEX.test(text)
    context.patterns.hasRepeatedChars = /(.)\1{2,}/.test(text)
    context.patterns.hasAllCaps = /\b[A-Z]{3,}\b/.test(text)

    // Estimate text type
    if (context.patterns.hasMentions || context.patterns.hasHashtags) {
      context.textType = 'social_media'
    } else if (context.patterns.hasEmails) {
      context.textType = 'email'
    } else if (text.length < 200 && context.patterns.hasEmojis) {
      context.textType = 'chat'
    } else if (text.length > 300) {
      context.textType = 'article'
    }

    // Estimate emotional tone
    const aggressiveWords = (text.match(/\b(hate|angry|furious|rage|kill|destroy|fight)\b/gi) || []).length
    const positiveWords = (text.match(/\b(love|happy|great|awesome|wonderful|amazing)\b/gi) || []).length
    const negativeWords = (text.match(/\b(sad|terrible|awful|horrible|disgusting|hate)\b/gi) || []).length

    const totalEmotionalWords = aggressiveWords + positiveWords + negativeWords

    if (totalEmotionalWords > 0) {
      context.emotionalTone.aggressive = aggressiveWords / totalEmotionalWords
      context.emotionalTone.positive = positiveWords / totalEmotionalWords
      context.emotionalTone.negative = negativeWords / totalEmotionalWords
      context.emotionalTone.neutral = Math.max(0, 1 - (aggressiveWords + positiveWords + negativeWords) / totalEmotionalWords)
    }
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(): void {
    const recommendations = this.result.recommendations || []
    const matches = this.result.matches || []
    const context = this.result.textContext

    if (matches.length === 0) {
      return
    }

    // High severity recommendations
    if (this.result.maxSeverity && this.result.maxSeverity >= SeverityEnum.HIGH) {
      recommendations.push('Consider complete content review due to high severity language')
    }

    // High density recommendations
    if (this.result.statistics && this.result.statistics.profanityDensity > 0.1) {
      recommendations.push('High profanity density detected - consider content moderation')
    }

    // Context-based recommendations
    if (context && context.textType === 'social_media' && matches.length > 0) {
      recommendations.push('Social media content may need community guidelines review')
    }

    if (context && context.emotionalTone.aggressive > 0.3) {
      recommendations.push('Aggressive tone detected - consider tone moderation')
    }

    // Low confidence recommendations
    const lowConfidenceMatches = matches.filter(m => m.confidence < 0.6)
    if (lowConfidenceMatches.length > 0) {
      recommendations.push(`${lowConfidenceMatches.length} matches have low confidence - manual review recommended`)
    }
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }
}

/**
 * Utility functions for working with detection results
 */
export class DetectionResultUtils {
  /**
   * Merge multiple detection results
   */
  static merge(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) {
      throw new Error('Cannot merge empty results array')
    }

    if (results.length === 1) {
      // results.length === 1 check guarantees first element exists
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return results[0]!
    }

    const merged = new DetectionResultBuilder(
      results.map(r => r.originalText).join(' ')
    )

    const allMatches: DetectionMatch[] = []
    const allLanguages: LanguageCode[] = []
    let maxSeverity = SeverityEnum.LOW
    let totalConfidence = 0
    let totalProcessingTime = 0

    for (const result of results) {
      allMatches.push(...result.matches)
      allLanguages.push(...result.detectedLanguages)
      maxSeverity = Math.max(maxSeverity, result.maxSeverity)
      totalConfidence += result.confidence
      totalProcessingTime += result.processingTime
    }

    // Remove duplicate languages
    const uniqueLanguages = Array.from(new Set(allLanguages))

    merged
      .setLanguages(uniqueLanguages)
      .addMatches(allMatches)
      .setConfidence(totalConfidence / results.length)

    const result = merged.build()
    result.processingTime = totalProcessingTime

    return result
  }

  /**
   * Compare two detection results
   */
  static compare(result1: DetectionResult, result2: DetectionResult): {
    matchesDiff: number
    severityDiff: number
    confidenceDiff: number
    summary: string
  } {
    const matchesDiff = result2.totalMatches - result1.totalMatches
    const severityDiff = result2.maxSeverity - result1.maxSeverity
    const confidenceDiff = result2.confidence - result1.confidence

    let summary = ''
    if (matchesDiff > 0) {
      summary += `${matchesDiff} more matches found. `
    } else if (matchesDiff < 0) {
      summary += `${Math.abs(matchesDiff)} fewer matches found. `
    }

    if (severityDiff > 0) {
      summary += 'Higher severity detected. '
    } else if (severityDiff < 0) {
      summary += 'Lower severity detected. '
    }

    if (Math.abs(confidenceDiff) > 0.1) {
      summary += `Confidence ${confidenceDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(confidenceDiff).toFixed(2)}. `
    }

    if (!summary) {
      summary = 'Results are similar.'
    }

    return {
      matchesDiff,
      severityDiff,
      confidenceDiff,
      summary: summary.trim()
    }
  }

  /**
   * Export result to JSON with custom formatting
   */
  static toJSON(result: DetectionResult, includeText = false): string {
    const exportData: Record<string, unknown> = {
      hasProfanity: result.hasProfanity,
      totalMatches: result.totalMatches,
      maxSeverity: result.maxSeverity,
      detectedLanguages: result.detectedLanguages,
      confidence: result.confidence,
      processingTime: result.processingTime,
      matches: result.matches.map(match => ({
        word: match.word,
        severity: match.severity,
        categories: match.categories,
        confidence: match.confidence,
        position: { start: match.start, end: match.end }
      }))
    }

    if (includeText) {
      exportData.originalText = result.originalText
      exportData.filteredText = result.filteredText
    }

    return JSON.stringify(exportData, null, 2)
  }
}