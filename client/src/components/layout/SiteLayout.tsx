import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { Header } from './Header';
import { PlaceholderNotice } from './PlaceholderNotice';
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
  const { pathname } = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip on first paint: the browser has already positioned the document, and
    // stealing focus before the visitor has done anything is disorienting.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    mainRef.current?.focus();
  }, [pathname]);

  return (
    <div className={styles['shell']}>
      <a href={`#${MAIN_CONTENT_ID}`} className={styles['skipLink']}>
        Skip to main content
      </a>

      <PlaceholderNotice />
      <Header />

      <main id={MAIN_CONTENT_ID} className={styles['main']} ref={mainRef} tabIndex={-1}>
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
