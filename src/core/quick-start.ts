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
 * Configure the default detector instance with custom settings.
 *
 * This function allows you to configure the global detector used by quick-start functions.
 * Once configured, all subsequent calls to detect(), filter(), and isClean() will use
 * these settings.
 *
 * @param config - Partial detector configuration to apply
 *
 * @example
 * ```typescript
 * // Configure with static language data (tree-shakeable)
 * import { configure, detect } from 'naughty-words'
 * import { EN } from 'naughty-words/languages/en'
 *
 * await configure({
 *   languageData: { en: EN },
 *   languages: ['en']
 * })
 *
 * const result = await detect('some text')
 * ```
 *
 * @example
 * ```typescript
 * // Configure with dynamic loading (loads from data directory)
 * import { configure, detect } from 'naughty-words'
 *
 * await configure({
 *   languages: ['en', 'es'],
 *   minSeverity: SeverityLevel.HIGH
 * })
 *
 * const result = await detect('some text')
 * ```
 *
 * @example
 * ```typescript
 * // Configure multiple languages with static imports
 * import { configure, detect } from 'naughty-words'
 * import { EN } from 'naughty-words/languages/en'
 * import { ES } from 'naughty-words/languages/es'
 *
 * await configure({
 *   languageData: {
 *     en: EN,
 *     es: ES
 *   },
 *   languages: ['en', 'es'],
 *   fuzzyMatching: true
 * })
 *
 * const result = await detect('text with multiple languages')
 * ```
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
