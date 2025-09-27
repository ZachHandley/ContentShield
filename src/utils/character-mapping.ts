/**
 * Character mapping utilities for NaughtyWords
 * Handles leetspeak, homograph detection, and character substitutions
 */

import type { LanguageCode } from '../types/index.js'

/**
 * Leetspeak character mappings (1337 speak)
 * Maps common substitutions back to their original characters
 */
export const LEETSPEAK_MAPPINGS: Record<string, string[]> = {
  // Numbers to letters
  '0': ['o', 'O'],
  '1': ['i', 'I', 'l', 'L'],
  '2': ['z', 'Z'],
  '3': ['e', 'E'],
  '4': ['a', 'A'],
  '5': ['s', 'S'],
  '6': ['g', 'G'],
  '7': ['t', 'T', 'l', 'L'],
  '8': ['b', 'B'],
  '9': ['g', 'G', 'q', 'Q'],

  // Special characters to letters
  '@': ['a', 'A'],
  '$': ['s', 'S'],
  '!': ['i', 'I', 'l', 'L'],
  '+': ['t', 'T'],
  '|': ['i', 'I', 'l', 'L'],
  '(': ['c', 'C'],
  ')': ['c', 'C'],
  '[': ['c', 'C'],
  ']': ['c', 'C'],
  '{': ['c', 'C'],
  '}': ['c', 'C'],
  '<': ['c', 'C'],
  '>': ['c', 'C'],
  '/': ['/', 'i', 'I', 'l', 'L'],
  '\\': ['\\', 'i', 'I', 'l', 'L'],
  '_': [''],
  '-': [''],
  '.': [''],
  ',': [''],
  ';': [''],
  ':': [''],
  '"': [''],
  "'": [''],
  '`': [''],
  '~': [''],
  '^': [''],
  '*': [''],
  '&': [''],
  '%': [''],
  '#': [''],
  '=': ['']
}

/**
 * Visually similar character mappings (homographs)
 * Maps similar-looking characters from different scripts
 */
