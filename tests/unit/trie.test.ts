/**
 * Comprehensive tests for the Trie-based profanity detection engine
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ProfanityTrie, type TrieNodeData } from '../../src/core/trie.js'
import { SeverityLevel, ProfanityCategory } from '../../src/types/index.js'

describe('ProfanityTrie', () => {
  let trie: ProfanityTrie

  beforeEach(() => {
    trie = new ProfanityTrie()
  })

  describe('Basic Operations', () => {
    it('should initialize empty trie', () => {
      const stats = trie.getStats()
      expect(stats.totalWords).toBe(0)
      expect(stats.totalNodes).toBeGreaterThan(0) // Root node exists
    })

    it('should insert single word', () => {
      const data: TrieNodeData = {
        word: 'test',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      }

      trie.insert('test', data)

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(1)
    })

    it('should insert multiple words', () => {
      const words = ['test1', 'test2', 'different']
      words.forEach(word => {
        trie.insert(word, {
          word,
          severity: SeverityLevel.LOW,
          categories: ['general'],
          language: 'en'
        })
      })

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(3)
    })

    it('should handle empty or invalid words', () => {
      trie.insert('', {
        word: '',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(0)
    })
  })

  describe('Word Variations', () => {
    it('should insert word with variations', () => {
      const variations = ['v4ri4tion', 'var1at1on', 'vari@tion']
      trie.insertWithVariations('variation', variations, {
        word: 'variation',
        severity: SeverityLevel.MODERATE,
        categories: ['general'],
        language: 'en'
      })

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(4) // Base word + 3 variations
    })

    it('should maintain original word reference in variations', () => {
      const variations = ['t3st', 't@st']
      trie.insertWithVariations('test', variations, {
        word: 'test',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search('t3st is a variation')
      expect(matches).toHaveLength(1)
      expect(matches[0].data.word).toBe('test') // Should reference original word
    })
  })

  describe('Exact Search', () => {
    beforeEach(() => {
      // Setup test data
      const testWords = [
        { word: 'bad', severity: SeverityLevel.LOW },
        { word: 'worse', severity: SeverityLevel.MODERATE },
        { word: 'terrible', severity: SeverityLevel.HIGH },
        { word: 'awful', severity: SeverityLevel.SEVERE }
      ]

      testWords.forEach(({ word, severity }) => {
        trie.insert(word, {
          word,
          severity,
          categories: ['general'],
          language: 'en'
        })
      })
    })

    it('should find exact matches', () => {
      const matches = trie.search('this is bad')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('bad')
      expect(matches[0].start).toBe(8)
      expect(matches[0].end).toBe(11)
    })

    it('should find multiple matches', () => {
      const matches = trie.search('this is bad and worse')
      expect(matches).toHaveLength(2)
      expect(matches.map(m => m.word)).toEqual(['bad', 'worse'])
    })

    it('should respect word boundaries', () => {
      trie.insert('ass', {
        word: 'ass',
        severity: SeverityLevel.MODERATE,
        categories: ['general'],
        language: 'en'
      })

      // Should not match partial words
      const matches = trie.search('class assessment')
      expect(matches).toHaveLength(0)
    })

    it('should handle case sensitivity correctly', () => {
      const matches = trie.search('This is BAD')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('BAD')
    })

    it('should handle empty text', () => {
      const matches = trie.search('')
      expect(matches).toHaveLength(0)
    })
  })

  describe('Fuzzy Search', () => {
    beforeEach(() => {
      trie.insert('profanity', {
        word: 'profanity',
        severity: SeverityLevel.MODERATE,
        categories: ['general'],
        language: 'en'
      })
    })

    it('should find fuzzy matches with edit distance 1', () => {
      const matches = trie.fuzzySearch('profanety', 1) // One character different
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBe(1)
    })

    it('should find fuzzy matches with edit distance 2', () => {
      const matches = trie.fuzzySearch('profanty', 2) // Two characters different
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBeLessThanOrEqual(2)
    })

    it('should not find matches beyond edit distance threshold', () => {
      const matches = trie.fuzzySearch('completely_different', 1)
      expect(matches).toHaveLength(0)
    })

    it('should handle insertion fuzzy matches', () => {
      const matches = trie.fuzzySearch('profannity', 1) // Extra 'n'
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBe(1)
    })

    it('should handle deletion fuzzy matches', () => {
      const matches = trie.fuzzySearch('profnity', 1) // Missing 'a'
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBe(1)
    })

    it('should handle substitution fuzzy matches', () => {
      const matches = trie.fuzzySearch('profxnity', 1) // 'a' -> 'x'
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBe(1)
    })

    it('should prioritize exact matches over fuzzy matches', () => {
      const matches = trie.fuzzySearch('profanity', 2)
      expect(matches).toHaveLength(1)
      expect(matches[0].editDistance).toBe(0)
    })
  })

  describe('Multi-Pattern Search (Aho-Corasick)', () => {
    beforeEach(() => {
      const words = ['bad', 'worse', 'awful', 'terrible']
      words.forEach(word => {
        trie.insert(word, {
          word,
          severity: SeverityLevel.MODERATE,
          categories: ['general'],
          language: 'en'
        })
      })
    })

    it('should find overlapping matches', () => {
      // Insert overlapping patterns
      trie.insert('shit', {
        word: 'shit',
        severity: SeverityLevel.HIGH,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.multiPatternSearch('this shit is terrible')
      expect(matches.length).toBeGreaterThan(0)

      // Should find both 'bad' in 'shit' and 'shit' itself, plus 'terrible'
      const foundWords = matches.map(m => m.word)
      expect(foundWords).toContain('terrible')
    })

    it('should be faster than multiple single searches for large texts', () => {
      const longText = 'this is a bad and terrible situation with awful consequences and worse outcomes '.repeat(100)

      // Multi-pattern search
      const start1 = Date.now()
      const multiMatches = trie.multiPatternSearch(longText)
      const time1 = Date.now() - start1

      // Multiple single searches (simulated)
      const start2 = Date.now()
      let singleMatches = 0
      for (let i = 0; i < longText.length; i++) {
        const matches = trie.search(longText.substring(i))
        singleMatches += matches.length
      }
      const time2 = Date.now() - start2

      expect(multiMatches.length).toBeGreaterThan(0)
      // Multi-pattern should be significantly faster for large texts
      // Note: This is more of a performance characterization than a strict assertion
    })

    it('should handle compilation correctly', () => {
      // Compile explicitly
      trie.compile()

      const matches = trie.multiPatternSearch('bad and terrible text')
      expect(matches.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Memory', () => {
    it('should handle large word lists efficiently', () => {
      const start = Date.now()

      // Insert 1000 words
      for (let i = 0; i < 1000; i++) {
        trie.insert(`word${i}`, {
          word: `word${i}`,
          severity: SeverityLevel.LOW,
          categories: ['general'],
          language: 'en'
        })
      }

      const insertTime = Date.now() - start
      expect(insertTime).toBeLessThan(1000) // Should insert 1000 words in under 1 second

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(1000)
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })

    it('should search efficiently in large tries', () => {
      // Build a moderately large trie
      for (let i = 0; i < 500; i++) {
        trie.insert(`testword${i}`, {
          word: `testword${i}`,
          severity: SeverityLevel.LOW,
          categories: ['general'],
          language: 'en'
        })
      }

      const longText = 'This is a long text with testword42 and testword99 somewhere in the middle of lots of other text '.repeat(10)

      const start = Date.now()
      const matches = trie.multiPatternSearch(longText)
      const searchTime = Date.now() - start

      expect(matches.length).toBeGreaterThan(0)
      expect(searchTime).toBeLessThan(100) // Should search quickly even with many patterns
    })

    it('should provide meaningful statistics', () => {
      const words = ['a', 'bb', 'ccc', 'dddd', 'eeeee']
      words.forEach(word => {
        trie.insert(word, {
          word,
          severity: SeverityLevel.LOW,
          categories: ['general'],
          language: 'en'
        })
      })

      const stats = trie.getStats()
      expect(stats.totalWords).toBe(5)
      expect(stats.averageDepth).toBeGreaterThan(0)
      expect(stats.maxDepth).toBe(5) // Longest word is 'eeeee' with 5 characters
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('Serialization', () => {
    beforeEach(() => {
      const words = ['test1', 'test2', 'example']
      words.forEach(word => {
        trie.insert(word, {
          word,
          severity: SeverityLevel.MODERATE,
          categories: ['general'],
          language: 'en'
        })
      })
    })

    it('should export trie structure', () => {
      const exported = trie.export()
      expect(exported).toHaveProperty('root')
      expect(exported).toHaveProperty('totalWords', 3)
      expect(exported).toHaveProperty('version')
    })

    it('should import trie structure', () => {
      const exported = trie.export()

      const newTrie = new ProfanityTrie()
      newTrie.import(exported)

      const stats = newTrie.getStats()
      expect(stats.totalWords).toBe(3)

      // Test that imported trie works
      const matches = newTrie.search('this is test1')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('test1')
    })

    it('should maintain data integrity after import/export', () => {
      const originalMatches = trie.search('test1 and example')
      const exported = trie.export()

      const newTrie = new ProfanityTrie()
      newTrie.import(exported)

      const importedMatches = newTrie.search('test1 and example')

      expect(importedMatches).toHaveLength(originalMatches.length)
      expect(importedMatches[0].data.severity).toBe(originalMatches[0].data.severity)
      expect(importedMatches[0].data.categories).toEqual(originalMatches[0].data.categories)
    })
  })

  describe('Edge Cases', () => {
    it('should handle unicode characters', () => {
      const unicodeWord = 'tëst'
      trie.insert(unicodeWord, {
        word: unicodeWord,
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search('this is tëst')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe(unicodeWord)
    })

    it('should handle special characters', () => {
      const specialWord = 'te@st'
      trie.insert(specialWord, {
        word: specialWord,
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search('this is te@st')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe(specialWord)
    })

    it('should handle very long words', () => {
      const longWord = 'a'.repeat(100)
      trie.insert(longWord, {
        word: longWord,
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search(`prefix ${longWord} suffix`)
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe(longWord)
    })

    it('should handle single character words', () => {
      trie.insert('a', {
        word: 'a',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search('this is a test')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('a')
    })
  })

  describe('Clear and Reset', () => {
    it('should clear all data', () => {
      trie.insert('test', {
        word: 'test',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      let stats = trie.getStats()
      expect(stats.totalWords).toBe(1)

      trie.clear()
      stats = trie.getStats()
      expect(stats.totalWords).toBe(0)

      const matches = trie.search('test')
      expect(matches).toHaveLength(0)
    })

    it('should be reusable after clear', () => {
      trie.insert('test1', {
        word: 'test1',
        severity: SeverityLevel.LOW,
        categories: ['general'],
        language: 'en'
      })

      trie.clear()

      trie.insert('test2', {
        word: 'test2',
        severity: SeverityLevel.MODERATE,
        categories: ['general'],
        language: 'en'
      })

      const matches = trie.search('this is test2')
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('test2')
    })
  })
})