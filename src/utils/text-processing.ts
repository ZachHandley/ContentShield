/**
 * Advanced text processing utilities for NaughtyWords
 * Handles Unicode normalization, RTL languages, and text cleanup
 */

import type { LanguageCode } from '../types/index.js'

/**
 * RTL (Right-to-Left) language codes
 */
export const RTL_LANGUAGES: Set<LanguageCode> = new Set(['ar', 'he'])

/**
 * Language-specific character normalization rules
 */
const LANGUAGE_NORMALIZATION: Record<string, Record<string, string>> = {
  // English normalization
  en: {
    'ç': 'c', 'ñ': 'n', 'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
    'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e', 'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
    'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o', 'ú': 'u', 'ù': 'u', 'û': 'u',
    'ü': 'u', 'ý': 'y', 'ÿ': 'y'
  },
  // French specific
  fr: {
    'œ': 'oe', 'æ': 'ae', 'ß': 'ss'
  },
  // German specific
  de: {
    'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss'
  },
  // Spanish specific
  es: {
    'ñ': 'n', 'ç': 'c'
  },
  // Portuguese specific
  pt: {
    'ã': 'a', 'õ': 'o', 'ç': 'c'
  },
  // Italian specific
  it: {
    'ç': 'c'
  }
}

/**
 * Unicode category mappings for normalization
 */
export const UNICODE_CATEGORIES = {
  // Diacritical marks to remove
  DIACRITICS: /[\u0300-\u036f]/g,
  // Combining marks - use Unicode property escapes
  COMBINING_MARKS: /\p{M}/gu,
  // Control characters to remove - use Unicode property escape
  CONTROL_CHARS: /\p{C}/gu,
  // Zero-width characters
  ZERO_WIDTH: /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
  // Punctuation and symbols (extended)
  PUNCTUATION: /[\u0021-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007e\u00a1-\u00bf\u2000-\u206f\u2e00-\u2e7f]/g,
  // Mathematical operators
  MATH_OPERATORS: /[\u2200-\u22ff\u27c0-\u27ef\u2980-\u29ff\u2a00-\u2aff]/g,
  // Emoji ranges (updated to include modern emoji)
  // eslint-disable-next-line no-misleading-character-class
  EMOJI: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}]/gu
}

/**
 * Text processing configuration
 */
export interface TextProcessingConfig {
  /** Target language for processing */
  language?: LanguageCode
  /** Enable Unicode normalization */
  unicodeNormalization?: boolean
  /** Normalization form (NFC, NFD, NFKC, NFKD) */
  normalizationForm?: 'NFC' | 'NFD' | 'NFKC' | 'NFKD'
  /** Remove diacritical marks */
  removeDiacritics?: boolean
  /** Handle RTL text processing */
  handleRTL?: boolean
  /** Preserve whitespace structure */
  preserveWhitespace?: boolean
  /** Remove control characters */
  removeControlChars?: boolean
  /** Remove zero-width characters */
  removeZeroWidth?: boolean
  /** Convert to lowercase */
  lowercase?: boolean
  /** Remove punctuation */
  removePunctuation?: boolean
  /** Remove emoji */
  removeEmoji?: boolean
  /** Maximum text length for processing */
  maxLength?: number
}

/**
 * Default configuration for text processing
 */
export const DEFAULT_TEXT_PROCESSING_CONFIG: Required<TextProcessingConfig> = {
  language: 'en',
  unicodeNormalization: true,
  normalizationForm: 'NFKC',
  removeDiacritics: true,
  handleRTL: true,
  preserveWhitespace: false,
  removeControlChars: true,
  removeZeroWidth: true,
  lowercase: true,
  removePunctuation: true,
  removeEmoji: false,
  maxLength: 10000
}

/**
 * Advanced text processor class
 */
export class TextProcessor {
  private config: Required<TextProcessingConfig>

  constructor(config: Partial<TextProcessingConfig> = {}) {
    this.config = { ...DEFAULT_TEXT_PROCESSING_CONFIG, ...config }
  }

