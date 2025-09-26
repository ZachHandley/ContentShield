/**
 * NaughtyWords - A modern TypeScript library for multi-language profanity detection
 * and content moderation with severity levels and customizable filtering
 *
 * Features:
 * - Multi-language support (12+ languages)
 * - Performance optimizations with intelligent caching
 * - Comprehensive configuration system
 * - Advanced language integration
 * - Worker thread support for large texts
 * - Memory-efficient operations
 * - Real-time configuration management
 */

// Export all types first
export * from './types/index.js'

// Import types for internal use
import type {
  DetectorConfig,
  LanguageCode,
  DetectionResult
} from './types/index.js'

// Core detection classes
export { NaughtyWordsDetector } from './core/detector.js'
export { LanguageDetector } from './core/language-detector.js'
export { ProfanityFilter } from './core/filter.js'
export { ProfanityTrie } from './core/trie.js'
export { ProfanityMatcher } from './core/profanity-matcher.js'
export { DetectionResultBuilder } from './core/detection-result.js'

// Configuration system
export * from './config/index.js'

// Language integration system
export * from './languages/index.js'

// Import functions for internal use
import { NaughtyWordsDetector } from './core/detector.js'
import { ProfanityFilter } from './core/filter.js'
import {
  getConfigPreset,
  getGlobalConfigManager
} from './config/index.js'
import {
  createDetector,
  createPerformanceDetector,
  createComprehensiveDetector,
  createAutoDetector,
  getGlobalLanguageLoader
} from './languages/index.js'

// Utility functions
export { normalizeText } from './utils/text-normalizer.js'
export { fuzzyMatch } from './utils/fuzzy-matcher.js'
export { createDefaultConfig } from './utils/config.js'

// Quick-start functions
export { detect, filter, isClean } from './core/quick-start.js'

// Performance monitoring and optimization
export interface PerformanceMonitor {
  startTiming(operation: string): string
  endTiming(timerId: string): number
  getStats(): Record<string, { count: number; totalTime: number; avgTime: number }>
  reset(): void
}

class SimplePerformanceMonitor implements PerformanceMonitor {
  private timers = new Map<string, number>()
  private stats = new Map<string, { count: number; totalTime: number }>()

  startTiming(operation: string): string {
    const timerId = `${operation}_${Date.now()}_${Math.random()}`
    this.timers.set(timerId, performance.now())
    return timerId
  }

  endTiming(timerId: string): number {
    const startTime = this.timers.get(timerId)
    if (!startTime) return 0

    const duration = performance.now() - startTime
    this.timers.delete(timerId)

    // Extract operation name from timer ID
    const operation = timerId.split('_')[0] || 'unknown'
    const existing = this.stats.get(operation) || { count: 0, totalTime: 0 }
    this.stats.set(operation, {
      count: existing.count + 1,
      totalTime: existing.totalTime + duration
    })

    return duration
  }

  getStats(): Record<string, { count: number; totalTime: number; avgTime: number }> {
    const result: Record<string, { count: number; totalTime: number; avgTime: number }> = {}

    for (const [operation, stats] of this.stats) {
      result[operation] = {
        count: stats.count,
        totalTime: stats.totalTime,
        avgTime: stats.totalTime / stats.count
      }
    }

    return result
  }

  reset(): void {
    this.timers.clear()
    this.stats.clear()
  }
}

export const performanceMonitor = new SimplePerformanceMonitor()

// Enhanced convenience functions
export interface EnhancedOptions {
  language?: LanguageCode | LanguageCode[]
  performance?: boolean
  caching?: boolean
  fuzzyMatching?: boolean
  customConfig?: Partial<DetectorConfig>
}

/**
 * Enhanced detect function with advanced options
 */
export async function detectEnhanced(
  text: string,
  options: EnhancedOptions = {}
): Promise<DetectionResult> {
  const {
    language = 'auto',
    performance = false,
    caching = true,
    customConfig = {}
  } = options

  const languages = Array.isArray(language) ? language : [language]

  // Choose appropriate detector based on requirements
  let detector: NaughtyWordsDetector

  if (performance) {
    detector = createPerformanceDetector(languages, customConfig)
  } else {
    detector = createComprehensiveDetector(languages, customConfig)
  }

  await detector.initialize()

  // Use cached analysis if enabled
  if (caching && typeof detector.analyzeCached === 'function') {
    return await detector.analyzeCached(text)
  }

  return await detector.analyze(text)
}

/**
 * Enhanced filter function with advanced options
 */
export async function filterEnhanced(
  text: string,
  options: EnhancedOptions = {}
): Promise<string> {
  const result = await detectEnhanced(text, options)

  if (result.matches && result.matches.length > 0) {
    const filter = new ProfanityFilter()
    const filterResult = filter.filter(text, result.matches)
    return filterResult.filteredText
  }

  return text
}

