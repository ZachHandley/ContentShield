/**
 * Configuration validation and sanitization
 * Ensures all configuration options are valid and safe
 */

import type { DetectorConfig, AnalysisOptions, LanguageCode, CustomWord } from '../types/index.js'
import { SeverityLevel, ProfanityCategory, FilterMode } from '../types/index.js'
import { DEFAULT_DETECTOR_CONFIG, DEFAULT_ANALYSIS_OPTIONS } from './default-config.js'

/**
 * Configuration validation result
 */
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedConfig: DetectorConfig | undefined
}

/**
 * Analysis options validation result
 */
export interface AnalysisOptionsValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  sanitizedOptions: AnalysisOptions | undefined
}

/**
 * Supported language codes
 */
const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
  'auto', 'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'
])

/**
 * Validate and sanitize detector configuration
 */
export class ConfigValidator {
  /**
   * Validate a complete detector configuration
   */
  static validate(config: Partial<DetectorConfig>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Start with default config and override with provided values
    const sanitizedConfig: DetectorConfig = { ...DEFAULT_DETECTOR_CONFIG }

    // Validate languages
    if (config.languages !== undefined) {
      const languageResult = this.validateLanguages(config.languages)
      errors.push(...languageResult.errors)
      warnings.push(...languageResult.warnings)
      if (languageResult.sanitizedLanguages) {
        sanitizedConfig.languages = languageResult.sanitizedLanguages
      }
    }

    // Validate severity level
    if (config.minSeverity !== undefined) {
      const severityResult = this.validateSeverity(config.minSeverity)
      errors.push(...severityResult.errors)
      if (severityResult.sanitizedSeverity !== undefined) {
        sanitizedConfig.minSeverity = severityResult.sanitizedSeverity
      }
    }

    // Validate categories
    if (config.categories !== undefined) {
      const categoryResult = this.validateCategories(config.categories)
      errors.push(...categoryResult.errors)
      warnings.push(...categoryResult.warnings)
      if (categoryResult.sanitizedCategories) {
        sanitizedConfig.categories = categoryResult.sanitizedCategories
      }
    }

    // Validate fuzzy matching settings
    if (config.fuzzyMatching !== undefined) {
      sanitizedConfig.fuzzyMatching = Boolean(config.fuzzyMatching)
    }

    if (config.fuzzyThreshold !== undefined) {
      const thresholdResult = this.validateFuzzyThreshold(config.fuzzyThreshold)
      errors.push(...thresholdResult.errors)
      warnings.push(...thresholdResult.warnings)
      if (thresholdResult.sanitizedThreshold !== undefined) {
        sanitizedConfig.fuzzyThreshold = thresholdResult.sanitizedThreshold
      }
    }

    // Validate custom words
    if (config.customWords !== undefined) {
      const customWordsResult = this.validateCustomWords(config.customWords)
      errors.push(...customWordsResult.errors)
      warnings.push(...customWordsResult.warnings)
      if (customWordsResult.sanitizedWords) {
        sanitizedConfig.customWords = customWordsResult.sanitizedWords
      }
    }

    // Validate whitelist
    if (config.whitelist !== undefined) {
      const whitelistResult = this.validateWhitelist(config.whitelist)
      warnings.push(...whitelistResult.warnings)
      if (whitelistResult.sanitizedWhitelist) {
        sanitizedConfig.whitelist = whitelistResult.sanitizedWhitelist
      }
    }

    // Validate boolean flags
    if (config.detectAlternateScripts !== undefined) {
      sanitizedConfig.detectAlternateScripts = Boolean(config.detectAlternateScripts)
    }

    if (config.normalizeText !== undefined) {
      sanitizedConfig.normalizeText = Boolean(config.normalizeText)
    }

    if (config.preserveStructure !== undefined) {
      sanitizedConfig.preserveStructure = Boolean(config.preserveStructure)
    }

    // Validate replacement character
    if (config.replacementChar !== undefined) {
      const charResult = this.validateReplacementChar(config.replacementChar)
      warnings.push(...charResult.warnings)
      if (charResult.sanitizedChar) {
        sanitizedConfig.replacementChar = charResult.sanitizedChar
      }
    }

    // Cross-validation: check for incompatible settings
    this.performCrossValidation(sanitizedConfig, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedConfig: errors.length === 0 ? sanitizedConfig : undefined
    }
  }

  /**
   * Validate analysis options
   */
  static validateAnalysisOptions(options: Partial<AnalysisOptions>): AnalysisOptionsValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    const sanitizedOptions: AnalysisOptions = { ...DEFAULT_ANALYSIS_OPTIONS }

    // Validate filter mode
    if (options.filterMode !== undefined) {
      if (!Object.values(FilterMode).includes(options.filterMode)) {
        errors.push(`Invalid filter mode: ${options.filterMode}`)
      } else {
        sanitizedOptions.filterMode = options.filterMode
      }
    }

