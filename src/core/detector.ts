import type {
  DetectorConfig,
  DetectionResult,
  DetectionMatch,
  AnalysisOptions,
  LanguageCode,
  CustomWord,
} from '../types/index.js'
import { SeverityLevel, FilterMode } from '../types/index.js'
import { DEFAULT_DETECTOR_CONFIG } from '../config/default-config.js'
import { ProfanityMatcher, type MatcherConfig } from './profanity-matcher.js'
import { ProfanityFilter, type FilterConfig } from './filter.js'
import { DetectionResultBuilder, type EnhancedDetectionResult } from './detection-result.js'
import { LanguageDetector } from './language-detector.js'
import { textNormalizer } from '../utils/text-normalizer.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

/**
 * Main profanity detection class with comprehensive analysis capabilities
 */
export class NaughtyWordsDetector {
  private config: DetectorConfig
  private matcher: ProfanityMatcher
  private filterEngine: ProfanityFilter
  private languageDetector: LanguageDetector
  private isInitialized = false
  private configHash = ''

  constructor(config: Partial<DetectorConfig> = {}) {
    this.config = this.mergeWithDefaults(config)
    this.configHash = this.generateConfigHash(this.config)

    // Initialize components
    this.languageDetector = new LanguageDetector()
    this.matcher = new ProfanityMatcher(this.createMatcherConfig())
    this.filterEngine = new ProfanityFilter(this.createFilterConfig())
  }

  /**
   * Initialize the detector with language data
   */
  async initialize(dataPath?: string): Promise<void> {
    if (this.isInitialized) return

    // Resolve data path relative to package location
    const basePath = dataPath || path.join(process.cwd(), 'data', 'languages')

    // Load language data for each configured language
    const loadPromises = this.config.languages
      .filter(lang => lang !== 'auto')
      .map(lang => this.loadLanguageData(lang as LanguageCode, basePath))

    await Promise.all(loadPromises)

    // Add custom words if any
    if (this.config.customWords.length > 0) {
      this.matcher.addCustomWords(this.config.customWords)
    }

    this.isInitialized = true
  }

  /**
   * Analyze text for profanity with comprehensive results
   */
  async analyze(
    text: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<DetectionResult> {
    // Enhanced analysis returns EnhancedDetectionResult but we return base type for compatibility
    const enhanced = await this.analyzeEnhanced(text, options)
    return enhanced as DetectionResult
  }

  /**
   * Enhanced analysis with detailed metrics and context
   */
  async analyzeEnhanced(
    text: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<EnhancedDetectionResult> {
    await this.ensureInitialized()

    // Handle null/undefined/empty inputs
    if (!text || text.length === 0) {
      const builder = new DetectionResultBuilder(text || '')
      return builder.build() as EnhancedDetectionResult
    }

    const effectiveOptions = this.mergeAnalysisOptions(options)
    const builder = new DetectionResultBuilder(text)

    builder.setConfigHash(this.configHash)

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('language_detection_start')
    }

    // Step 1: Detect languages
    let detectedLanguages: LanguageCode[] = []
    if (this.config.languages.includes('auto')) {
      const languageResults = await this.languageDetector.detect(text)

      // For mixed text with multiple scripts, be more permissive
      const hasMultipleScripts = this.hasMultipleScripts(text)
      const threshold = hasMultipleScripts ? 0.1 : 0.5

      detectedLanguages = languageResults
        .filter(result => result.confidence > threshold)
        .map(result => result.language)

      // Fallback to English if no languages detected
      if (detectedLanguages.length === 0) {
        detectedLanguages = ['en']
      }
    } else {
      detectedLanguages = this.config.languages.filter(lang => lang !== 'auto')
    }

    builder.setLanguages(detectedLanguages)

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('language_detection_end')
      builder.markPerformance('normalization_start')
    }

    // Step 2: Text normalization
    const normalizedText = this.config.normalizeText
      ? textNormalizer.normalize(text, {
          removeAccents: true,
          expandContractions: true,
          normalizeWhitespace: true,
          preserveCase: false
        })
      : text

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('normalization_end')
      builder.markPerformance('matching_start')
    }

