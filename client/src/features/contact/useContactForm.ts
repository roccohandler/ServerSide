import { useCallback, useRef, useState, type FormEvent } from 'react';
import { submitLead } from '../../lib/api';
import { HONEYPOT_FIELD, type InquiryType, type LeadRequest } from '../../types/api';
import {
  emptyContactForm,
  validateContactForm,
  type ContactFieldErrors,
  type ContactFieldName,
  type ContactFormValues,
} from './contactValidation';

/**
 * Submission state.
 *
 * A discriminated union rather than a handful of booleans, so "submitting and also
 * succeeded" is not a state the component can accidentally render.
 */
export type ContactFormStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'succeeded' }
  | { readonly kind: 'failed'; readonly message: string };

export interface UseContactFormResult {
  readonly values: ContactFormValues;
  readonly errors: ContactFieldErrors;
  readonly status: ContactFormStatus;
  readonly honeypotValue: string;
  setValue(field: ContactFieldName, value: string): void;
  setHoneypotValue(value: string): void;
  handleSubmit(event: FormEvent<HTMLFormElement>): void;
  /** Attached to the error summary so focus can be moved to it after a failed submit. */
  readonly errorSummaryRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * All of the contact form's state, kept local to this feature.
 *
 * The application has one form and no shared client state, so there is nothing here a
 * global store would improve — it would only add a provider and an indirection.
 */
export function useContactForm(): UseContactFormResult {
  const [values, setValues] = useState<ContactFormValues>(emptyContactForm);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
  const [status, setStatus] = useState<ContactFormStatus>({ kind: 'idle' });
  const [honeypotValue, setHoneypotValue] = useState('');

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const hasSubmitted = useRef(false);

  const setValue = useCallback((field: ContactFieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));

    // Clear a field's error as soon as it is edited, but only once the visitor has
    // tried to submit — validating as someone types their email is just nagging.
    if (hasSubmitted.current) {
      setErrors((current) => {
        if (!current[field]) return current;
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }, []);

  const reportErrors = useCallback((nextErrors: ContactFieldErrors) => {
    setErrors(nextErrors);
    // Move focus to the summary so a screen reader announces the problems and a
    // keyboard user lands next to the links that jump to each field.
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      hasSubmitted.current = true;

      if (status.kind === 'submitting') return;

      const validationErrors = validateContactForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setStatus({ kind: 'idle' });
        reportErrors(validationErrors);
        return;
      }

      setErrors({});
      setStatus({ kind: 'submitting' });

      const payload: LeadRequest = {
        name: values.name.trim(),
        businessName: values.businessName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        inquiryType: values.inquiryType as InquiryType,
        ...(values.website.trim() ? { website: values.website.trim() } : {}),
        ...(values.message.trim() ? { message: values.message.trim() } : {}),
        ...(honeypotValue ? { [HONEYPOT_FIELD]: honeypotValue } : {}),
      };

      void submitLead(payload).then((result) => {
        if (result.success) {
          setStatus({ kind: 'succeeded' });
          return;
        }

        // The server revalidates; if it disagrees with us, show its messages against
        // the same fields rather than a generic failure the visitor cannot act on.
        if (result.error.code === 'VALIDATION_ERROR' && result.error.fields) {
          setStatus({ kind: 'idle' });
          reportErrors(result.error.fields as ContactFieldErrors);
          return;
        }

        setStatus({ kind: 'failed', message: result.error.message });
      });
    },
    [honeypotValue, reportErrors, status.kind, values],
  );

  return {
    values,
    errors,
    status,
    honeypotValue,
    setValue,
    setHoneypotValue,
    handleSubmit,
    errorSummaryRef,
  };
}
