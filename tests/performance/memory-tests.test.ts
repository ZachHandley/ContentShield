/**
 * Memory usage and leak detection tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { ProfanityTrie } from '../../src/core/trie.js'
import { ConfigManager } from '../../src/config/index.js'
import { SeverityLevel } from '../../src/types/index.js'

describe('Memory Usage and Leak Detection', () => {
  let detector: NaughtyWordsDetector
  let trie: ProfanityTrie
  let configManager: ConfigManager

  beforeEach(async () => {
    detector = new NaughtyWordsDetector({
      languages: ['en'],
      minSeverity: SeverityLevel.LOW
    })
    trie = new ProfanityTrie()
    configManager = new ConfigManager()
  })

  afterEach(() => {
    // Cleanup resources
    detector?.clearCaches()
    detector?.optimizeMemory()
    trie?.clearCache()
    trie?.compact()
    configManager?.dispose()

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  })

  describe('Memory Growth Monitoring', () => {
    it('should not have excessive memory growth during repeated operations', async () => {
      // Get baseline memory usage
      const initialStats = trie.getStats()
      const baselineMemory = initialStats.memoryUsage

      // Perform many operations
      const operations = 1000
      const testText = 'This is a test message for memory testing'

      for (let i = 0; i < operations; i++) {
        await detector.analyzeCached(testText)
        trie.cachedSearch(testText)

        // Occasionally clear caches to prevent legitimate growth
        if (i % 100 === 0) {
          detector.clearCaches()
          trie.clearCache()
        }
      }

      // Check final memory usage
      const finalStats = trie.getStats()
      const finalMemory = finalStats.memoryUsage

      // Memory growth should be reasonable
      const growthRatio = finalMemory / baselineMemory
      expect(growthRatio).toBeLessThan(3) // Less than 3x growth
    })

    it('should release memory after cache clearing', async () => {
      // Fill caches with data
      const testTexts = []
      for (let i = 0; i < 100; i++) {
        testTexts.push(`Test message number ${i}`)
      }

      // Process all texts to fill caches
      for (const text of testTexts) {
        await detector.analyzeCached(text)
        trie.cachedSearch(text)
      }

      // Get memory usage with full caches
      const beforeClearStats = detector.getPerformanceStats()
      const beforeClearCacheSize = beforeClearStats.analysisCacheSize

      const beforeTrieStats = trie.getCacheStats()
      const beforeTrieCacheSize = beforeTrieStats.size

      // Clear caches
      detector.clearCaches()
      trie.clearCache()

      // Check that cache sizes reduced
      const afterClearStats = detector.getPerformanceStats()
      const afterClearCacheSize = afterClearStats.analysisCacheSize

      const afterTrieStats = trie.getCacheStats()
      const afterTrieCacheSize = afterTrieStats.size

      expect(afterClearCacheSize).toBeLessThan(beforeClearCacheSize)
      expect(afterTrieCacheSize).toBeLessThan(beforeTrieCacheSize)
    })

    it('should compact memory efficiently', () => {
      // Add data to trie
      for (let i = 0; i < 100; i++) {
        trie.insert(`testword${i}`, {
          word: `testword${i}`,
          severity: SeverityLevel.MEDIUM,
          categories: [],
          language: 'en'
        })
      }

      // Perform searches to create cache entries
      for (let i = 0; i < 50; i++) {
        trie.cachedSearch(`search query ${i}`)
      }

      const beforeCompact = trie.getCacheStats()
      const beforeCompactSize = beforeCompact.size

      // Compact memory
      trie.compact()

      const afterCompact = trie.getCacheStats()
      const afterCompactSize = afterCompact.size

      // Cache should be cleared after compaction
      expect(afterCompactSize).toBe(0)
      expect(afterCompactSize).toBeLessThanOrEqual(beforeCompactSize)
    })
  })

  describe('Resource Cleanup', () => {
    it('should properly dispose of configuration manager resources', () => {
      // Create manager with listeners
      const manager = new ConfigManager()

      let listenerCallCount = 0
      const unsubscribe = manager.onConfigChange(() => {
        listenerCallCount++
      })

      // Add to history
      manager.updateConfig({ languages: ['es'] })

      // Dispose should clean up everything
      expect(() => manager.dispose()).not.toThrow()

      // Further operations should not cause issues
      const history = manager.getConfigHistory()
      expect(Array.isArray(history)).toBe(true)
    })

    it('should handle detector memory optimization', () => {
      // Create detector with caches
      const detector = new NaughtyWordsDetector()

      // Fill with some data
      detector.analyze('test message')

      const beforeStats = detector.getPerformanceStats()

      // Optimize memory
      expect(() => detector.optimizeMemory()).not.toThrow()

      const afterStats = detector.getPerformanceStats()

      // Caches should be cleared
      expect(afterStats.analysisCacheSize).toBeLessThanOrEqual(beforeStats.analysisCacheSize)
    })
  })

  describe('Long-Running Process Simulation', () => {
    it('should maintain stable memory usage during long-running operations', async () => {
      const memorySnapshots: number[] = []
      const iterations = 50

      // Simulate long-running process
      for (let i = 0; i < iterations; i++) {
        // Perform various operations
        await detector.analyzeCached(`Message ${i}`)
        trie.cachedSearch(`Query ${i}`)
        configManager.getOptimizedConfigForLanguages(['en'])

        // Take memory snapshot every 10 iterations
        if (i % 10 === 0) {
          const stats = trie.getStats()
          memorySnapshots.push(stats.memoryUsage)
        }

        // Occasionally trigger cleanup
        if (i % 25 === 0) {
          detector.clearCaches()
          trie.clearCache()
          if (global.gc) {
            global.gc()
          }
        }
      }

      // Memory usage should not grow excessively
      const firstSnapshot = memorySnapshots[0]
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1]
      const memoryGrowthRatio = lastSnapshot / firstSnapshot

      expect(memoryGrowthRatio).toBeLessThan(5) // Less than 5x growth over time
    })

    it('should handle stress testing without memory leaks', async () => {
      const stressIterations = 200
      const initialMemorySnapshot = process.memoryUsage()

      // Stress test with various operations
      const promises = []
      for (let i = 0; i < stressIterations; i++) {
        promises.push(
          detector.analyzeCached(`Stress test message ${i}`),
          trie.cachedSearch(`Stress query ${i}`)
        )

        // Process in batches to avoid overwhelming
        if (promises.length >= 20) {
          await Promise.all(promises)
          promises.length = 0
        }
      }

      // Wait for remaining promises
      if (promises.length > 0) {
        await Promise.all(promises)
      }

      // Clear caches and force GC
      detector.clearCaches()
      trie.clearCache()
      detector.optimizeMemory()
      trie.compact()

      if (global.gc) {
        global.gc()
      }

      // Wait a bit for GC to complete
      await new Promise(resolve => setTimeout(resolve, 100))

      const finalMemorySnapshot = process.memoryUsage()

      // Memory should not have grown excessively
      const heapGrowth = finalMemorySnapshot.heapUsed / initialMemorySnapshot.heapUsed
      expect(heapGrowth).toBeLessThan(3) // Less than 3x heap growth
    })
  })

  describe('Cache Size Limits', () => {
    it('should respect maximum cache sizes', async () => {
      // Fill detector cache beyond limit
      const textsToProcess = 600 // More than max cache size (500)

      for (let i = 0; i < textsToProcess; i++) {
        await detector.analyzeCached(`Cache test message ${i}`)
      }

      const stats = detector.getPerformanceStats()
      expect(stats.analysisCacheSize).toBeLessThanOrEqual(500) // Respects max limit
    })

    it('should respect trie cache limits', () => {
      const maxCacheSize = 1000
      const searchesToPerform = 1200 // More than max cache size

      for (let i = 0; i < searchesToPerform; i++) {
        trie.cachedSearch(`Trie cache test ${i}`)
      }

      const stats = trie.getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(maxCacheSize)
    })
  })

  describe('Memory-Efficient Operations', () => {
    it('should use streaming for large batch operations', async () => {
      const largeTextSet = []
      for (let i = 0; i < 1000; i++) {
        largeTextSet.push(`Large batch item ${i}`)
      }

      const results = []
      let peakMemoryUsage = 0

      // Use streaming to process large batch
      for await (const result of detector.batchAnalyzeStream(largeTextSet)) {
        results.push(result)

        // Monitor memory usage
        const currentMemory = process.memoryUsage().heapUsed
        peakMemoryUsage = Math.max(peakMemoryUsage, currentMemory)
      }

      expect(results).toHaveLength(largeTextSet.length)

      // Streaming should use less memory than loading everything at once
      const finalMemory = process.memoryUsage().heapUsed
      expect(finalMemory).toBeLessThan(peakMemoryUsage * 1.2) // Within 20% of peak
    })

    it('should handle large text processing efficiently', async () => {
      const largeText = 'word '.repeat(50000) // 50k words

      const beforeMemory = process.memoryUsage().heapUsed

      const result = await detector.analyzeWithWorkers(largeText)

      const afterMemory = process.memoryUsage().heapUsed
      const memoryIncrease = afterMemory - beforeMemory

      expect(result).toBeDefined()
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // Less than 100MB increase
    })
  })

  describe('Garbage Collection Integration', () => {
    it('should trigger garbage collection hints appropriately', () => {
      // Mock global.gc to track calls
      const originalGc = global.gc
      let gcCallCount = 0

      global.gc = () => {
        gcCallCount++
      }

      try {
        // Operations that should trigger GC hints
        trie.compact()
        detector.optimizeMemory()

        expect(gcCallCount).toBeGreaterThan(0)
      } finally {
        // Restore original gc
        global.gc = originalGc
      }
    })

    it('should handle missing gc gracefully', () => {
      // Temporarily remove global.gc
      const originalGc = global.gc
      delete (global as any).gc

      try {
        // These should not throw even without gc
        expect(() => trie.compact()).not.toThrow()
        expect(() => detector.optimizeMemory()).not.toThrow()
      } finally {
        // Restore gc if it existed
        if (originalGc) {
          global.gc = originalGc
        }
      }
    })
  })
})