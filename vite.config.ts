import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  root: 'client',
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
      '@shared': path.resolve(__dirname, 'shared'),
      '@shared/types': path.resolve(__dirname, 'shared/types'),
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
  server: {
    port: parseInt(process.env.VITE_PORT || '3120'),
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: true,
      interval: 100,
    },
    cors: true,
    host: true,
    allowedHosts: ['dev.capacinator.com', 'localhost'],
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.PORT || '3121'}`,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  esbuild: {
    keepNames: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    sourcemap: true,
    outDir: '../dist/client',
  },
})
