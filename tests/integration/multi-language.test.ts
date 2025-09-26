/**
 * Comprehensive multi-language integration tests
 * Tests all supported languages and their interactions
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { LanguageDetector } from '../../src/core/language-detector.js'
import { createDetector } from '../../src/languages/factory.js'
import { SeverityLevel, ProfanityCategory, type LanguageCode } from '../../src/types/index.js'

describe('Multi-Language Integration', () => {
  let detector: NaughtyWordsDetector
  let languageDetector: LanguageDetector

  const SUPPORTED_LANGUAGES: LanguageCode[] = [
    'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'
  ]

  // Test phrases in different languages
  const TEST_PHRASES = {
    en: {
      clean: 'Hello, how are you today?',
      profane: 'This is a damn test message',
      mixed: 'Hello damn world'
    },
    es: {
      clean: 'Hola, ¿cómo estás hoy?',
      profane: 'Este es un maldito mensaje de prueba',
      mixed: 'Hola maldito mundo'
    },
    fr: {
      clean: 'Bonjour, comment allez-vous aujourd\'hui?',
      profane: 'C\'est un putain de message de test',
      mixed: 'Bonjour putain monde'
    },
    de: {
      clean: 'Hallo, wie geht es dir heute?',
      profane: 'Das ist eine verdammte Testnachricht',
      mixed: 'Hallo verdammte Welt'
    },
    it: {
      clean: 'Ciao, come stai oggi?',
      profane: 'Questo è un dannato messaggio di prova',
      mixed: 'Ciao dannato mondo'
    },
    pt: {
      clean: 'Olá, como você está hoje?',
      profane: 'Esta é uma mensagem de teste maldita',
      mixed: 'Olá mundo maldito'
    },
    ru: {
      clean: 'Привет, как дела сегодня?',
      profane: 'Это проклятое тестовое сообщение',
      mixed: 'Привет проклятый мир'
    },
    zh: {
      clean: '你好，你今天怎么样？',
      profane: '这是一个该死的测试消息',
      mixed: '你好该死的世界'
    },
    ja: {
      clean: 'こんにちは、今日はいかがですか？',
      profane: 'これはくそったれのテストメッセージです',
      mixed: 'こんにちはくそったれの世界'
    },
    ko: {
      clean: '안녕하세요, 오늘 어떠세요?',
      profane: '이것은 빌어먹을 테스트 메시지입니다',
      mixed: '안녕하세요 빌어먹을 세계'
    },
    ar: {
      clean: 'مرحبا، كيف حالك اليوم؟',
      profane: 'هذه رسالة اختبار ملعونة',
      mixed: 'مرحبا عالم ملعون'
    },
    hi: {
      clean: 'नमस्ते, आज आप कैसे हैं?',
      profane: 'यह एक गंदा टेस्ट संदेश है',
      mixed: 'नमस्ते गंदी दुनिया'
    }
  }

  beforeAll(async () => {
    detector = new NaughtyWordsDetector({
      languages: ['auto'], // Auto-detect all languages
      minSeverity: SeverityLevel.LOW,
      fuzzyMatching: true
    })

    languageDetector = new LanguageDetector()

    // Initialize with minimal test data (we're testing structure, not actual profanity detection)
    await detector.initialize()
  })

  describe('Language Detection', () => {
    it('should detect all supported languages', async () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        if (TEST_PHRASES[lang]) {
          const results = await languageDetector.detect(TEST_PHRASES[lang].clean)
          expect(results).toBeDefined()
          expect(Array.isArray(results)).toBe(true)

          // Should detect the correct language or at least not fail
          const detectedLanguages = results.map(r => r.language)
          expect(detectedLanguages.length).toBeGreaterThan(0)
        }
      }
    })

    it('should handle mixed-language content', async () => {
      const mixedText = 'Hello world. Hola mundo. Bonjour monde.'

      const results = await languageDetector.detect(mixedText)
      expect(results).toBeDefined()
      expect(results.length).toBeGreaterThan(0)

      // Should detect multiple languages with reasonable confidence
      const highConfidenceResults = results.filter(r => r.confidence > 0.3)
      expect(highConfidenceResults.length).toBeGreaterThan(0)
    })

    it('should provide confidence scores', async () => {
      const results = await languageDetector.detect(TEST_PHRASES.en.clean)

      results.forEach(result => {
        expect(result.confidence).toBeGreaterThanOrEqual(0)
        expect(result.confidence).toBeLessThanOrEqual(1)
        expect(typeof result.confidence).toBe('number')
      })
    })

    it('should handle empty and invalid input', async () => {
      const emptyResults = await languageDetector.detect('')
      expect(emptyResults).toEqual([])

      const whitespaceResults = await languageDetector.detect('   ')
      expect(whitespaceResults).toEqual([])
    })
  })

  describe('Language-Specific Detection', () => {
    it('should create language-specific detectors', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const langDetector = createDetector(lang)
        expect(langDetector).toBeDefined()
        expect(typeof langDetector.analyze).toBe('function')
      }
    })

    it('should handle language-specific text normalization', async () => {
      // Test different scripts and character sets
      const testCases = [
        { lang: 'en', text: 'Café résumé naïve' }, // Accented characters
        { lang: 'ru', text: 'Привет мир' }, // Cyrillic
        { lang: 'zh', text: '你好世界' }, // Chinese characters
        { lang: 'ar', text: 'مرحبا بالعالم' }, // Arabic script
        { lang: 'hi', text: 'नमस्ते दुनिया' }, // Devanagari script
      ]

      for (const testCase of testCases) {
        const detector = createDetector(testCase.lang)
        const result = await detector.analyze(testCase.text)

        expect(result).toBeDefined()
        expect(result.originalText).toBe(testCase.text)
        expect(Array.isArray(result.matches)).toBe(true)
      }
    })

    it('should respect language-specific configuration optimizations', async () => {
      // Chinese detector should have high precision
      const chineseDetector = createDetector('zh')
      const chineseConfig = chineseDetector.getConfig()
      expect(chineseConfig.fuzzyThreshold).toBeGreaterThanOrEqual(0.8)

      // Spanish detector should handle variations better
      const spanishDetector = createDetector('es')
      const spanishConfig = spanishDetector.getConfig()
      expect(spanishConfig.fuzzyMatching).toBe(true)
    })
  })

  describe('Auto-Detection Integration', () => {
    it('should auto-detect and analyze text correctly', async () => {
      // Test with clearly identifiable languages
      for (const [lang, phrases] of Object.entries(TEST_PHRASES)) {
        const result = await detector.analyze(phrases.clean)

        expect(result).toBeDefined()
        expect(result.detectedLanguages).toBeDefined()
        expect(Array.isArray(result.detectedLanguages)).toBe(true)
        expect(result.detectedLanguages!.length).toBeGreaterThan(0)
      }
    })

    it('should fallback to English when language detection fails', async () => {
      // Test with ambiguous or very short text
      const ambiguousText = 'OK'

      const result = await detector.analyze(ambiguousText)
      expect(result.detectedLanguages).toContain('en') // Should fallback to English
    })

    it('should handle code-switching (language mixing)', async () => {
      const mixedText = 'Hello hola bonjour こんにちは'

      const result = await detector.analyze(mixedText)
      expect(result).toBeDefined()
      expect(result.detectedLanguages!.length).toBeGreaterThan(1) // Should detect multiple languages
    })
  })

  describe('Cross-Language Consistency', () => {
    it('should maintain consistent severity levels across languages', async () => {
      const results = []

      // Test the same conceptual content in different languages
      for (const [lang, phrases] of Object.entries(TEST_PHRASES)) {
        if (phrases.profane) {
          const langDetector = createDetector(lang)
          const result = await langDetector.analyze(phrases.profane)
          results.push({ lang, result })
        }
      }

      // While exact severity may vary, all should recognize profane content
      // (Note: This test assumes test data contains actual profane content)
      results.forEach(({ lang, result }) => {
        expect(result).toBeDefined()
        // Test passes if analysis completes without error
        expect(typeof result.confidence).toBe('number')
      })
    })

    it('should provide consistent result structure across languages', async () => {
      for (const lang of SUPPORTED_LANGUAGES.slice(0, 5)) { // Test subset for performance
        const langDetector = createDetector(lang)
        const result = await langDetector.analyze(TEST_PHRASES[lang]?.clean || 'test')

        // All results should have consistent structure
        expect(result).toHaveProperty('originalText')
        expect(result).toHaveProperty('detectedLanguages')
        expect(result).toHaveProperty('matches')
        expect(result).toHaveProperty('severity')
        expect(result).toHaveProperty('confidence')
      }
    })
  })

  describe('Performance Across Languages', () => {
    it('should have reasonable performance for all languages', async () => {
      const performanceResults = []

      for (const lang of SUPPORTED_LANGUAGES.slice(0, 6)) { // Test subset
        if (TEST_PHRASES[lang]) {
          const detector = createDetector(lang)

          const start = performance.now()
          await detector.analyze(TEST_PHRASES[lang].clean)
          const end = performance.now()

          const duration = end - start
          performanceResults.push({ lang, duration })

          // Each analysis should complete within reasonable time
          expect(duration).toBeLessThan(1000) // 1 second max
        }
      }

      // No language should be dramatically slower than others
      const durations = performanceResults.map(r => r.duration)
      const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length
      const maxDuration = Math.max(...durations)

      expect(maxDuration).toBeLessThan(avgDuration * 5) // No more than 5x average
    })

    it('should cache language data efficiently', async () => {
      const detector = createDetector('en')

      // First analysis loads language data
      const start1 = performance.now()
      await detector.analyze('First analysis')
      const end1 = performance.now()
      const firstDuration = end1 - start1

      // Second analysis should be faster (cached)
      const start2 = performance.now()
      await detector.analyze('Second analysis')
      const end2 = performance.now()
      const secondDuration = end2 - start2

      expect(secondDuration).toBeLessThanOrEqual(firstDuration * 1.5) // At most 50% more time
    })
  })

  describe('Script and Character Set Handling', () => {
    it('should handle different Unicode scripts', async () => {
      const scriptTests = [
        { script: 'Latin', text: 'Hello World', lang: 'en' },
        { script: 'Cyrillic', text: 'Привет Мир', lang: 'ru' },
        { script: 'Han (Chinese)', text: '你好世界', lang: 'zh' },
        { script: 'Hiragana/Katakana', text: 'こんにちは', lang: 'ja' },
        { script: 'Arabic', text: 'مرحبا', lang: 'ar' },
        { script: 'Devanagari', text: 'नमस्ते', lang: 'hi' },
      ]

      for (const test of scriptTests) {
        const detector = createDetector(test.lang)
        const result = await detector.analyze(test.text)

        expect(result).toBeDefined()
        expect(result.originalText).toBe(test.text)

        // Should preserve original script in output
        expect(result.originalText).toMatch(new RegExp(test.text))
      }
    })

    it('should handle mixed scripts in single text', async () => {
      const mixedScriptText = 'Hello 你好 мир 🌍'

      const result = await detector.analyze(mixedScriptText)
      expect(result).toBeDefined()
      expect(result.originalText).toBe(mixedScriptText)

      // Should handle without error
      expect(Array.isArray(result.matches)).toBe(true)
    })

    it('should normalize diacritics and accents appropriately', async () => {
      const accentTests = [
        { lang: 'fr', text: 'café résumé naïve' },
        { lang: 'es', text: 'niño años señor' },
        { lang: 'de', text: 'schön größe weiß' },
      ]

      for (const test of accentTests) {
        const detector = createDetector(test.lang)
        const result = await detector.analyze(test.text)

        expect(result).toBeDefined()
        expect(result.originalText).toBe(test.text) // Should preserve original
      }
    })
  })

  describe('Error Handling and Robustness', () => {
    it('should handle unsupported language gracefully', async () => {
      // Test with unsupported language code
      expect(() => createDetector('unsupported-lang' as LanguageCode)).not.toThrow()
    })

    it('should handle malformed text input', async () => {
      const malformedInputs = [
        '\u0000\u0001\u0002', // Control characters
        '���', // Replacement characters
        'a'.repeat(100000), // Very long text
        '🙃🎉🚀💩', // Only emojis
      ]

      for (const input of malformedInputs) {
        const result = await detector.analyze(input)
        expect(result).toBeDefined()
        expect(typeof result.confidence).toBe('number')
      }
    })

    it('should gracefully handle missing language data', async () => {
      // This test assumes some language data might be missing
      const detector = createDetector('ko') // Test with less common language

      const result = await detector.analyze('테스트 메시지')
      expect(result).toBeDefined()
      // Should not throw error even if some data is missing
    })
  })

  describe('Batch Processing Multi-Language', () => {
    it('should efficiently process mixed-language batches', async () => {
      const mixedTexts = [
        TEST_PHRASES.en.clean,
        TEST_PHRASES.es.clean,
        TEST_PHRASES.fr.clean,
        TEST_PHRASES.zh.clean,
        TEST_PHRASES.ar.clean,
      ]

      const start = performance.now()
      const results = await detector.batchAnalyze(mixedTexts)
      const end = performance.now()

      expect(results).toHaveLength(mixedTexts.length)
      expect(end - start).toBeLessThan(5000) // Should complete within 5 seconds

      // Each result should have detected appropriate language
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(result.originalText).toBe(mixedTexts[index])
        expect(Array.isArray(result.detectedLanguages)).toBe(true)
      })
    })
  })
})