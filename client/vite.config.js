import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ta sekcja musi być w pełni uzupełniona
      manifest: {
        name: 'Zentroo - Rejestr Prac',
        short_name: 'Zentroo',
        description: 'Aplikacja do zarządzania zleceniami firmy Zentroo.',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
        shortcuts: [
          {
            name: 'Nowe Zlecenie',
            url: '/zlecenia?action=new',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Nowy Klient',
            url: '/klienci?action=new',
            icons: [{ src: '/icon-192x192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 1 dzień
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
