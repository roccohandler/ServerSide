import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '../../app/ErrorBoundary';
import { RouteFallback } from '../patterns/RouteFallback';
import { Footer } from './Footer';
import { Header } from './Header';
import { PlaceholderNotice } from './PlaceholderNotice';
import { WorkspaceBar } from './WorkspaceBar';
import styles from './SiteLayout.module.css';

export const MAIN_CONTENT_ID = 'main-content';

/**
 * The page shell: skip link, header, the routed page, footer.
 *
 * It also owns what happens on a route change. A single-page application does not
 * reload the document, so without this the browser would keep the previous page's
 * scroll position and leave keyboard focus wherever the link was — a screen reader
 * user would hear nothing to tell them the page had changed.
 */
export function SiteLayout() {
  const { pathname, hash } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on first paint: the browser has already positioned the document, and
    // stealing focus before the visitor has done anything is disorienting.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    /*
     * A link with a fragment means the visitor asked for a particular part of the new
     * page — a call to action pointing at the form, say. Scrolling them to the top
     * instead would be the router quietly ignoring the request.
     *
     * Focus moves with the scroll, so somebody on a keyboard or a screen reader arrives
     * at the form rather than merely being shown it. The target opts in by carrying
     * `tabIndex={-1}`; anything else is scrolled to without being focused.
     */
    const target = hash ? document.getElementById(hash.slice(1)) : null;

    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'start' });
      if (target.hasAttribute('tabindex')) target.focus({ preventScroll: true });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname, hash]);

  return (
    <div className={styles['shell']}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles['skipLink']}>
        Skip to main content
      </a>

      <PlaceholderNotice />
      {/*
       * Above the header, and only for somebody who is signed in: the marketing site is
       * a place a customer can legitimately be, and the way back to their workspace has
       * to be visible rather than inferred from a nav item. Renders nothing at all for
       * an anonymous visitor — see `WorkspaceBar`.
       */}
      <WorkspaceBar />
      <Header />

      <main id={MAIN_CONTENT_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
        {/*
         * The suspense boundary sits inside `<main>`, not around the router, so the
         * header and footer stay on screen while a lazy route's chunk arrives. Wrapping
         * `<Routes>` instead would unmount the whole shell for those few frames — the
         * page would flash empty on the way to the PlayBook.
         *
         * The fallback shows nothing for the first 400ms, which is the behaviour this
         * boundary already had and the reasoning it already carried: the chunk is small and
         * same-origin, it lands in a frame or two on any real connection, and a spinner that
         * appears for 30ms is more distracting than nothing at all.
         *
         * What that argument never covered is the case it is not about. On a cold cache, a
         * phone connection, or the first visit after a deploy, "nothing" lasted as long as
         * the download did — a hole between a painted header and a painted footer, which
         * reads as broken rather than as loading. `RouteFallback` keeps the fast path exactly
         * and fills the slow one.
         */}
        {/*
         * Inside `<main>`, so a section that throws costs the visitor this page and not
         * the header, the phone number and the footer with it. Keyed on the path: without
         * that, a boundary that has caught once stays caught, and every subsequent
         * navigation would render the error state for a page that is perfectly fine.
         */}
        <ErrorBoundary key={pathname} label={`page ${pathname}`}>
          <Suspense fallback={<RouteFallback label="Loading the page" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
