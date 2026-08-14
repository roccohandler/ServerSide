import type { Ref } from 'react';
import { playbook, playbookStages } from '../../../../content/playbook';
import { sections } from '../../../../config/routes';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import { stageAnchor } from '../stageAnchor';
import { useActiveSection } from '../../../../hooks/useActiveSection';
import { useInViewOnce } from '../../../../hooks/useInViewOnce';
import { track } from '../../../../lib/analytics';
import styles from '../PlayBook.module.css';

const HEADING_ID = 'playbook-plays-heading';

const principlesById = new Map(playbook.principles.map((principle) => [principle.id, principle]));

export interface PlayBookPrinciplesProps {
  /** Watched by `useInViewOnce`, so a bounce and a read do not look the same. */
  readonly ref?: Ref<HTMLElement>;
}

/**
 * The twenty improvements, grouped into the six stages.
 *
 * Every one is the same shape — meta concept, what goes wrong, what it costs, the rule,
 * what to do, a five-minute test, why it matters — because a reader who understands the
 * first card can skim the other nineteen and still take the whole argument away. That
 * repetition is the design, not a lack of imagination.
 *
 * Nothing is collapsed. Twenty fully-unfolded improvements is a long page, and that is
 * the correct trade: content inside a `<details>` is weighted less by search engines,
 * cannot be printed, and — worse — reads as gated even when it is not. The stage grouping
 * and the sticky navigation do the job collapsing would, without hiding anything.
 *
 * `research` blocks name their source and say what it actually studied. Checkout
 * usability work from an ecommerce lab supports "ask for less"; it is not a benchmark for
 * how many fields a plumber's quote form should have, and it does not get presented as one.
 */
