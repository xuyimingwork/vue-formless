import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    target: 'es2020',
    lib: {
      entry: path.resolve(root, 'src/index.ts'),
      name: 'VueFormlessElementPlus',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['vue', 'vue-formless', 'element-plus'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-formless': 'VueFormless',
          'element-plus': 'ElementPlus',
        },
      },
    },
  },
  plugins: [
    dts({
      rollupTypes: true,
      exclude: ['**/*.test.ts'],
    }),
  ],
})
