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
          word: 'badword',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL],
          variations: ['b4dword', 'badw0rd', 'b@dword'],
          caseSensitive: false
        },
        {
          word: 'terrible',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.VIOLENCE, ProfanityCategory.GENERAL],
          variations: ['terrib1e', 't3rrible'],
          caseSensitive: false
        },
        {
          word: 'explicit',
          severity: SeverityLevel.SEVERE,
          categories: [ProfanityCategory.SEXUAL],
          variations: ['3xplicit', 'expl1cit'],
          caseSensitive: false
        },
        {
          word: 'hate',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.HATE_SPEECH],
          caseSensitive: false
        }
      ]
    },
    es: {
      words: [
        {
          word: 'malo',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL],
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
      const input = 'This text contains badword and should be filtered.'

      const result = await detector.analyzeEnhanced(input, {
        filterMode: FilterMode.CENSOR,
        includeMatches: true,
        measurePerformance: true
      })

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)
      expect(result.filteredText).not.toBe(input)
      expect(result.filteredText).toContain('*')
      expect(result.maxSeverity).toBe(SeverityLevel.MODERATE)

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
      const input = 'This has badword which is moderate, terrible which is high, and explicit which is severe.'

      const result = await detector.analyzeEnhanced(input)

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBe(3)
      expect(result.maxSeverity).toBe(SeverityLevel.SEVERE)

      // Check severity distribution
      const severities = result.matches.map(m => m.severity)
      expect(severities).toContain(SeverityLevel.MODERATE)
      expect(severities).toContain(SeverityLevel.HIGH)
      expect(severities).toContain(SeverityLevel.SEVERE)

      // Statistics should reflect distribution
      expect(result.statistics.severityDistribution[SeverityLevel.MODERATE]).toBeGreaterThan(0)
      expect(result.statistics.severityDistribution[SeverityLevel.HIGH]).toBeGreaterThan(0)
      expect(result.statistics.severityDistribution[SeverityLevel.SEVERE]).toBeGreaterThan(0)
    })

    it('should handle category-based filtering', async () => {
      const input = 'This content has explicit sexual material and hate speech.'

      const result = await detector.analyzeEnhanced(input)

      if (result.hasProfanity) {
        const categories = result.matches.flatMap(m => m.categories)
        expect(categories).toContain(ProfanityCategory.SEXUAL)
        expect(categories).toContain(ProfanityCategory.HATE_SPEECH)

        // Category distribution should be tracked
        expect(result.statistics.categoryDistribution[ProfanityCategory.SEXUAL]).toBeGreaterThan(0)
        expect(result.statistics.categoryDistribution[ProfanityCategory.HATE_SPEECH]).toBeGreaterThan(0)
      }
    })

    it('should detect word variations and fuzzy matches', async () => {
      const input = 'This text has b4dword and terrib1e variations.'

      const result = await detector.analyzeEnhanced(input)

      expect(result.hasProfanity).toBe(true)
      expect(result.totalMatches).toBeGreaterThan(0)

      // Should match variations to original words
      const originalWords = result.matches.map(m => m.match)
      expect(originalWords).toContain('badword')
      expect(originalWords).toContain('terrible')
    })

    it('should handle context-aware filtering', async () => {
      const negatedInput = 'This is not badword according to research.'
      const positiveInput = 'This is definitely badword content.'

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
      const input = 'This is badword in English and malo in Spanish.'

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
    const testInput = 'This badword text is terrible and needs filtering.'

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
      expect(result.filteredText).not.toContain('badword')
      expect(result.filteredText).not.toContain('terrible')
      expect(result.filteredText.length).toBeLessThan(testInput.length)
    })

    it('should apply REPLACE mode correctly', async () => {
      const result = await detector.analyze(testInput, {
        filterMode: FilterMode.REPLACE
      })

      expect(result.filteredText).not.toBe(testInput)
      expect(result.filteredText).not.toContain('badword')
      expect(result.filteredText).not.toContain('terrible')
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
        'This contains badword',
        'Another terrible example',
        'More clean content here',
        'Final explicit test case'
      ]

      const startTime = Date.now()
      const results = await detector.batchAnalyze(inputs)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(5)
      expect(duration).toBeLessThan(1000) // Should complete quickly

      // Check that results are properly differentiated
      expect(results[0].hasProfanity).toBe(false) // Clean text
      expect(results[1].hasProfanity).toBe(true)  // Contains badword
      expect(results[2].hasProfanity).toBe(true)  // Contains terrible
      expect(results[3].hasProfanity).toBe(false) // Clean content
      expect(results[4].hasProfanity).toBe(true)  // Contains explicit
    })

    it('should maintain accuracy with large text', async () => {
      const largeText = `
        This is a comprehensive test document that contains various types of content.
        Some paragraphs are completely clean and appropriate for all audiences.

        However, other sections contain badword content that should be detected.
        There might also be terrible language mixed in with regular content.

        The system should be able to handle explicit material when it appears.
        Context matters too - words that are "not badword" should be treated differently.

        Technical terms like assess, classic, and basement should be whitelisted.
        Custom terms like customoffensive should also be detected properly.

        Mixed language content with malo (Spanish) should work across languages.
        Variations like b4dword and terrib1e should match their base forms.

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
        URL: https://example.com/badword
        Phone: (555) 123-4567
        Code: function badword() { return "terrible"; }
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

      const input = 'This has badword (moderate) and terrible (high) content.'
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

      const input = 'This has badword (general) and explicit (sexual) content.'
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
      const input = 'Test integration: badword, terrible, and explicit content.'

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
      const input = 'Consistency test with badword and terrible content.'

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
        OMG this is so badword!!! 😡
        Why are people so terrible these days?
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
        Subject: Complaint about terrible service

        This badword experience was explicit and unacceptable.
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
        in digital communications. Studies show that exposure to badword
        content and terrible messaging can affect user experience.

        Our methodology assessed various communication patterns and
        classified explicit material according to severity levels.
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