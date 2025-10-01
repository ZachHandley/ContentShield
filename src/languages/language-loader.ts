/**
 * Dynamic language data loading system
 * Handles lazy loading, caching, and optimization for language-specific data
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import type { LanguageCode, SeverityLevel, ProfanityCategory, StaticLanguageData } from '../types/index.js'

/**
 * Language data structure
 */
export interface LanguageData {
  metadata: {
    name: string
    code: LanguageCode
    version: string
    wordCount: number
    lastUpdated: string
    contributors?: string[]
  }
  profanity: Array<{
    word: string
    severity: SeverityLevel
    categories: ProfanityCategory[]
    variations?: string[]
    context?: string[]
    [key: string]: unknown // Allow additional properties for language-specific metadata
  }>
  categories: Record<string, string[] | string>
  severity: Record<string, SeverityLevel | number>
  variations: Record<string, string[] | string>
  context: Record<string, {
    acceptable: string[]
    problematic: string[]
  } | string>
}

/**
 * Internal language data structure used during loading
 */
interface PartialLanguageData {
  metadata?: {
    name: string
    code: LanguageCode
    version: string
    wordCount: number
    lastUpdated: string
    contributors?: string[]
  }
  profanity?: Array<{
    word: string
    severity: SeverityLevel
    categories: ProfanityCategory[]
    variations?: string[]
    context?: string[]
  }> | { words: Array<{
    word: string
    severity: SeverityLevel
    categories: ProfanityCategory[]
    variations?: string[]
    context?: string[]
  }> }
  categories?: Record<string, string[]>
  severity?: Record<string, SeverityLevel>
  variations?: Record<string, string[]>
  context?: Record<string, {
    acceptable: string[]
    problematic: string[]
  }>
  // Index signature to allow dynamic property access
  [key: string]: unknown
}

/**
 * Language loading options
 */
export interface LanguageLoadOptions {
  dataPath?: string
  cacheEnabled?: boolean
  preloadCommonWords?: boolean
  validateData?: boolean
  useCompressedFormat?: boolean
  languageData?: Partial<Record<LanguageCode, StaticLanguageData>>
}

/**
 * Language load result
 */
export interface LanguageLoadResult {
  success: boolean
  data?: LanguageData
  error?: string
  loadTime: number
  fromCache: boolean
}

/**
 * Dynamic language data loader
 */
export class LanguageLoader {
  private cache = new Map<LanguageCode, LanguageData>()
  private loadingPromises = new Map<LanguageCode, Promise<LanguageLoadResult>>()
  private options: Required<Omit<LanguageLoadOptions, 'languageData'>>
  private staticLanguageData: Partial<Record<LanguageCode, StaticLanguageData>> | undefined

  // Performance tracking
  private loadTimes = new Map<LanguageCode, number>()
  private cacheHits = 0
  private cacheMisses = 0

  constructor(options: LanguageLoadOptions = {}) {
    // Resolve data path relative to package location
    const defaultDataPath = options.dataPath || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'languages')

    // Store static language data separately (only if provided)
    if (options.languageData) {
      this.staticLanguageData = options.languageData
    }

