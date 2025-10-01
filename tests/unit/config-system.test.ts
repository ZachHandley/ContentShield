/**
 * Comprehensive tests for the configuration system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ConfigValidator,
  ConfigManager,
  getGlobalConfigManager,
  resetGlobalConfigManager,
  DEFAULT_DETECTOR_CONFIG,
  PERFORMANCE_CONFIG,
  COMPREHENSIVE_CONFIG,
  getConfigPreset
} from '../../src/config/index.js'
import { SeverityLevel, ProfanityCategory, type DetectorConfig } from '../../src/types/index.js'

describe('Configuration System', () => {
  afterEach(() => {
    resetGlobalConfigManager()
  })

  describe('ConfigValidator', () => {
    describe('Basic Validation', () => {
      it('should validate a correct configuration', () => {
        const config: Partial<DetectorConfig> = {
          languages: ['en', 'es'],
          minSeverity: SeverityLevel.MEDIUM,
          fuzzyMatching: true,
          fuzzyThreshold: 0.8
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.errors).toHaveLength(0)
        expect(result.sanitizedConfig).toBeDefined()
      })

      it('should reject invalid languages', () => {
        const config: Partial<DetectorConfig> = {
          languages: ['invalid-language', 'en']
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true) // Should be valid after sanitization
        expect(result.warnings.length).toBeGreaterThan(0)
        expect(result.sanitizedConfig?.languages).toEqual(['en'])
      })

      it('should reject invalid severity level', () => {
        const config: Partial<DetectorConfig> = {
          minSeverity: 'invalid-severity' as any
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
      })

      it('should validate fuzzy threshold range', () => {
        const invalidConfig: Partial<DetectorConfig> = {
          fuzzyThreshold: 1.5 // Invalid: > 1
        }

        const result = ConfigValidator.validate(invalidConfig)

        expect(result.isValid).toBe(false)
        expect(result.errors).toContain('fuzzyThreshold must be between 0 and 1')
      })

      it('should warn about low fuzzy threshold', () => {
        const config: Partial<DetectorConfig> = {
          fuzzyThreshold: 0.3 // Low threshold
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('false positives'))).toBe(true)
      })
    })

    describe('Custom Words Validation', () => {
      it('should validate custom words as strings', () => {
        const config: Partial<DetectorConfig> = {
          customWords: ['shit1', 'shit2']
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.sanitizedConfig?.customWords).toHaveLength(2)
      })

      it('should validate custom words as objects', () => {
        const config: Partial<DetectorConfig> = {
          customWords: [
            {
              word: 'customBad',
              severity: SeverityLevel.HIGH,
              categories: ['profanity'],
              language: 'en'
            }
          ]
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.sanitizedConfig?.customWords[0]).toMatchObject({
          word: 'customBad',
          severity: SeverityLevel.HIGH,
          categories: ['profanity'],
          language: 'en'
        })
      })

      it('should handle duplicate custom words', () => {
        const config: Partial<DetectorConfig> = {
          customWords: ['duplicate', 'duplicate', 'unique']
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('Duplicate'))).toBe(true)
        expect(result.sanitizedConfig?.customWords).toHaveLength(2)
      })

      it('should sanitize invalid custom word objects', () => {
        const config: Partial<DetectorConfig> = {
          customWords: [
            {
              word: 'valid',
              severity: 'invalid-severity' as any,
              categories: ['invalid-category'] as any,
              language: 'invalid-language'
            }
          ]
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        const sanitizedWord = result.sanitizedConfig?.customWords[0]
        expect(sanitizedWord?.severity).toBe(SeverityLevel.MEDIUM) // Default
        expect(sanitizedWord?.categories).toEqual(['profanity']) // Default
        expect(sanitizedWord?.language).toBe('en') // Default
      })
    })

    describe('Cross-validation', () => {
      it('should warn about fuzzy threshold with disabled fuzzy matching', () => {
        const config: Partial<DetectorConfig> = {
          fuzzyMatching: false,
          fuzzyThreshold: 0.9
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('fuzzyThreshold specified but fuzzyMatching is disabled'))).toBe(true)
      })

      it('should warn about performance implications', () => {
        const config: Partial<DetectorConfig> = {
          languages: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru'],
          fuzzyMatching: true
        }

        const result = ConfigValidator.validate(config)

        expect(result.isValid).toBe(true)
        expect(result.warnings.some(w => w.includes('performance'))).toBe(true)
      })
    })

    describe('Quick Validation', () => {
      it('should provide quick validation', () => {
        const validConfig = { languages: ['en'] }
        const invalidConfig = { languages: 'invalid' as any }

        expect(ConfigValidator.quickValidate(validConfig)).toBe(true)
        expect(ConfigValidator.quickValidate(invalidConfig)).toBe(false)
      })

      it('should handle validation errors gracefully', () => {
        const config = { circularRef: {} }
        config.circularRef = config // Create circular reference

        expect(ConfigValidator.quickValidate(config)).toBe(false)
      })
    })

    describe('Sanitization', () => {
      it('should sanitize invalid configuration', () => {
        const invalidConfig = {
          languages: ['invalid'],
          minSeverity: 'invalid' as any,
          fuzzyThreshold: 2
        }

        const sanitized = ConfigValidator.sanitize(invalidConfig)

        expect(sanitized.languages).toEqual(['auto']) // Default
        expect(sanitized.minSeverity).toBe(SeverityLevel.LOW) // Default
        expect(sanitized.fuzzyThreshold).toBe(0.8) // Default
      })
    })
  })

  describe('ConfigManager', () => {
    let configManager: ConfigManager

    beforeEach(() => {
      configManager = new ConfigManager()
    })

    afterEach(() => {
      configManager.dispose()
    })

    describe('Basic Configuration Management', () => {
      it('should initialize with default configuration', () => {
        const config = configManager.getConfig()

        expect(config).toMatchObject(DEFAULT_DETECTOR_CONFIG)
      })

      it('should update configuration', async () => {
        const newConfig = {
          languages: ['es'] as const,
          minSeverity: SeverityLevel.HIGH
        }

        await configManager.updateConfig(newConfig)
        const updatedConfig = configManager.getConfig()

        expect(updatedConfig.languages).toEqual(['es'])
        expect(updatedConfig.minSeverity).toBe(SeverityLevel.HIGH)
      })

      it('should maintain configuration history', async () => {
        await configManager.updateConfig({ languages: ['en'] })
        await configManager.updateConfig({ languages: ['es'] })

        const history = configManager.getConfigHistory()

        expect(history).toHaveLength(3) // Initial + 2 updates
        expect(history[0].source).toBe('default')
        expect(history[1].source).toBe('runtime')
        expect(history[2].source).toBe('runtime')
      })

      it('should revert to previous configuration', async () => {
        const original = configManager.getConfig()

        await configManager.updateConfig({ languages: ['es'] })
        const reverted = await configManager.revertToPrevious()

        expect(reverted).toBe(true)
        expect(configManager.getConfig()).toMatchObject(original)
      })

      it('should reset to default configuration', async () => {
        await configManager.updateConfig({ languages: ['es'], minSeverity: SeverityLevel.HIGH })
        await configManager.resetToDefault()

        const config = configManager.getConfig()
        expect(config).toMatchObject(DEFAULT_DETECTOR_CONFIG)
      })
    })

    describe('Configuration Presets', () => {
      it('should apply performance preset', async () => {
        await configManager.usePreset('performance')
        const config = configManager.getConfig()

        expect(config).toMatchObject({ ...DEFAULT_DETECTOR_CONFIG, ...PERFORMANCE_CONFIG })
      })

      it('should apply comprehensive preset', async () => {
        await configManager.usePreset('comprehensive')
        const config = configManager.getConfig()

        expect(config).toMatchObject({ ...DEFAULT_DETECTOR_CONFIG, ...COMPREHENSIVE_CONFIG })
      })
    })

    describe('Environment Overrides', () => {
      it('should apply environment variable overrides', () => {
        // Mock environment variables
        const originalEnv = process.env.NAUGHTY_WORDS_LANGUAGES
        process.env.NAUGHTY_WORDS_LANGUAGES = 'en,es'

        configManager.applyEnvironmentOverrides()
        const config = configManager.getConfig()

        expect(config.languages).toEqual(['en', 'es'])

        // Restore environment
        if (originalEnv !== undefined) {
          process.env.NAUGHTY_WORDS_LANGUAGES = originalEnv
        } else {
          delete process.env.NAUGHTY_WORDS_LANGUAGES
        }
      })
    })

    describe('Configuration Change Events', () => {
      it('should notify listeners of configuration changes', async () => {
        let changeEventReceived = false
        let receivedEvent: any = null

        const unsubscribe = configManager.onConfigChange((event) => {
          changeEventReceived = true
          receivedEvent = event
        })

        await configManager.updateConfig({ languages: ['fr'] })

        expect(changeEventReceived).toBe(true)
        expect(receivedEvent).toBeDefined()
        expect(receivedEvent.source).toBe('runtime')
        expect(receivedEvent.changeDetails.modified).toContain('languages')

        unsubscribe()
      })

      it('should allow unsubscribing from change events', async () => {
        let eventCount = 0

        const unsubscribe = configManager.onConfigChange(() => {
          eventCount++
        })

        await configManager.updateConfig({ languages: ['de'] })
        expect(eventCount).toBe(1)

        unsubscribe()

        await configManager.updateConfig({ languages: ['it'] })
        expect(eventCount).toBe(1) // Should not have incremented
      })
    })

    describe('Language Optimization', () => {
      it('should provide optimized configuration for specific languages', () => {
        const optimized = configManager.getOptimizedConfigForLanguages(['zh'])

        expect(optimized.languages).toEqual(['zh'])
        expect(optimized.fuzzyThreshold).toBe(0.9) // Chinese-specific optimization
        expect(optimized.normalizeText).toBe(false) // Don't normalize Chinese
      })

      it('should cache optimized configurations', () => {
        const optimized1 = configManager.getOptimizedConfigForLanguages(['en'])
        const optimized2 = configManager.getOptimizedConfigForLanguages(['en'])

        // Should be the same reference (cached)
        expect(optimized1).toBe(optimized2)
      })
    })

    describe('Validation Integration', () => {
      it('should validate current configuration', () => {
        const validation = configManager.validateCurrentConfig()

        expect(validation.isValid).toBe(true)
        expect(validation.errors).toHaveLength(0)
      })

      it('should reject invalid configuration updates', async () => {
        const invalidConfig = {
          minSeverity: 'invalid' as any
        }

        await expect(configManager.updateConfig(invalidConfig)).rejects.toThrow()
      })
    })

    describe('Performance Monitoring', () => {
      it('should track configuration usage', async () => {
        // Use optimized configs
        configManager.getOptimizedConfigForLanguages(['en'])
        configManager.getOptimizedConfigForLanguages(['es'])
        configManager.getOptimizedConfigForLanguages(['en']) // Repeat for cache

        // Should demonstrate caching behavior
        const config1 = configManager.getOptimizedConfigForLanguages(['en'])
        const config2 = configManager.getOptimizedConfigForLanguages(['en'])

        expect(config1).toBe(config2) // Same reference due to caching
      })
    })

    describe('Resource Management', () => {
      it('should dispose resources properly', () => {
        const manager = new ConfigManager()

        // Add some state
        manager.onConfigChange(() => {})

        // Dispose should not throw
        expect(() => manager.dispose()).not.toThrow()
      })
    })
  })

  describe('Global Configuration Manager', () => {
    it('should provide global configuration manager', () => {
      const manager1 = getGlobalConfigManager()
      const manager2 = getGlobalConfigManager()

      expect(manager1).toBe(manager2) // Same instance
    })

    it('should reset global configuration manager', () => {
      const manager1 = getGlobalConfigManager()
      resetGlobalConfigManager()
      const manager2 = getGlobalConfigManager()

      expect(manager1).not.toBe(manager2) // Different instances
    })
  })

  describe('Configuration Presets', () => {
    it('should provide all expected presets', () => {
      const presets = ['default', 'performance', 'comprehensive', 'strict', 'lenient'] as const

      presets.forEach(preset => {
        const config = getConfigPreset(preset)
        expect(config).toBeDefined()
        expect(config.languages).toBeDefined()
        expect(config.minSeverity).toBeDefined()
      })
    })

    it('should have different characteristics for different presets', () => {
      const performance = getConfigPreset('performance')
      const comprehensive = getConfigPreset('comprehensive')

      // Performance should be more restrictive
      expect(performance.languages).toHaveLength(1) // Single language
      expect(performance.fuzzyMatching).toBe(false) // Disabled for speed

      // Comprehensive should be more inclusive
      expect(comprehensive.languages).toContain('auto') // Auto-detect
      expect(comprehensive.fuzzyMatching).toBe(true) // Enabled
    })
  })
})