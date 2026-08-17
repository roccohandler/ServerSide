import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../config/routes';
import { primaryCta, site } from '../../content';
import { AuthProvider } from '../../session';
import { Header } from './Header';

/*
 * `logout` is the only thing in here that reaches the network, and it is the one the
 * sign-out tests are about. `fetchCurrentUser` is stubbed alongside it and never called —
 * every render below supplies `initialUser`, which is what stops the provider fetching.
 */
const logout = vi.fn();

vi.mock('../../session/authApi', () => ({
  fetchCurrentUser: vi.fn(),
  logout: (...args: unknown[]) => logout(...args),
}));

beforeEach(() => {
  logout.mockReset();
  logout.mockResolvedValue({ success: true, data: { signedOut: true } });
});

/*
 * The header is the only thing on every page, so it is the only thing that can be
 * relied on to offer a way forward. These tests pin the three jobs it has: show where
 * else to go, make the primary action obvious, and stay usable from a keyboard.
 */

/**
 * `initialUser` is passed on purpose.
 *
 * Without it the provider fetches `/api/auth/me` on mount, which in jsdom is an
 * unhandled network call that resolves after the assertions have run. Supplying the
 * answer up front keeps these tests about the header rather than about the session, and
 * `signedIn` is what lets the one assertion that *is* about the session exercise both.
 */
