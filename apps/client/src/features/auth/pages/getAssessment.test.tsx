import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../config/routes';
import { blueprint } from '../../../content/blueprint';
import { primaryCta } from '../../../content';
import type { PublicUser } from '@jobforge/shared';
import { AuthProvider } from '../../../session';
import { GetAssessmentPage } from './GetAssessmentPage';
import type * as Analytics from '../../../lib/analytics';

/*
 * ============================================================================
 * THE FRONT DOOR OF THE FUNNEL
 * ============================================================================
 *
 * `/get-my-assessment` is where every primary button on the marketing site now lands, and
 * the three properties below are the ones that make DECISION 028 worth having rather than
 * merely different from what was there before.
 *
 *   1. The button actually points here. A funnel whose first step nothing links to is a
 *      funnel with no traffic, and the failure looks like "conversion fell off a cliff".
 *   2. The account step lands on the *request*, not on the dashboard. Landing them on a
 *      dashboard makes the account feel like the thing they asked for, when it was half of
 *      it — and the four outstanding questions are the half that produces the assessment.
 *   3. There is still a way to just send a message. Putting an account in front of the
 *      primary action is only defensible with that door open, so it is asserted rather
 *      than trusted to survive the next copy edit.
 * ============================================================================
 */

const authApi = {
  fetchAuthConfig: vi.fn(),
  fetchCurrentUser: vi.fn(),
  signup: vi.fn(),
  login: vi.fn(),
  continueWithGoogle: vi.fn(),
  logout: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
};

vi.mock('../../../session/authApi', () => ({
  fetchAuthConfig: (...args: unknown[]) => authApi.fetchAuthConfig(...args),
  fetchCurrentUser: (...args: unknown[]) => authApi.fetchCurrentUser(...args),
  signup: (...args: unknown[]) => authApi.signup(...args),
  login: (...args: unknown[]) => authApi.login(...args),
  continueWithGoogle: (...args: unknown[]) => authApi.continueWithGoogle(...args),
  logout: (...args: unknown[]) => authApi.logout(...args),
  verifyEmail: (...args: unknown[]) => authApi.verifyEmail(...args),
  requestPasswordReset: (...args: unknown[]) => authApi.requestPasswordReset(...args),
}));

const submitAssessment = vi.fn();

vi.mock('../../assessment/services/assessmentApi', () => ({
  submitAssessment: (...args: unknown[]) => submitAssessment(...args),
}));

const track = vi.fn();

vi.mock('../../../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof Analytics>()),
  track: (...args: unknown[]) => track(...args),
}));

const USER: PublicUser = {
  id: 'user-1',
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  role: 'customer',
  emailVerified: false,
  capabilities: ['project:read:own'],
  authProviders: ['password'],
};

