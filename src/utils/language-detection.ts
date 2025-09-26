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
 * Common patterns and character sets for each language
 */
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  en: [
    /\b(the|and|that|have|for|not|with|you|this|but|his|from|they)\b/gi,
    /[a-z]/gi,
    /\b\w+ing\b/gi,
    /\b\w+ed\b/gi,
    /\b\w+ly\b/gi
  ],
  es: [
    /\b(que|de|el|la|en|y|un|es|se|no|te|lo|le|da|su|por|son|con|para|una|tiene|los|las)\b/gi,
    /[a-záéíóúüñ]/gi,
    /\b\w+ción\b/gi,
    /\b\w+mente\b/gi
  ],
  fr: [
    /\b(le|de|et|être|un|il|avoir|ne|je|son|que|se|qui|ce|dans|en|du|elle|au|de|à|tout|y)\b/gi,
    /[a-záàâäéèêëïîôöùûüÿç]/gi,
    /\b\w+ment\b/gi,
    /\b\w+tion\b/gi
  ],
  de: [
    /\b(der|die|und|in|den|von|zu|das|mit|sich|des|auf|für|ist|im|dem|nicht|ein|eine|als|auch|es|an|werden|aus|er|hat|dass|sie|nach|wird|bei|einer|um|am|sind|noch|wie|einem|über|einen|kann|so|man|aber|aus|mehr|nur|wenn|auch|können|bis|zum|durch|gegen|jetzt|seit|ohne)\b/gi,
    /[a-zäöüß]/gi,
    /\b\w+ung\b/gi,
    /\b\w+lich\b/gi
  ],
  it: [
    /\b(che|di|il|un|a|è|per|una|in|del|la|non|le|si|da|questo|con|io|se|lui|anche|tutto|alla|della|più|come|ma|aveva|già|o|quando|qui|dove|cosa|dove|ora|bene|molto|stesso|dopo|però|così|fatto|prima|grande|volta|mentre|poi|senza|sono|altri|anni|ancora|parte|tutti|dire|fare|poco|ogni|sempre|mai)\b/gi,
    /[a-zàáèéìíîòóùúü]/gi,
    /\b\w+zione\b/gi,
    /\b\w+mente\b/gi
  ],
  pt: [
    /\b(que|de|o|a|e|do|da|em|um|para|é|com|não|uma|os|no|se|na|por|mais|as|dos|como|mas|foi|ao|ele|das|tem|à|seu|sua|ou|ser|quando|muito|há|nos|já|está|eu|também|só|pelo|pela|até|isso|ela|entre|era|depois|sem|mesmo|aos|ter|seus|suas|nem|na|dessa|desse|essa|essa|deles|delas|toda|todo|toda|cada|bem|onde|então|pode|dia|vez|dois|três|quem)\b/gi,
    /[a-záàâãéêíóôõúç]/gi,
    /\b\w+ção\b/gi,
    /\b\w+mente\b/gi
  ],
  ru: [
    /\b(в|и|не|на|я|быть|с|он|а|как|это|она|по|но|они|к|у|ты|из|мы|за|что|то|все|о|так|его|но|да|ты|к|же|на|вы|теперь|может|после|жизнь|эти|два|раз|уже|там|чем|нас|ну|ни|сейчас|тут|кто|конечно)\b/gi,
    /[а-яё]/gi,
    /\b\w+ость\b/gi,
    /\b\w+ение\b/gi
  ],
  zh: [
    /[一二三四五六七八九十百千万亿]/g,
    /[的了是在不和有人这中大上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海地口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更单风切打白教速花带安场身车例真务具万每目至达走积示议声报斗完类八离华名确才科张信马节话米整空元况今集温传土许步群广石记需段研界拉林律叫且究观越织装影算低持音众书布复容儿须际商非验连断深难近矿千周委素技备半办青省列习响约支般史感劳便团往酸历市克何除消构府称太准精值号率族维划选标写存候毛亲快效斯院查江型眼王按格养易置派层片始却专状育厂京识适属圆包火住调满县局照参红细引听该铁价严龙飞)]([\u4e00-\u9fff]+)/g,
    /[\u4e00-\u9fff]/g
  ],
  ja: [
    /[\u3040-\u309f]/g, // Hiragana
    /[\u30a0-\u30ff]/g, // Katakana
    /[\u4e00-\u9faf]/g, // Kanji
    /です|である|だ|だった|ます|ました|でした|だろう|でしょう/g
  ],
  ar: [
    /[\u0600-\u06ff]/g, // Arabic script
    /\b(في|من|إلى|على|هذا|هذه|التي|الذي|كان|كانت|يكون|أن|لا|ما|قد|قال|كل|بعد|أم|أما|أو|لكن|إذا|حتى|عند|منذ|حول|تحت|فوق|بين|خلال|ضد|مع|بدون|سوف|لقد|قبل|بعد|أثناء|رغم|بسبب)\b/g
  ],
  he: [
    /[\u0590-\u05ff]/g, // Hebrew script
    /\b(של|את|אל|על|זה|זו|אשר|כי|הוא|היא|אני|אתה|אתם|אנחנו|לא|מה|איפה|מתי|למה|איך|כל|אחר|גם|רק|עוד|פה|שם|עכשיו|אז|אולי|כן)\b/g
  ],
  hi: [
    /[\u0900-\u097f]/g, // Devanagari script
    /\b(और|में|की|के|को|से|पर|है|था|थी|होना|यह|वह|जो|कि|नहीं|भी|तो|ही|अब|जब|तक|बाद|पहले|साथ|बिना|लेकिन|क्योंकि|इसलिए|फिर|अगर|या|कुछ|सब|कोई|कई|अधिक|कम|बहुत|बड़ा|छोटा|नया|पुराना|अच्छा|बुरा|सही|गलत|काला|सफेद|लाल|नीला|हरा|पीला)\b/g
  ],
  ko: [
    /[\uac00-\ud7af]/g, // Hangul syllables
    /[\u1100-\u11ff]/g, // Hangul Jamo
    /[\u3130-\u318f]/g, // Hangul Compatibility Jamo
    /\b(이|그|저|의|을|를|에|에서|로|로서|와|과|하고|그리고|하지만|그러나|또한|또|그래서|그러면|만약|만일|때문에|위해|대해|관해|통해|따라|따르면|같이|처럼|보다|더|가장|아주|매우|정말|진짜|항상|때때로|가끔|자주|항상|결코|절대|모두|모든|어떤|몇|많은|적은|큰|작은|새로운|오래된|좋은|나쁜|맞는|틀린|검은|하얀|빨간|파란|초록|노란)\b/g
  ],
  nl: [
    /\b(de|het|een|van|in|is|op|dat|met|voor|als|zijn|er|maar|om|door|over|ze|uit|aan|bij|naar|hun|werd|heeft|had|meer|mijn|zou|dus|wel|nog|wat|onder|tegen|tot|hier|hoe|toen|omdat|zonder|kunnen|zullen|andere|veel|groot|klein|nieuw|oud|goed|slecht|waar|onwaar|zwart|wit|rood|blauw|groen|geel)\b/gi,
    /[a-zàáèéíóúü]/gi,
    /\b\w+lijk\b/gi,
    /\b\w+heid\b/gi
  ],
  sv: [
    /\b(och|i|att|det|som|en|på|är|för|av|med|till|den|har|de|var|om|ett|men|han|över|så|vid|från|upp|ut|än|när|hon|skulle|sina|varit|mer|kan|inom|under|kommer|mot|genom|mellan|sedan|utan|här|där|denna|dessa|alla|många|stor|liten|ny|gammal|bra|dålig|rätt|fel|svart|vit|röd|blå|grön|gul)\b/gi,
    /[a-zåäö]/gi,
    /\b\w+lig\b/gi,
    /\b\w+het\b/gi
  ],
  pl: [
    /\b(i|w|na|z|do|się|że|o|nie|to|a|od|po|ze|dla|przez|za|jako|przy|czy|ale|te|już|tylko|jego|jej|ich|tym|tej|być|mieć|można|bardzo|także|oraz|gdzie|jak|gdy|jeśli|aby|więc|jednak|między|nad|pod|przed|bez|według|około|oprócz|poza|zamiast|dzięki|mimo|podczas|wśród|wobec|względem)\b/gi,
    /[a-ząćęłńóśźż]/gi,
    /\b\w+ość\b/gi,
    /\b\w+nie\b/gi
  ]
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
    if (!text || text.length < this.minTextLength) {
      return [{ language: 'en', confidence: 0.1 }]
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
    const scriptResults = this.detectByScript(sample)

    // Combine and weight results
    const combinedResults = this.combineDetectionResults(
      frequencyResults,
      patternResults,
      scriptResults
    )

    // Filter and sort by confidence
    const filteredResults = combinedResults
      .filter(result => result.confidence > 0.1)
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

    return filteredResults.length > 0 ? filteredResults : [{ language: 'en', confidence: 0.5 }]
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
      if (similarity > 0.1) {
        results.push({
          language: langCode as LanguageCode,
          confidence: similarity * 0.6 // Weight frequency analysis at 60%
        })
      }
    }

    return results
  }

  private detectByPatterns(text: string): LanguageDetectionResult[] {
    const results: LanguageDetectionResult[] = []

    for (const [langCode, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
      let matchCount = 0
      let totalMatches = 0

      for (const pattern of patterns) {
        const matches = text.match(pattern)
        if (matches) {
          matchCount += matches.length
          totalMatches++
        }
      }

      if (matchCount > 0) {
        const confidence = Math.min(
          (matchCount / text.split(' ').length) *
          (totalMatches / patterns.length) * 2,
          1
        )

        if (confidence > 0.1) {
          results.push({
            language: langCode as LanguageCode,
            confidence: confidence * 0.4 // Weight pattern analysis at 40%
          })
        }
      }
    }

    return results
  }

  private detectByScript(text: string): LanguageDetectionResult[] {
    const results: LanguageDetectionResult[] = []

    // Check for specific scripts
    const scriptChecks = [
      { pattern: /[\u4e00-\u9fff]/, language: 'zh', name: 'Chinese' },
      { pattern: /[\u3040-\u309f\u30a0-\u30ff]/, language: 'ja', name: 'Japanese' },
      { pattern: /[\u0600-\u06ff]/, language: 'ar', name: 'Arabic' },
      { pattern: /[\u0400-\u04ff]/, language: 'ru', name: 'Cyrillic' },
      { pattern: /[\u0900-\u097f]/, language: 'hi', name: 'Devanagari' },
      { pattern: /[\uac00-\ud7af]/, language: 'ko', name: 'Korean' }
    ]

    for (const check of scriptChecks) {
      const matches = text.match(new RegExp(check.pattern, 'g'))
      if (matches && matches.length > 0) {
        const scriptRatio = matches.length / text.replace(/\s/g, '').length
        const confidence = Math.min(scriptRatio * 2, 1)

        if (confidence > 0.2) {
          results.push({
            language: check.language as LanguageCode,
            confidence: confidence * 0.8 // Weight script detection highly
          })
        }
      }
    }

    return results
  }

  private combineDetectionResults(
    ...resultSets: LanguageDetectionResult[][]
  ): LanguageDetectionResult[] {
    const combined = new Map<string, number>()

    for (const resultSet of resultSets) {
      for (const result of resultSet) {
        const current = combined.get(result.language) || 0
        combined.set(result.language, current + result.confidence)
      }
    }

    return Array.from(combined.entries()).map(([language, confidence]) => ({
      language: language as LanguageCode,
      confidence: Math.min(confidence, 1)
    }))
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