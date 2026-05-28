/**
 * Language data module exports
 * Auto-generated on 2025-10-01
 */

import type { LanguageCode, StaticLanguageData } from '../../types/index.js';
import { EN } from './en.js';
import { ES } from './es.js';
import { DE } from './de.js';
import { PT } from './pt.js';
import { FR } from './fr.js';
import { IT } from './it.js';
import { NL } from './nl.js';
import { PL } from './pl.js';
import { SV } from './sv.js';
import { TR } from './tr.js';
import { HE } from './he.js';
import { RU } from './ru.js';
import { ZH } from './zh.js';
import { JA } from './ja.js';
import { KO } from './ko.js';
import { AR } from './ar.js';
import { HI } from './hi.js';

export { EN, ES, DE, PT, FR, IT, NL, PL, SV, TR, HE, RU, ZH, JA, KO, AR, HI };

// Annotated to keep TS from trying to serialize the full literal type of every
// word entry across 17 languages — that hits the
// "inferred type exceeds maximum length" limit.
export const LANGUAGE_DATA: Partial<Record<LanguageCode, StaticLanguageData>> = {
  en: EN,
  es: ES,
  de: DE,
  pt: PT,
  fr: FR,
  it: IT,
  nl: NL,
  pl: PL,
  sv: SV,
  tr: TR,
  he: HE,
  ru: RU,
  zh: ZH,
  ja: JA,
  ko: KO,
  ar: AR,
  hi: HI,
};
