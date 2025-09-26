/**
 * Language integration system exports
 */

// Core language components
export {
  LanguageLoader,
  getGlobalLanguageLoader,
  resetGlobalLanguageLoader,
  type LanguageData,
  type LanguageLoadOptions,
  type LanguageLoadResult
} from './language-loader.js'

export {
  MultiLanguageDetector,
  type MultiLanguageDetectionResult,
  type MultiLanguageDetectorOptions,
  LanguageDetectionStrategy
} from './multi-language-detector.js'

// Factory functions
export {
  createDetector,
  createAdvancedMultiLanguageDetector,
  createEnglishDetector,
  createSpanishDetector,
  createFrenchDetector,
  createGermanDetector,
  createRussianDetector,
  createChineseDetector,
  createJapaneseDetector,
  createArabicDetector,
  createPerformanceDetector,
  createComprehensiveDetector,
  createEnvironmentDetector,
  createAutoDetector,
  createDetectorWithCustomLoader,
  createDetectorCollection,
  createMultiLanguageDetector,
  getLanguageFactory,
  type DetectorFactoryOptions
} from './factory.js'