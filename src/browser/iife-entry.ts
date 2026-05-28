/**
 * Browser IIFE entry point.
 *
 * Exposes ContentShield as a single global for `<script>` tag usage:
 *
 *   <script src="https://zachhandley.github.io/ContentShield/content-shield.iife.js"></script>
 *   <script>
 *     // English ships with the bundle; other locales fetched on demand.
 *     const result = await ContentShield.detect("some text")
 *   </script>
 *
 * Only English is bundled; additional languages are fetched from the
 * sibling `data/<code>.json` files emitted by scripts/emit-data-json.ts.
 */

import { configure, detect, filter, isClean, reset } from '../core/quick-start.js'
import type { StaticLanguageData, LanguageCode } from '../types/index.js'
import { EN } from '../languages/data/en.js'

let englishLoaded = false

async function ensureEnglish(): Promise<void> {
  if (englishLoaded) return
  await configure({ languageData: { en: EN }, languages: ['en'] })
  englishLoaded = true
}

/**
 * Fetch a language's static data from the same origin the IIFE was served
 * from, then register it for detection.
 *
 *   await ContentShield.loadLanguage('es')
 *   // …subsequent detect() calls will see Spanish.
 */
async function loadLanguage(
  code: LanguageCode,
  baseUrl = '',
): Promise<void> {
  if (code === 'auto') return
  const url = `${baseUrl.replace(/\/$/, '')}/data/${code}.json`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to load ${code} data from ${url}: ${res.status}`)
  }
  const data = (await res.json()) as StaticLanguageData
  await configure({ languageData: { [code]: data } })
}

async function detectWithDefault(text: string) {
  await ensureEnglish()
  return detect(text)
}

async function filterWithDefault(text: string) {
  await ensureEnglish()
  return filter(text)
}

async function isCleanWithDefault(text: string) {
  await ensureEnglish()
  return isClean(text)
}

export {
  detectWithDefault as detect,
  filterWithDefault as filter,
  isCleanWithDefault as isClean,
  configure,
  reset,
  loadLanguage,
  EN,
}