  /**
   * Process text with all configured normalizations
   */
  process(text: string, overrideConfig?: Partial<TextProcessingConfig>): string {
    if (!text) return ''

    const config = overrideConfig
      ? { ...this.config, ...overrideConfig }
      : this.config

    let processed = text

    // Length check
    if (config.maxLength && processed.length > config.maxLength) {
      processed = processed.substring(0, config.maxLength)
    }

    // Unicode normalization
    if (config.unicodeNormalization) {
      processed = this.normalizeUnicode(processed, config.normalizationForm)
    }

    // Remove control characters
    if (config.removeControlChars) {
      processed = processed.replace(UNICODE_CATEGORIES.CONTROL_CHARS, '')
    }

    // Remove zero-width characters
    if (config.removeZeroWidth) {
      processed = processed.replace(UNICODE_CATEGORIES.ZERO_WIDTH, '')
    }

    // Handle RTL text
    if (config.handleRTL && RTL_LANGUAGES.has(config.language)) {
      processed = this.processRTL(processed)
    }

    // Language-specific normalization (before case conversion)
    processed = this.applyLanguageNormalization(processed, config.language)

    // Case normalization (before diacritic removal for Turkish)
    if (config.lowercase) {
      processed = this.normalizeCase(processed, config.language)
    }

    // Remove diacritics
    if (config.removeDiacritics) {
      processed = this.removeDiacritics(processed)
    }

    // Remove punctuation
    if (config.removePunctuation) {
      processed = this.removePunctuation(processed, config.preserveWhitespace)
    }

    // Remove emoji
    if (config.removeEmoji) {
      processed = this.removeEmoji(processed)
    }

    // Normalize whitespace
    if (!config.preserveWhitespace) {
      processed = this.normalizeWhitespace(processed)
    }

    return processed.trim()
  }

  /**
   * Normalize Unicode characters
   */
  normalizeUnicode(text: string, form: 'NFC' | 'NFD' | 'NFKC' | 'NFKD' = 'NFKC'): string {
    try {
      return text.normalize(form)
    } catch (error) {
      // Fallback if normalization fails
      console.warn('Unicode normalization failed:', error)
      return text
    }
  }

  /**
   * Remove diacritical marks from text
   */
  removeDiacritics(text: string): string {
    return text
      .normalize('NFD')
      .replace(UNICODE_CATEGORIES.DIACRITICS, '')
      .normalize('NFC')
  }

  /**
   * Apply language-specific character normalizations
   */
  applyLanguageNormalization(text: string, language: LanguageCode): string {
    const rules = LANGUAGE_NORMALIZATION[language]
    if (!rules) return text

    let normalized = text
    for (const [from, to] of Object.entries(rules)) {
      normalized = normalized.replace(new RegExp(from, 'g'), to)
    }
    return normalized
  }

