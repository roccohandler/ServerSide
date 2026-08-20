import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routes } from '../../../config/routes';
import type { PublicUser } from '@jobforge/shared';
import { saveAssessmentDraft, readAssessmentDraft } from '../../assessment/draft';
import { AuthProvider } from '../../../session';
import { useAuth } from '../../../session';
import { LoginPage } from './LoginPage';
import { SignupPage } from './SignupPage';
import { ForgotPasswordPage, VerifyEmailPage } from './PasswordPages';

/*
 * ============================================================================
 * THE TWO WAYS IN, AND WHAT THEY DO WITH AN ASSESSMENT
 * ============================================================================
 *
 * Four routes into the application — sign in, sign up, and Google on either page — and
 * the property these tests pin is that all four behave identically once somebody has
 * proved who they are. In particular the assessment hand-off has to happen on all four,
 * because the whole reason the funnel asks for an account *after* the assessment is
 * that the answers survive the detour.
 *
 * A visitor who chose Google must not be the one whose twenty answers are dropped.
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

const USER: PublicUser = {
  id: 'user-1',
  email: 'dana@cascadeheating.example',
  name: 'Dana Reyes',
  role: 'customer',
  emailVerified: false,
  capabilities: ['project:read:own'],
  authProviders: ['password'],
};

const DRAFT = {
  businessName: 'Cascade Heating & Air',
  answers: [{ questionId: 'speed', category: 'speed' as const, value: 2 }],
};

const PASSPHRASE = 'a-long-enough-passphrase';

/*
 * `{ selector: 'input' }` on every password query, and it is not noise.
 *
 * A password field's label text is on two elements: the input, and the show/hide toggle
 * beside it. The toggle's accessible name names the password it reveals — "Show password:
 * Type it again" — because sign-up puts two of them on one screen and two buttons with one
 * name is a coin toss for anybody navigating by button. See `ui/Field`. So a bare
 * `getByLabelText(/type it again/i)` now matches both, and the selector says which of the
 * two an assertion is about. Always the input.
 */

/**
 * Both credential forms are stepped now, so every assertion about what happens *after*
 * submission has to walk the steps first.
 *
 * Helpers rather than the same five typed lines in fourteen tests, because the interesting
 * part of each of those tests is the assessment hand-off, the conflict message or the
 * redirect — and none of them is about the walking.
 */
async function signUp(
  user: ReturnType<typeof userEvent.setup>,
  options: { email?: string; password?: string; confirm?: string } = {},
) {
  const email = options.email ?? 'dana@cascadeheating.example';
  const password = options.password ?? PASSPHRASE;

  await user.type(screen.getByLabelText(/email address/i), email);
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  await user.type(await screen.findByLabelText(/your name/i), 'Dana Reyes');
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  await user.type(
    await screen.findByLabelText(/choose a password/i, { selector: 'input' }),
    password,
  );
  await user.type(
    screen.getByLabelText(/type it again/i, { selector: 'input' }),
    options.confirm ?? password,
  );
  await user.click(screen.getByRole('button', { name: /create my account/i }));
}

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  options: { email?: string; password?: string } = {},
) {
  await user.type(
    screen.getByLabelText(/email address/i),
    options.email ?? 'dana@cascadeheating.example',
  );
  await user.click(screen.getByRole('button', { name: /^continue$/i }));

  await user.type(await screen.findByLabelText(/^password$/i), options.password ?? PASSPHRASE);
  await user.click(screen.getByRole('button', { name: /^sign in$/i }));
}

function renderPage(Page: typeof LoginPage | typeof SignupPage, entry: string = routes.login) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuthProvider initialUser={null}>
        <Routes>
          <Route path={routes.login} element={<Page />} />
          <Route path={routes.signup} element={<Page />} />
          <Route path={routes.appDashboard} element={<h1>Dashboard</h1>} />
          <Route path="/somewhere-private" element={<h1>Somewhere private</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  for (const mock of Object.values(authApi)) mock.mockReset();
  submitAssessment.mockReset();

  authApi.fetchAuthConfig.mockResolvedValue({
    success: true,
    data: { googleEnabled: false, googleClientId: null },
  });
  authApi.fetchCurrentUser.mockResolvedValue({ success: true, data: { user: null } });
  submitAssessment.mockResolvedValue({
    success: true,
    data: { assessment: { id: 'assessment-1' }, duplicate: false },
  });

  window.sessionStorage.clear();
});

