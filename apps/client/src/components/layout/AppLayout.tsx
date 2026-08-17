import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../../config/routes';
import { site } from '../../content';
import { useAuth } from '../../session';
import { ReauthDialog } from '../../session/ReauthDialog';
/* By path, not through the barrel — see the note in `session/index.ts`. */
import { useUnread } from '../../session/useUnread';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { AnnouncerProvider } from '../patterns/Announcer';
import { OfflineNotice } from '../patterns/OfflineNotice';
import { ThemeControl } from '../patterns/ThemeControl';
import { RouteFallback } from '../patterns/RouteFallback';
import { Icon } from '@jobforge/ui';
import type { UnreadSummary } from '@jobforge/shared';
import styles from './AppLayout.module.css';
import { cx } from '@jobforge/ui';

/*
 * A concrete module, never a barrel. Routing a `lazy()` through an index merges chunks that
 * `scripts/check-budget.ts` exists to keep apart — the one sanctioned exception to the
 * "reach a feature through its index" rule, stated in `CLAUDE.md` and applying here for
 * exactly the same reason it applies in `app/routes/*.tsx`.
 */
const DemoLayer = lazy(() =>
  import('./DemoLayer').then((module) => ({ default: module.DemoLayer })),
);

/*
 * ============================================================================
 * THE CUSTOMER WORKSPACE
 * ============================================================================
 *
 * The private shell. A sibling of `SiteLayout` rather than a variant of it, and the
 * reason is what each one is for: the marketing header sells, and this one navigates.
 * A single header with `{isSignedIn ? … : …}` scattered through it would be a component
 * that does two unrelated jobs and does the second one badly the first time somebody
 * edits the first.
 *
 * What they share is the design system — the same tokens, the same primitives, the same
 * type scale — so a customer crossing from `/` to `/app` is somewhere new and obviously
 * still JobForge.
 *
 * ## The navigation is short on purpose
 *
 * Five items, and Website's own sections live inside Website rather than in the top
 * bar. A customer with one project does not need a nine-item sidebar to find it; see
 * the progressive-disclosure note in the brief. Nothing is here because a feature
 * exists — Feedback and Tasks are reached from the project they belong to.
 * ============================================================================
 */

/*
 * Six items, and the sixth had to argue for itself.
 *
 * The note above says the navigation is short on purpose and that nothing is here because a
 * feature exists. `Reports` is here because a *purchase* exists: DECISION 015 sells the
 * monthly Website Performance Report as Growth Partner's headline deliverable, and a
 * deliverable with no home in the product is one the customer cancels the first quiet month
 * because there is nothing on screen to remind them what they are paying for.
 *
 * It is shown to everybody rather than only to subscribers, which is the trade. A customer
 * with no reports gets an empty state that explains what one is and points at the plan — a
 * real answer to "what is this", rather than the dead end a hidden item would have been the
 * day somebody's first report landed and the navigation silently grew.
 */
const NAV_ITEMS = [
  { to: routes.appDashboard, label: 'Dashboard' },
  { to: routes.appAssessment, label: 'Assessment' },
  { to: routes.appProjects, label: 'Website' },
  { to: routes.appReports, label: 'Reports' },
  { to: routes.appMessages, label: 'Messages' },
  { to: routes.appBilling, label: 'Billing' },
  { to: routes.appAccount, label: 'Account' },
] as const;

export const APP_MAIN_CONTENT_ID = 'app-main-content';

/**
 * How much has happened that this customer has not seen.
 *
 * The digits are hidden from assistive technology and a sentence is given in their place,
 * because "3" on its own is meaningless read aloud — and reading both would say the number
 * twice. `capped` becomes "+" for the eye and "or more" for the ear; a badge showing a
 * number that is actually a ceiling is a badge that is wrong.
 */
