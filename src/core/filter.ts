/**
 * Advanced filtering engine with multiple modes and structure preservation
 * Supports censoring, removal, replacement, and custom filtering strategies
 */

import type {
  DetectionMatch,
  FilterMode,
  EnhancedDetectionMatch,
} from '../types/index.js'
import { FilterMode as FilterModeEnum } from '../types/index.js'

/**
 * Configuration for filtering operations
 */
export interface FilterConfig {
  /** Filtering mode to apply */
  mode: FilterMode
  /** Character to use for censoring */
  replacementChar: string
  /** Whether to preserve word structure when censoring */
  preserveStructure: boolean
  /** Custom replacement words/phrases */
  customReplacements: Map<string, string>
  /** Whether to preserve sentence structure */
  preserveSentenceStructure: boolean
  /** Whether to maintain original text length */
  maintainLength: boolean
  /** Minimum confidence threshold for filtering */
  confidenceThreshold: number
  /** Whether to apply gradual filtering based on severity */
  gradualFiltering: boolean
  /** Replacement patterns for different categories */
  categoryReplacements: Map<string, string[]>
}

/**
 * Result of a filtering operation
 */
export interface FilterResult {
  /** The filtered text */
  filteredText: string
  /** Number of words that were filtered */
  filteredCount: number
  /** Details about what was filtered */
  filterDetails: FilterDetail[]
  /** Whether the text structure was preserved */
  structurePreserved: boolean
  /** Original text length vs filtered text length */
  lengthComparison: {
    original: number
    filtered: number
    difference: number
  }
}

/**
 * Details about a specific filter operation
 */
export interface FilterDetail {
  /** Original word that was filtered */
  originalWord: string
  /** What it was replaced with */
  replacement: string
  /** Position in the text */
  position: { start: number; end: number }
  /** Why it was filtered */
  reason: string
  /** Confidence of the match */
  confidence: number
  /** Filter method used */
  method: 'censor' | 'remove' | 'replace' | 'custom'
}

/**
 * Advanced text filtering engine
 */
export class ProfanityFilter {
  private config: FilterConfig

  constructor(config: Partial<FilterConfig> = {}) {
    this.config = this.mergeWithDefaults(config)
  }

  /**
   * Legacy method for backward compatibility
   */
  applyFilter(
    text: string,
    matches: DetectionMatch[],
    mode: FilterMode,
    replacementChar: string = '*',
    preserveStructure: boolean = true
  ): string {
    const result = this.filter(text, matches, {
      mode,
      replacementChar,
      preserveStructure
    })
    return result.filteredText
  }

  /**
   * Filter text based on detected matches
   */
  filter(
    text: string,
    matches: DetectionMatch[] | EnhancedDetectionMatch[],
    customConfig?: Partial<FilterConfig>
  ): FilterResult {
    const effectiveConfig = customConfig
      ? { ...this.config, ...customConfig }
      : this.config

    // Handle empty text
    if (!text || text.length === 0) {
      return this.createEmptyResult(text)
    }

    // Normalize and validate matches - fix positions if they're wrong
    const normalizedMatches = matches.map(match => this.normalizeMatch(match, text))

    // Filter matches by confidence threshold and validate positions
    const qualifyingMatches = normalizedMatches.filter(match => {
      // Check confidence threshold
      if (match.confidence < effectiveConfig.confidenceThreshold) {
        return false
      }

      // Validate match positions are within text bounds
      if (match.start < 0 || match.end > text.length || match.start >= match.end) {
        return false
      }

      return true
    })

    if (qualifyingMatches.length === 0) {
      return this.createEmptyResult(text)
    }

    // Sort matches by position (reverse order for easier replacement)
    const sortedMatches = [...qualifyingMatches].sort((a, b) => b.start - a.start)

    let filteredText = text
    const filterDetails: FilterDetail[] = []

    for (const match of sortedMatches) {
      const filterResult = this.filterSingleMatch(
        filteredText,
        match,
        effectiveConfig
      )

      filteredText = filterResult.text
      filterDetails.push(filterResult.detail)
    }

    // Post-processing
    if (effectiveConfig.preserveSentenceStructure) {
      // Check if any match was at the beginning of the text
      const hadMatchAtStart = qualifyingMatches.some(m => m.start === 0)
      filteredText = this.preserveSentenceStructure(filteredText, hadMatchAtStart)
    }

    return {
      filteredText,
      filteredCount: filterDetails.length,
      filterDetails: filterDetails.reverse(), // Reverse to match original order
      structurePreserved: effectiveConfig.preserveStructure,
      lengthComparison: {
        original: text.length,
        filtered: filteredText.length,
        difference: filteredText.length - text.length
      }
    }
  }

