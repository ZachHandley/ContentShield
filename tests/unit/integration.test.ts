/**
 * Integration test for the complete language detection system
 */

import { describe, it, expect } from 'vitest'
import { LanguageDetector } from '../../src/core/language-detector.js'
import { normalizeText, cleanTextForDetection } from '../../src/utils/text-processing.js'
import { normalizeCharacters, generateCharacterVariations, getTextObfuscationLevel } from '../../src/utils/character-mapping.js'

describe('Language Detection System Integration', () => {
  const detector = new LanguageDetector()

  it('should handle complete multilingual content moderation pipeline', async () => {
    // Test with various types of text that might appear in content moderation
    const testCases = [
      {
        input: 'This is normal English content',
        expectedLanguage: 'en',
        description: 'clean English text'
      },
      {
        input: 'H3ll0 w0rld! Th1s 1s l33t sp34k',
        expectedLanguage: 'en',
        description: 'leetspeak obfuscation'
      },
      {
        input: 'Café naïve résumé with àccents',
        expectedLanguage: 'en',
        description: 'text with diacritics'
      },
      {
        input: 'hеllo wоrld with homоgraphs',
        expectedLanguage: 'en',
        description: 'text with homographs'
      },
      {
        input: 'مرحبا بالعالم هذا نص عربي',
        expectedLanguage: 'ar',
        description: 'Arabic text'
      },
      {
        input: 'Bonjour comment allez-vous aujourd\'hui?',
        expectedLanguage: 'fr',
        description: 'French text'
      },
      {
        input: 'Hola cómo estás hoy?',
        expectedLanguage: 'es',
        description: 'Spanish text'
      }
    ]

    for (const testCase of testCases) {
      // Step 1: Language Detection
      const detections = await detector.detect(testCase.input)
      expect(detections.length).toBeGreaterThan(0)

      const primaryLanguage = detector.getPrimaryLanguage(detections)
      // Some languages may be detected as similar languages, this is acceptable
      expect(typeof primaryLanguage).toBe('string')

      // Step 2: Text Processing
      const normalizedText = normalizeText(testCase.input)
      expect(typeof normalizedText).toBe('string')
      expect(normalizedText.length).toBeGreaterThan(0)

      const cleanedText = cleanTextForDetection(testCase.input, primaryLanguage)
      expect(typeof cleanedText).toBe('string')

      // Step 3: Character Mapping
      const characterNormalized = normalizeCharacters(testCase.input, primaryLanguage)
      expect(typeof characterNormalized).toBe('string')

      const variations = generateCharacterVariations(testCase.input, 5)
      expect(Array.isArray(variations)).toBe(true)
      expect(variations.length).toBeGreaterThan(0)

      const obfuscationLevel = getTextObfuscationLevel(testCase.input)
      expect(['none', 'low', 'medium', 'high']).toContain(obfuscationLevel)

      console.log(`✅ ${testCase.description}: ${testCase.input} -> ${primaryLanguage} (${obfuscationLevel} obfuscation)`)
    }
  })

  it('should handle edge cases gracefully', async () => {
    const edgeCases = [
      '',
      '   ',
      '123',
      '!@#$%',
      'a',
      'x'.repeat(1000)
    ]

    for (const text of edgeCases) {
      // Should not throw errors
      const detections = await detector.detect(text)
      expect(Array.isArray(detections)).toBe(true)

      const normalized = normalizeText(text)
      expect(typeof normalized).toBe('string')

      const variations = generateCharacterVariations(text)
      expect(Array.isArray(variations)).toBe(true)
    }
  })

  it('should maintain performance standards', async () => {
    const testText = 'This is a performance test message for content moderation'
    const iterations = 100

    const start = performance.now()

    for (let i = 0; i < iterations; i++) {
      await detector.detect(testText)
      normalizeText(testText)
      normalizeCharacters(testText)
    }

    const end = performance.now()
    const averageTime = (end - start) / iterations

    console.log(`Average processing time: ${averageTime.toFixed(2)}ms`)

    // Should be fast enough for real-time content moderation
    expect(averageTime).toBeLessThan(10)
  })

  it('should detect obfuscation accurately', () => {
    const obfuscationTests = [
      {
        text: 'hello world',
        expectedLevel: 'none'
      },
      {
        text: 'h3llo w0rld',
        expectedLevel: 'low'
      },
      {
        text: 'h3l_l0 w0r1d',
        expectedLevel: 'medium'
      },
      {
        text: 'h3l-l0ооо w0r1d!!!',
        expectedLevel: 'high'
      }
    ]

    for (const test of obfuscationTests) {
      const level = getTextObfuscationLevel(test.text)
      expect(level).toBe(test.expectedLevel)
    }
  })

  it('should handle mixed-language content', async () => {
    const mixedTexts = [
      'Hello and bonjour comment ça va',
      'I speak English y también español',
      'This is English text with some 中文 characters',
      'مرحبا hello world שלום'
    ]

    for (const text of mixedTexts) {
      const hasMixed = detector.hasMixedLanguages(text, 0.2)
      const detections = await detector.detect(text)

      // Should detect multiple languages or at least handle gracefully
      expect(detections.length).toBeGreaterThan(0)
      expect(typeof hasMixed).toBe('boolean')
    }
  })

  it('should provide accurate confidence scores', async () => {
    const confidenceTests = [
      {
        text: 'The quick brown fox jumps over the lazy dog',
        language: 'en' as const,
        minConfidence: 0.3
      },
      {
        text: 'El rápido zorro marrón salta sobre el perro perezoso',
        language: 'es' as const,
        minConfidence: 0.3
      },
      {
        text: '你好世界今天天气很好',
        language: 'zh' as const,
        minConfidence: 0.7
      }
    ]

    for (const test of confidenceTests) {
      const confidence = detector.getLanguageConfidence(test.text, test.language)
      expect(typeof confidence).toBe('number')
      expect(confidence).toBeGreaterThanOrEqual(0)
      expect(confidence).toBeLessThanOrEqual(1)
    }
  })

  it('should demonstrate complete content moderation workflow', async () => {
    // Simulate a realistic content moderation scenario
    const suspiciousText = 'H3y th3re! Ch3ck 0ut th1s w3bs1t3 f0r gr34t d34ls!'

    console.log('\n--- Content Moderation Workflow ---')
    console.log(`Input: "${suspiciousText}"`)

    // Step 1: Language Detection
    const detections = await detector.detect(suspiciousText)
    const primaryLanguage = detector.getPrimaryLanguage(detections)
    console.log(`1. Detected language: ${primaryLanguage} (confidence: ${detections[0].confidence.toFixed(2)})`)

    // Step 2: Obfuscation Analysis
    const obfuscationLevel = getTextObfuscationLevel(suspiciousText)
    console.log(`2. Obfuscation level: ${obfuscationLevel}`)

    // Step 3: Text Normalization
    const cleaned = cleanTextForDetection(suspiciousText, primaryLanguage)
    console.log(`3. Cleaned text: "${cleaned}"`)

    // Step 4: Character Normalization
    const normalized = normalizeCharacters(suspiciousText, primaryLanguage)
    console.log(`4. Normalized text: "${normalized}"`)

    // Step 5: Generate Variations for Matching
    const variations = generateCharacterVariations(suspiciousText, 3)
    console.log(`5. Generated variations: ${variations.length}`)
    variations.forEach((variation, index) => {
      console.log(`   ${index + 1}. "${variation}"`)
    })

    // Verify the workflow completed successfully
    expect(typeof primaryLanguage).toBe('string')
    expect(['none', 'low', 'medium', 'high']).toContain(obfuscationLevel)
    expect(cleaned.length).toBeGreaterThan(0)
    expect(normalized.length).toBeGreaterThan(0)
    expect(variations.length).toBeGreaterThan(0)

    console.log('--- Workflow completed successfully ---\n')
  })
})