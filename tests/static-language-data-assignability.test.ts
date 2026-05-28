/**
 * Regression test for the README quick-start snippet.
 *
 * Before the readonly type fix, calling `configure({ languageData: { en: EN } })`
 * with the deeply-frozen `as const` data object failed to compile with:
 *
 *   Type 'readonly [...]' is 'readonly' and cannot be assigned to the mutable
 *   type 'WordEntry[]'.
 *
 * If this file ever stops typechecking, the public API has regressed in the
 * same way Michael Balogh hit on 2026-05-28. Do not "fix" it with `as any`
 * or `as unknown` — fix the types.
 */

import { describe, it, expect } from 'vitest'
import { configure, detect, reset } from '../src/index.js'
import { EN } from '../src/languages/data/en.js'

describe('README quick-start assignability', () => {
  it('accepts the as-const language data without casts', async () => {
    reset()

    // This is the exact snippet from README.md. It must compile.
    await configure({ languageData: { en: EN }, languages: ['en'] })

    const result = await detect('hello world')
    expect(result).toBeDefined()
  })
})
