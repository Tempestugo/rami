import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@data': path.resolve(__dirname, './api/_data'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000'
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
