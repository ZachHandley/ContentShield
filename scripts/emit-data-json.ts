/**
 * Emit `dist/data/<code>.json` for every language at build time.
 *
 * These files are deployed to GitHub Pages so consumers can lazy-load a single
 * language at runtime without bundling all 19 locales:
 *
 *   const data = await (await fetch(
 *     'https://zachhandley.github.io/ContentShield/data/en.json'
 *   )).json()
 *   await configure({ languageData: { en: data } })
 *
 * Run via `pnpm run emit:data` (wired into the build script).
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import * as DATA from '../src/languages/data/index.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.resolve(HERE, '..', 'dist', 'data')

const LANGUAGES = [
  'AR', 'DE', 'EN', 'ES', 'FR', 'HE', 'HI', 'IT', 'JA',
  'KO', 'NL', 'PL', 'PT', 'RU', 'SV', 'TR', 'ZH',
] as const

async function main(): Promise<void> {
  await fs.mkdir(OUT_DIR, { recursive: true })
  for (const upper of LANGUAGES) {
    const code = upper.toLowerCase()
    const value = (DATA as Record<string, unknown>)[upper]
    if (!value) {
      throw new Error(`Language module ${upper} not exported from data/index`)
    }
    const outPath = path.join(OUT_DIR, `${code}.json`)
    await fs.writeFile(outPath, JSON.stringify(value), 'utf-8')
    console.log(`✓ wrote ${path.relative(process.cwd(), outPath)}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
