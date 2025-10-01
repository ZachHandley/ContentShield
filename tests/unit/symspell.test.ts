import { describe, it, expect, beforeEach } from 'vitest'
import { SymSpellIndex } from '../../src/core/symspell.js'

describe('SymSpell', () => {
  describe('Basic Functionality', () => {
    let index: SymSpellIndex

    beforeEach(() => {
      index = new SymSpellIndex({ maxEditDistance: 1 })
    })

    it('should find exact matches', () => {
      index.buildIndex(['shit', 'fuck', 'damn'])

      const results = index.lookup('shit')

      expect(results).toHaveLength(1)
      expect(results[0].word).toBe('shit')
      expect(results[0].editDistance).toBe(0)
    })

    it('should find matches with edit distance 1', () => {
      index.buildIndex(['shit'])

      // Missing one character: "sht" (i deleted)
      const results1 = index.lookup('sht')
      expect(results1.length).toBeGreaterThan(0)
      expect(results1[0].word).toBe('shit')
      expect(results1[0].editDistance).toBe(1)

      // Extra character: "shitt" (t added)
      const results2 = index.lookup('shitt')
      expect(results2.length).toBeGreaterThan(0)
      expect(results2[0].word).toBe('shit')
      expect(results2[0].editDistance).toBe(1)

      // Substitution: "sh!t" (! replaces i)
      const results3 = index.lookup('sh!t')
      expect(results3.length).toBeGreaterThan(0)
      expect(results3[0].word).toBe('shit')
      expect(results3[0].editDistance).toBe(1)
    })

    it('should handle case insensitivity by default', () => {
      index.buildIndex(['SHIT', 'Fuck', 'dAmN'])

      const results1 = index.lookup('shit')
      expect(results1).toHaveLength(1)
      expect(results1[0].word).toBe('shit')

      const results2 = index.lookup('FUCK')
      expect(results2).toHaveLength(1)
      expect(results2[0].word).toBe('fuck')
    })

    it('should respect case sensitivity when enabled', () => {
      const caseSensitiveIndex = new SymSpellIndex({
        maxEditDistance: 1,
        caseSensitive: true
      })

      caseSensitiveIndex.buildIndex(['SHIT', 'shit'])

      const results1 = caseSensitiveIndex.lookup('SHIT')
      expect(results1[0].word).toBe('SHIT')

      const results2 = caseSensitiveIndex.lookup('shit')
      expect(results2[0].word).toBe('shit')
    })

    it('should handle empty queries', () => {
      index.buildIndex(['shit', 'fuck'])

      const results = index.lookup('')
      expect(results).toHaveLength(0)
    })

    it('should handle empty dictionary', () => {
      index.buildIndex([])

      const results = index.lookup('test')
      expect(results).toHaveLength(0)
    })

    it('should ignore null/undefined/empty words in dictionary', () => {
      index.buildIndex(['shit', '', '   ', 'fuck'])

      const stats = index.getStats()
      expect(stats.dictionarySize).toBe(2) // Only 'shit' and 'fuck'
    })
  })

  describe('Edit Distance 2', () => {
    let index: SymSpellIndex

    beforeEach(() => {
      index = new SymSpellIndex({ maxEditDistance: 2 })
    })

    it('should find matches with edit distance 2', () => {
      index.buildIndex(['shit'])

      // Two deletions: "st" (h and i deleted)
      const results1 = index.lookup('st')
      expect(results1.length).toBeGreaterThan(0)
      expect(results1[0].word).toBe('shit')
      expect(results1[0].editDistance).toBe(2)

      // Two substitutions: "sh!!" (!!, replaces it)
      const results2 = index.lookup('sh!!')
      expect(results2.length).toBeGreaterThan(0)
      expect(results2[0].word).toBe('shit')
      expect(results2[0].editDistance).toBe(2)
    })

    it('should respect maxEditDistance parameter in lookup', () => {
      index.buildIndex(['shit'])

      // Query with edit distance 2, but search with max=1
      const results = index.lookup('st', 1)
      // Should not find match (edit distance 2 > max 1)
      const hasShit = results.some(r => r.word === 'shit' && r.editDistance <= 1)
      expect(hasShit).toBe(false)
    })
  })

  describe('Real-World Profanity Obfuscation', () => {
    let index: SymSpellIndex

    beforeEach(() => {
      index = new SymSpellIndex({ maxEditDistance: 2 })
      index.buildIndex([
        'shit', 'fuck', 'damn', 'hell', 'bitch',
        'ass', 'bastard', 'crap', 'piss'
      ])
    })

    it('should detect leetspeak obfuscations', () => {
      // These would be normalized by character mapping before SymSpell
      // But testing with direct substitutions
      const results1 = index.lookup('fvck') // v→u substitution
      expect(results1.some(r => r.word === 'fuck')).toBe(true)

      const results2 = index.lookup('dmn') // a deleted
      expect(results2.some(r => r.word === 'damn')).toBe(true)

      const results3 = index.lookup('btch') // i deleted
      expect(results3.some(r => r.word === 'bitch')).toBe(true)
    })

    it('should handle multiple matches', () => {
      index.buildIndex(['ass', 'lass', 'mass', 'pass'])

      const results = index.lookup('as', 1)
      // Should find 'ass' (edit distance 1 - one deletion)
      expect(results.some(r => r.word === 'ass')).toBe(true)
    })

    it('should sort results by edit distance', () => {
      const results = index.lookup('shit')

      // Exact match should be first
      expect(results[0].word).toBe('shit')
      expect(results[0].editDistance).toBe(0)

      // If there are other matches, they should have higher edit distance
      for (let i = 1; i < results.length; i++) {
        expect(results[i].editDistance).toBeGreaterThanOrEqual(results[i - 1].editDistance)
      }
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large dictionaries efficiently', () => {
      const index = new SymSpellIndex({ maxEditDistance: 1 })

      // Generate 1000 test words
      const words = Array.from({ length: 1000 }, (_, i) => `word${i}`)

      const buildStart = Date.now()
      index.buildIndex(words)
      const buildTime = Date.now() - buildStart

      // Build should be fast (under 1 second)
      expect(buildTime).toBeLessThan(1000)

      // Lookup should be very fast
      const lookupStart = Date.now()
      index.lookup('word500')
      const lookupTime = Date.now() - lookupStart

      expect(lookupTime).toBeLessThan(50)
    })

    it('should provide accurate statistics', () => {
      const index = new SymSpellIndex({ maxEditDistance: 1 })
      index.buildIndex(['shit', 'fuck', 'damn'])

      const stats = index.getStats()

      expect(stats.dictionarySize).toBe(3)
      expect(stats.deleteVariants).toBeGreaterThan(3) // Should have many variants
      expect(stats.avgVariantsPerWord).toBeGreaterThan(1)
      expect(stats.memoryEstimateMB).toBeGreaterThan(0)
    })

    it('should clear index to free memory', () => {
      const index = new SymSpellIndex({ maxEditDistance: 1 })
      index.buildIndex(['shit', 'fuck', 'damn'])

      expect(index.getStats().dictionarySize).toBe(3)

      index.clear()

      expect(index.getStats().dictionarySize).toBe(0)
      expect(index.getStats().deleteVariants).toBe(0)

      const results = index.lookup('shit')
      expect(results).toHaveLength(0)
    })
  })

  describe('Prefix Optimization', () => {
    it('should use prefix length to reduce memory', () => {
      const fullIndex = new SymSpellIndex({ maxEditDistance: 1 })
      const prefixIndex = new SymSpellIndex({
        maxEditDistance: 1,
        prefixLength: 5
      })

      const words = [
        'verylongwordone',
        'verylongwordtwo',
        'verylongwordthree'
      ]

      fullIndex.buildIndex(words)
      prefixIndex.buildIndex(words)

      const fullStats = fullIndex.getStats()
      const prefixStats = prefixIndex.getStats()

      // Prefix index should have fewer or equal delete variants (memory optimization)
      expect(prefixStats.deleteVariants).toBeLessThanOrEqual(fullStats.deleteVariants)

      // Should still find matches when querying with short forms
      const results = prefixIndex.lookup('verylongwordone')
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].word).toBe('verylongwordone')
    })
  })

  describe('Edge Cases', () => {
    let index: SymSpellIndex

    beforeEach(() => {
      index = new SymSpellIndex({ maxEditDistance: 1 })
    })

    it('should handle single character words', () => {
      index.buildIndex(['a', 'i'])

      const results = index.lookup('a')
      // Should find 'a' with edit distance 0
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].word).toBe('a')
      expect(results[0].editDistance).toBe(0)
    })

    it('should handle very short queries', () => {
      index.buildIndex(['shit', 'fuck'])

      const results = index.lookup('s')
      // May or may not find matches depending on edit distance
      expect(results).toBeDefined()
    })

    it('should handle special characters', () => {
      index.buildIndex(['sh!t', 'f*ck'])

      const results1 = index.lookup('sh!t')
      expect(results1[0].word).toBe('sh!t')

      const results2 = index.lookup('f*ck')
      expect(results2[0].word).toBe('f*ck')
    })

    it('should handle numbers', () => {
      index.buildIndex(['5hit', 'fuk1'])

      const results1 = index.lookup('5hit')
      expect(results1[0].word).toBe('5hit')
    })

    it('should handle unicode characters', () => {
      index.buildIndex(['café', 'naïve'])

      const results = index.lookup('café')
      expect(results[0].word).toBe('café')
    })
  })
})
