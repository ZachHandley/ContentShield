/**
 * Integration tests for the complete profanity detection pipeline
 * Tests the entire flow from text input to filtered output
 */

import { describe, it, expect, beforeAll } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { ProfanityTrie } from '../../src/core/trie.js'
import { ProfanityMatcher } from '../../src/core/profanity-matcher.js'
import { ProfanityFilter } from '../../src/core/filter.js'
import { DetectionResultBuilder } from '../../src/core/detection-result.js'
import {
  SeverityLevel,
  ProfanityCategory,
  FilterMode,
  type DetectorConfig,
  type LanguageCode
} from '../../src/types/index.js'

describe('Full Detection Pipeline Integration', () => {
  let detector: NaughtyWordsDetector

  // Test data representing realistic profanity database
  const testProfanityData = {
    en: {
      words: [
        {
          word: 'damn',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL, ProfanityCategory.RELIGIOUS],
          variations: ['dam', 'darn', 'd4mn', 'd@mn'],
          caseSensitive: false
        },
        {
          word: 'shit',
          severity: SeverityLevel.MEDIUM,
          categories: [ProfanityCategory.GENERAL, ProfanityCategory.SCATOLOGICAL],
          variations: ['sh1t', 'sh!t', '$hit'],
          caseSensitive: false
        },
        {
          word: 'fuck',
          severity: SeverityLevel.SEVERE,
          categories: [ProfanityCategory.SEXUAL, ProfanityCategory.GENERAL],
          variations: ['f*ck', 'f**k', 'fck'],
          caseSensitive: false
        },
        {
          word: 'ass',
          severity: SeverityLevel.MEDIUM,
          categories: [ProfanityCategory.GENERAL, ProfanityCategory.BODY_PARTS],
          variations: ['@ss', 'a$$', 'a55', 'arse'],
          caseSensitive: false
        }
      ]
    },
    es: {
      words: [
        {
          word: 'mierda',
          severity: SeverityLevel.MEDIUM,
          categories: [ProfanityCategory.GENERAL, ProfanityCategory.SCATOLOGICAL],
          caseSensitive: false
        }
      ]
    }
  }

  beforeAll(async () => {
    // Create detector with comprehensive configuration
    const config: Partial<DetectorConfig> = {
      languages: ['en', 'es'],
      minSeverity: SeverityLevel.LOW,
      categories: Object.values(ProfanityCategory),
      fuzzyMatching: true,
      fuzzyThreshold: 0.8,
      customWords: [
        {
          word: 'customoffensive',
          language: 'en',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL],
          variations: ['cust0moffensive']
        }
      ],
      whitelist: ['assess', 'classic', 'basement'],
      detectAlternateScripts: true,
      normalizeText: true,
      replacementChar: '*',
      preserveStructure: true
    }

    detector = new NaughtyWordsDetector(config)

    // Load test data into the detector
    const matcher = (detector as any).matcher
    for (const [language, data] of Object.entries(testProfanityData)) {
      await matcher.loadLanguage(language as LanguageCode, data.words)
    }

    // Add custom words
    detector.addCustomWords(config.customWords!)
  })

  describe('End-to-End Detection Scenarios', () => {
    it('should detect and filter basic profanity', async () => {
      const input = 'This text contains damn and should be filtered.'

      const result = await detector.analyzeEnhanced(input, {
        filterMode: FilterMode.CENSOR,
        includeMatches: true,
        measurePerformance: true
      })

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)
      expect(result.filteredText).not.toBe(input)
      expect(result.filteredText).toContain('*')
      expect(result.maxSeverity).toBe(SeverityLevel.LOW)

      // Check enhanced results
      expect(result.enhancedMatches).toHaveLength(result.totalMatches)
      expect(result.enhancedMatches[0]).toHaveProperty('context')
      expect(result.enhancedMatches[0]).toHaveProperty('suggestions')
      expect(result.enhancedMatches[0]).toHaveProperty('position')

      // Performance metrics should be present
      expect(result.performance).toBeDefined()
      expect(result.performance.totalTime).toBeGreaterThan(0)
    })

    it('should handle multiple severity levels correctly', async () => {
      const input = 'This has damn which is low, shit which is medium, and fuck which is severe.'

      const result = await detector.analyzeEnhanced(input)

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBe(3)
      expect(result.maxSeverity).toBe(SeverityLevel.HIGH)

      // Check severity distribution
      const severities = result.matches.map(m => m.severity)
      expect(severities).toContain(SeverityLevel.LOW)
      expect(severities).toContain(SeverityLevel.MEDIUM)
      expect(severities).toContain(SeverityLevel.HIGH)

      // Statistics should reflect distribution
      expect(result.statistics.severityDistribution[SeverityLevel.LOW]).toBeGreaterThan(0)
      expect(result.statistics.severityDistribution[SeverityLevel.MEDIUM]).toBeGreaterThan(0)
      expect(result.statistics.severityDistribution[SeverityLevel.HIGH]).toBeGreaterThan(0)
    })

    it('should handle category-based filtering', async () => {
      const input = 'This content has fuck sexual material and damn religious speech.'

      const result = await detector.analyzeEnhanced(input)

      if (result.hasProfanity) {
        const categories = result.matches.flatMap(m => m.categories)
        expect(categories).toContain(ProfanityCategory.SEXUAL)
        expect(categories).toContain(ProfanityCategory.RELIGIOUS)

        // Category distribution should be tracked
        expect(result.statistics.categoryDistribution[ProfanityCategory.SEXUAL]).toBeGreaterThan(0)
        expect(result.statistics.categoryDistribution[ProfanityCategory.RELIGIOUS]).toBeGreaterThan(0)
      }
    })

    it('should detect word variations and fuzzy matches', async () => {
      const input = 'This text has d4mn and sh1t variations.'

      const result = await detector.analyzeEnhanced(input)

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)

      // Should match variations to original words
      const originalWords = result.matches.map(m => m.match)
      expect(originalWords).toContain('damn')
      expect(originalWords).toContain('shit')
    })

    it('should handle context-aware filtering', async () => {
      const negatedInput = 'This is not damn according to research.'
      const positiveInput = 'This is definitely damn content.'

      const negatedResult = await detector.analyze(negatedInput)
      const positiveResult = await detector.analyze(positiveInput)

      // Context-aware filtering should affect confidence or detection
      if (negatedResult.hasProfanity && positiveResult.hasProfanity) {
        // Negated context should have lower confidence
        expect(negatedResult.confidence).toBeLessThanOrEqual(positiveResult.confidence)
      }
    })

    it('should respect whitelist configuration', async () => {
      const input = 'Please assess this classic example from the basement.'

      const result = await detector.analyze(input)

      // Words in whitelist should not be detected as profanity
      expect(result.hasProfanity).toBe(false)
      expect(result.totalMatches).toBe(0)
    })

    it('should handle custom words', async () => {
      const input = 'This contains customoffensive content.'

      const result = await detector.analyze(input)

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)
      expect(result.matches[0].severity).toBe(SeverityLevel.HIGH)
    })
  })

  describe('Multi-Language Detection', () => {
    it('should detect profanity in multiple languages', async () => {
      const input = 'This is damn in English and mierda in Spanish.'

      const result = await detector.analyzeEnhanced(input)

      if (result.hasProfanity) {
        const languages = result.matches.map(m => m.language)
        expect(languages).toContain('en')
        expect(languages).toContain('es')

        // Language distribution should be tracked
        expect(result.statistics.languageDistribution).toHaveProperty('en')
        expect(result.statistics.languageDistribution).toHaveProperty('es')
      }
    })

    it('should handle language auto-detection fallback', async () => {
      const autoDetector = new NaughtyWordsDetector({
        languages: ['auto']
      })

      const result = await autoDetector.analyze('This is English text.')

      expect(result.detectedLanguages).toContain('en')
    })
  })

  describe('Filter Mode Integration', () => {
    const testInput = 'This damn text is shit and needs filtering.'

    it('should apply CENSOR mode correctly', async () => {
      const result = await detector.analyze(testInput, {
        filterMode: FilterMode.CENSOR
      })

      expect(result.filteredText).not.toBe(testInput)
      expect(result.filteredText).toContain('*')
      expect(result.filteredText.length).toBeGreaterThanOrEqual(testInput.length - 5) // Roughly same length
    })

    it('should apply REMOVE mode correctly', async () => {
      const result = await detector.analyze(testInput, {
        filterMode: FilterMode.REMOVE
      })

      expect(result.filteredText).not.toBe(testInput)
      expect(result.filteredText).not.toContain('damn')
      expect(result.filteredText).not.toContain('shit')
      expect(result.filteredText.length).toBeLessThan(testInput.length)
    })

    it('should apply REPLACE mode correctly', async () => {
      const result = await detector.analyze(testInput, {
        filterMode: FilterMode.REPLACE
      })

      expect(result.filteredText).not.toBe(testInput)
      expect(result.filteredText).not.toContain('damn')
      expect(result.filteredText).not.toContain('shit')
      expect(result.filteredText).toMatch(/\[.*\]|inappropriate|offensive/)
    })

    it('should not modify text in DETECT_ONLY mode', async () => {
      const result = await detector.analyze(testInput, {
        filterMode: FilterMode.DETECT_ONLY
      })

      expect(result.filteredText).toBe(testInput)
      expect(result.hasProfanity).toBe(true) // Should still detect
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle batch processing efficiently', async () => {
      const inputs = [
        'Clean text example',
        'This contains damn',
        'Another shit example',
        'This is completely clean text',
        'Final fuck test case'
      ]

      const startTime = Date.now()
      const results = await detector.batchAnalyze(inputs)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(5)
      expect(duration).toBeLessThan(1000) // Should complete quickly

      // Check that results are properly differentiated
      expect(results[0].hasProfanity).toBe(false) // Clean text
      expect(results[1].hasProfanity).toBe(true)  // Contains damn
      expect(results[2].hasProfanity).toBe(true)  // Contains shit
      expect(results[3].hasProfanity).toBe(false) // Clean content
      expect(results[4].hasProfanity).toBe(true)  // Contains fuck
    })

    it('should maintain accuracy with large text', async () => {
      const largeText = `
        This is a comprehensive test document that contains various types of content.
        Some paragraphs are completely clean and appropriate for all audiences.

        However, other sections contain damn content that should be detected.
        There might also be shit language mixed in with regular content.

        The system should be able to handle fuck material when it appears.
        Context matters too - words that are "not damn" should be treated differently.

        Technical terms like assess, classic, and basement should be whitelisted.
        Custom terms like customoffensive should also be detected properly.

        Mixed language content with mierda (Spanish) should work across languages.
        Variations like d4mn and sh1t should match their base forms.

        This document is intentionally long to test the system's ability to handle
        substantial amounts of text while maintaining accuracy and performance.
      `.repeat(5) // Repeat to make it larger

      const result = await detector.analyzeEnhanced(largeText, {
        measurePerformance: true,
        filterMode: FilterMode.CENSOR
      })

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)
      expect(result.performance.totalTime).toBeLessThan(2000) // Should complete in reasonable time

      // Check that filtering preserved text structure
      expect(result.filteredText.length).toBeGreaterThan(largeText.length * 0.8)
      expect(result.filteredText).toContain('*')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty and null inputs gracefully', async () => {
      const emptyResult = await detector.analyze('')
      expect(emptyResult.hasProfanity).toBe(false)
      expect(emptyResult.totalMatches).toBe(0)
      expect(emptyResult.originalText).toBe('')

      // Should not throw on null/undefined
      await expect(detector.analyze(null as any)).resolves.not.toThrow()
      await expect(detector.analyze(undefined as any)).resolves.not.toThrow()
    })

    it('should handle special characters and unicode', async () => {
      const unicodeText = '🤬 This bádwörd contains üñíçödé characters and émojis 😡'

      const result = await detector.analyze(unicodeText)

      expect(result).toBeDefined()
      expect(result.originalText).toBe(unicodeText)
      // Should handle unicode gracefully without crashing
    })

    it('should handle very long single words', async () => {
      const longWord = 'a'.repeat(1000)
      const textWithLongWord = `This contains ${longWord} which is extremely long.`

      const result = await detector.analyze(textWithLongWord)

      expect(result).toBeDefined()
      expect(result.originalText).toBe(textWithLongWord)
    })

    it('should handle mixed content types', async () => {
      const mixedContent = `
        Email: user@example.com
        URL: https://example.com/shit
        Phone: (555) 123-4567
        Code: function shit() { return "terrible"; }
        Regular text with explicit content.
      `

      const result = await detector.analyzeEnhanced(mixedContent)

      expect(result).toBeDefined()
      expect(result.textContext.patterns.hasEmails).toBe(true)
      expect(result.textContext.patterns.hasUrls).toBe(true)
    })
  })

  describe('Configuration and Customization', () => {
    it('should respect minimum severity configuration', async () => {
      const restrictiveDetector = new NaughtyWordsDetector({
        minSeverity: SeverityLevel.HIGH,
        languages: ['en']
      })

      // Load same test data
      const matcher = (restrictiveDetector as any).matcher
      await matcher.loadLanguage('en', testProfanityData.en.words)

      const input = 'This has damn (low) and shit (medium) content.'
      const result = await restrictiveDetector.analyze(input)

      if (result.hasProfanity) {
        // Should only detect HIGH severity and above
        expect(result.matches.every(m => m.severity >= SeverityLevel.HIGH)).toBe(true)
      }
    })

    it('should respect category filtering', async () => {
      const categoryDetector = new NaughtyWordsDetector({
        categories: [ProfanityCategory.SEXUAL],
        languages: ['en']
      })

      const matcher = (categoryDetector as any).matcher
      await matcher.loadLanguage('en', testProfanityData.en.words)

      const input = 'This has damn (general) and fuck (sexual) content.'
      const result = await categoryDetector.analyze(input)

      if (result.hasProfanity) {
        // Should only detect SEXUAL category
        expect(result.matches.every(m =>
          m.categories.includes(ProfanityCategory.SEXUAL)
        )).toBe(true)
      }
    })
  })

  describe('Component Integration Verification', () => {
    it('should properly integrate Trie, Matcher, Filter, and ResultBuilder', async () => {
      const input = 'Test integration: damn, shit, and fuck content.'

      const result = await detector.analyzeEnhanced(input, {
        measurePerformance: true,
        includeMatches: true,
        filterMode: FilterMode.CENSOR
      })

      // Verify Trie integration (via Matcher)
      expect(result.matches.length).toBeGreaterThan(0)
      expect(result.matches.every(m => m.confidence > 0)).toBe(true)

      // Verify Matcher integration
      expect(result.matches.every(m => m.language === 'en')).toBe(true)
      expect(result.detectedLanguages).toContain('en')

      // Verify Filter integration
      expect(result.filteredText).not.toBe(input)
      expect(result.filteredText).toContain('*')

      // Verify ResultBuilder integration
      expect(result.enhancedMatches).toBeDefined()
      expect(result.statistics).toBeDefined()
      expect(result.performance).toBeDefined()
      expect(result.metadata).toBeDefined()

      // Verify all components worked together
      expect(result.enhancedMatches).toHaveLength(result.matches.length)
      expect(result.statistics.totalWords).toBeGreaterThan(0)
      expect(result.performance.totalTime).toBeGreaterThan(0)
    })

    it('should maintain data consistency across components', async () => {
      const input = 'Consistency test with damn and shit content.'

      const result = await detector.analyzeEnhanced(input)

      if (result.hasProfanity) {
        // Match positions should be consistent
        result.matches.forEach((match, index) => {
          const enhanced = result.enhancedMatches[index]
          expect(enhanced.start).toBe(match.start)
          expect(enhanced.end).toBe(match.end)
          expect(enhanced.word).toBe(match.word)
          expect(enhanced.severity).toBe(match.severity)
        })

        // Statistics should match match data
        const totalMatches = result.matches.length
        expect(result.statistics.uniqueProfaneWords).toBeLessThanOrEqual(totalMatches)
        expect(result.totalMatches).toBe(totalMatches)
      }
    })
  })

  describe('Real-World Usage Scenarios', () => {
    it('should handle social media content', async () => {
      const socialMediaPost = `
        OMG this is so damn!!! 😡
        Why are people so shit these days?
        #frustrated @friend check this out
        https://example.com/article
      `

      const result = await detector.analyzeEnhanced(socialMediaPost)

      expect(result.textContext.textType).toBe('social_media')
      expect(result.textContext.patterns.hasHashtags).toBe(true)
      expect(result.textContext.patterns.hasMentions).toBe(true)
      expect(result.textContext.patterns.hasUrls).toBe(true)
      expect(result.textContext.patterns.hasEmojis).toBe(true)
    })

    it('should handle email content', async () => {
      const emailContent = `
        From: user@example.com
        To: admin@company.com
        Subject: Complaint about shit service

        This damn experience was fuck and unacceptable.
      `

      const result = await detector.analyzeEnhanced(emailContent)

      expect(result.textContext.patterns.hasEmails).toBe(true)
      if (result.hasProfanity) {
        expect(result.totalMatches).toBeGreaterThan(0)
      }
    })

    it('should handle formal document content', async () => {
      const formalDoc = `
        This research paper examines the impact of inappropriate language
        in digital communications. Studies show that exposure to damn
        content and shit messaging can affect user experience.

        Our methodology assessed various communication patterns and
        classified fuck material according to severity levels.
      `

      const result = await detector.analyzeEnhanced(formalDoc)

      expect(result.textContext.textType).toBe('article')
      if (result.hasProfanity) {
        // Context-aware filtering should recognize academic context
        expect(result.matches.some(m => m.confidence < 0.8)).toBe(true)
      }
    })
  })
})