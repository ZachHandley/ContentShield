import {
  NaughtyWordsDetector,
  detect,
  filter,
  isClean,
  SeverityLevel,
  FilterMode,
  ProfanityCategory,
  createEnglishDetector,
  createMultiLanguageDetector,
} from '../src/index.js'

// Example 1: Quick start functions
async function quickStartExample() {
  console.log('=== Quick Start Example ===')

  const text = 'This is some sample text to analyze.'

  // Quick detection
  const result = await detect(text)
  console.log('Detection result:', result.hasProfanity)

  // Quick filtering
  const filtered = await filter(text)
  console.log('Filtered text:', filtered)

  // Quick clean check
  const clean = await isClean(text)
  console.log('Is clean:', clean)
}

// Example 2: Advanced detector configuration
async function advancedDetectorExample() {
  console.log('=== Advanced Detector Example ===')

  const detector = new NaughtyWordsDetector({
    languages: ['en', 'es'],
    minSeverity: SeverityLevel.MODERATE,
    categories: [
      ProfanityCategory.GENERAL,
      ProfanityCategory.HATE_SPEECH,
    ],
    fuzzyMatching: true,
    fuzzyThreshold: 0.8,
    replacementChar: '*',
    preserveStructure: true,
  })

  const text = 'This is a test message with various content.'

  // Detailed analysis
  const analysis = await detector.analyze(text)
  console.log('Analysis result:', {
    hasProfanity: analysis.hasProfanity,
    totalMatches: analysis.totalMatches,
    maxSeverity: analysis.maxSeverity,
    detectedLanguages: analysis.detectedLanguages,
    processingTime: analysis.processingTime,
  })

  // Different filtering modes
  const censored = await detector.filter(text, FilterMode.CENSOR)
  const removed = await detector.filter(text, FilterMode.REMOVE)

  console.log('Censored:', censored)
  console.log('Removed:', removed)
}

// Example 3: Language-specific detectors
async function languageSpecificExample() {
  console.log('=== Language-Specific Example ===')

  // English-only detector
  const englishDetector = createEnglishDetector({
    minSeverity: SeverityLevel.LOW,
  })

  // Multi-language detector
  const multiLangDetector = createMultiLanguageDetector(['en', 'es', 'fr'], {
    minSeverity: SeverityLevel.MODERATE,
  })

  const texts = [
    'English text sample',
    'Texto en español',
    'Texte en français',
  ]

  for (const text of texts) {
    const englishResult = await englishDetector.analyze(text)
    const multiLangResult = await multiLangDetector.analyze(text)

    console.log(`Text: "${text}"`)
    console.log('English detector languages:', englishResult.detectedLanguages)
    console.log('Multi-lang detector languages:', multiLangResult.detectedLanguages)
    console.log('---')
  }
}

// Example 4: Custom word configuration
async function customWordsExample() {
  console.log('=== Custom Words Example ===')

  const detector = new NaughtyWordsDetector({
    customWords: [
      {
        word: 'customBadWord',
        language: 'en',
        severity: SeverityLevel.HIGH,
        categories: [ProfanityCategory.GENERAL],
        variations: ['c*stom', 'cust0m'],
        caseSensitive: false,
      },
    ],
    whitelist: ['goodword', 'acceptable'],
  })

  const texts = [
    'This contains customBadWord',
    'This contains goodword',
    'This is acceptable content',
  ]

  for (const text of texts) {
    const result = await detector.analyze(text)
    console.log(`"${text}": ${result.hasProfanity ? 'FLAGGED' : 'CLEAN'}`)
  }
}

// Run all examples
async function runExamples() {
  try {
    await quickStartExample()
    console.log('\n')

    await advancedDetectorExample()
    console.log('\n')

    await languageSpecificExample()
    console.log('\n')

    await customWordsExample()
  } catch (error) {
    console.error('Error running examples:', error)
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples()
}

export { runExamples }