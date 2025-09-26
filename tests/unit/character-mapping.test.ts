/**
 * Test suite for character mapping utilities
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  CharacterMapper,
  normalizeCharacters,
  generateCharacterVariations,
  getTextObfuscationLevel,
  LEETSPEAK_MAPPINGS,
  HOMOGRAPH_MAPPINGS,
  DIACRITIC_MAPPINGS
} from '../../src/utils/character-mapping.js'

describe('CharacterMapper', () => {
  let mapper: CharacterMapper

  beforeEach(() => {
    mapper = new CharacterMapper()
  })

  describe('Leetspeak normalization', () => {
    it('should normalize basic leetspeak', () => {
      const testCases = [
        { input: 'h3ll0', expected: 'hello' },
        { input: 'w0rld', expected: 'world' },
        { input: 'l33t', expected: 'leet' },
        { input: '4m4z1ng', expected: 'amazing' },
        { input: 'h@ck3r', expected: 'hacker' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeLeetspeak(input)
        expect(result).toBe(expected)
      }
    })

    it('should handle complex leetspeak', () => {
      const testCases = [
        { input: '$up3r', expected: 'super' },
        { input: 'l337', expected: 'leet' },
        { input: '(0d3', expected: 'code' },
        { input: '7h15', expected: 'this' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeLeetspeak(input)
        expect(result).toBe(expected)
      }
    })

    it('should detect leetspeak presence', () => {
      expect(mapper.hasLeetspeak('h3ll0')).toBe(true)
      expect(mapper.hasLeetspeak('hello')).toBe(false)
      expect(mapper.hasLeetspeak('w0rld')).toBe(true)
      expect(mapper.hasLeetspeak('normal text')).toBe(false)
    })
  })

  describe('Homograph normalization', () => {
    it('should normalize Cyrillic homographs', () => {
      const testCases = [
        { input: 'hеllo', expected: 'hello' }, // Cyrillic е
        { input: 'wоrld', expected: 'world' }, // Cyrillic о
        { input: 'tеst', expected: 'test' },   // Cyrillic е
        { input: 'uѕer', expected: 'user' }     // Cyrillic ѕ -> s
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeHomographs(input)
        expect(result).toBe(expected)
      }
    })

    it('should normalize Greek homographs', () => {
      const testCases = [
        { input: 'αlpha', expected: 'alpha' }, // Greek α
        { input: 'βeta', expected: 'beta' },   // Greek β
        { input: 'Ηello', expected: 'Hello' }  // Greek Η
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeHomographs(input)
        expect(result).toBe(expected)
      }
    })

    it('should normalize fullwidth characters', () => {
      const testCases = [
        { input: 'Ｈｅｌｌｏ', expected: 'Hello' },
        { input: 'ｗｏｒｌｄ', expected: 'world' },
        { input: 'ＴＥＳＴ', expected: 'TEST' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeHomographs(input)
        expect(result).toBe(expected)
      }
    })

    it('should detect homograph presence', () => {
      expect(mapper.hasHomographs('hеllo')).toBe(true) // Cyrillic е
      expect(mapper.hasHomographs('hello')).toBe(false)
      expect(mapper.hasHomographs('Ｈｅｌｌｏ')).toBe(true) // Fullwidth
      expect(mapper.hasHomographs('normal text')).toBe(false)
    })
  })

  describe('Diacritic normalization', () => {
    it('should normalize general diacritics', () => {
      const testCases = [
        { input: 'café', expected: 'cafe' },
        { input: 'naïve', expected: 'naive' },
        { input: 'résumé', expected: 'resume' },
        { input: 'piñata', expected: 'pinata' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeDiacritics(input)
        expect(result).toBe(expected)
      }
    })

    it('should normalize German diacritics', () => {
      const mapper = new CharacterMapper({ language: 'de' })
      const testCases = [
        { input: 'Müller', expected: 'Mueller' },
        { input: 'Größe', expected: 'Groesse' },
        { input: 'Weiß', expected: 'Weiss' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeDiacritics(input, 'de')
        expect(result).toBe(expected)
      }
    })

    it('should detect diacritic presence', () => {
      expect(mapper.hasDiacritics('café')).toBe(true)
      expect(mapper.hasDiacritics('hello')).toBe(false)
      expect(mapper.hasDiacritics('naïve')).toBe(true)
    })
  })

  describe('Repetition normalization', () => {
    it('should normalize repetitive characters', () => {
      const testCases = [
        { input: 'hellooooo', expected: 'helloo' },
        { input: 'wooooorld', expected: 'woorld' },
        { input: 'sooooo', expected: 'soo' },
        { input: 'yeaaaaaah', expected: 'yeaah' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeRepetition(input)
        expect(result).toBe(expected)
      }
    })

    it('should preserve double characters', () => {
      const testCases = [
        { input: 'hello', expected: 'hello' },
        { input: 'book', expected: 'book' },
        { input: 'coffee', expected: 'coffee' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.normalizeRepetition(input)
        expect(result).toBe(expected)
      }
    })

    it('should detect repetition presence', () => {
      expect(mapper.hasRepetition('hellooooo')).toBe(true)
      expect(mapper.hasRepetition('hello')).toBe(false)
      expect(mapper.hasRepetition('wooooorld')).toBe(true)
    })
  })

  describe('Separator removal', () => {
    it('should remove common separators', () => {
      const testCases = [
        { input: 'h_e_l_l_o', expected: 'hello' },
        { input: 'w-o-r-l-d', expected: 'world' },
        { input: 't.e.s.t', expected: 'test' },
        { input: 'c*o*d*e', expected: 'code' }
      ]

      for (const { input, expected } of testCases) {
        const result = mapper.removeSeparators(input)
        expect(result).toBe(expected)
      }
    })

    it('should remove invisible characters', () => {
      const text = 'hel\u200blo\u200c\u200dworld'
      const result = mapper.removeSeparators(text)
      expect(result).toBe('helloworld')
    })
  })

  describe('Character mapping', () => {
    it('should generate character variations', () => {
      const variations = mapper.mapCharacters('hello')
      expect(Array.isArray(variations)).toBe(true)
      expect(variations).toContain('hello')
      expect(variations.length).toBeGreaterThan(1)
    })

    it('should limit variation count', () => {
      const variations = mapper.generateVariations('test', 5)
      expect(variations.length).toBeLessThanOrEqual(5)
    })

    it('should handle complex obfuscation', () => {
      const variations = mapper.mapCharacters('h3ll0')
      expect(variations).toContain('h3ll0')
      expect(variations).toContain('hello')
    })
  })

  describe('Obfuscation analysis', () => {
    it('should analyze obfuscation level', () => {
      const testCases = [
        { text: 'hello', expected: 'none' },
        { text: 'h3llo', expected: 'low' },
        { text: 'h3l_l0', expected: 'medium' },
        { text: 'h3l-l0ооо', expected: 'high' }
      ]

      for (const { text, expected } of testCases) {
        const stats = mapper.getObfuscationStats(text)
        expect(stats.obfuscationLevel).toBe(expected)
      }
    })

    it('should provide detailed obfuscation statistics', () => {
      const stats = mapper.getObfuscationStats('h3l_lоо0')

      expect(stats).toHaveProperty('hasLeetspeak')
      expect(stats).toHaveProperty('hasHomographs')
      expect(stats).toHaveProperty('hasDiacritics')
      expect(stats).toHaveProperty('hasRepetition')
      expect(stats).toHaveProperty('hasSeparators')
      expect(stats).toHaveProperty('obfuscationLevel')

      expect(typeof stats.hasLeetspeak).toBe('boolean')
      expect(typeof stats.hasHomographs).toBe('boolean')
      expect(typeof stats.hasDiacritics).toBe('boolean')
      expect(typeof stats.hasRepetition).toBe('boolean')
      expect(typeof stats.hasSeparators).toBe('boolean')
    })
  })

  describe('Configuration options', () => {
    it('should respect enableLeetspeak option', () => {
      const mapperNoLeet = new CharacterMapper({ enableLeetspeak: false })
      const variations = mapperNoLeet.mapCharacters('h3llo')
      expect(variations).toEqual(['h3llo'])
    })

    it('should respect enableHomographs option', () => {
      const mapperNoHomographs = new CharacterMapper({ enableHomographs: false })
      const variations = mapperNoHomographs.mapCharacters('hеllo')
      expect(variations).toEqual(['hеllo'])
    })

    it('should respect enableDiacritics option', () => {
      const mapperNoDiacritics = new CharacterMapper({ enableDiacritics: false })
      const variations = mapperNoDiacritics.mapCharacters('café')
      expect(variations).toEqual(['café'])
    })
  })
})

describe('Character mapping constants', () => {
  describe('LEETSPEAK_MAPPINGS', () => {
    it('should contain common leetspeak mappings', () => {
      expect(LEETSPEAK_MAPPINGS).toHaveProperty('0')
      expect(LEETSPEAK_MAPPINGS).toHaveProperty('1')
      expect(LEETSPEAK_MAPPINGS).toHaveProperty('3')
      expect(LEETSPEAK_MAPPINGS).toHaveProperty('@')
      expect(LEETSPEAK_MAPPINGS).toHaveProperty('$')

      expect(LEETSPEAK_MAPPINGS['0']).toContain('o')
      expect(LEETSPEAK_MAPPINGS['1']).toContain('i')
      expect(LEETSPEAK_MAPPINGS['3']).toContain('e')
    })
  })

  describe('HOMOGRAPH_MAPPINGS', () => {
    it('should contain Cyrillic homographs', () => {
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('а') // Cyrillic а
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('е') // Cyrillic е
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('о') // Cyrillic о

      expect(HOMOGRAPH_MAPPINGS['а']).toContain('a')
      expect(HOMOGRAPH_MAPPINGS['е']).toContain('e')
      expect(HOMOGRAPH_MAPPINGS['о']).toContain('o')
    })

    it('should contain Greek homographs', () => {
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('α') // Greek α
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('β') // Greek β
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('Α') // Greek Α

      expect(HOMOGRAPH_MAPPINGS['α']).toContain('a')
      expect(HOMOGRAPH_MAPPINGS['β']).toContain('b')
      expect(HOMOGRAPH_MAPPINGS['Α']).toContain('A')
    })

    it('should contain fullwidth characters', () => {
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('Ａ') // Fullwidth A
      expect(HOMOGRAPH_MAPPINGS).toHaveProperty('ａ') // Fullwidth a

      expect(HOMOGRAPH_MAPPINGS['Ａ']).toContain('A')
      expect(HOMOGRAPH_MAPPINGS['ａ']).toContain('a')
    })
  })

  describe('DIACRITIC_MAPPINGS', () => {
    it('should contain general diacritics', () => {
      expect(DIACRITIC_MAPPINGS.general).toHaveProperty('à')
      expect(DIACRITIC_MAPPINGS.general).toHaveProperty('é')
      expect(DIACRITIC_MAPPINGS.general).toHaveProperty('ñ')

      expect(DIACRITIC_MAPPINGS.general['à']).toContain('a')
      expect(DIACRITIC_MAPPINGS.general['é']).toContain('e')
      expect(DIACRITIC_MAPPINGS.general['ñ']).toContain('n')
    })

    it('should contain language-specific mappings', () => {
      expect(DIACRITIC_MAPPINGS.de).toHaveProperty('ä')
      expect(DIACRITIC_MAPPINGS.de).toHaveProperty('ß')
      expect(DIACRITIC_MAPPINGS.fr).toHaveProperty('œ')
      expect(DIACRITIC_MAPPINGS.es).toHaveProperty('ñ')

      expect(DIACRITIC_MAPPINGS.de['ä']).toContain('ae')
      expect(DIACRITIC_MAPPINGS.de['ß']).toContain('ss')
      expect(DIACRITIC_MAPPINGS.fr['œ']).toContain('oe')
    })
  })
})

describe('Utility functions', () => {
  describe('normalizeCharacters', () => {
    it('should apply all normalizations', () => {
      const result = normalizeCharacters('h3l-l0оо')
      expect(result).toBe('hello')
    })

    it('should respect language parameter', () => {
      const result = normalizeCharacters('Müller', 'de')
      expect(result).toBe('mueller')
    })
  })

  describe('generateCharacterVariations', () => {
    it('should generate variations', () => {
      const variations = generateCharacterVariations('hello')
      expect(Array.isArray(variations)).toBe(true)
      expect(variations).toContain('hello')
      expect(variations.length).toBeGreaterThan(1)
    })

    it('should limit variations', () => {
      const variations = generateCharacterVariations('test', 3)
      expect(variations.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getTextObfuscationLevel', () => {
    it('should return correct obfuscation levels', () => {
      expect(getTextObfuscationLevel('hello')).toBe('none')
      expect(getTextObfuscationLevel('h3llo')).toBe('low')
      expect(getTextObfuscationLevel('h3l_l0')).toBe('medium')
      expect(getTextObfuscationLevel('h3l-l0ооо')).toBe('high')
    })
  })
})