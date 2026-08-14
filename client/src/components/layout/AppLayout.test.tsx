import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../config/routes';
import type { PublicUser } from '../../types/api';
import { AuthProvider } from '../../features/auth/AuthContext';
import { AppLayout } from './AppLayout';

/*
 * The private shell.
 *
 * Two things are pinned here. The first is the navigation, because `content.test.ts`
 * lists the five `/app` routes as "linked from the workspace navigation" and that claim
 * has to be true somewhere — this is where.
 *
 * The second is that it is a *customer* workspace. Nothing in it may offer an admin
 * action, and no amount of conditional rendering may turn it into an admin panel: the
 * admin surface is a separate boundary behind its own middleware, and the moment a
 * customer layout starts branching on role, the two have been merged in everything but
 * name.
 */

const logout = vi.fn();

vi.mock('../../features/auth/api/authApi', () => ({
  fetchCurrentUser: vi.fn(),
  logout: (...args: unknown[]) => logout(...args),
}));

const CUSTOMER: PublicUser = {
  id: 'user-1',
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  role: 'customer',
  emailVerified: true,
  capabilities: ['project:read:own', 'billing:read:own'],
  authProviders: ['password'],
};

function renderLayout(user: PublicUser = CUSTOMER, entry: string = routes.appDashboard) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider initialUser={user}>
        <Routes>
          <Route path={routes.appDashboard} element={<AppLayout />}>
            <Route index element={<h1>Dashboard content</h1>} />
            <Route path="billing" element={<h1>Billing content</h1>} />
          </Route>
          <Route path={routes.home} element={<h1>Marketing site</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  logout.mockReset();
  logout.mockResolvedValue({ success: true, data: { signedOut: true } });
});

describe('the customer workspace', () => {
  /*
   * The claim `content.test.ts` makes about the five private routes. If a navigation
   * item is ever dropped, that route becomes an orphan and this is what says so.
   */
  it('links every private route from its navigation', () => {
    renderLayout();

    const nav = screen.getByRole('navigation', { name: /your account/i });

    for (const [label, href] of [
      ['Dashboard', routes.appDashboard],
      ['Assessment', routes.appAssessment],
      ['Website', routes.appProjects],
      ['Billing', routes.appBilling],
      ['Account', routes.appAccount],
    ] as const) {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });

  /*
   * Five items, and the reason is progressive disclosure rather than minimalism for its
   * own sake: Feedback, Tasks and Preview live inside the project they belong to. A
   * customer with one website does not need a nine-item sidebar to find it.
   */
  it('keeps the navigation to five items', () => {
    renderLayout();

    const nav = screen.getByRole('navigation', { name: /your account/i });
    const items = within(nav).getAllByRole('listitem');

    expect(items).toHaveLength(5);
  });

  it('marks the current page for a screen reader, not just visually', () => {
    renderLayout(CUSTOMER, routes.appBilling);

    const nav = screen.getByRole('navigation', { name: /your account/i });
    expect(within(nav).getByRole('link', { name: 'Billing' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('renders the routed page', () => {
    renderLayout();
    expect(screen.getByRole('heading', { name: 'Dashboard content' })).toBeInTheDocument();
  });

  it('names who is signed in', () => {
    renderLayout();
    expect(screen.getByText('Dana Reyes')).toBeInTheDocument();
  });

  it('signs out and returns to the marketing site', async () => {
    const user = userEvent.setup();
    renderLayout();

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('heading', { name: 'Marketing site' })).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * A CUSTOMER WORKSPACE IS NOT AN ADMIN PANEL
   * ==========================================================================
   *
   * The brief is explicit that admin must not be the customer application with
   * conditional rendering bolted on. This asserts the negative from the one direction a
   * test can: a staff account signed into the *customer* surface sees the customer
   * surface, unchanged. Admin lives behind its own routes and its own middleware.
   * ==========================================================================
   */
  it('shows staff exactly the customer navigation, and nothing more', () => {
    renderLayout({ ...CUSTOMER, role: 'admin', capabilities: ['project:write:any'] });

    const nav = screen.getByRole('navigation', { name: /your account/i });

    expect(within(nav).getAllByRole('listitem')).toHaveLength(5);
    expect(within(nav).queryByRole('link', { name: /customers/i })).toBeNull();
    expect(within(nav).queryByRole('link', { name: /admin/i })).toBeNull();
  });

  /* ------------------------------------------------------------ accessibility */

  it('offers a skip link before anything else', () => {
    renderLayout();

    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveAttribute('href', '#app-main-content');
  });

  it('announces whether the small-screen menu is open', async () => {
    const user = userEvent.setup();
    renderLayout();

    const toggle = screen.getByRole('button', { name: /open menu/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', 'app-navigation');

    await user.click(toggle);

    expect(screen.getByRole('button', { name: /close menu/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('gives the support address somewhere to be found', () => {
    renderLayout();

    const support = screen.getByRole('link', { name: /@/ });
    expect(support).toHaveAttribute('href', expect.stringContaining('mailto:'));
  });
});
