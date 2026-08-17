import { useCallback, useRef, useState, type FormEvent } from 'react';
import { submitLead } from '../../../lib/leadCapture';
import { track } from '../../../lib/analytics';
import { useSubmitStatus, type SubmitStatus } from '../../../hooks/useSubmitStatus';
import { type InquiryType, type LeadRequest } from '@jobforge/shared';
import {
  validateBusinessName,
  validateEmail,
  validateInquiryType,
  validateName,
  validatePhone,
  validateWebsite,
  type ContactFieldErrors,
} from './contactValidation';

/*
 * The hero form's state machine.
 *
 * ## Why two steps, and why only one request
 *
 * The API takes a whole lead or nothing: name, business, email, phone and an inquiry
 * type are all required by `server/src/features/leads/lead.schema.ts`. So the two steps
 * here are progressive *disclosure*, not progressive capture — the submission happens
 * once, at the end.
 *
 * That is a deliberate trade. Splitting the ask means a visitor commits to three easy
 * fields before seeing the rest, which is the friction problem worth solving on a first
 * screen. What it does not do is rescue somebody who abandons on step two; catching
 * those would need an endpoint that accepts a partial lead, and inventing one that
 * quietly drops half-leads into a collection nobody reads would be worse than not
 * having it. If the funnel events ever show real drop-off between
 * `hero_form_step_completed` and `lead_form_submitted`, that is the moment to build it.
 */

export const HERO_STEPS = ['contact', 'qualify'] as const;

export type HeroStep = (typeof HERO_STEPS)[number];

export const HERO_FIELDS = [
  'name',
  'businessName',
  'email',
  'phone',
  'inquiryType',
  'website',
] as const;

export type HeroFieldName = (typeof HERO_FIELDS)[number];

export type HeroFormValues = Record<HeroFieldName, string>;

/** Which fields belong to which step, so validation only ever judges what was asked. */
const FIELDS_BY_STEP: Record<HeroStep, readonly HeroFieldName[]> = {
  contact: ['name', 'businessName', 'email'],
  qualify: ['phone', 'inquiryType', 'website'],
};

const VALIDATORS: Record<HeroFieldName, (value: string) => string | undefined> = {
  name: validateName,
  businessName: validateBusinessName,
  email: validateEmail,
  phone: validatePhone,
  inquiryType: validateInquiryType,
  website: validateWebsite,
};

const EMPTY_VALUES: HeroFormValues = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  inquiryType: '',
  website: '',
};

export interface UseHeroLeadFormResult {
  readonly step: HeroStep;
  readonly stepIndex: number;
  readonly values: HeroFormValues;
  readonly errors: ContactFieldErrors;
  readonly status: SubmitStatus;
  readonly honeypotValue: string;
  readonly fieldsForStep: readonly HeroFieldName[];
  setValue(field: HeroFieldName, value: string): void;
  setHoneypotValue(value: string): void;
  goBack(): void;
  handleSubmit(event: FormEvent<HTMLFormElement>): void;
  readonly errorSummaryRef: React.RefObject<HTMLDivElement | null>;
}

export function useHeroLeadForm(): UseHeroLeadFormResult {
  const [step, setStep] = useState<HeroStep>('contact');
  const [values, setValues] = useState<HeroFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<ContactFieldErrors>({});
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
  } = useSubmitStatus();

  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const hasTriedToAdvance = useRef(false);
  const hasStarted = useRef(false);

  const setValue = useCallback((field: HeroFieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));

    // One event for the whole form, on the first keystroke: this is the denominator
    // every later drop-off number is measured against.
    if (!hasStarted.current) {
      hasStarted.current = true;
      track('hero_form_started');
    }

    // Clear a field's error as it is corrected, but only after the visitor has tried to
    // move on — validating while somebody is still typing their email is nagging.
    if (hasTriedToAdvance.current) {
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
    requestAnimationFrame(() => errorSummaryRef.current?.focus());
  }, []);

  const validateStep = useCallback(
    (which: HeroStep): ContactFieldErrors => {
      const found: ContactFieldErrors = {};

      for (const field of FIELDS_BY_STEP[which]) {
        const message = VALIDATORS[field](values[field]);
        if (message) found[field] = message;
      }

      return found;
    },
    [values],
  );

  const goBack = useCallback(() => {
    setStep('contact');
    setErrors({});
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      hasTriedToAdvance.current = true;

      if (isInFlight()) return;

      const stepErrors = validateStep(step);
      if (Object.keys(stepErrors).length > 0) {
        reportErrors(stepErrors);
        return;
      }

      setErrors({});

      if (step === 'contact') {
        setStep('qualify');
        track('hero_form_step_completed');
        return;
      }

      begin();
      track('lead_form_submitted', { source: 'hero' });

      const payload: LeadRequest = {
        name: values.name.trim(),
        businessName: values.businessName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        inquiryType: values.inquiryType as InquiryType,
        ...(values.website.trim() ? { website: values.website.trim() } : {}),
        ...honeypotFields(),
      };

      void submitLead(payload).then((result) => {
        if (result.success) {
          succeed({});
          track('website_review_requested', { source: 'hero' });
          return;
        }

        // The server revalidates. If it disagrees with us, show its messages against the
        // same fields — and send the visitor back to step one if that is where the
        // disputed field lives, so they are looking at the input being complained about.
        if (result.error.code === 'VALIDATION_ERROR' && result.error.fields) {
          const serverErrors = result.error.fields as ContactFieldErrors;
          const belongsToFirstStep = FIELDS_BY_STEP.contact.some((field) => serverErrors[field]);

          toIdle();
          if (belongsToFirstStep) setStep('contact');
          reportErrors(serverErrors);
          track('lead_form_failed', { source: 'hero', reason: result.error.code });
          return;
        }

        // Values are left untouched: a failed send must never cost somebody their typing.
        fail(result.error.message);
        track('lead_form_failed', { source: 'hero', reason: result.error.code });
      });
    },
    [
      begin,
      fail,
      honeypotFields,
      isInFlight,
      reportErrors,
      succeed,
      toIdle,
      step,
      validateStep,
      values,
    ],
  );

  return {
    step,
    stepIndex: HERO_STEPS.indexOf(step),
    values,
    errors,
    status,
    honeypotValue,
    fieldsForStep: FIELDS_BY_STEP[step],
    setValue,
    setHoneypotValue,
    goBack,
    handleSubmit,
    errorSummaryRef,
  };
}