  /**
   * Normalize match positions - find actual word position in text if positions are wrong
   */
  private normalizeMatch(match: DetectionMatch, text: string): DetectionMatch {
    // If positions are valid and match the word, keep them
    const substring = text.substring(match.start, match.end)
    const matchWord = match.match.toLowerCase()

    if (substring.toLowerCase() === matchWord) {
      return match
    }

    // Positions are wrong - try to find the actual position
    // Use case-insensitive search
    const textLower = text.toLowerCase()
    const index = textLower.indexOf(matchWord)

    if (index !== -1) {
      return {
        ...match,
        start: index,
        end: index + matchWord.length
      }
    }

    // If we still can't find it, return original (will be filtered out later)
    return match
  }

  /**
   * Filter a single match from text
   */
  private filterSingleMatch(
    text: string,
    match: DetectionMatch,
    config: FilterConfig
  ): { text: string; detail: FilterDetail } {
    const originalWord = text.substring(match.start, match.end)
    let replacement = ''
    let method: FilterDetail['method'] = 'censor'
    let reason = `${config.mode} applied`

    switch (config.mode) {
      case FilterModeEnum.CENSOR:
        replacement = this.generateCensorReplacement(originalWord, config)
        method = 'censor'
        break

      case FilterModeEnum.REMOVE:
        replacement = this.generateRemovalReplacement(originalWord, text, match.start, match.end)
        method = 'remove'
        break

      case FilterModeEnum.REPLACE:
        replacement = this.generateReplaceReplacement(match, config)
        method = 'replace'
        break

      case FilterModeEnum.DETECT_ONLY:
        return {
          text,
          detail: {
            originalWord,
            replacement: originalWord,
            position: { start: match.start, end: match.end },
            reason: 'detect only mode - no filtering applied',
            confidence: match.confidence,
            method: 'custom'
          }
        }
    }

    // Apply gradual filtering if enabled
    if (config.gradualFiltering) {
      replacement = this.applyGradualFiltering(originalWord, match, replacement, config)
      reason += ' (gradual filtering applied)'
    }

    // Apply custom replacements if available
    const customReplacement = this.getCustomReplacement(originalWord, match, config)
    if (customReplacement) {
      replacement = customReplacement
      method = 'custom'
      reason = 'custom replacement applied'
    }

    // Replace in text
    let newText = text.substring(0, match.start) + replacement + text.substring(match.end)

    const detail: FilterDetail = {
      originalWord,
      replacement,
      position: { start: match.start, end: match.start + replacement.length },
      reason,
      confidence: match.confidence,
      method
    }

    return { text: newText, detail }
  }


  /**
   * Generate censoring replacement
   */
  private generateCensorReplacement(word: string, config: FilterConfig): string {
    if (!config.preserveStructure) {
      return config.replacementChar.repeat(word.length)
    }

    let replacement = ''

    for (let i = 0; i < word.length; i++) {
      const char = word[i]

      if (!char) continue

      if (/[a-zA-Z]/.test(char)) {
        // Replace ALL letters with replacement character (full censoring)
        replacement += config.replacementChar
      } else if (/\d/.test(char)) {
        // Replace numbers with '#'
        replacement += '#'
      } else {
        // Keep punctuation and special characters
        replacement += char
      }
    }

    return replacement
  }

  /**
   * Generate removal replacement
   */
  private generateRemovalReplacement(
    _word: string,
    _text: string,
    _start: number,
    _end: number
  ): string {
    // In REMOVE mode, just remove the word completely
    // The spaces around it will remain from the original text
    return ''
  }

