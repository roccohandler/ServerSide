import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
export function AuthShell({ title, lede, notice, children, alternative, footer }: AuthShellProps) {
  return (
    <div className={styles['panelOuter']}>
      <div className={styles['panel']}>
        <h1 id="auth-heading" className={styles['title']}>
          {title}
        </h1>
        <p className={styles['lede']}>{lede}</p>

        {notice ? <div className={styles['notice']}>{notice}</div> : null}

        {children}

        {/*
         * A real separator rather than a styled line: a screen reader reaching this
         * point should be told the two options are alternatives, not a sequence.
         */}
        <div className={styles['divider']} role="separator" aria-orientation="horizontal">
          <span className={styles['dividerLabel']}>or</span>
        </div>

        {alternative}

        <p className={styles['footer']}>{footer}</p>

        {/*
         * From the routes config rather than string literals, so renaming a legal page
         * cannot leave a dead link on the one page that is required to carry it.
         */}
        <p className={styles['legal']}>
          By continuing you agree to our <Link to={routes.terms}>Terms</Link> and{' '}
          <Link to={routes.privacy}>Privacy</Link> notice.
        </p>
      </div>
    </div>
  );
}