const PASSPHRASE = 'a-long-enough-passphrase';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[routes.getAssessment]}>
      <AuthProvider initialUser={null}>
        <Routes>
          <Route path={routes.getAssessment} element={<GetAssessmentPage />} />
          <Route path={routes.appAssessmentRequest} element={<h1>Request</h1>} />
          <Route path={routes.appDashboard} element={<h1>Dashboard</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

/** The three steps of the credential form, walked. See `credentialPages.test.tsx`. */
async function createAccount(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  await user.type(await screen.findByLabelText(/your name/i), 'Dana Reyes');
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  await user.type(
    await screen.findByLabelText(/choose a password/i, { selector: 'input' }),
    PASSPHRASE,
  );
  await user.type(screen.getByLabelText(/type it again/i, { selector: 'input' }), PASSPHRASE);
  await user.click(screen.getByRole('button', { name: /create my account/i }));
}

beforeEach(() => {
  for (const mock of Object.values(authApi)) mock.mockReset();
  submitAssessment.mockReset();
  track.mockReset();

  authApi.fetchAuthConfig.mockResolvedValue({
    success: true,
    data: { googleEnabled: false, googleClientId: null },
  });
  authApi.fetchCurrentUser.mockResolvedValue({ success: true, data: { user: null } });

  window.sessionStorage.clear();
});

describe('the assessment funnel front door', () => {
  /*
   * ==========================================================================
   * IT IS NO LONGER THE PRIMARY DESTINATION, AND THAT WAS A DECISION
   * ==========================================================================
   *
   * This asserted `primaryCta.to === routes.getAssessment`, and the comment said the point
   * was to force a conversation if the button were ever repointed. It did exactly that:
   * DECISION 043 moved the primary action to `/blueprint`, and this test is what made that a
   * deliberate change rather than a quiet one. A guard that fires once and usefully has paid
   * for itself.
   *
   * What it asserts now is the property that survived the move. `/get-my-assessment` is still
   * the front door of the *assessment* funnel — the offer page, indexed, reachable, and where
   * a reader who wants a person to look at their real site goes. DECISION 028's argument
   * about it is untouched; only the site-wide default moved.
   *
   * Rewritten rather than deleted, because "nothing points here any more" is precisely how a
   * page that still matters becomes unreachable.
   * ==========================================================================
   */
  it('is still the destination of the assessment offer, wherever it is offered', () => {
    /*
     * The Blueprint's handoff is the main route here now: a reader who has just been told,
     * plainly, that nobody has looked at their website is offered the thing that does. If
     * that link is ever repointed this fails, which is the same conversation the previous
     * version of this test forced.
     */
    expect(blueprint.result.handoff.cta.to).toBe(routes.getAssessment);

    /* And the site-wide primary is a real route rather than a stale one. */
    expect(Object.values(routes)).toContain(primaryCta.to);
  });

  it('says what the assessment is rather than that an account is being created', () => {
    renderPage();

    /*
     * The reason this is a page and not `/signup?intent=…`. A button reading "Get my free
     * website assessment" that lands on a heading reading "Create an account" has changed
     * the subject, and a reader who notices that reads it as a trick.
     */
    expect(
      screen.getByRole('heading', { name: /get your free website assessment/i }),
    ).toBeInTheDocument();
  });

  it('lands a new account on the request step, not on the dashboard', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage();
    await createAccount(user);

    expect(await screen.findByRole('heading', { name: 'Request' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).not.toBeInTheDocument();
  });

  it('reports the account as the funnel conversion it is', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage();

    /* The denominator, fired on arrival and once. */
    expect(track).toHaveBeenCalledWith('assessment_signup_viewed');

    await createAccount(user);

    /*
     * The number the whole change exists to create. Before it, somebody who stopped partway
     * through the contact form produced no event and no record, so "nobody wanted an
     * assessment" and "everybody gave up on the form" looked identical.
     */
    expect(track).toHaveBeenCalledWith('assessment_account_created');
  });

  it('does not report a conversion when the signup fails', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({
      success: false,
      error: { code: 'CONFLICT', message: 'An account already exists for that email address.' },
    });

    renderPage();
    await createAccount(user);

    expect(await screen.findByText(/an account already exists/i)).toBeInTheDocument();
    expect(track).not.toHaveBeenCalledWith('assessment_account_created');
  });

  it('leaves the door open for somebody who would rather just send a message', () => {
    renderPage();

    /*
     * The mitigation the whole decision rests on. Gating the primary action trades volume
     * for a record that survives abandonment, and the honest version of that trade does not
     * trap the person who only wanted to send a message.
     */
    const escape = screen.getByRole('link', { name: /send us a message instead/i });
    expect(escape.getAttribute('href')).toContain(routes.contact);
  });

  it('sends somebody who is already signed in straight to the outstanding step', () => {
    render(
      <MemoryRouter initialEntries={[routes.getAssessment]}>
        <AuthProvider initialUser={USER}>
          <Routes>
            <Route path={routes.getAssessment} element={<GetAssessmentPage />} />
            <Route path={routes.appAssessmentRequest} element={<h1>Request</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    /* Asking an existing customer to create an account is the funnel forgetting who it is
     * talking to — the same rule `AuditKeepResults` follows. */
    expect(screen.getByRole('heading', { name: 'Request' })).toBeInTheDocument();
  });
});
