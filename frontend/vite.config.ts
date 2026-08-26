import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Le sélecteur AUTH_MODE=dev ne doit pas devenir accessible depuis le
    // réseau local via le serveur Vite.
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
  },
});
