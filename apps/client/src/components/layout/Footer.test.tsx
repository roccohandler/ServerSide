import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../../config/routes';
import { site } from '../../content';
import type { PublicUser } from '@jobforge/shared';
import { AuthProvider } from '../../session';
import { Footer } from './Footer';

/*
 * ============================================================================
 * THE ONE ACCOUNT ENTRY IN THE FOOTER
 * ============================================================================
 *
 * `content.test.ts` already asserts everything else about this component: that every
 * `footerNav` destination is a real route, that every route is either linked or
 * deliberately unlinked, that the industry pages are all reachable from every page. None
 * of that is repeated here.
 *
 * What is here is the entry DECISION 031 added and the two rules it has to keep, because
 * both of them are the kind that break silently:
 *
 *   1. **It is not in `site.footerNav`.** That list drives this column *and*
 *      `sitemap.xml`, and `/signup` is `noindex` — a sign-in form in a search result is a
 *      result nobody wanted. The link and the indexed page are different things.
 *   2. **It changes with the session.** Offering "Create an account" to somebody who has
 *      one is the footer telling a customer it does not know who they are.
 *
 * The reason it exists at all is a width: the header's account strip is `display: none`
 * below 64rem, so on a phone the pair is inside a menu nobody has opened. This is the one
 * surface that carries the same thing at every width with no click.
 * ============================================================================
 */

vi.mock('../../session/authApi', () => ({
  fetchCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

const CUSTOMER: PublicUser = {
  id: 'user-1',
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  role: 'customer',
  emailVerified: true,
  capabilities: [],
  authProviders: ['password'],
};

function renderFooter({ signedIn = false }: { signedIn?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <AuthProvider initialUser={signedIn ? CUSTOMER : null}>
        <Footer />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('the footer account entry', () => {
  it('offers a way to create an account at the bottom of every page', () => {
    renderFooter();

    expect(screen.getByRole('link', { name: /^create an account$/i })).toHaveAttribute(
      'href',
      routes.signup,
    );
  });

  it('offers the dashboard instead once somebody has one', () => {
    renderFooter({ signedIn: true });

    expect(screen.getByRole('link', { name: /^dashboard$/i })).toHaveAttribute(
      'href',
      routes.appDashboard,
    );
    expect(screen.queryByRole('link', { name: /^create an account$/i })).toBeNull();
  });

  /*
   * The rule that would be broken by the obvious refactor. Somebody tidying this up will
   * reach for `site.footerNav` — it is the list the rest of the column comes from — and
   * that puts a `noindex` credential page into the sitemap.
   */
  it('keeps the account pages out of the navigation content, and therefore out of the sitemap', () => {
    const destinations = site.footerNav.map((item) => item.to);

    expect(destinations).not.toContain(routes.signup);
    expect(destinations).not.toContain(routes.login);
    expect(destinations).not.toContain(routes.appDashboard);
  });

  /*
   * One entry, not a column. The note in `content.test.ts` refuses a footer full of
   * account links and that refusal survives DECISION 031 intact — this is what enforces
   * the difference between narrowing a rule and abandoning it.
   */
  it('adds one account link and not a set of them', () => {
    renderFooter();

    for (const name of [/sign in/i, /forgot/i, /reset/i, /verify/i]) {
      expect(screen.queryByRole('link', { name })).toBeNull();
    }
  });
});
