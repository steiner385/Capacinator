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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/unit/client/setup/setup.ts',
    include: ['tests/unit/client/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  build: {
    outDir: 'dist-client',
    rollupOptions: {
      input: './index.html'
    }
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3120'),
    https: {
      key: fs.readFileSync(path.resolve(__dirname, 'ssl/dev.capacinator.com.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'ssl/dev.capacinator.com.crt')),
    },
    hmr: {
      overlay: true,
      port: 3120,
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
    allowedHosts: ['dev.capacinator.com', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: `http://localhost:3110`,
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
  resolve: {
    alias: {
      '@': '/client/src',
      '@client': '/client/src'
    }
  },
})
