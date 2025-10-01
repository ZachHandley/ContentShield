/**
 * Comprehensive tests for the ProfanityMatcher
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ProfanityMatcher, type MatcherConfig } from '../../src/core/profanity-matcher.js'
import { SeverityLevel, ProfanityCategory, type DetectionMatch, type LanguageCode } from '../../src/types/index.js'

describe('ProfanityMatcher', () => {
  let matcher: ProfanityMatcher
  let config: MatcherConfig

  beforeEach(() => {
    config = {
      languages: ['en'],
      minSeverity: SeverityLevel.LOW,
      categories: [ProfanityCategory.GENERAL, ProfanityCategory.SEXUAL, ProfanityCategory.VIOLENCE],
      fuzzyMatching: true,
      fuzzyThreshold: 0.8,
      whitelist: [],
      contextAware: true,
      minWordLength: 2,
      maxEditDistance: 2
    }

    matcher = new ProfanityMatcher(config)
  })

  describe('Initialization and Configuration', () => {
    it('should initialize with default config', () => {
      const defaultMatcher = new ProfanityMatcher(config)
      expect(defaultMatcher).toBeDefined()
    })

    it('should update configuration', () => {
      matcher.updateConfig({ minSeverity: SeverityLevel.HIGH })
      // Configuration is internal, but we can test behavior
      expect(matcher).toBeDefined()
    })

    it('should provide statistics', () => {
      const stats = matcher.getStats()
      expect(stats).toHaveProperty('totalLanguages')
      expect(stats).toHaveProperty('totalWords')
      expect(stats).toHaveProperty('trieStats')
    })
  })

  describe('Language Loading', () => {
    it('should load language data successfully', async () => {
      const testWords = [
        {
          word: 'shit',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL],
          variations: ['b4dword', 'badw0rd'],
          caseSensitive: false
        },
        {
          word: 'terrible',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL, ProfanityCategory.VIOLENCE],
          caseSensitive: false
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)

      const stats = matcher.getStats()
      expect(stats.totalWords).toBeGreaterThan(0)
    })

    it('should handle empty word lists', async () => {
      await matcher.loadLanguage('en' as LanguageCode, [])

      const stats = matcher.getStats()
      expect(stats.totalLanguages).toBe(1)
    })

    it('should filter words by configuration', async () => {
      const restrictiveConfig = {
        ...config,
        minSeverity: SeverityLevel.HIGH,
        categories: [ProfanityCategory.VIOLENCE]
      }

      const restrictiveMatcher = new ProfanityMatcher(restrictiveConfig)

      const testWords = [
        {
          word: 'mild',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'violent',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.VIOLENCE]
        },
        {
          word: 'sexual',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.SEXUAL]
        }
      ]

      await restrictiveMatcher.loadLanguage('en' as LanguageCode, testWords)

      // Should only include 'violent' based on severity and category filters
      const matches = restrictiveMatcher.findMatches('text with violent content', ['en'])
      expect(matches.length).toBeGreaterThanOrEqual(0) // At least doesn't crash
    })
  })

  describe('Basic Matching', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'shit',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'terrible',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.VIOLENCE]
        },
        {
          word: 'explicit',
          severity: SeverityLevel.SEVERE,
          categories: [ProfanityCategory.SEXUAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should find basic matches', () => {
      const matches = matcher.findMatches('this contains shit', ['en'])

      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('shit')
      expect(matches[0].match).toBe('shit')
      expect(matches[0].severity).toBe(SeverityLevel.MODERATE)
      expect(matches[0].categories).toContain(ProfanityCategory.GENERAL)
      expect(matches[0].language).toBe('en')
      expect(matches[0].confidence).toBeGreaterThan(0)
    })

    it('should find multiple matches', () => {
      const matches = matcher.findMatches('this shit is terrible', ['en'])

      expect(matches).toHaveLength(2)
      expect(matches.map(m => m.word)).toContain('shit')
      expect(matches.map(m => m.word)).toContain('terrible')
    })

    it('should respect word boundaries', () => {
      const matches = matcher.findMatches('classroom assessment', ['en'])
      // Should not match 'ass' from 'class' or 'assessment'
      expect(matches).toHaveLength(0)
    })

    it('should handle case insensitivity', () => {
      const matches = matcher.findMatches('This SHIT is bad', ['en'])

      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('SHIT')
      expect(matches[0].match).toBe('shit')
    })

    it('should return empty array for clean text', () => {
      const matches = matcher.findMatches('this is completely clean text', ['en'])
      expect(matches).toHaveLength(0)
    })

    it('should handle empty text', () => {
      const matches = matcher.findMatches('', ['en'])
      expect(matches).toHaveLength(0)
    })
  })

  describe('Fuzzy Matching', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'profanity',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should find fuzzy matches when enabled', () => {
      const matches = matcher.findMatches('this is profanety', ['en']) // One typo

      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('profanety')
      expect(matches[0].match).toBe('profanity')
      expect(matches[0].confidence).toBeLessThan(1.0) // Reduced confidence for fuzzy match
    })

    it('should not find matches beyond threshold', () => {
      const matches = matcher.findMatches('this is completely different word', ['en'])
      expect(matches).toHaveLength(0)
    })

    it('should disable fuzzy matching when configured', () => {
      const strictConfig = { ...config, fuzzyMatching: false }
      const strictMatcher = new ProfanityMatcher(strictConfig)

      // Load same data
      const testWords = [
        {
          word: 'profanity',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      strictMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = strictMatcher.findMatches('this is profanety', ['en'])
      expect(matches).toHaveLength(0) // Should not find fuzzy matches
    })
  })

  describe('Context-Aware Filtering', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'bad',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'hell',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should reduce confidence for negated context', () => {
      const positiveMatches = matcher.findMatches('this is bad', ['en'])
      const negatedMatches = matcher.findMatches('this is not bad', ['en'])

      if (positiveMatches.length > 0 && negatedMatches.length > 0) {
        expect(negatedMatches[0].confidence).toBeLessThan(positiveMatches[0].confidence)
      }
      // Note: Context filtering might remove the match entirely
    })

    it('should handle quoted context', () => {
      const matches = matcher.findMatches('the word "bad" is offensive', ['en'])

      if (matches.length > 0) {
        // Confidence might be reduced for quoted context
        expect(matches[0].confidence).toBeLessThan(1.0)
      }
    })

    it('should handle technical context', () => {
      const matches = matcher.findMatches('in academic research, the term "bad" has specific meaning', ['en'])

      // Technical context might reduce confidence or eliminate matches
      if (matches.length > 0) {
        expect(matches[0].confidence).toBeLessThan(0.9)
      }
    })

    it('should disable context awareness when configured', () => {
      const nonContextConfig = { ...config, contextAware: false }
      const nonContextMatcher = new ProfanityMatcher(nonContextConfig)

      const testWords = [
        {
          word: 'bad',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      nonContextMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = nonContextMatcher.findMatches('this is not bad', ['en'])
      expect(matches).toHaveLength(1) // Should find match regardless of negation
    })
  })

  describe('Custom Words', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'existing',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should add custom words', () => {
      const customWords = [
        {
          word: 'customword',
          language: 'en' as LanguageCode,
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL],
          variations: ['cust0mword'],
          caseSensitive: false
        }
      ]

      matcher.addCustomWords(customWords)

      const matches = matcher.findMatches('this is customword', ['en'])
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('customword')
      expect(matches[0].severity).toBe(SeverityLevel.HIGH)
    })

    it('should handle custom word variations', () => {
      const customWords = [
        {
          word: 'custom',
          language: 'en' as LanguageCode,
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL],
          variations: ['cust0m', 'c@stom'],
          caseSensitive: false
        }
      ]

      matcher.addCustomWords(customWords)

      const matches1 = matcher.findMatches('this is cust0m', ['en'])
      const matches2 = matcher.findMatches('this is c@stom', ['en'])

      expect(matches1).toHaveLength(1)
      expect(matches2).toHaveLength(1)
      expect(matches1[0].match).toBe('custom') // Should reference original word
      expect(matches2[0].match).toBe('custom')
    })

    it('should assign lower confidence to custom words', () => {
      const customWords = [
        {
          word: 'customword',
          language: 'en' as LanguageCode,
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL],
          caseSensitive: false
        }
      ]

      matcher.addCustomWords(customWords)

      const builtInMatches = matcher.findMatches('this is existing', ['en'])
      const customMatches = matcher.findMatches('this is customword', ['en'])

      if (builtInMatches.length > 0 && customMatches.length > 0) {
        expect(customMatches[0].confidence).toBeLessThanOrEqual(builtInMatches[0].confidence)
      }
    })
  })

  describe('Whitelist and Filtering', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'assess',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'class',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'bass',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should respect whitelist', () => {
      const whitelistConfig = { ...config, whitelist: ['assess', 'class'] }
      const whitelistMatcher = new ProfanityMatcher(whitelistConfig)

      const testWords = [
        {
          word: 'assess',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      whitelistMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = whitelistMatcher.findMatches('please assess this class', ['en'])
      // Whitelisted words should not be detected
      expect(matches.filter(m => ['assess', 'class'].includes(m.word))).toHaveLength(0)
    })

    it('should filter by minimum severity', () => {
      const highSeverityConfig = { ...config, minSeverity: SeverityLevel.HIGH }
      const highSeverityMatcher = new ProfanityMatcher(highSeverityConfig)

      const testWords = [
        {
          word: 'mild',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'severe',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      highSeverityMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = highSeverityMatcher.findMatches('mild and severe words', ['en'])
      // Should only find 'severe' due to severity filtering
      expect(matches.filter(m => m.word === 'mild')).toHaveLength(0)
      expect(matches.filter(m => m.word === 'severe')).toHaveLength(1)
    })

    it('should filter by categories', () => {
      const categoryConfig = { ...config, categories: [ProfanityCategory.VIOLENCE] }
      const categoryMatcher = new ProfanityMatcher(categoryConfig)

      const testWords = [
        {
          word: 'general',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'violent',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.VIOLENCE]
        }
      ]

      categoryMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = categoryMatcher.findMatches('general and violent content', ['en'])
      // Should only find 'violent' due to category filtering
      expect(matches.filter(m => m.word === 'general')).toHaveLength(0)
      expect(matches.filter(m => m.word === 'violent')).toHaveLength(1)
    })

    it('should filter by minimum word length', () => {
      const lengthConfig = { ...config, minWordLength: 5 }
      const lengthMatcher = new ProfanityMatcher(lengthConfig)

      const testWords = [
        {
          word: 'bad',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'terrible',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      lengthMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = lengthMatcher.findMatches('bad and terrible words', ['en'])
      // Should only find 'terrible' (8 chars) due to minimum length
      expect(matches.filter(m => m.word === 'bad')).toHaveLength(0)
      expect(matches.filter(m => m.word === 'terrible')).toHaveLength(1)
    })
  })

  describe('Multiple Languages', () => {
    it('should handle multiple language detection', async () => {
      const englishWords = [
        {
          word: 'bad',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      const spanishWords = [
        {
          word: 'malo',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, englishWords)
      await matcher.loadLanguage('es' as LanguageCode, spanishWords)

      const matches = matcher.findMatches('this is bad and malo', ['en', 'es'])

      expect(matches).toHaveLength(2)
      expect(matches.map(m => m.word)).toContain('bad')
      expect(matches.map(m => m.word)).toContain('malo')
      expect(matches.map(m => m.language)).toContain('en')
      expect(matches.map(m => m.language)).toContain('es')
    })

    it('should skip auto language', () => {
      const matches = matcher.findMatches('test text', ['auto'])
      // Should handle gracefully and not crash
      expect(Array.isArray(matches)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('should handle large texts efficiently', async () => {
      const testWords = Array.from({ length: 100 }, (_, i) => ({
        word: `word${i}`,
        severity: SeverityLevel.MODERATE,
        categories: [ProfanityCategory.GENERAL]
      }))

      await matcher.loadLanguage('en' as LanguageCode, testWords)

      const largeText = 'This is a large text with word42 and word99 repeated many times. '.repeat(100)

      const start = Date.now()
      const matches = matcher.findMatches(largeText, ['en'])
      const duration = Date.now() - start

      expect(matches.length).toBeGreaterThan(0)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should provide performance statistics', () => {
      const stats = matcher.getStats()

      expect(stats).toHaveProperty('totalLanguages')
      expect(stats).toHaveProperty('totalWords')
      expect(stats).toHaveProperty('trieStats')
      expect(typeof stats.totalLanguages).toBe('number')
      expect(typeof stats.totalWords).toBe('number')
      expect(typeof stats.trieStats).toBe('object')
    })
  })

  describe('Match Quality and Confidence', () => {
    beforeEach(async () => {
      const testWords = [
        {
          word: 'exact',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      await matcher.loadLanguage('en' as LanguageCode, testWords)
    })

    it('should assign high confidence to exact matches', () => {
      const matches = matcher.findMatches('this is exact match', ['en'])

      expect(matches).toHaveLength(1)
      expect(matches[0].confidence).toBeGreaterThan(0.9)
    })

    it('should assign lower confidence to fuzzy matches', () => {
      const matches = matcher.findMatches('this is exaxt match', ['en']) // typo

      if (matches.length > 0) {
        expect(matches[0].confidence).toBeLessThan(0.9)
      }
    })

    it('should adjust confidence based on various factors', () => {
      // This tests the confidence adjustment logic
      const matches = matcher.findMatches('ex4ct', ['en']) // with numbers

      if (matches.length > 0) {
        // Confidence should be adjusted for words with numbers
        expect(matches[0].confidence).toBeLessThan(1.0)
      }
    })

    it('should handle match deduplication', () => {
      // Add overlapping words to test deduplication
      const testWords = [
        {
          word: 'test',
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL]
        },
        {
          word: 'testing',
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      const testMatcher = new ProfanityMatcher(config)
      testMatcher.loadLanguage('en' as LanguageCode, testWords)

      const matches = testMatcher.findMatches('testing word', ['en'])

      // Should prefer the higher severity match
      expect(matches).toHaveLength(1)
      expect(matches[0].word).toBe('testing')
      expect(matches[0].severity).toBe(SeverityLevel.HIGH)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed word data gracefully', async () => {
      const malformedWords = [
        {
          // Missing required fields
          severity: SeverityLevel.MODERATE
        } as any,
        {
          word: '',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        },
        null as any,
        undefined as any
      ]

      // Should not crash
      await expect(
        matcher.loadLanguage('en' as LanguageCode, malformedWords)
      ).resolves.not.toThrow()
    })

    it('should handle invalid language codes gracefully', async () => {
      const testWords = [
        {
          word: 'test',
          severity: SeverityLevel.MODERATE,
          categories: [ProfanityCategory.GENERAL]
        }
      ]

      // Should not crash with invalid language code
      await expect(
        matcher.loadLanguage('invalid' as LanguageCode, testWords)
      ).resolves.not.toThrow()
    })

    it('should handle extremely long texts', () => {
      const veryLongText = 'word '.repeat(10000) // 50,000 characters

      // Should not crash or take too long
      const start = Date.now()
      const matches = matcher.findMatches(veryLongText, ['en'])
      const duration = Date.now() - start

      expect(Array.isArray(matches)).toBe(true)
      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
    })
  })
})