function UnreadBadge({ unread }: { readonly unread: UnreadSummary }) {
  const noun = unread.count === 1 && !unread.capped ? 'update' : 'updates';

  return (
    <span className={styles['badge']}>
      <span aria-hidden="true">
        {unread.count}
        {unread.capped ? '+' : ''}
      </span>
      <span className="visually-hidden">
        {`${String(unread.count)}${unread.capped ? ' or more' : ''} new ${noun}`}
      </span>
    </span>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  /*
   * Re-asked on every navigation. The dashboard is what marks the stream read, so the
   * badge stops being true the moment somebody looks at it — and the next route change
   * is the moment they stop looking. See `session/useUnread`.
   */
  const unread = useUnread(pathname);
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState<string | null>(null);

  /*
   * Navigating with the menu open should not leave it covering the new page.
   *
   * Adjusted during render rather than in an effect, exactly as `Header` does it: React
   * re-runs the component immediately with the corrected value, so the menu is never
   * painted open on the new route. An effect would render it open first and then close
   * it, which is a visible flash and a cascading render.
   */
  if (menuOpen && menuPath !== null && menuPath !== pathname) {
    setMenuOpen(false);
    setMenuPath(null);
  }

  /*
   * The same route-change behaviour `SiteLayout` owns, and for the same reason: a
   * single-page application does not reload the document, so without this a screen
   * reader user hears nothing to tell them the page changed and keyboard focus stays
   * on the link they just left.
   *
   * Both statements below drive the browser rather than React state, which is what an
   * effect is actually for.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname]);

  async function handleSignOut() {
    await logout();
    navigate(routes.home, { replace: true });
  }

  return (
    /*
     * The live region wraps the whole shell, so it is mounted before any page inside it can
     * have anything to say. See `patterns/Announcer` for why it is here rather than in `App`.
     */
    <AnnouncerProvider>
      <div className={styles['shell']}>
        {/*
         * ================================================================
         * THE DEMONSTRATION LAYER, AND WHAT IT COSTS A REAL CUSTOMER
         * ================================================================
         *
         * Nothing. This is the only place in the client that reads `user.demo`, and the
         * whole layer — banner, tour, feedback form, its stylesheet — is behind one
         * `lazy()` inside the check. A customer who is not on the demonstration account
         * never downloads a byte of it, which is the property the eager budget cares
         * about and the one the exit criterion measures.
         *
         * `Suspense` with a `null` fallback rather than a skeleton, deliberately: the
         * banner is furniture around the product, and a placeholder bar that appears and
         * then swaps would draw the eye to the frame at the exact moment somebody is
         * meant to be looking at what is inside it.
         * ================================================================
         */}
        {user?.demo ? (
          <Suspense fallback={null}>
            <DemoLayer />
          </Suspense>
        ) : null}
        <a href={`#${APP_MAIN_CONTENT_ID}`} className={styles['skipLink']}>
          Skip to main content
        </a>

        <header className={styles['header']} data-print="hide">
          <div className={styles['headerInner']}>
            <NavLink to={routes.appDashboard} className={styles['wordmark']}>
              {site.name}
            </NavLink>

            <button
              type="button"
              className={styles['menuToggle']}
              aria-expanded={menuOpen}
              aria-controls="app-navigation"
              onClick={() => {
                setMenuOpen((open) => !open);
                setMenuPath(menuOpen ? null : pathname);
              }}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
              <span className="visually-hidden">{menuOpen ? 'Close menu' : 'Open menu'}</span>
            </button>

            <nav
              id="app-navigation"
              className={cx(styles['nav'], menuOpen && styles['navOpen'])}
              aria-label="Your account"
            >
              <ul className={styles['navList']}>
                {NAV_ITEMS.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      /*
                       * `end` only on the dashboard: every other item is a section with
                       * pages beneath it, and marking Website current while somebody is
                       * on its preview page is correct.
                       */
                      end={item.to === routes.appDashboard}
                      className={({ isActive }) =>
                        cx(styles['navLink'], isActive && styles['navLinkActive'])
                      }
                    >
                      {item.label}
                      {/*
                       * The count rides on Dashboard because Dashboard is where the entries
                       * are, and it is deliberately absent while somebody is *on* Dashboard:
                       * a badge pointing at the page you are reading is noise, and it is
                       * about to be wrong anyway — the page marks the stream read.
                       *
                       * Inside the link rather than beside it, so tapping the number does
                       * what tapping the number obviously should. The literal space before
                       * it is load-bearing and invisible: a flex container drops a
                       * whitespace-only anonymous item, but the accessible name of the link
                       * is its child text concatenated, and without a text node between them
                       * "Dashboard" and "3 new updates" are announced as one word.
                       */}
                      {item.to === routes.appDashboard &&
                      pathname !== routes.appDashboard &&
                      unread &&
                      unread.count > 0 ? (
                        <>
                          {' '}
                          <UnreadBadge unread={unread} />
                        </>
                      ) : null}
                    </NavLink>
                  </li>
                ))}
              </ul>

              <div className={styles['account']}>
                {user ? <span className={styles['accountName']}>{user.name}</span> : null}

                {/*
                 * The deliberate way out.
                 *
                 * Leaving the workspace used to happen by accident: a call to action on
                 * the dashboard pointed at a marketing page, the shell changed underneath
                 * somebody, and the way back was not obvious. Two things fix that — every
                 * link *inside* the workspace now stays inside it, and leaving is this,
                 * an explicit control that says where it goes.
                 *
                 * A plain anchor rather than a router `Link`, so the workspace unmounts
                 * and the marketing site is entered cleanly rather than being rendered
                 * inside a shell that is on its way out.
                 */}
                <a className={styles['exit']} href={routes.home}>
                  View the public site
                </a>

                <button type="button" className={styles['signOut']} onClick={handleSignOut}>
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </header>

        {/*
         * The session ending is the one failure that must not take the page with it, so the
         * dialog that fixes it lives in the shell rather than on a route. Renders nothing
         * until `reauthNeeded` goes up — see the long note in `session/useAuth.ts`.
         *
         * Here and not in `AuthProvider`, which wraps the marketing site as well: an
         * anonymous visitor has no session to lose, and `/api/auth/me` answers
         * `UNAUTHENTICATED` for every one of them on every page load. Mounting it here also
         * puts it in this layout's chunk, so no marketing visitor downloads a dialog they
         * can never be shown.
         */}
        <ReauthDialog />

        <main id={APP_MAIN_CONTENT_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
          {/*
           * Above the routed page and inside `<main>`, so it is the first thing read on a
           * page that has stopped working — and so it survives a route change, which is
           * exactly when somebody is most likely to discover the connection has gone.
           * Renders nothing at all while the browser has a network.
           */}
          <OfflineNotice />
          {/*
           * Inside `<main>` so the header stays on screen while a lazy page arrives —
           * the same arrangement as `SiteLayout`, and for the same reason.
           *
           * ## The error boundary that was missing
           *
           * `SiteLayout` and `AuthLayout` both wrap their outlet in one and each explains why
           * at length. This layout did not, so a throw anywhere under `/app` fell all the way
           * to `App`'s outermost boundary and painted the standalone "whole" screen — taking
           * the workspace navigation, the sign-out control and the support address with it, on
           * the surface where somebody is signed in and mid-task.
           *
           * Nothing decided against it. The boundary was written for the marketing site and
           * added to `AuthLayout` when that shell was split out; this shell simply never got
           * it, and no test asked. `app/a11y.test.tsx` now does.
           *
           * Keyed on the path for the same reason `SiteLayout`'s is: a boundary that has caught
           * once stays caught, so without the key every later navigation would render the error
           * state for a page that is perfectly fine.
           */}
          <ErrorBoundary key={pathname} label={`app ${pathname}`}>
            <Suspense fallback={<RouteFallback label="Loading" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>

        <footer className={styles['footer']} data-print="hide">
          <p>
            Need a hand? Email{' '}
            <a href={`mailto:${site.contact.supportEmail}`}>{site.contact.supportEmail}</a>
            {' — '}we reply within one business day.
          </p>

          {/*
           * The workspace's own copy of the appearance control, because somebody who signs
           * in and stays there never sees the marketing footer again. Same component, same
           * stored preference, same three options — the setting follows them between the two
           * halves of the site because it is one key in one place.
           */}
          <div className={styles['footerSetting']}>
            <ThemeControl id="appearance-app" />
          </div>
        </footer>
      </div>
    </AnnouncerProvider>
  );
}