    // Step 3: Find profanity matches
    const matches = this.matcher.findMatches(
      normalizedText,
      detectedLanguages,
      false
    )

    builder.addMatches(matches)

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('matching_end')
      builder.markPerformance('context_start')
    }

    // Step 4: Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(matches, text)
    builder.setConfidence(overallConfidence)

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('context_end')
      builder.markPerformance('filtering_start')
    }

    // Step 5: Apply filtering if requested
    let filteredText = text
    if (effectiveOptions.filterMode !== FilterMode.DETECT_ONLY) {
      const filterResult = this.filterEngine.filter(text, matches, {
        mode: effectiveOptions.filterMode,
        confidenceThreshold: 0.5
      })
      filteredText = filterResult.filteredText
    }

    builder.setFilteredText(filteredText)

    if (effectiveOptions.measurePerformance) {
      builder.markPerformance('filtering_end')
    }

    // Generate warnings and recommendations
    this.addWarningsAndRecommendations(builder, matches, text)

    return builder.build()
  }

  /**
   * Check if text contains multiple Unicode scripts
   */
  private hasMultipleScripts(text: string): boolean {
    const scripts = [
      { pattern: /[\u4e00-\u9fff]/, name: 'Chinese' },
      { pattern: /[\u3040-\u309f\u30a0-\u30ff]/, name: 'Japanese' },
      { pattern: /[\u0600-\u06ff]/, name: 'Arabic' },
      { pattern: /[\u0400-\u04ff]/, name: 'Cyrillic' },
      { pattern: /[\u0900-\u097f]/, name: 'Devanagari' },
      { pattern: /[\uac00-\ud7af]/, name: 'Korean' },
      { pattern: /[a-zA-Z]/, name: 'Latin' }
    ]

    const detectedScripts = new Set<string>()
    for (const script of scripts) {
      if (script.pattern.test(text)) {
        detectedScripts.add(script.name)
      }
    }

    return detectedScripts.size > 1
  }

  /**
   * Quick check if text contains profanity
   */
  async isProfane(text: string): Promise<boolean> {
    const result = await this.analyze(text)
    return result.hasProfanity
  }

  /**
   * Filter profanity from text
   */
  async filter(
    text: string,
    mode: FilterMode = FilterMode.CENSOR
  ): Promise<string> {
    const result = await this.analyze(text, { filterMode: mode })
    return result.filteredText
  }

  /**
   * Batch analyze multiple texts (basic implementation)
   * Note: Enhanced batch analysis is available via performance optimizations
   */
  async batchAnalyzeBasic(
    texts: string[],
    options: Partial<AnalysisOptions> = {}
  ): Promise<DetectionResult[]> {
    await this.ensureInitialized()

    const promises = texts.map(text => this.analyze(text, options))
    return Promise.all(promises)
  }

  /**
   * Get detection statistics
   */
  getStats(): {
    isInitialized: boolean
    configHash: string
    matcherStats: {
      totalLanguages: number
      totalWords: number
      trieStats: Record<string, {
        totalWords: number
        totalNodes: number
        averageDepth: number
        maxDepth: number
        memoryUsage: number
      }>
    }
    filterStats: {
      customReplacements: number
      categoryReplacements: number
      currentMode: import('../types/index.js').FilterMode
      preserveStructure: boolean
    }
    supportedLanguages: LanguageCode[]
  } {
    return {
      isInitialized: this.isInitialized,
      configHash: this.configHash,
      matcherStats: this.matcher.getStats(),
      filterStats: this.filterEngine.getStats(),
      supportedLanguages: this.config.languages
    }
  }

  /**
   * Add custom words to the detector
   */
  addCustomWords(customWords: CustomWord[]): void {
    this.config.customWords.push(...customWords)
    this.matcher.addCustomWords(customWords)
    this.configHash = this.generateConfigHash(this.config)
  }

  /**
   * Update detector configuration
   */
  updateConfig(config: Partial<DetectorConfig>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...config })
    this.configHash = this.generateConfigHash(this.config)

    // Update component configurations
    this.matcher.updateConfig(this.createMatcherConfig())
    this.filterEngine.updateConfig(this.createFilterConfig())
  }

  /**
   * Get current configuration
   */
  getConfig(): DetectorConfig {
    return { ...this.config }
  }

  /**
   * Reset detector (clear cache and reinitialize)
   */
  async reset(): Promise<void> {
    this.isInitialized = false
    await this.initialize()
  }

  /**
   * Export detector configuration for serialization
   */
  exportConfig(): object {
    return {
      config: this.config,
      configHash: this.configHash,
      version: '1.0.0',
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Import detector configuration
   */
  importConfig(exportedConfig: { config?: DetectorConfig }): void {
    if (exportedConfig.config) {
      this.updateConfig(exportedConfig.config)
    }
  }

  /**
   * Ensure detector is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }

  /**
   * Load language data from file
   * Now supports split-file structure: profanity.json, severity.json, etc.
   */
  private async loadLanguageData(
    language: LanguageCode,
    basePath: string
  ): Promise<void> {
    try {
      // Try new split-file structure first
      const langDir = path.join(basePath, language)
      const profanityPath = path.join(langDir, 'profanity.json')

      try {
        // Load split files
        const profanityContent = await fs.readFile(profanityPath, 'utf-8')
        const profanityData = JSON.parse(profanityContent)

        // Load additional files if they exist
        let severityData: any = {}
        let categoriesData: any = {}
        let variationsData: any = {}

        try {
          const severityContent = await fs.readFile(path.join(langDir, 'severity.json'), 'utf-8')
          severityData = JSON.parse(severityContent)
        } catch { /* optional file */ }

        try {
          const categoriesContent = await fs.readFile(path.join(langDir, 'categories.json'), 'utf-8')
          categoriesData = JSON.parse(categoriesContent)
        } catch { /* optional file */ }

        try {
          const variationsContent = await fs.readFile(path.join(langDir, 'variations.json'), 'utf-8')
          variationsData = JSON.parse(variationsContent)
        } catch { /* optional file */ }

        // Merge data from split files
        const words = profanityData.words || []
        const mergedWords = words.map((word: any) => {
          const wordKey = typeof word === 'string' ? word : word.word
          return {
            word: wordKey,
            severity: severityData[wordKey] || word.severity || 1,
            categories: categoriesData[wordKey] || word.categories || ['general'],
            variations: variationsData[wordKey] || word.variations || []
          }
        })

        await this.matcher.loadLanguage(language, mergedWords)
      } catch {
        // Fall back to monolithic file structure
        const filePath = path.join(basePath, `${language}.json`)
        const fileContent = await fs.readFile(filePath, 'utf-8')
        const languageData = JSON.parse(fileContent)

        if (languageData.words && Array.isArray(languageData.words)) {
          await this.matcher.loadLanguage(language, languageData.words)
        }
      }
    } catch (error) {
      console.warn(`Failed to load language data for ${language}:`, error)
      // Continue with other languages
    }
  }

  /**
   * Create matcher configuration from detector config
   */
  private createMatcherConfig(): MatcherConfig {
    return {
      languages: this.config.languages,
      minSeverity: this.config.minSeverity,
      categories: this.config.categories,
      fuzzyMatching: this.config.fuzzyMatching,
      fuzzyThreshold: this.config.fuzzyThreshold,
      whitelist: this.config.whitelist,
      contextAware: true,
      minWordLength: 2,
      maxEditDistance: Math.max(1, Math.floor(this.config.fuzzyThreshold * 3))
    }
  }

  /**
   * Create filter configuration from detector config
   */
  private createFilterConfig(): FilterConfig {
    return {
      mode: FilterMode.CENSOR,
      replacementChar: this.config.replacementChar,
      preserveStructure: this.config.preserveStructure,
      customReplacements: new Map(),
      preserveSentenceStructure: true,
      maintainLength: false,
      confidenceThreshold: 0.5,
      gradualFiltering: true,
      categoryReplacements: new Map()
    }
  }

  /**
   * Calculate overall confidence based on matches
   */
  private calculateOverallConfidence(matches: DetectionMatch[], text: string): number {
    if (matches.length === 0) return 1.0

    // Base confidence on average match confidence, text length, and context
    const averageConfidence = matches.reduce((sum, match) => sum + match.confidence, 0) / matches.length

    // Adjust for text length (longer text generally more reliable)
    const lengthFactor = Math.min(1.0, text.length / 100)

    // Adjust for number of matches (more matches generally more confident)
    const matchesFactor = Math.min(1.0, matches.length / 5)

    return Math.max(0.1, Math.min(1.0, averageConfidence * (0.7 + lengthFactor * 0.2 + matchesFactor * 0.1)))
  }

  /**
   * Add warnings and recommendations to the result builder
   */
  private addWarningsAndRecommendations(
    builder: DetectionResultBuilder,
    matches: DetectionMatch[],
    text: string
  ): void {
    // Add warnings for potential issues
    if (text.length < 10) {
      builder.addWarning('Very short text - results may be less reliable')
    }

    if (matches.some(m => m.confidence < 0.5)) {
      builder.addWarning('Some matches have low confidence - manual review recommended')
    }

    if (this.config.languages.length === 1 && this.config.languages[0] === 'auto') {
      builder.addWarning('Auto language detection enabled - specify languages for better performance')
    }

    // Add recommendations
    if (matches.length > text.split(' ').length * 0.2) {
      builder.addRecommendation('High profanity density detected - consider comprehensive content review')
    }

    if (matches.some(m => m.severity >= SeverityLevel.SEVERE)) {
      builder.addRecommendation('Severe profanity detected - immediate action recommended')
    }
  }

  /**
   * Merge analysis options with defaults
   */
  private mergeAnalysisOptions(options: Partial<AnalysisOptions>): AnalysisOptions {
    return {
      filterMode: FilterMode.DETECT_ONLY,
      includeMatches: true,
      includeConfidence: true,
      measurePerformance: false,
      maxLength: 100000,
      ...options
    }
  }

  /**
   * Generate configuration hash for caching
   */
  private generateConfigHash(config: DetectorConfig): string {
    const configString = JSON.stringify({
      languages: config.languages.sort(),
      minSeverity: config.minSeverity,
      categories: config.categories.sort(),
      fuzzyMatching: config.fuzzyMatching,
      fuzzyThreshold: config.fuzzyThreshold,
      customWords: config.customWords.map(w => w.word).sort(),
      whitelist: config.whitelist.sort()
    })

    // Simple hash function
    let hash = 0
    for (let i = 0; i < configString.length; i++) {
      const char = configString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return hash.toString(36)
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<DetectorConfig>): DetectorConfig {
    return {
      ...DEFAULT_DETECTOR_CONFIG,
      ...config,
    }
  }

  /**
   * PERFORMANCE OPTIMIZATIONS
   */

  // Analysis cache for frequently analyzed texts
  private analysisCache = new Map<string, EnhancedDetectionResult>()
  private readonly MAX_ANALYSIS_CACHE_SIZE = 500
  private analysisCacheHits = 0
  private analysisCacheMisses = 0

  /**
   * Cached analysis with intelligent cache management
   */
  async analyzeCached(
    text: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<EnhancedDetectionResult> {
    const cacheKey = this.generateAnalysisCacheKey(text, options)

    // Check cache first
    if (this.analysisCache.has(cacheKey)) {
      this.analysisCacheHits++
      const cachedResult = this.analysisCache.get(cacheKey)
      if (cachedResult) {
        return cachedResult
      }
    }

    this.analysisCacheMisses++
    const result = await this.analyzeEnhanced(text, options)

    // Add to cache if under limit
    if (this.analysisCache.size < this.MAX_ANALYSIS_CACHE_SIZE) {
      this.analysisCache.set(cacheKey, result)
    } else {
      // Remove oldest entries
      const oldestKey = this.analysisCache.keys().next().value
      if (oldestKey !== undefined) {
        this.analysisCache.delete(oldestKey)
      }
      this.analysisCache.set(cacheKey, result)
    }

    return result
  }

  /**
   * Batch analysis for multiple texts - significantly more efficient
   */
  async batchAnalyze(
    texts: string[],
    options: Partial<AnalysisOptions> = {}
  ): Promise<EnhancedDetectionResult[]> {
    await this.ensureInitialized()

    // Pre-warm language detector for better performance
    if (texts.length > 10) {
      const sampleTexts = texts.slice(0, 3).join(' ')
      await this.languageDetector.detect(sampleTexts)
    }

    // PERFORMANCE OPTIMIZATION: Larger batch size for better parallelization
    // Adjusted from 10 to 25 for better throughput
    const BATCH_SIZE = 25
    const results: EnhancedDetectionResult[] = []

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE)
      const batchPromises = batch.map(text => this.analyzeCached(text, options))
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Memory-efficient streaming analysis for large datasets
   */
  async *batchAnalyzeStream(
    texts: Iterable<string>,
    options: Partial<AnalysisOptions> = {}
  ): AsyncGenerator<EnhancedDetectionResult, void, unknown> {
    for (const text of texts) {
      yield await this.analyzeCached(text, options)
    }
  }

  /**
   * Worker thread support for large text processing
   *
   * NOTE: This is currently optimized for single-threaded performance.
   * With our fuzzy search optimizations, single-threaded analysis is already
   * very fast (<20ms for 10k words). Chunking adds overhead without actual
   * worker threads, so we use the optimized single-threaded path.
   *
   * True worker thread parallelization would require:
   * 1. Serialization/deserialization of language data
   * 2. Worker thread pool management
   * 3. Inter-process communication overhead
   *
   * For most use cases, the current single-threaded performance is sufficient.
   */
  async analyzeWithWorkers(
    text: string,
    options: Partial<AnalysisOptions> = {}
  ): Promise<EnhancedDetectionResult> {
    // PERFORMANCE: Use optimized single-threaded path
    // Our fuzzy search optimizations make this fast enough for most use cases
    // Chunking without actual worker threads adds overhead
    return this.analyzeCached(text, options)
  }

  /**
   * Lazy initialization of language data for memory efficiency
   */
  private lazyLoadedLanguages = new Set<LanguageCode>()

  async ensureLanguageLoaded(language: LanguageCode, dataPath?: string): Promise<void> {
    if (this.lazyLoadedLanguages.has(language)) {
      return
    }

    const safePath = dataPath || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'languages')
    await this.loadLanguageData(language, safePath)
    this.lazyLoadedLanguages.add(language)
  }

  /**
   * Generate cache key for analysis
   */
  private generateAnalysisCacheKey(text: string, options: Partial<AnalysisOptions>): string {
    const optionsHash = JSON.stringify(options)
    return `${this.configHash}:${optionsHash}:${text.slice(0, 100)}` // Use first 100 chars for key
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    analysisCacheHits: number
    analysisCacheMisses: number
    analysisCacheHitRate: number
    analysisCacheSize: number
    lazyLoadedLanguages: number
  } {
    const total = this.analysisCacheHits + this.analysisCacheMisses
    return {
      analysisCacheHits: this.analysisCacheHits,
      analysisCacheMisses: this.analysisCacheMisses,
      analysisCacheHitRate: total > 0 ? this.analysisCacheHits / total : 0,
      analysisCacheSize: this.analysisCache.size,
      lazyLoadedLanguages: this.lazyLoadedLanguages.size
    }
  }

  /**
   * Clear all caches and reset performance counters
   */
  clearCaches(): void {
    this.analysisCache.clear()
    this.analysisCacheHits = 0
    this.analysisCacheMisses = 0

    // Also clear trie caches if available
    if (this.matcher && 'clearCaches' in this.matcher) {
      ;(this.matcher as { clearCaches: () => void }).clearCaches()
    }
  }

  /**
   * Memory optimization - force garbage collection
   */
  optimizeMemory(): void {
    this.clearCaches()
    this.lazyLoadedLanguages.clear()

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Warm up caches with common patterns
   */
  async warmUpCaches(commonTexts: string[]): Promise<void> {
    const options: Partial<AnalysisOptions> = { measurePerformance: false }

    for (const text of commonTexts) {
      await this.analyzeCached(text, options)
    }
  }
}
