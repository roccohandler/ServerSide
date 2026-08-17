import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/*
 * ============================================================================
 * THE OWNER CONSOLE'S BUILD
 * ============================================================================
 *
 * A second application, not a second entry point of the first. It ships its own bundle to
 * its own origin, and it shares exactly two things with the customer app: `@jobforge/ui`
 * (how it looks) and `@jobforge/shared` (what it says to the API). It imports nothing from
 * `apps/client` and `apps/client` imports nothing from here — ESLint fails the build on
 * either direction, and that is what makes these two deployable separately.
 *
 * ## This bundle is not a security boundary
 *
 * Everything here reaches a browser and is readable by anybody who opens dev tools. The
 * console hides controls the signed-in user has no capability for, and that is a courtesy
 * to the user rather than a defence: `apps/server` re-checks every capability from the
 * session on every request, and that check is the only one that decides anything. No
 * secret, token or admin credential may ever be built into this bundle.
 *
 * ## Ports
 *
 * 5173 is the customer app, 5174 is this one, 5000 is the API. In development both apps
 * proxy `/api` to the same Express server, so the browser makes same-origin requests and
 * no CORS configuration is involved. In production they are separate origins and the
 * server's allowlist is what permits them — see `config/env.ts`.
 * ============================================================================
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
      '\n  [api] not up yet — this console proxies /api to ' +
        `localhost:${DEV_API_PORT}, and \`tsx watch\` takes a few seconds longer to start ` +
        'than Vite does.\n       Requests will connect as soon as it is listening. ' +
        'Nothing is wrong.\n',
    );
  });
}

export default defineConfig({
  plugins: [react()],

  /*
   * ==========================================================================
   * THE CONSOLE IS SERVED UNDER `/admin`, AND EVERY ASSET URL DEPENDS ON IT
   * ==========================================================================
   *
   * DECISION 034. The console's files are copied into the customer project's output at
   * `dist/admin/`, so its own document loads `/admin/assets/index-….js` — and without this
   * `base`, Vite would emit `/assets/index-….js`, which on that origin resolves to the
   * *customer* bundle's directory. The page would load, request the wrong file, and render
   * nothing, with a 200 on every request.
   *
   * The trailing slash is required. Vite joins `base` to the asset path without inserting
   * one, so `/admin` produces `/adminassets/…`.
   *
   * This moves the dev URL too: `http://localhost:5174/admin/`, not `:5174/`. That is the
   * cost of the two environments agreeing, and the alternative — a base that is only set in
   * production — is a path that is correct everywhere except the one place it is served.
   * ==========================================================================
   */
  base: '/admin/',

  /* `.env` lives at the repository root, two levels up, and is shared with the server. */
  envDir: '../..',

  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: `http://localhost:${DEV_API_PORT}`,
        configure: quietStartupRace,
      },
    },
  },

  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
