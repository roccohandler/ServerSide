import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PublicUser } from '@jobforge/shared';
import { routes } from '../../../config/routes';
import { AuthProvider } from '../../../session';
import { RequestAssessmentPage } from './RequestAssessmentPage';
import type * as Analytics from '../../../lib/analytics';

/*
 * ============================================================================
 * THE SECOND HALF OF THE ASK
 * ============================================================================
 *
 * The account already exists, so what this page is *for* is the four things it does not
 * answer. The properties worth pinning are therefore about what it does **not** send as
 * much as what it does: a page that asked for a name and an email address again would make
 * the account somebody just created look pointless, and would be sending identity in a
 * request body the server refuses on principle.
 * ============================================================================
 */

const submitAssessmentRequest = vi.fn();

vi.mock('../services/appApi', () => ({
  submitAssessmentRequest: (...args: unknown[]) => submitAssessmentRequest(...args),
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
  businessName: 'Cascade Heating & Air',
  role: 'customer',
  emailVerified: true,
  capabilities: ['project:read:own'],
  authProviders: ['password'],
};

function renderPage(user: PublicUser | null = USER) {
  return render(
    <MemoryRouter initialEntries={[routes.appAssessmentRequest]}>
      <AuthProvider initialUser={user}>
        <Routes>
          <Route path={routes.appAssessmentRequest} element={<RequestAssessmentPage />} />
          <Route path={routes.appAssessmentStart} element={<h1>Scorecard</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

async function fillAndSend(
  user: ReturnType<typeof userEvent.setup>,
  options: { phone?: string } = {},
) {
  await user.type(
    screen.getByLabelText(/a number we can reach you on/i),
    options.phone ?? '2065550142',
  );
  await user.selectOptions(
    screen.getByLabelText(/what would you like us to look at/i),
    'improve-website',
  );
  await user.click(screen.getByRole('button', { name: /send my request/i }));
}

beforeEach(() => {
  submitAssessmentRequest.mockReset();
  track.mockReset();
  submitAssessmentRequest.mockResolvedValue({
    success: true,
    data: { submittedAt: '2026-08-14T00:00:00.000Z' },
  });
});

describe('the assessment request step', () => {
  it('never asks for a name or an email address again', () => {
    renderPage();

    expect(screen.queryByLabelText(/your name/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it('prefills the business from the account rather than asking for it twice', () => {
    renderPage();

    expect(screen.getByLabelText(/which business is this for/i)).toHaveValue(
      'Cascade Heating & Air',
    );
  });

  it('still asks for the business when the account has none', () => {
    /* It is optional at signup, and a review with no business attached cannot be filed. */
    const { businessName: _unused, ...withoutBusiness } = USER;
    renderPage(withoutBusiness);

    expect(screen.getByLabelText(/which business is this for/i)).toHaveValue('');
  });

  it('sends only the four outstanding answers', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSend(user);

    expect(submitAssessmentRequest).toHaveBeenCalledWith({
      businessName: 'Cascade Heating & Air',
      phone: '2065550142',
      inquiryType: 'improve-website',
    });

    /*
     * The property the endpoint's safety rests on, asserted from this side too: nothing
     * about who is sending it is in the body. The server would refuse it — its schema is a
     * `strictObject` with no identity fields — but a client that tried would be a client
     * somebody had to notice.
     */
    const [submission] = submitAssessmentRequest.mock.calls[0] as [Record<string, unknown>];
    expect(submission['name']).toBeUndefined();
    expect(submission['email']).toBeUndefined();
    expect(submission['userId']).toBeUndefined();
  });

  it('reports the conversion under the same name every other form uses', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSend(user);

    /* Not a fourth name for one conversion — see `lib/analytics.ts`. */
    expect(track).toHaveBeenCalledWith('website_review_requested', {
      source: 'app',
      inquiryType: 'improve-website',
    });
  });

  it('confirms rather than leaving somebody looking at the form they just sent', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSend(user);

    expect(await screen.findByRole('heading', { name: /that is with us/i })).toBeInTheDocument();
    /* The scorecard is offered here and not before: now it does not compete with the ask. */
    expect(screen.getByRole('button', { name: /score my website/i })).toBeInTheDocument();
  });

  it('catches a phone number nobody could ring before sending anything', async () => {
    const user = userEvent.setup();
    renderPage();

    await fillAndSend(user, { phone: '12' });

    expect(await screen.findByText(/including the area code/i)).toBeInTheDocument();
    expect(submitAssessmentRequest).not.toHaveBeenCalled();
  });

  it('keeps what was typed when the send fails', async () => {
    const user = userEvent.setup();
    submitAssessmentRequest.mockResolvedValue({
      success: false,
      error: { code: 'SERVICE_UNAVAILABLE', message: 'We could not reach our records.' },
    });

    renderPage();
    await fillAndSend(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach our records/i);
    /* A failed send must never cost somebody their typing. */
    expect(screen.getByLabelText(/a number we can reach you on/i)).toHaveValue('2065550142');
  });
});
