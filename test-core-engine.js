/**
 * Quick test of the core profanity detection engine
 */

import { NaughtyWordsDetector } from './dist/index.js'

async function testCoreEngine() {
  console.log('🚀 Testing NaughtyWords Core Detection Engine\n')

  // Create detector with basic configuration
  const detector = new NaughtyWordsDetector({
    languages: ['en'],
    fuzzyMatching: true,
    normalizeText: true
  })

  // Test texts
  const testCases = [
    'This is a clean text example',
    'This contains some inappropriate content',
    'Test fuzzy matching with typos',
    'Mixed content with clean and questionable parts'
  ]

  console.log('📊 Performance and Features Test:')
  console.log('================================\n')

  for (const text of testCases) {
    console.log(`Input: "${text}"`)

    try {
      const start = Date.now()
      const result = await detector.analyze(text)
      const duration = Date.now() - start

      console.log(`✅ Analysis completed in ${duration}ms`)
      console.log(`   - Has profanity: ${result.hasProfanity}`)
      console.log(`   - Matches found: ${result.totalMatches}`)
      console.log(`   - Languages detected: ${result.detectedLanguages.join(', ')}`)
      console.log(`   - Confidence: ${(result.confidence * 100).toFixed(1)}%`)
      console.log(`   - Processing time: ${result.processingTime}ms`)

      if (result.hasProfanity) {
        console.log(`   - Max severity: ${result.maxSeverity}`)
        console.log(`   - Filtered text: "${result.filteredText}"`)
      }

    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
    }

    console.log('')
  }

  // Test component statistics
  console.log('📈 Engine Statistics:')
  console.log('====================')
  const stats = detector.getStats()
  console.log(`Initialized: ${stats.isInitialized}`)
  console.log(`Config Hash: ${stats.configHash}`)
  console.log(`Supported Languages: ${stats.supportedLanguages.join(', ')}`)

  console.log('\n✨ Core engine test completed successfully!')
}

// Run the test
testCoreEngine().catch(console.error)