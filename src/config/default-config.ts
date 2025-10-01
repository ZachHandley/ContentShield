/**
 * Default configuration settings for NaughtyWords
 * Provides sensible defaults for all configuration options
 */

import type { DetectorConfig, AnalysisOptions, ProfanityCategory } from '../types/index.js'
import { SeverityLevel, FilterMode } from '../types/index.js'

/**
 * All available profanity categories
 */
export const ALL_CATEGORIES: ProfanityCategory[] = [
  // Core categories
  'general',
  'profanity',
  'sexual',
  'violence',
  'hate_speech',
  'discrimination',
  'substance_abuse',
  'religious',
  'political',
  'body_parts',
  'scatological',
  'slurs',
  'disability',
  'ethnic',
  'lgbtq',
  'racial',
]

/**
 * Default detector configuration
 */
export const DEFAULT_DETECTOR_CONFIG: DetectorConfig = {
  // Language settings
  languages: ['en'], // English as default language for better out-of-box experience

  // Detection sensitivity
  minSeverity: SeverityLevel.LOW, // Detect all severity levels
  categories: ALL_CATEGORIES, // All categories enabled

  // Matching settings
  fuzzyMatching: true, // Enable fuzzy matching for variations
  fuzzyThreshold: 0.8, // High threshold for accuracy

  // Custom settings
  customWords: [], // No custom words by default
  whitelist: [], // No whitelisted words by default

  // Text processing
  detectAlternateScripts: true, // Detect alternate scripts
  normalizeText: true, // Normalize text before analysis

  // Output formatting
  replacementChar: '*', // Standard asterisk replacement
  preserveStructure: true, // Maintain original text structure
}

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  filterMode: FilterMode.DETECT_ONLY,
  includeMatches: true,
  includeConfidence: true,
  measurePerformance: false,
  maxLength: 100000, // 100KB default limit
}

/**
 * Performance-oriented configuration
 * Optimized for speed over comprehensive detection
 */
export const PERFORMANCE_CONFIG: Partial<DetectorConfig> = {
  languages: ['en'], // Single language for speed
  minSeverity: SeverityLevel.MODERATE, // Skip low severity
  fuzzyMatching: false, // Disable fuzzy matching
  normalizeText: false, // Skip normalization
  detectAlternateScripts: false, // Skip script detection
}

/**
 * Comprehensive configuration
 * Optimized for maximum detection accuracy
 */
export const COMPREHENSIVE_CONFIG: Partial<DetectorConfig> = {
  languages: ['auto'], // Auto-detect all languages
  minSeverity: SeverityLevel.LOW, // Detect everything
  fuzzyMatching: true, // Enable fuzzy matching
  fuzzyThreshold: 0.7, // Lower threshold for more matches
  normalizeText: true, // Full text normalization
  detectAlternateScripts: true, // Detect all script variations
}

/**
 * Strict configuration
 * High precision, low false positives
 */
export const STRICT_CONFIG: Partial<DetectorConfig> = {
  minSeverity: SeverityLevel.HIGH, // Only high severity
  fuzzyMatching: true,
  fuzzyThreshold: 0.9, // Very high threshold
  categories: [
    'general',
    'sexual',
    'hate_speech',
  ], // Core categories only
}

/**
 * Lenient configuration
 * Lower precision, fewer false negatives
 */
export const LENIENT_CONFIG: Partial<DetectorConfig> = {
  minSeverity: SeverityLevel.LOW,
  fuzzyMatching: true,
  fuzzyThreshold: 0.6, // Lower threshold for more matches
  categories: ALL_CATEGORIES, // All categories
}

/**
 * Environment-specific configurations
 */
export const ENVIRONMENT_CONFIGS = {
  development: {
    ...DEFAULT_DETECTOR_CONFIG,
    measurePerformance: true,
  } as DetectorConfig,

  production: {
    ...DEFAULT_DETECTOR_CONFIG,
    measurePerformance: false,
  } as DetectorConfig,

  testing: {
    ...DEFAULT_DETECTOR_CONFIG,
    languages: ['en'], // Single language for consistent tests
    fuzzyMatching: false, // Deterministic results
  } as DetectorConfig,
}

/**
 * Get configuration for current environment
 */
export function getEnvironmentConfig(): DetectorConfig {
  const env = process.env.NODE_ENV || 'development'
  return ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || ENVIRONMENT_CONFIGS.development
}

/**
 * Configuration presets for common use cases
 */
export const CONFIG_PRESETS = {
  default: DEFAULT_DETECTOR_CONFIG,
  performance: { ...DEFAULT_DETECTOR_CONFIG, ...PERFORMANCE_CONFIG },
  comprehensive: { ...DEFAULT_DETECTOR_CONFIG, ...COMPREHENSIVE_CONFIG },
  strict: { ...DEFAULT_DETECTOR_CONFIG, ...STRICT_CONFIG },
  lenient: { ...DEFAULT_DETECTOR_CONFIG, ...LENIENT_CONFIG },
} as const

/**
 * Get a configuration preset by name
 */
export function getConfigPreset(preset: keyof typeof CONFIG_PRESETS): DetectorConfig {
  return CONFIG_PRESETS[preset]
}

/**
 * Language-specific optimization configs
 */
export const LANGUAGE_OPTIMIZED_CONFIGS = {
  en: {
    fuzzyThreshold: 0.8,
    normalizeText: true,
    detectAlternateScripts: false,
  },
  es: {
    fuzzyThreshold: 0.7, // Spanish has more variations
    normalizeText: true,
    detectAlternateScripts: true,
  },
  fr: {
    fuzzyThreshold: 0.7,
    normalizeText: true,
    detectAlternateScripts: false,
  },
  de: {
    fuzzyThreshold: 0.8, // German compound words
    normalizeText: true,
    detectAlternateScripts: false,
  },
  ru: {
    fuzzyThreshold: 0.7,
    normalizeText: true,
    detectAlternateScripts: true, // Cyrillic variations
  },
  zh: {
    fuzzyThreshold: 0.9, // Chinese characters need precision
    normalizeText: false, // Don't normalize Chinese
    detectAlternateScripts: true,
  },
  ja: {
    fuzzyThreshold: 0.9,
    normalizeText: false,
    detectAlternateScripts: true,
  },
  ar: {
    fuzzyThreshold: 0.7,
    normalizeText: true,
    detectAlternateScripts: true, // Arabic script variations
  },
}