describe('the sign-in page', () => {
  it('signs somebody in and lands them on the dashboard', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(LoginPage);

    await signIn(user);

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(authApi.login).toHaveBeenCalledWith({
      email: 'dana@cascadeheating.example',
      password: 'a-long-enough-passphrase',
    });
  });

  it('shows the server’s message when the credentials are wrong', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({
      success: false,
      error: {
        code: 'UNAUTHENTICATED',
        message: 'That email address and password do not match an account.',
      },
    });

    renderPage(LoginPage);

    await signIn(user, { password: 'wrong' });

    expect(await screen.findByRole('alert')).toHaveTextContent(/do not match an account/i);
    // Still on the sign-in page.
    expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  });

  it('puts a field error against its field rather than in the summary', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        fields: { email: 'Please enter a valid email address.' },
      },
    });

    renderPage(LoginPage);

    await signIn(user, { email: 'wrong-shape@example.com' });

    const field = await screen.findByLabelText(/email address/i);
    await waitFor(() => expect(field).toHaveAccessibleDescription(/valid email address/i));
    expect(screen.queryByRole('alert')).toBeNull();

    /*
     * And the other half of that decision. Keeping the message out of the summary is only
     * right if the message reaches somebody — and a field error is wired up through
     * `aria-describedby`, which is read when the field takes focus and at no other time.
     * Without the move, the whole rejection was a red line beside an input, announced to
     * nobody: the summary branch has `role="alert"`, this branch had nothing.
     */
    expect(field).toHaveFocus();
  });

  /*
   * Signing in is two steps, and the address is the first.
   *
   * Two fields is not a burden, so the split is not about effort — it is that an address
   * is the thing that decides *how* somebody signs in. Once that question has an answer,
   * the password step can become a magic link or an SSO redirect for the accounts that
   * need one, without moving the field a password manager has already learned.
   */
  it('asks for the address first, then the password', async () => {
    const user = userEvent.setup();
    renderPage(LoginPage);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^password$/i)).toBeNull();
    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email address/i)).toBeNull();
  });

  /*
   * ==========================================================================
   * THE WAYS IN ARE OFFERED ONCE
   * ==========================================================================
   *
   * Google and the cross-link to the other credential page are both ways to *start*. Past
   * the first step they are no longer offers — pressing "Continue with Google" three
   * fields into a sign-up throws away everything typed so far, and "Already have an
   * account?" answers a question decided two screens ago.
   *
   * Asserted from the outside, on both pages, because the state lives in the form and the
   * rendering lives in the page: a test of either half alone would pass while the wiring
   * between them was broken.
   * ==========================================================================
   */
  it('offers Google and the sign-up link on the first step, and not after it', async () => {
    const user = userEvent.setup();
    authApi.fetchAuthConfig.mockResolvedValue({
      success: true,
      data: { googleEnabled: true, googleClientId: 'test-client-id' },
    });

    renderPage(LoginPage);

    expect(await screen.findByRole('link', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.getByText(/^or$/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/^password$/i);

    expect(screen.queryByRole('link', { name: /create an account/i })).toBeNull();
    /* The separator goes with what it separated — an "or" above nothing is a loose end. */
    expect(screen.queryByText(/^or$/i)).toBeNull();
  });

  /*
   * The address is echoed on the password step with a way back to it. Without that,
   * somebody whose password manager filled in the wrong saved address has no way to see
   * that is what happened — they just get told their password is wrong.
   */
  it('shows the address on the password step, with a way to change it', async () => {
    const user = userEvent.setup();
    renderPage(LoginPage);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await screen.findByLabelText(/^password$/i);
    expect(screen.getByText('dana@cascadeheating.example')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^change$/i }));

    const email = await screen.findByLabelText(/email address/i);
    expect(email).toHaveValue('dana@cascadeheating.example');
  });

  /*
   * The same address a third time, and this one is not for the reader.
   *
   * A password manager decides what to save, and what to offer next time, by looking for a
   * username field beside the password field. A stepped form has none — the email input is
   * gone by the time the password appears — so the manager sees a password with nothing to
   * file it under, and saves an entry with no username or offers nothing at all.
   */
  it('keeps the address beside the password for a password manager', async () => {
    const user = userEvent.setup();
    const { container } = renderPage(LoginPage);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/^password$/i);

    const username = container.querySelector('input[autocomplete="username"]');
    expect(username).toHaveValue('dana@cascadeheating.example');

    // For the manager only: the visible echo above is the copy people read, and this one
    // must never be somewhere a keyboard lands or a second thing to fill in.
    expect(username).toHaveAttribute('readonly');
    expect(username).toHaveAttribute('tabindex', '-1');
    expect(username).toHaveAttribute('aria-hidden', 'true');
  });

  /*
   * `disabled` on a submit button cannot hold focus, so the browser blurs it the instant
   * the request starts and focus lands on `<body>`. The keyboard user has lost their place
   * mid-submission, and the screen reader has lost the one element whose label reports
   * what is happening — so "Signing you in…" is announced to nobody, and neither is
   * whatever comes back.
   */
  it('keeps focus on the submit button while the request is in flight', async () => {
    const user = userEvent.setup();
    let settle: (value: unknown) => void = () => {};
    authApi.login.mockReturnValue(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );

    renderPage(LoginPage);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.type(await screen.findByLabelText(/^password$/i), PASSPHRASE);
    await user.click(screen.getByRole('button', { name: /^sign in$/i }));

    const busy = await screen.findByRole('button', { name: /signing you in/i });
    expect(busy).toHaveFocus();
    expect(busy).toHaveAttribute('aria-disabled', 'true');

    settle({ success: true, data: { user: USER } });
    await screen.findByRole('heading', { name: 'Dashboard' });
  });

  it('offers a show/hide toggle on the password', async () => {
    const user = userEvent.setup();
    renderPage(LoginPage);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    const password = await screen.findByLabelText(/^password$/i);
    expect(password).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(password).toHaveAttribute('type', 'text');
  });

  /*
   * A sign-in password predates whatever today's length rule is. Checking it in the
   * browser would lock somebody out of their own account with a rule their password was
   * never subject to — the server's login schema makes the same distinction.
   */
  it('does not apply the sign-up length rule to an existing password', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(LoginPage);

    await signIn(user, { password: 'short' });

    await waitFor(() =>
      expect(authApi.login).toHaveBeenCalledWith({
        email: 'dana@cascadeheating.example',
        password: 'short',
      }),
    );
  });

  it('renders the Google option', async () => {
    renderPage(LoginPage);

    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  /*
   * The reset link is on the password step, not the page.
   *
   * Offered from the moment the page loads, it is a suggestion to somebody who has not yet
   * tried to remember their password. Offered beside the password field, it is the answer
   * to the problem they are having — and it carries the address they already typed, so the
   * reset page does not ask for it twice.
   */
  it('offers the reset flow at the point somebody is stuck, carrying their address', async () => {
    const user = userEvent.setup();
    renderPage(LoginPage);

    expect(screen.queryByRole('link', { name: /forgot your password/i })).toBeNull();

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await screen.findByLabelText(/^password$/i);
    expect(screen.getByRole('link', { name: /forgot your password/i })).toHaveAttribute(
      'href',
      `${routes.forgotPassword}?email=dana%40cascadeheating.example`,
    );
  });

  it('offers the way to sign up', () => {
    renderPage(LoginPage);

    expect(screen.getByRole('link', { name: /create an account/i })).toHaveAttribute(
      'href',
      routes.signup,
    );
  });

  /*
   * The route guard stashes where somebody was going. Dropping them on the dashboard
   * instead would make every deep link into the application a two-step journey.
   */
  it('returns somebody to where they were trying to go', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ success: true, data: { user: USER } });

    render(
      <MemoryRouter
        initialEntries={[{ pathname: routes.login, state: { from: '/somewhere-private' } }]}
      >
        <AuthProvider initialUser={null}>
          <Routes>
            <Route path={routes.login} element={<LoginPage />} />
            <Route path={routes.appDashboard} element={<h1>Dashboard</h1>} />
            <Route path="/somewhere-private" element={<h1>Somewhere private</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    await signIn(user);

    expect(await screen.findByRole('heading', { name: 'Somewhere private' })).toBeInTheDocument();
  });
});

