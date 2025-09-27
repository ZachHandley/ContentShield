/**
 * Text normalization utilities for consistent profanity detection
 */

/**
 * Normalize text for profanity detection - OPTIMIZED
 */
export function normalizeText(text: string): string {
  if (!text || text.length === 0) return text

  // Fast path for short texts
  if (text.length <= 50) {
    return normalizeShortText(text)
  }

  // Long text optimization
  return normalizeLongText(text)
}

/**
 * Optimized normalization for short texts
 */
function normalizeShortText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[_\-.!@#$%^&()+=[\]{}|\\:;"'<>,?~`*]/g, '')
    .replace(/[0]/g, 'o')
    .replace(/[1]/g, 'i')
    .replace(/[3]/g, 'e')
    .replace(/[4]/g, 'a')
    .replace(/[5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[8]/g, 'b')
    .replace(/(.)\1{2,}/g, '$1$1')
}

/**
 * Optimized normalization for long texts with chunking
 */
function normalizeLongText(text: string): string {
  // For very long texts, we can use a simpler normalization
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    // Remove only the most common obfuscation characters for performance
    .replace(/[_\-.!@#$%^&*]/g, '')
    // Apply character substitutions only at word boundaries
    .replace(/\b[0]\b/g, 'o')
    .replace(/\b[1]\b/g, 'i')
    .replace(/\b[3]\b/g, 'e')
    .replace(/\b[4]\b/g, 'a')
    .replace(/\b[5]\b/g, 's')
    .replace(/\b[7]\b/g, 't')
    .replace(/\b[8]\b/g, 'b')
    .replace(/(.)\1{3,}/g, '$1$1') // Only reduce very long repetitions
}

/**
 * Extract words from text for individual analysis
 */
export function extractWords(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 1)
}

/**
 * Create variations of a word for detection
 */
export function createWordVariations(word: string): string[] {
  const variations = new Set<string>()
  variations.add(word)

  // Add common letter substitutions
  const substitutions: Record<string, string[]> = {
    a: ['@', '4'],
    e: ['3'],
    i: ['1', '!'],
    o: ['0'],
    s: ['5', '$'],
    t: ['7'],
    b: ['8'],
  }

  // Generate variations with substitutions
  let current = [word]
  for (const [letter, replacements] of Object.entries(substitutions)) {
    const next: string[] = []
    for (const variant of current) {
      next.push(variant)
      for (const replacement of replacements) {
        next.push(variant.replace(new RegExp(letter, 'g'), replacement))
      }
    }
    current = next
  }

  current.forEach(v => variations.add(v))
  return Array.from(variations)
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0))

  for (let i = 0; i <= a.length; i += 1) {
    matrix[0]![i] = i
  }

  for (let j = 0; j <= b.length; j += 1) {
    matrix[j]![0] = j
  }

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j]![i] = Math.min(
        matrix[j]![i - 1]! + 1, // deletion
        matrix[j - 1]![i]! + 1, // insertion
        matrix[j - 1]![i - 1]! + indicator // substitution
      )
    }
  }

  return matrix[b.length]![a.length]!
}

/**
 * Text normalizer configuration options
 */
export interface TextNormalizerOptions {
  removeAccents?: boolean
  expandContractions?: boolean
  normalizeWhitespace?: boolean
  preserveCase?: boolean
}

/**
 * Advanced text normalizer with configurable options
 */
export const textNormalizer = {
  normalize: (text: string, options: TextNormalizerOptions = {}): string => {
    let normalized = text

    if (!options.preserveCase) {
      normalized = normalized.toLowerCase()
    }

    if (options.normalizeWhitespace !== false) {
      normalized = normalized.replace(/\s+/g, ' ').trim()
    }

    if (options.removeAccents) {
      normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    }

    if (options.expandContractions) {
      const contractions: Record<string, string> = {
        "don't": "do not",
        "doesn't": "does not",
        "didn't": "did not",
        "won't": "will not",
        "can't": "cannot",
        "isn't": "is not",
        "aren't": "are not",
        "wasn't": "was not",
        "weren't": "were not",
        "haven't": "have not",
        "hasn't": "has not",
        "hadn't": "had not",
        "wouldn't": "would not",
        "shouldn't": "should not",
        "couldn't": "could not"
      }

      for (const [contraction, expansion] of Object.entries(contractions)) {
        normalized = normalized.replace(new RegExp(contraction, 'gi'), expansion)
      }
    }

    return normalized
  }
}
