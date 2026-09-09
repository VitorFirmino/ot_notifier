import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@components': path.resolve(import.meta.dirname, './src/components'),
      '@hooks': path.resolve(import.meta.dirname, './src/hooks'),
      '@lib': path.resolve(import.meta.dirname, './src/lib'),
      '@services': path.resolve(import.meta.dirname, './src/services'),
      '@types': path.resolve(import.meta.dirname, './src/types'),
      '@assets': path.resolve(import.meta.dirname, './src/assets'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
