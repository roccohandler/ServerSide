import { afterLaunch } from '../../../../content';
import { Badge, Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'after-launch-heading';

type Stage = (typeof afterLaunch.stages)[number];

/**
 * Launch → baseline → the first 30 days → the day-30 report → every month after.
 *
 * ## The question this section exists to answer
 *
 * "How will I know whether it worked, and when?" — which the site had no section for, and
 * every part of the answer to. The tracking was a technical bullet in a deliverable list;
 * the 30-day report was the fifth beat of a prose block inside the process section; the
 * monthly measurement was the last line of the plan's scope. A reader assembling the
 * sequence had to visit three places and infer the order.
 *
 * Drawn once, it does two things no amount of copy elsewhere was doing. It collapses the
 * perceived delay — the first real answer is about a month after launch, not a year — and it
 * makes the recurring service the continuation of something already moving rather than an
 * upsell that arrives afterwards.
 *
 * ## Two lists, not one, and that is the fix for a real defect
 *
 * The boundary between "included in the build" and "optional monthly" was first drawn by
 * injecting a divider into the first `<li>` of the partner group. It collided: `.launchNumber`
 * is absolutely positioned at `top: 0` of its step, so adding height above it inside the same
 * item slid the heading down and left the numeral sitting on the divider.
 *
 * Splitting the run into two `<ol>`s puts the boundary *between* two elements instead of
 * inside one, which is what it actually is. The second list continues the numbering from the
 * first — `start` for the browser, and the rendered numerals are offset by the same amount —
 * so a reader still sees one sequence of five. It also means the rail (`::before` on
 * `:not(:last-child)`) stops at the boundary on its own, which is correct: the run genuinely
 * breaks there.
 *
 * ## Why the rail is reused rather than reinvented
 *
 * `.launchList` / `.launchStep` / `.launchNumber` is the four-week build timeline's rail: one
 * column at every width, a 2px line drawn by `::before`, a filled numeral. It is exactly the
 * right shape and it already exists, so this adds no layout CSS — only the classes that mark
 * the conditional half.
 */
interface StageGroup {
  readonly id: string;
  readonly label: string;
  readonly conditional: boolean;
  /** Where this group's numbering starts, so five stages read as one run of five. */
  readonly offset: number;
  readonly stages: readonly Stage[];
}

export function AfterLaunchSection() {
  /*
   * The split is derived from `owner` rather than from an index, so inserting a stage cannot
   * silently move the line between "included" and "optional" — the failure a hard-coded
   * position invites, and the reason a test asserts the build stages stay contiguous.
   */
  const included = afterLaunch.stages.filter((stage) => stage.owner === 'build');
  const optional = afterLaunch.stages.filter((stage) => stage.owner === 'partner');

  /*
   * Two groups, mapped rather than written out twice — and mapped in one expression so the
   * `<ol>` and its `Reveal` children stay in the same block of JSX.
   *
   * That last part is load-bearing. `Reveal.test.tsx` scans the source for `sequence={` and
   * walks *backwards through the file* for the nearest list element, on the stated assumption
   * that every `Reveal` is a direct child of the list it belongs to. Extracting the item into a
   * helper function broke the assumption and correctly failed the guard: the content here is
   * genuinely ordered, but the check could no longer see that it was. Widening the guard would
   * mean parsing JSX, which its own comment rejects for good reason — so the component keeps
   * the invariant instead.
   */
  const groups: readonly StageGroup[] = [
    {
      id: 'included',
      label: afterLaunch.boundary.buildLabel,
      conditional: false,
      offset: 0,
      stages: included,
    },
    {
      id: 'optional',
      label: afterLaunch.boundary.partnerLabel,
      conditional: true,
      offset: included.length,
      stages: optional,
    },
  ].filter((group) => group.stages.length > 0);

  return (
    <Section labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={afterLaunch.eyebrow}
          title={afterLaunch.heading}
          lede={afterLaunch.lede}
        />

        {groups.map((group) => (
          <div key={group.id}>
            {/* The boundary, between the two lists rather than inside one. */}
            {group.conditional ? (
              <p className={styles['afterLaunchDivider']}>
                <Badge tone="accent">{group.label}</Badge>
              </p>
            ) : null}

            {/* `start` keeps the browser's own numbering continuous even though the visible
                numerals are drawn by hand — the two must not disagree. */}
            <ol className={styles['launchList']} start={group.offset + 1} aria-label={group.label}>
              {group.stages.map((stage, index) => (
                <Reveal
                  as="li"
                  key={stage.id}
                  sequence={group.offset + index}
                  className={
                    group.conditional
                      ? `${styles['launchStep']} ${styles['launchStepPartner']}`
                      : styles['launchStep']
                  }
                >
                  <span className={styles['launchNumber']} aria-hidden="true">
                    {group.offset + index + 1}
                  </span>
                  <div className={styles['launchBody']}>
                    <p className={styles['afterLaunchWhen']}>{stage.label}</p>
                    <h3 className={styles['launchTitle']}>{stage.title}</h3>
                    <p className={styles['launchDetail']}>{stage.description}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        ))}

        <p className={styles['afterLaunchNote']}>{afterLaunch.boundary.note}</p>
      </Container>
    </Section>
  );
}
