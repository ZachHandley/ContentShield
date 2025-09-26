import { NaughtyWordsDetector } from './detector.js'
import type { DetectorConfig } from '../types/index.js'
import { FilterMode } from '../types/index.js'

// Global default instance for quick-start functions
let defaultDetector: NaughtyWordsDetector | null = null

function getDefaultDetector(): NaughtyWordsDetector {
  if (!defaultDetector) {
    defaultDetector = new NaughtyWordsDetector()
  }
  return defaultDetector
}

/**
 * Quick detection function using default configuration
 */
export async function detect(text: string) {
  return await getDefaultDetector().analyze(text)
}

/**
 * Quick filter function using default configuration
 */
export async function filter(
  text: string,
  mode: FilterMode = FilterMode.CENSOR
) {
  return await getDefaultDetector().filter(text, mode)
}

/**
 * Quick clean check using default configuration
 */
export async function isClean(text: string): Promise<boolean> {
  return !(await getDefaultDetector().isProfane(text))
}

/**
 * Configure the default detector instance
 */
export function configure(config: Partial<DetectorConfig>): void {
  if (!defaultDetector) {
    defaultDetector = new NaughtyWordsDetector(config)
  } else {
    defaultDetector.updateConfig(config)
  }
}

/**
 * Reset the default detector instance
 */
export function reset(): void {
  defaultDetector = null
}
