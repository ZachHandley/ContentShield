# NaughtyWords

A modern TypeScript library for multi-language naughty word detection and content moderation with severity levels and customizable filtering.

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

## Why I Built This

I built NaughtyWords because I couldn't find a simple, straightforward library that would just filter out naughty words. I especially couldn't find any simple packages that worked for multi-language support. Most solutions were either over-engineered, poorly maintained, English-only, or had terrible multi-language coverage.

This library aims to be:

- **Simple** - Easy to use with sensible defaults
- **Comprehensive** - 3,600+ profanity entries across 17 languages
- **Multi-language** - Actually works across different languages and scripts
- **Fast** - Optimized for real-world performance
- **Maintained** - Actively developed and improved

Built by [Zach Handley](https://zachhandley.com) for developers who need reliable content moderation without the hassle.

**Note on Multi-language Accuracy**: While I've done my best to compile accurate profanity databases for all 17 languages using native speaker resources, linguistic databases, and community contributions, some entries may be incorrect or incomplete for languages I don't speak natively. Contributions and corrections are always welcome!

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

// Quick naughty word check
const isProfane = !(await isClean('Your text here'))

// Get detailed analysis
const result = await detect('Your text here')
console.log(result.hasProfanity, result.matches)

// Filter naughty content
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

## Common Use Cases

### Chat Moderation

```typescript
import { detect, filter, FilterMode } from 'naughty-words'

async function moderateMessage(message: string) {
  const result = await detect(message)

  if (result.hasProfanity) {
    // Uh oh, someone's been naughty!
    console.log(`Naughty words detected: ${result.totalMatches} matches`)

    // Return filtered message
    return await filter(message, FilterMode.CENSOR)
  }

  return message
}
```

### Form Validation

```typescript
import { isClean } from 'naughty-words'

async function validateUsername(username: string) {
  const clean = await isClean(username)

  if (!clean) {
    throw new Error('Username contains naughty content')
  }

  return username
}
```

### Content Filtering

```typescript
import { NaughtyWordsDetector, SeverityLevel } from 'naughty-words'

const detector = new NaughtyWordsDetector({
  minSeverity: SeverityLevel.HIGH, // Only catch the naughtiest words
  languages: ['en', 'es']
})

async function filterUserContent(content: string) {
  const result = await detector.analyze(content)

  if (result.maxSeverity >= SeverityLevel.SEVERE) {
    // Block content entirely
    return null
  } else if (result.hasProfanity) {
    // Filter but allow
    return await detector.filter(content)
  }

  return content
}
```

## API Reference

### Quick Functions

- `detect(text: string): Promise<DetectionResult>` - Analyze text for naughty words
- `filter(text: string, mode?: FilterMode): Promise<string>` - Filter naughty words from text
- `isClean(text: string): Promise<boolean>` - Check if text is squeaky clean

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
  LOW = 1,        // Mildly naughty
  MODERATE = 2,   // Pretty naughty
  HIGH = 3,       // Very naughty
  SEVERE = 4      // Extremely naughty (the naughtiest!)
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

NaughtyWords speaks 17 languages fluently (and knows all the naughty words in each):

- 🇺🇸 English (`en`) - 714 entries
- 🇯🇵 Japanese (`ja`) - 247 entries
- 🇰🇷 Korean (`ko`) - 240 entries
- 🇨🇳 Chinese (`zh`) - 230 entries
- 🇳🇱 Dutch (`nl`) - 230 entries
- 🇫🇷 French (`fr`) - 229 entries
- 🇮🇹 Italian (`it`) - 229 entries
- 🇩🇪 German (`de`) - 226 entries
- 🇪🇸 Spanish (`es`) - 221 entries
- 🇵🇹 Portuguese (`pt`) - 218 entries
- 🇷🇺 Russian (`ru`) - 215 entries
- 🇵🇱 Polish (`pl`) - 204 entries
- 🇹🇷 Turkish (`tr`) - 203 entries
- 🇮🇱 Hebrew (`he`) - 200 entries
- 🇸🇪 Swedish (`sv`) - 179 entries
- 🇸🇦 Arabic (`ar`) - 105 entries
- 🇮🇳 Hindi (`hi`) - 101 entries

**Total: 3,600+ naughty words across all languages** 🚫

Use `'auto'` for automatic language detection, or specify exact languages for better performance.

## Custom Words & Whitelisting

```typescript
const detector = new NaughtyWordsDetector({
  customWords: [
    {
      word: 'frack', // Custom sci-fi profanity
      language: 'en',
      severity: SeverityLevel.MODERATE,
      categories: [ProfanityCategory.GENERAL],
      variations: ['fr@ck', 'fr4ck'],
      caseSensitive: false
    }
  ],
  whitelist: ['hello', 'world'] // Never flag these words
})
```

## Filter Modes

Choose how to handle those naughty words:

```typescript
enum FilterMode {
  CENSOR = 'censor',           // Replace with * (f***)
  REMOVE = 'remove',           // Remove entirely (poof!)
  REPLACE = 'replace',         // Replace with [filtered]
  DETECT_ONLY = 'detect_only'  // Just detect, don't modify
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

NaughtyWords delivers exceptional performance:

- **Detection Speed**: ~14,000 words/second
- **Large Text Matching**: ~15ms for 10,000 words
- **Batch Processing**: 555,556 words/second throughput
- **Memory Efficiency**: ~226 bytes per word in trie structure
- **Fuzzy Matching**: Configurable threshold for speed vs accuracy
- **Language Detection**: Fast language identification
- **Tree-shaking**: Import only what you need
- **Caching**: Intelligent caching with sub-millisecond cached lookups

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

**Contributions are welcome!** This project benefits from community input. Here's how you can help:

### Ways to Contribute

- **Add new languages** - Help expand multi-language support
- **Improve detection accuracy** - Suggest new words or fix false positives
- **Performance optimizations** - Make the library even faster
- **Documentation** - Improve examples, guides, and API docs
- **Bug reports** - Found an issue? Let us know!
- **Feature requests** - Have an idea? Open a discussion!

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Run the test suite (`pnpm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to the branch (`git push origin feature/amazing-feature`)
8. Submit a pull request

### Language Contributions

Adding a new language? Great! Here's what we need:

- Profanity entries in `/data/languages/{code}/profanity.json`
- Severity classifications
- Category mappings
- Common variations and obfuscations
- Test cases to verify detection

See existing language files for format examples.

## License

MIT © [Zach Handley](https://zachhandley.com)

## Support

- 📚 [Documentation](https://github.com/zachhandley/NaughtyWords#readme)
- 🐛 [Bug Reports](https://github.com/zachhandley/NaughtyWords/issues)
- 💬 [Discussions](https://github.com/zachhandley/NaughtyWords/discussions)

## Sources

The profanity databases in this library were compiled from various open-source resources, linguistic databases, and community contributions. Here are the primary sources for each language:

### 🇺🇸 English
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [zautumnz/profane-words](https://github.com/zautumnz/profane-words)
- [coffee-and-fun/google-profanity-words](https://github.com/coffee-and-fun/google-profanity-words)
- Carnegie Mellon University offensive word list (1,300+ terms)
- Wiktionary English swear words directory
- NoSwearing.com dictionary
- Regional slang databases (UK, US, Australian)

### 🇪🇸 Spanish
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- Wikipedia Spanish Profanity article
- Regional Spanish language databases

### 🇫🇷 French
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [darwiin/french-badwords-list](https://github.com/darwiin/french-badwords-list)
- Wiktionary French insults and vulgar terms categories
- Quebec French profanity resources
- Linguistic research on French slang and verlan

### 🇩🇪 German
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [getoliverleon/badwords-adult-DE](https://github.com/getoliverleon/badwords-adult-DE)
- Wiktionary German insult directory

### 🇮🇹 Italian
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [krusk8/italian-badwords-list](https://github.com/krusk8/italian-badwords-list)
- [napolux/paroleitaliane](https://github.com/napolux/paroleitaliane)
- Wikipedia Italian Profanity article
- Regional dialect research (Venetian, Tuscan, Neapolitan, Sicilian)

### 🇵🇹 Portuguese
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- Wikipedia Portuguese Profanity article
- Brazilian and European Portuguese language resources

### 🇷🇺 Russian
- [censor-text/profanity-list](https://github.com/censor-text/profanity-list)
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [denexapp/russian-bad-words](https://github.com/denexapp/russian-bad-words)
- [nickname76/russian-swears](https://github.com/nickname76/russian-swears)
- Wikipedia Mat (profanity) article
- Russian internet culture and gaming communities

### 🇨🇳 Chinese
- [censor-text/profanity-list](https://github.com/censor-text/profanity-list)
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [LTL School Chinese Swear Words Guide](https://ltl-school.com/chinese-swear-words/)
- Wikipedia: Mandarin Chinese profanity, Cantonese profanity
- Internet meme culture (Grass Mud Horse, River Crab)

### 🇯🇵 Japanese
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [censor-text/profanity-list](https://github.com/censor-text/profanity-list)
- Wikipedia Japanese profanity article
- Japanese language learning resources (Lingopie, Migaku, Cotoacademy)
- Japanese internet culture (2ch/5ch slang databases)

### 🇰🇷 Korean
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- [doublems/korean-bad-words](https://github.com/doublems/korean-bad-words)
- [yoonheyjung/badwords-ko](https://github.com/yoonheyjung/badwords-ko)
- [Tanat05/korean-profanity-resources](https://github.com/Tanat05/korean-profanity-resources)
- Wikipedia Korean profanity article
- Online Korean language learning resources (FluentU, Ling, Tandem)

### 🇸🇦 Arabic
- [uxbert/arabic_bad_dirty_word_filter_list](https://github.com/uxbert/arabic_bad_dirty_word_filter_list)
- [censor-text/profanity-list](https://github.com/censor-text/profanity-list)
- [shammur/Arabic-Offensive-Multi-Platform-SocialMedia-Comment-Dataset](https://github.com/shammur/Arabic-Offensive-Multi-Platform-SocialMedia-Comment-Dataset)
- Arabic-for-Nerds: Comprehensive curse word documentation
- Multiple dialect-specific linguistic studies

### 🇮🇳 Hindi
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- Karl Rock's Hindi Swear Words Blog
- Kaggle Hindi Swear Words Dataset (150+ words)
- Wikipedia: Hindustani Profanity

### 🇳🇱 Dutch
- Wikipedia Dutch Profanity article
- Wiktionary Dutch insult directory (445+ entries)
- Dutch language learning resources (dutchreview.com, learndutch.org, lingopie.com)

### 🇸🇪 Swedish
- [LDNOOBW](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
- Wiktionary: Kategori:Svenska/Svordomar
- Wikipedia: Swedish profanity
- Language learning resources (Lingvist, Lingopie)

### 🇵🇱 Polish
- Wikipedia: Polish profanity
- YouSwear.com Polish section
- Toolpaq Polish curse words guide
- Wiktionary Polish vulgarisms index

### 🇮🇱 Hebrew
- [Nimrod007 GitHub Gist](https://gist.github.com/Nimrod007/858064f4cf7e0d6f77c2)
- [kkrypt0nn/wordlists](https://github.com/kkrypt0nn/wordlists)
- [dsojevic/profanity-list](https://github.com/dsojevic/profanity-list)
- Kveller.com: "All the Hebrew Curses You Need to Know"
- iGoogledIsrael: Hebrew profanity guide
- Reddit r/hebrew

### 🇹🇷 Turkish
- Turkish language learning resources
- Turkish social media and internet slang databases
- Linguistic resources and native speaker databases

**Special thanks** to all the open-source contributors, linguists, and native speakers who have helped compile these databases. If you notice any errors or have suggestions for improvements, please open an issue or submit a pull request!

---

**Note**: This library is designed for content moderation and educational purposes. Use it to keep things clean (or at least know when they're not)! Please use responsibly and in accordance with your platform's community guidelines.

Remember: Just because we detect naughty words doesn't mean we can't have fun doing it! 😄