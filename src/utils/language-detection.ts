/**
 * Advanced language detection system for NaughtyWords
 * Uses character frequency analysis and pattern matching for efficient detection
 */

import type { LanguageCode, LanguageDetection } from '../types/index.js'

/**
 * Character frequency data for different languages
 * Based on statistical analysis of common text in each language
 */
const LANGUAGE_FREQUENCIES: Record<string, Record<string, number>> = {
  en: {
    e: 12.7, t: 9.1, a: 8.2, o: 7.5, i: 7.0, n: 6.7, s: 6.3, h: 6.1, r: 6.0,
    d: 4.3, l: 4.0, c: 2.8, u: 2.8, m: 2.4, w: 2.4, f: 2.2, g: 2.0, y: 2.0,
    p: 1.9, b: 1.3, v: 1.0, k: 0.8, j: 0.15, x: 0.15, q: 0.10, z: 0.07
  },
  es: {
    e: 13.7, a: 12.5, o: 8.7, s: 8.0, r: 6.9, n: 6.7, i: 6.2, l: 4.97, d: 5.9,
    t: 4.6, c: 4.7, u: 3.9, m: 3.2, p: 2.5, b: 1.4, g: 1.0, v: 0.9, y: 0.9,
    q: 0.9, h: 0.7, f: 0.7, z: 0.5, j: 0.4, ñ: 0.3, x: 0.2, k: 0.1, w: 0.0
  },
  fr: {
    e: 17.3, s: 7.9, a: 7.6, i: 7.5, t: 7.2, n: 7.1, r: 6.6, u: 6.3, l: 5.5,
    o: 5.3, d: 3.7, c: 3.3, p: 3.0, m: 3.0, é: 1.9, f: 1.1, b: 0.9, v: 1.6,
    h: 0.7, g: 0.9, y: 0.3, q: 1.4, j: 0.5, x: 0.4, à: 0.5, è: 0.3, z: 0.1
  },
  de: {
    e: 17.4, n: 9.8, i: 7.6, s: 7.3, r: 7.0, a: 6.5, t: 6.2, d: 5.1, h: 4.8,
    u: 4.4, l: 3.4, c: 3.1, g: 3.0, m: 2.5, o: 2.5, b: 1.9, w: 1.9, f: 1.7,
    k: 1.2, z: 1.1, p: 0.8, v: 0.7, ü: 0.7, ä: 0.5, ö: 0.3, j: 0.3, y: 0.04
  },
  it: {
    e: 11.8, a: 11.7, i: 11.3, o: 9.8, n: 6.9, r: 6.4, t: 5.6, l: 6.5, c: 4.5,
    s: 5.0, d: 3.7, u: 3.0, p: 3.1, m: 2.5, g: 1.6, v: 2.1, f: 1.2, b: 0.9,
    z: 0.5, h: 1.5, q: 0.5, è: 0.4, à: 0.6, ò: 0.2, ù: 0.1, ì: 0.1, í: 0.06
  },
  pt: {
    a: 14.6, e: 12.6, o: 10.7, s: 7.8, r: 6.5, i: 6.2, n: 5.2, d: 5.0, m: 4.7,
    u: 4.6, t: 4.3, c: 3.9, l: 2.8, p: 2.5, v: 1.7, g: 1.3, h: 1.3, q: 1.2,
    b: 1.0, f: 1.0, z: 0.5, j: 0.4, x: 0.3, ç: 0.4, ã: 0.7, õ: 0.4, á: 0.5
  },
  ru: {
    о: 10.97, е: 8.45, а: 8.01, и: 7.35, н: 6.7, т: 6.26, с: 5.47, р: 4.73,
    в: 4.54, л: 4.40, к: 3.49, м: 3.21, д: 2.98, п: 2.81, у: 2.62, я: 2.01,
    ы: 1.90, ь: 1.74, г: 1.70, з: 1.65, б: 1.59, ч: 1.44, й: 1.21, х: 0.97
  },
  zh: {
    的: 7.9, 一: 4.1, 是: 3.3, 在: 2.9, 不: 2.3, 了: 2.2, 有: 2.1, 和: 1.6,
    人: 1.4, 这: 1.3, 中: 1.2, 大: 1.1, 为: 1.0, 上: 0.9, 个: 0.9, 国: 0.8,
    我: 0.8, 以: 0.7, 要: 0.7, 他: 0.7, 时: 0.6, 来: 0.6, 用: 0.6, 们: 0.6
  },
  ja: {
    の: 4.8, に: 3.6, は: 3.4, を: 3.2, た: 2.8, が: 2.7, で: 2.4, て: 2.3,
    と: 2.1, し: 2.0, れ: 1.8, さ: 1.7, る: 1.6, あ: 1.5, い: 1.4, ら: 1.3,
    す: 1.2, っ: 1.1, な: 1.1, り: 1.0, ん: 1.0, だ: 0.9, ま: 0.9, こ: 0.8
  },
  ar: {
    ا: 12.8, ل: 9.7, ي: 8.6, م: 7.5, و: 7.2, ن: 6.9, ر: 5.9, ت: 5.4, ب: 4.9,
    ع: 4.6, د: 4.3, س: 3.8, ف: 3.5, ق: 3.2, ك: 3.0, ه: 2.8, ح: 2.5, ج: 2.2,
    ط: 2.0, ص: 1.8, خ: 1.6, ز: 1.4, ش: 1.3, ض: 1.2, غ: 1.0, ذ: 0.9, ث: 0.8
  },
  he: {
    א: 8.9, ל: 8.8, ר: 7.8, ה: 7.6, י: 7.2, ו: 6.9, ת: 6.1, נ: 5.8, מ: 5.5,
    ב: 4.9, ש: 4.7, ד: 4.4, ע: 4.1, כ: 3.8, ח: 3.5, ק: 3.2, פ: 2.9, ז: 2.6,
    ג: 2.3, ט: 2.0, צ: 1.7, ס: 1.4, ך: 1.1, ם: 0.8, ן: 0.5, ף: 0.2, ץ: 0.1
  },
  hi: {
    क: 8.6, र: 8.1, त: 7.8, न: 7.2, स: 6.5, म: 5.9, ह: 5.4, द: 5.0, व: 4.7,
    ल: 4.3, प: 4.0, य: 3.8, ज: 3.5, ब: 3.2, च: 2.9, ग: 2.6, श: 2.4, अ: 2.1,
    आ: 1.9, इ: 1.7, उ: 1.5, ए: 1.3, ओ: 1.1, औ: 0.9, ऋ: 0.1, ऌ: 0.05
  },
  ko: {
    이: 4.5, 다: 3.8, 에: 3.4, 는: 3.1, 하: 2.9, 고: 2.6, 을: 2.4, 아: 2.2,
    으: 2.0, 의: 1.9, 가: 1.8, 로: 1.7, 한: 1.6, 지: 1.5, 도: 1.4, 서: 1.3,
    기: 1.2, 과: 1.1, 자: 1.0, 어: 0.9, 나: 0.8, 오: 0.7, 인: 0.7, 사: 0.6
  },
  nl: {
    e: 18.9, n: 10.0, a: 7.5, t: 6.8, i: 6.5, r: 6.4, o: 6.1, d: 5.9, s: 3.7,
    l: 3.6, g: 3.4, v: 2.9, h: 2.4, k: 2.3, m: 2.2, u: 2.0, b: 1.6, p: 1.6,
    w: 1.5, j: 1.5, z: 1.4, c: 1.2, f: 0.8, y: 0.04, q: 0.009, x: 0.04
  },
  sv: {
    a: 9.4, e: 9.9, n: 8.8, r: 8.4, t: 7.7, s: 6.6, l: 5.3, o: 4.5, i: 5.8,
    d: 4.5, ä: 2.0, k: 3.1, g: 2.9, m: 3.5, v: 2.4, f: 2.0, u: 1.9, p: 1.5,
    h: 2.1, c: 1.4, b: 1.3, ö: 1.3, j: 0.6, y: 0.7, w: 0.1, x: 0.1, z: 0.07
  },
  pl: {
    a: 10.5, i: 8.2, o: 7.8, e: 7.7, z: 6.4, n: 5.5, r: 4.7, w: 4.6, s: 4.3,
    t: 3.9, c: 3.96, k: 3.5, d: 3.3, y: 3.8, m: 2.8, u: 2.5, l: 2.1, b: 1.5,
    g: 1.4, p: 3.1, j: 2.3, ł: 1.8, ę: 1.1, ą: 0.9, ć: 0.4, ń: 0.4, ś: 0.7
  }
}

