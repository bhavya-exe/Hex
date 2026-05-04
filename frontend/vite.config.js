import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js'
  },
  server: {
    proxy: {
      '/scan': 'http://backend:8000',
      '/history': 'http://backend:8000',
      '/auth': 'http://backend:8000',
      '/compare': 'http://backend:8000',
      '/admin': 'http://backend:8000',
      '/models': 'http://backend:8000',
      '/webhooks': 'http://backend:8000',
      '/apikeys': 'http://backend:8000',
      '/registry': 'http://backend:8000',
      '/ws': { target: 'ws://backend:8000', ws: true }
    }
  }
})
