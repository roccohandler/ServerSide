import { useRef, useState, type FormEvent } from 'react';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { welcome } from '../../../content/welcome';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { submitOnboarding } from '../../../lib/api';
import { track } from '../../../lib/analytics';
import { HONEYPOT_FIELD, type OnboardingRequest } from '../../../types/api';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Honeypot, TextAreaField, TextField } from '../../../components/ui/Field';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import styles from './Welcome.module.css';

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

type Status =
  | { readonly kind: 'idle' }
  | { readonly kind: 'submitting' }
  | { readonly kind: 'succeeded' }
  | { readonly kind: 'failed'; readonly message: string };

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
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [honeypotValue, setHoneypotValue] = useState('');
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);

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
    if (status.kind === 'submitting') return;

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setErrors({});
    setStatus({ kind: 'submitting' });

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
      ...(honeypotValue ? { [HONEYPOT_FIELD]: honeypotValue } : {}),
    };

    void submitOnboarding(payload).then((result) => {
      if (result.success) {
        track('onboarding_submitted');
        setStatus({ kind: 'succeeded' });
        return;
      }
      setStatus({ kind: 'failed', message: result.error.message });
    });
  };

  const { form } = welcome;
  const orderedErrors = REQUIRED.filter(({ field }) => errors[field]).map(({ field }) => ({
    field,
    message: errors[field] ?? '',
  }));

  return (
    <>
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
            <div role="status" className={`${styles['result']} ${styles['resultSuccess']}`}>
              <h3 className={styles['resultHeading']}>
                <Icon name="check" size={26} />
                {form.success.heading}
              </h3>
              <p className={styles['resultBody']}>{form.success.body}</p>
            </div>
          ) : (
            <>
              {status.kind === 'failed' ? (
                <div role="alert" className={`${styles['result']} ${styles['resultFailure']}`}>
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
                    label={form.fields.businessName.label}
                    value={values.businessName}
                    error={errors.businessName}
                    onChange={(event) => setValue('businessName', event.target.value)}
                    required
                  />
                  <TextField
                    id="welcome-contactName"
                    name="contactName"
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
                  label={form.fields.anythingElse.label}
                  optionalLabel={form.fields.anythingElse.optionalLabel}
                  rows={3}
                  value={values.anythingElse}
                  onChange={(event) => setValue('anythingElse', event.target.value)}
                />

                <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

                <div className={styles['actions']}>
                  <Button type="submit" size="lg" disabled={status.kind === 'submitting'}>
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
