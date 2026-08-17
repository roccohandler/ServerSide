import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import styles from './AuthShell.module.css';

/*
 * The frame both credential pages sit in.
 *
 * One component rather than two nearly-identical pages, because the hierarchy the brief
 * asks for is a property of the *page* rather than of either form:
 *
 *     email and password
 *          ── or ──
 *     continue with Google
 *
 * Keeping the divider, the heading levels and the footer link here means the two pages
 * cannot drift into presenting that choice differently.
 */

export interface AuthShellProps {
  readonly title: string;
  readonly lede: string;
  /** Rendered above the form. Used for the "your assessment is saved" reassurance. */
  readonly notice?: ReactNode;
  readonly children: ReactNode;
  /** The Google option. Always passed — see `GoogleSignInButton`. */
  readonly alternative: ReactNode;
  readonly footer: ReactNode;
  /**
   * The Terms and Privacy line. **Sign-up only.**
   *
   * It used to render on both pages, and on the sign-in page it was wrong rather than
   * merely surplus: agreeing to terms is something somebody does once, when they create an
   * account. Repeating it at every sign-in implies a new agreement is being formed each
   * time, which is not what is happening and not what the terms say.
   *
   * It also cost the sign-in card two lines on a laptop, which is what prompted the
   * question — but the reason it is gone is the first one.
   */
  readonly legal?: boolean;
}

/*
 * ----------------------------------------------------------------------------
 * NO `Section` / `Container` WRAPPER, AND THAT IS THE POINT
 * ----------------------------------------------------------------------------
 *
 * This used to render `<Section labelledBy>` inside `<Container>`. Both are marketing-page
 * primitives: `Section` paints a band with `--section-gap` above and below it, and that
 * band is meaningless here because the card is the only thing on the page.
 *
 * The cost was measured rather than guessed. `AuthLayout` centres the card in `<main>` and
 * gives it its own breathing room; the `Section` then added 48px on top of that and 88px
 * underneath, so a 608px card sat inside 232px of stacked padding and pushed a 913px
 * document into an 880px viewport. The page scrolled to show nothing.
 *
 * The heading keeps its id — the credential form is named by it.
 * ----------------------------------------------------------------------------
 */
export function AuthShell({
  title,
  lede,
  notice,
  children,
  alternative,
  footer,
  legal = false,
}: AuthShellProps) {
  return (
    <div className={styles['panelOuter']}>
      {/*
       * ==========================================================================
       * TWO BLOCKS, IN THE ORDER THEY ARE READ
       * ==========================================================================
       *
       * The pitch and the form are wrapped rather than left as seven siblings, because from
       * the `md` step they sit in two columns — see the note in the stylesheet for the
       * measurement that made that necessary.
       *
       * The DOM order is exactly what it was: heading, lede, reassurance, form, the ways in,
       * the legal line. A grid places the *columns*, never the reading order, so a screen
       * reader and the tab key meet the page in the same sequence at every width. That is
       * the reason for two wrappers and a `grid-template-columns` rather than
       * `grid-template-areas` and seven placed children, which would have let the two drift
       * apart the first time somebody reordered a row.
       * ==========================================================================
       */}
      <div className={cx(styles['panel'], styles['split'])}>
        <div className={styles['intro']}>
          <h1 id="auth-heading" className={styles['title']}>
            {title}
          </h1>
          <p className={styles['lede']}>{lede}</p>

          {notice ? <div className={styles['notice']}>{notice}</div> : null}
        </div>

        <div className={styles['action']}>
          {children}

          {/*
           * ==========================================================================
           * THE WAYS IN, AND WHY THEY LEAVE AFTER THE FIRST STEP
           * ==========================================================================
           *
           * `alternative` and `footer` are both ways to *start*: continue with Google, or go
           * to the other credential page. The pages stop passing them once the visitor has
           * typed an address and moved on, and this renders nothing rather than an empty
           * divider above an empty paragraph.
           *
           * They go because by step two they are no longer offers — they are invitations to
           * throw away the work just done. Somebody three fields into creating an account who
           * presses "Continue with Google" loses the name they typed and starts again, and
           * "Already have an account? Sign in" answers a question decided two screens ago.
           * Every well-built stepped sign-up puts the SSO option on the entry screen only,
           * for exactly this reason.
           *
           * It is also what stops the card scrolling on a laptop: the divider, the Google
           * button and the cross-link are about 150px that steps two and three were spending
           * on choices nobody could still make. `Previous step` and `Change` are how somebody
           * gets back to them.
           * ==========================================================================
           */}
          {alternative ? (
            <>
              {/*
               * A real separator rather than a styled line: a screen reader reaching this
               * point should be told the two options are alternatives, not a sequence.
               */}
              <div className={styles['divider']} role="separator" aria-orientation="horizontal">
                <span className={styles['dividerLabel']}>or</span>
              </div>

              {alternative}
            </>
          ) : null}

          {footer ? <p className={styles['footer']}>{footer}</p> : null}

          {/*
           * From the routes config rather than string literals, so renaming a legal page
           * cannot leave a dead link on the one page that is required to carry it.
           */}
          {legal ? (
            <p className={styles['legal']}>
              By creating an account you agree to our <Link to={routes.terms}>Terms</Link> and{' '}
              <Link to={routes.privacy}>Privacy</Link> notice.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
