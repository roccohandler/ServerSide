import { useEffect, useRef } from 'react';
import { audit } from '../../../content/audit';
import { HONEYPOT_FIELD } from '../../../types/api';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Button } from '../../../components/ui/Button';
import { Honeypot, TextField } from '../../../components/ui/Field';
import { useAuditSubmit, type AuditContactField } from '../useAuditSubmit';
import type { AuditSummaryInput } from '../auditSummary';
import styles from '../Audit.module.css';

const HEADING_ID = 'audit-send-heading';

const FIELD_IDS: Record<AuditContactField, string> = {
  name: 'audit-name',
  businessName: 'audit-business',
  email: 'audit-email',
  phone: 'audit-phone',
  website: 'audit-website',
};

/**
 * Step 6: the audit becomes a lead.
 *
 * This is the moment the whole page exists for, and the thing the PlayBook's assessment
 * never had — somebody who has just scored their own site badly in twenty places is the
 * most qualified reader this site will ever get, and the previous version handed them a
 * link back to an article.
 *
 * ## What actually gets sent
 *
 * The rendered audit goes into the `message` field of the existing lead contract, so no
 * server code changes. `auditSummary.ts` explains why that is the right fit rather than a
 * shortcut, and what the 2000-character budget means for it.
 *
 * ## Why the consent line is specific
 *
 * Because more than an email address is being transmitted. Somebody who scored their own
 * site harshly is sending that assessment, their weakest five and any figures they
 * entered. Saying "we respect your privacy" here would be true and useless; saying
 * exactly what leaves the browser is what a reader in that position is entitled to.
 */
export function AuditSend(props: AuditSummaryInput) {
  const {
    values,
    errors,
    errorOrder,
    status,
    honeypotValue,
    errorSummaryRef,
    setValue,
    setHoneypotValue,
    handleSubmit,
  } = useAuditSubmit(props);
  const { send } = audit;

  /*
   * Focus follows the outcome, the way `ContactForm` already does it.
   *
   * On success the whole form unmounts. Without this, the button the visitor just pressed
   * disappears and focus falls to `<body>` — so on a page with roughly a hundred and ten
   * focusable controls, their next Tab starts again at the skip link. A keyboard user
   * would have to traverse the entire audit to get back to where they were, and a screen
   * reader announces nothing at all about what happened.
   */
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status.kind === 'succeeded' || status.kind === 'failed') {
      resultRef.current?.focus();
    }
  }, [status.kind]);

  if (status.kind === 'succeeded') {
    return (
      <Section labelledBy={HEADING_ID}>
        <Container narrow>
          <div ref={resultRef} tabIndex={-1} className={styles['sent']} role="status">
            <h2 id={HEADING_ID} className={styles['sentHeading']}>
              {send.success.heading}
            </h2>
            <p className={styles['sentBody']}>{send.success.body}</p>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section labelledBy={HEADING_ID}>
      <Container narrow>
        <p className={styles['stepLabel']}>{send.stepLabel}</p>
        <SectionHeading id={HEADING_ID} title={send.heading} lede={send.lede} />

        <p className={styles['freeNote']}>{send.freeNote}</p>

        {status.kind === 'failed' ? (
          <div ref={resultRef} tabIndex={-1} className={styles['alert']} role="alert">
            <h3 className={styles['alertHeading']}>{send.failure.heading}</h3>
            <p>{send.failure.body}</p>
          </div>
        ) : null}

        {errorOrder.length > 0 ? (
          <div ref={errorSummaryRef} tabIndex={-1} className={styles['alert']} role="alert">
            <h3 className={styles['alertHeading']}>{send.errorSummary.heading}</h3>
            <ul>
              {errorOrder.map(({ field, message }) => (
                <li key={field}>
                  <a href={`#${FIELD_IDS[field]}`}>{message}</a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {/*
         * `noValidate` turns off the browser's own bubbles so the error summary above is
         * the single place problems are reported — but the `required` attributes stay on
         * the inputs, because they are what assistive technology announces.
         */}
        <form onSubmit={handleSubmit} noValidate className={styles['sendForm']}>
          <TextField
            id={FIELD_IDS.name}
            name="name"
            label={send.fields.name.label}
            autoComplete="name"
            required
            value={values.name}
            error={errors.name}
            onChange={(event) => setValue('name', event.target.value)}
          />
          <TextField
            id={FIELD_IDS.businessName}
            name="businessName"
            label={send.fields.businessName.label}
            autoComplete="organization"
            required
            value={values.businessName}
            error={errors.businessName}
            onChange={(event) => setValue('businessName', event.target.value)}
          />
          <TextField
            id={FIELD_IDS.email}
            name="email"
            type="email"
            label={send.fields.email.label}
            autoComplete="email"
            required
            value={values.email}
            error={errors.email}
            onChange={(event) => setValue('email', event.target.value)}
          />
          <TextField
            id={FIELD_IDS.phone}
            name="phone"
            type="tel"
            label={send.fields.phone.label}
            hint={send.fields.phone.hint}
            autoComplete="tel"
            required
            value={values.phone}
            error={errors.phone}
            onChange={(event) => setValue('phone', event.target.value)}
          />
          <TextField
            id={FIELD_IDS.website}
            name="website"
            label={send.fields.website.label}
            optionalLabel={send.fields.website.optionalLabel}
            hint={send.fields.website.hint}
            placeholder={send.fields.website.placeholder}
            autoComplete="url"
            value={values.website}
            error={errors.website}
            onChange={(event) => setValue('website', event.target.value)}
          />

          {/*
           * Off-screen, never announced, never tabbable. A human cannot fill it in; a
           * form-filling bot does, and `lead.service.ts` drops anything that arrives with
           * it set. Every other lead path on the site has had one from the start.
           */}
          <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

          <p className={styles['consent']}>{send.consent}</p>

          <Button type="submit" size="lg" disabled={status.kind === 'submitting'}>
            {status.kind === 'submitting' ? send.submit.pending : send.submit.idle}
          </Button>
        </form>
      </Container>
    </Section>
  );
}
