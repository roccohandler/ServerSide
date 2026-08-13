import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { heroForm, inquiryOptions } from '../../content';
import { routes, sections } from '../../config/routes';
import { HONEYPOT_FIELD } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Icon } from '../../components/ui/Icon';
import { Honeypot, RadioGroupField, TextField } from '../../components/ui/Field';
import { EmailLink, PhoneLink } from '../../components/ui/ContactLink';
import { HERO_STEPS, useHeroLeadForm, type HeroFieldName } from './useHeroLeadForm';
import styles from './HeroLeadForm.module.css';

/*
 * The hero's lead form.
 *
 * A visitor who arrived already convinced — from a referral, an ad, a second visit —
 * should not have to read a sales page to act. Three fields, then three more once they
 * have committed. Everything the API needs, nothing it does not.
 *
 * It shares the contact page's validators, its honeypot, its API client and its error
 * conventions. What it does not share is the *shape* of the ask: this one is written to
 * be answerable in under a minute on a phone, on the first screen.
 */

const FIELD_IDS: Record<HeroFieldName, string> = {
  name: 'hero-first-name',
  businessName: 'hero-business-name',
  email: 'hero-email',
  phone: 'hero-phone',
  inquiryType: 'hero-inquiry-type',
  website: 'hero-website',
};

