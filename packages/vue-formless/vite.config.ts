import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const root = fileURLToPath(new URL('.', import.meta.url))
const layoutSrc = path.resolve(root, '../layout/src/index.ts')

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@vue-formless/layout': layoutSrc,
    },
  },
  build: {
    target: 'es2020',
    lib: {
      entry: path.resolve(root, 'src/index.ts'),
      name: 'VueFormless',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      // Keep @vue-formless/layout off this list so it is inlined into dist.
      external: ['vue'],
      output: {
        globals: {
          vue: 'Vue',
        },
      },
    },
  },
  plugins: [
    vueJsx(),
    dts({
      rollupTypes: true,
      bundledPackages: ['@vue-formless/layout'],
      aliasesExclude: ['@vue-formless/layout'],
      exclude: ['**/__test__/**', '**/*.test.ts', '**/*.test.tsx'],
    }),
  ],
})
