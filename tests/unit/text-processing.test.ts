/**
 * Test suite for text processing utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  TextProcessor,
  normalizeText,
  cleanTextForDetection,
  extractWords,
  isRTLText,
  getTextStats,
  DEFAULT_TEXT_PROCESSING_CONFIG
} from '../../src/utils/text-processing.js'

describe('TextProcessor', () => {
  let processor: TextProcessor

  beforeEach(() => {
    processor = new TextProcessor()
  })

  describe('Basic text processing', () => {
    it('should normalize basic text', () => {
      const text = '  Hello   World!  '
      const result = processor.process(text)
      expect(result).toBe('hello world')
    })

    it('should handle empty text', () => {
      expect(processor.process('')).toBe('')
      expect(processor.process('   ')).toBe('')
    })

    it('should convert to lowercase by default', () => {
      const result = processor.process('HELLO WORLD')
      expect(result).toBe('hello world')
    })
  })

  describe('Unicode normalization', () => {
    it('should normalize Unicode characters', () => {
      const text = 'café naïve résumé'
      const result = processor.process(text)
      expect(result).toBe('cafe naive resume')
    })

    it('should handle different normalization forms', () => {
      const processor = new TextProcessor({ normalizationForm: 'NFD' })
      const text = 'café'
      const result = processor.process(text)
      expect(result).toBe('cafe')
    })

    it('should handle normalization errors gracefully', () => {
      const text = 'normal text'
      const result = processor.process(text)
      expect(result).toBe('normal text')
    })
  })

  describe('Diacritic removal', () => {
    it('should remove common diacritics', () => {
      const testCases = [
        { input: 'café', expected: 'cafe' },
        { input: 'naïve', expected: 'naive' },
        { input: 'résumé', expected: 'resume' },
        { input: 'piñata', expected: 'pinata' },
        { input: 'São Paulo', expected: 'sao paulo' }
      ]

      for (const { input, expected } of testCases) {
        const result = processor.process(input)
        expect(result).toBe(expected)
      }
    })
  })

  describe('Language-specific normalization', () => {
    it('should handle German characters', () => {
      const processor = new TextProcessor({ language: 'de' })
      const testCases = [
        { input: 'Müller', expected: 'mueller' },
        { input: 'Größe', expected: 'groesse' },
        { input: 'Weiß', expected: 'weiss' }
      ]

      for (const { input, expected } of testCases) {
        const result = processor.process(input)
        expect(result).toBe(expected)
      }
    })

    it('should handle French characters', () => {
      const processor = new TextProcessor({ language: 'fr' })
      const testCases = [
        { input: 'cœur', expected: 'coeur' },
        { input: 'œuf', expected: 'oeuf' }
      ]

      for (const { input, expected } of testCases) {
        const result = processor.process(input)
        expect(result).toBe(expected)
      }
    })

    it('should handle Turkish case rules', () => {
      const processor = new TextProcessor({ language: 'tr' })
      const result = processor.process('İstanbul')
      expect(result).toBe('istanbul')
    })
  })

  describe('RTL text processing', () => {
    it('should detect RTL characters', () => {
      expect(processor.hasRTLCharacters('مرحبا')).toBe(true)
      expect(processor.hasRTLCharacters('שלום')).toBe(true)
      expect(processor.hasRTLCharacters('hello')).toBe(false)
    })

    it('should process RTL text', () => {
      const processor = new TextProcessor({ language: 'ar', handleRTL: true })
      const result = processor.process('مرحبا بك')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('Control character removal', () => {
    it('should remove control characters', () => {
      const text = 'hello\u0000\u0001world\u007f'
      const result = processor.process(text)
      expect(result).toBe('helloworld')
    })

    it('should remove zero-width characters', () => {
      const text = 'hel\u200blo\u200c\u200dworld'
      const result = processor.process(text)
      expect(result).toBe('helloworld')
    })
  })

  describe('Punctuation handling', () => {
    it('should remove punctuation by default', () => {
      const text = 'Hello, world! How are you?'
      const result = processor.process(text)
      expect(result).toBe('hello world how are you')
    })

    it('should preserve whitespace when configured', () => {
      const processor = new TextProcessor({
        removePunctuation: true,
        preserveWhitespace: true
      })
      const text = 'Hello, world!'
      const result = processor.process(text)
      expect(result).toBe('hello  world')
    })
  })

  describe('Emoji handling', () => {
    it('should preserve emoji by default', () => {
      const text = 'Hello 👋 world 🌍'
      const result = processor.process(text, { removeEmoji: false })
      expect(result).toContain('👋')
      expect(result).toContain('🌍')
    })

    it('should remove emoji when configured', () => {
      const text = 'Hello 👋 world 🌍'
      const result = processor.process(text, { removeEmoji: true })
      expect(result).not.toContain('👋')
      expect(result).not.toContain('🌍')
    })
  })

  describe('Whitespace normalization', () => {
    it('should normalize various whitespace characters', () => {
      const text = 'hello\u00a0\u2000\u3000world'
      const result = processor.process(text)
      expect(result).toBe('hello world')
    })

    it('should collapse multiple spaces', () => {
      const text = 'hello     world'
      const result = processor.process(text)
      expect(result).toBe('hello world')
    })

    it('should preserve whitespace when configured', () => {
      const processor = new TextProcessor({ preserveWhitespace: true })
      const text = 'hello     world'
      const result = processor.process(text, { preserveWhitespace: true })
      expect(result).toContain('     ')
    })
  })

  describe('Encoding detection', () => {
    it('should detect various character encodings', () => {
      const testCases = [
        { text: 'hello', expectedAscii: true },
        { text: 'café', expectedLatin: true },
        { text: 'Привет', expectedCyrillic: true },
        { text: 'مرحبا', expectedArabic: true },
        { text: 'שלום', expectedHebrew: true },
        { text: '你好', expectedCJK: true },
        { text: 'hello 👋', expectedEmoji: true }
      ]

      for (const testCase of testCases) {
        const encoding = processor.detectEncoding(testCase.text)

        if (testCase.expectedAscii) {
          expect(encoding.hasAscii).toBe(true)
        }
        if (testCase.expectedLatin) {
          expect(encoding.hasLatin).toBe(true)
        }
        if (testCase.expectedCyrillic) {
          expect(encoding.hasCyrillic).toBe(true)
        }
        if (testCase.expectedArabic) {
          expect(encoding.hasArabic).toBe(true)
        }
        if (testCase.expectedHebrew) {
          expect(encoding.hasHebrew).toBe(true)
        }
        if (testCase.expectedCJK) {
          expect(encoding.hasCJK).toBe(true)
        }
        if (testCase.expectedEmoji) {
          expect(encoding.hasEmoji).toBe(true)
        }
      }
    })
  })

  describe('Specialized processing methods', () => {
    it('should clean text for comparison', () => {
      const text = 'Héllo, Wörld! 👋'
      const result = processor.cleanForComparison(text)
      expect(result).toBe('hello world')
    })

    it('should prepare text for search', () => {
      const text = 'Héllo, Wörld! 👋'
      const result = processor.prepareForSearch(text)
      expect(result).toContain('hello')
      expect(result).toContain('world')
      expect(result).toContain(',')
      expect(result).toContain('👋')
    })
  })

  describe('Configuration management', () => {
    it('should update configuration', () => {
      processor.updateConfig({ lowercase: false })
      const config = processor.getConfig()
      expect(config.lowercase).toBe(false)
    })

    it('should return current configuration', () => {
      const config = processor.getConfig()
      expect(config).toMatchObject(DEFAULT_TEXT_PROCESSING_CONFIG)
    })
  })

  describe('Length limits', () => {
    it('should respect maximum length', () => {
      const processor = new TextProcessor({ maxLength: 10 })
      const longText = 'This is a very long text that exceeds the limit'
      const result = processor.process(longText)
      expect(result.length).toBeLessThanOrEqual(10)
    })
  })
})

describe('Utility functions', () => {
  describe('normalizeText', () => {
    it('should normalize text with default settings', () => {
      const result = normalizeText('  HELLO, WORLD!  ')
      expect(result).toBe('hello world')
    })

    it('should accept custom configuration', () => {
      const result = normalizeText('HELLO WORLD', { lowercase: false })
      expect(result).toBe('HELLO WORLD')
    })
  })

  describe('cleanTextForDetection', () => {
    it('should clean text for profanity detection', () => {
      const result = cleanTextForDetection('H3LL0, W0RLD!')
      expect(result).toBe('h3ll0 w0rld')
    })

    it('should accept language parameter', () => {
      const result = cleanTextForDetection('Müller', 'de')
      expect(result).toBe('mueller')
    })
  })

  describe('extractWords', () => {
    it('should extract meaningful words', () => {
      const words = extractWords('Hello, world! How are you?')
      expect(words).toEqual(['hello', 'world', 'how', 'are', 'you'])
    })

    it('should respect length limits', () => {
      const words = extractWords('a bb ccc dddd', 3, 10)
      expect(words).toEqual(['ccc', 'dddd'])
    })

    it('should filter out non-word characters', () => {
      const words = extractWords('123 !@# abc')
      expect(words).toEqual(['abc'])
    })
  })

  describe('isRTLText', () => {
    it('should detect RTL text', () => {
      expect(isRTLText('مرحبا')).toBe(true)
      expect(isRTLText('שלום')).toBe(true)
      expect(isRTLText('hello')).toBe(false)
    })
  })

  describe('getTextStats', () => {
    it('should return comprehensive text statistics', () => {
      const stats = getTextStats('Hello 👋 مرحبا world')

      expect(stats).toHaveProperty('length')
      expect(stats).toHaveProperty('wordCount')
      expect(stats).toHaveProperty('charCount')
      expect(stats).toHaveProperty('encoding')
      expect(stats).toHaveProperty('isRTL')
      expect(stats).toHaveProperty('hasMultipleScripts')

      expect(typeof stats.length).toBe('number')
      expect(typeof stats.wordCount).toBe('number')
      expect(typeof stats.isRTL).toBe('boolean')
      expect(typeof stats.hasMultipleScripts).toBe('boolean')

      expect(stats.hasMultipleScripts).toBe(true)
      expect(stats.isRTL).toBe(true)
    })
  })
})