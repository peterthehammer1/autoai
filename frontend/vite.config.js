import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import prerender from '@prerenderer/rollup-plugin'
import PuppeteerRenderer from '@prerenderer/renderer-puppeteer'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        prerender({
          routes: ['/'],
          renderer: new PuppeteerRenderer({
            renderAfterDocumentEvent: 'DOMContentLoaded',
          }),
        }),
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
