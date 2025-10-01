/**
 * Performance benchmarks for the NaughtyWords detection engine
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { ProfanityTrie, type TrieNodeData } from '../../src/core/trie.js'
import { ProfanityMatcher, type MatcherConfig } from '../../src/core/profanity-matcher.js'
import { ProfanityFilter } from '../../src/core/filter.js'
import { SeverityLevel, ProfanityCategory, FilterMode, type LanguageCode } from '../../src/types/index.js'

describe('Performance Benchmarks', () => {
  let detector: NaughtyWordsDetector
  let largeTrie: ProfanityTrie
  let matcher: ProfanityMatcher
  let filter: ProfanityFilter

  // Performance targets
  const PERFORMANCE_TARGETS = {
    // Should handle 1000+ words per second
    WORDS_PER_SECOND: 1000,
    // Trie operations should be under these thresholds
    TRIE_INSERT_1000_WORDS_MS: 100,
    TRIE_SEARCH_LARGE_TEXT_MS: 50,
    // Matcher should handle realistic workloads
    MATCHER_LARGE_TEXT_MS: 200,
    // Filter should be fast
    FILTER_MULTIPLE_MATCHES_MS: 50,
    // Full detection pipeline
    FULL_DETECTION_MS: 300
  }

  beforeAll(async () => {
    // Setup test components
    detector = new NaughtyWordsDetector({
      languages: ['en'],
      fuzzyMatching: true,
      normalizeText: true
    })

    largeTrie = new ProfanityTrie()

    const matcherConfig: MatcherConfig = {
      languages: ['en'],
      minSeverity: SeverityLevel.LOW,
      categories: ['general'],
      fuzzyMatching: true,
      fuzzyThreshold: 0.8,
      whitelist: [],
      contextAware: true,
      minWordLength: 2,
      maxEditDistance: 2
    }

    matcher = new ProfanityMatcher(matcherConfig)
    filter = new ProfanityFilter()

    // Load test data
    await setupPerformanceData()
  })

  async function setupPerformanceData() {
    // Create large dataset for testing
    const testWords = []

    // Generate diverse test words
    const baseWords = [
      'profanity', 'offensive', 'inappropriate', 'vulgar', 'obscene',
      'explicit', 'graphic', 'crude', 'lewd', 'indecent',
      'rude', 'coarse', 'harsh', 'severe', 'extreme'
    ]

    const prefixes = ['', 'super', 'mega', 'ultra', 'hyper']
    const suffixes = ['', 'ness', 'ity', 'ing', 'ed', 'er', 'ly']

    for (const base of baseWords) {
      for (const prefix of prefixes) {
        for (const suffix of suffixes) {
          const word = prefix + base + suffix
          if (word.length >= 3 && word.length <= 20) {
            testWords.push({
              word: word.toLowerCase(),
              severity: Math.floor(Math.random() * 4) + 1,
              categories: ['general'],
              variations: [
                word.replace(/[aeiou]/g, '@'),
                word.replace(/o/g, '0'),
                word.replace(/i/g, '1'),
                word.replace(/s/g, '$')
              ]
            })
          }
        }
      }
    }

    // Add some real-world patterns
    const patterns = [
      'shit', 'damn', 'hell', 'crap', 'piss',
      'hate', 'stupid', 'idiot', 'moron', 'fool',
      'damn', 'hell', 'crap', 'junk', 'trash'
    ]

    patterns.forEach(word => {
      testWords.push({
        word,
        severity: SeverityLevel.MODERATE,
        categories: ['general']
      })
    })

    // Ensure we have at least 1000 words for testing
    while (testWords.length < 1000) {
      const randomWord = 'testword' + Math.random().toString(36).substring(7)
      testWords.push({
        word: randomWord,
        severity: SeverityLevel.LOW,
        categories: ['general']
      })
    }

    // Load into components
    await matcher.loadLanguage('en' as LanguageCode, testWords.slice(0, 1000))

    // Build large trie
    testWords.slice(0, 1000).forEach((wordData, index) => {
      const trieData: TrieNodeData = {
        word: wordData.word,
        severity: wordData.severity,
        categories: wordData.categories,
        language: 'en'
      }

      largeTrie.insert(wordData.word, trieData)

      // Add variations
      if (wordData.variations) {
        wordData.variations.forEach(variation => {
          largeTrie.insert(variation, { ...trieData, word: wordData.word })
        })
      }
    })

    largeTrie.compile() // Compile for optimal performance

    // Also load test data into the detector for accuracy tests
    await detector.matcher.loadLanguage('en' as LanguageCode, testWords.slice(0, 500))
  }

  describe('Trie Performance', () => {
    it('should insert 1000 words quickly', () => {
      const trie = new ProfanityTrie()
      const startTime = Date.now()

      for (let i = 0; i < 1000; i++) {
        const word = 'testword' + i
        trie.insert(word, {
          word,
          severity: SeverityLevel.LOW,
          categories: ['general'],
          language: 'en'
        })
      }

      const duration = Date.now() - startTime
      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.TRIE_INSERT_1000_WORDS_MS)

      console.log(`Trie insertion: ${1000} words in ${duration}ms (${Math.round(1000 / duration * 1000)} words/sec)`)
    })

    it('should search large text efficiently', () => {
      const largeText = 'This is a large text with some profanity and offensive content mixed in. '.repeat(100) +
        'It contains shit and damn things that should be detected quickly. '.repeat(50)

      const startTime = Date.now()
      const matches = largeTrie.multiPatternSearch(largeText)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.TRIE_SEARCH_LARGE_TEXT_MS)
      expect(matches.length).toBeGreaterThan(0)

      console.log(`Trie search: ${largeText.length} chars in ${duration}ms (${Math.round(largeText.length / duration)} chars/ms)`)
    })

    it('should handle fuzzy search efficiently', () => {
      const testText = 'profanety offensiv inappropriat vulger obscen' // Typos

      const startTime = Date.now()
      const matches = largeTrie.fuzzySearch(testText, 2)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100) // Fuzzy search should be reasonably fast
      expect(matches.length).toBeGreaterThan(0)

      console.log(`Trie fuzzy search: found ${matches.length} matches in ${duration}ms`)
    })

    it('should provide good memory efficiency', () => {
      const stats = largeTrie.getStats()

      // Memory usage should be reasonable
      const memoryPerWord = stats.memoryUsage / stats.totalWords
      expect(memoryPerWord).toBeLessThan(1000) // Less than 1KB per word

      console.log(`Trie memory: ${stats.totalWords} words, ${Math.round(stats.memoryUsage / 1024)}KB (${Math.round(memoryPerWord)}B/word)`)
    })
  })

  describe('Matcher Performance', () => {
    it('should find matches in large text efficiently', () => {
      const largeText = generateLargeTestText(10000) // 10k words

      const startTime = Date.now()
      const matches = matcher.findMatches(largeText, ['en'])
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.MATCHER_LARGE_TEXT_MS)

      const wordsPerSecond = Math.round(10000 / duration * 1000)
      expect(wordsPerSecond).toBeGreaterThan(PERFORMANCE_TARGETS.WORDS_PER_SECOND)

      console.log(`Matcher performance: ${10000} words in ${duration}ms (${wordsPerSecond} words/sec)`)
    })

    it('should handle context filtering efficiently', () => {
      const contextText = 'This is not shit, and definitely not damn content according to research.'

      const startTime = Date.now()
      const matches = matcher.findMatches(contextText, ['en'])
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(50) // Context analysis should be fast

      console.log(`Context filtering: ${contextText.length} chars in ${duration}ms`)
    })

    it('should batch process efficiently', () => {
      const texts = Array(100).fill(0).map((_, i) =>
        `Text ${i} contains some shit and damn content that needs filtering.`
      )

      const startTime = Date.now()
      const results = texts.map(text => matcher.findMatches(text, ['en']))
      const duration = Date.now() - startTime

      const totalChars = texts.reduce((sum, text) => sum + text.length, 0)
      const charsPerMs = Math.round(totalChars / duration)

      expect(duration).toBeLessThan(500) // Should process batch quickly
      expect(results).toHaveLength(100)

      console.log(`Batch processing: ${texts.length} texts (${totalChars} chars) in ${duration}ms (${charsPerMs} chars/ms)`)
    })
  })

  describe('Filter Performance', () => {
    it('should filter multiple matches quickly', () => {
      const textWithMatches = 'This shit text contains damn and hell content that needs filtering now.'

      const matches = matcher.findMatches(textWithMatches, ['en'])

      const startTime = Date.now()
      const result = filter.filter(textWithMatches, matches)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FILTER_MULTIPLE_MATCHES_MS)
      expect(result.filteredCount).toBeGreaterThan(0)

      console.log(`Filtering: ${matches.length} matches in ${duration}ms`)
    })

    it('should handle different filter modes efficiently', () => {
      const text = 'This contains shit and damn content for testing.'
      const matches = matcher.findMatches(text, ['en'])

      const modes = [FilterMode.CENSOR, FilterMode.REMOVE, FilterMode.REPLACE]

      modes.forEach(mode => {
        const startTime = Date.now()
        const result = filter.filter(text, matches, { mode })
        const duration = Date.now() - startTime

        expect(duration).toBeLessThan(20)
        console.log(`Filter mode ${mode}: ${duration}ms`)
      })
    })

    it('should handle large text filtering', () => {
      const largeText = generateLargeTestText(1000) // 1k words
      const matches = matcher.findMatches(largeText, ['en'])

      const startTime = Date.now()
      const result = filter.filter(largeText, matches)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100)

      const charsPerMs = Math.round(largeText.length / duration)
      console.log(`Large text filtering: ${largeText.length} chars, ${matches.length} matches in ${duration}ms (${charsPerMs} chars/ms)`)
    })
  })

  describe('Full Pipeline Performance', () => {
    it('should handle complete detection pipeline efficiently', async () => {
      const testText = generateLargeTestText(1000) // 1k words

      const startTime = Date.now()
      const result = await detector.analyzeEnhanced(testText, {
        measurePerformance: true,
        filterMode: FilterMode.CENSOR
      })
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(PERFORMANCE_TARGETS.FULL_DETECTION_MS)

      const wordsPerSecond = Math.round(1000 / duration * 1000)
      expect(wordsPerSecond).toBeGreaterThan(PERFORMANCE_TARGETS.WORDS_PER_SECOND)

      console.log(`Full pipeline: ${1000} words in ${duration}ms (${wordsPerSecond} words/sec)`)
      console.log(`Performance breakdown:`)
      console.log(`  Language detection: ${result.performance.languageDetectionTime || 0}ms`)
      console.log(`  Normalization: ${result.performance.normalizationTime || 0}ms`)
      console.log(`  Matching: ${result.performance.matchingTime || 0}ms`)
      console.log(`  Context analysis: ${result.performance.contextAnalysisTime || 0}ms`)
      console.log(`  Filtering: ${result.performance.filteringTime || 0}ms`)
    })

    it('should handle batch processing at scale', async () => {
      const texts = Array(50).fill(0).map((_, i) =>
        `Document ${i} contains various shit and damn content that might need filtering or censoring.`
      )

      const startTime = Date.now()
      const results = await detector.batchAnalyze(texts)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(50)
      expect(duration).toBeLessThan(1000) // Should handle 50 documents in under 1 second

      const totalWords = texts.reduce((sum, text) => sum + text.split(' ').length, 0)
      const wordsPerSecond = Math.round(totalWords / duration * 1000)

      console.log(`Batch analysis: ${texts.length} texts (${totalWords} words) in ${duration}ms (${wordsPerSecond} words/sec)`)
    })

    it('should maintain performance with fuzzy matching enabled', async () => {
      const fuzzyDetector = new NaughtyWordsDetector({
        languages: ['en'],
        fuzzyMatching: true,
        fuzzyThreshold: 0.7
      })

      const textWithTypos = 'This contains profanety and offensiv content with various tpos.'

      const startTime = Date.now()
      const result = await fuzzyDetector.analyze(textWithTypos)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(100) // Fuzzy matching should still be reasonably fast
      console.log(`Fuzzy matching: ${textWithTypos.length} chars in ${duration}ms`)
    })

    it('should handle memory efficiently with large datasets', async () => {
      // Measure memory usage (approximate)
      const memBefore = process.memoryUsage()

      // Process significant amount of text
      const largeTexts = Array(100).fill(0).map(() => generateLargeTestText(200))

      const startTime = Date.now()
      const results = await detector.batchAnalyze(largeTexts)
      const duration = Date.now() - startTime

      const memAfter = process.memoryUsage()
      const memoryIncreaseMB = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024

      expect(results).toHaveLength(100)
      expect(memoryIncreaseMB).toBeLessThan(100) // Should not use excessive memory

      const totalWords = largeTexts.reduce((sum, text) => sum + text.split(' ').length, 0)
      console.log(`Memory efficiency: ${totalWords} words processed, ${Math.round(memoryIncreaseMB)}MB memory increase`)
    })
  })

  describe('Stress Testing', () => {
    it('should handle extremely long single text', async () => {
      const extremelyLongText = generateLargeTestText(10000) // 10k words

      const startTime = Date.now()
      const result = await detector.analyze(extremelyLongText)
      const duration = Date.now() - startTime

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(2000) // Should complete within 2 seconds

      const wordsPerSecond = Math.round(10000 / duration * 1000)
      console.log(`Stress test: ${10000} words in ${duration}ms (${wordsPerSecond} words/sec)`)
    })

    it('should handle high concurrency simulation', async () => {
      const texts = Array(200).fill(0).map((_, i) =>
        `Concurrent text ${i} with some shit and damn content.`
      )

      const startTime = Date.now()

      // Simulate concurrent processing
      const promises = texts.map(text => detector.analyze(text))
      const results = await Promise.all(promises)

      const duration = Date.now() - startTime

      expect(results).toHaveLength(200)
      expect(duration).toBeLessThan(3000) // Should handle concurrency reasonably

      const totalWords = texts.reduce((sum, text) => sum + text.split(' ').length, 0)
      const wordsPerSecond = Math.round(totalWords / duration * 1000)

      console.log(`Concurrency test: ${texts.length} concurrent requests (${totalWords} words) in ${duration}ms (${wordsPerSecond} words/sec)`)
    })

    it('should maintain accuracy under performance pressure', async () => {
      const testTexts = [
        'This contains obvious shit profanity',
        'Clean message with no problems',
        'This has damn and hell content',
        'Another clean example message',
        'Mixed fuck with clean content'
      ]

      const startTime = Date.now()
      const results = await Promise.all(
        Array(50).fill(0).map(() =>
          Promise.all(testTexts.map(text => detector.analyze(text)))
        )
      )
      const duration = Date.now() - startTime

      // Flatten results
      const allResults = results.flat()

      // Check accuracy - should consistently detect profanity in same texts
      const profaneTexts = allResults.filter((_, i) =>
        testTexts[i % testTexts.length].includes('shit') ||
        testTexts[i % testTexts.length].includes('damn') ||
        testTexts[i % testTexts.length].includes('fuck')
      )

      const accuracyRate = profaneTexts.filter(r => r.hasProfanity).length / profaneTexts.length

      expect(accuracyRate).toBeGreaterThan(0.8) // Should maintain >80% accuracy under pressure
      console.log(`Accuracy under pressure: ${Math.round(accuracyRate * 100)}% accuracy, ${duration}ms total`)
    })
  })

  // Helper function to generate large test text
  function generateLargeTestText(wordCount: number): string {
    const words = [
      'this', 'is', 'a', 'test', 'document', 'with', 'various', 'content',
      'some', 'clean', 'words', 'and', 'occasional', 'shit', 'or',
      'damn', 'content', 'mixed', 'in', 'for', 'testing', 'purposes',
      'the', 'detection', 'engine', 'should', 'handle', 'this', 'efficiently',
      'regardless', 'of', 'text', 'length', 'or', 'content', 'density'
    ]

    const profaneWords = ['shit', 'damn', 'hell', 'inappropriate']

    const result = []
    for (let i = 0; i < wordCount; i++) {
      if (i % 50 === 0) {
        // Insert profane word every 50 words
        result.push(profaneWords[Math.floor(Math.random() * profaneWords.length)])
      } else {
        result.push(words[Math.floor(Math.random() * words.length)])
      }
    }

    return result.join(' ')
  }
})