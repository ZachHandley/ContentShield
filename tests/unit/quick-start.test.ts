import { describe, it, expect, beforeEach } from 'vitest'
import { detect, filter, isClean, configure, reset } from '../../src/core/quick-start.js'
import { SeverityLevel, FilterMode } from '../../src/types/index.js'

describe('Quick Start Functions', () => {
  beforeEach(() => {
    reset() // Reset default detector before each test
  })

  describe('detect', () => {
    it('should detect profanity in text', async () => {
      const result = await detect('This is a test message.')

      expect(result).toHaveProperty('originalText')
      expect(result).toHaveProperty('hasProfanity')
      expect(result).toHaveProperty('matches')
      expect(result.originalText).toBe('This is a test message.')
    })
  })

  describe('filter', () => {
    it('should filter text with default censoring', async () => {
      const result = await filter('This is a test message.')
      expect(typeof result).toBe('string')
    })

    it('should filter text with specified mode', async () => {
      const result = await filter('This is a test message.', FilterMode.REMOVE)
      expect(typeof result).toBe('string')
    })
  })

  describe('isClean', () => {
    it('should return true for clean text', async () => {
      const result = await isClean('This is clean text.')
      expect(result).toBe(true)
    })
  })

  describe('configure', () => {
    it('should configure the default detector', () => {
      configure({
        minSeverity: SeverityLevel.HIGH,
        fuzzyMatching: false,
      })

      // Configuration should be applied to subsequent calls
      expect(() => configure({ minSeverity: SeverityLevel.LOW })).not.toThrow()
    })
  })

  describe('reset', () => {
    it('should reset the default detector', () => {
      configure({ minSeverity: SeverityLevel.HIGH })
      reset()

      // After reset, should use default configuration again
      expect(() => detect('test')).not.toThrow()
    })
  })
})