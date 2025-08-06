import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: '.',
  publicDir: 'client/public',
  plugins: [
    react({
      fastRefresh: true,
      babel: {
        plugins: [
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
  build: {
    outDir: 'dist-client',
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3120'),
    https: false, // We'll use nginx for HTTPS
    hmr: {
      overlay: true,
      clientPort: 443, // Tell HMR to use the nginx proxy
      protocol: 'wss',
      host: 'local.capacinator.com',
    },
    watch: {
      usePolling: true,
      interval: 100,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/.env*'],
    },
    fs: {
      allow: ['.', '../'],
      deny: ['.git', '.env*', 'node_modules'],
    },
    cors: true,
    host: '0.0.0.0', // Allow external connections
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.NODE_ENV === 'e2e' ? '3111' : '3110'}`,
        changeOrigin: true,
        secure: false,
        timeout: 10000,
        proxyTimeout: 10000,
        onError: (err, req, res) => {
          console.warn('🔴 Vite proxy error:', err.message);
          console.log('🔄 Backend server might be restarting...');
        },
      },
    },
  },
  esbuild: {
    keepNames: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
