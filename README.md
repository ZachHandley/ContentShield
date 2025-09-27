# NaughtyWords

A modern TypeScript library for multi-language profanity detection and content moderation with severity levels and customizable filtering.

[![npm version](https://badge.fury.io/js/naughty-words.svg)](https://badge.fury.io/js/naughty-words)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🌍 **Multi-language support** - English, Spanish, French, German, and more
- 🔍 **Fuzzy matching** - Detects variations and obfuscated words
- 📊 **Severity levels** - Configurable filtering based on content severity
- 🏷️ **Categorization** - Different types of profanity (hate speech, violence, etc.)
- ⚡ **High performance** - Optimized for real-time content moderation
- 🛠️ **Customizable** - Add custom words, whitelist terms, configure filtering
- 📦 **Tree-shakeable** - ESM and CJS support with optimal bundle sizes
- 🔒 **Type-safe** - Full TypeScript support with comprehensive type definitions

## Installation

```bash
npm install naughty-words
```

```bash
yarn add naughty-words
```

```bash
pnpm add naughty-words
```

## Quick Start

### Simple Detection

```typescript
import { detect, filter, isClean } from 'naughty-words'

// Quick profanity check
const isProfane = !(await isClean('Your text here'))

// Get detailed analysis
const result = await detect('Your text here')
console.log(result.hasProfanity, result.matches)

// Filter content
const cleanText = await filter('Your text here')
```

### Advanced Usage

```typescript
import {
  NaughtyWordsDetector,
  SeverityLevel,
  ProfanityCategory,
  FilterMode
} from 'naughty-words'

// Create a custom detector
const detector = new NaughtyWordsDetector({
  languages: ['en', 'es'],
  minSeverity: SeverityLevel.MODERATE,
  categories: [
    ProfanityCategory.HATE_SPEECH,
    ProfanityCategory.VIOLENCE
  ],
  fuzzyMatching: true,
  fuzzyThreshold: 0.8
})

// Analyze text
const analysis = await detector.analyze('Text to analyze')

// Filter with different modes
const censored = await detector.filter(text, FilterMode.CENSOR)  // "f***"
const removed = await detector.filter(text, FilterMode.REMOVE)   // ""
const replaced = await detector.filter(text, FilterMode.REPLACE) // "[filtered]"
```

## API Reference

### Quick Functions

- `detect(text: string): Promise<DetectionResult>` - Analyze text for profanity
- `filter(text: string, mode?: FilterMode): Promise<string>` - Filter profanity from text
- `isClean(text: string): Promise<boolean>` - Check if text is clean

### NaughtyWordsDetector Class

```typescript
const detector = new NaughtyWordsDetector(config)

await detector.analyze(text, options)     // Full analysis
await detector.isProfane(text)            // Boolean check
await detector.filter(text, mode)        // Filter text
detector.updateConfig(newConfig)         // Update configuration
detector.getConfig()                     // Get current config
```

### Configuration Options

```typescript
interface DetectorConfig {
  languages: LanguageCode[]              // Languages to detect
  minSeverity: SeverityLevel            // Minimum severity to flag
  categories: ProfanityCategory[]       // Categories to detect
  fuzzyMatching: boolean                // Enable fuzzy matching
  fuzzyThreshold: number               // Fuzzy matching threshold (0-1)
  customWords: CustomWord[]            // Additional words to detect
  whitelist: string[]                  // Words to never flag
  detectAlternateScripts: boolean      // Detect in other alphabets
  normalizeText: boolean               // Normalize before detection
  replacementChar: string              // Character for censoring
  preserveStructure: boolean           // Keep word structure when censoring
}
```

### Severity Levels

```typescript
enum SeverityLevel {
  LOW = 1,        // Mild profanity
  MODERATE = 2,   // Moderate profanity
  HIGH = 3,       // Strong profanity
  SEVERE = 4      // Extreme profanity
}
```

### Categories

```typescript
enum ProfanityCategory {
  GENERAL = 'general',
  SEXUAL = 'sexual',
  VIOLENCE = 'violence',
  HATE_SPEECH = 'hate_speech',
  DISCRIMINATION = 'discrimination',
  SUBSTANCE_ABUSE = 'substance_abuse',
  RELIGIOUS = 'religious',
  POLITICAL = 'political'
}
```

## Language Support

Currently supported languages:
- 🇺🇸 English (`en`)
- 🇪🇸 Spanish (`es`)
- 🇫🇷 French (`fr`)
- 🇩🇪 German (`de`)
- 🇮🇹 Italian (`it`)
- 🇵🇹 Portuguese (`pt`)
- 🇷🇺 Russian (`ru`)
- 🇨🇳 Chinese (`zh`)
- 🇸🇪 Swedish (`sv`)
- 🇯🇵 Japanese (`ja`)
- 🇸🇦 Arabic (`ar`)
- 🇮🇳 Hindi (`hi`)

Use `'auto'` for automatic language detection.

## Custom Words & Whitelisting

```typescript
const detector = new NaughtyWordsDetector({
  customWords: [
    {
      word: 'badword',
      language: 'en',
      severity: SeverityLevel.HIGH,
      categories: [ProfanityCategory.GENERAL],
      variations: ['b@dword', 'b4dword'],
      caseSensitive: false
    }
  ],
  whitelist: ['goodword', 'acceptable']
})
```

## Filter Modes

```typescript
enum FilterMode {
  CENSOR = 'censor',           // Replace with * (f***)
  REMOVE = 'remove',           // Remove entirely
  REPLACE = 'replace',         // Replace with [filtered]
  DETECT_ONLY = 'detect_only'  // Don't modify text
}
```

## Language-Specific Detectors

```typescript
import {
  createEnglishDetector,
  createSpanishDetector,
  createMultiLanguageDetector
} from 'naughty-words'

const englishOnly = createEnglishDetector()
const multiLang = createMultiLanguageDetector(['en', 'es', 'fr'])
```

## Performance

NaughtyWords is optimized for high-performance applications:

- **Fuzzy matching**: Configurable threshold for speed vs accuracy
- **Language detection**: Fast language identification
- **Tree-shaking**: Import only what you need
- **Caching**: Efficient word database loading

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

MIT © [Zach Handley](mailto:zachhandley@gmail.com)

## Support

- 📚 [Documentation](https://github.com/zachhandley/NaughtyWords#readme)
- 🐛 [Bug Reports](https://github.com/zachhandley/NaughtyWords/issues)
- 💬 [Discussions](https://github.com/zachhandley/NaughtyWords/discussions)

---

**Note**: This library is designed for content moderation and educational purposes. Please use responsibly and in accordance with your platform's community guidelines.