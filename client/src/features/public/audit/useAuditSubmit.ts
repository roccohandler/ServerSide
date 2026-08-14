import { useCallback, useRef, useState } from 'react';
import { submitLead } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { HONEYPOT_FIELD, INQUIRY_TYPES, type LeadRequest } from '../../../types/api';
import {
  orderErrors,
  validateBusinessName,
  validateEmail,
  validateName,
  validatePhone,
  validateWebsite,
} from '../contact/contactValidation';
import { renderAuditSummary, type AuditSummaryInput } from './auditSummary';

/*
 * Submitting a completed audit.
 *
 * Every validator here is imported from `features/contact/contactValidation` rather than
 * rewritten. Those are exported individually precisely so a second form can compose the
 * same rules — `usePlayBookRequest` already reuses `validateEmail` the same way — and a
 * second copy of "what counts as a phone number" is how two forms end up disagreeing
 * about a real customer's number.
 *
 * The submitted `inquiryType` is `improve-website`, which is the existing slug that
 * actually describes somebody who has just scored their own site and found five problems
 * with it. No new slug is introduced: that list is a cross-workspace contract pinned by
 * mirrored tests in both workspaces, and adding to it for a label would be five files of
 * churn for no behaviour.
 */

const AUDIT_INQUIRY_TYPE = INQUIRY_TYPES[1];

export type AuditSubmitStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'succeeded' }
  | { readonly kind: 'failed'; readonly message: string };

export interface AuditContactValues {
  readonly name: string;
  readonly businessName: string;
  readonly email: string;
  readonly phone: string;
  readonly website: string;
}

export type AuditContactField = keyof AuditContactValues;

const EMPTY: AuditContactValues = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  website: '',
};

const VALIDATORS: Record<AuditContactField, (value: string) => string | undefined> = {
  name: validateName,
  businessName: validateBusinessName,
  email: validateEmail,
  phone: validatePhone,
  website: validateWebsite,
};

export interface AuditFieldError {
  readonly field: AuditContactField;
  readonly message: string;
}

export interface UseAuditSubmitResult {
  readonly values: AuditContactValues;
  readonly errors: Readonly<Partial<Record<AuditContactField, string>>>;
  /** In form order, so the summary reads the way the page does. */
  readonly errorOrder: readonly AuditFieldError[];
  readonly status: AuditSubmitStatus;
  readonly honeypotValue: string;
  /** Focused when a submission fails validation — see `AuditSend`. */
  readonly errorSummaryRef: React.RefObject<HTMLDivElement | null>;
  setValue(field: AuditContactField, value: string): void;
  setHoneypotValue(value: string): void;
  handleSubmit(event: React.FormEvent<HTMLFormElement>): void;
}

export function useAuditSubmit(audit: AuditSummaryInput): UseAuditSubmitResult {
  const [values, setValues] = useState<AuditContactValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<AuditContactField, string>>>({});
  const [status, setStatus] = useState<AuditSubmitStatus>({ kind: 'idle' });

  /*
   * The honeypot, which this form was the only one on the site to be missing.
   *
   * Every other lead path — the contact form and the hero form — renders an off-screen
   * field that a human never sees and a form-filling bot obligingly completes, and
   * `lead.service.ts` silently drops anything that arrives with it set. Without it the
   * audit was the one unguarded door into the owner's inbox, and the one most worth
   * spamming: it is linked from the main navigation and from all five industry pages.
   */
  const [honeypotValue, setHoneypotValue] = useState('');

  const errorSummaryRef = useRef<HTMLDivElement>(null);

  /*
   * Errors only start clearing as somebody types *after* a failed attempt. Clearing them
   * on the first keystroke of a form nobody has submitted yet means the summary vanishes
   * while the visitor is still reading it.
   */
  const hasSubmitted = useRef(false);

  const setValue = useCallback((field: AuditContactField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (!hasSubmitted.current) return;
    setErrors((current) => ({ ...current, [field]: VALIDATORS[field](value) }));
  }, []);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status.kind === 'submitting') return;

      hasSubmitted.current = true;

      const next: Partial<Record<AuditContactField, string>> = {};
      for (const field of Object.keys(VALIDATORS) as AuditContactField[]) {
        const error = VALIDATORS[field](values[field]);
        if (error) next[field] = error;
      }

      setErrors(next);

      if (Object.keys(next).length > 0) {
        /*
         * Move focus to the summary so a keyboard or screen-reader user is told what went
         * wrong, rather than left on a button that appeared to do nothing. Deferred by a
         * frame because the summary does not exist until this state change has rendered.
         */
        requestAnimationFrame(() => errorSummaryRef.current?.focus());
        return;
      }

      setStatus({ kind: 'submitting' });
      track('audit_submitted', { trade: audit.trade ?? 'unspecified', score: audit.total });

      const website = values.website.trim();
      const payload: LeadRequest = {
        name: values.name.trim(),
        businessName: values.businessName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        inquiryType: AUDIT_INQUIRY_TYPE,
        message: renderAuditSummary(audit),
        ...(website ? { website } : {}),
        ...(honeypotValue ? { [HONEYPOT_FIELD]: honeypotValue } : {}),
      };

      void submitLead(payload).then((result) => {
        if (result.success) {
          setStatus({ kind: 'succeeded' });
          track('website_review_requested', { source: 'audit' });
          return;
        }

        /*
         * A per-field rejection from the server is shown against the same input the
         * browser validated, so the visitor is never told "something went wrong" about a
         * field they can see and fix.
         */
        const fields = result.error.fields;
        if (fields) {
          const mapped: Partial<Record<AuditContactField, string>> = {};
          for (const field of Object.keys(VALIDATORS) as AuditContactField[]) {
            const message = fields[field];
            if (message) mapped[field] = message;
          }

          if (Object.keys(mapped).length > 0) {
            setErrors(mapped);
            setStatus({ kind: 'idle' });
            return;
          }
        }

        setStatus({ kind: 'failed', message: result.error.message });
        track('lead_form_failed', { reason: result.error.code, source: 'audit' });
      });
    },
    [audit, honeypotValue, status.kind, values],
  );

  /*
   * `orderErrors` sorts by the shared contact-form field order and is typed over the full
   * contact field set, two members of which this form does not have. The narrowing filter
   * keeps the ordering behaviour while making the result honest about which fields can
   * actually appear in it.
   */
  const errorOrder = orderErrors(errors).filter(
    (entry): entry is AuditFieldError => entry.field in VALIDATORS,
  );

  return {
    values,
    errors,
    errorOrder,
    status,
    honeypotValue,
    errorSummaryRef,
    setValue,
    setHoneypotValue,
    handleSubmit,
  };
}
