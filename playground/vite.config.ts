import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      'vue-formless': path.resolve(root, '../packages/vue-formless/src/index.ts'),
      '@vue-formless/layout': path.resolve(root, '../packages/layout/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
})
