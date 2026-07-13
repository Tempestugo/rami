import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@/data': path.resolve(__dirname, './api/_data'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/auth': 'http://127.0.0.1:3000',
      '/api/cards': 'http://127.0.0.1:3000',
      '/api/phrases': 'http://127.0.0.1:3000',
      '/api/phrase': 'http://127.0.0.1:3000',
      '/api/lesson': 'http://127.0.0.1:3000',
      '/api/progress': 'http://127.0.0.1:3000',
      '/api/deck': 'http://127.0.0.1:3000',
      '/api/characters': 'http://127.0.0.1:3000',
      '/api/graph': 'http://127.0.0.1:3000',
      '/api/game': 'http://127.0.0.1:3000',
      '/api/translate': 'http://127.0.0.1:3000',
    }
  },
  optimizeDeps: { 
    exclude: ['esbuild'] 
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: { compress: { drop_console: true } },
    rollupOptions: { output: { manualChunks: undefined } }
  }
})