    // Validate boolean options
    if (options.includeMatches !== undefined) {
      sanitizedOptions.includeMatches = Boolean(options.includeMatches)
    }

    if (options.includeConfidence !== undefined) {
      sanitizedOptions.includeConfidence = Boolean(options.includeConfidence)
    }

    if (options.measurePerformance !== undefined) {
      sanitizedOptions.measurePerformance = Boolean(options.measurePerformance)
    }

    // Validate max length
    if (options.maxLength !== undefined) {
      if (typeof options.maxLength !== 'number' || options.maxLength < 0) {
        errors.push('maxLength must be a non-negative number')
      } else if (options.maxLength > 10000000) { // 10MB limit
        warnings.push('maxLength is very large, this may impact performance')
        sanitizedOptions.maxLength = Math.min(options.maxLength, 10000000)
      } else {
        sanitizedOptions.maxLength = Math.floor(options.maxLength)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitizedOptions: errors.length === 0 ? sanitizedOptions : undefined
    }
  }

  /**
   * Validate languages array
   */
  private static validateLanguages(languages: unknown): {
    errors: string[]
    warnings: string[]
    sanitizedLanguages?: LanguageCode[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(languages)) {
      errors.push('languages must be an array')
      return { errors, warnings }
    }

    if (languages.length === 0) {
      errors.push('languages array cannot be empty')
      return { errors, warnings }
    }

    const sanitized: LanguageCode[] = []
    const seen = new Set<string>()

    for (const lang of languages) {
      if (typeof lang !== 'string') {
        warnings.push(`Skipping non-string language: ${lang}`)
        continue
      }

      if (!SUPPORTED_LANGUAGES.has(lang)) {
        warnings.push(`Unsupported language: ${lang}, skipping`)
        continue
      }

      if (seen.has(lang)) {
        warnings.push(`Duplicate language: ${lang}, skipping`)
        continue
      }

      seen.add(lang)
      sanitized.push(lang as LanguageCode)
    }

    if (sanitized.length === 0) {
      errors.push('No valid languages found')
      return { errors, warnings }
    }

    // Special validation for 'auto' language
    if (sanitized.includes('auto' as LanguageCode) && sanitized.length > 1) {
      warnings.push("'auto' language with other languages may be redundant")
    }

    return { errors, warnings, sanitizedLanguages: sanitized }
  }

  /**
   * Validate severity level
   */
  private static validateSeverity(severity: unknown): {
    errors: string[]
    sanitizedSeverity?: SeverityLevel
  } {
    const errors: string[] = []

    if (!Object.values(SeverityLevel).includes(severity as SeverityLevel)) {
      errors.push(`Invalid severity level: ${severity}`)
      return { errors }
    }

    return { errors, sanitizedSeverity: severity as SeverityLevel }
  }

  /**
   * Validate categories array
   */
  private static validateCategories(categories: unknown): {
    errors: string[]
    warnings: string[]
    sanitizedCategories?: ProfanityCategory[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(categories)) {
      errors.push('categories must be an array')
      return { errors, warnings }
    }

    const validCategories = Object.values(ProfanityCategory)
    const sanitized: ProfanityCategory[] = []
    const seen = new Set<string>()

    for (const category of categories) {
      if (!validCategories.includes(category)) {
        warnings.push(`Invalid category: ${category}, skipping`)
        continue
      }

      if (seen.has(category)) {
        warnings.push(`Duplicate category: ${category}, skipping`)
        continue
      }

      seen.add(category)
      sanitized.push(category)
    }

    if (sanitized.length === 0) {
      warnings.push('No valid categories found, using all categories')
      return { errors, warnings, sanitizedCategories: validCategories }
    }

    return { errors, warnings, sanitizedCategories: sanitized }
  }

  /**
   * Validate fuzzy threshold
   */
  private static validateFuzzyThreshold(threshold: unknown): {
    errors: string[]
    warnings: string[]
    sanitizedThreshold?: number
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (typeof threshold !== 'number') {
      errors.push('fuzzyThreshold must be a number')
      return { errors, warnings }
    }

    if (threshold < 0 || threshold > 1) {
      errors.push('fuzzyThreshold must be between 0 and 1')
      return { errors, warnings }
    }

    if (threshold < 0.5) {
      warnings.push('fuzzyThreshold below 0.5 may produce many false positives')
    }

    if (threshold > 0.95) {
      warnings.push('fuzzyThreshold above 0.95 may miss valid variations')
    }

    return { errors, warnings, sanitizedThreshold: threshold }
  }