/**
 * Batch processing function for multiple texts
 */
export async function batchDetect(
  texts: string[],
  options: EnhancedOptions = {}
): Promise<DetectionResult[]> {
  const detector = createPerformanceDetector(
    options.language || 'auto',
    options.customConfig
  )

  await detector.initialize()

  if (typeof detector.batchAnalyze === 'function') {
    return await detector.batchAnalyze(texts)
  }

  // Fallback to individual processing
  const results = []
  for (const text of texts) {
    results.push(await detector.analyze(text))
  }
  return results
}

/**
 * Stream processing function for large datasets
 */
export async function* streamDetect(
  texts: Iterable<string>,
  options: EnhancedOptions = {}
): AsyncGenerator<DetectionResult, void, unknown> {
  const detector = createPerformanceDetector(
    options.language || 'auto',
    options.customConfig
  )

  await detector.initialize()

  if (typeof detector.batchAnalyzeStream === 'function') {
    yield* detector.batchAnalyzeStream(texts)
  } else {
    // Fallback to individual processing
    for (const text of texts) {
      yield await detector.analyze(text)
    }
  }
}

/**
 * Create a pre-configured detector instance
 */
export async function createConfiguredDetector(
  preset: 'performance' | 'comprehensive' | 'strict' | 'lenient' = 'comprehensive',
  languages: LanguageCode | LanguageCode[] = 'auto',
  customConfig: Partial<DetectorConfig> = {}
): Promise<NaughtyWordsDetector> {
  let detector: NaughtyWordsDetector

  switch (preset) {
    case 'performance':
      detector = createPerformanceDetector(languages, customConfig)
      break
    case 'strict':
      detector = createDetector(languages, { ...getConfigPreset('strict'), ...customConfig })
      break
    case 'lenient':
      detector = createDetector(languages, { ...getConfigPreset('lenient'), ...customConfig })
      break
    default:
      detector = createComprehensiveDetector(
        Array.isArray(languages) ? languages : [languages],
        customConfig
      )
  }

  await detector.initialize()
  return detector
}

/**
 * Auto-configure detector based on sample text
 */
export async function createSmartDetector(
  sampleTexts: string[],
  customConfig: Partial<DetectorConfig> = {}
): Promise<NaughtyWordsDetector> {
  // Combine sample texts for analysis
  const combinedText = sampleTexts.join(' ').slice(0, 1000) // Limit to 1000 chars

  // Use auto-detector function
  const detector = await createAutoDetector(combinedText, customConfig)
  return detector
}

/**
 * Utility function to get library information
 */
export function getLibraryInfo(): {
  version: string
  supportedLanguages: LanguageCode[]
  features: string[]
} {
  return {
    version: VERSION,
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'],
    features: [
      'Multi-language detection',
      'Performance optimization',
      'Intelligent caching',
      'Fuzzy matching',
      'Real-time configuration',
      'Worker thread support',
      'Batch processing',
      'Stream processing',
      'Memory optimization',
      'Cross-language matching',
      'Language-specific optimization',
      'Auto-language detection'
    ]
  }
}

/**
 * Health check function
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'warning' | 'error'
  checks: Record<string, boolean>
  details: Record<string, any>
}> {
  const checks = {
    coreInit: false,
    languageLoader: false,
    configSystem: false,
    performance: false
  }

  const details: Record<string, any> = {}

  try {
    // Test core initialization
    const detector = new NaughtyWordsDetector()
    await detector.initialize()
    checks.coreInit = true

    // Test performance features
    const perfStats = detector.getPerformanceStats?.()
    checks.performance = perfStats !== undefined
    details.performanceFeatures = perfStats !== undefined

    // Test language loader
    const loader = getGlobalLanguageLoader()
    const availableLanguages = await loader.getAvailableLanguages()
    checks.languageLoader = availableLanguages.length > 0
    details.availableLanguages = availableLanguages.length

    // Test config system
    const configManager = getGlobalConfigManager()
    const validation = configManager.validateCurrentConfig()
    checks.configSystem = validation.isValid
    details.configValid = validation.isValid

    // Cleanup
    detector.optimizeMemory?.()
  } catch (error) {
    details.error = error instanceof Error ? error.message : String(error)
  }

  const passedChecks = Object.values(checks).filter(Boolean).length
  const totalChecks = Object.keys(checks).length

  let status: 'healthy' | 'warning' | 'error' = 'healthy'
  if (passedChecks === 0) {
    status = 'error'
  } else if (passedChecks < totalChecks) {
    status = 'warning'
  }

  return { status, checks, details }
}

// Version info
export const VERSION = '1.0.0'

// Re-export key types for convenience
export type {
  DetectorConfig,
  LanguageCode,
  DetectionResult,
  AnalysisOptions,
  CustomWord,
  SeverityLevel,
  ProfanityCategory,
  FilterMode
} from './types/index.js'
