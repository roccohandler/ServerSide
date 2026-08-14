import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '../config/routes';
import type { PublicUser } from '../types/api';
import { AuthProvider } from '../features/auth/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { WorkspaceBar } from '../components/layout/WorkspaceBar';

/*
 * ============================================================================
 * THE PUBLIC / PRIVATE BOUNDARY
 * ============================================================================
 *
 * These exist because of a real failure found by using the application: pressing "start
 * the assessment" on the dashboard silently dropped a signed-in customer onto the public
 * marketing page. The workspace navigation vanished, the page began selling them a
 * website they had already bought, and there was no obvious way back to their project.
 *
 * Three properties fix it, and all three are pinned here:
 *
 *   1. **Nothing inside the workspace links out of it by accident.** Enforced by
 *      reading the source, because the failure was one link out of dozens and the next
 *      one will be too.
 *   2. **Leaving is deliberate.** An explicit control that says where it goes.
 *   3. **Coming back is obvious.** A signed-in bar on every public page.
 * ============================================================================
 */

vi.mock('../features/auth/api/authApi', () => ({
  fetchCurrentUser: vi.fn(),
  logout: vi.fn().mockResolvedValue({ success: true, data: { signedOut: true } }),
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

/*
 * ==========================================================================
 * 1. NOTHING INSIDE THE WORKSPACE LINKS OUT OF IT BY ACCIDENT
 * ==========================================================================
 *
 * A source sweep rather than a render, because the property is about *every* link in
 * the private application and mounting all of them with plausible data would test a
 * fraction of them while looking thorough.
 *
 * The rule: no file under `features/private` may reference a public route constant,
 * except through the small allow-list below. Each exemption is a link that genuinely
 * should leave — and having to add one is the point, because it makes the decision
 * visible in a diff.
 * ==========================================================================
 */
describe('links inside the customer workspace', () => {
  /** Public route keys a private page may legitimately point at, and why. */
  const ALLOWED_PUBLIC_LINKS = new Map<string, string>([
    [
      'home',
      'the explicit "view the public site" exit in AppLayout, and the destination after signing out',
    ],
    ['forgotPassword', 'the account page sends a Google-only account there to set a password'],
    ['privacy', 'a legal notice a customer is entitled to reach from anywhere'],
    ['terms', 'a legal notice a customer is entitled to reach from anywhere'],
  ]);

  /** Every key in the route table that is not part of the private application. */
  const PUBLIC_ROUTE_KEYS = Object.keys(routes).filter((key) => !key.startsWith('app'));

  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.tsx?$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : [];
    });
  }

  /**
   * The file's code, without its prose.
   *
   * The comments in these files explain *why* they must not link to `routes.audit`, and
   * a sweep that read them would report every explanation as a violation. The rule is
   * about what the code does.
   */
  function codeOf(file: string): string {
    return readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
  }

  it('never point at a public page except the ones deliberately allowed', () => {
    const offences: string[] = [];

    for (const file of sourceFiles(join(import.meta.dirname, '..', 'features', 'private'))) {
      const source = codeOf(file);

      for (const key of PUBLIC_ROUTE_KEYS) {
        if (!new RegExp(`routes\\.${key}\\b`).test(source)) continue;
        if (ALLOWED_PUBLIC_LINKS.has(key)) continue;

        offences.push(`${file.split(/[\\/]/).pop()} links to routes.${key}`);
      }
    }

    expect(
      offences,
      'A link from the customer workspace to a public page takes their navigation away ' +
        'mid-task. Either point it at the private equivalent, or add the route to ' +
        'ALLOWED_PUBLIC_LINKS above with the reason.',
    ).toEqual([]);
  });

  /*
   * The specific link that caused this. The assessment has a private copy; the public
   * one is for anonymous visitors and sells a website to whoever is reading it.
   */
  it('send a signed-in customer to the private assessment, never to /audit', () => {
    const files = sourceFiles(join(import.meta.dirname, '..', 'features', 'private'));
    const linkingToAudit = files
      .filter((file) => /routes\.audit\b/.test(codeOf(file)))
      .map((file) => file.split(/[\\/]/).pop());

    expect(linkingToAudit).toEqual([]);
    expect(routes.appAssessmentStart).toBe('/app/assessment/start');
  });

  /*
   * The same rule for the server, which writes the dashboard's one call to action. An
   * href chosen there is followed from inside the workspace exactly like any other.
   */
  it('are matched by the server, which writes the dashboard action', () => {
    const currentAction = readFileSync(
      join(
        import.meta.dirname,
        '..',
        '..',
        '..',
        'server',
        'src',
        'features',
        'dashboard',
        'currentAction.ts',
      ),
      'utf8',
    );

    // Every href it can return, pulled out of the source.
    const hrefs = [...currentAction.matchAll(/href: '([^']+)'/g)].map(
      (match) => match[1] as string,
    );

    expect(hrefs.length, 'no hrefs found — currentAction.ts was restructured').toBeGreaterThan(0);

    for (const href of hrefs) {
      // `/app/...` is the workspace; a full URL is the customer's own live website,
      // which is the one destination outside it that makes sense to offer.
      expect(
        href.startsWith('/app/') || href.startsWith('http'),
        `the dashboard offers "${href}", which leaves the workspace`,
      ).toBe(true);
    }
  });
});

