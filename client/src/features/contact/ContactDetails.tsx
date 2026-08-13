import { contactContent, site } from '../../content';
import { EmailLink, PhoneLink } from '../../components/ui/ContactLink';
import { Icon } from '../../components/ui/Icon';
import { isPlaceholder } from '../../lib/placeholders';
import styles from './Contact.module.css';

const WHAT_HAPPENS_NEXT = [
  'Your message reaches me directly — there is no queue and no call centre.',
  'I will reply from the email address you give here.',
  'If a website is not what you need, I will tell you that instead of quoting.',
] as const;

/**
 * The alternatives to the form.
 *
 * Some people will never fill in a form, and a lead-generation site that only offers
 * one way to make contact loses them. The phone number and email address come from the
 * same central config as the header and footer.
 */
export function ContactDetails() {
  const { availability, outOfHours } = site.contact;

  return (
    <aside className={styles['details']} aria-labelledby="contact-details-heading">
      <div>
        <h2 id="contact-details-heading" className={styles['detailsHeading']}>
          Rather call or email?
        </h2>
        <p className={styles['detailsBody']}>
          Both reach me directly. Calling is the fastest way to get an answer.
        </p>

        <ul className={styles['channelList']}>
          <li>
            <PhoneLink className={styles['channelLink']} />
          </li>
          <li>
            <EmailLink className={styles['channelLink']} />
          </li>
        </ul>

        {/* Only shown once real hours are configured — never an invented promise. */}
        {isPlaceholder(availability) ? null : (
          <p className={styles['detailsBody']}>{availability}</p>
        )}

        {/*
         * What happens outside those hours, worded as best effort. It sits next to the
         * hours rather than in the terms because the person reading this page at 9pm on
         * a Sunday with a dead website is exactly who needs to know it.
         */}
        {isPlaceholder(outOfHours) ? null : <p className={styles['detailsNote']}>{outOfHours}</p>}
      </div>

      <div>
        <h2 className={styles['detailsHeading']}>What happens next</h2>
        <ul className={styles['stepList']}>
          {WHAT_HAPPENS_NEXT.map((step) => (
            <li key={step} className={styles['step']}>
              <Icon name="check" size={16} className={styles['stepMarker']} />
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className={styles['detailsHeading']}>Where I work</h2>
        <p className={styles['detailsBody']}>
          {site.serviceArea.short}, {site.serviceArea.region}. {site.serviceArea.note}
        </p>
      </div>

      <p className={styles['detailsBody']}>{contactContent.privacyNote}</p>
    </aside>
  );
}
