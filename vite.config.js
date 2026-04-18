import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      manifest: {
        name: 'AirQuality ไทย — ตรวจสอบคุณภาพอากาศ',
        short_name: 'AirQuality Thai',
        description:
          'ตรวจสอบคุณภาพอากาศ ฝุ่น PM2.5 สภาพอากาศ และเตือนภัยล่วงหน้าของประเทศไทยแบบเรียลไทม์',
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
            url: '/news?shortcut=alerts',
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
        rewrite: (path) => path.replace(/^\/api-air/, ''),
      },
    },
  },
});
