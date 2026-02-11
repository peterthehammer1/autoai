import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const isVercel = process.env.VERCEL === '1'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        ...(!isVercel
          ? [
              (async () => {
                const prerender = (await import('@prerenderer/rollup-plugin')).default
                const PuppeteerRenderer = (await import('@prerenderer/renderer-puppeteer')).default
                return prerender({
                  routes: ['/'],
                  renderer: new PuppeteerRenderer({
                    renderAfterDocumentEvent: 'DOMContentLoaded',
                  }),
                })
              })(),
            ]
          : []),
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
