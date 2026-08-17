import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@jobforge/ui';
import { routes } from '../config/routes';
import { OfflineNotice } from '../components/OfflineNotice';
import { ThemeControl } from '../components/ThemeControl';
import { ReauthDialog } from '../session/ReauthDialog';
import { useAdminSession } from '../session/useAdminSession';
import styles from './ConsoleLayout.module.css';

export const CONSOLE_MAIN_ID = 'console-main';

/*
 * ============================================================================
 * THE SHELL EVERY SIGNED-IN VIEW RENDERS INSIDE
 * ============================================================================
 *
 * Deliberately plain, and deliberately charcoal. This is a tool the owner opens twenty
 * times a day, so it is built to be scanned rather than admired: one row of destinations,
 * who is signed in, and a way out. Nothing animates and nothing hides behind a menu.
 *
 * ## What is not here
 *
 * **No "view as customer".** Impersonation is the single most dangerous feature an admin
 * surface can have — it produces actions in an audit log attributed to somebody who did not
 * perform them, and it makes every customer-facing bug reproducible only by someone holding
 * the keys to every account. If it is ever built it needs its own design: a separate,
 * explicitly read-only session, an entry in the activity log naming the staff member, and a
 * banner the customer's data cannot remove. Not now, and not as a shortcut.
 *
 * **No link to the owner's own workspace.** It used to be here, back when the console and
 * the customer application were one bundle and a `<Link>` reached both. They are two origins
 * now, so that link would be a hard-coded URL to another host — configuration this app does
 * not otherwise need, for a journey the owner makes by typing the address they already know.
 *
 * **No Stripe controls.** Refunds, checkout links and subscription changes live behind
 * `BILLING_ADMIN_TOKEN` and are operated with curl. Putting them here would mean shipping
 * that token to a browser, and re-implementing the decisions around them in React would put
 * a second copy of the payment rules in the least trustworthy place.
 *
 * ## What was missing, and why it was missing
 *
 * A skip link, a focusable `<main>` and a focus move on every route change. `SiteLayout` and
 * `AppLayout` have all three and each explains itself at length; this layout was written
 * fresh when the console became its own bundle, and none of that reasoning came with it.
 * Nothing decided against them — a comment in another application cannot fail a build here,
 * which is why `app/a11y.test.ts` now does.
 *
 * The skip link matters more here than on the marketing site, not less: every console screen
 * puts three navigation destinations and a sign-out control ahead of the content, on a tool
 * somebody opens twenty times a day.
 * ============================================================================
 */

const DESTINATIONS = [
  { to: routes.inbox, label: 'Inbox', end: true },
  { to: routes.projects, label: 'Projects', end: false },
  { to: routes.accounts, label: 'Accounts', end: false },
  { to: routes.assessments, label: 'Assessments', end: false },
  /*
   * Last, because it is the one that should usually be empty. Onboarding submissions match
   * their project by address on arrival; this is where the ones that did not go, and every
   * row on it is a paying client whose materials are attached to nothing.
   */
  { to: routes.onboarding, label: 'Onboarding', end: false },
] as const;

export function ConsoleLayout() {
  const { state, signOut } = useAdminSession();
  const identity = state.status === 'signedIn' ? state.identity : null;

  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  /*
   * The route-change behaviour both of the customer application's layouts own, and for the
   * same reason: a single-page application does not reload the document, so without this a
   * screen-reader user hears nothing to say the page changed and keyboard focus stays on the
   * navigation link they just left — which on this layout means tabbing back through three
   * destinations and a sign-out button to reach the content they asked for.
   *
   * Skipped on first paint. The browser has already positioned the document, and taking
   * focus before anybody has done anything is disorienting.
   */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className={styles['shell']}>
      <a href={`#${CONSOLE_MAIN_ID}`} className={styles['skipLink']}>
        Skip to main content
      </a>

      <header className={styles['bar']} data-print="hide">
        <div className={styles['barInner']}>
          <div className={styles['identity']}>
            {/*
             * "Internal" rather than the business name. The name is on every other surface;
             * what this bar has to communicate is that the data below belongs to other people.
             */}
            <span className={styles['mark']}>Internal</span>
            <span className={styles['who']}>{identity?.email}</span>
          </div>

          <nav className={styles['nav']} aria-label="Internal sections">
            {DESTINATIONS.map((destination) => (
              <NavLink
                key={destination.to}
                to={destination.to}
                end={destination.end}
                className={({ isActive }) =>
                  isActive ? `${styles['navLink']} ${styles['navLinkActive']}` : styles['navLink']
                }
              >
                {destination.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles['barTools']}>
            <ThemeControl />
            <Button type="button" variant="secondary" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/*
       * `tabIndex={-1}` so the effect above can move focus here. `global.css` suppresses the
       * outline on a programmatically focused element, so this does not paint a ring on
       * every navigation — see the `[tabindex='-1']:focus` rule there.
       */}
      {/*
       * The session ending must not take the console with it. Renders nothing until
       * `reauthNeeded` goes up — see the note in `session/AdminSession.tsx`.
       */}
      <ReauthDialog />

      <main id={CONSOLE_MAIN_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
        {/*
         * Above the routed screen, so it is the first thing read on a console that has
         * stopped working. Renders nothing while the browser has a network.
         */}
        <OfflineNotice />
        <Outlet />
      </main>
    </div>
  );
}
