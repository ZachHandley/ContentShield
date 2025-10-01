import { NaughtyWordsDetector } from '../core/detector.js'
import { MultiLanguageDetector } from './multi-language-detector.js'
import { LanguageLoader } from './language-loader.js'
import type { DetectorConfig, LanguageCode } from '../types/index.js'
import { getConfigPreset, LANGUAGE_OPTIMIZED_CONFIGS } from '../config/index.js'

/**
 * Factory options for creating detectors
 */
export interface DetectorFactoryOptions {
  useOptimizedConfig?: boolean
  enableCaching?: boolean
  preloadLanguageData?: boolean
  enableAdvancedFeatures?: boolean
}

/**
 * Create a detector optimized for specific language(s)
 */
export function createDetector(
  languages: LanguageCode | LanguageCode[],
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  const languageArray = Array.isArray(languages) ? languages : [languages]

  // Get optimized configuration
  let detectorConfig = { ...getConfigPreset('default'), ...config }
  detectorConfig.languages = languageArray

  if (options.useOptimizedConfig !== false) {
    // Apply language-specific optimizations
    if (languageArray.length === 1) {
      const language = languageArray[0]
      const langOptimizations = language && language in LANGUAGE_OPTIMIZED_CONFIGS
        ? LANGUAGE_OPTIMIZED_CONFIGS[language as keyof typeof LANGUAGE_OPTIMIZED_CONFIGS]
        : undefined
      if (langOptimizations) {
        detectorConfig = { ...detectorConfig, ...langOptimizations }
      }
    }
  }

  const detector = new NaughtyWordsDetector(detectorConfig)

  // Preload language data if requested
  if (options.preloadLanguageData) {
    detector.initialize().catch(error => {
      console.warn('Language data preloading failed:', error)
    })
  }

  return detector
}

/**
 * Create an advanced multi-language detector
 */
export function createAdvancedMultiLanguageDetector(
  languages: LanguageCode[],
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): MultiLanguageDetector {
  const baseConfig = { ...getConfigPreset('comprehensive'), ...config }

  const multiDetectorOptions = {
    languages,
    autoDetectLanguages: true,
    enableCrossLanguageMatching: true,
    parallelProcessing: true,
    cacheResults: options.enableCaching !== false,
    optimizeForPerformance: options.useOptimizedConfig === true,
  }

  return new MultiLanguageDetector(baseConfig, multiDetectorOptions)
}

/**
 * Create a detector for English content
 */
export function createEnglishDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('en', {
    ...getConfigPreset('default'),
    fuzzyMatching: true,
    normalizeText: true,
    ...config
  }, options)
}

/**
 * Create a detector for Spanish content
 */
export function createSpanishDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('es', {
    ...getConfigPreset('default'),
    fuzzyThreshold: 0.7, // Spanish has more variations
    detectAlternateScripts: true,
    ...config
  }, options)
}

/**
 * Create a detector for French content
 */
export function createFrenchDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('fr', {
    ...getConfigPreset('default'),
    fuzzyThreshold: 0.7,
    normalizeText: true,
    ...config
  }, options)
}

/**
 * Create a detector for German content
 */
export function createGermanDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('de', {
    ...getConfigPreset('default'),
    fuzzyThreshold: 0.8, // German compound words
    normalizeText: true,
    ...config
  }, options)
}

/**
 * Create a detector for Russian content
 */
export function createRussianDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('ru', {
    ...getConfigPreset('default'),
    fuzzyThreshold: 0.7,
    detectAlternateScripts: true, // Cyrillic variations
    normalizeText: true,
    ...config
  }, options)
}

/**
 * Create a detector for Chinese content
 */
export function createChineseDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('zh', {
    ...getConfigPreset('strict'),
    fuzzyThreshold: 0.9, // Chinese characters need precision
    normalizeText: false, // Don't normalize Chinese
    detectAlternateScripts: true,
    ...config
  }, options)
}

/**
 * Create a detector for Japanese content
 */
export function createJapaneseDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('ja', {
    ...getConfigPreset('strict'),
    fuzzyThreshold: 0.9,
    normalizeText: false,
    detectAlternateScripts: true,
    ...config
  }, options)
}

/**
 * Create a detector for Arabic content
 */
export function createArabicDetector(
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): NaughtyWordsDetector {
  return createDetector('ar', {
    ...getConfigPreset('default'),
    fuzzyThreshold: 0.7,
    detectAlternateScripts: true, // Arabic script variations
    normalizeText: true,
    ...config
  }, options)
}

