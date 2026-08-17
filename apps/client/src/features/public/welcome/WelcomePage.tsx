import { useRef, useState, type FormEvent } from 'react';
import { LeaveGuard } from '../../../components/patterns/LeaveGuard';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { welcome } from '../../../content/welcome';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { useSubmitStatus } from '../../../hooks/useSubmitStatus';
import { submitOnboarding } from './services/submitOnboarding';
import { track } from '../../../lib/analytics';
import { HONEYPOT_FIELD, type OnboardingRequest } from '@jobforge/shared';
import { Button } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Honeypot, TextAreaField, TextField } from '@jobforge/ui';
import { FIELD_LIMITS } from '@jobforge/shared';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import styles from './Welcome.module.css';
import { cx } from '@jobforge/ui';

const meta = findPageMeta(routes.welcome);

/*
 * The onboarding form's state. Local to the page: it is one form, submitted once, on a
 * page only a new client ever sees.
 */
type FieldName =
  | 'businessName'
  | 'contactName'
  | 'email'
  | 'phone'
  | 'services'
  | 'serviceAreas'
  | 'website'
  | 'googleBusinessProfile'
  | 'domainAndHosting'
  | 'photosNote'
  | 'competitors'
  | 'callsToAction'
  | 'accessNotes'
  | 'anythingElse';

type FormValues = Record<FieldName, string>;

const EMPTY: FormValues = {
  businessName: '',
  contactName: '',
  email: '',
  phone: '',
  services: '',
  serviceAreas: '',
  website: '',
  googleBusinessProfile: '',
  domainAndHosting: '',
  photosNote: '',
  competitors: '',
  callsToAction: '',
  accessNotes: '',
  anythingElse: '',
};

/** The fields a build genuinely cannot start without. Everything else is optional. */
const REQUIRED: readonly { readonly field: FieldName; readonly message: string }[] = [
  { field: 'businessName', message: 'Business name is required.' },
  { field: 'contactName', message: 'Your name is required.' },
  { field: 'email', message: 'A valid email address is required.' },
  { field: 'phone', message: 'A phone number is required.' },
  { field: 'services', message: 'The services you want to be hired for are required.' },
  { field: 'serviceAreas', message: 'Your service area is required.' },
];

function validate(values: FormValues): Partial<Record<FieldName, string>> {
  const errors: Partial<Record<FieldName, string>> = {};

  for (const { field, message } of REQUIRED) {
    if (!values[field].trim()) errors[field] = message;
  }

  if (values.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) {
    errors.email = 'A valid email address is required.';
  }

  return errors;
}

/**
 * The page Stripe's checkout redirects to after a deposit.
 *
 * Two jobs, in order: say exactly what happens next, then collect the materials the
 * timeline is waiting on. The copy never confirms a payment — the browser arriving here
 * proves navigation, not money; the server's webhook is what advances payment state.
 */