export const HOMOGRAPH_MAPPINGS: Record<string, string[]> = {
  // Cyrillic to Latin
  'а': ['a'], // Cyrillic а
  'е': ['e'], // Cyrillic е
  'о': ['o'], // Cyrillic о
  'р': ['p'], // Cyrillic р
  'с': ['c'], // Cyrillic с
  'у': ['y'], // Cyrillic у
  'х': ['x'], // Cyrillic х
  'ѕ': ['s'], // Cyrillic ѕ
  'А': ['A'], // Cyrillic А
  'В': ['B'], // Cyrillic В
  'Е': ['E'], // Cyrillic Е
  'К': ['K'], // Cyrillic К
  'М': ['M'], // Cyrillic М
  'Н': ['H'], // Cyrillic Н
  'О': ['O'], // Cyrillic О
  'Р': ['P'], // Cyrillic Р
  'С': ['C'], // Cyrillic С
  'Т': ['T'], // Cyrillic Т
  'У': ['Y'], // Cyrillic У
  'Х': ['X'], // Cyrillic Х

  // Greek to Latin
  'α': ['a'], // Greek α
  'β': ['b'], // Greek β
  'γ': ['y'], // Greek γ
  'δ': ['d'], // Greek δ
  'ε': ['e'], // Greek ε
  'ζ': ['z'], // Greek ζ
  'η': ['n'], // Greek η
  'θ': ['o'], // Greek θ
  'ι': ['i'], // Greek ι
  'κ': ['k'], // Greek κ
  'λ': ['l'], // Greek λ
  'μ': ['m'], // Greek μ
  'ν': ['v'], // Greek ν
  'ξ': ['x'], // Greek ξ
  'ο': ['o'], // Greek ο
  'π': ['p'], // Greek π
  'ρ': ['p'], // Greek ρ
  'σ': ['s'], // Greek σ
  'τ': ['t'], // Greek τ
  'υ': ['u'], // Greek υ
  'φ': ['f'], // Greek φ
  'χ': ['x'], // Greek χ
  'ψ': ['y'], // Greek ψ
  'ω': ['w'], // Greek ω

  // Greek uppercase
  'Α': ['A'], // Greek Α
  'Β': ['B'], // Greek Β
  'Γ': ['G'], // Greek Γ
  'Δ': ['D'], // Greek Δ
  'Ε': ['E'], // Greek Ε
  'Ζ': ['Z'], // Greek Ζ
  'Η': ['H'], // Greek Η
  'Θ': ['O'], // Greek Θ
  'Ι': ['I'], // Greek Ι
  'Κ': ['K'], // Greek Κ
  'Λ': ['L'], // Greek Λ
  'Μ': ['M'], // Greek Μ
  'Ν': ['N'], // Greek Ν
  'Ξ': ['X'], // Greek Ξ
  'Ο': ['O'], // Greek Ο
  'Π': ['P'], // Greek Π
  'Ρ': ['P'], // Greek Ρ
  'Σ': ['S'], // Greek Σ
  'Τ': ['T'], // Greek Τ
  'Υ': ['Y'], // Greek Υ
  'Φ': ['F'], // Greek Φ
  'Χ': ['X'], // Greek Χ
  'Ψ': ['Y'], // Greek Ψ
  'Ω': ['W'], // Greek Ω

  // Mathematical and special characters
  '∀': ['A'], // For all
  '∈': ['E'], // Element of
  '∅': ['O'], // Empty set
  '∞': ['oo'], // Infinity
  '≡': ['='], // Identical to
  '≈': ['='], // Almost equal
  '≠': ['!='], // Not equal
  '≤': ['<='], // Less than or equal
  '≥': ['>='], // Greater than or equal
  '⊂': ['C'], // Subset of
  '⊃': ['C'], // Superset of
  '⊄': ['C'], // Not subset of
  '⊅': ['C'], // Not superset of

  // Other similar characters
  'ı': ['i'], // Dotless i
  'İ': ['I'], // I with dot
  'ł': ['l'], // L with stroke
  'Ł': ['L'], // L with stroke
  'ø': ['o'], // O with stroke
  'Ø': ['O'], // O with stroke
  'đ': ['d'], // D with stroke
  'Đ': ['D'], // D with stroke
  'ð': ['d'], // Eth
  'Ð': ['D'], // Eth
  'þ': ['p'], // Thorn
  'Þ': ['P'], // Thorn
  'ß': ['ss'], // German sharp s

  // Fullwidth characters (commonly used to bypass filters)
  'Ａ': ['A'], 'Ｂ': ['B'], 'Ｃ': ['C'], 'Ｄ': ['D'], 'Ｅ': ['E'], 'Ｆ': ['F'],
  'Ｇ': ['G'], 'Ｈ': ['H'], 'Ｉ': ['I'], 'Ｊ': ['J'], 'Ｋ': ['K'], 'Ｌ': ['L'],
  'Ｍ': ['M'], 'Ｎ': ['N'], 'Ｏ': ['O'], 'Ｐ': ['P'], 'Ｑ': ['Q'], 'Ｒ': ['R'],
  'Ｓ': ['S'], 'Ｔ': ['T'], 'Ｕ': ['U'], 'Ｖ': ['V'], 'Ｗ': ['W'], 'Ｘ': ['X'],
  'Ｙ': ['Y'], 'Ｚ': ['Z'],
  'ａ': ['a'], 'ｂ': ['b'], 'ｃ': ['c'], 'ｄ': ['d'], 'ｅ': ['e'], 'ｆ': ['f'],
  'ｇ': ['g'], 'ｈ': ['h'], 'ｉ': ['i'], 'ｊ': ['j'], 'ｋ': ['k'], 'ｌ': ['l'],
  'ｍ': ['m'], 'ｎ': ['n'], 'ｏ': ['o'], 'ｐ': ['p'], 'ｑ': ['q'], 'ｒ': ['r'],
  'ｓ': ['s'], 'ｔ': ['t'], 'ｕ': ['u'], 'ｖ': ['v'], 'ｗ': ['w'], 'ｘ': ['x'],
  'ｙ': ['y'], 'ｚ': ['z']
}

/**
 * Diacritic mappings for different languages
 */
export const DIACRITIC_MAPPINGS: Record<string, Record<string, string[]>> = {
  // Latin-based languages
  general: {
    'à': ['a'], 'á': ['a'], 'â': ['a'], 'ã': ['a'], 'å': ['a'],
    'è': ['e'], 'é': ['e'], 'ê': ['e'], 'ë': ['e'],
    'ì': ['i'], 'í': ['i'], 'î': ['i'], 'ï': ['i'],
    'ò': ['o'], 'ó': ['o'], 'ô': ['o'], 'õ': ['o'],
    'ù': ['u'], 'ú': ['u'], 'û': ['u'],
    'ý': ['y'], 'ÿ': ['y'],
    'ñ': ['n'], 'ç': ['c']
  },
  // German specific
  de: {
    'ä': ['ae', 'a'], 'ö': ['oe', 'o'], 'ü': ['ue', 'u'], 'ß': ['ss', 'b'],
    'Ä': ['Ae', 'A'], 'Ö': ['Oe', 'O'], 'Ü': ['Ue', 'U']
  },
  // French specific
  fr: {
    'æ': ['ae'], 'œ': ['oe'], 'ç': ['c']
  },
  // Spanish specific
  es: {
    'ñ': ['n']
  },
  // Portuguese specific
  pt: {
    'ã': ['a'], 'õ': ['o'], 'ç': ['c']
  }
}

/**
 * Character repetition patterns (e.g., "heeeeey" -> "hey")
 */
