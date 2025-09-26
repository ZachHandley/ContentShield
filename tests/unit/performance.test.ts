/**
 * Performance tests for language detection system
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LanguageDetectionEngine } from '../../src/utils/language-detection.js'
import { TextProcessor } from '../../src/utils/text-processing.js'
import { CharacterMapper, normalizeCharacters } from '../../src/utils/character-mapping.js'

describe('Performance benchmarks', () => {
  let engine: LanguageDetectionEngine
  let processor: TextProcessor
  let mapper: CharacterMapper

  beforeEach(() => {
    engine = new LanguageDetectionEngine({ cacheEnabled: true })
    processor = new TextProcessor()
    mapper = new CharacterMapper()
  })

  describe('Language detection performance', () => {
    it('should detect language quickly for short text', () => {
      const text = 'This is a short test message'
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        engine.detect(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average language detection time: ${avgTime.toFixed(2)}ms`)

      // Should be under 5ms per detection for real-time use
      expect(avgTime).toBeLessThan(5)
    })

    it('should handle medium-length text efficiently', () => {
      const text = 'This is a medium-length test message that contains more words and should still be processed quickly by our language detection system. '.repeat(3)
      const iterations = 500

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        engine.detect(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average medium text detection time: ${avgTime.toFixed(2)}ms`)

      // Should be under 10ms for medium text
      expect(avgTime).toBeLessThan(10)
    })

    it('should handle long text within reasonable time', () => {
      const text = 'This is a long test message with many words that will test the performance of our language detection system under more demanding conditions. '.repeat(10)
      const iterations = 100

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        engine.detect(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average long text detection time: ${avgTime.toFixed(2)}ms`)

      // Should be under 25ms for long text
      expect(avgTime).toBeLessThan(25)
    })

    it('should benefit significantly from caching', () => {
      const text = 'This cached message should be faster on repeat detections'

      // First detection (cold cache)
      const start1 = performance.now()
      engine.detect(text)
      const end1 = performance.now()
      const coldTime = end1 - start1

      // Multiple cached detections
      const iterations = 100
      const start2 = performance.now()
      for (let i = 0; i < iterations; i++) {
        engine.detect(text)
      }
      const end2 = performance.now()
      const avgCachedTime = (end2 - start2) / iterations

      console.log(`Cold detection time: ${coldTime.toFixed(2)}ms`)
      console.log(`Average cached detection time: ${avgCachedTime.toFixed(2)}ms`)

      // Cached should be at least 50% faster
      expect(avgCachedTime).toBeLessThan(coldTime * 0.5)
    })
  })

  describe('Text processing performance', () => {
    it('should process text quickly', () => {
      const text = 'This is a test message with various characters: café, naïve, résumé! 123 @#$'
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        processor.process(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average text processing time: ${avgTime.toFixed(2)}ms`)

      // Should be under 2ms per processing
      expect(avgTime).toBeLessThan(2)
    })

    it('should handle Unicode normalization efficiently', () => {
      const text = 'Café naïve résumé piñata São Paulo Müller Größe'
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        processor.process(text, {
          unicodeNormalization: true,
          removeDiacritics: true
        })
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average Unicode processing time: ${avgTime.toFixed(2)}ms`)

      // Should be under 3ms per processing
      expect(avgTime).toBeLessThan(3)
    })

    it('should process RTL text efficiently', () => {
      const text = 'مرحبا بالعالم هذه رسالة اختبار'
      const iterations = 500

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        processor.process(text, {
          language: 'ar',
          handleRTL: true
        })
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average RTL processing time: ${avgTime.toFixed(2)}ms`)

      // Should be under 5ms per processing
      expect(avgTime).toBeLessThan(5)
    })
  })

  describe('Character mapping performance', () => {
    it('should normalize characters quickly', () => {
      const text = 'h3ll0 w0rld t3st'
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        mapper.normalizeLeetspeak(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average leetspeak normalization time: ${avgTime.toFixed(2)}ms`)

      // Should be under 1ms per normalization
      expect(avgTime).toBeLessThan(1)
    })

    it('should handle homograph normalization efficiently', () => {
      const text = 'hеllo wоrld tеst' // Contains Cyrillic characters
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        mapper.normalizeHomographs(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average homograph normalization time: ${avgTime.toFixed(2)}ms`)

      // Should be under 1ms per normalization
      expect(avgTime).toBeLessThan(1)
    })

    it('should generate variations within reasonable time', () => {
      const text = 'h3ll0'
      const iterations = 200

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        mapper.generateVariations(text, 10)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average variation generation time: ${avgTime.toFixed(2)}ms`)

      // Should be under 5ms per generation
      expect(avgTime).toBeLessThan(5)
    })

    it('should analyze obfuscation quickly', () => {
      const text = 'h3l-l0ооо w0r1d'
      const iterations = 1000

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        mapper.getObfuscationStats(text)
      }
      const end = performance.now()

      const avgTime = (end - start) / iterations
      console.log(`Average obfuscation analysis time: ${avgTime.toFixed(2)}ms`)

      // Should be under 1ms per analysis
      expect(avgTime).toBeLessThan(1)
    })
  })

  describe('Combined system performance', () => {
    it('should handle complete processing pipeline efficiently', () => {
      const texts = [
        'This is a normal English message',
        'H3ll0 w0rld! Th1s 1s l33t sp34k',
        'Café naïve résumé with diacritics',
        'hеllo wоrld with homographs',
        'مرحبا بالعالم Arabic text',
        'Mixed English and español text'
      ]

      const iterations = 100

      const start = performance.now()
      for (let i = 0; i < iterations; i++) {
        for (const text of texts) {
          // Full pipeline: detect language, process text, map characters
          engine.detect(text)
          processor.process(text)
          mapper.generateVariations(text, 5)
        }
      }
      const end = performance.now()

      const totalOperations = iterations * texts.length * 3 // 3 operations per text
      const avgTime = (end - start) / totalOperations

      console.log(`Average complete pipeline time: ${avgTime.toFixed(2)}ms`)
      console.log(`Total operations: ${totalOperations}`)
      console.log(`Total time: ${(end - start).toFixed(2)}ms`)

      // Complete pipeline should be under 15ms per text processing
      expect(avgTime).toBeLessThan(15)
    })

    it('should maintain performance under load', () => {
      const text = 'This is a load test message'
      const heavyLoad = 5000 // Simulate heavy load

      const start = performance.now()
      for (let i = 0; i < heavyLoad; i++) {
        engine.detect(text)
        if (i % 100 === 0) {
          processor.process(text)
          normalizeCharacters(text)
        }
      }
      const end = performance.now()

      const avgTime = (end - start) / heavyLoad
      console.log(`Average time under heavy load: ${avgTime.toFixed(2)}ms`)

      // Should maintain performance under load
      expect(avgTime).toBeLessThan(2)
    })
  })

  describe('Memory usage', () => {
    it('should not cause memory leaks', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Process many texts
      for (let i = 0; i < 1000; i++) {
        const text = `Test message number ${i} with some content`
        engine.detect(text)
        processor.process(text)
        mapper.generateVariations(text, 3)
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory

      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)

      // Memory increase should be reasonable (under 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Cache effectiveness', () => {
    it('should maintain cache hit rate', () => {
      const commonTexts = [
        'hello world',
        'test message',
        'common phrase',
        'frequent text',
        'repeated content'
      ]

      // Warm up cache
      commonTexts.forEach(text => engine.detect(text))

      // Test cache hits
      const iterations = 500
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        const text = commonTexts[i % commonTexts.length]
        engine.detect(text)
      }

      const end = performance.now()
      const avgTime = (end - start) / iterations

      console.log(`Average cached operation time: ${avgTime.toFixed(2)}ms`)

      // Cached operations should be very fast
      expect(avgTime).toBeLessThan(0.5)
    })

    it('should handle cache overflow gracefully', () => {
      // Clear cache first
      engine.clearCache()

      const startStats = engine.getCacheStats()
      expect(startStats.size).toBe(0)

      // Fill cache beyond capacity
      const textsToCache = 1500 // More than MAX_CACHE_SIZE
      for (let i = 0; i < textsToCache; i++) {
        engine.detect(`Unique text number ${i}`)
      }

      const endStats = engine.getCacheStats()
      console.log(`Cache stats after overflow: size=${endStats.size}, max=${endStats.maxSize}`)

      // Cache should not exceed maximum size
      expect(endStats.size).toBeLessThanOrEqual(endStats.maxSize)

      // Should still function correctly
      const result = engine.detect('New text after overflow')
      expect(result.length).toBeGreaterThan(0)
    })
  })
})

// Helper function to generate test data
function generateTestText(length: number, language: 'en' | 'es' | 'fr' | 'mixed' = 'en'): string {
  const words = {
    en: ['the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog', 'hello', 'world'],
    es: ['el', 'rápido', 'marrón', 'zorro', 'salta', 'sobre', 'perezoso', 'perro', 'hola', 'mundo'],
    fr: ['le', 'rapide', 'brun', 'renard', 'saute', 'sur', 'paresseux', 'chien', 'bonjour', 'monde'],
    mixed: ['hello', 'hola', 'bonjour', 'world', 'mundo', 'monde', 'test', 'prueba', 'essai']
  }

  const wordList = words[language]
  const result = []

  for (let i = 0; i < length; i++) {
    result.push(wordList[Math.floor(Math.random() * wordList.length)])
  }

  return result.join(' ')
}