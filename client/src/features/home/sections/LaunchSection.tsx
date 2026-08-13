import { launch } from '../../../content';
import { sections } from '../../../config/routes';
import { Badge, Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { Reveal } from '../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'launch-heading';

/**
 * How a project actually runs, ending on the step that is the point of the whole page:
 * after launch it becomes somebody else's job.
 *
 * The launch-time badge only renders when `launch.target` has been set in
 * `content/offer.ts`, so a business that has not committed to a turnaround publishes no
 * number rather than an invented one. It is set today, to a range with its dependency
 * stated next to it.
 *
 * ## Why this section carries no tone
 *
 * Nothing inside it paints a surface: the step numbers are brand and accent circles that
 * bring their own inverse ink, the rail is `--color-border`, and the body text is
 * `--color-ink-muted`. It therefore reads identically on any band, which makes it the
 * one section that can be moved to wherever the muted/default alternation needs a seam —
 * and it is currently doing that job between the management and trust bands.
 */
export function LaunchSection() {
  return (
    <Section id={sections.process} labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={launch.eyebrow}
          title={launch.heading}
          lede={launch.lede}
        />

        {launch.target ? (
          <p className={styles['launchTarget']}>
            <Badge tone="accent">{`${launch.targetLabel}: ${launch.target}`}</Badge>
          </p>
        ) : null}

        <ol className={styles['launchList']}>
          {launch.steps.map((step, index) => (
            <Reveal as="li" key={step.id} sequence={index} className={styles['launchStep']}>
              <span className={styles['launchNumber']} aria-hidden="true">
                {index + 1}
              </span>
              <div className={styles['launchBody']}>
                <h3 className={styles['launchTitle']}>{step.title}</h3>
                <p className={styles['launchDetail']}>{step.description}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </Container>
    </Section>
  );
}
