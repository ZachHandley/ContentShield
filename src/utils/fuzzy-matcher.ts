import { levenshteinDistance } from './text-normalizer.js'

/**
 * Fuzzy matching utilities for profanity detection
 */

/**
 * Check if two strings match within a fuzzy threshold
 */
export function fuzzyMatch(
  text: string,
  pattern: string,
  threshold: number = 0.8
): boolean {
  if (text === pattern) return true

  const distance = levenshteinDistance(
    text.toLowerCase(),
    pattern.toLowerCase()
  )
  const maxLength = Math.max(text.length, pattern.length)
  const similarity = 1 - distance / maxLength

  return similarity >= threshold
}

/**
 * Find fuzzy matches in text
 */
export function findFuzzyMatches(
  text: string,
  patterns: string[],
  threshold: number = 0.8
): Array<{
  pattern: string
  match: string
  similarity: number
  start: number
  end: number
}> {
  const matches: Array<{
    pattern: string
    match: string
    similarity: number
    start: number
    end: number
  }> = []
  const words = text.split(/\s+/)
  let currentIndex = 0

  for (const word of words) {
    const wordStart = text.indexOf(word, currentIndex)
    const wordEnd = wordStart + word.length

    for (const pattern of patterns) {
      if (fuzzyMatch(word, pattern, threshold)) {
        const distance = levenshteinDistance(
          word.toLowerCase(),
          pattern.toLowerCase()
        )
        const similarity = 1 - distance / Math.max(word.length, pattern.length)

        matches.push({
          pattern,
          match: word,
          similarity,
          start: wordStart,
          end: wordEnd,
        })
      }
    }

    currentIndex = wordEnd
  }

  return matches
}

/**
 * Calculate similarity score between two strings
 */
export function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1.0

  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)

  return 1 - distance / maxLength
}

/**
 * Find the best match from a list of patterns
 */
export function findBestMatch(
  text: string,
  patterns: string[],
  minThreshold: number = 0.8
): { pattern: string; similarity: number } | null {
  let bestMatch: { pattern: string; similarity: number } | null = null

  for (const pattern of patterns) {
    const similarity = calculateSimilarity(text, pattern)

    if (
      similarity >= minThreshold &&
      (!bestMatch || similarity > bestMatch.similarity)
    ) {
      bestMatch = { pattern, similarity }
    }
  }

  return bestMatch
}
