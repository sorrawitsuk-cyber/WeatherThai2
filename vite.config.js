import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        // ไม่ precache app shell — browser โหลดใหม่จาก network ทุกครั้ง
        globPatterns: [],
        runtimeCaching: [
          // GeoJSON: Cache First (rarely changes)
          {
            urlPattern: /\/(thai_geo|thailand)\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'geojson-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
          // Firebase Realtime DB: Network First
          {
            urlPattern: /firebaseio\.com/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firebase-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 5,
            },
          },
          // Air4Thai API: StaleWhileRevalidate
          {
            urlPattern: /air4thai\.pcd\.go\.th/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'air4thai-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 10 },
            },
          },
          // Open-Meteo API: StaleWhileRevalidate
          {
            urlPattern: /open-meteo\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'weather-api-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 10 },
            },
          },
          // Google Fonts: Cache First
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'AirQuality ไทย — ตรวจสอบคุณภาพอากาศ',
        short_name: 'AirQuality Thai',
        description: 'ตรวจสอบคุณภาพอากาศ ฝุ่น PM2.5 สภาพอากาศ และเตือนภัยล่วงหน้าของประเทศไทยแบบเรียลไทม์',
        lang: 'th',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/?source=pwa',
        categories: ['weather', 'environment', 'utilities'],
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'ภาพรวม',
            short_name: 'ภาพรวม',
            description: 'ดูข้อมูลสภาพอากาศและ AQI ภาพรวม',
            url: '/?shortcut=dashboard',
            icons: [{ src: 'icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'แผนที่คุณภาพอากาศ',
            short_name: 'แผนที่',
            description: 'ดูแผนที่คุณภาพอากาศแบบ Interactive',
            url: '/map?shortcut=map',
            icons: [{ src: 'icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'เตือนภัย',
            short_name: 'เตือนภัย',
            description: 'ดูการแจ้งเตือนสภาพอากาศและภัยธรรมชาติ',
            url: '/alerts?shortcut=alerts',
            icons: [{ src: 'icon-192x192.png', sizes: '192x192' }],
          },
        ],
        screenshots: [
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'AirQuality Thai Dashboard',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api-air': {
        target: 'http://air4thai.pcd.go.th',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-air/, '')
      }
    }
  }
})