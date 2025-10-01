import { describe, it, expect } from 'vitest'
import { ContentShieldDetector, createDetector, SeverityLevel, FilterMode } from '../../src/index.js'

describe('Full Workflow Integration', () => {
  it('should create detector and process text', async () => {
    const detector = new ContentShieldDetector({
      minSeverity: SeverityLevel.LOW,
      fuzzyMatching: true,
    })

    const text = 'This is a sample text for testing.'

    // Test analysis
    const analysis = await detector.analyze(text)
    expect(analysis.originalText).toBe(text)
    expect(typeof analysis.hasProfanity).toBe('boolean')
    expect(typeof analysis.confidence).toBe('number')

    // Test filtering
    const filtered = await detector.filter(text, FilterMode.CENSOR)
    expect(typeof filtered).toBe('string')

    // Test profanity check
    const isProfane = await detector.isProfane(text)
    expect(typeof isProfane).toBe('boolean')
  })

  it('should work with language-specific detector', async () => {
    const englishDetector = createDetector('en', {
      minSeverity: SeverityLevel.MODERATE,
    })

    const result = await englishDetector.analyze('Hello world!')
    expect(result.detectedLanguages).toContain('en')
  })

  it('should handle configuration updates', () => {
    const detector = new ContentShieldDetector()

    const initialConfig = detector.getConfig()
    expect(initialConfig.minSeverity).toBe(SeverityLevel.LOW)

    detector.updateConfig({ minSeverity: SeverityLevel.HIGH })

    const updatedConfig = detector.getConfig()
    expect(updatedConfig.minSeverity).toBe(SeverityLevel.HIGH)
  })
})