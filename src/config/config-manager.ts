/**
 * Runtime configuration management
 * Handles configuration loading, validation, environment overrides, and hot-swapping
 */

import type { DetectorConfig, LanguageCode, SeverityLevel } from '../types/index.js'
import {
  DEFAULT_DETECTOR_CONFIG,
  getEnvironmentConfig,
  getConfigPreset,
  LANGUAGE_OPTIMIZED_CONFIGS,
  CONFIG_PRESETS
} from './default-config.js'
import { ConfigValidator } from './config-validator.js'
import fs from 'fs/promises'
import { watch } from 'fs'

/**
 * Configuration source types
 */
export type ConfigSource = 'default' | 'file' | 'environment' | 'runtime'

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  source: ConfigSource
  previousConfig: DetectorConfig
  newConfig: DetectorConfig
  timestamp: Date
  changeDetails: {
    added: string[]
    modified: string[]
    removed: string[]
  }
}

/**
 * Configuration manager options
 */
export interface ConfigManagerOptions {
  enableHotReload?: boolean
  configFilePath?: string
  validateOnLoad?: boolean
  autoOptimizeForLanguages?: boolean
  enableEnvironmentOverrides?: boolean
  cacheValidatedConfigs?: boolean
}

/**
 * Runtime configuration manager
 */
export class ConfigManager {
  private currentConfig: DetectorConfig
  private configHistory: Array<{ config: DetectorConfig; timestamp: Date; source: ConfigSource }> = []
  private changeListeners: Array<(event: ConfigChangeEvent) => void> = []
  private fileWatcher: ReturnType<typeof watch> | null | undefined
  private configCache = new Map<string, DetectorConfig>()
  private readonly maxHistorySize = 10

  private readonly options: Required<ConfigManagerOptions>

  constructor(
    initialConfig: Partial<DetectorConfig> = {},
    options: ConfigManagerOptions = {}
  ) {
    this.options = {
      enableHotReload: false,
      configFilePath: './content-shield.config.json',
      validateOnLoad: true,
      autoOptimizeForLanguages: true,
      enableEnvironmentOverrides: true,
      cacheValidatedConfigs: true,
      ...options
    }

    // Start with default config
    let baseConfig = DEFAULT_DETECTOR_CONFIG

    // Apply environment config if enabled
    if (this.options.enableEnvironmentOverrides) {
      baseConfig = { ...baseConfig, ...getEnvironmentConfig() }
    }

    // Apply provided config
    const mergedConfig = { ...baseConfig, ...initialConfig }

    // Validate and sanitize
    if (this.options.validateOnLoad) {
      const validation = ConfigValidator.validate(mergedConfig)
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
      }
      // If validation is valid, sanitizedConfig should be available
      this.currentConfig = validation.sanitizedConfig || mergedConfig as DetectorConfig
    } else {
      this.currentConfig = mergedConfig as DetectorConfig
    }

    // Add to history
    this.configHistory.push({
      config: { ...this.currentConfig },
      timestamp: new Date(),
      source: 'default'
    })

