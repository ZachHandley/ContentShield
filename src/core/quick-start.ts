import { NaughtyWordsDetector } from './detector.js'
import type { DetectorConfig } from '../types/index.js'
import { FilterMode } from '../types/index.js'

// Global default instance for quick-start functions
let defaultDetector: NaughtyWordsDetector | null = null
let initPromise: Promise<void> | null = null

async function getDefaultDetector(): Promise<NaughtyWordsDetector> {
  if (!defaultDetector) {
    defaultDetector = new NaughtyWordsDetector()
    initPromise = defaultDetector.initialize()
  }
  if (initPromise) {
    await initPromise
    initPromise = null
  }
  return defaultDetector
}

/**
 * Quick detection function using default configuration
 */
export async function detect(text: string) {
  const detector = await getDefaultDetector()
  return await detector.analyze(text)
}

/**
 * Quick filter function using default configuration
 */
export async function filter(
  text: string,
  mode: FilterMode = FilterMode.CENSOR
) {
  const detector = await getDefaultDetector()
  return await detector.filter(text, mode)
}

/**
 * Quick clean check using default configuration
 */
export async function isClean(text: string): Promise<boolean> {
  const detector = await getDefaultDetector()
  return !(await detector.isProfane(text))
}

/**
 * Configure the default detector instance
 */
export async function configure(
  config: Partial<DetectorConfig>
): Promise<void> {
  if (!defaultDetector) {
    defaultDetector = new NaughtyWordsDetector(config)
    initPromise = defaultDetector.initialize()
    await initPromise
    initPromise = null
  } else {
    defaultDetector.updateConfig(config)
  }
}

/**
 * Reset the default detector instance
 */
export function reset(): void {
  defaultDetector = null
  initPromise = null
}