/*
 * ==========================================================================
 * 2. LEAVING IS DELIBERATE
 * ==========================================================================
 */
describe('leaving the workspace', () => {
  function renderWorkspace() {
    return render(
      <MemoryRouter initialEntries={[routes.appDashboard]}>
        <AuthProvider initialUser={CUSTOMER}>
          <Routes>
            <Route path={routes.appDashboard} element={<AppLayout />}>
              <Route index element={<h1>Dashboard</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('is offered explicitly, and says where it goes', () => {
    renderWorkspace();

    const exit = screen.getByRole('link', { name: /view the public site/i });
    expect(exit).toHaveAttribute('href', routes.home);
  });

  it('is not the same control as signing out', () => {
    renderWorkspace();

    expect(screen.getByRole('link', { name: /view the public site/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

/*
 * ==========================================================================
 * 3. COMING BACK IS OBVIOUS
 * ==========================================================================
 */
describe('the way back from the public site', () => {
  function renderBar(user: PublicUser | null, entry: string) {
    return render(
      <MemoryRouter initialEntries={[entry]}>
        <AuthProvider initialUser={user}>
          <WorkspaceBar />
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  it('offers a signed-in customer the way back to their dashboard', () => {
    renderBar(CUSTOMER, routes.home);

    const back = screen.getByRole('link', { name: /back to my dashboard/i });
    expect(back).toHaveAttribute('href', routes.appDashboard);
  });

  it('says who is signed in, and that this is the public site', () => {
    const { container } = renderBar(CUSTOMER, routes.home);

    expect(within(container).getByText(/viewing the public site/i)).toBeInTheDocument();
    expect(within(container).getByText('Dana')).toBeInTheDocument();
  });

  /*
   * Most visitors are anonymous. A bar telling them about a dashboard they do not have
   * would be a permanent piece of noise above the thing the page is for.
   */
  it('shows nothing at all to an anonymous visitor', () => {
    const { container } = renderBar(null, routes.home);
    expect(container).toBeEmptyDOMElement();
  });

  /* Inside the workspace it would be pointing at the page somebody is already on. */
  it('shows nothing inside the workspace', () => {
    const { container } = renderBar(CUSTOMER, routes.appBilling);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows nothing on a deep workspace page either', () => {
    const { container } = renderBar(CUSTOMER, '/app/projects/abc123/preview');
    expect(container).toBeEmptyDOMElement();
  });

  /*
   * `/audit` is a public page a signed-in customer can genuinely end up on — from a
   * search result, a bookmark, or the site's own navigation. It is exactly where the
   * bar earns its place.
   */
  it('shows on the public assessment page, which is where this problem was found', () => {
    renderBar(CUSTOMER, routes.audit);
    expect(screen.getByRole('link', { name: /back to my dashboard/i })).toBeInTheDocument();
  });
});