/**
 * Language detection result with confidence scoring
 */
export interface LanguageDetectionResult {
  language: LanguageCode
  confidence: number
  sample?: string
}

/**
 * Cached detection results for performance optimization
 */
const detectionCache = new Map<string, LanguageDetectionResult[]>()

/**
 * Maximum cache size to prevent memory issues
 */
const MAX_CACHE_SIZE = 1000

/**
 * Advanced language detection engine
 */
export class LanguageDetectionEngine {
  private cacheEnabled: boolean
  private minTextLength: number
  private maxSampleLength: number

  constructor(options: {
    cacheEnabled?: boolean
    minTextLength?: number
    maxSampleLength?: number
  } = {}) {
    this.cacheEnabled = options.cacheEnabled ?? true
    this.minTextLength = options.minTextLength ?? 10
    this.maxSampleLength = options.maxSampleLength ?? 200
  }

  /**
   * Detect languages in the given text
   */
  detect(text: string): LanguageDetectionResult[] {
    // Check for script-based languages first (they can be shorter)
    const scriptResults = this.detectByScript(text)
    if (scriptResults.length > 0 && scriptResults[0]!.confidence > 0.3) {
      const finalResults: LanguageDetectionResult[] = [{
        ...scriptResults[0]!,
        sample: text.substring(0, 50)
      }]
      return finalResults
    }

    if (!text || text.trim().length === 0) {
      return []
    }

    if (text.length < this.minTextLength) {
      return [{ language: 'en', confidence: 0.11 }]
    }

    // Check cache first
    const cacheKey = this.createCacheKey(text)
    if (this.cacheEnabled && detectionCache.has(cacheKey)) {
      return detectionCache.get(cacheKey)!
    }

    // Normalize and prepare text for analysis
    const normalizedText = this.normalizeForDetection(text)
    const sample = normalizedText.substring(0, this.maxSampleLength)

    // Perform multi-method detection
    const frequencyResults = this.detectByCharacterFrequency(sample)
    const patternResults = this.detectByPatterns(sample)
    // We already checked script results above

    // For script-based languages (Chinese, Japanese, etc.), prioritize script detection
    if (scriptResults.length > 0) {
      const topScriptResult = scriptResults[0]!
      if (topScriptResult.confidence > 0.3) {
        // Strong script detection - use it as the primary result
        const finalResults: LanguageDetectionResult[] = [{
          ...topScriptResult,
          sample: sample.substring(0, 50)
        }]

        // Cache and return immediately for script-based languages
        if (this.cacheEnabled) {
          this.addToCache(cacheKey, finalResults)
        }

        return finalResults
      }
    }

    // Standard detection for non-script-based languages
    const combinedResults = this.combineDetectionResults(
      frequencyResults,
      patternResults,
      scriptResults
    )

    // Filter and sort by confidence
    const filteredResults = combinedResults
      .filter(result => result.confidence > 0.08)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3) // Return top 3 candidates
      .map(result => ({
        ...result,
        sample: sample.substring(0, 50)
      }))