export function WelcomePage() {
  useDocumentMeta(meta ?? { path: routes.welcome, title: 'Welcome', description: '' });

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});

  const {
    status,
    honeypotValue,
    setHoneypotValue,
    honeypotFields,
    isInFlight,
    begin,
    succeed,
    fail,
  } = useSubmitStatus();
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

  /*
   * Fourteen fields, filled in once, by somebody who has already paid a deposit — the most
   * expensive form on the site to lose, and it had no protection at all. A stray reload
   * halfway down it discarded everything with no warning.
   *
   * Dirty is "anything typed and nothing sent yet". It goes false on success, because
   * otherwise the confirmation screen warns about leaving a page there is nothing left to
   * lose on.
   *
   * Not persisted, deliberately. `features/assessment/draft.ts` argues that storage is for
   * one sitting and that anything read back must be revalidated whole — reasonable for
   * twenty numeric answers, and a much larger promise for fourteen free-text fields holding
   * a business's contact details on a machine that may not be theirs.
   */
  const dirty =
    status.kind !== 'succeeded' && Object.values(values).some((value) => value.trim().length > 0);

  const setValue = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isInFlight()) return;

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setErrors({});
    begin();

    /** Optional fields are omitted entirely when blank — the server treats '' as unset. */
    const optional = (field: FieldName, key: keyof OnboardingRequest) => {
      const value = values[field].trim();
      return value ? { [key]: value } : {};
    };

    const payload: OnboardingRequest = {
      businessName: values.businessName.trim(),
      contactName: values.contactName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      services: values.services.trim(),
      serviceAreas: values.serviceAreas.trim(),
      ...optional('website', 'website'),
      ...optional('googleBusinessProfile', 'googleBusinessProfile'),
      ...optional('domainAndHosting', 'domainAndHosting'),
      ...optional('photosNote', 'photosNote'),
      ...optional('competitors', 'competitors'),
      ...optional('callsToAction', 'callsToAction'),
      ...optional('accessNotes', 'accessNotes'),
      ...optional('anythingElse', 'anythingElse'),
      ...honeypotFields(),
    };

    void submitOnboarding(payload).then((result) => {
      if (result.success) {
        track('onboarding_submitted');
        succeed({});
        return;
      }
      fail(result.error.message);
    });
  };

  const { form } = welcome;
  const orderedErrors = REQUIRED.filter(({ field }) => errors[field]).map(({ field }) => ({
    field,
    message: errors[field] ?? '',
  }));

  return (
    <>
      {/* Fourteen free-text fields, none of them persisted — see the note above. */}
      <LeaveGuard dirty={dirty} />

      <Section labelledBy="welcome-heading">
        <Container>
          <SectionHeading
            id="welcome-heading"
            level={1}
            eyebrow={welcome.hero.eyebrow}
            title={welcome.hero.heading}
            lede={welcome.hero.lede}
          />
          <p className={styles['notPaidNote']}>{welcome.notPaidNote}</p>
        </Container>
      </Section>

      <Section tone="muted" labelledBy="welcome-schedule-heading">
        <Container>
          <SectionHeading id="welcome-schedule-heading" title={welcome.schedule.heading} />

          <ol className={styles['scheduleList']}>
            {welcome.schedule.steps.map((step, index) => (
              <li key={step.id} className={styles['scheduleStep']}>
                <span className={styles['scheduleNumber']} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles['scheduleTitle']}>{step.title}</h3>
                <p className={styles['scheduleDetail']}>{step.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      <Section labelledBy="welcome-form-heading">
        <Container>
          <SectionHeading id="welcome-form-heading" title={form.heading} lede={form.lede} />

          {status.kind === 'succeeded' ? (
            <div role="status" className={cx(styles['result'], styles['resultSuccess'])}>
              <h3 className={styles['resultHeading']}>
                <Icon name="check" size={26} />
                {form.success.heading}
              </h3>
              <p className={styles['resultBody']}>{form.success.body}</p>
            </div>
          ) : (
            <>
              {status.kind === 'failed' ? (
                <div role="alert" className={cx(styles['result'], styles['resultFailure'])}>
                  <h3 className={styles['resultHeading']}>
                    <Icon name="alert" size={26} />
                    {form.failure.heading}
                  </h3>
                  <p className={styles['resultBody']}>
                    {form.failure.body} {status.message}
                  </p>
                </div>
              ) : null}

              <form className={styles['form']} onSubmit={handleSubmit} noValidate>
                {orderedErrors.length > 0 ? (
                  <div
                    ref={errorSummaryRef}
                    tabIndex={-1}
                    role="alert"
                    className={styles['errorSummary']}
                  >
                    <h3 className={styles['errorSummaryHeading']}>
                      <Icon name="alert" size={20} />
                      {form.errorSummary.heading}
                    </h3>
                    <ul className={styles['errorSummaryList']}>
                      {orderedErrors.map(({ field, message }) => (
                        <li key={field}>
                          <a href={`#welcome-${field}`}>{message}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className={styles['formRow']}>
                  <TextField
                    id="welcome-businessName"
                    name="businessName"
                    maxLength={FIELD_LIMITS.onboarding.businessName}
                    label={form.fields.businessName.label}
                    value={values.businessName}
                    error={errors.businessName}
                    onChange={(event) => setValue('businessName', event.target.value)}
                    required
                  />
                  <TextField
                    id="welcome-contactName"
                    name="contactName"
                    maxLength={FIELD_LIMITS.onboarding.contactName}
                    label={form.fields.contactName.label}
                    value={values.contactName}
                    error={errors.contactName}
                    onChange={(event) => setValue('contactName', event.target.value)}
                    required
                  />
                </div>

                <div className={styles['formRow']}>
                  <TextField
                    id="welcome-email"
                    name="email"
                    maxLength={FIELD_LIMITS.onboarding.email}
                    type="email"
                    inputMode="email"
                    label={form.fields.email.label}
                    value={values.email}
                    error={errors.email}
                    onChange={(event) => setValue('email', event.target.value)}
                    required
                  />
                  <TextField
                    id="welcome-phone"
                    name="phone"
                    maxLength={FIELD_LIMITS.onboarding.phone}
                    type="tel"
                    inputMode="tel"
                    label={form.fields.phone.label}
                    value={values.phone}
                    error={errors.phone}
                    onChange={(event) => setValue('phone', event.target.value)}
                    required
                  />
                </div>

                <TextAreaField
                  id="welcome-services"
                  name="services"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.services.label}
                  hint={form.fields.services.hint}
                  rows={4}
                  value={values.services}
                  error={errors.services}
                  onChange={(event) => setValue('services', event.target.value)}
                  required
                />

                <TextField
                  id="welcome-serviceAreas"
                  name="serviceAreas"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.serviceAreas.label}
                  hint={form.fields.serviceAreas.hint}
                  value={values.serviceAreas}
                  error={errors.serviceAreas}
                  onChange={(event) => setValue('serviceAreas', event.target.value)}
                  required
                />

                <div className={styles['formRow']}>
                  <TextField
                    id="welcome-website"
                    name="website"
                    maxLength={FIELD_LIMITS.onboarding.short}
                    type="url"
                    inputMode="url"
                    label={form.fields.website.label}
                    optionalLabel={form.fields.website.optionalLabel}
                    hint={form.fields.website.hint}
                    placeholder={form.fields.website.placeholder}
                    value={values.website}
                    onChange={(event) => setValue('website', event.target.value)}
                  />
                  <TextField
                    id="welcome-googleBusinessProfile"
                    name="googleBusinessProfile"
                    maxLength={FIELD_LIMITS.onboarding.short}
                    label={form.fields.googleBusinessProfile.label}
                    optionalLabel={form.fields.googleBusinessProfile.optionalLabel}
                    hint={form.fields.googleBusinessProfile.hint}
                    value={values.googleBusinessProfile}
                    onChange={(event) => setValue('googleBusinessProfile', event.target.value)}
                  />
                </div>

                <TextAreaField
                  id="welcome-domainAndHosting"
                  name="domainAndHosting"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.domainAndHosting.label}
                  optionalLabel={form.fields.domainAndHosting.optionalLabel}
                  hint={form.fields.domainAndHosting.hint}
                  rows={3}
                  value={values.domainAndHosting}
                  onChange={(event) => setValue('domainAndHosting', event.target.value)}
                />

                <TextAreaField
                  id="welcome-photosNote"
                  name="photosNote"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.photosNote.label}
                  optionalLabel={form.fields.photosNote.optionalLabel}
                  hint={form.fields.photosNote.hint}
                  rows={3}
                  value={values.photosNote}
                  onChange={(event) => setValue('photosNote', event.target.value)}
                />

                <TextAreaField
                  id="welcome-competitors"
                  name="competitors"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.competitors.label}
                  optionalLabel={form.fields.competitors.optionalLabel}
                  hint={form.fields.competitors.hint}
                  rows={2}
                  value={values.competitors}
                  onChange={(event) => setValue('competitors', event.target.value)}
                />

                <TextAreaField
                  id="welcome-callsToAction"
                  name="callsToAction"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.callsToAction.label}
                  optionalLabel={form.fields.callsToAction.optionalLabel}
                  hint={form.fields.callsToAction.hint}
                  rows={2}
                  value={values.callsToAction}
                  onChange={(event) => setValue('callsToAction', event.target.value)}
                />

                <TextAreaField
                  id="welcome-accessNotes"
                  name="accessNotes"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.accessNotes.label}
                  optionalLabel={form.fields.accessNotes.optionalLabel}
                  hint={form.fields.accessNotes.hint}
                  rows={2}
                  value={values.accessNotes}
                  onChange={(event) => setValue('accessNotes', event.target.value)}
                />

                <TextAreaField
                  id="welcome-anythingElse"
                  name="anythingElse"
                  maxLength={FIELD_LIMITS.onboarding.long}
                  label={form.fields.anythingElse.label}
                  optionalLabel={form.fields.anythingElse.optionalLabel}
                  rows={3}
                  value={values.anythingElse}
                  onChange={(event) => setValue('anythingElse', event.target.value)}
                />

                <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

                <div className={styles['actions']}>
                  <Button type="submit" size="lg" loading={status.kind === 'submitting'}>
                    {status.kind === 'submitting' ? form.submit.pending : form.submit.idle}
                  </Button>
                  <p className={styles['privacyNote']}>{form.privacyNote}</p>
                </div>
              </form>
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
