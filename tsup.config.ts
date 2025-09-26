import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true, // Re-enabled after fixing TypeScript issues
  splitting: true, // Enable code splitting for better tree-shaking
  sourcemap: true,
  clean: true,
  minify: process.env.NODE_ENV === 'production',
  treeshake: true,
  target: 'es2020',
  outDir: 'dist',
  external: [],
  noExternal: [],
  banner: {
    js: '/* NaughtyWords v1.0.0 - A modern profanity detection library */',
  },
  esbuildOptions(options) {
    options.conditions = ['module']
    options.keepNames = true // Preserve function names for better debugging
    options.legalComments = 'none'
  },
  // Use regular DTS generation
  // Additional optimizations
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  // Minification options
  minifyWhitespace: true,
  minifyIdentifiers: process.env.NODE_ENV === 'production',
  minifySyntax: true,
  // Bundle analysis
  metafile: true,
})