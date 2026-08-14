import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

/*
 * The regression these exist for is specific and it really happened: one section read a
 * content property that had been renamed, and the *entire site* rendered blank — no
 * header, no phone number, no footer, on every route the layout wraps.
 *
 * So the property under test is not "an error is caught". It is "the rest of the page
 * survives", which is the part that was actually lost.
 */

function Boom(): never {
  throw new Error('content property was renamed');
}

/* React logs caught errors to the console by design; the noise is not a failure. */
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders its children untouched when nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>the actual page</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('the actual page')).toBeInTheDocument();
  });

  it('shows a recovery screen instead of unmounting when a child throws', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /did not load properly/i })).toBeInTheDocument();
  });

  /*
   * The whole point. A boundary that caught the error but took the header down with it
   * would leave a visitor with no phone number and no navigation — which is the failure,
   * not the fix.
   */
  it('leaves everything outside the boundary on screen', () => {
    render(
      <div>
        <header>Call 206-973-6798</header>
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
        <footer>Privacy</footer>
      </div>,
    );

    expect(screen.getByText('Call 206-973-6798')).toBeInTheDocument();
    expect(screen.getByText('Privacy')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('offers a way out that does not depend on the tree that just failed', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    // A plain anchor, not a router link — the router is inside what failed.
    expect(screen.getByRole('link', { name: /homepage/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument();
  });

  /* The visitor gets a sentence. The stack trace goes to the console. */
  it('never puts the error message on screen', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );

    expect(screen.queryByText(/content property was renamed/i)).not.toBeInTheDocument();
  });

  it('logs the failure with its label, so the console says which page broke', () => {
    render(
      <ErrorBoundary label="page /">
        <Boom />
      </ErrorBoundary>,
    );

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('page /'),
      expect.any(Error),
      expect.anything(),
    );
  });
});
