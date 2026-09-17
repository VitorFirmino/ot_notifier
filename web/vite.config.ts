import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite's dev server only auto-redirects bare "/" to `base`; a hard navigation or
// reload landing exactly on "/app" (no trailing slash) otherwise hits Vite's own
// 404 "did you mean /app/?" page instead of the app. Redirect it ourselves.
const redirectBareBaseToTrailingSlash = (): Plugin => ({
  name: 'redirect-bare-base-to-trailing-slash',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/app') {
        res.writeHead(302, { Location: '/app/' })
        res.end()
        return
      }
      next()
    })
  },
})

export default defineConfig({
  base: '/app/',
  plugins: [
    redirectBareBaseToTrailingSlash(),
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
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