export const REPETITION_PATTERNS = {
  // Maximum consecutive identical characters to keep
  MAX_REPETITION: 2,
  // Pattern for detecting repetitive characters
  REPETITION_REGEX: /(.)\1{2,}/g
}

/**
 * Spacing and separator patterns
 */
export const SPACING_PATTERNS = {
  // Characters commonly used as separators to break words
  SEPARATORS: /[_\-.~*+=|\\/<>]+/g,
  // Zero-width and invisible characters
  INVISIBLE_CHARS: /[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,
  // Multiple whitespace
  MULTIPLE_SPACES: /\s+/g
}

/**
 * Character mapping processor class
 */
export class CharacterMapper {
  private enableLeetspeak: boolean
  private enableHomographs: boolean
  private enableDiacritics: boolean
  private enableRepetitionNormalization: boolean
  private language: LanguageCode

  constructor(options: {
    enableLeetspeak?: boolean
    enableHomographs?: boolean
    enableDiacritics?: boolean
    enableRepetitionNormalization?: boolean
    language?: LanguageCode
  } = {}) {
    this.enableLeetspeak = options.enableLeetspeak ?? true
    this.enableHomographs = options.enableHomographs ?? true
    this.enableDiacritics = options.enableDiacritics ?? true
    this.enableRepetitionNormalization = options.enableRepetitionNormalization ?? true
    this.language = options.language ?? 'en'
  }

  /**
   * Apply all character mappings to text
   */
  mapCharacters(text: string): string[] {
    let variations = [text]

    // Apply leetspeak mappings
    if (this.enableLeetspeak) {
      variations = this.expandWithMappings(variations, LEETSPEAK_MAPPINGS)
    }

    // Apply homograph mappings
    if (this.enableHomographs) {
      variations = this.expandWithMappings(variations, HOMOGRAPH_MAPPINGS)
    }

    // Apply diacritic mappings
    if (this.enableDiacritics) {
      const diacriticMaps = {
        ...DIACRITIC_MAPPINGS.general,
        ...(DIACRITIC_MAPPINGS[this.language] || {})
      }
      variations = this.expandWithMappings(variations, diacriticMaps)
    }

    // Normalize repetitive characters
    if (this.enableRepetitionNormalization) {
      variations = variations.map(v => this.normalizeRepetition(v))
    }

    // Remove separators and invisible characters
    variations = variations.map(v => this.removeSeparators(v))

    // Remove duplicates and empty strings
    return [...new Set(variations)].filter(v => v.length > 0)
  }

  /**
   * Normalize leetspeak text to regular characters
   */
  normalizeLeetspeak(text: string): string {
    let normalized = text
    for (const [leetChar, normalChars] of Object.entries(LEETSPEAK_MAPPINGS)) {
      if (normalChars.length > 0 && normalChars[0]) {
        normalized = normalized.replace(
          new RegExp(this.escapeRegex(leetChar), 'g'),
          normalChars[0]
        )
      }
    }
    return normalized
  }

  /**
   * Normalize homograph characters to Latin equivalents
   */
  normalizeHomographs(text: string): string {
    let normalized = text
    for (const [homograph, latinChars] of Object.entries(HOMOGRAPH_MAPPINGS)) {
      if (latinChars.length > 0 && latinChars[0]) {
        normalized = normalized.replace(
          new RegExp(this.escapeRegex(homograph), 'g'),
          latinChars[0]
        )
      }
    }
    return normalized
  }

  /**
   * Normalize diacritics for the specified language
   */
  normalizeDiacritics(text: string, language: LanguageCode = this.language): string {
    const generalMappings = DIACRITIC_MAPPINGS.general || {}
    const languageMappings = DIACRITIC_MAPPINGS[language] || {}

    let normalized = text

    // Apply language-specific mappings first (they take precedence)
    for (const [diacritic, normalChars] of Object.entries(languageMappings)) {
      if (normalChars.length > 0 && normalChars[0]) {
        normalized = normalized.replace(
          new RegExp(this.escapeRegex(diacritic), 'g'),
          normalChars[0]
        )
      }
    }

    // Then apply general mappings for characters not covered by language-specific ones
    for (const [diacritic, normalChars] of Object.entries(generalMappings)) {
      if (normalChars.length > 0 && normalChars[0]) {
        normalized = normalized.replace(
          new RegExp(this.escapeRegex(diacritic), 'g'),
          normalChars[0]
        )
      }
    }

    return normalized
  }

  /**
   * Normalize repetitive characters
   */
  normalizeRepetition(text: string, maxRepetition?: number): string {
    const max = maxRepetition ?? REPETITION_PATTERNS.MAX_REPETITION
    return text.replace(REPETITION_PATTERNS.REPETITION_REGEX, (match, char) => {
      return char.repeat(Math.min(match.length, max))
    })
  }

  /**
   * Remove separators and invisible characters
   */
  removeSeparators(text: string): string {
    return text
      .replace(SPACING_PATTERNS.SEPARATORS, '')
      .replace(SPACING_PATTERNS.INVISIBLE_CHARS, '')
      .replace(SPACING_PATTERNS.MULTIPLE_SPACES, ' ')
      .trim()
  }

  /**
   * Generate all possible character variations
   */
  generateVariations(text: string, maxVariations = 50): string[] {
    const variations = this.mapCharacters(text)

    // Limit the number of variations to prevent combinatorial explosion
    return variations.slice(0, maxVariations)
  }

  /**
   * Check if text contains leetspeak characters
   */
  hasLeetspeak(text: string): boolean {
    return Object.keys(LEETSPEAK_MAPPINGS).some(char => text.includes(char))
  }

  /**
   * Check if text contains homograph characters
   */
  hasHomographs(text: string): boolean {
    return Object.keys(HOMOGRAPH_MAPPINGS).some(char => text.includes(char))
  }

  /**
   * Check if text contains diacritic characters
   */
  hasDiacritics(text: string): boolean {
    const allDiacritics = [
      ...Object.keys(DIACRITIC_MAPPINGS.general || {}),
      ...Object.keys(DIACRITIC_MAPPINGS[this.language] || {})
    ]
    return allDiacritics.some(char => text.includes(char))
  }

  /**
   * Check if text has repetitive characters
   */
  hasRepetition(text: string): boolean {
    return REPETITION_PATTERNS.REPETITION_REGEX.test(text)
  }

  /**
   * Get statistics about character obfuscation in text
   */
  getObfuscationStats(text: string): {
    hasLeetspeak: boolean
    hasHomographs: boolean
    hasDiacritics: boolean
    hasRepetition: boolean
    hasSeparators: boolean
    obfuscationLevel: 'none' | 'low' | 'medium' | 'high'
  } {
    const hasLeetspeak = this.hasLeetspeak(text)
    const hasHomographs = this.hasHomographs(text)
    const hasDiacritics = this.hasDiacritics(text)
    const hasRepetition = this.hasRepetition(text)
    const hasSeparators = SPACING_PATTERNS.SEPARATORS.test(text)

    const obfuscationCount = [
      hasLeetspeak,
      hasHomographs,
      hasDiacritics,
      hasRepetition,
      hasSeparators
    ].filter(Boolean).length

    let obfuscationLevel: 'none' | 'low' | 'medium' | 'high'
    if (obfuscationCount === 0) {
      obfuscationLevel = 'none'
    } else if (obfuscationCount <= 1) {
      obfuscationLevel = 'low'
    } else if (obfuscationCount <= 2) {
      obfuscationLevel = 'medium'
    } else {
      obfuscationLevel = 'high'
    }

    return {
      hasLeetspeak,
      hasHomographs,
      hasDiacritics,
      hasRepetition,
      hasSeparators,
      obfuscationLevel
    }
  }

  private expandWithMappings(
    variations: string[],
    mappings: Record<string, string[]>
  ): string[] {
    const expanded = new Set<string>()

    for (const variant of variations) {
      expanded.add(variant)

      // Generate mapped variations
      for (const [from, toList] of Object.entries(mappings)) {
        if (variant.includes(from)) {
          for (const to of toList) {
            const newVariant = variant.replace(
              new RegExp(this.escapeRegex(from), 'g'),
              to
            )
            expanded.add(newVariant)
          }
        }
      }
    }

    return Array.from(expanded)
  }

  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
}

/**
 * Default character mapper instance
 */
export const defaultCharacterMapper = new CharacterMapper()

/**
 * Quick function to normalize all character obfuscations
 */
export function normalizeCharacters(
  text: string,
  language: LanguageCode = 'en'
): string {
  const mapper = new CharacterMapper({ language })
  const normalized = mapper.normalizeLeetspeak(text)
  const withoutHomographs = mapper.normalizeHomographs(normalized)
  const withoutDiacritics = mapper.normalizeDiacritics(withoutHomographs, language)

  // Apply repetition normalization (reduce to single character for this function)
  const withoutRepetition = mapper.normalizeRepetition(withoutDiacritics, 1)
  const cleanText = mapper.removeSeparators(withoutRepetition)

  // Convert to lowercase for consistency
  return cleanText.toLowerCase()
}

/**
 * Generate character variations for a word
 */
export function generateCharacterVariations(
  text: string,
  maxVariations = 25
): string[] {
  return defaultCharacterMapper.generateVariations(text, maxVariations)
}

/**
 * Check obfuscation level of text
 */
export function getTextObfuscationLevel(text: string): 'none' | 'low' | 'medium' | 'high' {
  return defaultCharacterMapper.getObfuscationStats(text).obfuscationLevel
}