  /**
   * Generate replacement word/phrase
   */
  private generateReplaceReplacement(
    match: DetectionMatch,
    config: FilterConfig
  ): string {
    // Try category-specific replacements first
    for (const category of match.categories) {
      const categoryReplacements = config.categoryReplacements.get(category)
      if (categoryReplacements && categoryReplacements.length > 0) {
        // Pick replacement based on word length or randomly
        const replacement = this.selectBestReplacement(
          match.word,
          categoryReplacements
        )
        if (replacement) return replacement
      }
    }

    // Fallback replacements based on severity
    switch (match.severity) {
      case 1:
        return this.selectRandomFromArray(['inappropriate', 'unsuitable', 'improper'])
      case 2:
        return this.selectRandomFromArray(['offensive', 'inappropriate', 'unsuitable'])
      case 3:
        return this.selectRandomFromArray(['[removed]', '[inappropriate]', '[offensive]'])
      case 4:
        return '[content removed]'
      default:
        return '[censored]'
    }
  }

  /**
   * Apply gradual filtering based on severity and confidence
   */
  private applyGradualFiltering(
    originalWord: string,
    match: DetectionMatch,
    defaultReplacement: string,
    config: FilterConfig
  ): string {
    // If gradual filtering is disabled, use the default replacement
    if (!config.gradualFiltering) {
      return defaultReplacement
    }

    const intensity = match.severity * match.confidence

    if (intensity < 1.5) {
      // Low intensity: partial censoring
      return this.partialCensor(originalWord, 0.3, config.replacementChar)
    } else if (intensity < 2.5) {
      // Medium intensity: more censoring
      return this.partialCensor(originalWord, 0.6, config.replacementChar)
    } else if (intensity < 3.5) {
      // High intensity: nearly full censoring
      return this.partialCensor(originalWord, 0.8, config.replacementChar)
    } else {
      // Very high intensity: full replacement
      return defaultReplacement
    }
  }

  /**
   * Partially censor a word
   */
  private partialCensor(word: string, intensity: number, replacementChar: string): string {
    if (word.length <= 2) return replacementChar.repeat(word.length)

    const charsToReplace = Math.max(1, Math.floor(word.length * intensity))
    const startIndex = Math.floor((word.length - charsToReplace) / 2)

    return (
      word.substring(0, startIndex) +
      replacementChar.repeat(charsToReplace) +
      word.substring(startIndex + charsToReplace)
    )
  }

  /**
   * Get custom replacement for a word
   */
  private getCustomReplacement(
    word: string,
    match: DetectionMatch,
    config: FilterConfig
  ): string | null {
    // Check exact word match
    const exactMatch = config.customReplacements.get(word.toLowerCase())
    if (exactMatch) return exactMatch

    // Check base word match
    const baseMatch = config.customReplacements.get(match.match.toLowerCase())
    if (baseMatch) return baseMatch

    // Check pattern matches (simple wildcards)
    for (const [pattern, replacement] of config.customReplacements) {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i')
        if (regex.test(word)) {
          return replacement
        }
      }
    }

