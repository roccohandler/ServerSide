import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { heroForm } from '../../content';
import type { ApiResult, LeadSubmissionData } from '../../types/api';
import { HeroLeadForm } from './HeroLeadForm';

/*
 * The hero form is the shortest path from a stranger to a lead, so every state it can
 * reach is covered here: invalid, advanced, sent, rejected by the server, and server
 * unreachable.
 *
 * Two of these matter more than the rest. A visitor must never lose what they typed
 * because a request failed, and the two-step split must never let an incomplete lead
 * reach the API — the server would reject it, and the visitor would be told off for
 * something the form should have caught.
 */

const submitLead = vi.hoisted(() => vi.fn());

vi.mock('../../lib/api', () => ({ submitLead }));

const accepted: ApiResult<LeadSubmissionData> = {
  success: true,
  data: { submittedAt: '2026-08-09T17:45:00.000Z' },
};

function renderForm() {
  return render(
    <MemoryRouter>
      <HeroLeadForm />
    </MemoryRouter>,
  );
}

async function completeFirstStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), 'Dana');
  await user.type(screen.getByLabelText(/business name/i), 'Cascade Heating & Air');
  await user.type(screen.getByLabelText(/^email/i), 'dana@cascadeheating.example');
  await user.click(screen.getByRole('button', { name: /continue/i }));
}

async function completeSecondStep(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('radio', { name: /manage the website i have/i }));
  await user.type(screen.getByLabelText(/^phone/i), '(206) 555-0134');
  /*
   * Read from the content layer rather than typed here. The submit label is deliberately
   * a variable — it has already moved from "review" to "assessment" once — and a test
   * pinning the wording fails for the wrong reason every time somebody tests a new one.
   */
  await user.click(screen.getByRole('button', { name: heroForm.submit.idle }));
}

describe('HeroLeadForm', () => {
  beforeEach(() => {
    submitLead.mockReset();
    submitLead.mockResolvedValue(accepted);
  });

  it('asks for three things, each with a real label and the right autocomplete', () => {
    renderForm();

    const first = screen.getByLabelText(/first name/i);
    const business = screen.getByLabelText(/business name/i);
    const email = screen.getByLabelText(/^email/i);

    expect(first).toHaveAttribute('autocomplete', 'given-name');
    expect(business).toHaveAttribute('autocomplete', 'organization');
    expect(email).toHaveAttribute('autocomplete', 'email');
    expect(email).toHaveAttribute('type', 'email');

    // Nothing from the second step is on screen yet: that is the whole point.
    expect(screen.queryByLabelText(/^phone/i)).not.toBeInTheDocument();
  });

  it('says how short it is before anybody starts', () => {
    renderForm();

    expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
  });

  describe('when the first step is incomplete', () => {
    it('explains what to fix and does not advance or call the API', async () => {
      const user = userEvent.setup();
      renderForm();

      await user.type(screen.getByLabelText(/^email/i), 'not-an-address');
      await user.click(screen.getByRole('button', { name: /continue/i }));

      const summary = await screen.findByRole('alert');
      expect(within(summary).getByText(/enter your name/i)).toBeInTheDocument();
      expect(within(summary).getByText(/valid email address/i)).toBeInTheDocument();

      expect(screen.getByText(/step 1 of 2/i)).toBeInTheDocument();
      expect(submitLead).not.toHaveBeenCalled();
    });
  });

  describe('when the first step is complete', () => {
    it('moves to the qualification step without submitting anything', async () => {
      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);

      expect(screen.getByText(/step 2 of 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^phone/i)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /manage the website i have/i })).toBeInTheDocument();
      expect(submitLead).not.toHaveBeenCalled();
    });

    it('keeps what was already typed when the visitor goes back', async () => {
      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);
      await user.click(screen.getByRole('button', { name: /back/i }));

      expect(screen.getByLabelText(/first name/i)).toHaveValue('Dana');
      expect(screen.getByLabelText(/business name/i)).toHaveValue('Cascade Heating & Air');
    });
  });

  describe('when the whole form is complete', () => {
    it('sends one request carrying both steps', async () => {
      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);
      await user.type(screen.getByLabelText(/your website/i), 'cascadeheating.example');
      await completeSecondStep(user);

      await waitFor(() => expect(submitLead).toHaveBeenCalledTimes(1));

      expect(submitLead).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dana',
          businessName: 'Cascade Heating & Air',
          email: 'dana@cascadeheating.example',
          phone: '(206) 555-0134',
          inquiryType: 'manage-website',
          website: 'cascadeheating.example',
        }),
      );
    });

    it('confirms it landed, and offers somewhere to go next', async () => {
      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);
      await completeSecondStep(user);

      const result = await screen.findByRole('status');
      expect(within(result).getByText(/you're in/i)).toBeInTheDocument();
      expect(
        within(result).getByRole('link', { name: /how the service works/i }),
      ).toBeInTheDocument();
    });
  });

  describe('when the server rejects the submission', () => {
    it('shows the field it complained about, back on the step that owns it', async () => {
      submitLead.mockResolvedValue({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Please check the highlighted fields and try again.',
          fields: { email: 'Please enter a valid email address.' },
        },
      });

      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);
      await completeSecondStep(user);

      // Email belongs to step one, so that is where the visitor is put.
      expect(await screen.findByText(/step 1 of 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^email/i)).toHaveValue('dana@cascadeheating.example');
    });
  });

  describe('when the request never lands', () => {
    it('says so plainly and keeps every answer', async () => {
      submitLead.mockResolvedValue({
        success: false,
        error: { code: 'NETWORK_ERROR', message: 'We could not reach the server.' },
      });

      const user = userEvent.setup();
      renderForm();

      await completeFirstStep(user);
      await completeSecondStep(user);

      const alert = await screen.findByRole('alert');
      expect(within(alert).getByText(/did not send/i)).toBeInTheDocument();

      // Nothing is lost, and the form is still there to try again with.
      expect(screen.getByLabelText(/^phone/i)).toHaveValue('(206) 555-0134');
      expect(screen.getByRole('radio', { name: /manage the website i have/i })).toBeChecked();
    });
  });
});
