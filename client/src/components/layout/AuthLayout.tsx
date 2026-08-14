import { Suspense, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { Logo } from '../brand/Logo';
import { Container } from '../ui/Layout';
import { Icon } from '../ui/Icon';
import { routes } from '../../config/routes';
import { site } from '../../content';
import styles from './AuthLayout.module.css';

export const AUTH_CONTENT_ID = 'auth-content';

/**
 * The shell for signing in, creating an account and resetting a password.
 *
 * ## Why these pages left `SiteLayout`
 *
 * They used to render inside it, and the note there argued that somebody signing in is
 * still on the marketing site so the header should stay. That reasoning holds for a
 * visitor browsing; it does not hold for one filling in a credential form. Every element
 * of the marketing chrome — five nav destinations, the assessment call to action, the
 * phone number, the whole footer — is an invitation to go somewhere other than the one
 * field being asked for. On a page with a single job, that is competition, not context.
 *
 * So the chrome goes and one control replaces it: a way back to where they came from.
 *
 * ## What "back" means here
 *
 * `location.key` is `'default'` only for the first entry in a history stack — a bookmark,
 * a typed URL, a link from an email. Going "back" from there leaves the site entirely,
 * which is not what the control appears to offer. In that case it becomes a link home
 * instead, so the control never does something the reader did not ask for.
 *
 * ## Why the wordmark is here, when the rest of the chrome is not
 *
 * A credential form with no branding on it is the shape a phishing page takes, and the
 * habit worth building in a customer is that the real one always says whose it is. So the
 * one thing that comes back is identity: the same lockup the header paints everywhere
 * else, linking home, on the site container so it lines up with every other page.
 *
 * ## What is deliberately kept
 *
 * The banner and `<main>` landmarks, the focus move on navigation, and the error boundary
 * keyed on the path. Losing the header must not also mean losing the things a
 * screen-reader user depends on to know where they are and that the page changed —
 * stepping between the email and password screens is a navigation, and it has to
 * announce itself.
 */
export function AuthLayout() {
  const { pathname, key } = useLocation();
  const navigate = useNavigate();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname]);

  const canGoBack = key !== 'default';

  return (
    <div className={styles['shell']}>
      {/* `header` rather than `div`: with the site header gone, this is the banner. */}
      <header className={styles['bar']}>
        <Container className={styles['barInner'] ?? ''}>
          {canGoBack ? (
            <button type="button" className={styles['back']} onClick={() => navigate(-1)}>
              <Icon name="arrow-left" size={18} />
              <span>Back</span>
            </button>
          ) : (
            /*
             * No history to return to, so the control says where it goes rather than
             * pretending to be a browser back button.
             */
            <Link to={routes.home} className={styles['back']}>
              <Icon name="arrow-left" size={18} />
              <span>
                Back<span className={styles['backLabelLong']}> to {site.name}</span>
              </span>
            </Link>
          )}

          {/*
           * The lockup names itself in its own text, so the link needs no `aria-label` —
           * and the mark inside it is `aria-hidden`, which is why `Logo` exists rather
           * than a mark and a span at every call site. See `brand/Logo`.
           */}
          <Link to={routes.home} className={styles['brand']}>
            <Logo className={styles['brandMark'] ?? ''} />
          </Link>
        </Container>
      </header>

      <main id={AUTH_CONTENT_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
        <ErrorBoundary key={pathname} label={`auth ${pathname}`}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
