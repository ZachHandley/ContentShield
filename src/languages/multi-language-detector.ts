/**
 * Multi-language detection and coordination system
 * Manages detection across multiple languages with intelligent optimization
 */

import type {
  DetectorConfig,
  LanguageCode,
  DetectionResult,
  AnalysisOptions,
  ProfanityCategory
} from '../types/index.js'
import { SeverityLevel } from '../types/index.js'
import { NaughtyWordsDetector } from '../core/detector.js'
import { LanguageDetector } from '../core/language-detector.js'
import { LanguageLoader } from './language-loader.js'
import { ConfigManager } from '../config/config-manager.js'

/**
 * Multi-language detection result
 */
export interface MultiLanguageDetectionResult extends DetectionResult {
  languageResults: Map<LanguageCode, DetectionResult>
  primaryLanguage: LanguageCode
  languageConfidences: Map<LanguageCode, number>
  crossLanguageMatches: boolean
}

/**
 * Multi-language detector options
 */
export interface MultiLanguageDetectorOptions {
  languages: LanguageCode[]
  autoDetectLanguages?: boolean
  primaryLanguage?: LanguageCode
  enableCrossLanguageMatching?: boolean
  languageThreshold?: number // Minimum confidence for language detection
  parallelProcessing?: boolean
  cacheResults?: boolean
  optimizeForPerformance?: boolean
}

/**
 * Language detection strategy
 */
export enum LanguageDetectionStrategy {
  AUTO = 'auto', // Auto-detect based on text
  EXPLICIT = 'explicit', // Use only specified languages
  HYBRID = 'hybrid', // Combine auto-detection with explicit list
}

/**
 * Multi-language profanity detector
 */
export class MultiLanguageDetector {
  private languageDetectors = new Map<LanguageCode, NaughtyWordsDetector>()
  private languageDetector: LanguageDetector
  private languageLoader: LanguageLoader
  private configManager: ConfigManager
  private options: Required<MultiLanguageDetectorOptions>

  // Performance tracking
  private detectionStats = new Map<LanguageCode, {
    totalDetections: number
    averageTime: number
    lastUsed: Date
  }>()

  // Caching
  private resultCache = new Map<string, MultiLanguageDetectionResult>()
  private readonly MAX_CACHE_SIZE = 1000

  constructor(
    baseConfig: Partial<DetectorConfig> = {},
    options: Partial<MultiLanguageDetectorOptions> = {}
  ) {
    this.options = {
      languages: ['en'],
      autoDetectLanguages: true,
      primaryLanguage: 'en',
      enableCrossLanguageMatching: true,
      languageThreshold: 0.3,
      parallelProcessing: true,
      cacheResults: true,
      optimizeForPerformance: false,
      ...options
    }

    this.languageDetector = new LanguageDetector()
    this.languageLoader = new LanguageLoader()
    this.configManager = new ConfigManager(baseConfig)

    // Initialize language-specific detectors
    this.initializeLanguageDetectors()
  }

  /**
   * Initialize detectors for each configured language
   */
  private async initializeLanguageDetectors(): Promise<void> {
    const initPromises = this.options.languages.map(async (language) => {
      try {
        const optimizedConfig = this.configManager.getOptimizedConfigForLanguages([language])
        const detector = new NaughtyWordsDetector(optimizedConfig)
        await detector.initialize()

        this.languageDetectors.set(language, detector)
        this.detectionStats.set(language, {
          totalDetections: 0,
          averageTime: 0,
          lastUsed: new Date()
        })
      } catch (error) {
        console.warn(`Failed to initialize detector for language ${language}:`, error)
      }
    })

    await Promise.all(initPromises)
  }

