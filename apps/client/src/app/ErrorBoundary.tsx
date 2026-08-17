import { Component, type ErrorInfo, type ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

/*
 * ============================================================================
 * THE LAST THING BETWEEN ONE BAD SECTION AND A BLANK SITE
 * ============================================================================
 *
 * This exists because of a real failure. `LaunchSection` read `launch.first30`, the
 * content it referenced had been renamed, and the homepage rendered *nothing at all* —
 * no header, no footer, no copy, no way to reach the contact form. A single missing
 * property on one of seventeen sections took down every route the layout wraps.
 *
 * React unmounts the whole tree when a render throws and nothing catches it. That is the
 * documented behaviour rather than a bug, and the fix is the one React prescribes: an
 * error boundary. There was none anywhere in the application.
 *
 * ## Two boundaries, at two levels, on purpose
 *
 * The one inside `SiteLayout` wraps the routed page only, so a section that throws costs
 * the visitor that page while the header, the navigation and the footer keep working —
 * they can still call, still reach the contact form, still go somewhere else. That is the
 * case that actually happened and it is the one worth surviving well.
 *
 * The one in `App` wraps everything, and it only catches a throw in the layout itself.
 * By then there is no header to preserve, so it renders a whole standalone page.
 *
 * ## What it deliberately does not do
 *
 * No error text is shown to the visitor. A stack trace is meaningless to a contractor
 * looking for a phone number, and it is the kind of thing that leaks internals into a
 * screenshot. It goes to the console, where the person who can fix it will look.
 *
 * There is no retry button. A render error is deterministic — the same props produce the
 * same throw — so a button that re-renders the same tree would fail identically and read
 * as broken twice. Reloading is offered instead, because a stale chunk after a deploy is
 * the one cause a reload genuinely fixes.
 * ============================================================================
 */

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  /**
   * `page` keeps the surrounding shell and fills the content area. `whole` paints a
   * standalone page for when the shell itself is what threw.
   */
  readonly variant?: 'page' | 'whole';
  /** Where the failure happened, for the console line. Never shown to the visitor. */
  readonly label?: string;
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    /*
     * `console.error` rather than a reporting service, because there is no reporting
     * service configured and pretending otherwise would be worse than saying so. When one
     * is added, this is the single place it hooks into.
     */
    console.error(`[${this.props.label ?? 'app'}] render failed`, error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    const whole = this.props.variant === 'whole';

    return (
      <div className={whole ? styles['whole'] : styles['page']} role="alert">
        <div className={styles['inner']}>
          <p className={styles['kicker']}>Something went wrong</p>
          <h1 className={styles['title']}>This page did not load properly.</h1>
          <p className={styles['body']}>
            That is our fault, not yours. Reloading usually fixes it — and if it does not, calling
            us still works.
          </p>

          <div className={styles['actions']}>
            <button
              type="button"
              className={styles['reload']}
              onClick={() => window.location.reload()}
            >
              Reload the page
            </button>
            {/*
             * A plain anchor rather than a router link: the router is inside the tree that
             * just failed, and asking it to navigate is asking the broken thing to fix
             * itself. A full document load is the reliable way out.
             */}
            <a className={styles['home']} href="/">
              Go to the homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
