/**
 * Enhanced performance benchmarks with new optimization features
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { ProfanityTrie } from '../../src/core/trie.js'
import { SeverityLevel, ProfanityCategory, type LanguageCode } from '../../src/types/index.js'

describe('Enhanced Performance Benchmarks', () => {
  let detector: NaughtyWordsDetector
  let trie: ProfanityTrie

  // Performance targets with new optimizations
  const PERFORMANCE_TARGETS = {
    // Core performance targets
    WORDS_PER_SECOND: 1000,
    BATCH_PROCESSING_MULTIPLIER: 3, // Should be 3x faster than individual processing

    // Cache performance
    CACHE_HIT_RATIO_MIN: 0.8, // Should achieve 80%+ cache hit ratio
    CACHE_LOOKUP_MS: 1, // Cache lookups should be under 1ms

    // Memory efficiency
    MAX_MEMORY_GROWTH_FACTOR: 2, // Memory shouldn't grow more than 2x base size

    // Optimization features
    TRIE_CACHED_SEARCH_MS: 10, // Cached trie searches
    BATCH_ANALYSIS_IMPROVEMENT: 2, // Batch analysis should be 2x+ faster
    LAZY_LOADING_OVERHEAD_MS: 50, // Lazy loading overhead

    // Worker thread performance (for large texts)
    WORKER_THREAD_THRESHOLD: 10000, // Characters that trigger worker threads
    WORKER_THREAD_IMPROVEMENT: 1.5, // Should be 1.5x+ faster for large texts
  }

  beforeAll(async () => {
    detector = new NaughtyWordsDetector({
      languages: ['en'],
      fuzzyMatching: true,
      normalizeText: true
    })

    trie = new ProfanityTrie()

    // Add test data
    const testWords = generateTestWords(1000)
    for (const word of testWords) {
      trie.insert(word, {
        word,
        severity: SeverityLevel.MEDIUM,
        categories: [ProfanityCategory.PROFANITY],
        language: 'en'
      })
    }
  })

  afterAll(() => {
    // Cleanup
    detector?.clearCaches()
    trie?.clearCache()
  })

  describe('Cache Performance', () => {
    it('should achieve target cache hit ratio', async () => {
      const testTexts = [
        'This is a test message',
        'Another test message',
        'This is a test message', // Repeat for cache hit
        'Final test message',
        'This is a test message', // Another repeat
      ]

      // Clear cache first
      trie.clearCache()

      // Process texts multiple times
      for (let i = 0; i < 3; i++) {
        for (const text of testTexts) {
          trie.cachedSearch(text)
        }
      }

      const cacheStats = trie.getCacheStats()
      expect(cacheStats.hitRate).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.CACHE_HIT_RATIO_MIN)
    })

    it('should have fast cache lookups', async () => {
      const testText = 'Cached test message'

      // Prime the cache
      trie.cachedSearch(testText)

      // Measure cache lookup time
      const start = performance.now()
      trie.cachedSearch(testText)
      const end = performance.now()

      const lookupTime = end - start
      expect(lookupTime).toBeLessThan(PERFORMANCE_TARGETS.CACHE_LOOKUP_MS)
    })

    it('should provide cache performance statistics', () => {
      const stats = trie.getCacheStats()

      expect(stats).toHaveProperty('hits')
      expect(stats).toHaveProperty('misses')
      expect(stats).toHaveProperty('hitRate')
      expect(stats).toHaveProperty('size')

      expect(typeof stats.hits).toBe('number')
      expect(typeof stats.misses).toBe('number')
      expect(typeof stats.hitRate).toBe('number')
      expect(typeof stats.size).toBe('number')
    })
  })

  describe('Batch Processing Performance', () => {
    it('should outperform individual processing', async () => {
      const testTexts = generateTestTexts(100)

      // Measure individual processing
      const individualStart = performance.now()
      for (const text of testTexts) {
        await detector.analyze(text)
      }
      const individualTime = performance.now() - individualStart

      // Clear caches for fair comparison
      detector.clearCaches()

      // Measure batch processing
      const batchStart = performance.now()
      await detector.batchAnalyze(testTexts)
      const batchTime = performance.now() - batchStart

      const improvement = individualTime / batchTime
      expect(improvement).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.BATCH_ANALYSIS_IMPROVEMENT)
    })

    it('should handle large batch sizes efficiently', async () => {
      const largeBatch = generateTestTexts(500)

      const start = performance.now()
      const results = await detector.batchAnalyze(largeBatch)
      const end = performance.now()

      const processingTime = end - start
      const textsPerSecond = (largeBatch.length / processingTime) * 1000

      expect(results).toHaveLength(largeBatch.length)
      expect(textsPerSecond).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.WORDS_PER_SECOND)
    })

    it('should support streaming batch processing', async () => {
      const testTexts = generateTestTexts(200)
      const results = []

      const start = performance.now()
      for await (const result of detector.batchAnalyzeStream(testTexts)) {
        results.push(result)
      }
      const end = performance.now()

      const processingTime = end - start
      const textsPerSecond = (testTexts.length / processingTime) * 1000

      expect(results).toHaveLength(testTexts.length)
      expect(textsPerSecond).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.WORDS_PER_SECOND)
    })
  })

  describe('Memory Efficiency', () => {
    it('should not have excessive memory growth', async () => {
      // Measure baseline memory
      const initialStats = trie.getStats()
      const baselineMemory = initialStats.memoryUsage

      // Process many texts
      const manyTexts = generateTestTexts(1000)
      await detector.batchAnalyze(manyTexts)

      // Measure memory after processing
      const finalStats = trie.getStats()
      const finalMemory = finalStats.memoryUsage

      const memoryGrowth = finalMemory / baselineMemory
      expect(memoryGrowth).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_MEMORY_GROWTH_FACTOR)
    })

    it('should support memory optimization', () => {
      // Get initial cache size
      const initialStats = detector.getPerformanceStats()
      const initialCacheSize = initialStats.analysisCacheSize

      // Fill cache
      const testTexts = generateTestTexts(100)
      testTexts.forEach(text => detector.analyze(text))

      // Optimize memory
      detector.optimizeMemory()

      // Check that cache was cleared
      const finalStats = detector.getPerformanceStats()
      expect(finalStats.analysisCacheSize).toBeLessThan(initialCacheSize)
    })
  })

  describe('Early Termination Performance', () => {
    it('should terminate early when max matches reached', () => {
      const longText = generateLongTextWithProfanity(10000)
      const maxMatches = 5

      const start = performance.now()
      const results = trie.searchWithEarlyTermination(longText, maxMatches)
      const end = performance.now()

      const processingTime = end - start

      expect(results.length).toBeLessThanOrEqual(maxMatches)
      expect(processingTime).toBeLessThan(100) // Should be very fast due to early termination
    })
  })

  describe('Lazy Loading Performance', () => {
    it('should have minimal lazy loading overhead', async () => {
      const languages: LanguageCode[] = ['en', 'es', 'fr']

      const start = performance.now()
      for (const lang of languages) {
        await detector.ensureLanguageLoaded(lang)
      }
      const end = performance.now()

      const loadingTime = end - start
      expect(loadingTime).toBeLessThan(PERFORMANCE_TARGETS.LAZY_LOADING_OVERHEAD_MS)
    })
  })

  describe('Worker Thread Performance', () => {
    it('should use worker threads for large texts', async () => {
      const largeText = generateLongText(15000) // Above worker thread threshold

      const start = performance.now()
      const result = await detector.analyzeWithWorkers(largeText)
      const end = performance.now()

      const workerTime = end - start

      // Compare with regular analysis
      const regularStart = performance.now()
      await detector.analyze(largeText)
      const regularEnd = performance.now()

      const regularTime = regularEnd - regularStart
      const improvement = regularTime / workerTime

      expect(result).toBeDefined()
      expect(improvement).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.WORKER_THREAD_IMPROVEMENT)
    })

    it('should fall back to main thread for small texts', async () => {
      const smallText = generateLongText(5000) // Below worker thread threshold

      const result = await detector.analyzeWithWorkers(smallText)
      expect(result).toBeDefined()
    })
  })

  describe('Cache Warming', () => {
    it('should warm up caches effectively', async () => {
      const commonTexts = [
        'Hello world',
        'How are you?',
        'Good morning',
        'Thank you',
        'See you later'
      ]

      // Clear caches
      detector.clearCaches()
      trie.clearCache()

      // Warm up caches
      await detector.warmUpCaches(commonTexts)
      trie.warmUpCache(commonTexts)

      // Check that caches have entries
      const detectorStats = detector.getPerformanceStats()
      const trieStats = trie.getCacheStats()

      expect(detectorStats.analysisCacheSize).toBeGreaterThan(0)
      expect(trieStats.size).toBeGreaterThan(0)
    })
  })

  describe('Performance Monitoring', () => {
    it('should provide comprehensive performance statistics', () => {
      const stats = detector.getPerformanceStats()

      expect(stats).toHaveProperty('analysisCacheHits')
      expect(stats).toHaveProperty('analysisCacheMisses')
      expect(stats).toHaveProperty('analysisCacheHitRate')
      expect(stats).toHaveProperty('analysisCacheSize')
      expect(stats).toHaveProperty('lazyLoadedLanguages')

      // All stats should be numbers
      Object.values(stats).forEach(value => {
        expect(typeof value).toBe('number')
      })
    })

    it('should track cache hit rates accurately', async () => {
      const testText = 'Performance monitoring test'

      // Clear caches for clean test
      detector.clearCaches()

      // First access - should be cache miss
      await detector.analyzeCached(testText)
      let stats = detector.getPerformanceStats()
      expect(stats.analysisCacheMisses).toBeGreaterThan(0)

      // Second access - should be cache hit
      await detector.analyzeCached(testText)
      stats = detector.getPerformanceStats()
      expect(stats.analysisCacheHits).toBeGreaterThan(0)
      expect(stats.analysisCacheHitRate).toBeGreaterThan(0)
    })
  })

  describe('Stress Testing', () => {
    it('should handle concurrent processing', async () => {
      const testTexts = generateTestTexts(50)

      // Process multiple texts concurrently
      const start = performance.now()
      const promises = testTexts.map(text => detector.analyzeCached(text))
      const results = await Promise.all(promises)
      const end = performance.now()

      const processingTime = end - start
      const textsPerSecond = (testTexts.length / processingTime) * 1000

      expect(results).toHaveLength(testTexts.length)
      expect(textsPerSecond).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.WORDS_PER_SECOND)
    })

    it('should maintain performance under repeated use', async () => {
      const testText = 'Stress test message'
      const iterations = 1000

      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = performance.now()
        await detector.analyzeCached(testText)
        const end = performance.now()
        times.push(end - start)
      }

      // Check that performance didn't degrade significantly
      const firstQuarter = times.slice(0, iterations / 4)
      const lastQuarter = times.slice(-iterations / 4)

      const avgFirst = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length
      const avgLast = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length

      const degradation = avgLast / avgFirst
      expect(degradation).toBeLessThan(2) // Performance shouldn't degrade more than 2x
    })
  })
})

// Helper functions
function generateTestWords(count: number): string[] {
  const words = []
  for (let i = 0; i < count; i++) {
    words.push(`testword${i}`)
  }
  return words
}

function generateTestTexts(count: number): string[] {
  const texts = []
  for (let i = 0; i < count; i++) {
    texts.push(`This is test message number ${i} with some content.`)
  }
  return texts
}

function generateLongText(length: number): string {
  const words = ['hello', 'world', 'test', 'message', 'performance', 'benchmark']
  let text = ''
  while (text.length < length) {
    text += words[Math.floor(Math.random() * words.length)] + ' '
  }
  return text.slice(0, length)
}

function generateLongTextWithProfanity(length: number): string {
  const words = ['hello', 'world', 'test', 'badword', 'message', 'performance', 'anotherbadword', 'benchmark']
  let text = ''
  while (text.length < length) {
    text += words[Math.floor(Math.random() * words.length)] + ' '
  }
  return text.slice(0, length)
}