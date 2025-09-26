/**
 * Supported language codes for profanity detection
 */
export type LanguageCode =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'it' // Italian
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese
  | 'ja' // Japanese
  | 'ar' // Arabic
  | 'hi' // Hindi
  | 'ko' // Korean
  | 'nl' // Dutch
  | 'sv' // Swedish
  | 'pl' // Polish
  | 'he' // Hebrew
  | 'tr' // Turkish
  | 'auto' // Auto-detect

/**
 * Severity levels for profanity classification
 */
export enum SeverityLevel {
  LOW = 1,
  MEDIUM = 2,
  MODERATE = 2,
  HIGH = 3,
  SEVERE = 4,
}

/**
 * Categories of profanity content
 */
export enum ProfanityCategory {
  GENERAL = 'general',
  PROFANITY = 'profanity',
  SEXUAL = 'sexual',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  DISCRIMINATION = 'discrimination',
  SUBSTANCE_ABUSE = 'substance_abuse',
  RELIGIOUS = 'religious',
  POLITICAL = 'political',
}

/**
 * Detection result for a single word or phrase
 */
export interface DetectionMatch {
  /** The original word/phrase that was detected */
  word: string
  /** The matched profane word from the database */
  match: string
  /** Position in the text where the match starts */
  start: number
  /** Position in the text where the match ends */
  end: number
  /** Severity level of the detected profanity */
  severity: SeverityLevel
  /** Categories this profanity belongs to */
  categories: ProfanityCategory[]
  /** Detected language of the word */
  language: LanguageCode
  /** Confidence score (0-1) for the detection */
  confidence: number
}

/**
 * Complete detection result for analyzed text
 */
export interface DetectionResult {
  /** Original input text */
  originalText: string
  /** Text with profanity filtered/censored */
  filteredText: string
  /** Whether any profanity was detected */
  hasProfanity: boolean
  /** Total number of profane words detected */
  totalMatches: number
  /** Highest severity level found in the text */
  maxSeverity: SeverityLevel
  /** All detection matches found */
  matches: DetectionMatch[]
  /** Languages detected in the text */
  detectedLanguages: LanguageCode[]
  /** Overall confidence score for the analysis */
  confidence: number
  /** Processing time in milliseconds */
  processingTime: number
}

/**
 * Configuration options for the profanity detector
 */
export interface DetectorConfig {
  /** Languages to check for profanity */
  languages: LanguageCode[]
  /** Minimum severity level to detect */
  minSeverity: SeverityLevel
  /** Categories of profanity to detect */
  categories: ProfanityCategory[]
  /** Whether to use fuzzy matching for variations */
  fuzzyMatching: boolean
  /** Fuzzy matching threshold (0-1) */
  fuzzyThreshold: number
  /** Custom words to add to the filter */
  customWords: CustomWord[]
  /** Words to whitelist (never flag as profanity) */
  whitelist: string[]
  /** Whether to detect profanity in different scripts/alphabets */
  detectAlternateScripts: boolean
  /** Whether to normalize text before detection */
  normalizeText: boolean
  /** Replacement character/string for censoring */
  replacementChar: string
  /** Whether to preserve word structure when censoring */
  preserveStructure: boolean
}

/**
 * Custom word definition for extending the profanity database
 */
export interface CustomWord {
  /** The word or phrase to detect */
  word: string
  /** Language this word belongs to */
  language: LanguageCode
  /** Severity level of this word */
  severity: SeverityLevel
  /** Categories this word belongs to */
  categories: ProfanityCategory[]
  /** Alternative spellings or variations */
  variations?: string[]
  /** Regular expression pattern (if word contains regex) */
  pattern?: string
  /** Whether this word should be case-sensitive */
  caseSensitive?: boolean
}

/**
 * Language detection result
 */
export interface LanguageDetection {
  /** Detected language code */
  language: LanguageCode
  /** Confidence score for this language (0-1) */
  confidence: number
  /** Portion of text that contributed to this detection */
  sample: string | undefined
}

/**
 * Statistics about the profanity database
 */
export interface DatabaseStats {
  /** Total number of words in the database */
  totalWords: number
  /** Words count by language */
  wordsByLanguage: Record<LanguageCode, number>
  /** Words count by severity */
  wordsBySeverity: Record<SeverityLevel, number>
  /** Words count by category */
  wordsByCategory: Record<ProfanityCategory, number>
  /** Last updated timestamp */
  lastUpdated: Date
  /** Database version */
  version: string
}

/**
 * Filter operation modes
 */
export enum FilterMode {
  /** Replace with asterisks or replacement characters */
  CENSOR = 'censor',
  /** Remove profane words entirely */
  REMOVE = 'remove',
  /** Replace with alternative words */
  REPLACE = 'replace',
  /** Mark but don't modify the text */
  DETECT_ONLY = 'detect_only',
}

/**
 * Text analysis options
 */
export interface AnalysisOptions {
  /** Filter mode to apply */
  filterMode: FilterMode
  /** Whether to return detailed match information */
  includeMatches: boolean
  /** Whether to include confidence scores */
  includeConfidence: boolean
  /** Whether to measure processing time */
  measurePerformance: boolean
  /** Maximum text length to process */
  maxLength?: number
}

/**
 * Error types that can occur during detection
 */
export enum DetectionErrorType {
  INVALID_INPUT = 'invalid_input',
  LANGUAGE_NOT_SUPPORTED = 'language_not_supported',
  TEXT_TOO_LONG = 'text_too_long',
  CONFIGURATION_ERROR = 'configuration_error',
  DATABASE_ERROR = 'database_error',
}

/**
 * Detection error with context information
 */
export interface DetectionError extends Error {
  type: DetectionErrorType
  code: string
  context?: Record<string, unknown>
}

/**
 * Enhanced detection match with additional metadata (re-export from core)
 */
export interface EnhancedDetectionMatch extends DetectionMatch {
  /** Detailed position information */
  position: {
    absoluteStart: number
    absoluteEnd: number
    lineNumber: number
    columnStart: number
    columnEnd: number
    wordIndex: number
    sentenceIndex: number
  }
  /** Context around the match */
  context: {
    before: string
    after: string
    sentence: string
  }
  /** Alternative suggestions for replacement */
  suggestions: string[]
  /** Reason for detection */
  detectionReason: string
  /** Whether this is a fuzzy match */
  isFuzzyMatch: boolean
  /** Edit distance for fuzzy matches */
  editDistance?: number
  /** Original match score before confidence adjustments */
  rawScore: number
}