describe('the sign-up page', () => {
  it('creates an account and lands on the dashboard', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(SignupPage, routes.signup);

    await signUp(user);

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(authApi.signup).toHaveBeenCalledWith({
      email: 'dana@cascadeheating.example',
      name: 'Dana Reyes',
      password: 'a-long-enough-passphrase',
    });
  });

  /*
   * The ask, split. Four fields at once is what a visitor weighs before typing anything;
   * these two assertions are the whole point of the split, so they are pinned rather than
   * left as a property of the markup.
   */
  it('asks for the email address before anything else', () => {
    renderPage(SignupPage, routes.signup);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/your name/i)).toBeNull();
    expect(screen.queryByLabelText(/choose a password/i)).toBeNull();
    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
  });

  /*
   * The same rule as on the sign-in page, asserted here too because this is the page it was
   * found on: three steps, each carrying a divider, a Google button and a cross-link that
   * were pushing the card past the fold on a laptop — to offer choices that would have
   * discarded the answers already given. `Previous step` and `Change` are how somebody gets
   * back to them, and both stay.
   */
  it('drops the ways in once somebody has started, keeping the ways back', async () => {
    const user = userEvent.setup();
    authApi.fetchAuthConfig.mockResolvedValue({
      success: true,
      data: { googleEnabled: true, googleClientId: 'test-client-id' },
    });

    renderPage(SignupPage, routes.signup);

    expect(await screen.findByRole('link', { name: /^sign in$/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/your name/i);

    expect(screen.queryByRole('link', { name: /^sign in$/i })).toBeNull();
    expect(screen.queryByText(/^or$/i)).toBeNull();

    /* The way back is still there, and so is the legal line the account depends on. */
    expect(screen.getByRole('button', { name: /previous step/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change/i })).toBeInTheDocument();
    expect(screen.getByText(/by creating an account you agree/i)).toBeInTheDocument();
  });

  /*
   * Going back is only useful if it is non-destructive. Somebody who steps back to fix a
   * typo in their name and forward again must still have the password they chose — the
   * alternative is a form that punishes checking your own work.
   */
  it('goes back through every step without losing anything', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.type(await screen.findByLabelText(/your name/i), 'Dana Reyes');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    await user.type(
      await screen.findByLabelText(/choose a password/i, { selector: 'input' }),
      PASSPHRASE,
    );

    // Back to step two, then step one. The control is "Previous step" — the shell's own
    // Back control is on the same screen, so the two cannot share a name.
    await user.click(screen.getByRole('button', { name: /^previous step$/i }));
    expect(await screen.findByLabelText(/your name/i)).toHaveValue('Dana Reyes');

    await user.click(screen.getByRole('button', { name: /^previous step$/i }));
    expect(await screen.findByLabelText(/email address/i)).toHaveValue(
      'dana@cascadeheating.example',
    );

    // Forward again: the password typed on step three survived the round trip.
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await screen.findByLabelText(/your name/i);
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(await screen.findByLabelText(/choose a password/i, { selector: 'input' })).toHaveValue(
      PASSPHRASE,
    );
  });

  /*
   * The headline addition. A mistyped password that nobody can see is the reason a
   * confirmation field exists at all, and it must stop the submission rather than merely
   * warn about it.
   */
  it('refuses to submit when the two passwords differ', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    await signUp(user, { password: PASSPHRASE, confirm: 'a-different-passphrase' });

    expect(
      screen.getByLabelText(/type it again/i, { selector: 'input' }),
    ).toHaveAccessibleDescription(/do not match/i);
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  it('accepts the submission once they match', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(SignupPage, routes.signup);

    await signUp(user);

    await waitFor(() => expect(authApi.signup).toHaveBeenCalledTimes(1));
  });

  /*
   * Validation on blur, not only on submit. Somebody who tabs out of a field with a
   * problem should be told there and then, while the field is still the thing they are
   * thinking about.
   */
  it('reports a malformed address as soon as the field is left', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    const email = screen.getByLabelText(/email address/i);
    await user.type(email, 'dana@cascadeheating');
    await user.tab();

    expect(email).toHaveAccessibleDescription(/does not look like an email address/i);
    // And it never asked the server to decide something it could see for itself.
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  /* Both password fields can be revealed, and both start hidden. */
  it('offers a show/hide toggle on both password fields', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));
    await user.type(await screen.findByLabelText(/your name/i), 'Dana Reyes');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    const password = await screen.findByLabelText(/choose a password/i, { selector: 'input' });
    const confirm = screen.getByLabelText(/type it again/i, { selector: 'input' });
    expect(password).toHaveAttribute('type', 'password');
    expect(confirm).toHaveAttribute('type', 'password');

    const [showPassword, showConfirm] = screen.getAllByRole('button', { name: /show password/i });

    /*
     * And they are not called the same thing. Two of them are on this screen doing
     * different things, so each names the password it reveals — a button list with "Show
     * password" twice in it is a coin toss for anybody navigating by name.
     */
    expect(showPassword).toHaveAccessibleName('Show password: Choose a password');
    expect(showConfirm).toHaveAccessibleName('Show password: Type it again');

    await user.click(showPassword as HTMLElement);

    expect(password).toHaveAttribute('type', 'text');
    // Independently controlled: revealing one must not reveal the other.
    expect(confirm).toHaveAttribute('type', 'password');

    await user.click(showConfirm as HTMLElement);
    expect(confirm).toHaveAttribute('type', 'text');
  });

  it('will not move on with no address to send', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    // Still on step one and told why, rather than choosing a name and a password first and
    // finding out afterwards.
    expect(screen.getByLabelText(/email address/i)).toHaveAccessibleDescription(
      /enter your email address/i,
    );
    expect(screen.queryByLabelText(/choose a password/i)).toBeNull();
  });

  /*
   * A field the visitor cannot see is a field they cannot fix. The address is asked for on
   * step one and disputed after step two, so a disputed address comes back on screen where
   * they are — rather than being announced against nothing, or bouncing them back a step to
   * press Continue again and return to the button they had only just pressed.
   */
  it('brings the address back on screen when the server rejects it', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please check the highlighted fields.',
        fields: { email: 'Please enter a valid email address.' },
      },
    });

    renderPage(SignupPage, routes.signup);

    await signUp(user, { email: 'dana@notreally.example' });

    const field = await screen.findByLabelText(/email address/i);
    await waitFor(() => expect(field).toHaveAccessibleDescription(/valid email address/i));
    // Still on the last step: what they typed there is not thrown away to show them this.
    expect(screen.getByLabelText(/choose a password/i, { selector: 'input' })).toHaveValue(
      PASSPHRASE,
    );
  });

  /*
   * The check exists to save a round trip and a scrypt hash, not to be the rule — the
   * server's `auth.schema.ts` is still the authority. What this pins is that a short
   * password never reaches it.
   */
  it('catches a too-short password without asking the server', async () => {
    const user = userEvent.setup();
    renderPage(SignupPage, routes.signup);

    await signUp(user, { password: 'short' });

    // The server's own sentence, so the wording does not change depending on who caught
    // it. Matched on the half the field's hint does not already say.
    expect(
      screen.getByLabelText(/choose a password/i, { selector: 'input' }),
    ).toHaveAccessibleDescription(/harder to guess/i);
    expect(authApi.signup).not.toHaveBeenCalled();
  });

  it('renders the same Google option as the sign-in page', async () => {
    renderPage(SignupPage, routes.signup);

    expect(
      await screen.findByRole('button', { name: /continue with google/i }),
    ).toBeInTheDocument();
  });

  it('tells somebody their address is already registered', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'An account already exists for that email address. Sign in instead.',
      },
    });

    renderPage(SignupPage, routes.signup);

    await signUp(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/already exists/i);
  });
});

