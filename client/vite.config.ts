import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Port the Express server listens on in development. Keep in sync with `PORT` in `.env`.
 * The proxy means the browser always calls same-origin `/api/...`, in development and in
 * production alike, so no CORS configuration is needed for the default deployment.
 */
const DEV_API_PORT = 5000;

export default defineConfig({
  plugins: [react()],

  /*
   * `.env` lives at the repository root and is shared with the server, so Vite is
   * pointed one level up. Only VITE_-prefixed values are ever exposed to the browser.
   */
  envDir: '..',

  server: {
    port: 5173,
    proxy: {
      '/api': { target: `http://localhost:${DEV_API_PORT}` },
    },
  },

  build: {
    target: 'es2022',
    // No sourcemaps in the published bundle: they are not needed to run the site.
    sourcemap: false,
  },

  test: {
    name: 'client',
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
