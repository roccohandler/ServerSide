import { cancellation } from '../../../../content';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from '../Offer.module.css';

const HEADING_ID = 'cancellation-heading';

/**
 * What happens when somebody leaves — answered before they ask.
 *
 * This is the strongest section on the page and it is entirely about losing the customer.
 * A local business owner shopping for a website has usually already been burned by
 * somebody who held the domain, the logins or the content hostage, and they are reading
 * every other promise on this site through that memory. The only way to answer it is to
 * answer it unprompted, in detail, with the specific things they are afraid of named.
 *
 * None of it is a concession. All five were already true — the accounts have always been
 * in the client's name — they were simply never written down where a nervous buyer would
 * find them.
 */
export function CancellationSection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow="If it does not work out"
          title={cancellation.heading}
          lede={cancellation.lede}
        />

        <ul className={styles['exitList']}>
          {cancellation.items.map((item) => (
            <Reveal as="li" key={item.id} className={styles['exitItem']}>
              <span className={styles['exitMarker']}>
                <Icon name="check" size={20} />
              </span>
              <div>
                <h3 className={styles['exitTitle']}>{item.title}</h3>
                <p className={styles['exitBody']}>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <p className={styles['exitClosing']}>{cancellation.closing}</p>
      </Container>
    </Section>
  );
}
