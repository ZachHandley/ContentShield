/**
 * Test suite for language detection engine
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  LanguageDetectionEngine,
  detectLanguage,
  detectLanguages,
  hasMixedLanguages,
  getLanguageConfidence
} from '../../src/utils/language-detection.js'

describe('LanguageDetectionEngine', () => {
  let engine: LanguageDetectionEngine

  beforeEach(() => {
    engine = new LanguageDetectionEngine()
  })

  describe('English detection', () => {
    it('should detect English text correctly', () => {
      const englishTexts = [
        'Hello world, this is a test message',
        'The quick brown fox jumps over the lazy dog',
        'I am writing some text in English language',
        'This is definitely an English sentence with common words'
      ]

      for (const text of englishTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('en')
        expect(results[0].confidence).toBeGreaterThan(0.2)
      }
    })

    it('should handle short English text', () => {
      const result = engine.detect('hello world')
      // For short text, just check that we get a result
      expect(result[0].confidence).toBeGreaterThan(0.1)
    })
  })

  describe('Spanish detection', () => {
    it('should detect Spanish text correctly', () => {
      const spanishTexts = [
        'Hola mundo, esto es un mensaje de prueba',
        'El gato está sobre la mesa',
        'Me gusta mucho la comida española',
        'Buenos días, ¿cómo está usted hoy?'
      ]

      for (const text of spanishTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('es')
        expect(results[0].confidence).toBeGreaterThan(0.2)
      }
    })
  })

  describe('French detection', () => {
    it('should detect French text correctly', () => {
      const frenchTexts = [
        'Bonjour le monde, ceci est un message de test',
        'Je suis très content de vous voir',
        'La France est un beau pays',
        'Comment allez-vous aujourd\'hui?'
      ]

      for (const text of frenchTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('fr')
        expect(results[0].confidence).toBeGreaterThan(0.2)
      }
    })
  })

  describe('German detection', () => {
    it('should detect German text correctly', () => {
      const germanTexts = [
        'Hallo Welt, das ist eine Testnachricht',
        'Ich bin sehr glücklich heute',
        'Deutschland ist ein schönes Land',
        'Wie geht es Ihnen heute?'
      ]

      for (const text of germanTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('de')
        expect(results[0].confidence).toBeGreaterThan(0.2)
      }
    })
  })

  describe('Russian detection', () => {
    it('should detect Russian text correctly', () => {
      const russianTexts = [
        'Привет мир, это тестовое сообщение',
        'Я очень рад видеть вас',
        'Россия - большая страна',
        'Как дела сегодня?'
      ]

      for (const text of russianTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('ru')
        expect(results[0].confidence).toBeGreaterThan(0.6)
      }
    })
  })

  describe('Chinese detection', () => {
    it('should detect Chinese text correctly', () => {
      const chineseTexts = [
        '你好世界，这是一个测试消息',
        '我今天很高兴见到你',
        '中国是一个美丽的国家',
        '今天天气怎么样？'
      ]

      for (const text of chineseTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('zh')
        expect(results[0].confidence).toBeGreaterThan(0.8)
      }
    })
  })

  describe('Japanese detection', () => {
    it('should detect Japanese text correctly', () => {
      const japaneseTexts = [
        'こんにちは世界、これはテストメッセージです',
        '今日はとても嬉しいです',
        '日本は美しい国です',
        'お元気ですか？'
      ]

      for (const text of japaneseTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('ja')
        expect(results[0].confidence).toBeGreaterThan(0.8)
      }
    })
  })

  describe('Arabic detection', () => {
    it('should detect Arabic text correctly', () => {
      const arabicTexts = [
        'مرحبا بالعالم، هذه رسالة اختبار',
        'أنا سعيد جداً لرؤيتك',
        'العربية لغة جميلة',
        'كيف حالك اليوم؟'
      ]

      for (const text of arabicTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('ar')
        expect(results[0].confidence).toBeGreaterThan(0.8)
      }
    })
  })

  describe('Korean detection', () => {
    it('should detect Korean text correctly', () => {
      const koreanTexts = [
        '안녕하세요 세계, 이것은 테스트 메시지입니다',
        '오늘 당신을 만나서 정말 기쁩니다',
        '한국은 아름다운 나라입니다',
        '오늘 어떻게 지내세요?'
      ]

      for (const text of koreanTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(0)
        expect(results[0].language).toBe('ko')
        expect(results[0].confidence).toBeGreaterThan(0.8)
      }
    })
  })

  describe('Mixed language detection', () => {
    it('should detect multiple languages in mixed text', () => {
      const mixedTexts = [
        'Hello world and bonjour le monde',
        'I speak English and también español',
        'This is English text with some 中文 characters',
        'Привет world, how are you?'
      ]

      for (const text of mixedTexts) {
        const results = engine.detect(text)
        expect(results.length).toBeGreaterThan(1)
        expect(results[0].confidence).toBeGreaterThan(0.2)
        expect(results[1].confidence).toBeGreaterThan(0.1)
      }
    })
  })

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const result = engine.detect('')
      expect(result.length).toBe(1)
      expect(result[0].language).toBe('en')
      expect(result[0].confidence).toBeLessThan(0.2)
    })

    it('should handle very short text', () => {
      const result = engine.detect('a')
      expect(result.length).toBe(1)
      expect(result[0].confidence).toBeLessThan(0.5)
    })

    it('should handle numbers and punctuation only', () => {
      const result = engine.detect('123 !@# 456')
      expect(result.length).toBe(1)
      expect(result[0].confidence).toBeLessThan(0.8)
    })

    it('should handle very long text', () => {
      const longText = 'This is a very long English text that should still be detected correctly. '.repeat(100)
      const result = engine.detect(longText)
      expect(result[0].language).toBe('en')
      expect(result[0].confidence).toBeGreaterThan(0.7)
    })
  })

  describe('Performance tests', () => {
    it('should detect language quickly for short texts', () => {
      const start = performance.now()

      for (let i = 0; i < 100; i++) {
        engine.detect('This is a test message for performance evaluation')
      }

      const end = performance.now()
      const avgTime = (end - start) / 100

      expect(avgTime).toBeLessThan(10) // Should be less than 10ms per detection
    })

    it('should use caching effectively', () => {
      const text = 'This is a cached test message'

      // First detection (should be slower)
      const start1 = performance.now()
      engine.detect(text)
      const end1 = performance.now()
      const firstTime = end1 - start1

      // Second detection (should be faster due to caching)
      const start2 = performance.now()
      engine.detect(text)
      const end2 = performance.now()
      const secondTime = end2 - start2

      expect(secondTime).toBeLessThan(firstTime * 0.5) // Should be at least 50% faster
    })
  })

  describe('Cache management', () => {
    it('should provide cache statistics', () => {
      const stats = engine.getCacheStats()
      expect(stats).toHaveProperty('size')
      expect(stats).toHaveProperty('maxSize')
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.maxSize).toBe('number')
    })

    it('should clear cache when requested', () => {
      engine.detect('Test text for cache')
      const statsBefore = engine.getCacheStats()

      engine.clearCache()
      const statsAfter = engine.getCacheStats()

      expect(statsAfter.size).toBeLessThan(statsBefore.size)
    })
  })
})

describe('Utility functions', () => {
  describe('detectLanguage', () => {
    it('should return primary language code', () => {
      // Test with more distinctive text
      expect(detectLanguage('The quick brown fox jumps over the lazy dog')).toBe('en')
      expect(detectLanguage('Hola mundo como estas')).toBe('es')
      expect(detectLanguage('Bonjour comment allez vous')).toBe('fr')
      expect(detectLanguage('你好世界今天天气很好')).toBe('zh')
      expect(detectLanguage('こんにちはお元気ですか')).toBe('ja')
    })
  })

  describe('detectLanguages', () => {
    it('should return detailed detection results', () => {
      const results = detectLanguages('Hello world and hola mundo')
      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBeGreaterThan(0)
      expect(results[0]).toHaveProperty('language')
      expect(results[0]).toHaveProperty('confidence')
      expect(results[0]).toHaveProperty('sample')
    })
  })

  describe('hasMixedLanguages', () => {
    it('should detect mixed languages', () => {
      expect(hasMixedLanguages('Hello and bonjour comment allez vous')).toBe(true)
      expect(hasMixedLanguages('The quick brown fox jumps over the lazy dog')).toBe(false)
      expect(hasMixedLanguages('I speak English and también hablo español muy bien')).toBe(true)
    })

    it('should respect confidence threshold', () => {
      const mixedText = 'Hello with a little français'
      expect(hasMixedLanguages(mixedText, 0.1)).toBe(true)
      expect(hasMixedLanguages(mixedText, 0.5)).toBe(false)
    })
  })

  describe('getLanguageConfidence', () => {
    it('should return confidence for specific language', () => {
      const confidence = getLanguageConfidence('The quick brown fox jumps over the lazy dog', 'en')
      expect(typeof confidence).toBe('number')
      expect(confidence).toBeGreaterThan(0.3)

      const spanishConfidence = getLanguageConfidence('The quick brown fox jumps over the lazy dog', 'es')
      expect(typeof spanishConfidence).toBe('number')
    })

    it('should return 0 for unsupported languages', () => {
      const confidence = getLanguageConfidence('Hello world', 'xx' as any)
      expect(confidence).toBe(0)
    })
  })
})