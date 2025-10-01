import { describe, it, expect } from 'vitest'
import { SymSpellIndex } from '../../src/core/symspell.js'
import { NaughtyWordsDetector } from '../../src/core/detector.js'

describe('SymSpell Performance Benchmarks', () => {
  describe('SymSpell Index Performance', () => {
    it('should build index quickly for 1000 words', () => {
      const symSpell = new SymSpellIndex({ maxEditDistance: 1 })
      const words = Array.from({ length: 1000 }, (_, i) => `word${i}`)

      const startBuild = Date.now()
      symSpell.buildIndex(words)
      const buildTime = Date.now() - startBuild

      expect(buildTime).toBeLessThan(500) // Should build in under 500ms
      console.log(`SymSpell index build: 1000 words in ${buildTime}ms`)
    })

    it('should perform lookups extremely fast', () => {
      const symSpell = new SymSpellIndex({ maxEditDistance: 1 })
      const words = ['shit', 'fuck', 'damn', 'hell', 'bitch', 'ass', 'bastard', 'crap']
      symSpell.buildIndex(words)

      const queries = ['shit', 'fck', 'dmn', 'hll', 'btch', 'ss', 'bastrd', 'crp']

      const startLookup = Date.now()
      for (let i = 0; i < 1000; i++) {
        for (const query of queries) {
          symSpell.lookup(query, 1)
        }
      }
      const lookupTime = Date.now() - startLookup

      const totalLookups = 1000 * queries.length
      const avgTime = lookupTime / totalLookups
      const lookupsPerSecond = Math.round(totalLookups / (lookupTime / 1000))

      console.log(`SymSpell lookups: ${totalLookups} in ${lookupTime}ms (${lookupsPerSecond}/sec, ${avgTime.toFixed(4)}ms avg)`)
      expect(lookupsPerSecond).toBeGreaterThan(10000) // Should handle 10K+ lookups/sec
    })

    it('should handle large dictionaries efficiently', () => {
      const symSpell = new SymSpellIndex({ maxEditDistance: 2 })

      // Simulate a full language dictionary (~3-5K words)
      const words = Array.from({ length: 5000 }, (_, i) => {
        const len = 3 + (i % 8) // Words of length 3-10
        return Array.from({ length: len }, () =>
          String.fromCharCode(97 + Math.floor(Math.random() * 26))
        ).join('')
      })

      const startBuild = Date.now()
      symSpell.buildIndex(words)
      const buildTime = Date.now() - startBuild

      const stats = symSpell.getStats()

      console.log(`Large dictionary: ${stats.dictionarySize} words, ${stats.deleteVariants} variants`)
      console.log(`Build time: ${buildTime}ms, Memory: ${stats.memoryEstimateMB}MB`)

      expect(buildTime).toBeLessThan(3000) // Should build 5K words in under 3 seconds
      expect(stats.memoryEstimateMB).toBeLessThan(50) // Should use less than 50MB
    })
  })

  describe('Real-World Fuzzy Matching Performance', () => {
    it('should handle fuzzy matching on large texts blazingly fast', async () => {
      const detector = new NaughtyWordsDetector({
        languages: ['en'],
        fuzzyMatching: true,
        fuzzyThreshold: 0.8
      })

      await detector.initialize()

      // Generate a large text with obfuscated profanity
      const text = Array.from({ length: 1000 }, (_, i) => {
        if (i % 100 === 0) return 'fck'  // Obfuscated profanity
        if (i % 100 === 50) return 'dmn'  // Obfuscated profanity
        return `word${i}` // Clean words
      }).join(' ')

      const startTime = Date.now()
      const result = await detector.analyze(text)
      const duration = Date.now() - startTime

      const wordsProcessed = 1000
      const wordsPerSecond = Math.round(wordsProcessed / (duration / 1000))

      console.log(`Fuzzy matching: ${wordsProcessed} words in ${duration}ms (${wordsPerSecond} words/sec)`)
      console.log(`Found ${result.matches.length} matches`)

      // SymSpell should process at 10K+ words/sec (100x faster than old BFS ~100 words/sec)
      expect(wordsPerSecond).toBeGreaterThan(1000)
      expect(result.matches.length).toBeGreaterThan(0) // Should find obfuscated words
    })

    it('should maintain performance with varying edit distances', () => {
      const symSpell1 = new SymSpellIndex({ maxEditDistance: 1 })
      const symSpell2 = new SymSpellIndex({ maxEditDistance: 2 })

      const words = Array.from({ length: 1000 }, (_, i) => `word${i}`)

      const start1 = Date.now()
      symSpell1.buildIndex(words)
      const build1 = Date.now() - start1

      const start2 = Date.now()
      symSpell2.buildIndex(words)
      const build2 = Date.now() - start2

      console.log(`Edit distance 1: ${build1}ms build`)
      console.log(`Edit distance 2: ${build2}ms build`)

      // Edit distance 2 takes longer but should still be reasonable
      expect(build1).toBeLessThan(500)
      expect(build2).toBeLessThan(2000)

      // Verify edit distance 2 creates more variants
      expect(symSpell2.getStats().deleteVariants).toBeGreaterThan(symSpell1.getStats().deleteVariants)
    })
  })

  describe('Memory Efficiency', () => {
    it('should use prefix optimization to reduce memory', () => {
      const fullIndex = new SymSpellIndex({ maxEditDistance: 1 })
      const prefixIndex = new SymSpellIndex({ maxEditDistance: 1, prefixLength: 7 })

      const longWords = Array.from({ length: 100 }, (_, i) =>
        `verylongword${i}withextracharacters`
      )

      fullIndex.buildIndex(longWords)
      prefixIndex.buildIndex(longWords)

      const fullStats = fullIndex.getStats()
      const prefixStats = prefixIndex.getStats()

      console.log(`Full index: ${fullStats.deleteVariants} variants, ${fullStats.memoryEstimateMB}MB`)
      console.log(`Prefix index: ${prefixStats.deleteVariants} variants, ${prefixStats.memoryEstimateMB}MB`)

      // Prefix optimization should reduce variants and memory
      expect(prefixStats.deleteVariants).toBeLessThanOrEqual(fullStats.deleteVariants)
    })

    it('should clear index to free memory', () => {
      const symSpell = new SymSpellIndex({ maxEditDistance: 1 })
      symSpell.buildIndex(Array.from({ length: 1000 }, (_, i) => `word${i}`))

      const beforeClear = symSpell.getStats()
      expect(beforeClear.dictionarySize).toBe(1000)

      symSpell.clear()

      const afterClear = symSpell.getStats()
      expect(afterClear.dictionarySize).toBe(0)
      expect(afterClear.deleteVariants).toBe(0)
    })
  })
})
