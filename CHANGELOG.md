# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-09-30

### Added
- Multi-language profanity detection system supporting 17 languages
- Split-file language data structure with 6 specialized files per language
  - `profanity.json` - Core word list with severity and categories
  - `severity.json` - Word-to-severity level mapping
  - `categories.json` - Word-to-category mapping
  - `variations.json` - Common obfuscation and variations
  - `context.json` - Contextual usage information
  - `metadata.json` - Language statistics and version info
- Advanced filtering modes:
  - `CENSOR` - Replace with asterisks (f***)
  - `REMOVE` - Remove profanity entirely
  - `REPLACE` - Replace with custom text ([filtered])
  - `DETECT_ONLY` - Analysis without modification
- Fuzzy matching and obfuscation detection with configurable thresholds
- Performance monitoring and optimization features
  - Intelligent caching system
  - Batch processing API for multiple texts
  - Stream processing for large datasets
  - Worker thread support for texts >10KB
- Comprehensive configuration system
  - Configuration presets: performance, comprehensive, strict, lenient, family-friendly
  - Real-time configuration management with hot-reload
  - Environment-specific settings
  - Custom word lists and whitelisting
- Quick-start API functions: `detect()`, `filter()`, `isClean()`, `configure()`, `reset()`
- Enhanced convenience functions: `detectEnhanced()`, `filterEnhanced()`, `batchDetect()`, `streamDetect()`
- Language-specific factory functions for optimized detection
- Full TypeScript support with comprehensive type definitions
- Trie-based pattern matching for O(m) time complexity
- Multi-language detector with cross-language matching
- Language auto-detection capabilities
- Performance metrics and health check utilities

### Languages Supported

| Language | Code | Entries | Severity Levels | Categories |
|----------|------|---------|----------------|------------|
| English | en | 250 | 1-4 | 12 |
| Russian | ru | 180 | 1-4 | 13 |
| Japanese | ja | 180 | 0-4 | 17 |
| Spanish | es | 180 | 1-4 | 9 |
| German | de | 170 | 1-4 | 12 |
| Portuguese | pt | 165 | 1-4 | 17 |
| Italian | it | 165 | 1-4 | 11 |
| French | fr | 160 | 1-4 | 10 |
| Hindi | hi | 155 | 1-4 | 24 |
| Arabic | ar | 145 | 1-4 | 22 |
| Chinese | zh | 120 | 1-4 | 14 |
| Korean | ko | 95 | 1-4 | 15 |
| Swedish | sv | 84 | 1-4 | 24 |
| Turkish | tr | 67 | 1-4 | 12 |
| Hebrew | he | 63 | 1-4 | 54 |
| Dutch | nl | 62 | 1-4 | 38 |
| Polish | pl | 58 | 1-4 | 39 |

**Total vocabulary entries: 2,419 across all languages**

### Performance

- **Detection Speed**: ~14,000 words/second
- **Large Text Matching**: ~15ms for 10,000 words
- **Batch Processing**: 555,556 words/second throughput
- **Memory Efficiency**: ~226 bytes per word in trie structure
- **Cache Performance**: Optimized for common patterns with sub-millisecond cached lookups
- **Language Loading**: Sub-millisecond load times for cached languages

### Technical Implementation

- **Build System**: tsup with TypeScript 5.x
- **Module Formats**: ESM and CommonJS dual support
- **Target**: ES2020 for broad compatibility
- **Optimizations**: Tree-shaking, minification, source maps
- **Type Safety**: Full TypeScript definitions with comprehensive interfaces
- **Data Structure**: 102 JSON files (6 per language + metadata)

### API Highlights

```typescript
// Quick Start
import { detect, filter, isClean } from 'naughty-words'

// Advanced Usage
import { NaughtyWordsDetector, SeverityLevel, FilterMode } from 'naughty-words'

// Factory Functions
import { createEnglishDetector, createMultiLanguageDetector } from 'naughty-words'

// Configuration
import { getConfigPreset, ConfigManager } from 'naughty-words'

// Utilities
import { fuzzyMatch, normalizeText, calculateSimilarity } from 'naughty-words'
```

### Known Limitations

- Japanese includes experimental severity level 0 (internet slang)
- Some filtering modes have minor spacing/punctuation edge cases
- Performance benchmarks may vary based on hardware and text content
- Language data quality varies (see TODO_STILL.md for expansion plans)

### Dependencies

- **Runtime**: None (zero dependencies for production)
- **Development**: TypeScript, Vitest, ESLint, Prettier, tsup

### Platform Support

- Node.js >= 16.0.0
- TypeScript >= 5.0.0
- All modern browsers with ES2020 support

### Contributors

- Zach Handley <zachhandley@gmail.com> - Initial development and architecture

### License

MIT License - See LICENSE file for details

---

## [Unreleased]

### Planned for v0.2.0

- Expand language datasets to 100+ entries for major languages
- Improve filtering engine spacing and punctuation handling
- Enhanced context-aware detection
- Additional language support
- Performance optimizations for very large texts
- Community-contributed language datasets
- Regional variation support (BR Portuguese, MX Spanish, etc.)
- More comprehensive documentation and examples
- Integration guides for popular frameworks

---

[0.1.0]: https://github.com/zachhandley/NaughtyWords/releases/tag/v0.1.0
