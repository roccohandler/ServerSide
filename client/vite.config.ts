import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * Build configuration only.
 *
 * This file must not import anything that is not needed to produce the bundle — in
 * particular not `vitest/config`, which is where the test settings used to live. Doing
 * so made a production build depend on the test runner, and any environment that
 * installs without devDependencies could not even load this file. Test settings live
 * in `vitest.config.ts`, which extends this.
 */

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
   *
   * One consequence: Vite also honours a NODE_ENV set in that shared file, which would
   * silently produce a development build. `scripts/build.ts` pins NODE_ENV before Vite
   * loads so that cannot happen — see the comment there.
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
});