    return null
  }

  /**
   * Select best replacement from array based on word characteristics
   */
  private selectBestReplacement(originalWord: string, replacements: string[]): string {
    if (replacements.length === 0) return '[censored]'
    if (replacements.length === 1) return replacements[0] || '[censored]'

    // Try to find replacement with similar length
    const similarLength = replacements.find(
      r => Math.abs(r.length - originalWord.length) <= 2
    )

    if (similarLength) return similarLength

    // Fallback to random selection
    return this.selectRandomFromArray(replacements)
  }

  /**
   * Select random item from array
   */
  private selectRandomFromArray<T>(array: T[]): T {
    if (array.length === 0) throw new Error('Cannot select from empty array')
    const item = array[Math.floor(Math.random() * array.length)]
    if (item === undefined) throw new Error('Selected undefined item from array')
    return item
  }


  /**
   * Preserve sentence structure after filtering
   */
  private preserveSentenceStructure(text: string, capitalizeFirst: boolean = false): string {
    // Fix multiple spaces
    let processed = text.replace(/\s{2,}/g, ' ')

    // Fix spacing around punctuation - remove spaces before punctuation
    // BUT don't remove space if previous character is also punctuation
    processed = processed.replace(/([^\s,.;:!?])\s+([,.;:!?])/g, '$1$2')

    // Add spaces after punctuation if missing (but only if followed by letters)
    processed = processed.replace(/([,.;:!?])([a-zA-Z])/g, '$1 $2')

    // Fix capitalization after sentence endings
    processed = processed.replace(/([.!?])\s*([a-z])/g, (_match, punct, letter) => {
      return punct + ' ' + letter.toUpperCase()
    })

    // Remove leading/trailing spaces
    processed = processed.trim()

    // Capitalize first letter only if we removed something from the beginning
    if (capitalizeFirst && processed.length > 0) {
      const firstChar = processed.charAt(0)
      if (/[a-z]/.test(firstChar)) {
        processed = firstChar.toUpperCase() + processed.substring(1)
      }
    }

    return processed
  }

  /**
   * Create empty result for no matches
   */
  private createEmptyResult(text: string): FilterResult {
    return {
      filteredText: text,
      filteredCount: 0,
      filterDetails: [],
      structurePreserved: true,
      lengthComparison: {
        original: text.length,
        filtered: text.length,
        difference: 0
      }
    }
  }

  /**
   * Batch filter multiple texts
   */
  batchFilter(
    texts: string[],
    matchesArray: DetectionMatch[][],
    config?: Partial<FilterConfig>
  ): FilterResult[] {
    if (texts.length !== matchesArray.length) {
      throw new Error('Texts and matches arrays must have the same length')
    }

    return texts.map((text, index) =>
      this.filter(text, matchesArray[index] || [], config)
    )
  }

  /**
   * Create a safe version of text with intelligent filtering
   */
  makeSafe(
    text: string,
    matches: DetectionMatch[],
    safetyLevel: 'strict' | 'moderate' | 'lenient' = 'moderate'
  ): FilterResult {
    const safetyConfigs: Record<string, Partial<FilterConfig>> = {
      strict: {
        mode: FilterModeEnum.REMOVE,
        confidenceThreshold: 0.3,
        gradualFiltering: false,
        preserveStructure: false
      },
      moderate: {
        mode: FilterModeEnum.CENSOR,
        confidenceThreshold: 0.5,
        gradualFiltering: true,
        preserveStructure: true
      },
      lenient: {
        mode: FilterModeEnum.REPLACE,
        confidenceThreshold: 0.7,
        gradualFiltering: true,
        preserveStructure: true
      }
    }

    return this.filter(text, matches, safetyConfigs[safetyLevel])
  }

  /**
   * Update filter configuration
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): FilterConfig {
    return { ...this.config }
  }

  /**
   * Add custom replacement rule
   */
  addCustomReplacement(word: string, replacement: string): void {
    this.config.customReplacements.set(word.toLowerCase(), replacement)
  }

  /**
   * Remove custom replacement rule
   */
  removeCustomReplacement(word: string): boolean {
    return this.config.customReplacements.delete(word.toLowerCase())
  }

  /**
   * Add category replacement options
   */
  addCategoryReplacements(category: string, replacements: string[]): void {
    this.config.categoryReplacements.set(category, replacements)
  }

  /**
   * Get filter statistics
   */
  getStats(): {
    customReplacements: number
    categoryReplacements: number
    currentMode: FilterMode
    preserveStructure: boolean
  } {
    return {
      customReplacements: this.config.customReplacements.size,
      categoryReplacements: this.config.categoryReplacements.size,
      currentMode: this.config.mode,
      preserveStructure: this.config.preserveStructure
    }
  }

  /**
   * Merge configuration with defaults
   */
  private mergeWithDefaults(config: Partial<FilterConfig>): FilterConfig {
    const defaults: FilterConfig = {
      mode: FilterModeEnum.CENSOR,
      replacementChar: '*',
      preserveStructure: true,
      customReplacements: new Map(),
      preserveSentenceStructure: false,
      maintainLength: false,
      confidenceThreshold: 0.0,
      gradualFiltering: false,
      categoryReplacements: new Map([
        ['general', ['inappropriate', 'unsuitable']],
        ['sexual', ['[inappropriate content]', '[explicit content]']],
        ['violence', ['[violent content]', '[aggressive language]']],
        ['hate_speech', ['[offensive content]', '[inappropriate language]']],
        ['discrimination', ['[discriminatory content]', '[offensive language]']],
        ['substance_abuse', ['[substance reference]', '[inappropriate content]']],
        ['religious', ['[religious content]', '[potentially offensive]']],
        ['political', ['[political content]', '[controversial content]']]
      ])
    }

    return {
      ...defaults,
      ...config,
      customReplacements: config.customReplacements || defaults.customReplacements,
      categoryReplacements: config.categoryReplacements || defaults.categoryReplacements
    }
  }
}
