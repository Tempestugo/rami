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
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        bypass(req, res, options) {
          if (req.url.startsWith('/api/_data/')) {
            return req.url;
          }
          return false;
        },
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[Vite Proxy Error]:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('[Vite Proxy Request]:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('[Vite Proxy Response]:', proxyRes.statusCode, req.url);
          });
        }
      }
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
