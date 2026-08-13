import { primaryCta } from '../../../content';
import { playbook } from '../../../content/playbook';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Button, ButtonLink } from '../../../components/ui/Button';
import { Honeypot, TextField } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import { track } from '../../../lib/analytics';
import { HONEYPOT_FIELD } from '../../../types/api';
import { usePlayBookRequest } from '../usePlayBookRequest';
import styles from '../PlayBook.module.css';

const HEADING_ID = 'playbook-pdf-heading';
const EMAIL_FIELD_ID = 'playbook-email';

/**
 * The one place on this page that asks for anything.
 *
 * It sits after all eleven plays, the fix-first list and the scorecard — which is the
 * whole argument for the exchange being fair. A reader who reaches this has already had
 * everything they needed to go and improve their own website. What is behind the form is
 * the paperwork for doing it, and the block says so in `boundary` rather than implying
 * that the good part was being withheld.
 *
 * Nothing is auto-delivered, and the success copy does not pretend otherwise: the request
 * is stored, the owner is notified, the owner sends the workbook. A "check your inbox,
 * it is on its way" confirmation would describe a mailing system that does not exist, and
 * the first person to sit refreshing their inbox would discover that.
 */
export function PlayBookPdfOffer() {
  const { email, error, status, honeypotValue, setEmail, setHoneypotValue, handleSubmit } =
    usePlayBookRequest();

  const { pdfOffer } = playbook;
  const isSubmitting = status.kind === 'submitting';

  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={pdfOffer.eyebrow}
          title={pdfOffer.heading}
          lede={pdfOffer.lede}
        />

        <div className={styles['pdfGrid']}>
          <div>
            <ul className={styles['pdfList']}>
              {pdfOffer.includes.map((item) => (
                <Reveal as="li" key={item} className={styles['pdfListItem']}>
                  <Icon name="check" size={16} className={styles['pdfMarker']} />
                  <span>{item}</span>
                </Reveal>
              ))}
            </ul>

            {/* Says out loud that nothing essential is behind the form. */}
            <p className={styles['pdfBoundary']}>{pdfOffer.boundary}</p>
          </div>

          <div className={styles['pdfPanel']}>
            {status.kind === 'succeeded' ? (
              <div role="status">
                <h3 className={styles['pdfPanelHeading']}>{pdfOffer.success.heading}</h3>
                {/*
                 * Two confirmations, chosen by what the server actually did. Saying "check
                 * your inbox" when the workbook is not hosted yet would be the exact lie
                 * this flow was built to avoid.
                 */}
                <p className={styles['pdfPanelBody']}>
                  {status.delivery === 'sent'
                    ? pdfOffer.success.sentBody
                    : pdfOffer.success.queuedBody}
                </p>
                <div className={styles['pdfPanelAction']}>
                  <ButtonLink
                    to={primaryCta.to}
                    variant="secondary"
                    onClick={() => track('cta_clicked', { location: 'playbook-success' })}
                  >
                    {pdfOffer.success.nextLabel}
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <h3 className={styles['pdfPanelHeading']}>{pdfOffer.form.heading}</h3>

                {/*
                 * A transport failure, as opposed to a rejected address. Field-level
                 * problems are shown on the field itself, where the fix is.
                 */}
                {status.kind === 'failed' ? (
                  <div className={styles['pdfError']} role="alert">
                    <p className={styles['pdfErrorHeading']}>{pdfOffer.failure.heading}</p>
                    <p>{pdfOffer.failure.body}</p>
                  </div>
                ) : null}

                <TextField
                  id={EMAIL_FIELD_ID}
                  name="email"
                  type="email"
                  label={pdfOffer.form.label}
                  hint={pdfOffer.form.hint}
                  placeholder={pdfOffer.form.placeholder}
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  {...(error ? { error } : {})}
                  disabled={isSubmitting}
                />

                <Honeypot name={HONEYPOT_FIELD} value={honeypotValue} onChange={setHoneypotValue} />

                <div className={styles['pdfPanelAction']}>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? pdfOffer.form.pending : pdfOffer.form.submit}
                  </Button>
                </div>

                {/*
                 * The consent wording. This exact string is stored with the record on the
                 * server, so what somebody agreed to is recoverable a year from now. It is
                 * mirrored in `subscriber.types.ts` and pinned by a test on both sides.
                 */}
                <p className={styles['pdfConsent']}>{pdfOffer.form.consent}</p>
              </form>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
