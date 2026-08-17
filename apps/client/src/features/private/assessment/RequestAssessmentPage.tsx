import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, SelectField, TextAreaField, TextField } from '@jobforge/ui';
import type { ApiFailure, AssessmentRequestSubmission, InquiryType } from '@jobforge/shared';
import { routes } from '../../../config/routes';
import { inquiryOptions } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { track } from '../../../lib/analytics';
import { useAuth } from '../../../session';
import { submitAssessmentRequest } from '../services/appApi';
import { Notice } from '../../../components/patterns/Notice';
import styles from './StartAssessment.module.css';

/*
 * ============================================================================
 * `/app/assessment/request` — THE SECOND HALF OF THE ASK
 * ============================================================================
 *
 * The account exists. This is everything it does not already know, and it is deliberately
 * four fields: a number to ring, the address of the site, what they want looking at, and
 * anything they want to add. See DECISION 028 and `docs/ACCOUNT-FIRST-CAPTURE.md`.
 *
 * ## Why it does not ask for a name or an email address
 *
 * Because it already has both, and asking again would be the clearest possible signal that
 * the account they just made was pointless. The server would refuse them anyway — its schema
 * is a `strictObject` with no identity fields in it — but the reason they are absent here is
 * the first one.
 *
 * The business name **is** asked for, because it is optional at signup and a review with no
 * business attached is a review nobody can file. It is prefilled from the account when there
 * is one, so the common case is a field somebody reads rather than types.
 *
 * ## Why the errors are inline and the failure is not
 *
 * A wrong phone number is something the person can fix where they are standing. A server
 * that could not be reached is not, so it gets a message of its own with the typed values
 * left untouched — a failed send must never cost somebody their typing. Same split as the
 * contact form, deliberately.
 * ============================================================================
 */

const HEADING_ID = 'request-assessment-heading';

const FIELD_IDS = {
  businessName: 'request-business',
  phone: 'request-phone',
  website: 'request-website',
  inquiryType: 'request-inquiry',
  message: 'request-message',
} as const;

type FieldName = keyof typeof FIELD_IDS;

/** Enough digits to dial, in the server's words. Restated to save a round trip, not to decide. */
function validate(values: Record<FieldName, string>): Partial<Record<FieldName, string>> {
  const problems: Partial<Record<FieldName, string>> = {};

  if (values.businessName.trim().length === 0) {
    problems.businessName = 'Please tell us the name of your business.';
  }

  const digits = values.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    problems.phone = 'Please give a number we can reach you on, including the area code.';
  }

  if (values.inquiryType.length === 0) {
    problems.inquiryType = 'Please choose what you would like us to look at.';
  }

  return problems;
}

export function RequestAssessmentPage() {
  useDocumentMeta({
    path: routes.appAssessmentRequest,
    title: 'Request your assessment',
    description: 'The last four questions before we look at your website.',
  });

  const navigate = useNavigate();
  const { user } = useAuth();

  const [values, setValues] = useState<Record<FieldName, string>>({
    businessName: user?.businessName ?? '',
    phone: '',
    website: '',
    inquiryType: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    /* Clear a field's error as it is corrected. Nagging while somebody types is not help. */
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const problems = validate(values);
    if (Object.keys(problems).length > 0) {
      setErrors(problems);
      return;
    }

    setErrors({});
    setFailure(null);
    setBusy(true);

    const submission: AssessmentRequestSubmission = {
      businessName: values.businessName.trim(),
      phone: values.phone.trim(),
      inquiryType: values.inquiryType as InquiryType,
      ...(values.website.trim() ? { website: values.website.trim() } : {}),
      ...(values.message.trim() ? { message: values.message.trim() } : {}),
    };

    const result = await submitAssessmentRequest(submission);
    setBusy(false);

    if (result.success) {
      /*
       * The same name the hero, the contact form and the audit report the conversion by,
       * with a different `source`. Three names for one conversion produces a report nobody
       * can add up — see `lib/analytics.ts`.
       */
      track('website_review_requested', { source: 'app', inquiryType: submission.inquiryType });
      setSent(true);
      return;
    }

    /* The server revalidates. If it disagrees with us, show its messages against the same
     * fields rather than a generic failure the customer cannot act on. */
    if (result.error.code === 'VALIDATION_ERROR' && result.error.fields) {
      setErrors(result.error.fields as Partial<Record<FieldName, string>>);
      return;
    }

    setFailure(result);
  }

  if (sent) {
    return (
      <div className={styles['page']}>
        <header className={styles['header']}>
          <h1 id={HEADING_ID} className={styles['title']}>
            That is with us
          </h1>
          <p className={styles['lede']}>
            We will look at your website and come back to you within one working day. Nothing else
            is needed from you.
          </p>
        </header>

        {/*
         * The scorecard, offered here and not before.
         *
         * It genuinely makes the review better — twenty answers about their own site is
         * context no amount of looking at it from outside produces — and this is the first
         * moment it can be offered without competing with the thing they came to do.
         */}
        <section className={styles['panel']} aria-labelledby="request-next">
          <h2 id="request-next" className={styles['panelTitle']}>
            While you wait
          </h2>
          <p className={styles['lede']}>
            Score your own website against the twenty checks we use. It takes about five minutes,
            and what you answer makes the review we send back more useful.
          </p>
          <div className={styles['actions']}>
            <Button size="lg" onClick={() => navigate(routes.appAssessmentStart)}>
              Score my website
            </Button>
            <Link to={routes.appDashboard}>Back to my dashboard</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 id={HEADING_ID} className={styles['title']}>
          Where should we send your assessment?
        </h1>
        <p className={styles['lede']}>
          Four short questions and we have everything we need. We look at your website the way one
          of your customers would and tell you what is costing you calls.
        </p>
      </header>

      <section className={styles['panel']} aria-labelledby={HEADING_ID}>
        {failure ? <Notice tone="problem">{failure.error.message}</Notice> : null}

        <form onSubmit={handleSubmit} noValidate className={styles['form']}>
          <TextField
            id={FIELD_IDS.businessName}
            label="Which business is this for?"
            autoComplete="organization"
            required
            value={values.businessName}
            error={errors.businessName}
            onChange={(event) => set('businessName', event.target.value)}
          />

          <TextField
            id={FIELD_IDS.phone}
            label="A number we can reach you on"
            type="tel"
            inputMode="tel"
            hint="We ring once. If it is a bad time we email instead."
            autoComplete="tel"
            required
            value={values.phone}
            error={errors.phone}
            onChange={(event) => set('phone', event.target.value)}
          />

          <TextField
            id={FIELD_IDS.website}
            label="Your website"
            optionalLabel="optional"
            type="url"
            inputMode="url"
            placeholder="cascadeheating.example"
            hint="If you do not have one yet, leave this empty — that is a useful answer too."
            autoComplete="url"
            value={values.website}
            error={errors.website}
            onChange={(event) => set('website', event.target.value)}
          />

          <SelectField
            id={FIELD_IDS.inquiryType}
            label="What would you like us to look at?"
            placeholder="Choose one"
            options={inquiryOptions}
            required
            value={values.inquiryType}
            error={errors.inquiryType}
            onChange={(event) => set('inquiryType', event.target.value)}
          />

          <TextAreaField
            id={FIELD_IDS.message}
            label="Anything else we should know?"
            optionalLabel="optional"
            rows={4}
            maxLength={2000}
            value={values.message}
            error={errors.message}
            onChange={(event) => set('message', event.target.value)}
          />

          <div className={styles['actions']}>
            <Button type="submit" size="lg" loading={busy}>
              {busy ? 'Sending…' : 'Send my request'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