export function HeroLeadForm() {
  const {
    step,
    stepIndex,
    values,
    errors,
    status,
    honeypotValue,
    fieldsForStep,
    setValue,
    setHoneypotValue,
    goBack,
    handleSubmit,
    errorSummaryRef,
  } = useHeroLeadForm();

  const resultRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLParagraphElement>(null);
  const isSubmitting = status.kind === 'submitting';

  // Announce the outcome. On a phone the form can be the whole screen, so a result that
  // renders in place still needs focus moved to it to be noticed.
  useEffect(() => {
    if (status.kind === 'succeeded') resultRef.current?.focus();
  }, [status.kind]);

  // Moving between steps replaces every input on screen. Focus goes to the step label so
  // a screen-reader user is told where they now are instead of being left on a button
  // that no longer exists.
  useEffect(() => {
    if (stepIndex > 0) stepHeadingRef.current?.focus();
  }, [stepIndex]);

  const orderedErrors = fieldsForStep.flatMap((field) => {
    const message = errors[field];
    return message ? [{ field, message }] : [];
  });

  if (status.kind === 'succeeded') {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        className={`${styles['card']} ${styles['success']}`}
      >
        <span className={styles['successIcon']}>
          <Icon name="check" size={28} />
        </span>
        <h2 className={styles['successHeading']}>{heroForm.success.heading}</h2>
        <p className={styles['successBody']}>{heroForm.success.body}</p>

        <a className={styles['successAction']} href={`#${sections.system}`}>
          {heroForm.success.actionLabel}
          <Icon name="arrow-right" size={18} />
        </a>

        <div className={styles['channels']}>
          <PhoneLink className={styles['channelLink']} />
          <EmailLink className={styles['channelLink']} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles['card']}>
      <div className={styles['head']}>
        <h2 className={styles['heading']}>{heroForm.heading}</h2>
        <p className={styles['intro']}>{heroForm.intro}</p>
      </div>

      {/*
       * A two-segment bar rather than a percentage: the visitor needs to know the ask is
       * short, which "step 1 of 2" says and "50%" does not.
       */}
      <p ref={stepHeadingRef} tabIndex={-1} className={styles['stepLine']}>
        <span className={styles['stepCount']}>
          {heroForm.stepCounter(stepIndex + 1, HERO_STEPS.length)}
        </span>
        <span className={styles['stepLabel']}>{heroForm.stepLabels[stepIndex]}</span>
      </p>

      <div className={styles['progress']} aria-hidden="true">
        {HERO_STEPS.map((name, index) => (
          <span
            key={name}
            className={[
              styles['progressSegment'],
              index <= stepIndex ? styles['progressDone'] : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      {status.kind === 'failed' ? (
        <div role="alert" className={styles['failure']}>
          <p className={styles['failureHeading']}>
            <Icon name="alert" size={20} />
            {heroForm.failure.heading}
          </p>
          <p className={styles['failureBody']}>{heroForm.failure.body}</p>
          <div className={styles['channels']}>
            <PhoneLink className={styles['channelLink']} />
            <EmailLink className={styles['channelLink']} />
          </div>
        </div>
      ) : null}

      <form className={styles['form']} onSubmit={handleSubmit} noValidate>
        {orderedErrors.length > 0 ? (
          <div ref={errorSummaryRef} tabIndex={-1} role="alert" className={styles['errorSummary']}>
            <p className={styles['errorSummaryHeading']}>{heroForm.errorSummary.heading}</p>
            <ul className={styles['errorSummaryList']}>
              {orderedErrors.map(({ field, message }) => (
                <li key={field}>
                  <a href={`#${FIELD_IDS[field]}`}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {step === 'contact' ? (
          <>
            <TextField
              id={FIELD_IDS.name}
              name="name"
              label={heroForm.fields.firstName.label}
              autoComplete={heroForm.fields.firstName.autoComplete}
              value={values.name}
              error={errors.name}
              onChange={(event) => setValue('name', event.target.value)}
              required
            />
            <TextField
              id={FIELD_IDS.businessName}
              name="businessName"
              label={heroForm.fields.businessName.label}
              placeholder={heroForm.fields.businessName.placeholder}
              autoComplete={heroForm.fields.businessName.autoComplete}
              value={values.businessName}
              error={errors.businessName}
              onChange={(event) => setValue('businessName', event.target.value)}
              required
            />
            <TextField
              id={FIELD_IDS.email}
              name="email"
              type="email"
              inputMode="email"
              label={heroForm.fields.email.label}
              hint={heroForm.fields.email.hint}
              autoComplete={heroForm.fields.email.autoComplete}
              value={values.email}
              error={errors.email}
              onChange={(event) => setValue('email', event.target.value)}
              required
            />
          </>
        ) : (
          <>
            <RadioGroupField
              id={FIELD_IDS.inquiryType}
              name="inquiryType"
              label={heroForm.fields.inquiryType.label}
              options={inquiryOptions}
              value={values.inquiryType}
              error={errors.inquiryType}
              onChange={(value) => setValue('inquiryType', value)}
            />
            <TextField
              id={FIELD_IDS.website}
              name="website"
              type="url"
              inputMode="url"
              label={heroForm.fields.website.label}
              optionalLabel={heroForm.fields.website.optionalLabel}
              hint={heroForm.fields.website.hint}
              placeholder={heroForm.fields.website.placeholder}
              autoComplete={heroForm.fields.website.autoComplete}
              value={values.website}
              error={errors.website}
              onChange={(event) => setValue('website', event.target.value)}
            />
            <TextField
              id={FIELD_IDS.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              label={heroForm.fields.phone.label}
              hint={heroForm.fields.phone.hint}
              autoComplete={heroForm.fields.phone.autoComplete}
              value={values.phone}
              error={errors.phone}
              onChange={(event) => setValue('phone', event.target.value)}
              required
            />
          </>
        )}

        <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

        <div className={styles['actions']}>
          <Button type="submit" size="lg" block disabled={isSubmitting}>
            {step === 'contact'
              ? heroForm.next
              : isSubmitting
                ? heroForm.submit.pending
                : heroForm.submit.idle}
          </Button>

          {step === 'qualify' ? (
            <Button type="button" variant="ghost" onClick={goBack} className={styles['back']}>
              {heroForm.back}
            </Button>
          ) : null}
        </div>

        <p className={styles['reassurance']}>{heroForm.reassurance}</p>
        <p className={styles['privacy']}>
          Your details are used to reply to this request and nothing else.{' '}
          <Link to={routes.privacy}>Privacy</Link>.
        </p>
      </form>
    </div>
  );
}
