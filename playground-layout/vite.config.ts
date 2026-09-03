import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'vite'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  base: process.env.PAGES_BASE || '/',
  plugins: [vue(), vueJsx()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      '@vue-formless/layout': path.resolve(root, '../packages/layout/src/index.ts'),
    },
  },
  server: {
    port: 5174,
  },
})
