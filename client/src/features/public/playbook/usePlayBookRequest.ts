import { useCallback, useRef, useState, type FormEvent } from 'react';
import { requestPlaybook } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { HONEYPOT_FIELD } from '../../../types/api';
import { validateEmail } from '../contact/contactValidation';

/**
 * Request state.
 *
 * A discriminated union rather than three booleans, so "sending and also succeeded" is
 * not a state the component can accidentally render. Same shape as the contact form's,
 * deliberately — two forms behaving differently under failure is how one of them ends up
 * untested.
 */
export type PlayBookRequestStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  /**
   * `delivery` comes from the server and decides which confirmation is shown: whether the
   * workbook was emailed, or whether the request reached the owner who sends it. The page
   * must never guess at this — telling somebody to check an inbox nothing is filling is
   * the one failure this whole flow was designed to avoid.
   */
  | { readonly kind: 'succeeded'; readonly delivery: 'sent' | 'queued' }
  | { readonly kind: 'failed'; readonly message: string };

export interface UsePlayBookRequestResult {
  readonly email: string;
  readonly error: string | undefined;
  readonly status: PlayBookRequestStatus;
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
  const [status, setStatus] = useState<PlayBookRequestStatus>({ kind: 'idle' });
  const [honeypotValue, setHoneypotValue] = useState('');

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
      if (status.kind === 'submitting') return;

      hasSubmitted.current = true;

      const problem = validateEmail(email);
      if (problem) {
        setError(problem);
        return;
      }

      setError(undefined);
      setStatus({ kind: 'submitting' });
      track('playbook_download_requested');

      void requestPlaybook({
        email: email.trim(),
        /*
         * Only sent when it has a value. An empty string would be a legitimate-looking
         * field rather than an untouched one, and the point of the honeypot is that a
         * human never puts anything in it.
         */
        ...(honeypotValue ? { [HONEYPOT_FIELD]: honeypotValue } : {}),
      }).then((result) => {
        if (result.success) {
          // Defaults to the honest weaker claim if an older server omits the field.
          setStatus({ kind: 'succeeded', delivery: result.data.delivery ?? 'queued' });
          return;
        }

        if (result.error.fields?.['email']) {
          // The server disagreed about the address itself: show it on the field, not as
          // a banner, so the fix is where the problem is.
          setError(result.error.fields['email']);
          setStatus({ kind: 'idle' });
          track('playbook_download_failed', { reason: result.error.code });
          return;
        }

        setStatus({ kind: 'failed', message: result.error.message });
        track('playbook_download_failed', { reason: result.error.code });
      });
    },
    [email, honeypotValue, status.kind],
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
