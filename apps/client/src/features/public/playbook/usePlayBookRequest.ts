import { useCallback, useRef, useState, type FormEvent } from 'react';
import { requestPlaybook } from './services/requestPlaybook';
import { track } from '../../../lib/analytics';
import { useSubmitStatus, type SubmitStatus } from '../../../hooks/useSubmitStatus';
import { validateEmail } from '../contact/contactValidation';

/**
 * What this form's success carries beyond the fact of succeeding.
 *
 * `delivery` comes from the server and decides which confirmation is shown: whether the
 * workbook was emailed, or whether the request reached the owner who sends it. The page
 * must never guess at this — telling somebody to check an inbox nothing is filling is the
 * one failure this whole flow was designed to avoid. It is a required member of the
 * success state precisely so that guess is not expressible.
 */
export interface PlayBookDelivery {
  readonly delivery: 'sent' | 'queued';
}

export interface UsePlayBookRequestResult {
  readonly email: string;
  readonly error: string | undefined;
  readonly status: SubmitStatus<PlayBookDelivery>;
  readonly honeypotValue: string;
  setEmail(value: string): void;
  setHoneypotValue(value: string): void;
  handleSubmit(event: FormEvent<HTMLFormElement>): void;
}

/**
 * One field, one POST, and the same validator the contact form uses.
 *
 * Reusing `validateEmail` rather than writing a second rule matters more than it looks:
 * an address this form accepts and the contact form rejects would be a bug nobody would
 * think to look for.
 */
export function usePlayBookRequest(): UsePlayBookRequestResult {
  const [email, setEmailValue] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const {
    status,
    honeypotValue,
    setHoneypotValue,
    honeypotFields,
    isInFlight,
    begin,
    succeed,
    fail,
    toIdle,
  } = useSubmitStatus<PlayBookDelivery>();

  const hasSubmitted = useRef(false);

  const setEmail = useCallback((value: string) => {
    setEmailValue(value);
    // Clear the error as soon as it is edited, but only after a failed submit —
    // validating as somebody types their address is just nagging.
    if (hasSubmitted.current) setError(undefined);
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isInFlight()) return;

      hasSubmitted.current = true;

      const problem = validateEmail(email);
      if (problem) {
        setError(problem);
        return;
      }

      setError(undefined);
      begin();
      track('playbook_download_requested');

      void requestPlaybook({
        email: email.trim(),
        ...honeypotFields(),
      }).then((result) => {
        if (result.success) {
          // Defaults to the honest weaker claim if an older server omits the field.
          succeed({ delivery: result.data.delivery ?? 'queued' });
          return;
        }

        if (result.error.fields?.['email']) {
          // The server disagreed about the address itself: show it on the field, not as
          // a banner, so the fix is where the problem is.
          setError(result.error.fields['email']);
          toIdle();
          track('playbook_download_failed', { reason: result.error.code });
          return;
        }

        fail(result.error.message);
        track('playbook_download_failed', { reason: result.error.code });
      });
    },
    [begin, email, fail, honeypotFields, isInFlight, succeed, toIdle],
  );

  return {
    email,
    error,
    status,
    honeypotValue,
    setEmail,
    setHoneypotValue,
    handleSubmit,
  };
}
