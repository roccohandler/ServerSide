import { useOutletContext } from 'react-router-dom';
import { Icon } from '../../../components/ui/Icon';
import type { DemoOutletContext } from './DemoLayout';
import { DemoQuoteForm } from './DemoQuoteForm';
import styles from './Demo.module.css';

/**
 * The contact page.
 *
 * Two columns and a deliberate order: the ways to reach a human come first, the form
 * second. Most of these trades are hired by phone, and a contact page that leads with a
 * form is a contact page built for the business's convenience rather than the customer's.
 *
 * What is not on this page: a street address and a map. Every plausible Seattle address is
 * somebody's actual house, and a fictional business does not get to put a pin on it. The
 * service areas answer the question a customer is really asking — "do you come here" —
 * which is the thing the industry pages say every trade must answer on the first screen.
 */
export function DemoContactPage() {
  const { site } = useOutletContext<DemoOutletContext>();
  const { contact } = site;

  return (
    <>
      <section className={styles['pageHead']}>
        <div className={styles['sectionInner']}>
          <h1 className={styles['pageHeading']}>{contact.heading}</h1>
          <p className={styles['pageLede']}>{contact.lede}</p>
        </div>
      </section>

      <section className={styles['section']}>
        <div className={styles['contactGrid']}>
          <div className={styles['contactAside']}>
            <h2 className={styles['contactHeading']}>{contact.callHeading}</h2>
            <p className={styles['contactLede']}>{contact.callLede}</p>

            <p className={styles['contactPhone']}>
              <Icon name="phone" size={20} />
              <span>{site.business.phone}</span>
            </p>
            <p className={styles['contactEmail']}>
              <Icon name="mail" size={16} />
              <span>{site.business.email}</span>
            </p>

            <h3 className={styles['contactSubheading']}>Hours</h3>
            <ul className={styles['contactHours']}>
              {site.business.hours.map((entry) => (
                <li key={entry.days} className={styles['contactHoursRow']}>
                  <span>{entry.days}</span>
                  <span>{entry.time}</span>
                </li>
              ))}
            </ul>

            <h3 className={styles['contactSubheading']}>Where we work</h3>
            <ul className={styles['areas']}>
              {site.business.serviceAreas.map((area) => (
                <li key={area} className={styles['area']}>
                  <Icon name="map-pin" size={16} />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles['contactMain']}>
            <h2 className={styles['contactHeading']}>{contact.formHeading}</h2>
            <p className={styles['contactLede']}>{contact.formLede}</p>

            <DemoQuoteForm
              fields={contact.fields}
              submitLabel={contact.submitLabel}
              businessName={site.business.name}
            />
          </div>
        </div>
      </section>
    </>
  );
}