  /**
   * Validate custom words
   */
  private static validateCustomWords(customWords: unknown): {
    errors: string[]
    warnings: string[]
    sanitizedWords?: CustomWord[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    if (!Array.isArray(customWords)) {
      errors.push('customWords must be an array')
      return { errors, warnings }
    }

    const sanitized: CustomWord[] = []
    const seenWords = new Set<string>()

    for (const word of customWords) {
      if (typeof word === 'string') {
        // Convert string to CustomWord object
        if (seenWords.has(word.toLowerCase())) {
          warnings.push(`Duplicate custom word: ${word}`)
          continue
        }
        seenWords.add(word.toLowerCase())
        sanitized.push({
          word,
          severity: SeverityLevel.MEDIUM,
          categories: [ProfanityCategory.PROFANITY],
          language: 'en'
        })
      } else if (typeof word === 'object' && word !== null) {
        // Validate CustomWord object
        if (typeof word.word !== 'string' || word.word.trim() === '') {
          warnings.push('Skipping custom word with invalid word field')
          continue
        }

        if (seenWords.has(word.word.toLowerCase())) {
          warnings.push(`Duplicate custom word: ${word.word}`)
          continue
        }

        seenWords.add(word.word.toLowerCase())

        const validWord: CustomWord = {
          word: word.word.trim(),
          severity: Object.values(SeverityLevel).includes(word.severity) ? word.severity : SeverityLevel.MEDIUM,
          categories: Array.isArray(word.categories) ? word.categories.filter((c: unknown) => Object.values(ProfanityCategory).includes(c as ProfanityCategory)) : [ProfanityCategory.PROFANITY],
          language: typeof word.language === 'string' && SUPPORTED_LANGUAGES.has(word.language) ? word.language : 'en'
        }

        sanitized.push(validWord)
      } else {
        warnings.push(`Skipping invalid custom word: ${word}`)
      }
    }

    return { errors, warnings, sanitizedWords: sanitized }
  }

  /**
   * Validate whitelist
   */
  private static validateWhitelist(whitelist: unknown): {
    warnings: string[]
    sanitizedWhitelist?: string[]
  } {
    const warnings: string[] = []

    if (!Array.isArray(whitelist)) {
      warnings.push('whitelist must be an array, ignoring')
      return { warnings, sanitizedWhitelist: [] }
    }

    const sanitized: string[] = []
    const seen = new Set<string>()

    for (const word of whitelist) {
      if (typeof word !== 'string' || word.trim() === '') {
        warnings.push(`Skipping invalid whitelist word: ${word}`)
        continue
      }

      const normalizedWord = word.trim().toLowerCase()
      if (seen.has(normalizedWord)) {
        warnings.push(`Duplicate whitelist word: ${word}`)
        continue
      }

      seen.add(normalizedWord)
      sanitized.push(word.trim())
    }

    return { warnings, sanitizedWhitelist: sanitized }
  }

  /**
   * Validate replacement character
   */
  private static validateReplacementChar(char: unknown): {
    warnings: string[]
    sanitizedChar: string | undefined
  } {
    const warnings: string[] = []

    if (typeof char !== 'string') {
      warnings.push('replacementChar must be a string, using default "*"')
      return { warnings, sanitizedChar: '*' }
    }

    if (char.length === 0) {
      warnings.push('replacementChar cannot be empty, using default "*"')
      return { warnings, sanitizedChar: '*' }
    }

    if (char.length > 1) {
      warnings.push('replacementChar should be a single character, using first character')
      return { warnings, sanitizedChar: char[0] }
    }

    return { warnings, sanitizedChar: char }
  }

  /**
   * Perform cross-validation of configuration settings
   */
  private static performCrossValidation(config: DetectorConfig, warnings: string[]): void {
    // Check if fuzzy matching is disabled but threshold is set
    if (!config.fuzzyMatching && config.fuzzyThreshold !== DEFAULT_DETECTOR_CONFIG.fuzzyThreshold) {
      warnings.push('fuzzyThreshold specified but fuzzyMatching is disabled')
    }

    // Check for performance implications
    if (config.languages.length > 5 && config.fuzzyMatching) {
      warnings.push('Many languages with fuzzy matching enabled may impact performance')
    }

    // Check if categories and severity are compatible
    if (config.minSeverity === SeverityLevel.HIGH && config.categories.length > 3) {
      warnings.push('High severity with many categories may result in very few matches')
    }
  }

  /**
   * Quick validation for basic use cases
   */
  static quickValidate(config: Partial<DetectorConfig>): boolean {
    try {
      const result = this.validate(config)
      return result.isValid
    } catch {
      return false
    }
  }

  /**
   * Sanitize configuration without full validation
   */
  static sanitize(config: Partial<DetectorConfig>): DetectorConfig {
    const result = this.validate(config)
    return result.sanitizedConfig || DEFAULT_DETECTOR_CONFIG
  }
}