  /**
   * Process RTL (Right-to-Left) text
   */
  processRTL(text: string): string {
    // Remove RTL/LTR marks and isolates
    return text
      .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '')
      .replace(/\u061c/g, '') // Arabic letter mark
      .trim()
  }

  /**
   * Normalize case with language-specific rules
   */
  normalizeCase(text: string, language: LanguageCode): string {
    switch (language) {
      case 'tr': // Turkish has special case rules for i/I
        {
          // Handle Turkish dotted/undotted i correctly
          // Process character by character to preserve Turkish case rules
          let result = ''
          for (let i = 0; i < text.length; i++) {
            const char = text[i]
            switch (char) {
              case 'İ':
                result += 'i'  // Capital dotted I -> lowercase dotted i
                break
              case 'I':
                result += 'ı'  // Capital undotted I -> lowercase undotted ı
                break
              case 'i':
                result += 'i'  // lowercase dotted i stays the same
                break
              case 'ı':
                result += 'ı'  // lowercase undotted ı stays the same
                break
              default:
                result += char!.toLowerCase()
                break
            }
          }
          return result
        }

      case 'de': // German ß handling
        return text.toLowerCase().replace(/ß/g, 'ss')

      default:
        return text.toLowerCase()
    }
  }

  /**
   * Remove emoji from text
   */
  removeEmoji(text: string): string {
    // Use the updated emoji regex
    return text.replace(UNICODE_CATEGORIES.EMOJI, '')
  }

  /**
   * Remove punctuation while optionally preserving whitespace structure
   */
  removePunctuation(text: string, preserveWhitespace = false): string {
    if (preserveWhitespace) {
      // Replace punctuation with single space
      return text.replace(UNICODE_CATEGORIES.PUNCTUATION, ' ')
    } else {
      // Remove punctuation entirely
      return text.replace(UNICODE_CATEGORIES.PUNCTUATION, '')
    }
  }

  /**
   * Normalize whitespace characters
   */
  normalizeWhitespace(text: string): string {
    return text
      // Replace various whitespace characters with regular space
      .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
      // Collapse multiple whitespace into single space
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Check if text contains RTL characters
   */
  hasRTLCharacters(text: string): boolean {
    // Arabic, Hebrew, and other RTL scripts
    const rtlRanges = [
      /[\u0590-\u05ff]/,  // Hebrew
      /[\u0600-\u06ff]/,  // Arabic
      /[\u0750-\u077f]/,  // Arabic Supplement
      /[\u08a0-\u08ff]/,  // Arabic Extended-A
      /[\ufb1d-\ufb4f]/,  // Hebrew Presentation Forms
      /[\ufb50-\ufdff]/,  // Arabic Presentation Forms-A
      /[\ufe70-\ufeff]/   // Arabic Presentation Forms-B
    ]

    return rtlRanges.some(pattern => pattern.test(text))
  }

  /**
   * Detect and extract different character encodings
   */
  detectEncoding(text: string): {
    hasAscii: boolean
    hasLatin: boolean
    hasExtendedLatin: boolean
    hasCyrillic: boolean
    hasArabic: boolean
    hasHebrew: boolean
    hasCJK: boolean
    hasEmoji: boolean
  } {
    return {
      hasAscii: /[\x20-\x7e]/.test(text), // ASCII printable characters
      hasLatin: /[\u0080-\u00ff]/.test(text),
      hasExtendedLatin: /[\u0100-\u017f\u0180-\u024f]/.test(text),
      hasCyrillic: /[\u0400-\u04ff]/.test(text),
      hasArabic: /[\u0600-\u06ff]/.test(text),
      hasHebrew: /[\u0590-\u05ff]/.test(text),
      hasCJK: /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(text),
      hasEmoji: UNICODE_CATEGORIES.EMOJI.test(text)
    }
  }

  /**
   * Clean text for comparison operations
   */
  cleanForComparison(text: string): string {
    return this.process(text, {
      removeDiacritics: true,
      removePunctuation: true,
      removeEmoji: true,
      lowercase: true,
      preserveWhitespace: false
    })
  }

  /**
   * Prepare text for search operations
   */
  prepareForSearch(text: string): string {
    return this.process(text, {
      removeDiacritics: true,
      removePunctuation: false,
      removeEmoji: false,
      lowercase: true,
      preserveWhitespace: true
    })
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TextProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<TextProcessingConfig> {
    return { ...this.config }
  }
}

/**
 * Default text processor instance
 */
export const defaultTextProcessor = new TextProcessor()

/**
 * Quick text normalization function
 */
export function normalizeText(
  text: string,
  config?: Partial<TextProcessingConfig>
): string {
  return defaultTextProcessor.process(text, config)
}

/**
 * Clean text for profanity detection
 */
export function cleanTextForDetection(
  text: string,
  language: LanguageCode = 'en'
): string {
  return defaultTextProcessor.process(text, {
    language,
    removeDiacritics: true,
    removePunctuation: true,
    removeEmoji: false,
    lowercase: true,
    preserveWhitespace: false
  })
}

/**
 * Extract meaningful words from text
 */
export function extractWords(
  text: string,
  minLength = 2,
  maxLength = 50
): string[] {
  const normalized = normalizeText(text, { preserveWhitespace: true })

  return normalized
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z]/g, ''))
    .filter(word => word.length >= minLength && word.length <= maxLength)
    .filter(word => /[a-zA-Z]/.test(word)) // Must contain at least one letter
}

/**
 * Check if text is primarily RTL
 */
export function isRTLText(text: string): boolean {
  const processor = new TextProcessor()
  return processor.hasRTLCharacters(text)
}

/**
 * Get text statistics
 */
export function getTextStats(text: string): {
  length: number
  wordCount: number
  charCount: number
  encoding: ReturnType<TextProcessor['detectEncoding']>
  isRTL: boolean
  hasMultipleScripts: boolean
} {
  const processor = new TextProcessor()
  const words = extractWords(text)
  const encoding = processor.detectEncoding(text)

  // Check if multiple scripts are present
  const scriptCount = Object.values(encoding).filter(Boolean).length

  return {
    length: text.length,
    wordCount: words.length,
    charCount: text.replace(/\s/g, '').length,
    encoding,
    isRTL: processor.hasRTLCharacters(text),
    hasMultipleScripts: scriptCount > 1
  }
}