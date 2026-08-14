import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { contactContent, inquiryOptions } from '../../../content';
import { routes } from '../../../config/routes';
import { HONEYPOT_FIELD, type InquiryType } from '../../../types/api';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { Honeypot, SelectField, TextAreaField, TextField } from '../../../components/ui/Field';
import { EmailLink, PhoneLink } from '../../../components/ui/ContactLink';
import { Link } from 'react-router-dom';
import { MESSAGE_MAX_LENGTH, orderErrors } from './contactValidation';
import { useContactForm } from './useContactForm';
import styles from './Contact.module.css';

const FIELD_IDS = {
  name: 'contact-name',
  businessName: 'contact-business-name',
  email: 'contact-email',
  phone: 'contact-phone',
  website: 'contact-website',
  inquiryType: 'contact-inquiry-type',
  message: 'contact-message',
} as const;

/**
 * What an `?intent=` query parameter pre-selects.
 *
 * Every product call to action on the site links here with one of these, so a reader who
 * has already chosen does not have to re-answer "what do you need help with". Unknown
 * values are ignored — the parameter is a convenience, never a contract.
 *
 * The keys are the `EntryPath.cta.intent` union in `types/content.ts`, and `fix` is new:
 * the Conversion Fix product's action lands here, and before it existed there was no intent
 * for "my site works and is losing people" even though the enquiry type has always had one.
 */
const INTENT_TO_INQUIRY: Readonly<Record<string, InquiryType>> = {
  build: 'new-website',
  fix: 'improve-website',
  partner: 'manage-website',
};

/**
 * The lead form.
 *
 * Six questions, two of them optional. Every additional field costs submissions, so
 * anything that can be worked out in the first reply is not asked for here.
 *
 * Accessibility notes:
 *   - `noValidate` turns off the browser's own bubbles so there is one error style,
 *     while `required` stays on the inputs so assistive technology still announces it.
 *   - Failed submissions render a summary that takes focus and links to each field.
 *   - Success and failure are announced through a live region, because on a long page
 *     the result can be off-screen when it appears.
 */
export function ContactForm() {
  const [searchParams] = useSearchParams();
  const intent = searchParams.get('intent');

  const {
    values,
    errors,
    status,
    honeypotValue,
    setValue,
    setHoneypotValue,
    handleSubmit,
    errorSummaryRef,
  } = useContactForm({
    initialInquiryType: intent ? INTENT_TO_INQUIRY[intent] : undefined,
  });

  const resultRef = useRef<HTMLDivElement>(null);
  const orderedErrors = orderErrors(errors);
  const isSubmitting = status.kind === 'submitting';

  useEffect(() => {
    if (status.kind === 'succeeded' || status.kind === 'failed') {
      resultRef.current?.focus();
    }
  }, [status.kind]);

  if (status.kind === 'succeeded') {
    return (
      <div
        ref={resultRef}
        tabIndex={-1}
        role="status"
        className={`${styles['result']} ${styles['resultSuccess']}`}
      >
        <h2 className={styles['resultHeading']}>
          <Icon name="check" size={28} />
          {contactContent.success.heading}
        </h2>
        <p className={styles['resultBody']}>{contactContent.success.body}</p>
        <div className={styles['resultActions']}>
          <PhoneLink className={styles['channelLink']} />
          <EmailLink className={styles['channelLink']} />
        </div>
      </div>
    );
  }

  return (
    <>
      {status.kind === 'failed' ? (
        <div
          ref={resultRef}
          tabIndex={-1}
          role="alert"
          className={`${styles['result']} ${styles['resultFailure']}`}
        >
          <h2 className={styles['resultHeading']}>
            <Icon name="alert" size={28} />
            {contactContent.failure.heading}
          </h2>
          <p className={styles['resultBody']}>{status.message}</p>
          <div className={styles['resultActions']}>
            <PhoneLink className={styles['channelLink']} />
            <EmailLink className={styles['channelLink']} />
          </div>
        </div>
      ) : null}

      <form className={styles['form']} onSubmit={handleSubmit} noValidate>
        {orderedErrors.length > 0 ? (
          <div ref={errorSummaryRef} tabIndex={-1} role="alert" className={styles['errorSummary']}>
            <h2 className={styles['errorSummaryHeading']}>
              <Icon name="alert" size={22} />
              {contactContent.errorSummary.heading}
            </h2>
            <ul className={styles['errorSummaryList']}>
              {orderedErrors.map(({ field, message }) => (
                <li key={field}>
                  <a className={styles['errorSummaryLink']} href={`#${FIELD_IDS[field]}`}>
                    {message}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className={styles['formRow']}>
          <TextField
            id={FIELD_IDS.name}
            name="name"
            label={contactContent.fields.name.label}
            autoComplete={contactContent.fields.name.autoComplete}
            value={values.name}
            error={errors.name}
            onChange={(event) => setValue('name', event.target.value)}
            required
          />
          <TextField
            id={FIELD_IDS.businessName}
            name="businessName"
            label={contactContent.fields.businessName.label}
            autoComplete={contactContent.fields.businessName.autoComplete}
            value={values.businessName}
            error={errors.businessName}
            onChange={(event) => setValue('businessName', event.target.value)}
            required
          />
        </div>

        <div className={styles['formRow']}>
          <TextField
            id={FIELD_IDS.email}
            name="email"
            type="email"
            inputMode="email"
            label={contactContent.fields.email.label}
            autoComplete={contactContent.fields.email.autoComplete}
            value={values.email}
            error={errors.email}
            onChange={(event) => setValue('email', event.target.value)}
            required
          />
          <TextField
            id={FIELD_IDS.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            label={contactContent.fields.phone.label}
            hint={contactContent.fields.phone.hint}
            autoComplete={contactContent.fields.phone.autoComplete}
            value={values.phone}
            error={errors.phone}
            onChange={(event) => setValue('phone', event.target.value)}
            required
          />
        </div>

        <TextField
          id={FIELD_IDS.website}
          name="website"
          type="url"
          inputMode="url"
          label={contactContent.fields.website.label}
          optionalLabel={contactContent.fields.website.optionalLabel}
          hint={contactContent.fields.website.hint}
          placeholder={contactContent.fields.website.placeholder}
          autoComplete={contactContent.fields.website.autoComplete}
          value={values.website}
          error={errors.website}
          onChange={(event) => setValue('website', event.target.value)}
        />

        <SelectField
          id={FIELD_IDS.inquiryType}
          name="inquiryType"
          label={contactContent.fields.inquiryType.label}
          placeholder="Choose one"
          options={inquiryOptions}
          value={values.inquiryType}
          error={errors.inquiryType}
          onChange={(event) => setValue('inquiryType', event.target.value)}
          required
        />

        <TextAreaField
          id={FIELD_IDS.message}
          name="message"
          label={contactContent.fields.message.label}
          optionalLabel={contactContent.fields.message.optionalLabel}
          hint={contactContent.fields.message.hint}
          maxLength={MESSAGE_MAX_LENGTH}
          rows={5}
          value={values.message}
          error={errors.message}
          onChange={(event) => setValue('message', event.target.value)}
        />

        <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

        <div className={styles['actions']}>
          <Button type="submit" size="lg" block disabled={isSubmitting}>
            {isSubmitting ? contactContent.submit.pending : contactContent.submit.idle}
          </Button>
          <p className={styles['expectation']}>{contactContent.expectation}</p>
          <p className={styles['privacyNote']}>
            {contactContent.privacyNote} <Link to={routes.privacy}>Privacy</Link>.
          </p>
        </div>
      </form>
    </>
  );
}
