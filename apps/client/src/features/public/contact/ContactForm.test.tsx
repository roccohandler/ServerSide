import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiResult, LeadSubmissionData } from '@jobforge/shared';
import { HONEYPOT_FIELD } from '@jobforge/shared';
import { ContactForm } from './ContactForm';

/*
 * The contact form is the only thing on this site that has to work. These tests cover
 * the four states a visitor can end up in — invalid, sent, rejected by the server, and
 * server unreachable — and assert that each one is announced accessibly.
 */

const submitLead = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/leadCapture', () => ({ submitLead }));

const accepted: ApiResult<LeadSubmissionData> = {
  success: true,
  data: { submittedAt: '2026-03-04T17:45:00.000Z' },
};

function renderForm() {
  return render(
    <MemoryRouter>
      <ContactForm />
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/your name/i), 'Dana Reyes');
  await user.type(screen.getByLabelText(/business name/i), 'Cascade Heating & Air');
  await user.type(screen.getByLabelText(/^email/i), 'dana@cascadeheating.example');
  await user.type(screen.getByLabelText(/^phone/i), '(206) 555-0134');
  await user.type(screen.getByLabelText(/current website/i), 'cascadeheating.example');
  await user.selectOptions(screen.getByLabelText(/what do you need help with/i), 'improve-website');
}

function submitButton() {
  return screen.getByRole('button', { name: /send request/i });
}

