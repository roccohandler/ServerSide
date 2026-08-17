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

/*
 * ============================================================================
 * THE FOUR STACK TRACES `npm run dev` USED TO PRINT
 * ============================================================================
 *
 * `concurrently` starts the server, this app and the console together. Vite is listening in
 * about 350ms; the server has to compile TypeScript through `tsx watch` and reach Atlas,
 * which takes seconds. Both frontends ask `/api/auth/me` the moment they mount, the proxy
 * finds nothing on port 5000, and Vite prints:
 *
 *     http proxy error: /api/auth/me
 *     AggregateError [ECONNREFUSED]
 *         at internalConnectMultiple (node:net:1134:18)
 *         at afterConnectMultiple (node:net:1715:7)
 *
 * Twice per app, because `<StrictMode>` double-invokes effects in development.
 *
 * **Both applications behave correctly here.** `AuthContext` treats a failed `/me` as
 * anonymous by written decision — "a marketing page behind an error screen would be far worse
 * than a header that shows Sign in during an outage" — and the console falls to its sign-in
 * form. The race resolves itself the moment the server is up and nothing is lost.
 *
 * So what is being fixed is not a defect, it is a **lie about severity**: four unhandled-error
 * stack traces at every boot teach a reader that a stack trace at boot is nothing to worry
 * about, and that is the habit that hides the next real one.
 *
 * ## Why not `wait-on`
 *
 * It is the obvious fix and it is a dependency added to make a log quieter, in a repository
 * that has three runtime dependencies and a script whose whole job is to complain about page
 * weight. It would also delay both dev servers behind the slowest of the three for a race
 * that costs nothing.
 */
function quietStartupRace(proxy: { on(event: 'error', handler: () => void): void }): void {
  let announced = false;

  proxy.on('error', () => {
    /*
     * Once. The point is to say the API is not up, and saying it four times is the noise
     * being replaced. A later failure after a successful start is a different thing — but
     * distinguishing them would need state this hook has no honest way to read, and the
     * browser reports it either way through `NETWORK_ERROR`.
     */
    if (announced) return;
    announced = true;

    console.log(
      '\n  [api] not up yet — the dev server proxies /api to ' +
        `localhost:${DEV_API_PORT}, and \`tsx watch\` takes a few seconds longer to start ` +
        'than Vite does.\n       Requests will connect as soon as it is listening. ' +
        'Nothing is wrong.\n',
    );
  });
}

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
  envDir: '../..',

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${DEV_API_PORT}`,
        configure: quietStartupRace,
      },
    },
  },

  build: {
    target: 'es2022',
    // No sourcemaps in the published bundle: they are not needed to run the site.
    sourcemap: false,
  },
});