function renderHeader({ signedIn = false }: { signedIn?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <AuthProvider
        initialUser={
          signedIn
            ? {
                id: 'user-1',
                email: 'dana@cascadeheating.example',
                name: 'Dana Reyes',
                role: 'customer',
                emailVerified: true,
                capabilities: [],
                authProviders: ['password'],
              }
            : null
        }
      >
        <Header />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Header', () => {
  /*
   * The mobile copy of the navigation is behind `hidden` while the menu is closed, which
   * is why only one link per destination is reachable here — a closed menu must not be
   * announced to a screen reader as a second set of links.
   */
  it('points every navigation item at its route', () => {
    renderHeader();

    for (const item of site.nav) {
      const link = screen.getByRole('link', { name: item.label });
      expect(link).toHaveAttribute('href', item.to);
    }
  });

  /*
   * The nav used to carry a "Contact" link pointing at exactly where the call-to-action
   * button goes. Two links to one destination, one of them dressed as an ordinary word,
   * is a weaker ask than one — so the button is the only route to it from up here.
   */
  it('keeps the primary action out of the ordinary navigation', () => {
    renderHeader();

    /*
     * The header uses `cta.navLabel` — a shorter wording of the same action. The full
     * label was wrapping onto two lines in a bar that also holds five nav items, a phone
     * number and the brand, which made the button the largest object on the screen.
     */
    const actions = screen.getAllByRole('link', { name: site.cta.navLabel });
    expect(actions.length).toBeGreaterThanOrEqual(1);
    for (const action of actions) expect(action).toHaveAttribute('href', primaryCta.to);

    expect(site.nav.map((item) => item.to)).not.toContain(primaryCta.to);
  });

  /*
   * The short label exists for one reason. If it ever stops being shorter, it has stopped
   * having a reason, and two wordings of one action is how they drift into two offers.
   */
  it('uses a genuinely shorter label than the full call to action', () => {
    expect(site.cta.navLabel.length).toBeLessThan(primaryCta.label.length);
    expect(site.cta.navLabel).toBeTruthy();
  });

  /*
   * Every action used to live inside the collapsed menu, which meant a visitor on a
   * phone saw no way to act until they opened it.
   */
  it('puts a call button in the bar rather than behind the menu', () => {
    renderHeader();

    // The desktop header shows the number itself; this one is the compact bar button.
    const call = screen.getByText('Call', { selector: 'span' }).closest('a');

    expect(call).toBeInTheDocument();
    expect(call).toHaveAttribute('href', expect.stringContaining('tel:'));
    expect(call).toHaveAccessibleName(new RegExp(`call ${site.contact.phone}`, 'i'));
  });

  describe('the mobile menu', () => {
    it('announces whether it is open, and opens on click', async () => {
      const user = userEvent.setup();
      renderHeader();

      const toggle = screen.getByRole('button', { name: /menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggle);

      const opened = screen.getByRole('button', { name: /close/i });
      expect(opened).toHaveAttribute('aria-expanded', 'true');

      const menu = screen.getByRole('navigation', { name: /main \(mobile\)/i });
      expect(within(menu).getAllByRole('link').length).toBe(site.nav.length);
    });

    it('closes on Escape and hands focus back to the control that opened it', async () => {
      const user = userEvent.setup();
      renderHeader();

      await user.click(screen.getByRole('button', { name: /menu/i }));
      await user.keyboard('{Escape}');

      const toggle = screen.getByRole('button', { name: /menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveFocus();
    });
  });
  /*
   * ==========================================================================
   * THE WAY BACK IN
   * ==========================================================================
   *
   * The header is the only place on the marketing site that offers a signed-in customer
   * a way back to their project. It changes with the session rather than always saying
   * "Sign in", because a customer mid-build who lands on the homepage should not have to
   * remember a URL — and it stays a quiet text link either way, because ember is
   * rationed to the one primary action and a second button competing for it would cost
   * the site the conversion it is built around.
   * ==========================================================================
   */
  describe('the account link', () => {
    it('offers a way to sign in when nobody is', () => {
      renderHeader();

      const link = screen.getAllByRole('link', { name: /^sign in$/i })[0];
      expect(link).toHaveAttribute('href', routes.login);
    });

    it('offers the dashboard when somebody is signed in', () => {
      renderHeader({ signedIn: true });

      const link = screen.getAllByRole('link', { name: /^dashboard$/i })[0];
      expect(link).toHaveAttribute('href', routes.appDashboard);
      expect(screen.queryByRole('link', { name: /^sign in$/i })).toBeNull();
    });

    it('never competes with the primary action for the accent', () => {
      renderHeader();

      // The primary call to action is the only button-styled link in the header.
      const signIn = screen.getAllByRole('link', { name: /^sign in$/i })[0];
      expect(signIn?.className).not.toContain('navCta');
    });
  });

  /*
   * ==========================================================================
   * THE OTHER HALF OF THE PAIR — DECISION 031
   * ==========================================================================
   *
   * `Sign in` sat here alone from the day the utility strip was built. The site had a
   * returning-customer door and no new-customer door beside it, and the only way to make
   * an account was the ember button — which says "Get my free website assessment" and is
   * therefore, correctly, read as not-for-me by anybody who does not want an assessment.
   *
   * `content.test.ts` justified `/signup` as "linked from the header" the entire time.
   * These tests are what makes that sentence true and what will notice if it stops being.
   * ==========================================================================
   */
  describe('creating an account', () => {
    it('offers a way to create one, beside the way back in', () => {
      renderHeader();

      const create = screen.getAllByRole('link', { name: /^create an account$/i });
      expect(create.length).toBeGreaterThanOrEqual(1);
      for (const link of create) expect(link).toHaveAttribute('href', routes.signup);
    });

    /*
     * The one that would silently regress. The utility strip is `display: none` below
     * 64rem, so on a phone this markup renders nothing at all and the collapsed menu is
     * the only copy there is — which is exactly how `Sign in` came to be built twice and
     * `Create an account` not at all.
     */
    it('builds it a second time for the collapsed menu', async () => {
      const user = userEvent.setup();
      renderHeader();

      expect(screen.getAllByRole('link', { name: /^create an account$/i })).toHaveLength(1);

      await user.click(screen.getByRole('button', { name: /menu/i }));

      const create = screen.getAllByRole('link', { name: /^create an account$/i });
      expect(create).toHaveLength(2);
      for (const link of create) expect(link).toHaveAttribute('href', routes.signup);
    });

    /*
     * The account link is not the offer, and must never start looking like it. Ember is
     * rationed to one action per screen — the whole reason the phone number and the
     * account link were moved into a strip of their own.
     */
    it('stays quiet: no accent on either half of the pair', () => {
      renderHeader();

      for (const name of [/^create an account$/i, /^sign in$/i]) {
        for (const link of screen.getAllByRole('link', { name })) {
          expect(link.className).not.toContain('navCta');
        }
      }
    });

    it('does not offer one to somebody who already has one', () => {
      renderHeader({ signedIn: true });

      expect(screen.queryByRole('link', { name: /^create an account$/i })).toBeNull();
    });
  });

  /*
   * ==========================================================================
   * THE WAY OUT
   * ==========================================================================
   *
   * There was not one. The only `Sign out` in this application lives inside `AppLayout`,
   * so a signed-in customer on the marketing site had to navigate *into* their private
   * workspace in order to leave it — on a site whose readers run businesses from a shared
   * office computer.
   * ==========================================================================
   */
  describe('signing out', () => {
    /**
     * Renders the header above a page, so "did it navigate" is a question with an answer.
     * The homepage is registered as a second route precisely because that is where
     * `AppLayout`'s sign-out goes, and this one must not.
     */
    function renderOnAPage() {
      return render(
        <MemoryRouter initialEntries={[routes.about]}>
          <AuthProvider
            initialUser={{
              id: 'user-1',
              email: 'dana@cascadeheating.example',
              name: 'Dana Reyes',
              role: 'customer',
              emailVerified: true,
              capabilities: [],
              authProviders: ['password'],
            }}
          >
            <Header />
            <Routes>
              <Route path={routes.about} element={<h1>About page</h1>} />
              <Route path={routes.home} element={<h1>Homepage</h1>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>,
      );
    }

    it('offers it beside the dashboard link, in both layouts', async () => {
      const user = userEvent.setup();
      renderHeader({ signedIn: true });

      expect(screen.getAllByRole('button', { name: /^sign out$/i })).toHaveLength(1);

      await user.click(screen.getByRole('button', { name: /menu/i }));
      expect(screen.getAllByRole('button', { name: /^sign out$/i })).toHaveLength(2);
    });

    /*
     * The decision this pins. `AppLayout` signs out and navigates home, because a private
     * page cannot stay on screen without a session. A public page can, so it does — and
     * taking somebody away from an article they were part-way through would be a cost paid
     * for nothing.
     */
    it('leaves the reader exactly where they were', async () => {
      const user = userEvent.setup();
      renderOnAPage();

      await user.click(screen.getByRole('button', { name: /^sign out$/i }));

      expect(logout).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('heading', { name: 'About page' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Homepage' })).toBeNull();
    });

    /*
     * The confirmation. There is no toast and no redirect, so the only thing that tells
     * somebody it worked is the strip changing back under their cursor — which means the
     * strip changing back is a behaviour, not a side effect.
     */
    it('turns the strip back into the way in', async () => {
      const user = userEvent.setup();
      renderOnAPage();

      await user.click(screen.getByRole('button', { name: /^sign out$/i }));

      expect(await screen.findByRole('link', { name: /^create an account$/i })).toHaveAttribute(
        'href',
        routes.signup,
      );
      expect(screen.queryByRole('button', { name: /^sign out$/i })).toBeNull();
    });

    /*
     * A plain text control with no busy state cannot show that it is working, so an
     * impatient second click is the expected behaviour rather than the unusual one. The
     * ref in `Header` is what stops it becoming a second request against a session the
     * first one has already ended.
     *
     * The never-resolving mock is the point: it holds the handler open across both
     * clicks, which is the only window in which the guard does anything.
     */
    it('does not send a second request while the first is in flight', async () => {
      const user = userEvent.setup();
      logout.mockReturnValue(new Promise(() => {}));
      renderOnAPage();

      const control = screen.getByRole('button', { name: /^sign out$/i });
      await user.click(control);
      await user.click(control);

      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});