    // Note: Auto-optimization is NOT run during initialization
    // It only runs when configuration is explicitly changed via updateConfig
  }

  /**
   * Get current configuration
   */
  getConfig(): DetectorConfig {
    return { ...this.currentConfig }
  }

  /**
   * Update configuration with validation
   */
  async updateConfig(
    newConfig: Partial<DetectorConfig>,
    source: ConfigSource = 'runtime',
    skipHistory = false,
    skipNotification = false
  ): Promise<void> {
    const previousConfig = { ...this.currentConfig }
    const mergedConfig = { ...this.currentConfig, ...newConfig }

    // Validate new configuration
    if (this.options.validateOnLoad) {
      const validation = ConfigValidator.validate(mergedConfig)
      if (!validation.isValid) {
        throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
      }
      // If validation is valid, sanitizedConfig should be available
      this.currentConfig = validation.sanitizedConfig || mergedConfig as DetectorConfig
    } else {
      this.currentConfig = mergedConfig as DetectorConfig
    }

    // Add to history (unless explicitly skipped)
    if (!skipHistory) {
      this.configHistory.push({
        config: { ...this.currentConfig },
        timestamp: new Date(),
        source
      })

      // Limit history size
      if (this.configHistory.length > this.maxHistorySize) {
        this.configHistory.shift()
      }
    }

    // Detect changes
    const changeDetails = this.detectChanges(previousConfig, this.currentConfig)

    // Auto-optimize if enabled (do this BEFORE notification so the final state is notified)
    const shouldAutoOptimize = this.options.autoOptimizeForLanguages &&
                                changeDetails.modified.includes('languages') &&
                                !skipNotification
    if (shouldAutoOptimize) {
      await this.autoOptimizeForLanguages()
    }

    // Notify listeners (unless explicitly skipped)
    if (!skipNotification) {
      // Re-detect changes after auto-optimization
      const finalChangeDetails = shouldAutoOptimize
        ? this.detectChanges(previousConfig, this.currentConfig)
        : changeDetails

      const event: ConfigChangeEvent = {
        source,
        previousConfig,
        newConfig: { ...this.currentConfig },
        timestamp: new Date(),
        changeDetails: finalChangeDetails
      }

      this.notifyListeners(event)
    }
  }

  /**
   * Load configuration from file
   */
  async loadFromFile(filePath?: string): Promise<void> {
    const configPath = filePath || this.options.configFilePath

    try {
      const fileContent = await fs.readFile(configPath, 'utf-8')
      const fileConfig = JSON.parse(fileContent)

      await this.updateConfig(fileConfig, 'file')

      // Enable hot reload if configured
      if (this.options.enableHotReload && !this.fileWatcher) {
        this.enableHotReload(configPath)
      }
    } catch (error) {
      throw new Error(`Failed to load configuration from ${configPath}: ${error}`)
    }
  }

  /**
   * Save current configuration to file
   */
  async saveToFile(filePath?: string): Promise<void> {
    const configPath = filePath || this.options.configFilePath

    try {
      const configJson = JSON.stringify(this.currentConfig, null, 2)
      await fs.writeFile(configPath, configJson, 'utf-8')
    } catch (error) {
      throw new Error(`Failed to save configuration to ${configPath}: ${error}`)
    }
  }

  /**
   * Apply environment variable overrides
   */
  applyEnvironmentOverrides(): void {
    const envOverrides: Partial<DetectorConfig> = {}

    // Check for common environment variables
    if (process.env.NAUGHTY_WORDS_LANGUAGES) {
      envOverrides.languages = process.env.NAUGHTY_WORDS_LANGUAGES.split(',') as LanguageCode[]
    }

    if (process.env.NAUGHTY_WORDS_MIN_SEVERITY) {
      const severityValue = parseInt(process.env.NAUGHTY_WORDS_MIN_SEVERITY, 10)
      if (!isNaN(severityValue) && severityValue >= 1 && severityValue <= 4) {
        envOverrides.minSeverity = severityValue as SeverityLevel
      }
    }

    if (process.env.NAUGHTY_WORDS_FUZZY_MATCHING) {
      envOverrides.fuzzyMatching = process.env.NAUGHTY_WORDS_FUZZY_MATCHING === 'true'
    }

    if (process.env.NAUGHTY_WORDS_FUZZY_THRESHOLD) {
      envOverrides.fuzzyThreshold = parseFloat(process.env.NAUGHTY_WORDS_FUZZY_THRESHOLD)
    }

    if (process.env.NAUGHTY_WORDS_NORMALIZE_TEXT) {
      envOverrides.normalizeText = process.env.NAUGHTY_WORDS_NORMALIZE_TEXT === 'true'
    }

    if (process.env.NAUGHTY_WORDS_REPLACEMENT_CHAR) {
      envOverrides.replacementChar = process.env.NAUGHTY_WORDS_REPLACEMENT_CHAR
    }

    if (Object.keys(envOverrides).length > 0) {
      this.updateConfig(envOverrides, 'environment')
    }
  }

  /**
   * Use a configuration preset
   */
  async usePreset(preset: keyof typeof CONFIG_PRESETS): Promise<void> {
    const presetConfig = getConfigPreset(preset)
    await this.updateConfig(presetConfig, 'runtime')
  }

  /**
   * Auto-optimize configuration for detected languages
   */
  private async autoOptimizeForLanguages(): Promise<void> {
    const optimizations: Partial<DetectorConfig> = {}

    // If only one specific language, apply language-specific optimizations
    if (this.currentConfig.languages.length === 1 && this.currentConfig.languages[0] !== 'auto') {
      const language = this.currentConfig.languages[0]
      const langOptimizations = language && language in LANGUAGE_OPTIMIZED_CONFIGS
        ? LANGUAGE_OPTIMIZED_CONFIGS[language as keyof typeof LANGUAGE_OPTIMIZED_CONFIGS]
        : undefined

      if (langOptimizations) {
        Object.assign(optimizations, langOptimizations)
      }
    }

    // Apply performance optimizations for many languages
    if (this.currentConfig.languages.length > 3) {
      optimizations.fuzzyThreshold = Math.max(0.7, this.currentConfig.fuzzyThreshold)
    }

    if (Object.keys(optimizations).length > 0) {
      // Apply optimizations directly without triggering events or history
      await this.updateConfig(optimizations, 'runtime', true, true)
    }
  }

  /**
   * Enable hot reload for configuration file
   */
  private async enableHotReload(filePath: string): Promise<void> {
    try {
      // Dynamically import fs watch functionality
      const { watch } = await import('fs')

      this.fileWatcher = watch(filePath, async (eventType) => {
        if (eventType === 'change') {
          try {
            await this.loadFromFile(filePath)
          } catch (error) {
            console.warn(`Hot reload failed: ${error}`)
          }
        }
      })
    } catch (error) {
      console.warn(`Could not enable hot reload: ${error}`)
    }
  }

  /**
   * Add configuration change listener
   */
  onConfigChange(listener: (event: ConfigChangeEvent) => void): () => void {
    this.changeListeners.push(listener)

    // Return unsubscribe function
    return () => {
      const index = this.changeListeners.indexOf(listener)
      if (index >= 0) {
        this.changeListeners.splice(index, 1)
      }
    }
  }

  /**
   * Get configuration history
   */
  getConfigHistory(): Array<{ config: DetectorConfig; timestamp: Date; source: ConfigSource }> {
    return [...this.configHistory]
  }

  /**
   * Revert to previous configuration
   */
  async revertToPrevious(): Promise<boolean> {
    if (this.configHistory.length < 2) {
      return false
    }

    // Remove current config from history
    this.configHistory.pop()

    // Get the now-last config (was previously second-to-last)
    const previousConfigEntry = this.configHistory[this.configHistory.length - 1]
    if (!previousConfigEntry) {
      return false
    }

    // Update current config without adding to history
    const previousConfig = { ...this.currentConfig }
    this.currentConfig = { ...previousConfigEntry.config }

    // Detect changes and notify
    const changeDetails = this.detectChanges(previousConfig, this.currentConfig)
    const event: ConfigChangeEvent = {
      source: 'runtime',
      previousConfig,
      newConfig: { ...this.currentConfig },
      timestamp: new Date(),
      changeDetails
    }
    this.notifyListeners(event)

    return true
  }

  /**
   * Reset to default configuration
   */
  async resetToDefault(): Promise<void> {
    // Clear history and start fresh
    const previousConfig = { ...this.currentConfig }
    this.currentConfig = { ...DEFAULT_DETECTOR_CONFIG }
    this.configHistory = [{
      config: { ...this.currentConfig },
      timestamp: new Date(),
      source: 'default'
    }]

    // Detect changes and notify
    const changeDetails = this.detectChanges(previousConfig, this.currentConfig)
    const event: ConfigChangeEvent = {
      source: 'runtime',
      previousConfig,
      newConfig: { ...this.currentConfig },
      timestamp: new Date(),
      changeDetails
    }
    this.notifyListeners(event)
  }

  /**
   * Validate current configuration
   */
  validateCurrentConfig(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const result = ConfigValidator.validate(this.currentConfig)
    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings
    }
  }

  /**
   * Get optimized configuration for specific languages
   */
  getOptimizedConfigForLanguages(languages: LanguageCode[]): DetectorConfig {
    const cacheKey = languages.sort().join(',')

    if (this.options.cacheValidatedConfigs && this.configCache.has(cacheKey)) {
      const cachedConfig = this.configCache.get(cacheKey)
      if (cachedConfig) {
        return cachedConfig
      }
    }

    let optimizedConfig = { ...this.currentConfig }
    optimizedConfig.languages = languages

    // Apply language-specific optimizations
    if (languages.length === 1 && languages[0] !== 'auto') {
      const language = languages[0]
      const langOptimizations = language && language in LANGUAGE_OPTIMIZED_CONFIGS
        ? LANGUAGE_OPTIMIZED_CONFIGS[language as keyof typeof LANGUAGE_OPTIMIZED_CONFIGS]
        : undefined
      if (langOptimizations) {
        optimizedConfig = { ...optimizedConfig, ...langOptimizations }
      }
    }

    // Cache the result
    if (this.options.cacheValidatedConfigs) {
      this.configCache.set(cacheKey, optimizedConfig)
    }

    return optimizedConfig
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close()
      this.fileWatcher = undefined
    }

    this.changeListeners.length = 0
    this.configCache.clear()
    this.configHistory.length = 0
  }

  /**
   * Detect changes between configurations
   */
  private detectChanges(
    oldConfig: DetectorConfig,
    newConfig: DetectorConfig
  ): { added: string[]; modified: string[]; removed: string[] } {
    const changes = { added: [] as string[], modified: [] as string[], removed: [] as string[] }

    const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)])

    for (const key of allKeys) {
      const oldValue = (oldConfig as unknown as Record<string, unknown>)[key]
      const newValue = (newConfig as unknown as Record<string, unknown>)[key]

      if (oldValue === undefined && newValue !== undefined) {
        changes.added.push(key)
      } else if (oldValue !== undefined && newValue === undefined) {
        changes.removed.push(key)
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.modified.push(key)
      }
    }

    return changes
  }

  /**
   * Notify all change listeners
   */
  private notifyListeners(event: ConfigChangeEvent): void {
    for (const listener of this.changeListeners) {
      try {
        listener(event)
      } catch (error) {
        console.warn(`Configuration change listener error: ${error}`)
      }
    }
  }
}

/**
 * Global configuration manager instance
 */
let globalConfigManager: ConfigManager | null = null

/**
 * Get or create global configuration manager
 */
export function getGlobalConfigManager(
  initialConfig?: Partial<DetectorConfig>,
  options?: ConfigManagerOptions
): ConfigManager {
  if (!globalConfigManager) {
    globalConfigManager = new ConfigManager(initialConfig, options)
  }
  return globalConfigManager
}

/**
 * Reset global configuration manager
 */
export function resetGlobalConfigManager(): void {
  if (globalConfigManager) {
    globalConfigManager.dispose()
    globalConfigManager = null
  }
}