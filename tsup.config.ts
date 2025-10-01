import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/languages/data/index.ts',
    'src/languages/data/ar.ts',
    'src/languages/data/de.ts',
    'src/languages/data/en.ts',
    'src/languages/data/es.ts',
    'src/languages/data/fr.ts',
    'src/languages/data/he.ts',
    'src/languages/data/hi.ts',
    'src/languages/data/it.ts',
    'src/languages/data/ja.ts',
    'src/languages/data/ko.ts',
    'src/languages/data/nl.ts',
    'src/languages/data/pl.ts',
    'src/languages/data/pt.ts',
    'src/languages/data/ru.ts',
    'src/languages/data/sv.ts',
    'src/languages/data/tr.ts',
    'src/languages/data/zh.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  treeshake: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  banner: {
    js: '/* NaughtyWords v0.1.0 - A modern profanity detection library */',
  },
  esbuildOptions(options) {
    options.conditions = ['module']
    options.keepNames = true
    options.legalComments = 'none'
  },
})