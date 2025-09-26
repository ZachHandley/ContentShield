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

    // Filter matches by confidence threshold
    const qualifyingMatches = matches.filter(
      match => match.confidence >= effectiveConfig.confidenceThreshold
    )

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
      filteredText = this.preserveSentenceStructure(filteredText)
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
    const newText = text.substring(0, match.start) + replacement + text.substring(match.end)

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
        // Replace letters with replacement character
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
    text: string,
    start: number,
    end: number
  ): string {
    // Check surrounding context to determine what to do with spaces
    const beforeChar = start > 0 ? (text[start - 1] || '') : ''
    const afterChar = end < text.length ? (text[end] || '') : ''

    const beforeIsSpace = /\s/.test(beforeChar)
    const afterIsSpace = /\s/.test(afterChar)

    // If word is surrounded by spaces, remove one space to avoid double spaces
    if (beforeIsSpace && afterIsSpace) {
      return '' // Remove the word, let surrounding spaces handle spacing
    }

    // If at beginning or end of sentence, just remove
    if (start === 0 || end === text.length) {
      return ''
    }

    // If next to punctuation, just remove
    if (/[,.;:!?]/.test(beforeChar || '') || /[,.;:!?]/.test(afterChar || '')) {
      return ''
    }

    // Default: replace with single space to maintain word separation
    return ' '
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
  private preserveSentenceStructure(text: string): string {
    // Fix multiple spaces
    let processed = text.replace(/\s{2,}/g, ' ')

    // Fix spacing around punctuation
    processed = processed.replace(/\s+([,.;:!?])/g, '$1')
    processed = processed.replace(/([,.;:!?])([a-zA-Z])/g, '$1 $2')

    // Fix capitalization after sentence endings
    processed = processed.replace(/([.!?])\s*([a-z])/g, (_match, punct, letter) => {
      return punct + ' ' + letter.toUpperCase()
    })

    // Ensure first letter is capitalized
    processed = processed.replace(/^[a-z]/, match => match.toUpperCase())

    // Remove leading/trailing spaces
    processed = processed.trim()

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
      preserveSentenceStructure: true,
      maintainLength: false,
      confidenceThreshold: 0.5,
      gradualFiltering: true,
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
