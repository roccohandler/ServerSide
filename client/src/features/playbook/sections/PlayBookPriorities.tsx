import { playbook } from '../../../content/playbook';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../PlayBook.module.css';

const HEADING_ID = 'playbook-priorities-heading';

const principlesById = new Map(playbook.principles.map((principle) => [principle.id, principle]));

/**
 * Where to start, for the reader who has not scored anything.
 *
 * Twenty improvements and no order is a worse outcome than eleven with one — somebody
 * who leaves knowing there are twenty things wrong and no idea which matters has been
 * given a burden rather than a resource. These three tiers are roughly impact over effort
 * for a typical service business, and Priority 1 is deliberately five things that can all
 * be done in an afternoon without a developer.
 *
 * The personalised version — your own five weakest categories, in order — comes out of
 * the assessment further down. Both exist because a skimmer deserves an answer and
 * somebody who does the work deserves a better one.
 */
export function PlayBookPriorities() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={playbook.priorities.eyebrow}
          title={playbook.priorities.heading}
          lede={playbook.priorities.lede}
        />

        <ol className={styles['tiers']}>
          {playbook.priorities.tiers.map((tier, index) => (
            <Reveal as="li" key={tier.id} sequence={index} className={styles['tier']}>
              <p className={styles['tierLabel']}>{tier.label}</p>
              <h3 className={styles['tierHeading']}>{tier.heading}</h3>
              <p className={styles['tierBody']}>{tier.body}</p>

              <ul className={styles['tierList']}>
                {tier.principleIds.map((id) => {
                  const principle = principlesById.get(id);
                  if (!principle) return null;

                  return (
                    <li key={id} className={styles['tierItem']}>
                      <Icon name="check" size={16} className={styles['tierMarker']} />
                      <span>
                        <span className={styles['tierItemNumber']}>{principle.number}</span>{' '}
                        {principle.name}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          ))}
        </ol>

        <p className={styles['tiersClosing']}>{playbook.priorities.closing}</p>

        {/* Kept because it is the most-quoted part of the whole page. */}
        <div className={styles['dont']}>
          <h3 className={styles['dontHeading']}>{playbook.dontDoThis.heading}</h3>
          <ul className={styles['dontList']}>
            {playbook.dontDoThis.items.map((item) => (
              <li key={item} className={styles['dontItem']}>
                <Icon name="close" size={16} className={styles['dontMarker']} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </Section>
  );
}