    this.options = {
      dataPath: defaultDataPath,
      cacheEnabled: true,
      preloadCommonWords: true,
      validateData: true,
      useCompressedFormat: false,
      ...options
    }
  }

  /**
   * Load language data with caching and optimization
   */
  async loadLanguage(language: LanguageCode): Promise<LanguageLoadResult> {
    const startTime = performance.now()

    // Check cache first
    if (this.options.cacheEnabled && this.cache.has(language)) {
      this.cacheHits++
      return {
        success: true,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- cache.has() check above guarantees value exists
        data: this.cache.get(language)!,
        loadTime: performance.now() - startTime,
        fromCache: true
      }
    }

    // Check if already loading
    if (this.loadingPromises.has(language)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- loadingPromises.has() check above guarantees value exists
      return await this.loadingPromises.get(language)!
    }

    // Start loading
    const loadingPromise = this.performLanguageLoad(language, startTime)
    this.loadingPromises.set(language, loadingPromise)

    try {
      const result = await loadingPromise
      return result
    } finally {
      this.loadingPromises.delete(language)
    }
  }

  /**
   * Perform actual language loading
   */
  private async performLanguageLoad(
    language: LanguageCode,
    startTime: number
  ): Promise<LanguageLoadResult> {
    this.cacheMisses++

    try {
      let data: LanguageData

      // Priority 1: Check for static language data first
      if (this.staticLanguageData?.[language]) {
        data = await this.loadFromStaticData(this.staticLanguageData[language]!)
      } else {
        // Priority 2: Fall back to JSON file loading
        const languageDir = path.join(this.options.dataPath, language)
        data = await this.loadLanguageFiles(languageDir)
      }

      // Validate data if requested
      if (this.options.validateData) {
        this.validateLanguageData(data, language)
      }

      // Cache if enabled
      if (this.options.cacheEnabled) {
        this.cache.set(language, data)
      }

      const loadTime = performance.now() - startTime
      this.loadTimes.set(language, loadTime)

      return {
        success: true,
        data,
        loadTime,
        fromCache: false
      }
    } catch (error) {
      const loadTime = performance.now() - startTime

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        loadTime,
        fromCache: false
      }
    }
  }

  /**
   * Load language data from static imports (tree-shakeable)
   */
  private async loadFromStaticData(
    staticData: StaticLanguageData
  ): Promise<LanguageData> {
    // Convert simplified StaticLanguageData to full LanguageData structure
    const categories: Record<string, string[]> = {}
    const severity: Record<string, SeverityLevel> = {}
    const variations: Record<string, string[]> = {}
    const context: Record<string, { acceptable: string[], problematic: string[] }> = {}

    // Process each word entry to populate the data structures
    for (const entry of staticData.words) {
      const word = entry.word

      // Add to severity map
      severity[word] = entry.severity

      // Add to categories map
      for (const category of entry.categories) {
        if (!categories[category]) {
          categories[category] = []
        }
        if (!categories[category].includes(word)) {
          categories[category].push(word)
        }
      }

      // Add variations if present
      if (entry.variations && entry.variations.length > 0) {
        variations[word] = entry.variations
      }
    }

    // Convert word entries to the profanity array format
    const profanity = staticData.words.map(entry => {
      const item: {
        word: string
        severity: SeverityLevel
        categories: ProfanityCategory[]
        variations?: string[]
        context?: string[]
      } = {
        word: entry.word,
        severity: entry.severity,
        categories: entry.categories
      }

      if (entry.variations) {
        item.variations = entry.variations
      }

      if (entry.context_notes) {
        item.context = [entry.context_notes]
      }

      return item
    })

    return {
      metadata: staticData.metadata,
      profanity,
      categories,
      severity,
      variations,
      context
    }
  }

  /**
   * Load all language files from directory
   */
  private async loadLanguageFiles(languageDir: string): Promise<LanguageData> {
    const files = ['metadata.json', 'profanity.json', 'categories.json', 'severity.json', 'variations.json', 'context.json']

    const loadPromises = files.map(async (filename) => {
      const filePath = path.join(languageDir, filename)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        return { filename: filename.replace('.json', ''), data: JSON.parse(content) }
      } catch (error) {
        // Some files might be optional
        console.warn(`Warning: Could not load ${filename} for language directory ${languageDir}`)
        return { filename: filename.replace('.json', ''), data: null }
      }
    })

    const results = await Promise.all(loadPromises)
    const languageData: PartialLanguageData = {}

    for (const result of results) {
      if (result.data) {
        // Handle wrapper structure in profanity.json
        if (result.filename === 'profanity' && result.data.words) {
          languageData[result.filename] = result.data.words
        } else {
          languageData[result.filename] = result.data
        }
      }
    }

    // Ensure required fields exist
    if (!languageData.metadata || !languageData.profanity) {
      throw new Error('Missing required language data files (metadata.json, profanity.json)')
    }

    return languageData as LanguageData
  }

  /**
   * Validate language data structure
   */
  private validateLanguageData(data: LanguageData, language: LanguageCode): void {
    // Check metadata
    if (!data.metadata || !data.metadata.name || !data.metadata.code) {
      throw new Error(`Invalid metadata for language ${language}`)
    }

    if (data.metadata.code !== language) {
      throw new Error(`Language code mismatch: expected ${language}, got ${data.metadata.code}`)
    }

    // Check profanity data
    if (!Array.isArray(data.profanity)) {
      throw new Error(`Invalid profanity data for language ${language}`)
    }

    // Validate profanity entries
    for (let i = 0; i < Math.min(data.profanity.length, 10); i++) { // Sample validation
      const entry = data.profanity[i]
      if (!entry || !entry.word || !entry.severity || !Array.isArray(entry.categories)) {
        throw new Error(`Invalid profanity entry at index ${i} for language ${language}`)
      }
    }
  }

  /**
   * Preload common languages
   */
  async preloadCommonLanguages(languages: LanguageCode[] = ['en', 'es', 'fr']): Promise<void> {
    const preloadPromises = languages.map(lang => this.loadLanguage(lang))
    await Promise.all(preloadPromises)
  }

  /**
   * Batch load multiple languages
   */
  async loadLanguages(languages: LanguageCode[]): Promise<Map<LanguageCode, LanguageLoadResult>> {
    const loadPromises = languages.map(async (lang) => {
      const result = await this.loadLanguage(lang)
      return { lang, result }
    })

    const results = await Promise.all(loadPromises)
    const resultMap = new Map<LanguageCode, LanguageLoadResult>()

    for (const { lang, result } of results) {
      resultMap.set(lang, result)
    }

    return resultMap
  }

  /**
   * Get available languages in data directory
   */
  async getAvailableLanguages(): Promise<LanguageCode[]> {
    try {
      const entries = await fs.readdir(this.options.dataPath, { withFileTypes: true })
      const languages: LanguageCode[] = []

      for (const entry of entries) {
        if (entry.isDirectory()) {
          // Check if it's a valid language directory
          const metadataPath = path.join(this.options.dataPath, entry.name, 'metadata.json')
          try {
            await fs.access(metadataPath)
            languages.push(entry.name as LanguageCode)
          } catch {
            // Skip directories without metadata.json
          }
        }
      }

      return languages
    } catch (error) {
      console.warn('Could not read language data directory:', error)
      return []
    }
  }

  /**
   * Get language metadata without loading full data
   */
  async getLanguageMetadata(language: LanguageCode): Promise<LanguageData['metadata'] | null> {
    try {
      const metadataPath = path.join(this.options.dataPath, language, 'metadata.json')
      const content = await fs.readFile(metadataPath, 'utf-8')
      return JSON.parse(content)
    } catch {
      return null
    }
  }

  /**
   * Check if language is available
   */
  async isLanguageAvailable(language: LanguageCode): Promise<boolean> {
    const metadata = await this.getLanguageMetadata(language)
    return metadata !== null
  }

  /**
   * Clear cache for specific language or all languages
   */
  clearCache(language?: LanguageCode): void {
    if (language) {
      this.cache.delete(language)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheSize: number
    cacheHits: number
    cacheMisses: number
    hitRate: number
    cachedLanguages: LanguageCode[]
  } {
    const total = this.cacheHits + this.cacheMisses
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
      cachedLanguages: Array.from(this.cache.keys())
    }
  }

  /**
   * Get load performance statistics
   */
  getPerformanceStats(): Map<LanguageCode, number> {
    return new Map(this.loadTimes)
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    // Keep only recently used languages (simplified LRU)
    const recentLanguages = Array.from(this.cache.keys()).slice(-5) // Keep last 5
    const newCache = new Map<LanguageCode, LanguageData>()

    for (const lang of recentLanguages) {
      const data = this.cache.get(lang)
      if (data) {
        newCache.set(lang, data)
      }
    }

    this.cache = newCache

    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Reload specific language data
   */
  async reloadLanguage(language: LanguageCode): Promise<LanguageLoadResult> {
    // Clear from cache first
    this.cache.delete(language)
    return await this.loadLanguage(language)
  }

  /**
   * Get language data size estimation
   */
  getLanguageDataSize(language: LanguageCode): number {
    const data = this.cache.get(language)
    if (!data) return 0

    // Rough estimation of memory usage
    const jsonSize = JSON.stringify(data).length
    return jsonSize * 2 // Account for object overhead
  }

  /**
   * Export cached data for serialization
   */
  exportCache(): Record<string, LanguageData> {
    const exported: Record<string, LanguageData> = {}
    for (const [lang, data] of this.cache) {
      exported[lang] = data
    }
    return exported
  }

  /**
   * Import cached data from serialization
   */
  importCache(data: Record<string, LanguageData>): void {
    this.cache.clear()
    for (const [lang, langData] of Object.entries(data)) {
      this.cache.set(lang as LanguageCode, langData)
    }
  }

  /**
   * Dispose resources and cleanup
   */
  dispose(): void {
    this.cache.clear()
    this.loadingPromises.clear()
    this.loadTimes.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }
}

/**
 * Global language loader instance
 */
let globalLanguageLoader: LanguageLoader | null = null

/**
 * Get global language loader instance
 */
export function getGlobalLanguageLoader(options?: LanguageLoadOptions): LanguageLoader {
  if (!globalLanguageLoader) {
    globalLanguageLoader = new LanguageLoader(options)
  }
  return globalLanguageLoader
}

/**
 * Reset global language loader
 */
export function resetGlobalLanguageLoader(): void {
  if (globalLanguageLoader) {
    globalLanguageLoader.dispose()
    globalLanguageLoader = null
  }
}