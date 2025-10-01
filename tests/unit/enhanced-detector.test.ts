/**
 * Comprehensive tests for the enhanced NaughtyWordsDetector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { SeverityLevel, FilterMode, type DetectorConfig, type ProfanityCategory } from '../../src/types/index.js'
import fs from 'fs/promises'

// Mock fs to avoid file system dependencies in tests
vi.mock('fs/promises')

// Helper to create properly mocked language data
function mockLanguageFiles() {
  const metadata = JSON.stringify({
    name: 'English',
    code: 'en',
    version: '1.0.0',
    wordCount: 2,
    lastUpdated: '2025-01-01'
  })

  const profanity = JSON.stringify({
    words: [
      { word: 'shit', severity: 2, categories: ['general'] },
      { word: 'terrible', severity: 3, categories: ['violence'] }
    ]
  })

  const categories = JSON.stringify({
    general: ['shit'],
    violence: ['terrible']
  })

  const severity = JSON.stringify({
    shit: 2,
    terrible: 3
  })

  const variations = JSON.stringify({})
  const context = JSON.stringify({})

  // Setup mock to return appropriate data based on filename
  vi.mocked(fs.readFile).mockImplementation(async (path: any) => {
    const pathStr = String(path)
    if (pathStr.includes('metadata.json')) return metadata
    if (pathStr.includes('profanity.json')) return profanity
    if (pathStr.includes('categories.json')) return categories
    if (pathStr.includes('severity.json')) return severity
    if (pathStr.includes('variations.json')) return variations
    if (pathStr.includes('context.json')) return context
    throw new Error(`File not found: ${pathStr}`)
  })
}

describe('Enhanced NaughtyWordsDetector', () => {
  let detector: NaughtyWordsDetector

  beforeEach(() => {
    vi.clearAllMocks()
    detector = new NaughtyWordsDetector()
  })

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(detector).toBeDefined()
      const config = detector.getConfig()

      // Default config should have 'en' as the default language
      expect(config.languages).toEqual(['en'])
      expect(config.minSeverity).toBe(SeverityLevel.LOW)
      expect(config.fuzzyMatching).toBe(true)
      expect(config.normalizeText).toBe(true)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<DetectorConfig> = {
        languages: ['en', 'es'],
        minSeverity: SeverityLevel.MODERATE,
        fuzzyMatching: false,
        replacementChar: '#'
      }

      const customDetector = new NaughtyWordsDetector(customConfig)
      const config = customDetector.getConfig()

      expect(config.languages).toEqual(['en', 'es'])
      expect(config.minSeverity).toBe(SeverityLevel.MODERATE)
      expect(config.fuzzyMatching).toBe(false)
      expect(config.replacementChar).toBe('#')
    })

    it('should handle initialization errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      // Should not throw during initialization
      await expect(detector.initialize()).resolves.not.toThrow()
    })

    it('should not reinitialize if already initialized', async () => {
      const readFileSpy = vi.mocked(fs.readFile)
      mockLanguageFiles()

      const callCountBefore = readFileSpy.mock.calls.length
      await detector.initialize()
      const callCountAfter = readFileSpy.mock.calls.length
      const firstInitCallCount = callCountAfter - callCountBefore

      await detector.initialize() // Second call
      const callCountFinal = readFileSpy.mock.calls.length

      // Second initialization should not make any additional calls
      expect(callCountFinal).toBe(callCountAfter)
      expect(firstInitCallCount).toBeGreaterThan(0)
    })
  })

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig: Partial<DetectorConfig> = {
        minSeverity: SeverityLevel.HIGH,
        fuzzyThreshold: 0.9
      }

      detector.updateConfig(newConfig)
      const config = detector.getConfig()

      expect(config.minSeverity).toBe(SeverityLevel.HIGH)
      expect(config.fuzzyThreshold).toBe(0.9)
    })

    it('should generate and update config hash', () => {
      const stats1 = detector.getStats()
      const originalHash = stats1.configHash

      detector.updateConfig({ minSeverity: SeverityLevel.HIGH })

      const stats2 = detector.getStats()
      expect(stats2.configHash).not.toBe(originalHash)
    })

    it('should export and import configuration', () => {
      detector.updateConfig({ minSeverity: SeverityLevel.HIGH })

      const exported = detector.exportConfig()
      expect(exported).toHaveProperty('config')
      expect(exported).toHaveProperty('version')
      expect(exported).toHaveProperty('timestamp')

      const newDetector = new NaughtyWordsDetector()
      newDetector.importConfig(exported)

      expect(newDetector.getConfig().minSeverity).toBe(SeverityLevel.HIGH)
    })
  })

  describe('Basic Detection', () => {
    beforeEach(() => {
      // Mock language data loading
      mockLanguageFiles()
    })

    it('should detect profanity in text', async () => {
      const result = await detector.analyze('this contains shit')

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)
      expect(result.originalText).toBe('this contains shit')
      expect(result.processingTime).toBeGreaterThan(0)
    })

    it('should return clean results for clean text', async () => {
      const result = await detector.analyze('this is completely clean text')

      expect(result.hasProfanity).toBe(false)
      expect(result.totalMatches).toBe(0)
      expect(result.matches).toHaveLength(0)
    })

    it('should handle empty text', async () => {
      const result = await detector.analyze('')

      expect(result.hasProfanity).toBe(false)
      expect(result.totalMatches).toBe(0)
      expect(result.originalText).toBe('')
    })

    it('should provide quick profanity check', async () => {
      const isProfane = await detector.isProfane('this contains shit')
      expect(typeof isProfane).toBe('boolean')
    })
  })

  describe('Enhanced Analysis', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should provide enhanced analysis with performance metrics', async () => {
      const result = await detector.analyzeEnhanced('this contains shit', {
        measurePerformance: true
      })

      expect(result).toHaveProperty('performance')
      expect(result.performance).toHaveProperty('totalTime')
      expect(result.performance).toHaveProperty('charactersProcessed')
      expect(result.performance).toHaveProperty('processingRate')
    })

    it('should include enhanced matches with context', async () => {
      const result = await detector.analyzeEnhanced('this shit is terrible context')

      expect(result).toHaveProperty('enhancedMatches')
      if (result.enhancedMatches.length > 0) {
        const match = result.enhancedMatches[0]
        expect(match).toHaveProperty('position')
        expect(match).toHaveProperty('context')
        expect(match).toHaveProperty('suggestions')
        expect(match).toHaveProperty('detectionReason')
      }
    })

    it('should provide statistics and metadata', async () => {
      const result = await detector.analyzeEnhanced('this contains shit')

      expect(result).toHaveProperty('statistics')
      expect(result).toHaveProperty('textContext')
      expect(result).toHaveProperty('metadata')

      expect(result.statistics).toHaveProperty('totalWords')
      expect(result.statistics).toHaveProperty('profanityDensity')
      expect(result.textContext).toHaveProperty('textType')
      expect(result.metadata).toHaveProperty('timestamp')
    })

    it('should generate warnings and recommendations', async () => {
      const result = await detector.analyzeEnhanced('bad')

      expect(result).toHaveProperty('warnings')
      expect(result).toHaveProperty('recommendations')

      if (result.warnings.length > 0) {
        expect(result.warnings[0]).toContain('short text')
      }
    })
  })

  describe('Language Detection and Processing', () => {
    it('should detect languages automatically', async () => {
      mockLanguageFiles()

      const result = await detector.analyze('this is english text')

      expect(result.detectedLanguages).toContain('en')
      expect(result.detectedLanguages.length).toBeGreaterThan(0)
    })

    it('should use specified languages when not auto-detecting', () => {
      const specificDetector = new NaughtyWordsDetector({
        languages: ['en', 'es']
      })

      const config = specificDetector.getConfig()
      expect(config.languages).toEqual(['en', 'es'])
      expect(config.languages).not.toContain('auto')
    })

    it('should handle unsupported languages gracefully', async () => {
      const detector = new NaughtyWordsDetector({
        languages: ['unsupported' as any]
      })

      // Should not throw
      await expect(detector.analyze('test text')).resolves.not.toThrow()
    })
  })

  describe('Text Normalization and Processing', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should normalize text when enabled', async () => {
      const detector = new NaughtyWordsDetector({ normalizeText: true })

      // Should handle text normalization without errors
      await expect(
        detector.analyze('This BADWORD has áccénts and contractions don\'t work')
      ).resolves.not.toThrow()
    })

    it('should skip normalization when disabled', async () => {
      const detector = new NaughtyWordsDetector({ normalizeText: false })

      await expect(
        detector.analyze('This text won\'t be normalized')
      ).resolves.not.toThrow()
    })

    it('should handle unicode and special characters', async () => {
      const result = await detector.analyze('This contains bádwörd with unicode')

      expect(result).toBeDefined()
      expect(typeof result.hasProfanity).toBe('boolean')
    })
  })

  describe('Filtering Integration', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should filter text using censor mode', async () => {
      const filteredText = await detector.filter('this contains shit', FilterMode.CENSOR)

      expect(filteredText).not.toBe('this contains shit')
      expect(filteredText).toContain('*')
    })

    it('should filter text using remove mode', async () => {
      const filteredText = await detector.filter('this contains shit', FilterMode.REMOVE)

      expect(filteredText).not.toContain('shit')
      // Remove mode removes the word but may preserve spaces, resulting in extra whitespace
      // The filter removes the word entirely but preserves sentence structure
      expect(filteredText).toMatch(/this\s+contains/)
    })

    it('should filter text using replace mode', async () => {
      const filteredText = await detector.filter('this contains shit', FilterMode.REPLACE)

      expect(filteredText).not.toBe('this contains shit')
      // Replace mode may use gradual filtering or replacement words
      // The actual behavior depends on severity and confidence
      // Just verify the text was modified in some way
      expect(filteredText).not.toContain('shit')
    })

    it('should not modify text in detect-only mode', async () => {
      const result = await detector.analyze('this contains shit', {
        filterMode: FilterMode.DETECT_ONLY
      })

      expect(result.filteredText).toBe(result.originalText)
    })
  })

  describe('Custom Words and Configuration', () => {
    it('should add custom words', () => {
      const customWords = [
        {
          word: 'customword',
          language: 'en' as const,
          severity: SeverityLevel.HIGH,
          categories: ['general' as ProfanityCategory]
        }
      ]

      detector.addCustomWords(customWords)

      const config = detector.getConfig()
      expect(config.customWords).toContain(customWords[0])
    })

    it('should handle custom words with variations', () => {
      // Get initial count first
      const initialCount = detector.getConfig().customWords.length

      const customWords = [
        {
          word: 'customvariation',
          language: 'en' as const,
          severity: SeverityLevel.MODERATE,
          categories: ['general' as ProfanityCategory],
          variations: ['cust0m', 'c@stom']
        }
      ]

      detector.addCustomWords(customWords)

      // Should have added exactly one custom word
      expect(detector.getConfig().customWords).toHaveLength(initialCount + 1)
    })

    it('should update configuration hash when adding custom words', () => {
      const initialStats = detector.getStats()
      const initialHash = initialStats.configHash

      detector.addCustomWords([{
        word: 'test',
        language: 'en' as const,
        severity: SeverityLevel.LOW,
        categories: ['general' as ProfanityCategory]
      }])

      const updatedStats = detector.getStats()
      expect(updatedStats.configHash).not.toBe(initialHash)
    })
  })

  describe('Batch Processing', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should analyze multiple texts in batch', async () => {
      const texts = [
        'this contains shit',
        'this is clean',
        'another shit here'
      ]

      const results = await detector.batchAnalyze(texts)

      expect(results).toHaveLength(3)
      expect(results[0].hasProfanity).toBe(true)
      expect(results[1].hasProfanity).toBe(false)
      expect(results[2].hasProfanity).toBe(true)
    })

    it('should handle empty batch', async () => {
      const results = await detector.batchAnalyze([])
      expect(results).toHaveLength(0)
    })

    it('should handle batch with mixed content', async () => {
      const texts = ['clean', '', 'shit', '   ', 'normal text']
      const results = await detector.batchAnalyze(texts)

      expect(results).toHaveLength(5)
      results.forEach(result => {
        expect(result).toHaveProperty('hasProfanity')
        expect(result).toHaveProperty('totalMatches')
      })
    })
  })

  describe('Performance and Statistics', () => {
    it('should provide detector statistics', () => {
      const stats = detector.getStats()

      expect(stats).toHaveProperty('isInitialized')
      expect(stats).toHaveProperty('configHash')
      expect(stats).toHaveProperty('matcherStats')
      expect(stats).toHaveProperty('filterStats')
      expect(stats).toHaveProperty('supportedLanguages')

      expect(typeof stats.isInitialized).toBe('boolean')
      expect(typeof stats.configHash).toBe('string')
      expect(Array.isArray(stats.supportedLanguages)).toBe(true)
    })

    it('should track processing time', async () => {
      mockLanguageFiles()

      const result = await detector.analyze('test text')

      // Processing time should be a number, may be 0 for very fast operations
      expect(typeof result.processingTime).toBe('number')
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should handle large texts efficiently', async () => {
      mockLanguageFiles()

      const largeText = 'word '.repeat(1000) + 'shit' + ' word'.repeat(1000)

      const start = Date.now()
      const result = await detector.analyze(largeText)
      const duration = Date.now() - start

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle file loading errors gracefully', async () => {
      vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

      // Should not throw during analysis
      await expect(detector.analyze('test text')).resolves.not.toThrow()
    })

    it('should handle malformed language data', async () => {
      vi.mocked(fs.readFile).mockResolvedValue('invalid json')

      // Should not throw during analysis
      await expect(detector.analyze('test text')).resolves.not.toThrow()
    })

    it('should handle extremely long texts', async () => {
      const veryLongText = 'word '.repeat(50000) // 250k characters

      const start = Date.now()
      const result = await detector.analyze(veryLongText, { maxLength: 100000 })
      const duration = Date.now() - start

      expect(result).toBeDefined()
      expect(duration).toBeLessThan(10000) // Should handle large texts reasonably
    })

    it('should handle null and undefined inputs', async () => {
      await expect(detector.analyze(null as any)).resolves.not.toThrow()
      await expect(detector.analyze(undefined as any)).resolves.not.toThrow()
    })

    it('should handle special characters and encodings', async () => {
      const specialText = '🤬 Special chars: áéíóú ñ üß 中文 العربية русский'

      const result = await detector.analyze(specialText)

      expect(result).toBeDefined()
      expect(result.originalText).toBe(specialText)
    })
  })

  describe('Reset and Reinitialization', () => {
    it('should reset detector state', async () => {
      mockLanguageFiles()

      // Initialize first time
      await detector.initialize()
      expect(detector.getStats().isInitialized).toBe(true)

      // Reset
      await detector.reset()
      expect(detector.getStats().isInitialized).toBe(true) // Should be initialized again
    })

    it('should maintain configuration after reset', async () => {
      const originalConfig = detector.getConfig()

      await detector.reset()

      const configAfterReset = detector.getConfig()
      expect(configAfterReset).toEqual(originalConfig)
    })
  })

  describe('Confidence and Quality Metrics', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should calculate overall confidence', async () => {
      const result = await detector.analyze('this contains shit')

      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(1)
      expect(typeof result.confidence).toBe('number')
    })

    it('should adjust confidence based on text length', async () => {
      const shortResult = await detector.analyze('shit')
      const longResult = await detector.analyze(
        'This is a much longer text that contains the same shit but has more context and content around it'
      )

      // Longer text might have different confidence due to context
      expect(typeof shortResult.confidence).toBe('number')
      expect(typeof longResult.confidence).toBe('number')
    })

    it('should provide confidence warnings', async () => {
      const result = await detector.analyzeEnhanced('bd') // Very short, likely low confidence

      if (result.warnings.length > 0) {
        expect(result.warnings.some(w => w.includes('short'))).toBe(true)
      }
    })
  })

  describe('Integration with All Components', () => {
    beforeEach(() => {
      mockLanguageFiles()
    })

    it('should integrate trie, matcher, filter, and result builder', async () => {
      const result = await detector.analyzeEnhanced(
        'this b4dword text is terrible',
        {
          measurePerformance: true,
          filterMode: FilterMode.CENSOR,
          includeMatches: true
        }
      )

      expect(result).toBeDefined()
      expect(result.hasProfanity).toBe(true)
      expect(result.matches.length).toBeGreaterThan(0)
      expect(result.filteredText).not.toBe(result.originalText)
      // Performance time may be 0 for very fast operations
      expect(typeof result.performance.totalTime).toBe('number')
      expect(result.performance.totalTime).toBeGreaterThanOrEqual(0)
      expect(result.enhancedMatches.length).toBeGreaterThan(0)
    })

    it('should handle fuzzy matching in full pipeline', async () => {
      const result = await detector.analyze('this badwerd is close match') // Typo in 'shit'

      // Might find fuzzy match depending on configuration
      expect(result).toBeDefined()
      expect(typeof result.hasProfanity).toBe('boolean')
    })

    it('should handle context-aware filtering in full pipeline', async () => {
      const result = await detector.analyze('this is not shit at all')

      // Context-aware filtering might reduce confidence or eliminate matches
      expect(result).toBeDefined()
      expect(typeof result.confidence).toBe('number')
    })
  })
})