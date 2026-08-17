import { useCallback, useRef, useState } from 'react';
import { HONEYPOT_FIELD } from '@jobforge/shared';

/*
 * ============================================================================
 * THE THREE THINGS EVERY SUBMITTING FORM ON THIS SITE DOES
 * ============================================================================
 *
 * Five forms post to the API: the contact form, the hero form, the audit, the playbook
 * request and the welcome onboarding form. They ask for completely different things and
 * validate them in completely different ways — and all five had hand-written copies of the
 * same three mechanics:
 *
 *   1. **A four-state union**, so "submitting and also succeeded" is not a state a
 *      component can accidentally render.
 *   2. **A guard against double submission**, because a second click during a slow
 *      request sends a second lead.
 *   3. **The honeypot field**, which is only ever added to a payload when it has a value.
 *
 * This is those three things once. It is emphatically **not a form framework**: it holds
 * no values, no field list, no validators, no schema and no submit pipeline. Each form
 * keeps its own shape, its own rules and its own analytics, because those are the parts
 * that genuinely differ and a configurable version of them would be harder to read than
 * the five copies it replaced.
 *
 * ## Why the guard is a ref and not `status.kind === 'submitting'`
 *
 * That was the original spelling, and it has two problems. State is a render behind, so
 * two submits dispatched in the same tick both pass. And it forces `status.kind` into the
 * dependency array of every `handleSubmit`, which rebuilds the callback on a transition
 * that has nothing to do with what the callback closes over. A ref is read at call time,
 * which is when the question is actually being asked.
 *
 * ## Why `begin()` is separate from the guard
 *
 * Every form checks "am I already sending?" *before* validating, and enters the
 * submitting state *after* validation passes. Collapsing the two would either leave a
 * form stuck on "submitting" after a validation failure, or move the focus of an error
 * summary while a request is in flight. They are two moments, so they are two calls.
 * ============================================================================
 */

/**
 * @template TSucceeded Extra fields a success carries. Most forms carry none, which is
 *                      what the `object` default means. The playbook request carries the
 *                      server's `delivery` verdict, and it is required rather than
 *                      optional there precisely so that page cannot guess it.
 */
export type SubmitStatus<TSucceeded = object> =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | ({ readonly kind: 'succeeded' } & TSucceeded)
  | { readonly kind: 'failed'; readonly message: string };

export interface SubmitControls<TSucceeded = object> {
  readonly status: SubmitStatus<TSucceeded>;
  readonly honeypotValue: string;
  setHoneypotValue(value: string): void;
  /**
   * The honeypot as request-payload fields — `{}` when untouched, which is every human.
   * An empty string would arrive at the server as a filled-in field rather than an
   * untouched one, and the whole point of the trap is that a person never sets it.
   */
  honeypotFields(): { readonly [HONEYPOT_FIELD]?: string };
  /** Read at the top of a submit handler, before validation. */
  isInFlight(): boolean;
  /** Enter the submitting state. Call once the form has decided it has something to send. */
  begin(): void;
  succeed(result: TSucceeded): void;
  fail(message: string): void;
  /**
   * Back to idle without a banner — for a server rejection that belongs against a field.
   * The form shows the message on the input; a page-level failure as well would be the
   * same problem reported twice.
   */
  toIdle(): void;
}

export function useSubmitStatus<TSucceeded = object>(): SubmitControls<TSucceeded> {
  const [status, setStatus] = useState<SubmitStatus<TSucceeded>>({ kind: 'idle' });
  const [honeypotValue, setHoneypotValue] = useState('');
  const inFlight = useRef(false);

  const isInFlight = useCallback(() => inFlight.current, []);

  const begin = useCallback(() => {
    inFlight.current = true;
    setStatus({ kind: 'submitting' });
  }, []);

  const succeed = useCallback((result: TSucceeded) => {
    inFlight.current = false;
    /*
     * TypeScript cannot verify that spreading an unresolved generic produces
     * `{ kind: 'succeeded' } & TSucceeded`, though it does. The assertion is contained to
     * this line, and `succeed`'s parameter type is what actually guarantees the shape.
     */
    setStatus({ kind: 'succeeded', ...result } as SubmitStatus<TSucceeded>);
  }, []);

  const fail = useCallback((message: string) => {
    inFlight.current = false;
    setStatus({ kind: 'failed', message });
  }, []);

  const toIdle = useCallback(() => {
    inFlight.current = false;
    setStatus({ kind: 'idle' });
  }, []);

  const honeypotFields = useCallback(
    () => (honeypotValue ? { [HONEYPOT_FIELD]: honeypotValue } : {}),
    [honeypotValue],
  );

  return {
    status,
    honeypotValue,
    setHoneypotValue,
    honeypotFields,
    isInFlight,
    begin,
    succeed,
    fail,
    toIdle,
  };
}
