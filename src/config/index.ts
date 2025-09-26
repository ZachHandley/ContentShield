/**
 * Configuration system exports
 */

// Default configurations
export {
  DEFAULT_DETECTOR_CONFIG,
  DEFAULT_ANALYSIS_OPTIONS,
  PERFORMANCE_CONFIG,
  COMPREHENSIVE_CONFIG,
  STRICT_CONFIG,
  LENIENT_CONFIG,
  ENVIRONMENT_CONFIGS,
  CONFIG_PRESETS,
  LANGUAGE_OPTIMIZED_CONFIGS,
  getEnvironmentConfig,
  getConfigPreset
} from './default-config.js'

// Configuration validation
export {
  ConfigValidator,
  type ValidationResult,
  type AnalysisOptionsValidationResult
} from './config-validator.js'

// Configuration management
export {
  ConfigManager,
  getGlobalConfigManager,
  resetGlobalConfigManager,
  type ConfigSource,
  type ConfigChangeEvent,
  type ConfigManagerOptions
} from './config-manager.js'