/**
 * Create a high-performance detector optimized for speed
 */
export function createPerformanceDetector(
  languages: LanguageCode | LanguageCode[] = 'en',
  config: Partial<DetectorConfig> = {}
): NaughtyWordsDetector {
  return createDetector(languages, {
    ...getConfigPreset('performance'),
    ...config
  }, {
    useOptimizedConfig: true,
    enableCaching: true,
    preloadLanguageData: true
  })
}

/**
 * Create a comprehensive detector for maximum accuracy
 */
export function createComprehensiveDetector(
  languages: LanguageCode[] = ['auto'],
  config: Partial<DetectorConfig> = {}
): NaughtyWordsDetector {
  return createDetector(languages, {
    ...getConfigPreset('comprehensive'),
    ...config
  }, {
    useOptimizedConfig: true,
    enableCaching: true,
    enableAdvancedFeatures: true
  })
}

/**
 * Create a detector based on environment (development, production, testing)
 */
export function createEnvironmentDetector(
  languages: LanguageCode | LanguageCode[] = 'en',
  environment: 'development' | 'production' | 'testing' = 'production'
): NaughtyWordsDetector {
  const environmentConfigs = {
    development: getConfigPreset('comprehensive'),
    production: getConfigPreset('performance'),
    testing: getConfigPreset('default')
  }

  const config = environmentConfigs[environment]
  return createDetector(languages, config, {
    useOptimizedConfig: environment === 'production',
    enableCaching: environment !== 'testing',
    preloadLanguageData: environment === 'production'
  })
}

/**
 * Auto-detect and create appropriate detector for text
 */
export async function createAutoDetector(
  sampleText: string,
  config: Partial<DetectorConfig> = {}
): Promise<NaughtyWordsDetector> {
  // Quick language detection
  const tempDetector = new NaughtyWordsDetector({ languages: ['auto'] })
  const quickResult = await tempDetector.analyze(sampleText, { measurePerformance: false })

  const detectedLanguages = quickResult.detectedLanguages || ['en']

  // Create optimized detector for detected languages
  return createDetector(detectedLanguages, config, {
    useOptimizedConfig: true,
    enableCaching: true
  })
}

/**
 * Create detector with custom language data loader
 *
 * NOTE: This is currently a placeholder implementation. Full integration of custom loaders
 * would require architectural changes to pass the loader instance through the detector
 * initialization chain. For now, this function creates a detector with default loading behavior.
 *
 * Future enhancement: Modify NaughtyWordsDetector constructor to accept optional LanguageLoader
 * instance and use it instead of the default loading mechanism.
 */
export function createDetectorWithCustomLoader(
  languages: LanguageCode | LanguageCode[],
  dataPath: string,
  config: Partial<DetectorConfig> = {}
): NaughtyWordsDetector {
  // Create custom language loader (currently unused - see function documentation)
  new LanguageLoader({ dataPath })

  // Create detector with custom configuration
  const detector = createDetector(languages, config)

  return detector
}

/**
 * Get language-specific factory function
 */
export function getLanguageFactory(language: LanguageCode):
  ((config?: Partial<DetectorConfig>, options?: DetectorFactoryOptions) => NaughtyWordsDetector) | null {

  const factories = {
    en: createEnglishDetector,
    es: createSpanishDetector,
    fr: createFrenchDetector,
    de: createGermanDetector,
    ru: createRussianDetector,
    zh: createChineseDetector,
    ja: createJapaneseDetector,
    ar: createArabicDetector,
  }

  return factories[language as keyof typeof factories] || null
}

/**
 * Create multiple language-specific detectors
 */
export function createDetectorCollection(
  languages: LanguageCode[],
  config: Partial<DetectorConfig> = {},
  options: DetectorFactoryOptions = {}
): Map<LanguageCode, NaughtyWordsDetector> {
  const detectors = new Map<LanguageCode, NaughtyWordsDetector>()

  for (const language of languages) {
    const factory = getLanguageFactory(language)
    if (factory) {
      detectors.set(language, factory(config, options))
    } else {
      // Fallback to generic detector
      detectors.set(language, createDetector(language, config, options))
    }
  }

  return detectors
}

/**
 * Legacy compatibility - original multi-language detector
 */
export function createMultiLanguageDetector(
  languages: LanguageCode[],
  config: Partial<DetectorConfig> = {}
): NaughtyWordsDetector {
  return createDetector(languages, config)
}