  /**
   * Detect profanity across multiple languages
   */
  async detect(
    text: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<MultiLanguageDetectionResult> {
    // Check cache first
    if (this.options.cacheResults) {
      const cacheKey = this.generateCacheKey(text, options)
      const cached = this.resultCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const startTime = performance.now()

    // Step 1: Detect languages in text
    const detectedLanguages = await this.detectLanguagesInText(text)

    // Step 2: Determine which languages to analyze
    const languagesToAnalyze = this.selectLanguagesForAnalysis(detectedLanguages)

    // Step 3: Perform analysis for each selected language
    const languageResults = await this.analyzeWithMultipleLanguages(
      text,
      languagesToAnalyze,
      options
    )

    // Step 4: Merge and optimize results
    const mergedResult = this.mergeLanguageResults(
      text,
      languageResults,
      detectedLanguages
    )

    // Update performance stats
    this.updatePerformanceStats(languagesToAnalyze, performance.now() - startTime)

    // Cache result if enabled
    if (this.options.cacheResults) {
      this.cacheResult(text, options, mergedResult)
    }

    return mergedResult
  }

  /**
   * Detect languages present in text
   */
  private async detectLanguagesInText(text: string): Promise<Map<LanguageCode, number>> {
    const detectionResults = await this.languageDetector.detect(text)
    const languageConfidences = new Map<LanguageCode, number>()

    for (const result of detectionResults) {
      if (result.confidence >= this.options.languageThreshold) {
        languageConfidences.set(result.language, result.confidence)
      }
    }

    // Fallback to primary language if no languages detected
    if (languageConfidences.size === 0 && this.options.primaryLanguage) {
      languageConfidences.set(this.options.primaryLanguage, 0.5)
    }

    return languageConfidences
  }

  /**
   * Select languages for analysis based on detection and configuration
   */
  private selectLanguagesForAnalysis(detectedLanguages: Map<LanguageCode, number>): LanguageCode[] {
    const selected = new Set<LanguageCode>()

    if (this.options.autoDetectLanguages) {
      // Add detected languages above threshold
      for (const [language, confidence] of detectedLanguages) {
        if (confidence >= this.options.languageThreshold && this.languageDetectors.has(language)) {
          selected.add(language)
        }
      }
    }

    // Always include configured languages if available
    for (const language of this.options.languages) {
      if (this.languageDetectors.has(language)) {
        selected.add(language)
      }
    }

    // Ensure primary language is included
    if (this.options.primaryLanguage && this.languageDetectors.has(this.options.primaryLanguage)) {
      selected.add(this.options.primaryLanguage)
    }

    return Array.from(selected)
  }

  /**
   * Analyze text with multiple language detectors
   */
  private async analyzeWithMultipleLanguages(
    text: string,
    languages: LanguageCode[],
    options: Partial<AnalysisOptions>
  ): Promise<Map<LanguageCode, DetectionResult>> {
    const results = new Map<LanguageCode, DetectionResult>()

    if (this.options.parallelProcessing && languages.length > 1) {
      // Parallel processing for multiple languages
      const analysisPromises = languages.map(async (language) => {
        const detector = this.languageDetectors.get(language)!
        const result = await detector.analyze(text, options)
        return { language, result }
      })

      const parallelResults = await Promise.all(analysisPromises)
      for (const { language, result } of parallelResults) {
        results.set(language, result)
      }
    } else {
      // Sequential processing
      for (const language of languages) {
        const detector = this.languageDetectors.get(language)
        if (detector) {
          const result = await detector.analyze(text, options)
          results.set(language, result)
        }
      }
    }

    return results
  }

  /**
   * Merge results from multiple language detectors
   */
  private mergeLanguageResults(
    originalText: string,
    languageResults: Map<LanguageCode, DetectionResult>,
    detectedLanguages: Map<LanguageCode, number>
  ): MultiLanguageDetectionResult {
    // Find primary result (highest confidence or primary language)
    let primaryResult: DetectionResult | null = null
    let primaryLanguage: LanguageCode = this.options.primaryLanguage!

    let highestConfidence = 0
    for (const [language, result] of languageResults) {
      const langConfidence = detectedLanguages.get(language) || 0.1
      if (langConfidence > highestConfidence) {
        highestConfidence = langConfidence
        primaryResult = result
        primaryLanguage = language
      }
    }

    // Fallback to first result if no primary found
    if (!primaryResult && languageResults.size > 0) {
      const firstEntry = languageResults.entries().next().value
      if (firstEntry) {
        primaryResult = firstEntry[1]
        primaryLanguage = firstEntry[0]
      }
    }

    // Merge all matches
    const allMatches: any[] = []
    const allCategories = new Set<ProfanityCategory>()
    let maxSeverity: SeverityLevel = SeverityLevel.LOW
    let totalConfidence = 0

    for (const result of languageResults.values()) {
      if (result.matches) {
        allMatches.push(...result.matches)
        // Extract categories from matches
        result.matches.forEach(match => {
          match.categories.forEach(cat => allCategories.add(cat))
        })
      }
      if (result.maxSeverity > maxSeverity) {
        maxSeverity = result.maxSeverity
      }
      totalConfidence += (result.confidence || 0)
    }

    const avgConfidence = languageResults.size > 0 ? totalConfidence / languageResults.size : 0

    // Detect cross-language matches
    const crossLanguageMatches = this.detectCrossLanguageMatches(languageResults)

    // Build merged result - use primary result as base and extend it
    const baseResult = primaryResult || {
      originalText,
      filteredText: originalText,
      hasProfanity: allMatches.length > 0,
      totalMatches: allMatches.length,
      maxSeverity,
      matches: allMatches,
      detectedLanguages: Array.from(detectedLanguages.keys()),
      confidence: avgConfidence,
      processingTime: 0
    }

    const mergedResult: MultiLanguageDetectionResult = {
      ...baseResult,
      languageResults,
      primaryLanguage,
      languageConfidences: detectedLanguages,
      crossLanguageMatches
    }

    return mergedResult
  }

  /**
   * Detect cross-language profanity matches
   */
  private detectCrossLanguageMatches(languageResults: Map<LanguageCode, DetectionResult>): boolean {
    if (!this.options.enableCrossLanguageMatching || languageResults.size < 2) {
      return false
    }

    const languageMatchCounts = new Map<LanguageCode, number>()

    for (const [language, result] of languageResults) {
      languageMatchCounts.set(language, result.matches?.length || 0)
    }

    // Check if multiple languages detected matches
    const languagesWithMatches = Array.from(languageMatchCounts.values())
      .filter(count => count > 0).length

    return languagesWithMatches > 1
  }

  /**
   * Add support for new language
   */
  async addLanguage(
    language: LanguageCode,
    config?: Partial<DetectorConfig>
  ): Promise<boolean> {
    try {
      // Check if language data is available
      const isAvailable = await this.languageLoader.isLanguageAvailable(language)
      if (!isAvailable) {
        console.warn(`Language data not available for ${language}`)
        return false
      }

      // Create optimized configuration
      const baseConfig = config || this.configManager.getConfig()
      const optimizedConfig = this.configManager.getOptimizedConfigForLanguages([language])
      const finalConfig = { ...baseConfig, ...optimizedConfig }

      // Initialize detector
      const detector = new NaughtyWordsDetector(finalConfig)
      await detector.initialize()

      // Add to collection
      this.languageDetectors.set(language, detector)
      this.detectionStats.set(language, {
        totalDetections: 0,
        averageTime: 0,
        lastUsed: new Date()
      })

      // Update options
      if (!this.options.languages.includes(language)) {
        this.options.languages.push(language)
      }

      return true
    } catch (error) {
      console.error(`Failed to add language ${language}:`, error)
      return false
    }
  }

  /**
   * Remove language support
   */
  removeLanguage(language: LanguageCode): boolean {
    if (language === this.options.primaryLanguage) {
      console.warn(`Cannot remove primary language ${language}`)
      return false
    }

    const removed = this.languageDetectors.delete(language)
    this.detectionStats.delete(language)

    // Update options
    this.options.languages = this.options.languages.filter(lang => lang !== language)

    return removed
  }

  /**
   * Get available languages
   */
  getAvailableLanguages(): LanguageCode[] {
    return Array.from(this.languageDetectors.keys())
  }

  /**
   * Get language-specific detector
   */
  getLanguageDetector(language: LanguageCode): NaughtyWordsDetector | undefined {
    return this.languageDetectors.get(language)
  }

  /**
   * Update configuration for all language detectors
   */
  async updateConfiguration(newConfig: Partial<DetectorConfig>): Promise<void> {
    await this.configManager.updateConfig(newConfig)

    // Update all language detectors
    const updatePromises = Array.from(this.languageDetectors.entries()).map(
      async ([language]) => {
        const optimizedConfig = this.configManager.getOptimizedConfigForLanguages([language])
        const finalConfig = { ...newConfig, ...optimizedConfig }

        // Create new detector with updated config
        const newDetector = new NaughtyWordsDetector(finalConfig)
        await newDetector.initialize()

        this.languageDetectors.set(language, newDetector)
      }
    )

    await Promise.all(updatePromises)
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    languageStats: Map<LanguageCode, {
      totalDetections: number
      averageTime: number
      lastUsed: Date
    }>
    cacheStats: {
      size: number
      hitRate: number
    }
  } {
    const cacheStats = {
      size: this.resultCache.size,
      hitRate: 0 // TODO: Implement cache hit tracking
    }

    return {
      languageStats: new Map(this.detectionStats),
      cacheStats
    }
  }

  /**
   * Warm up caches for common patterns
   */
  async warmUpCaches(commonTexts: string[]): Promise<void> {
    const warmupPromises = commonTexts.map(text => this.detect(text))
    await Promise.all(warmupPromises)
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    // Clear result cache
    this.resultCache.clear()

    // Optimize individual detectors
    for (const detector of this.languageDetectors.values()) {
      if (typeof detector.optimizeMemory === 'function') {
        detector.optimizeMemory()
      }
    }

    // Optimize language loader
    this.languageLoader.optimizeMemory()

    // Force garbage collection
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Generate cache key for result caching
   */
  private generateCacheKey(text: string, options: Partial<AnalysisOptions>): string {
    const optionsHash = JSON.stringify(options)
    return `${text.slice(0, 50)}:${optionsHash}` // Use first 50 chars as key
  }

  /**
   * Cache analysis result
   */
  private cacheResult(
    text: string,
    options: Partial<AnalysisOptions>,
    result: MultiLanguageDetectionResult
  ): void {
    if (this.resultCache.size >= this.MAX_CACHE_SIZE) {
      // Simple cache eviction - remove oldest entries
      const keysToRemove = Array.from(this.resultCache.keys()).slice(0, this.MAX_CACHE_SIZE / 4)
      keysToRemove.forEach(key => this.resultCache.delete(key))
    }

    const cacheKey = this.generateCacheKey(text, options)
    this.resultCache.set(cacheKey, result)
  }

  /**
   * Update performance statistics
   */
  private updatePerformanceStats(languages: LanguageCode[], totalTime: number): void {
    const timePerLanguage = totalTime / languages.length

    for (const language of languages) {
      const stats = this.detectionStats.get(language)
      if (stats) {
        stats.totalDetections++
        stats.averageTime = ((stats.averageTime * (stats.totalDetections - 1)) + timePerLanguage) / stats.totalDetections
        stats.lastUsed = new Date()
      }
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.languageDetectors.clear()
    this.detectionStats.clear()
    this.resultCache.clear()
    this.languageLoader.dispose()
    this.configManager.dispose()
  }
}