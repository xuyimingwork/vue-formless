import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(root, 'src'),
      'vue-formless': path.resolve(root, '../packages/vue-formless/src/index.ts'),
    },
  },
  server: {
    port: 5173,
  },
})
