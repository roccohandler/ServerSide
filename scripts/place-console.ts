import { cp, rm, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

/*
 * ============================================================================
 * PUTTING THE CONSOLE INSIDE THE CUSTOMER PROJECT'S OUTPUT
 * ============================================================================
 *
 * DECISION 034. Two bundles, one origin: `apps/admin/dist` is copied to
 * `apps/client/dist/admin`, and one Vercel project serves both.
 *
 * ## Why one origin, when DECISION 027 went to the trouble of separating them
 *
 * Because the session cookie is `SameSite=Lax`, `SameSite` is evaluated on the registrable
 * domain, and `vercel.app` is on the Public Suffix List — so two `*.vercel.app` names are two
 * *sites* and the browser sends no cookie between them. The console signed in successfully
 * and immediately showed the sign-in form again, with no error, no failed request and a
 * perfectly healthy server. The documented fix was "attach a real domain to both projects",
 * which is correct and is a purchase standing between the owner and their own console.
 *
 * **What DECISION 027 actually bought was two bundles, not two origins.** A visitor to the
 * homepage still downloads none of the console: it is a separate document, separate
 * JavaScript, separate CSS, reached only by asking for `/admin`. That property survives this
 * intact, and it is the one the customer's payload budget cares about.
 *
 * What is given up is that `/admin` is guessable again on the public origin. That is
 * obscurity, not security — `requireAdmin` answers `NOT_FOUND` to every non-admin, the server
 * is the only boundary, and no bundle contains a secret. Recorded rather than hidden, and
 * reversible: put the console back on its own project the day a domain exists, and the only
 * things that change are this script, the `base` in its Vite config, and a rewrite.
 *
 * ## Why a copy rather than pointing Vite's `outDir` at the client's `dist`
 *
 * Because `apps/admin/dist` still has two readers: `bundle.test.ts`, which is the guard that
 * catches a development React build shipping to production, and `scripts/check-csp.ts`, which
 * recomputes the inline theme script's digest from the HTML that is actually served. Moving
 * the output would have meant editing both to chase it, and would have left the console
 * undeployable on its own the day it earns a domain.
 *
 * The copy is last in the build for an ordering reason as well: `build:client` empties
 * `apps/client/dist`, so a console placed before it would be deleted by the build that runs
 * after it — silently, leaving a `/admin` that 404s on a deploy whose log is entirely green.
 * ============================================================================
 */

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'apps/admin/dist');
const destination = resolve(root, 'apps/client/dist/admin');

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

if (!(await directoryExists(source))) {
  console.error(
    `[console] ${source} does not exist.\n` +
      `          This runs after \`build:admin\`. Run \`npm run build\` rather than this alone.`,
  );
  process.exit(1);
}

if (!(await directoryExists(resolve(root, 'apps/client/dist')))) {
  console.error(
    `[console] apps/client/dist does not exist, so there is nothing to place the console ` +
      `inside.\n          \`build:client\` has to run first — see the ordering note above.`,
  );
  process.exit(1);
}

/*
 * Removed rather than merged. A stale asset from a previous build carries a content hash
 * nothing references, so it would never be served — but it would be uploaded on every deploy
 * forever, and a directory that only grows is one nobody notices growing.
 */
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });

console.log('[console] placed apps/admin/dist at apps/client/dist/admin');
