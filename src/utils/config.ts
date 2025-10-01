import type { DetectorConfig } from '../types/index.js'
import { SeverityLevel as SL } from '../types/index.js'
import { ALL_CATEGORIES } from '../config/default-config.js'

/**
 * Create a default detector configuration
 */
export function createDefaultConfig(): DetectorConfig {
  return {
    languages: ['auto'],
    minSeverity: SL.LOW,
    categories: ALL_CATEGORIES,
    fuzzyMatching: true,
    fuzzyThreshold: 0.8,
    customWords: [],
    whitelist: [],
    detectAlternateScripts: true,
    normalizeText: true,
    replacementChar: '*',
    preserveStructure: true,
  }
}

/**
 * Create a strict configuration for high-security environments
 */
export function createStrictConfig(): DetectorConfig {
  return {
    ...createDefaultConfig(),
    minSeverity: SL.LOW,
    fuzzyMatching: true,
    fuzzyThreshold: 0.6, // More aggressive fuzzy matching
    detectAlternateScripts: true,
  }
}

/**
 * Create a lenient configuration for casual environments
 */
export function createLenientConfig(): DetectorConfig {
  return {
    ...createDefaultConfig(),
    minSeverity: SL.MODERATE,
    fuzzyMatching: false,
    categories: ['hate_speech', 'discrimination'], // Only severe categories
  }
}

/**
 * Create a configuration for family-friendly content
 */
export function createFamilyFriendlyConfig(): DetectorConfig {
  return {
    ...createDefaultConfig(),
    minSeverity: SL.LOW,
    categories: ALL_CATEGORIES,
    fuzzyMatching: true,
    fuzzyThreshold: 0.9,
  }
}