export function PlayBookPrinciples({ ref }: PlayBookPrinciplesProps = {}) {
  const anchors = playbookStages.map((stage) => stageAnchor(stage.id));
  const activeAnchor = useActiveSection(anchors);

  return (
    <Section id={sections.plays} labelledBy={HEADING_ID} ref={ref}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow="The improvements"
          title={playbook.principlesHeading}
          lede={playbook.principlesLede}
        />

        {/*
         * The stage navigation.
         *
         * Plain anchor links, so it works before any JavaScript runs and works without it
         * entirely. The highlight is progressive enhancement — `useActiveSection` returns
         * null in a browser without IntersectionObserver and the links still navigate.
         *
         * On a phone it becomes a horizontal scroller rather than a fixed overlay: a
         * sticky bar covering a fifth of a small screen costs more than it gives.
         */}
        <nav className={styles['stageNav']} aria-label="The six stages">
          <ul className={styles['stageNavList']}>
            {playbookStages.map((stage) => {
              const anchor = stageAnchor(stage.id);
              const isActive = activeAnchor === anchor;

              return (
                <li key={stage.id}>
                  <a
                    href={`#${anchor}`}
                    className={`${styles['stageNavLink']} ${isActive ? styles['stageNavLinkActive'] : ''}`}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    <span className={styles['stageNavNumber']} aria-hidden="true">
                      {stage.number}
                    </span>
                    {stage.name}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {playbookStages.map((stage) => {
          const principles = playbook.principles.filter(
            (principle) => principle.stage === stage.id,
          );

          return <StageGroup key={stage.id} stage={stage} principles={principles} />;
        })}
      </Container>
    </Section>
  );
}

interface StageGroupProps {
  readonly stage: (typeof playbookStages)[number];
  readonly principles: readonly (typeof playbook.principles)[number][];
}

function StageGroup({ stage, principles }: StageGroupProps) {
  const anchor = stageAnchor(stage.id);
  const headingId = `${anchor}-heading`;

  /*
   * One event per stage rather than one per improvement. Six rows in a report tells you
   * how far people read; twenty near-identical rows tells you the same thing and makes
   * the report harder to read.
   */
  const watchStage = useInViewOnce(() => track('playbook_stage_viewed', { stage: stage.id }));

  return (
    <section
      className={styles['stageSection']}
      aria-labelledby={headingId}
      id={anchor}
      ref={watchStage}
    >
      <header className={styles['stageHeader']}>
        <span className={styles['stageHeaderNumber']} aria-hidden="true">
          {stage.number}
        </span>
        <div>
          <h3 id={headingId} className={styles['stageHeaderName']}>
            {stage.name}
          </h3>
          <p className={styles['stageHeaderQuestion']}>{stage.question}</p>
        </div>
      </header>

      <ol className={styles['plays']}>
        {principles.map((play, index) => (
          <Reveal as="li" key={play.id} sequence={index} className={styles['play']}>
            <div className={styles['playHead']}>
              <span className={styles['playNumber']} aria-hidden="true">
                {play.number}
              </span>
              <div>
                <p className={styles['playName']}>{play.name}</p>
                <h4 className={styles['playHeading']}>{play.heading}</h4>
              </div>
            </div>

            {/* The one sentence somebody remembers a week later. */}
            <p className={styles['metaConcept']}>{play.metaConcept}</p>

            <dl className={styles['playGrid']}>
              <div>
                <dt className={styles['playLabel']}>What goes wrong</dt>
                <dd className={styles['playValue']}>{play.uxProblem}</dd>
              </div>
              <div>
                <dt className={styles['playLabel']}>What it costs you</dt>
                <dd className={styles['playValue']}>{play.consequence}</dd>
              </div>
              <div>
                <dt className={styles['playLabel']}>The principle</dt>
                <dd className={styles['playPrinciple']}>{play.principle}</dd>
              </div>
            </dl>

            {play.example ? (
              <div className={styles['example']}>
                <p className={styles['exampleRow']}>
                  <span className={styles['exampleWeakLabel']}>{play.example.weakLabel}</span>
                  <span className={styles['exampleWeak']}>{play.example.weak}</span>
                </p>
                <p className={styles['exampleRow']}>
                  <span className={styles['exampleStrongLabel']}>{play.example.strongLabel}</span>
                  <span className={styles['exampleStrong']}>{play.example.strong}</span>
                </p>
                <p className={styles['exampleNote']}>{play.example.note}</p>
              </div>
            ) : null}

            <h5 className={styles['playListHeading']}>What to do</h5>
            <ul className={styles['playList']}>
              {play.practices.map((practice) => (
                <li key={practice} className={styles['playListItem']}>
                  <Icon name="check" size={16} className={styles['playMarker']} />
                  <span>{practice}</span>
                </li>
              ))}
            </ul>

            {play.chain ? (
              <ol className={styles['chain']}>
                {play.chain.map((link, linkIndex) => (
                  <li key={link} className={styles['chainStep']}>
                    <span>{link}</span>
                    {play.chain && linkIndex < play.chain.length - 1 ? (
                      <span className={styles['chainArrow']} aria-hidden="true">
                        <Icon name="arrow-right" size={16} />
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : null}

            {/*
             * The five-minute test. Given the strongest treatment of anything in the card
             * apart from the heading, because it is the only part a reader can act on
             * without deciding to change anything first.
             */}
            <div className={styles['quickTest']}>
              <p className={styles['quickTestLabel']}>Check this yourself, in five minutes</p>
              <p className={styles['quickTestBody']}>{play.quickTest}</p>
            </div>

            <p className={styles['whyItMatters']}>
              <span className={styles['whyLabel']}>Why it matters</span>
              {play.whyItMatters}
            </p>

            {play.research ? (
              <p className={styles['research']}>
                <span className={styles['researchLabel']}>Worth knowing</span>
                {play.research}
              </p>
            ) : null}

            {play.warning ? (
              <p className={styles['warning']}>
                <Icon name="alert" size={18} className={styles['warningIcon']} />
                <span>{play.warning}</span>
              </p>
            ) : null}

            {/*
             * The genuine overlaps, named rather than hidden. Four pairs of these
             * improvements sit next to each other on purpose, and a careful reader will
             * notice — so saying so is more honest than hoping they do not.
             */}
            {play.relatedPrinciples && play.relatedPrinciples.length > 0 ? (
              <p className={styles['related']}>
                <span className={styles['relatedLabel']}>Read alongside</span>
                {play.relatedPrinciples.map((relatedId, relatedIndex) => {
                  const related = principlesById.get(relatedId);
                  if (!related) return null;

                  return (
                    <span key={relatedId}>
                      {relatedIndex > 0 ? ', ' : ''}
                      <a href={`#${stageAnchor(related.stage)}`} className={styles['relatedLink']}>
                        {related.number} {related.name}
                      </a>
                    </span>
                  );
                })}
              </p>
            ) : null}

            {/* The one place an improvement is allowed to mention the paid service. */}
            {play.serviceNote ? <p className={styles['serviceNote']}>{play.serviceNote}</p> : null}
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
