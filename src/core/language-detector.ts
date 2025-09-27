import type { LanguageDetection } from '../types/index.js'
import type { LanguageCode } from '../types/index.js'
import { LanguageDetectionEngine } from '../utils/language-detection.js'
import { normalizeText } from '../utils/text-processing.js'

/**
 * Language detection for profanity filtering
 * Enhanced with advanced language detection capabilities
 */
export class LanguageDetector {
  private engine: LanguageDetectionEngine

  constructor(options: {
    cacheEnabled?: boolean
    minTextLength?: number
    maxSampleLength?: number
  } = {}) {
    this.engine = new LanguageDetectionEngine(options)
  }

  /**
   * Detect the language of the given text
   */
  async detect(text: string): Promise<LanguageDetection[]> {
    if (!text || text.trim().length === 0) {
      return []
    }

    // Normalize text for better detection accuracy
    const normalizedText = normalizeText(text, {
      removePunctuation: false,
      removeEmoji: false,
      preserveWhitespace: true
    })

    const results = this.engine.detect(normalizedText)

    return results.map(result => ({
      language: result.language,
      confidence: result.confidence,
      sample: result.sample || text.substring(0, 50),
    }))
  }

  /**
   * Get the most likely language from detection results
   */
  getPrimaryLanguage(detections: LanguageDetection[]): LanguageCode {
    if (detections.length === 0) return 'en'
    return detections.reduce((prev, current) =>
      current.confidence > prev.confidence ? current : prev
    ).language
  }

  /**
   * Detect language synchronously for performance-critical operations
   */
  detectSync(text: string): LanguageDetection[] {
    if (!text || text.trim().length === 0) {
      return [
        {
          language: 'en' as LanguageCode,
          confidence: 0.1,
          sample: '',
        },
      ]
    }

    const normalizedText = normalizeText(text, {
      removePunctuation: false,
      removeEmoji: false,
      preserveWhitespace: true
    })

    const results = this.engine.detect(normalizedText)

    return results.map(result => ({
      language: result.language,
      confidence: result.confidence,
      sample: result.sample || text.substring(0, 50),
    }))
  }

  /**
   * Get the primary language synchronously
   */
  getPrimaryLanguageSync(text: string): LanguageCode {
    const detections = this.detectSync(text)
    return this.getPrimaryLanguage(detections)
  }

  /**
   * Check if text contains mixed languages
   */
  hasMixedLanguages(text: string, threshold = 0.3): boolean {
    const detections = this.detectSync(text)
    if (detections.length <= 1 || !detections[1]) {
      return false
    }
    return detections[1].confidence > threshold
  }

  /**
   * Get confidence for a specific language
   */
  getLanguageConfidence(text: string, language: LanguageCode): number {
    const detections = this.detectSync(text)
    const result = detections.find(d => d.language === language)
    return result?.confidence || 0
  }

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.engine.clearCache()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return this.engine.getCacheStats()
  }
}