/*
 * ==========================================================================
 * SWITCHING BETWEEN THE TWO PAGES
 * ==========================================================================
 *
 * The guard sends everybody to `/login`, so somebody who does not have an account yet
 * reaches `/signup` by switching. Two things used to be dropped on the way: where they were
 * originally going, and the address they had already typed. Both are now carried by the
 * link — the first in the router's `state`, the second in `?email=`.
 * ==========================================================================
 */
describe('the switch between signing in and creating an account', () => {
  function renderBothPages(state?: { readonly from: string }) {
    return render(
      <MemoryRouter initialEntries={[{ pathname: routes.login, ...(state ? { state } : {}) }]}>
        <AuthProvider initialUser={null}>
          <Routes>
            <Route path={routes.login} element={<LoginPage />} />
            <Route path={routes.signup} element={<SignupPage />} />
            <Route path={routes.appDashboard} element={<h1>Dashboard</h1>} />
            <Route path="/somewhere-private" element={<h1>Somewhere private</h1>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  /*
   * ==========================================================================
   * THIS TEST WAS REWRITTEN, AND THE REWRITE IS THE FINDING
   * ==========================================================================
   *
   * It used to cross to `/signup`, assert the email *field* held the address, cross
   * straight back and assert the same thing. DECISION 031's auto-advance means neither
   * assertion can be made as written any more, and the reason is worth stating rather
   * than editing around:
   *
   *   - the address arrives already valid, so the form opens on step two and there is no
   *     email field on screen to read a value from. The address is on screen — as the echo
   *     with its `Change` control — which is the thing the visitor actually needs;
   *   - and the cross-link back is gone with it, because `AuthShell` drops the ways *in*
   *     once the form is past its entry step.
   *
   * **So the round trip now costs one click on `Change`.** That is the honest cost of the
   * auto-advance and it is written here rather than hidden: the visitor who crossed over
   * to *sign up* saves a click, and the one who crossed over only to *look* spends one.
   * The first is the larger group by a distance, which is why the trade was taken — but a
   * test that quietly stopped exercising the return path would have hidden the second.
   *
   * What has not changed is the thing this test exists for: the address survives both
   * crossings and is never typed twice.
   * ==========================================================================
   */
  it('carries the typed address across, and back again', async () => {
    const user = userEvent.setup();
    renderBothPages();

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('link', { name: /create an account/i }));

    expect(await screen.findByRole('heading', { name: /create an account/i })).toBeInTheDocument();

    // Step two, because the address it was seeded with is one it would have accepted.
    expect(screen.getByText(/step 2 of 3/i)).toBeInTheDocument();
    expect(screen.getByText('dana@cascadeheating.example')).toBeInTheDocument();

    // Back to the address, which is what puts the ways out on screen again.
    await user.click(screen.getByRole('button', { name: /change/i }));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('dana@cascadeheating.example');

    // And straight back to signing in: the seeded value has to survive a visitor who only
    // came to look.
    await user.click(screen.getByRole('link', { name: /^sign in$/i }));

    expect(await screen.findByRole('heading', { name: /^sign in$/i })).toBeInTheDocument();
    expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
    expect(screen.getByText('dana@cascadeheating.example')).toBeInTheDocument();
  });

  /*
   * The other half of the same behaviour, pinned separately because it is the half that
   * decides whether the auto-advance is safe: an address that would have failed step one
   * still gets step one, and its error.
   *
   * The check is `validateField` — literally the function `Continue` runs — so this cannot
   * drift from the manual path without the manual path drifting too.
   */
  it('does not skip the address step for an address it would have rejected', async () => {
    render(
      <MemoryRouter initialEntries={[`${routes.signup}?email=not-an-address`]}>
        <AuthProvider initialUser={null}>
          <Routes>
            <Route path={routes.signup} element={<SignupPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/step 1 of 3/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue('not-an-address');
  });

  /*
   * The one the visitor notices. Without `state` on the cross-link, somebody who followed a
   * deep link into the application, was sent to sign in, realised they needed an account
   * and switched was landed on the dashboard — and had to find the page again themselves.
   */
  it('still returns somebody to where they were trying to go', async () => {
    const user = userEvent.setup();
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderBothPages({ from: '/somewhere-private' });

    await user.click(screen.getByRole('link', { name: /create an account/i }));
    await screen.findByRole('heading', { name: /create an account/i });

    await signUp(user);

    expect(await screen.findByRole('heading', { name: 'Somewhere private' })).toBeInTheDocument();
  });
});

/*
 * ==========================================================================
 * THE HAND-OFF
 * ==========================================================================
 */
describe('an assessment in progress', () => {
  it('is announced on the sign-up page so nobody thinks they have lost it', () => {
    saveAssessmentDraft(DRAFT);
    renderPage(SignupPage, routes.signup);

    expect(screen.getByText(/your assessment answers are saved/i)).toBeInTheDocument();
  });

  it('is announced on the sign-in page too', () => {
    saveAssessmentDraft(DRAFT);
    renderPage(LoginPage);

    expect(screen.getByText(/your assessment answers are saved/i)).toBeInTheDocument();
  });

  it('is not announced when there is nothing waiting', () => {
    renderPage(SignupPage, routes.signup);

    expect(screen.queryByText(/your assessment answers are saved/i)).toBeNull();
  });

  it('is submitted after a sign-up, and cleared', async () => {
    const user = userEvent.setup();
    saveAssessmentDraft(DRAFT);
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(SignupPage, routes.signup);

    await signUp(user);

    await waitFor(() => expect(submitAssessment).toHaveBeenCalledTimes(1));
    expect(submitAssessment).toHaveBeenCalledWith(
      expect.objectContaining({ businessName: 'Cascade Heating & Air' }),
    );
    // No `savedAt` on the wire: it is bookkeeping, not part of the contract.
    expect(submitAssessment.mock.calls[0]?.[0]).not.toHaveProperty('savedAt');

    await waitFor(() => expect(readAssessmentDraft()).toBeNull());
  });

  it('is submitted after a sign-in', async () => {
    const user = userEvent.setup();
    saveAssessmentDraft(DRAFT);
    authApi.login.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(LoginPage);

    await signIn(user);

    await waitFor(() => expect(submitAssessment).toHaveBeenCalledTimes(1));
  });

  /*
   * The one that would rot if each page did its own hand-off. Somebody who chose Google
   * has done exactly the same thing as somebody who typed a password, and must not be
   * the one whose twenty answers are silently dropped.
   */
  it('is submitted after continuing with Google, exactly as after a password', async () => {
    saveAssessmentDraft(DRAFT);
    authApi.continueWithGoogle.mockResolvedValue({ success: true, data: { user: USER } });

    let capturedCallback: ((response: { credential?: string }) => void) | undefined;

    authApi.fetchAuthConfig.mockResolvedValue({
      success: true,
      data: { googleEnabled: true, googleClientId: 'test-client-id.apps.googleusercontent.com' },
    });

    (window as { google?: unknown }).google = {
      accounts: {
        id: {
          initialize: (config: { callback: (response: { credential?: string }) => void }) => {
            capturedCallback = config.callback;
          },
          renderButton: () => {},
        },
      },
    };

    renderPage(SignupPage, routes.signup);

    await waitFor(() => expect(capturedCallback).toBeDefined());
    capturedCallback?.({ credential: 'an.opaque.id-token' });

    await waitFor(() =>
      expect(authApi.continueWithGoogle).toHaveBeenCalledWith('an.opaque.id-token'),
    );
    await waitFor(() => expect(submitAssessment).toHaveBeenCalledTimes(1));

    delete (window as { google?: unknown }).google;
  });

  /*
   * A failed submission must not destroy the answers. The dashboard's assessment page
   * offers to send them again — see `AssessmentPage`.
   */
  it('is kept when the submission fails, so it can be retried', async () => {
    const user = userEvent.setup();
    saveAssessmentDraft(DRAFT);
    authApi.signup.mockResolvedValue({ success: true, data: { user: USER } });
    submitAssessment.mockResolvedValue({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'We could not reach the server.' },
    });

    renderPage(SignupPage, routes.signup);

    await signUp(user);

    await waitFor(() => expect(submitAssessment).toHaveBeenCalled());

    // Signed in anyway — the sign-in succeeded — and the answers survive.
    expect(readAssessmentDraft()).not.toBeNull();
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
  });

  it('submits nothing when there was no assessment', async () => {
    const user = userEvent.setup();
    authApi.login.mockResolvedValue({ success: true, data: { user: USER } });

    renderPage(LoginPage);

    await signIn(user);

    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(submitAssessment).not.toHaveBeenCalled();
  });
});

/*
 * ==========================================================================
 * THE FIFTH THING THAT CAN MAKE A BROWSER BELIEVE IT IS SIGNED IN
 * ==========================================================================
 *
 * It lives with the other four because it is the same question — what does this browser
 * now think it is? — and because the answer here is the opposite one. There are four routes
 * into the application; a link in an email is not one of them.
 *
 * `POST /api/auth/verify-email` returns a user and sets no session cookie, on purpose:
 * anybody holding the message can click the link. The client used to adopt that user
 * anyway, which forced `status: 'authenticated'` with nothing behind it — so an anonymous
 * browser was offered a dashboard, let through the route guard, and then 401ed by every
 * request the dashboard made.
 * ==========================================================================
 */
describe('the email confirmation link', () => {
  /** Reports what the application believes about this browser, so a test can assert it. */
  function AuthProbe() {
    const { status, user } = useAuth();
    return (
      <p data-testid="auth-probe">{`${status}:${user?.emailVerified ? 'verified' : 'unverified'}`}</p>
    );
  }

  function renderVerification(initialUser: PublicUser | null) {
    return render(
      <MemoryRouter initialEntries={[`${routes.verifyEmail}?token=a-single-use-token`]}>
        <AuthProvider initialUser={initialUser}>
          <AuthProbe />
          <Routes>
            <Route path={routes.verifyEmail} element={<VerifyEmailPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
  }

  beforeEach(() => {
    authApi.verifyEmail.mockResolvedValue({
      success: true,
      data: { user: { ...USER, emailVerified: true } },
    });
  });

  it('confirms the address without signing an anonymous browser in', async () => {
    renderVerification(null);

    expect(await screen.findByRole('heading', { name: /email confirmed/i })).toBeInTheDocument();

    // The response carried a user. No cookie came with it, so it is not a session.
    expect(screen.getByTestId('auth-probe')).toHaveTextContent('anonymous');
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', routes.login);
    expect(screen.queryByRole('link', { name: /dashboard/i })).toBeNull();
  });

  it('updates the session it already has, and asks the server once', async () => {
    renderVerification(USER);

    expect(await screen.findByRole('heading', { name: /email confirmed/i })).toBeInTheDocument();

    // Somebody signed in in this tab: the header and the dashboard should stop asking them
    // to confirm an address they have just confirmed.
    await waitFor(() =>
      expect(screen.getByTestId('auth-probe')).toHaveTextContent('authenticated:verified'),
    );
    expect(screen.getByRole('link', { name: /go to my dashboard/i })).toBeInTheDocument();

    // The token is single-use. Adopting the user must not re-run the request that got it.
    expect(authApi.verifyEmail).toHaveBeenCalledTimes(1);
  });

  /*
   * A link that has already been used is the common failure, not a rare one, and it is the
   * outcome somebody is least equipped to guess at.
   */
  it('announces a dead link rather than quietly rendering one', async () => {
    authApi.verifyEmail.mockResolvedValue({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'That link has already been used.' },
    });

    renderVerification(null);

    const outcome = await screen.findByRole('alert');
    expect(outcome).toHaveTextContent(/that link did not work/i);

    /*
     * ======================================================================
     * `waitFor` ON THE FOCUS, FOR THE REASON THE DASHBOARD TEST NEEDED IT
     * ======================================================================
     *
     * This read `expect(outcome).toHaveFocus()` directly after the query above, and it flaked
     * under the full suite while passing every time this file was run alone.
     *
     * The cause is an ordering rather than a slow machine, and it is the same one
     * `DashboardPage.test.tsx` hit: `findByRole` resolves the moment the alert is in the
     * document, and the focus move happens in an effect React flushes *after* that commit. On
     * an idle machine the two land in the same tick and the assertion is accidentally right.
     *
     * The assertion itself is unchanged and still matters — moving focus to the alert is the
     * only thing that tells a screen-reader user the link they followed is dead, and a
     * regression that stopped moving it would still fail here.
     * ======================================================================
     */
    await waitFor(() => {
      expect(outcome).toHaveFocus();
    });
  });
});

/*
 * ==========================================================================
 * AN OUTCOME THAT REPLACES THE FORM
 * ==========================================================================
 *
 * All three of the email-link pages answer by swapping the whole panel: the form goes,
 * "Check your inbox" arrives. On screen that is unmissable. To anybody not looking at the
 * screen it used to be nothing at all — the button they pressed was destroyed, so focus
 * fell to `<body>`, and the sentence that replaced it was ordinary text with nothing to
 * make a screen reader read it out.
 *
 * A password reset that silently succeeds cannot be told apart from one that silently
 * failed, which is why this is pinned rather than left as a property of the markup.
 * ==========================================================================
 */
describe('the panel a page swaps in when it has an answer', () => {
  it('announces a sent reset link, and leaves the reader standing on it', async () => {
    const user = userEvent.setup();
    authApi.requestPasswordReset.mockResolvedValue({ success: true, data: {} });

    render(
      <MemoryRouter initialEntries={[routes.forgotPassword]}>
        <Routes>
          <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/email address/i), 'dana@cascadeheating.example');
    await user.click(screen.getByRole('button', { name: /send me a link/i }));

    const outcome = await screen.findByRole('status');
    expect(outcome).toHaveTextContent(/check your inbox/i);
    expect(outcome).toHaveFocus();
  });
});
