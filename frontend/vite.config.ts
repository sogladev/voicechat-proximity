import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  base: "./", // Ensures assets work when served from static folder
  build: {
    outDir: "../backend/static", // Moves build files to backend
  },
  server: {
    proxy: {
      '/api': 'http://localhost:22142', // REST API calls
      '/ws': {
        target: 'ws://localhost:22142', // WebSocket connections
        ws: true,
      },
    },
  },
})
