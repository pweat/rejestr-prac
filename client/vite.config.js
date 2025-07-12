import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa'; // <-- Importujemy dodatek

export default defineConfig({
  plugins: [
    vue(),
    // Konfiguracja dodatku PWA
    VitePWA({
      registerType: 'autoUpdate',
      // manifest.json jest teraz generowany stąd
      manifest: {
        name: 'Zentroo - Studnie',
        short_name: 'Zentroo',
        description: 'Aplikacja do zarządzania zleceniami firmy Zentroo.',
        theme_color: '#ffffff',
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
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
