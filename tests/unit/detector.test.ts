import { describe, it, expect, beforeEach } from 'vitest'
import { NaughtyWordsDetector } from '../../src/core/detector.js'
import { SeverityLevel, ProfanityCategory } from '../../src/types/index.js'

describe('NaughtyWordsDetector', () => {
  let detector: NaughtyWordsDetector

  beforeEach(() => {
    detector = new NaughtyWordsDetector()
  })

  describe('constructor', () => {
    it('should create a detector with default configuration', () => {
      const config = detector.getConfig()
      expect(config.languages).toEqual(['auto'])
      expect(config.minSeverity).toBe(SeverityLevel.LOW)
      expect(config.fuzzyMatching).toBe(true)
    })

    it('should create a detector with custom configuration', () => {
      const customDetector = new NaughtyWordsDetector({
        languages: ['en', 'es'],
        minSeverity: SeverityLevel.HIGH,
        fuzzyMatching: false,
      })

      const config = customDetector.getConfig()
      expect(config.languages).toEqual(['en', 'es'])
      expect(config.minSeverity).toBe(SeverityLevel.HIGH)
      expect(config.fuzzyMatching).toBe(false)
    })
  })

  describe('analyze', () => {
    it('should analyze clean text', async () => {
      const result = await detector.analyze('This is a clean sentence.')

      expect(result.originalText).toBe('This is a clean sentence.')
      expect(result.hasProfanity).toBe(false)
      expect(result.totalMatches).toBe(0)
      expect(result.matches).toHaveLength(0)
      expect(result.processingTime).toBeGreaterThanOrEqual(0)
    })

    it('should return detection result structure', async () => {
      const result = await detector.analyze('Hello world')

      expect(result).toHaveProperty('originalText')
      expect(result).toHaveProperty('filteredText')
      expect(result).toHaveProperty('hasProfanity')
      expect(result).toHaveProperty('totalMatches')
      expect(result).toHaveProperty('maxSeverity')
      expect(result).toHaveProperty('matches')
      expect(result).toHaveProperty('detectedLanguages')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('processingTime')
    })
  })

  describe('isProfane', () => {
    it('should return false for clean text', async () => {
      const result = await detector.isProfane('This is clean text.')
      expect(result).toBe(false)
    })
  })

  describe('filter', () => {
    it('should return original text for clean content', async () => {
      const result = await detector.filter('This is clean text.')
      expect(result).toBe('This is clean text.')
    })
  })

  describe('updateConfig', () => {
    it('should update detector configuration', () => {
      detector.updateConfig({
        minSeverity: SeverityLevel.HIGH,
        fuzzyMatching: false,
      })

      const config = detector.getConfig()
      expect(config.minSeverity).toBe(SeverityLevel.HIGH)
      expect(config.fuzzyMatching).toBe(false)
    })
  })
})