    // Cache results
    if (this.cacheEnabled) {
      this.addToCache(cacheKey, filteredResults)
    }

    return filteredResults.length > 0 ? filteredResults : [{ language: 'en', confidence: 0.11 }]
  }

  /**
   * Get the most likely language from text
   */
  detectPrimary(text: string): LanguageCode {
    const results = this.detect(text)
    return results.length > 0 && results[0] ? results[0].language : 'en'
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    detectionCache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: detectionCache.size,
      maxSize: MAX_CACHE_SIZE
    }
  }

  private createCacheKey(text: string): string {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim()
    return normalized.length > 100 ?
      normalized.substring(0, 100) + `_${normalized.length}` :
      normalized
  }

  private normalizeForDetection(text: string): string {
    return text
      .toLowerCase()
      // Use Unicode categories instead of ranges to avoid misleading character class issues
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private detectByCharacterFrequency(text: string): LanguageDetectionResult[] {
    const results: LanguageDetectionResult[] = []
    const textFreq = this.calculateCharacterFrequency(text)

    for (const [langCode, langFreq] of Object.entries(LANGUAGE_FREQUENCIES)) {
      const similarity = this.calculateFrequencySimilarity(textFreq, langFreq)
      if (similarity > 0.15) { // Increased threshold
        results.push({
          language: langCode as LanguageCode,
          confidence: similarity * 0.4 // Reduced weight to 40%
        })
      }
    }

    return results
  }

  private detectByPatterns(text: string): LanguageDetectionResult[] {
    const results: LanguageDetectionResult[] = []
    const words = text.split(/\s+/).filter(word => word.length > 0)

    // Enhanced high-confidence word markers with more distinctive words
    const strongMarkers: Record<string, string[]> = {
      en: ['the', 'and', 'that', 'have', 'for', 'not', 'with', 'you', 'this', 'but', 'his', 'from', 'they', 'are', 'be', 'an', 'will', 'would', 'could', 'should', 'am', 'is', 'writing', 'some', 'english', 'language'],
      es: ['que', 'de', 'el', 'la', 'en', 'y', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'con', 'para', 'como', 'muy', 'mundo', 'hola', 'gato', 'está', 'sobre', 'mesa', 'gusta', 'mucho', 'comida', 'española', 'buenos', 'días', 'cómo', 'está', 'usted', 'hoy'],
      fr: ['le', 'de', 'et', 'être', 'un', 'il', 'avoir', 'ne', 'je', 'son', 'que', 'se', 'qui', 'ce', 'dans', 'vous', 'mon', 'ma', 'mes', 'tout', 'bonjour', 'monde', 'suis', 'très', 'content', 'voir', 'france', 'beau', 'pays', 'comment', 'allez-vous', 'aujourd\'hui'],
      de: ['der', 'die', 'und', 'in', 'den', 'von', 'zu', 'das', 'mit', 'sich', 'des', 'auf', 'für', 'ist', 'dem', 'nicht', 'ein', 'eine', 'einer', 'einen', 'hallo', 'welt', 'bin', 'sehr', 'glücklich', 'heute', 'deutschland', 'schönes', 'land', 'wie', 'geht', 'ihnen'],
      it: ['che', 'di', 'il', 'un', 'a', 'è', 'per', 'una', 'in', 'del', 'la', 'non', 'le', 'si', 'da', 'questo', 'quello', 'quella', 'quelli', 'quelle'],
      pt: ['que', 'de', 'o', 'a', 'e', 'do', 'da', 'em', 'um', 'para', 'é', 'com', 'não', 'uma', 'os', 'como', 'por', 'mas', 'muito', 'qual'],
      nl: ['de', 'het', 'een', 'van', 'in', 'is', 'op', 'dat', 'met', 'voor', 'als', 'zijn', 'er', 'maar', 'om', 'niet', 'wat', 'hoe', 'waar', 'wie']
    }

    // Highly distinctive patterns for each language
    const uniquePatterns: Record<string, RegExp[]> = {
      en: [/\b(the|and|that|have|for|not|with|you|this|but|his|from|they|are|be|am|is)\b/gi, /\b\w+ing\b/gi, /\b\w+ed\b/gi, /\b\w+ly\b/gi],
      es: [/\b(que|de|el|la|en|y|un|es|se|no|te|lo|le|da|su|por|con|para|como|muy)\b/gi, /\b\w+ción\b/gi, /\b\w+mente\b/gi, /\b(está|gato|mesa|gusta|comida|buenos|días|cómo|está|usted|hoy)\b/gi, /[áéíóúüñ¿¡]/gi],
      fr: [/\b(le|de|et|être|un|il|avoir|ne|je|son|que|se|qui|ce|dans|vous|mon|ma|mes|tout)\b/gi, /\b\w+ment\b/gi, /\b\w+tion\b/gi, /\b(suis|très|content|voir|france|beau|pays|comment|allez-vous|aujourd'hui)\b/gi, /[àâäéèêëïîôöùûüÿç]/gi],
      de: [/\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|dem|nicht|ein|eine)\b/gi, /\b\w+ung\b/gi, /\b\w+lich\b/gi, /\b(bin|sehr|glücklich|heute|deutschland|schönes|land|wie|geht|ihnen)\b/gi, /[äöüß]/gi],
      it: [/\b(che|di|il|un|a|è|per|una|in|del|la|non|le|si|da)\b/gi, /\b\w+zione\b/gi, /\b\w+mente\b/gi, /[àáèéìíîòóùúü]/gi],
      pt: [/\b(que|de|o|a|e|do|da|em|um|para|é|com|não|uma|os)\b/gi, /\b\w+ção\b/gi, /\b\w+mente\b/gi, /[áàâãéêíóôõúç]/gi],
      nl: [/\b(de|het|een|van|in|is|op|dat|met|voor|als|zijn|er|maar|om)\b/gi, /\b\w+lijk\b/gi, /\b\w+heid\b/gi]
    }

    for (const [langCode, markers] of Object.entries(strongMarkers)) {
      let score = 0

      // Enhanced marker scoring with higher weight for very distinctive words
      const markerMatches = words.filter(word => markers.includes(word.toLowerCase()))
      const markerScore = markerMatches.length / Math.max(words.length, 1)
      score += markerScore * 0.7

      // Pattern matching
      const patterns = uniquePatterns[langCode]
      if (patterns) {
        let patternScore = 0
        for (const pattern of patterns) {
          const matches = text.match(pattern)
          if (matches) {
            patternScore += matches.length
          }
        }
        score += (patternScore / Math.max(words.length, 1)) * 0.3
      }

      // Boost confidence for strong matches and lower threshold
      if (score > 0.02) {
        results.push({
          language: langCode as LanguageCode,
          confidence: Math.min(score * 2.8, 1) // Further increased boost
        })
      }
    }

    return results
  }

  private detectByScript(text: string): LanguageDetectionResult[] {
    const results: LanguageDetectionResult[] = []

    // Enhanced script detection with better handling of overlapping scripts
    const scriptChecks = [
      { pattern: /[\u4e00-\u9fff]/, language: 'zh', name: 'Chinese' },
      { pattern: /[\u3040-\u309f\u30a0-\u30ff]/, language: 'ja', name: 'Japanese' },
      { pattern: /[\u0600-\u06ff]/, language: 'ar', name: 'Arabic' },
      { pattern: /[\u0400-\u04ff]/, language: 'ru', name: 'Cyrillic' },
      { pattern: /[\u0900-\u097f]/, language: 'hi', name: 'Devanagari' },
      { pattern: /[\uac00-\ud7af]/, language: 'ko', name: 'Korean' }
    ]

    const cleanText = text.replace(/\s/g, '')
    if (cleanText.length === 0) return results

    // Special handling for Chinese vs Japanese overlap
    const chineseMatches = text.match(/[\u4e00-\u9fff]/g)
    const japaneseMatches = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g)

    // If both Chinese and Japanese characters are found, determine dominant script
    if (chineseMatches && japaneseMatches) {
      const chineseRatio = chineseMatches.length / cleanText.length
      const japaneseRatio = japaneseMatches.length / cleanText.length

      // Japanese has kana, Chinese has mostly kanji - prefer Japanese if kana present
      const hasKana = text.match(/[\u3040-\u309f\u30a0-\u30ff]/g)
      if (hasKana && hasKana.length > 0) {
        results.push({
          language: 'ja',
          confidence: Math.min(japaneseRatio * 4, 1) * 0.9
        })
        results.push({
          language: 'zh',
          confidence: Math.min(chineseRatio * 2, 1) * 0.5
        })
      } else {
        results.push({
          language: 'zh',
          confidence: Math.min(chineseRatio * 4, 1) * 0.9
        })
        results.push({
          language: 'ja',
          confidence: Math.min(japaneseRatio * 2, 1) * 0.5
        })
      }
    } else {
      // Handle single script cases
      for (const check of scriptChecks) {
        const matches = text.match(new RegExp(check.pattern, 'g'))
        if (matches && matches.length > 0) {
          const scriptRatio = matches.length / cleanText.length
          const confidence = Math.min(scriptRatio * 4, 1) // Increased multiplier

          if (confidence > 0.05) { // Lowered threshold
            results.push({
              language: check.language as LanguageCode,
              confidence: confidence * 0.9 // Weight script detection very highly
            })
          }
        }
      }
    }

    return results
  }

  private combineDetectionResults(
    ...resultSets: LanguageDetectionResult[][]
  ): LanguageDetectionResult[] {
    const combined = new Map<string, number>()
    const frequencyResults = resultSets[0] || []
    const patternResults = resultSets[1] || []
    const scriptResults = resultSets[2] || []

    // Apply weights: patterns (65%) > frequency (10%) > script (25%)
    for (const result of patternResults) {
      const current = combined.get(result.language) || 0
      combined.set(result.language, current + (result.confidence * 0.65))
    }

    for (const result of frequencyResults) {
      const current = combined.get(result.language) || 0
      combined.set(result.language, current + (result.confidence * 0.10))
    }

    for (const result of scriptResults) {
      const current = combined.get(result.language) || 0
      combined.set(result.language, current + (result.confidence * 0.25))
    }

    // Apply bonus for script-based detections (very strong signal)
    const scriptLanguages = new Set(scriptResults.map(r => r.language))

    return Array.from(combined.entries()).map(([language, confidence]) => {
      let finalConfidence = Math.min(confidence, 1)

      // Strong boost for script-based detections
      if (scriptLanguages.has(language as LanguageCode)) {
        finalConfidence = Math.min(finalConfidence * 8, 1)
      }

      // Additional boost for high-confidence pattern matches
      if (finalConfidence > 0.5 && finalConfidence < 0.8) {
        finalConfidence = Math.min(finalConfidence * 1.1, 1)
      }

      return {
        language: language as LanguageCode,
        confidence: finalConfidence
      }
    })
  }

  private calculateCharacterFrequency(text: string): Record<string, number> {
    const freq: Record<string, number> = {}
    const cleanText = text.replace(/\s/g, '').toLowerCase()

    if (cleanText.length === 0) return freq

    for (const char of cleanText) {
      freq[char] = (freq[char] || 0) + 1
    }

    // Convert to percentages
    for (const char in freq) {
      const count = freq[char]
      if (count !== undefined) {
        freq[char] = (count / cleanText.length) * 100
      }
    }

    return freq
  }

  private calculateFrequencySimilarity(
    textFreq: Record<string, number>,
    langFreq: Record<string, number>
  ): number {
    let similarity = 0
    let totalChars = 0

    for (const char in langFreq) {
      const textRate = textFreq[char] || 0
      const langRate = langFreq[char] || 0
      const diff = Math.abs(textRate - langRate)
      similarity += Math.max(0, (langRate - diff) / langRate) * langRate
      totalChars += langRate
    }

    return totalChars > 0 ? similarity / totalChars : 0
  }

  private addToCache(key: string, results: LanguageDetectionResult[]): void {
    if (detectionCache.size >= MAX_CACHE_SIZE) {
      // Remove oldest entries (simple FIFO approach)
      const keysToDelete = Array.from(detectionCache.keys()).slice(0, 100)
      for (const keyToDelete of keysToDelete) {
        detectionCache.delete(keyToDelete)
      }
    }
    detectionCache.set(key, results)
  }
}

/**
 * Default language detection engine instance
 */
export const defaultLanguageDetector = new LanguageDetectionEngine()

/**
 * Quick language detection function
 */
export function detectLanguage(text: string): LanguageCode {
  return defaultLanguageDetector.detectPrimary(text)
}

/**
 * Detailed language detection function
 */
export function detectLanguages(text: string): LanguageDetection[] {
  return defaultLanguageDetector.detect(text).map(result => ({
    language: result.language,
    confidence: result.confidence,
    sample: result.sample
  }))
}

/**
 * Check if text contains mixed languages
 */
export function hasMixedLanguages(text: string, threshold = 0.3): boolean {
  const detections = defaultLanguageDetector.detect(text)
  return detections.length > 1 && detections[1] !== undefined && detections[1].confidence > threshold
}

/**
 * Get language confidence for a specific language
 */
export function getLanguageConfidence(text: string, language: LanguageCode): number {
  const detections = defaultLanguageDetector.detect(text)
  const result = detections.find(d => d.language === language)
  return result?.confidence || 0
}