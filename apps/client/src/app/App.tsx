import { BrowserRouter, Routes } from 'react-router-dom';
import { ErrorBoundary } from './ErrorBoundary';
import { AuthProvider } from '../session';
import { marketingRoutes } from './routes/marketingRoutes';
import { authRoutes } from './routes/authRoutes';
import { privateRoutes } from './routes/privateRoutes';
import { demoRoutes } from './routes/demoRoutes';
import { promoRoutes } from './routes/promoRoutes';

/*
 * ============================================================================
 * THE APPLICATION ROOT
 * ============================================================================
 *
 * Client-side routing, because every page needs its own descriptive URL and its own title
 * and description for search results.
 *
 * This file used to hold every route and every `lazy()` call — 480 lines in which the
 * shape of the application was buried under the reasoning for twenty-six code-splitting
 * decisions. It now says the one thing that is true at this level: **there are four
 * audiences, and each brings its own shell and its own guard.** Each group's routes, and
 * the arithmetic behind its chunk boundaries, live with that group.
 *
 * | Group       | Shell        | Guard         | Reached by                          |
 * | ----------- | ------------ | ------------- | ----------------------------------- |
 * | `marketing` | `SiteLayout` | none          | anybody                             |
 * | `auth`      | `AuthLayout` | none          | anybody signing in or up            |
 * | `private`   | `AppLayout`  | `RequireAuth` | a signed-in customer                |
 * | `demo`      | `DemoLayout` | none          | anybody, on another business's site  |
 *
 * There used to be a fifth, `admin`, guarded by `RequireAdmin`. It is now `apps/admin`, a
 * separate bundle on a separate origin — DECISION 027. Nothing in this application knows
 * the console exists, which is the strongest form the isolation could take: a customer's
 * browser never downloads a byte of it, and there is no route here to guess at.
 *
 * ## Why the groups export elements rather than components
 *
 * `<Routes>` reads its children with `createRoutesFromChildren`, which understands
 * `<Route>` and `<Fragment>` and throws on anything else — so a `<MarketingRoutes />`
 * component would fail at render, not at compile. Each module therefore exports a JSX
 * *value*, and this file interpolates it.
 *
 * ## This is not a data router, and that was measured rather than assumed
 *
 * `useBlocker` — the only supported way to stop an in-app navigation from discarding a
 * half-filled form — requires `createBrowserRouter` + `RouterProvider`. That migration was
 * attempted here on 2026-08-16 and **reverted on the number**:
 *
 *     eager JS 537.9 → 591.9 kB raw   (+54.0)
 *              163.4 → 180.0 gzipped  (+16.6)
 *
 * `createRoutesFromElements` made the migration itself almost free — the four route modules
 * were passed to it verbatim, so not one `lazy()` boundary moved. What is not free is the
 * data layer that comes with a data router: loaders, actions, fetchers, revalidation and the
 * route-matching machinery behind them, none of which this application uses at all. It is
 * **16.6 kB gzipped of render-blocking JavaScript on every marketing page**, which is most
 * of a whole eager CSS budget, to warn about unsaved work on four forms that all sit behind
 * a sign-in.
 *
 * `scripts/check-budget.ts` refused it, and refusing it was correct. The capability it was
 * for is built instead in `hooks/useUnsavedChanges.ts`, at a cost of about 0.4 kB — read the
 * note there for what that version covers and what it does not, which is a shorter list than
 * this paragraph would suggest.
 *
 * ## The split does not change a single chunk
 *
 * Every `lazy()` still reaches a concrete module rather than a feature's `index.ts`, which
 * is the one sanctioned exception to the entry-point rule: routing a dynamic import
 * through a barrel merges chunks that `scripts/check-budget.ts` exists to keep apart. The
 * budget was measured across this change and did not move.
 * ============================================================================
 */
export function App() {
  return (
    /*
     * The outermost boundary, and the only one that can catch a throw in the layout
     * itself — `SiteLayout` has its own around the routed page, which handles the far more
     * common case without taking the header and footer down with it. See `ErrorBoundary`.
     */
    <ErrorBoundary variant="whole" label="app">
      <BrowserRouter>
        {/*
         * One `AuthProvider` around the whole router, public routes included.
         *
         * The marketing header needs to know whether somebody is signed in — a returning
         * customer should see "Dashboard" rather than "Sign in" — so the provider cannot
         * live inside the `/app` boundary. It is a single `/api/auth/me` on load and
         * nothing else for an anonymous visitor.
         */}
        <AuthProvider>
          <Routes>
            {marketingRoutes}
            {authRoutes}
            {privateRoutes}
            {demoRoutes}
            {promoRoutes}
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
