import { Suspense, useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { routes } from '../../config/routes';
import { site } from '../../content';
import { useAuth } from '../../features/auth/useAuth';
import { Icon } from '../ui/Icon';
import styles from './AppLayout.module.css';

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

const NAV_ITEMS = [
  { to: routes.appDashboard, label: 'Dashboard' },
  { to: routes.appAssessment, label: 'Assessment' },
  { to: routes.appProjects, label: 'Website' },
  { to: routes.appBilling, label: 'Billing' },
  { to: routes.appAccount, label: 'Account' },
] as const;

export const APP_MAIN_CONTENT_ID = 'app-main-content';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
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
    <div className={styles['shell']}>
      <a href={`#${APP_MAIN_CONTENT_ID}`} className={styles['skipLink']}>
        Skip to main content
      </a>

      <header className={styles['header']}>
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
            className={[styles['nav'], menuOpen ? styles['navOpen'] : undefined]
              .filter(Boolean)
              .join(' ')}
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
                      [styles['navLink'], isActive ? styles['navLinkActive'] : undefined]
                        .filter(Boolean)
                        .join(' ')
                    }
                  >
                    {item.label}
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

      <main id={APP_MAIN_CONTENT_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
        {/*
         * Inside `<main>` so the header stays on screen while a lazy page arrives —
         * the same arrangement as `SiteLayout`, and for the same reason.
         */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>

      <footer className={styles['footer']}>
        <p>
          Need a hand? Email{' '}
          <a href={`mailto:${site.contact.supportEmail}`}>{site.contact.supportEmail}</a>
          {' — '}we reply within one business day.
        </p>
      </footer>
    </div>
  );
}
