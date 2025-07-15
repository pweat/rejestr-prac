import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Importujemy dodatek

export default defineConfig({
  plugins: [
    vue(),
    // Konfiguracja dodatku PWA
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        // ... ta sekcja pozostaje bez zmian ...
      },
      // 👇 DODAJ TEN NOWY BLOK 👇
      workbox: {
        runtimeCaching: [
          {
            // Strategia dla naszego API
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
