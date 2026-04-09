import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
        'android-chrome-192x192.png',
        'android-chrome-512x512.png',
      ],
      manifest: false, // use existing site.webmanifest
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache locale/translation files
            urlPattern: /\/locales\/.*\.json$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'locales-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          {
            // API calls — network first, fall back to cache
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3000',
      '/env.js': 'http://localhost:3000',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React dependencies
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI framework
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
          // Charts library (heavy)
          'vendor-charts': ['recharts'],
          // Maps library (heavy)
          'vendor-maps': ['leaflet', 'react-leaflet'],
          // Form handling
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
        },
      },
    },
  },
})