describe('ContactForm', () => {
  beforeEach(() => {
    submitLead.mockReset();
    submitLead.mockResolvedValue(accepted);
  });

  it('labels every field so it can be filled in with a screen reader', () => {
    renderForm();

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/current website/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what do you need help with/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/anything else/i)).toBeInTheDocument();
  });

  it('tells the visitor what happens after they send it', () => {
    renderForm();

    expect(screen.getByText(/we will get back to you directly/i)).toBeInTheDocument();
  });

  describe('when required fields are missing', () => {
    it('shows an accessible error summary and does not call the API', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());

      const summary = await screen.findByRole('alert');
      expect(within(summary).getByText(/please enter your name/i)).toBeInTheDocument();
      expect(within(summary).getByText(/please enter your business name/i)).toBeInTheDocument();
      expect(within(summary).getByText(/please enter your email address/i)).toBeInTheDocument();
      expect(within(summary).getByText(/please enter a phone number/i)).toBeInTheDocument();
      expect(within(summary).getByText(/choose what you need help with/i)).toBeInTheDocument();

      expect(submitLead).not.toHaveBeenCalled();
    });

    it('moves focus to the summary so the problem is announced', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());

      await waitFor(() => expect(screen.getByRole('alert')).toHaveFocus());
    });

    it('marks the offending inputs as invalid and describes why', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());

      const nameInput = await screen.findByLabelText(/your name/i);
      expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      // The message is linked to the input, not just floating next to it.
      expect(nameInput).toHaveAccessibleDescription(/please enter your name/i);
    });

    it('clears a field error once the visitor corrects it', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.click(submitButton());
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      await user.type(screen.getByLabelText(/your name/i), 'Dana Reyes');

      await waitFor(() =>
        expect(screen.queryByText(/please enter your name/i)).not.toBeInTheDocument(),
      );
    });

    it('rejects an email address that could not be delivered to', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillValidForm(user);
      await user.clear(screen.getByLabelText(/^email/i));
      await user.type(screen.getByLabelText(/^email/i), 'dana@@example');
      await user.click(submitButton());

      const summary = await screen.findByRole('alert');
      expect(within(summary).getByText(/valid email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toHaveAccessibleDescription(/valid email address/i);
      expect(submitLead).not.toHaveBeenCalled();
    });

    it('accepts a phone number typed the way people actually type them', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillValidForm(user);
      await user.click(submitButton());

      await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1));
    });
  });

  describe('when the submission succeeds', () => {
    it('sends the trimmed values and confirms receipt', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillValidForm(user);
      await user.type(screen.getByLabelText(/anything else/i), '  Site is slow on phones.  ');
      await user.click(submitButton());

      await waitFor(() =>
        expect(submitLead).toHaveBeenCalledWith({
          name: 'Dana Reyes',
          businessName: 'Cascade Heating & Air',
          email: 'dana@cascadeheating.example',
          phone: '(206) 555-0134',
          website: 'cascadeheating.example',
          inquiryType: 'improve-website',
          message: 'Site is slow on phones.',
        }),
      );

      expect(await screen.findByRole('status')).toHaveTextContent(/message sent/i);
      expect(screen.queryByRole('button', { name: /send request/i })).not.toBeInTheDocument();
    });

    it('omits optional fields that were left blank', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/your name/i), 'Dana Reyes');
      await user.type(screen.getByLabelText(/business name/i), 'Cascade Heating');
      await user.type(screen.getByLabelText(/^email/i), 'dana@example.com');
      await user.type(screen.getByLabelText(/^phone/i), '2065550134');
      await user.selectOptions(screen.getByLabelText(/what do you need help with/i), 'not-sure');
      await user.click(submitButton());

      await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1));
      const payload = submitLead.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(payload).not.toHaveProperty('website');
      expect(payload).not.toHaveProperty('message');
    });

    it('shows a pending state and blocks a second submission while in flight', async () => {
      const user = userEvent.setup();
      let release: (value: ApiResult<LeadSubmissionData>) => void = () => {};
      submitLead.mockReturnValue(
        new Promise<ApiResult<LeadSubmissionData>>((resolve) => {
          release = resolve;
        }),
      );

      renderForm();
      await fillValidForm(user);
      await user.click(submitButton());

      /*
       * Announced as unavailable and busy, but still focusable — see the `loading` note in
       * `Button.tsx`. This assertion used to be `toBeDisabled()`, and that was the bug: a
       * native disabled button drops out of the tab order the moment it becomes disabled,
       * so pressing Enter to submit sent the keyboard user back to the top of the page.
       */
      const pending = await screen.findByRole('button', { name: /sending/i });
      expect(pending).toHaveAttribute('aria-disabled', 'true');
      expect(pending).toHaveAttribute('aria-busy', 'true');
      expect(pending).not.toBeDisabled();

      /* Still not fireable, which is what `disabled` had been doing for free. */
      await user.click(pending);
      expect(submitLead).toHaveBeenCalledTimes(1);

      release(accepted);
      expect(await screen.findByRole('status')).toBeInTheDocument();
      expect(submitLead).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the server rejects the submission', () => {
    it('shows the server-side field errors against the right inputs', async () => {
      const user = userEvent.setup();
      submitLead.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields and try again.',
          fields: { email: 'Please enter a valid email address.' },
        },
      });

      renderForm();
      await fillValidForm(user);
      await user.click(submitButton());

      const summary = await screen.findByRole('alert');
      expect(within(summary).getByText(/valid email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toHaveAttribute('aria-invalid', 'true');
      // The form is still there to correct, not replaced by a dead end.
      expect(submitButton()).toBeInTheDocument();
    });

    it('offers the phone number and email when the server fails', async () => {
      const user = userEvent.setup();
      submitLead.mockResolvedValue({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong on our end. Please try again, or call or email us.',
        },
      });

      renderForm();
      await fillValidForm(user);
      await user.click(submitButton());

      const failure = await screen.findByRole('alert');
      expect(failure).toHaveTextContent(/did not send/i);
      expect(failure).toHaveTextContent(/something went wrong on our end/i);
      expect(submitButton()).toBeInTheDocument();
    });

    it('explains a network failure without blaming the visitor', async () => {
      const user = userEvent.setup();
      submitLead.mockResolvedValue({
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'We could not reach the server. Check your connection and try again.',
        },
      });

      renderForm();
      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);
    });

    it('surfaces the rate limit message rather than a generic failure', async () => {
      const user = userEvent.setup();
      submitLead.mockResolvedValue({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many submissions from this connection. Please wait a few minutes.',
        },
      });

      renderForm();
      await fillValidForm(user);
      await user.click(submitButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(/too many submissions/i);
    });
  });

  describe('the honeypot', () => {
    it('is present but hidden from assistive technology and the tab order', () => {
      const { container } = renderForm();
      const honeypot = container.querySelector<HTMLInputElement>(`#${HONEYPOT_FIELD}`);

      expect(honeypot).not.toBeNull();
      expect(honeypot).toHaveAttribute('tabindex', '-1');
      expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
      // A real visitor never sees it, so it must not appear in the accessibility tree
      // alongside the fields they are meant to fill in.
      const exposedInputIds = screen.getAllByRole('textbox').map((input) => input.id);
      expect(exposedInputIds).not.toContain(HONEYPOT_FIELD);
    });

    it('is sent to the server when something fills it in', async () => {
      const user = userEvent.setup();
      const { container } = renderForm();

      await fillValidForm(user);
      const honeypot = container.querySelector<HTMLInputElement>(`#${HONEYPOT_FIELD}`);
      if (!honeypot) throw new Error('honeypot input is missing');
      await user.type(honeypot, 'http://spam.example');
      await user.click(submitButton());

      await waitFor(() =>
        expect(submitLead).toHaveBeenCalledWith(
          expect.objectContaining({ [HONEYPOT_FIELD]: 'http://spam.example' }),
        ),
      );
    });

    it('is left out of the payload when a real person submits', async () => {
      const user = userEvent.setup();
      renderForm();

      await fillValidForm(user);
      await user.click(submitButton());

      await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1));
      expect(submitLead.mock.calls[0]?.[0]).not.toHaveProperty(HONEYPOT_FIELD);
    });
  });

  /*
   * The guard against a second send, which lives in `useSubmitStatus` and is shared by
   * every form on the site.
   *
   * The disabled button covers the visitor who clicks twice slowly. It does not cover two
   * submissions raised before React has re-rendered — an Enter key and a click arriving
   * together, or an assistive tool replaying the event — because the old guard read
   * `status.kind` from state, and state is a render behind. Both submissions saw `idle`
   * and both sent, which is a duplicate lead in the owner's inbox. The guard is now a ref,
   * read at the moment the question is asked, and this dispatches the two events inside a
   * single `act` to hold that failure down.
   */
  it('sends one lead when two submissions are raised before a re-render', async () => {
    const user = userEvent.setup();
    submitLead.mockReturnValue(new Promise(() => {}));

    const { container } = renderForm();
    await fillValidForm(user);

    const form = container.querySelector('form');
    if (!form) throw new Error('the contact form is missing');

    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(submitLead).toHaveBeenCalledTimes(1);
  });

  /*
   * The context a reader carries in with them. "Request this build" on the pricing card
   * links here with `?intent=build`; somebody who has already said what they want must
   * never have to say it twice — and an unknown value must never break the form.
   */
  describe('the intent parameter', () => {
    it('pre-selects the inquiry for a reader who chose the build', () => {
      render(
        <MemoryRouter initialEntries={['/contact?intent=build#request']}>
          <ContactForm />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText(/what do you need help with/i)).toHaveValue('new-website');
    });

    it('ignores an intent it does not recognise', () => {
      render(
        <MemoryRouter initialEntries={['/contact?intent=nonsense']}>
          <ContactForm />
        </MemoryRouter>,
      );

      expect(screen.getByLabelText(/what do you need help with/i)).toHaveValue('');
    });
  });
});
