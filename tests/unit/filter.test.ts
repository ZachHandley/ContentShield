/**
 * Comprehensive tests for the ProfanityFilter
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ProfanityFilter, type FilterConfig, type FilterResult } from '../../src/core/filter.js'
import { FilterMode, SeverityLevel, ProfanityCategory, type DetectionMatch } from '../../src/types/index.js'

describe('ProfanityFilter', () => {
  let filter: ProfanityFilter
  let sampleMatches: DetectionMatch[]

  beforeEach(() => {
    filter = new ProfanityFilter()

    sampleMatches = [
      {
        word: 'shit',
        match: 'shit',
        start: 8,
        end: 15,
        severity: SeverityLevel.MODERATE,
        categories: [ProfanityCategory.GENERAL],
        language: 'en',
        confidence: 0.95
      },
      {
        word: 'terrible',
        match: 'terrible',
        start: 20,
        end: 28,
        severity: SeverityLevel.HIGH,
        categories: [ProfanityCategory.VIOLENCE],
        language: 'en',
        confidence: 0.90
      }
    ]
  })

  describe('Initialization and Configuration', () => {
    it('should initialize with default config', () => {
      const defaultFilter = new ProfanityFilter()
      expect(defaultFilter).toBeDefined()

      const stats = defaultFilter.getStats()
      expect(stats).toHaveProperty('currentMode', FilterMode.CENSOR)
      expect(stats).toHaveProperty('preserveStructure', true)
    })

    it('should initialize with custom config', () => {
      const customConfig: Partial<FilterConfig> = {
        mode: FilterMode.REMOVE,
        replacementChar: '#',
        preserveStructure: false
      }

      const customFilter = new ProfanityFilter(customConfig)
      const stats = customFilter.getStats()

      expect(stats.currentMode).toBe(FilterMode.REMOVE)
      expect(stats.preserveStructure).toBe(false)
    })

    it('should update configuration', () => {
      filter.updateConfig({ replacementChar: '@' })

      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))
      expect(result.filteredText).toContain('@')
    })

    it('should get current configuration', () => {
      const config = filter.getConfig()

      expect(config).toHaveProperty('mode')
      expect(config).toHaveProperty('replacementChar')
      expect(config).toHaveProperty('preserveStructure')
      expect(config).toHaveProperty('customReplacements')
      expect(config).toHaveProperty('categoryReplacements')
    })
  })

  describe('Censor Mode', () => {
    beforeEach(() => {
      filter.updateConfig({ mode: FilterMode.CENSOR })
    })

    it('should censor with asterisks by default', () => {
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).toBe('this is ******* text')
      expect(result.filteredCount).toBe(1)
      expect(result.structurePreserved).toBe(true)
    })

    it('should preserve word structure when enabled', () => {
      filter.updateConfig({ preserveStructure: true })
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).toBe('this is ******* text')
      expect(result.filteredText.length).toBe('this is shit text'.length)
    })

    it('should not preserve structure when disabled', () => {
      filter.updateConfig({ preserveStructure: false })
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).toBe('this is ******* text')
      expect(result.filteredText).toContain('*******')
    })

    it('should use custom replacement character', () => {
      filter.updateConfig({ replacementChar: '#' })
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).toBe('this is ####### text')
    })

    it('should handle multiple matches', () => {
      const text = 'this is shit and terrible'
      const result = filter.filter(text, sampleMatches)

      expect(result.filteredText).toContain('*******') // shit
      expect(result.filteredText).toContain('********') // terrible
      expect(result.filteredCount).toBe(2)
    })

    it('should handle special characters in words', () => {
      const specialMatch: DetectionMatch = {
        word: 'te@st',
        match: 'test',
        start: 8,
        end: 13,
        severity: SeverityLevel.LOW,
        categories: [ProfanityCategory.GENERAL],
        language: 'en',
        confidence: 0.80
      }

      const result = filter.filter('this is te@st word', [specialMatch])
      expect(result.filteredText).toBe('this is **@** word') // Preserves @ symbol
    })

    it('should handle numbers in words', () => {
      const numberMatch: DetectionMatch = {
        word: 'b4d',
        match: 'bad',
        start: 8,
        end: 11,
        severity: SeverityLevel.LOW,
        categories: [ProfanityCategory.GENERAL],
        language: 'en',
        confidence: 0.75
      }

      const result = filter.filter('this is b4d word', [numberMatch])
      expect(result.filteredText).toBe('this is *#* word') // * for letters, # for numbers
    })
  })

  describe('Remove Mode', () => {
    beforeEach(() => {
      filter.updateConfig({ mode: FilterMode.REMOVE })
    })

    it('should remove profane words', () => {
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).toBe('this is  text')
      expect(result.filteredCount).toBe(1)
    })

    it('should handle spacing correctly when removing', () => {
      const result = filter.filter('word1 shit word2', sampleMatches.slice(0, 1))

      expect(result.filteredText.trim()).toBe('word1  word2')
      // Should clean up extra spaces in post-processing
    })

    it('should remove words at beginning of text', () => {
      const startMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: 0,
        end: 7
      }

      const result = filter.filter('shit in beginning', [startMatch])
      expect(result.filteredText.trim()).toBe('in beginning')
    })

    it('should remove words at end of text', () => {
      const endMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: 12,
        end: 19
      }

      const result = filter.filter('this ends shit', [endMatch])
      expect(result.filteredText.trim()).toBe('this ends')
    })

    it('should handle multiple removals', () => {
      const text = 'this shit is terrible indeed'
      const result = filter.filter(text, sampleMatches)

      const cleaned = result.filteredText.replace(/\s+/g, ' ').trim()
      expect(cleaned).toBe('this  is  indeed')
    })
  })

  describe('Replace Mode', () => {
    beforeEach(() => {
      filter.updateConfig({ mode: FilterMode.REPLACE })
    })

    it('should replace with severity-based alternatives', () => {
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filteredText).not.toBe('this is shit text')
      expect(result.filteredText).toMatch(/this is \[?\w+\]? text/)
      expect(result.filteredCount).toBe(1)
    })

    it('should use different replacements for different severities', () => {
      const lowSeverityMatch: DetectionMatch = {
        ...sampleMatches[0],
        severity: SeverityLevel.LOW
      }

      const highSeverityMatch: DetectionMatch = {
        ...sampleMatches[0],
        severity: SeverityLevel.SEVERE
      }

      const lowResult = filter.filter('text', [lowSeverityMatch])
      const highResult = filter.filter('text', [highSeverityMatch])

      expect(lowResult.filteredText).not.toBe(highResult.filteredText)
    })

    it('should use category-specific replacements', () => {
      filter.addCategoryReplacements('general', ['[mild content]'])

      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))
      expect(result.filteredText).toBe('this is [mild content] text')
    })

    it('should handle multiple categories', () => {
      const multiCategoryMatch: DetectionMatch = {
        ...sampleMatches[0],
        categories: [ProfanityCategory.GENERAL, ProfanityCategory.VIOLENCE]
      }

      const result = filter.filter('this is shit text', [multiCategoryMatch])
      expect(result.filteredText).not.toBe('this is shit text')
    })
  })

  describe('Detect Only Mode', () => {
    beforeEach(() => {
      filter.updateConfig({ mode: FilterMode.DETECT_ONLY })
    })

    it('should not modify text in detect-only mode', () => {
      const originalText = 'this is shit and terrible'
      const result = filter.filter(originalText, sampleMatches)

      expect(result.filteredText).toBe(originalText)
      expect(result.filteredCount).toBe(2) // Still counts matches
    })

    it('should provide filter details without modification', () => {
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filterDetails).toHaveLength(1)
      expect(result.filterDetails[0].method).toBe('custom')
      expect(result.filterDetails[0].reason).toBe('detect only mode - no filtering applied')
    })
  })

  describe('Gradual Filtering', () => {
    beforeEach(() => {
      filter.updateConfig({
        mode: FilterMode.CENSOR,
        gradualFiltering: true
      })
    })

    it('should apply lighter filtering for low intensity', () => {
      const lowIntensityMatch: DetectionMatch = {
        ...sampleMatches[0],
        severity: SeverityLevel.LOW,
        confidence: 0.5
      }

      const result = filter.filter('this is shit text', [lowIntensityMatch])

      // Should apply partial censoring, not full replacement
      expect(result.filteredText).not.toBe('this is ******* text')
      expect(result.filteredText).toContain('*')
    })

    it('should apply heavier filtering for high intensity', () => {
      const highIntensityMatch: DetectionMatch = {
        ...sampleMatches[0],
        severity: SeverityLevel.SEVERE,
        confidence: 1.0
      }

      const result = filter.filter('this is shit text', [highIntensityMatch])

      // Should apply full replacement
      expect(result.filteredText).toBe('this is ******* text')
    })

    it('should disable gradual filtering when configured', () => {
      filter.updateConfig({ gradualFiltering: false })

      const lowIntensityMatch: DetectionMatch = {
        ...sampleMatches[0],
        severity: SeverityLevel.LOW,
        confidence: 0.3
      }

      const result = filter.filter('this is shit text', [lowIntensityMatch])

      // Should apply full censoring regardless of intensity
      expect(result.filteredText).toBe('this is ******* text')
    })
  })

  describe('Custom Replacements', () => {
    it('should add and use custom replacements', () => {
      filter.addCustomReplacement('shit', '[CUSTOM]')
      filter.updateConfig({ mode: FilterMode.REPLACE })

      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))
      expect(result.filteredText).toBe('this is [CUSTOM] text')
    })

    it('should remove custom replacements', () => {
      filter.addCustomReplacement('shit', '[CUSTOM]')
      expect(filter.removeCustomReplacement('shit')).toBe(true)
      expect(filter.removeCustomReplacement('nonexistent')).toBe(false)
    })

    it('should handle wildcard patterns', () => {
      filter.addCustomReplacement('bad*', '[WILDCARD]')
      filter.updateConfig({ mode: FilterMode.REPLACE })

      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))
      expect(result.filteredText).toBe('this is [WILDCARD] text')
    })

    it('should prioritize exact matches over patterns', () => {
      filter.addCustomReplacement('shit', '[EXACT]')
      filter.addCustomReplacement('bad*', '[WILDCARD]')
      filter.updateConfig({ mode: FilterMode.REPLACE })

      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))
      expect(result.filteredText).toBe('this is [EXACT] text')
    })
  })

  describe('Confidence Threshold', () => {
    it('should filter matches above confidence threshold', () => {
      filter.updateConfig({ confidenceThreshold: 0.8 })

      const highConfidenceMatch: DetectionMatch = {
        ...sampleMatches[0],
        confidence: 0.9
      }

      const result = filter.filter('this is shit text', [highConfidenceMatch])
      expect(result.filteredCount).toBe(1)
    })

    it('should ignore matches below confidence threshold', () => {
      filter.updateConfig({ confidenceThreshold: 0.8 })

      const lowConfidenceMatch: DetectionMatch = {
        ...sampleMatches[0],
        confidence: 0.7
      }

      const result = filter.filter('this is shit text', [lowConfidenceMatch])
      expect(result.filteredCount).toBe(0)
      expect(result.filteredText).toBe('this is shit text')
    })
  })

  describe('Sentence Structure Preservation', () => {
    beforeEach(() => {
      filter.updateConfig({
        preserveSentenceStructure: true,
        mode: FilterMode.REMOVE
      })
    })

    it('should fix spacing after filtering', () => {
      const result = filter.filter('this  is   shit   text', sampleMatches.slice(0, 1))

      // Should clean up multiple spaces
      expect(result.filteredText).not.toMatch(/\s{2,}/)
    })

    it('should fix capitalization after sentence endings', () => {
      const sentenceMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: 5,
        end: 12
      }

      const result = filter.filter('this shit. the rest continues', [sentenceMatch])

      // Should capitalize 'the' after the period
      expect(result.filteredText).toMatch(/\. The/)
    })

    it('should fix punctuation spacing', () => {
      const result = filter.filter('word1 , shit , word2', sampleMatches.slice(0, 1))

      // Should fix spacing around commas
      expect(result.filteredText).toMatch(/word1, , word2/)
    })

    it('should capitalize first letter of text', () => {
      const startMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: 0,
        end: 7
      }

      const result = filter.filter('shit continues here', [startMatch])

      // First letter should be capitalized
      expect(result.filteredText.charAt(0)).toMatch(/[A-Z]/)
    })
  })

  describe('Batch Filtering', () => {
    it('should filter multiple texts', () => {
      const texts = [
        'this is shit text',
        'another terrible example',
        'clean text here'
      ]

      const matchesArray = [
        sampleMatches.slice(0, 1),
        sampleMatches.slice(1, 2),
        []
      ]

      const results = filter.batchFilter(texts, matchesArray)

      expect(results).toHaveLength(3)
      expect(results[0].filteredCount).toBe(1)
      expect(results[1].filteredCount).toBe(1)
      expect(results[2].filteredCount).toBe(0)
    })

    it('should throw error for mismatched array lengths', () => {
      expect(() => {
        filter.batchFilter(['text1', 'text2'], [sampleMatches])
      }).toThrow()
    })
  })

  describe('Safety Levels', () => {
    it('should apply strict safety level', () => {
      const result = filter.makeSafe('this is shit and terrible', sampleMatches, 'strict')

      expect(result.filteredText).not.toContain('shit')
      expect(result.filteredText).not.toContain('terrible')
      expect(result.filteredCount).toBe(2)
    })

    it('should apply moderate safety level', () => {
      const result = filter.makeSafe('this is shit and terrible', sampleMatches, 'moderate')

      expect(result.filteredText).toContain('*')
      expect(result.filteredCount).toBe(2)
    })

    it('should apply lenient safety level', () => {
      const result = filter.makeSafe('this is shit and terrible', sampleMatches, 'lenient')

      expect(result.filteredText).not.toBe('this is shit and terrible')
      expect(result.filteredCount).toBeGreaterThan(0)
    })

    it('should use moderate as default safety level', () => {
      const defaultResult = filter.makeSafe('this is shit text', sampleMatches.slice(0, 1))
      const moderateResult = filter.makeSafe('this is shit text', sampleMatches.slice(0, 1), 'moderate')

      expect(defaultResult.filteredText).toBe(moderateResult.filteredText)
    })
  })

  describe('Filter Details and Metadata', () => {
    it('should provide detailed filter information', () => {
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.filterDetails).toHaveLength(1)

      const detail = result.filterDetails[0]
      expect(detail).toHaveProperty('originalWord', 'shit')
      expect(detail).toHaveProperty('replacement')
      expect(detail).toHaveProperty('position')
      expect(detail).toHaveProperty('reason')
      expect(detail).toHaveProperty('confidence')
      expect(detail).toHaveProperty('method')
    })

    it('should provide length comparison', () => {
      const originalText = 'this is shit text'
      const result = filter.filter(originalText, sampleMatches.slice(0, 1))

      expect(result.lengthComparison).toHaveProperty('original', originalText.length)
      expect(result.lengthComparison).toHaveProperty('filtered', result.filteredText.length)
      expect(result.lengthComparison).toHaveProperty('difference')

      const expectedDifference = result.filteredText.length - originalText.length
      expect(result.lengthComparison.difference).toBe(expectedDifference)
    })

    it('should track structure preservation', () => {
      filter.updateConfig({ preserveStructure: true })
      const result = filter.filter('this is shit text', sampleMatches.slice(0, 1))

      expect(result.structurePreserved).toBe(true)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty matches array', () => {
      const result = filter.filter('this is clean text', [])

      expect(result.filteredText).toBe('this is clean text')
      expect(result.filteredCount).toBe(0)
      expect(result.filterDetails).toHaveLength(0)
    })

    it('should handle empty text', () => {
      const result = filter.filter('', sampleMatches)

      expect(result.filteredText).toBe('')
      expect(result.filteredCount).toBe(0)
    })

    it('should handle overlapping matches', () => {
      const overlappingMatches: DetectionMatch[] = [
        {
          word: 'shit',
          match: 'shit',
          start: 8,
          end: 15,
          severity: SeverityLevel.LOW,
          categories: [ProfanityCategory.GENERAL],
          language: 'en',
          confidence: 0.8
        },
        {
          word: 'word',
          match: 'word',
          start: 11,
          end: 15,
          severity: SeverityLevel.HIGH,
          categories: [ProfanityCategory.GENERAL],
          language: 'en',
          confidence: 0.9
        }
      ]

      const result = filter.filter('this is shit text', overlappingMatches)

      // Should handle overlapping matches gracefully
      expect(result.filteredText).not.toBe('this is shit text')
      expect(result.filteredCount).toBeGreaterThan(0)
    })

    it('should handle matches with invalid positions', () => {
      const invalidMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: -1,
        end: 1000
      }

      // Should not crash
      expect(() => {
        filter.filter('short text', [invalidMatch])
      }).not.toThrow()
    })

    it('should handle very long texts', () => {
      const longText = 'word '.repeat(10000) + 'shit' + ' word'.repeat(10000)
      const longMatch: DetectionMatch = {
        ...sampleMatches[0],
        start: longText.indexOf('shit'),
        end: longText.indexOf('shit') + 7
      }

      const start = Date.now()
      const result = filter.filter(longText, [longMatch])
      const duration = Date.now() - start

      expect(result.filteredText).not.toContain('shit')
      expect(duration).toBeLessThan(1000) // Should complete quickly
    })
  })

  describe('Legacy Compatibility', () => {
    it('should support legacy applyFilter method', () => {
      const filteredText = filter.applyFilter(
        'this is shit text',
        sampleMatches.slice(0, 1),
        FilterMode.CENSOR,
        '#',
        true
      )

      expect(filteredText).toBe('this is ####### text')
    })

    it('should maintain backward compatibility with existing API', () => {
      // Test that the new filter method produces same results as legacy method
      const text = 'this is shit text'
      const matches = sampleMatches.slice(0, 1)

      const legacyResult = filter.applyFilter(text, matches, FilterMode.CENSOR, '*', true)
      const newResult = filter.filter(text, matches, {
        mode: FilterMode.CENSOR,
        replacementChar: '*',
        preserveStructure: true
      })

      expect(newResult.filteredText).toBe(legacyResult)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide filter statistics', () => {
      filter.addCustomReplacement('test', 'replacement')
      filter.addCategoryReplacements('general', ['alternative1', 'alternative2'])

      const stats = filter.getStats()

      expect(stats.customReplacements).toBe(1)
      expect(stats.categoryReplacements).toBeGreaterThan(0)
      expect(stats.currentMode).toBe(FilterMode.CENSOR)
      expect(stats.preserveStructure).toBe(true)
    })
  })
})