import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    preact(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['adapt.js', 'vite.svg'],
      manifest: {
        name: 'MusicPlayer PWA',
        short_name: 'MusicPlayer',
        description: 'Local + online music player for PWA containers.',
        theme_color: '#0b0b0c',
        background_color: '#0b0b0c',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'vite.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
