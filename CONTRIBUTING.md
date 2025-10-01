# Contributing to ContentShield

Thank you for your interest in contributing to ContentShield! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Testing](#testing)
- [Performance Guidelines](#performance-guidelines)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)
- [Language Data](#language-data)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- npm or pnpm (preferred)
- TypeScript knowledge
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/ContentShield.git
   cd ContentShield
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/zachhandley/ContentShield.git
   ```

## Development Setup

### Installation

```bash
# Install dependencies
npm install

# Or with pnpm (recommended)
pnpm install
```

### Available Scripts

```bash
# Development
npm run build          # Build the library
npm run build:watch    # Watch mode for development
npm run dev           # Development server

# Testing
npm run test          # Run tests in watch mode
npm run test:run      # Run tests once
npm run test:coverage # Run tests with coverage
npm run test:ui       # Run tests with UI

# Code Quality
npm run lint          # Lint code
npm run lint:fix      # Fix linting issues
npm run format        # Format code with Prettier
npm run typecheck     # TypeScript type checking

# Cleanup
npm run clean         # Clean build artifacts
```

### Project Structure

```
src/
├── core/             # Core detection engine
│   ├── detector.ts   # Main detector class
│   ├── trie.ts       # Trie data structure
│   ├── filter.ts     # Text filtering
│   └── ...
├── config/           # Configuration system
│   ├── default-config.ts
│   ├── config-validator.ts
│   └── config-manager.ts
├── languages/        # Language integration
│   ├── factory.ts    # Factory functions
│   ├── language-loader.ts
│   └── multi-language-detector.ts
├── types/           # TypeScript types
├── utils/           # Utility functions
└── index.ts         # Main entry point

tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
└── performance/     # Performance tests

data/
└── languages/       # Language data files
    ├── en/
    ├── es/
    └── ...
```

## Contributing Guidelines

### Code Style

We use ESLint and Prettier for code formatting. The configuration is already set up in the project.

- Use TypeScript for all code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Prefer composition over inheritance
- Keep functions small and focused

### Naming Conventions

- **Files**: Use kebab-case (e.g., `language-detector.ts`)
- **Classes**: Use PascalCase (e.g., `ContentShieldDetector`)
- **Functions/Variables**: Use camelCase (e.g., `analyzeText`)
- **Constants**: Use UPPER_SNAKE_CASE (e.g., `MAX_CACHE_SIZE`)
- **Types/Interfaces**: Use PascalCase (e.g., `DetectionResult`)

### Commit Messages

Use conventional commit format:

```
<type>(<scope>): <description>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test changes
- `chore`: Build system, dependencies, etc.

Examples:
```
feat(detector): add batch processing support

Add batchAnalyze method to process multiple texts efficiently
with controlled concurrency and memory optimization.

Closes #123
```

```
fix(trie): resolve memory leak in cache eviction

Fix issue where cache entries were not properly cleaned up
during eviction, leading to memory growth over time.

Fixes #456
```

### Code Quality Standards

1. **Type Safety**: All code must be fully typed with TypeScript
2. **Performance**: New features must maintain performance standards
3. **Memory Efficiency**: Consider memory usage in all implementations
4. **Error Handling**: Proper error handling and validation
5. **Documentation**: Public APIs must be documented

## Testing

### Test Categories

1. **Unit Tests**: Test individual functions and classes
2. **Integration Tests**: Test feature combinations
3. **Performance Tests**: Ensure performance requirements are met

### Writing Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { ContentShieldDetector } from '../src/core/detector.js'

describe('ContentShieldDetector', () => {
  let detector: ContentShieldDetector

  beforeEach(async () => {
    detector = new ContentShieldDetector()
    await detector.initialize()
  })

  it('should detect profanity correctly', async () => {
    const result = await detector.analyze('test text with profanity')

    expect(result.matches).toHaveLength(1)
    expect(result.severity).toBeGreaterThan(0)
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('should handle empty text gracefully', async () => {
    const result = await detector.analyze('')

    expect(result.matches).toHaveLength(0)
    expect(result.severity).toBe(0)
  })
})
```

### Performance Testing

When adding performance-critical code, include performance tests:

```typescript
describe('Performance Tests', () => {
  it('should process 1000+ texts per second', async () => {
    const texts = generateTestTexts(1000)
    const start = performance.now()

    await detector.batchAnalyze(texts)

    const end = performance.now()
    const textsPerSecond = 1000 / ((end - start) / 1000)

    expect(textsPerSecond).toBeGreaterThan(1000)
  })

  it('should maintain memory usage under 200MB', async () => {
    const initialMemory = process.memoryUsage().heapUsed

    // Perform memory-intensive operations
    await performLargeOperations()

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024) // 200MB
  })
})
```

### Running Tests

```bash
# Run all tests
npm run test:run

# Run specific test file
npm run test:run -- detector.test.ts

# Run with coverage
npm run test:coverage

# Run performance tests only
npm run test:run -- performance/
```

## Performance Guidelines

### Performance Requirements

All contributions must maintain these performance standards:

- **Single Analysis**: < 100ms per text
- **Batch Processing**: > 1000 texts per second
- **Memory Usage**: < 200MB for typical usage
- **Cache Hit Rate**: > 80% for repeated operations

### Performance Best Practices

1. **Caching**: Use intelligent caching for repeated operations
2. **Memory Management**: Implement proper cleanup and optimization
3. **Batch Processing**: Optimize for batch operations
4. **Early Termination**: Exit early when possible
5. **Lazy Loading**: Load resources only when needed

### Benchmarking

When making performance changes, include benchmarks:

```typescript
// Benchmark your changes
const times = []
for (let i = 0; i < 100; i++) {
  const start = performance.now()
  await yourFunction()
  const end = performance.now()
  times.push(end - start)
}

const avgTime = times.reduce((a, b) => a + b, 0) / times.length
console.log(`Average time: ${avgTime}ms`)
```

## Documentation

### JSDoc Comments

All public APIs must have JSDoc comments:

```typescript
/**
 * Analyze text for profanity with comprehensive results
 *
 * @param text - The text to analyze
 * @param options - Analysis options
 * @returns Promise that resolves to detection results
 *
 * @example
 * ```typescript
 * const result = await detector.analyze('text to check')
 * console.log(result.severity)
 * ```
 */
async analyze(text: string, options?: AnalysisOptions): Promise<DetectionResult> {
  // Implementation
}
```

### README Updates

When adding significant features, update the README.md:

- Add to feature list
- Include usage examples
- Update API references

### API Documentation

Update API.md for new public APIs:

1. Add method descriptions
2. Include parameters and return types
3. Provide usage examples
4. Document any limitations or considerations

## Pull Request Process

### Before Submitting

1. **Code Quality**: Ensure all linting and type checks pass
2. **Tests**: Add tests for new functionality
3. **Documentation**: Update relevant documentation
4. **Performance**: Verify performance requirements are met
5. **Backward Compatibility**: Ensure changes don't break existing APIs

### PR Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Backward compatibility maintained
- [ ] Commit messages follow convention
- [ ] PR description is clear and detailed

### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] New tests added
- [ ] Existing tests updated
- [ ] Performance tests included (if applicable)

## Performance Impact
Describe any performance implications of the changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)

## Related Issues
Closes #issue_number
```

### Review Process

1. **Automated Checks**: All CI checks must pass
2. **Code Review**: At least one maintainer review required
3. **Testing**: Thorough testing of changes
4. **Documentation Review**: Ensure documentation is accurate
5. **Performance Validation**: Verify performance standards are met

## Language Data

### Adding New Languages

To add support for a new language:

1. **Create Language Directory**: `data/languages/[language-code]/`
2. **Required Files**:
   - `metadata.json` - Language metadata
   - `profanity.json` - Profanity word list
   - `categories.json` - Category mappings
   - `severity.json` - Severity mappings
   - `variations.json` - Word variations
   - `context.json` - Context rules

3. **File Format Example**:

```json
// metadata.json
{
  "name": "English",
  "code": "en",
  "version": "1.0.0",
  "wordCount": 1500,
  "lastUpdated": "2023-01-01",
  "contributors": ["contributor1", "contributor2"]
}

// profanity.json
{
  "words": [
    {
      "word": "example",
      "severity": "medium",
      "categories": ["profanity"],
      "variations": ["ex4mple", "exampl3"]
    }
  ]
}
```

### Language Guidelines

1. **Accuracy**: Ensure word lists are accurate and culturally appropriate
2. **Context**: Consider cultural context and regional variations
3. **Severity**: Apply consistent severity ratings
4. **Variations**: Include common variations and substitutions
5. **Testing**: Add tests for the new language

### Content Guidelines

- Focus on clearly offensive terms
- Consider cultural context
- Avoid overreaching (minimize false positives)
- Include severity gradations
- Document sources and reasoning

## Issue Reporting

### Bug Reports

Use the bug report template:

```markdown
**Describe the Bug**
Clear description of the bug.

**To Reproduce**
Steps to reproduce the behavior:
1. Initialize with config...
2. Call method...
3. See error

**Expected Behavior**
What you expected to happen.

**Environment**
- OS: [e.g., Windows 10, macOS 12.0, Ubuntu 20.04]
- Node.js version: [e.g., 16.14.0]
- Package version: [e.g., 1.0.0]

**Additional Context**
Any other context about the problem.
```

### Feature Requests

Use the feature request template:

```markdown
**Feature Description**
Clear description of the feature you'd like to see.

**Use Case**
Explain the use case and why this feature would be valuable.

**Proposed Solution**
Describe how you envision this feature working.

**Alternatives Considered**
Any alternative solutions or features you've considered.

**Additional Context**
Any other context or screenshots about the feature request.
```

### Security Issues

For security-related issues, please email the maintainers directly instead of creating public issues.

## Community

### Getting Help

- GitHub Discussions for general questions
- GitHub Issues for bug reports and feature requests
- Stack Overflow with the `content-shield` tag

### Contributing Ideas

Areas where contributions are especially welcome:

1. **Language Support**: Adding new languages
2. **Performance Optimizations**: Speed and memory improvements
3. **Test Coverage**: Expanding test coverage
4. **Documentation**: Improving documentation and examples
5. **Bug Fixes**: Fixing reported issues
6. **Feature Enhancements**: Implementing requested features

## Recognition

Contributors will be recognized in:

- CONTRIBUTORS.md file
- Release notes for significant contributions
- GitHub contributor statistics

Thank you for contributing to ContentShield! Your contributions help make content moderation more accessible and effective for everyone.