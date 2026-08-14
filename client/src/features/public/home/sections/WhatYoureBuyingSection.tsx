import { whatYoureBuying } from '../../../../content';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../Value.module.css';

const HEADING_ID = 'what-youre-buying-heading';

/**
 * The value stack as an equation: five parts, one result.
 *
 * It sits immediately before the price for a reason. A monthly fee next to the word
 * "website" reads as a subscription to something already delivered; the same fee next to
 * five named parts and an outcome reads as what it is.
 *
 * The plus signs and the equals sign are decorative — the list already carries the
 * meaning, and hearing "plus" five times adds nothing to it.
 */
export function WhatYoureBuyingSection() {
  return (
    <Section tone="brand" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={whatYoureBuying.eyebrow}
          title={whatYoureBuying.heading}
          lede={whatYoureBuying.lede}
        />

        <ul className={styles['stack']}>
          {whatYoureBuying.parts.map((part, index) => (
            <Reveal as="li" key={part.id} className={styles['stackItem']}>
              <span className={styles['stackIcon']}>
                <Icon name={part.icon} size={20} />
              </span>
              <div>
                <h3 className={styles['stackName']}>{part.name}</h3>
                <p className={styles['stackRole']}>{part.role}</p>
              </div>

              {index < whatYoureBuying.parts.length - 1 ? (
                <span className={styles['stackPlus']} aria-hidden="true">
                  +
                </span>
              ) : null}
            </Reveal>
          ))}
        </ul>

        <p className={styles['stackResult']}>
          <span className={styles['stackEquals']} aria-hidden="true">
            =
          </span>
          {whatYoureBuying.result}
        </p>
      </Container>
    </Section>
  );
}
