import { opportunity } from '../../../content';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Value.module.css';

const HEADING_ID = 'opportunity-heading';
const CAVEAT_HEADING_ID = 'opportunity-caveat-heading';

/**
 * The economic anchor, placed between the problem and the funnel.
 *
 * ## Why it is here rather than anywhere else
 *
 * The price is on the first screen, which is unusual and deliberate — a reader who
 * cannot find a number assumes the answer is "more than I can afford". The cost of doing
 * that is that the number arrives before the reader has any frame for judging it, so
 * their only reference is their own budget. This section is that frame, and it has to
 * come early enough to still be doing its job when the reader reaches the pricing cards.
 *
 * ## Why there is not a calculator here
 *
 * Because the inputs would be invented. A calculator on a homepage does arithmetic about
 * a hypothetical stranger, and a sceptical owner reads that as a sales device — which is
 * roughly what it is. The same arithmetic done on the reader's own numbers, after a
 * diagnosis of their own site, reads as a consequence instead. So the interactive version
 * lives in the audit and this one is three sentences and a relationship.
 *
 * The `figure` on each step is a phrase rather than a number for the same reason, plus a
 * build constraint: `content.test.ts` fails on any currency figure in the content layer
 * that is not one of the published prices, which is a guard worth keeping intact.
 */
export function OpportunitySection() {
  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={opportunity.eyebrow}
          title={opportunity.heading}
          lede={opportunity.lede}
        />

        <ol className={styles['anchorList']}>
          {opportunity.steps.map((step, index) => (
            <Reveal as="li" key={step.id} sequence={index} className={styles['anchorItem']}>
              <p className={styles['anchorFigure']}>{step.figure}</p>
              <h3 className={styles['anchorTitle']}>{step.title}</h3>
              <p className={styles['anchorBody']}>{step.body}</p>
            </Reveal>
          ))}
        </ol>

        {/*
         * The limits, immediately after the argument rather than as small print.
         *
         * A reader who has been shown a revenue projection by somebody else is waiting
         * for the catch, and the fastest way to answer that is to state it first and
         * larger than they expected.
         */}
        <div className={styles['anchorCaveat']}>
          <h3 id={CAVEAT_HEADING_ID} className={styles['anchorCaveatHeading']}>
            {opportunity.caveat.heading}
          </h3>
          <p className={styles['anchorCaveatBody']}>{opportunity.caveat.body}</p>
        </div>

        <p className={styles['anchorClosing']}>{opportunity.closing}</p>
      </Container>
    </Section>
  );
}
