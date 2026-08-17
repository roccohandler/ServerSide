import { launch, responsibilities } from '../../../../content';
import { sections } from '../../../../config/routes';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Badge } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from './LaunchSection.module.css';
import offer from '../Offer.module.css';

const HEADING_ID = 'launch-heading';

/**
 * How a project actually runs: what happens before any money changes hands, the
 * four-week shape of the build, and the choice at the end of it.
 *
 * The last beat is deliberately a *choice*, not a step. "Monthly management starts on
 * launch day" used to be step five of this process, stated unconditionally, on the same
 * site that called the monthly service optional. The process now ends where the build
 * ends, and what happens next is presented as the two options it actually is.
 *
 * The responsibilities split renders here because "how long does it take" and "what do
 * I have to do" are the same conversation — the timeline is measured from when the
 * client's materials arrive, and this is where that dependency is explained.
 */
export function LaunchSection() {
  return (
    <Section id={sections.process} tone="muted" labelledBy={HEADING_ID}>
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

        {/* ------------------------------------------------- before the project */}

        <div className={styles['launchBefore']}>
          <h3 className={offer['blockHeading']}>{launch.before.heading}</h3>
          <ol className={styles['launchBeforeList']}>
            {launch.before.steps.map((step) => (
              <Reveal as="li" key={step.id} className={styles['launchBeforeItem']}>
                <h4 className={styles['launchBeforeTitle']}>{step.title}</h4>
                <p className={styles['launchBeforeBody']}>{step.description}</p>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* ------------------------------------------------------ the four weeks */}

        {/*
         * The four weeks and the division of labour, in one row from the desktop step.
         *
         * They answer the same question — "how does this actually run, and what do I have
         * to do" — and the timeline is measured from when the client's materials arrive, so
         * the two are a single argument. Stacked, the rail took a 704px column and left 500px
         * of nothing beside it.
         */}
        <div className={styles['launchTwoUp']}>
          <div>
            <h3 className={offer['blockHeading']}>{launch.weeksHeading}</h3>
            <ol className={styles['launchList']}>
              {launch.weeks.map((week, index) => (
                <Reveal as="li" key={week.id} sequence={index} className={styles['launchStep']}>
                  <span className={styles['launchNumber']} aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className={styles['launchBody']}>
                    <h4 className={styles['launchTitle']}>
                      {week.label} — {week.title}
                    </h4>
                    <p className={styles['launchDetail']}>{week.description}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <p className={styles['launchTargetNote']}>{launch.targetNote}</p>
          </div>

          {/*
           * The first thirty days used to be a five-beat block here, and it is not any more.
           *
           * It moved into `afterLaunch` — the Launch → Baseline → 30-day report → monthly
           * sequence rendered by `AfterLaunchSection`. The reason is that it was answering a
           * different question from the one this section asks. "How long does the build take
           * and what do I have to do" is a process question; "when do I first find out
           * whether it worked" is a value question, and the answer to it was scattered across
           * three sections with nothing drawing the sequence. Leaving a copy here would be two
           * renderings of one story, which is how the two halves drift apart.
           */}

          {/*
           * "After launch: your choice" is not rendered here any more either — see the note
           * where `launch.after` used to live in `content/offer.ts`. `AfterLaunchSection` sits
           * directly below this one and draws the sequence properly; `CarePlans` states the two
           * options where the reader is deciding between them. Two of the three renderings
           * shared a heading word for word.
           */}

          {/* -------------------------------------------------------- who does what */}

          <div className={styles['resp']}>
            <h3 className={offer['blockHeading']}>{responsibilities.heading}</h3>
            <p className={offer['blockLede']}>{responsibilities.lede}</p>

            <div className={offer['respGrid']}>
              <div className={styles['respColumn']}>
                <p className={styles['respLabel']}>{responsibilities.weHandle.label}</p>
                <ul className={styles['respList']}>
                  {responsibilities.weHandle.items.map((item) => (
                    <li key={item} className={styles['respItem']}>
                      <Icon name="check" size={16} className={styles['respMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className={styles['respColumn']}>
                <p className={styles['respLabel']}>{responsibilities.youProvide.label}</p>
                <ul className={styles['respList']}>
                  {responsibilities.youProvide.items.map((item) => (
                    <li key={item} className={styles['respItem']}>
                      <Icon name="check" size={16} className={styles['respMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className={styles['respNote']}>{responsibilities.note}</p>
          </div>
        </div>
      </Container>
    </Section>
  );
}
