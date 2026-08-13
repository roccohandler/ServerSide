import { conversion, outcomes } from '../../../content';
import { Card, Container, Grid, Section, SectionHeading } from '../../../components/ui/Layout';
import { Icon } from '../../../components/ui/Icon';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'conversion-heading';
const OUTCOMES_HEADING_ID = 'conversion-outcomes-heading';

/** The step the website's work ends on. Carries the payoff colour — see the note below. */
const HANDOFF_STEP_ID = 'contact';

/**
 * The funnel, end to end, then the parts of the website that move somebody along it.
 *
 * The journey is an ordered list because the steps only make sense in sequence, and the
 * arrows between them are decorative — the list order already carries that meaning to a
 * screen reader, so repeating it as an announced character would be noise.
 *
 * ## Two things this section is careful about
 *
 * **The payoff colour is pinned to the handoff, not to the last step.** The CSS used to
 * hang the accent treatment on `:last-child` with a comment reading "the last step is the
 * one that pays". That was true when the funnel ended at the enquiry. Now that it runs on
 * to the invoice, leaving the rule as it was would have quietly coloured "pays for the
 * job" as this business's own deliverable. It is keyed on the step id instead, so
 * extending the funnel again cannot move it by accident.
 *
 * **The owner boundary is rendered, not implied.** Each step declares who owns it, and a
 * labelled divider is drawn wherever that changes. The three steps after the handoff are
 * deliberately styled as somebody else's — the point of drawing them at all is to show
 * the website is one segment of the chain, and that the segments after it are the
 * client's. `conversion.handoff` says so in words underneath.
 */
export function ConversionSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={conversion.eyebrow}
          title={conversion.heading}
          lede={conversion.lede}
        />

        <ol className={styles['journey']}>
          {conversion.journey.map((step, index) => {
            const previous = conversion.journey[index - 1];
            const startsGroup = previous?.owner !== step.owner;
            const isHandoff = step.id === HANDOFF_STEP_ID;

            return (
              <Reveal
                as="li"
                key={step.id}
                sequence={index}
                className={
                  step.owner === 'website'
                    ? styles['journeyItem']
                    : `${styles['journeyItem']} ${styles['journeyItemOther']}`
                }
              >
                {/*
                 * The group label. Rendered inside the list item that opens the group
                 * rather than as a sibling, so the `<ol>` keeps containing nothing but
                 * `<li>` and the numbering stays derived from document position.
                 */}
                {startsGroup ? (
                  <p className={styles['journeyGroup']}>{conversion.ownerLabels[step.owner]}</p>
                ) : null}

                <div
                  className={
                    isHandoff
                      ? `${styles['journeyStep']} ${styles['journeyStepPayoff']}`
                      : styles['journeyStep']
                  }
                >
                  <span
                    className={
                      isHandoff
                        ? `${styles['journeyIndex']} ${styles['journeyIndexPayoff']}`
                        : styles['journeyIndex']
                    }
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div>
                    <h3 className={styles['journeyLabel']}>{step.label}</h3>
                    <p className={styles['journeyDetail']}>{step.detail}</p>
                  </div>
                </div>

                {index < conversion.journey.length - 1 ? (
                  <span className={styles['journeyArrow']} aria-hidden="true">
                    <Icon name="arrow-right" size={18} />
                  </span>
                ) : null}
              </Reveal>
            );
          })}
        </ol>

        <div className={styles['handoff']}>
          <h3 className={styles['handoffHeading']}>{conversion.handoff.heading}</h3>
          <p className={styles['handoffBody']}>{conversion.handoff.body}</p>
        </div>

        <p className={styles['journeyClosing']}>{conversion.closing}</p>

        <h3 id={OUTCOMES_HEADING_ID} className={styles['outcomesHeading']}>
          What makes that happen
        </h3>

        <Grid as="ul" columns={3}>
          {outcomes.map((outcome) => (
            <Reveal as="li" key={outcome.id} className={styles['careItem']}>
              <Card className={styles['careCard']} interactive>
                <span className={styles['outcomeIcon']}>
                  <Icon name={outcome.icon} size={22} />
                </span>
                <h4 className={styles['outcomeTitle']}>{outcome.title}</h4>
                <p className={styles['outcomeBody']}>{outcome.description}</p>
              </Card>
            </Reveal>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
