import { useEffect, useRef } from 'react';
import { playbook, playbookStages } from '../../../../content/playbook';
import { sections } from '../../../../config/routes';
import { Container, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Button } from '../../../../components/ui/Button';
import { Icon } from '../../../../components/ui/Icon';
import { ScoreScale } from '../../../../components/patterns/ScoreScale';
import { track } from '../../../../lib/analytics';
import { useWebsiteScore, type CategoryScore } from '../useWebsiteScore';
import { stageAnchor } from '../stageAnchor';
import styles from '../Assessment.module.css';

const HEADING_ID = 'playbook-assessment-heading';

const stagesById = new Map(playbookStages.map((stage) => [stage.id, stage]));

/**
 * The 40-point self-assessment.
 *
 * Twenty categories, two points each. The total is the least interesting output — the
 * five weakest categories are the point, because that is a work list somebody can start
 * on Monday rather than a number they can feel bad about.
 *
 * Three things this deliberately does:
 *
 *   - **Every category is readable before anything is interactive.** The label and the
 *     prompt are ordinary text; only the scoring needs JavaScript. A crawler, a printer
 *     and a browser with a failed bundle all still get the whole assessment.
 *   - **Real radios in real fieldsets.** Each category is a `radiogroup` with its prompt
 *     as the legend, so it is operable with a keyboard and announced properly. A grid of
 *     styled divs would have been less code and unusable for some of the people this
 *     PlayBook spends a whole improvement telling you to care about.
 *   - **Nothing leaves the browser.** Scores are in `localStorage`, the copy says so, and
 *     there is a visible control to clear them.
 */
export function PlayBookAssessment() {
  const {
    scores,
    total,
    maxTotal,
    answered,
    categoryCount,
    isComplete,
    hasStarted,
    band,
    weakest,
    setScore,
    reset,
  } = useWebsiteScore();

  const { scorecard } = playbook;

  /*
   * Two events, fired once each. `hasStarted` and `isComplete` both go from false to true
   * exactly once per visit unless somebody resets, which is the behaviour we want to
   * count anyway.
   */
  const startedRef = useRef(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (hasStarted && !startedRef.current) {
      startedRef.current = true;
      track('assessment_started');
    }
  }, [hasStarted]);

  useEffect(() => {
    if (isComplete && !completedRef.current) {
      completedRef.current = true;
      track('assessment_completed', { score: total });
    }
  }, [isComplete, total]);

  return (
    <Section id={sections.assessment} labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={scorecard.eyebrow}
          title={scorecard.heading}
          lede={scorecard.lede}
        />

        <p className={styles['instructions']}>{scorecard.instructions}</p>

        {/* The scale, as a key rather than as a control. */}
        <ul className={styles['scale']}>
          {scorecard.scale.map((point) => (
            <li key={point.value} className={styles['scalePoint']}>
              <span className={styles['scaleValue']}>{point.value}</span>
              {point.label}
            </li>
          ))}
        </ul>

        {/*
         * The running total.
         *
         * `aria-live="polite"` so a screen-reader user hears the score change as they
         * work, without it interrupting them mid-question.
         */}
        <div className={styles['totalPanel']}>
          <p className={styles['totalLabel']}>{scorecard.totalLabel}</p>
          <p className={styles['total']} aria-live="polite">
            {hasStarted ? (
              <>
                <span className={styles['totalValue']}>{total}</span>
                <span className={styles['totalMax']}> / {maxTotal}</span>
              </>
            ) : (
              <span className={styles['totalEmpty']}>{scorecard.unscoredLabel}</span>
            )}
          </p>
          <p className={styles['totalProgress']}>
            {answered} of {categoryCount} scored
          </p>

          {hasStarted ? (
            <Button type="button" variant="ghost" onClick={reset}>
              {scorecard.resetLabel}
            </Button>
          ) : null}
        </div>

        <ol className={styles['categories']}>
          {scorecard.categories.map((category) => {
            const stage = stagesById.get(category.stage);
            const current = scores[category.id];
            const legendId = `score-${category.id}-legend`;

            return (
              <li key={category.id} className={styles['category']}>
                <fieldset className={styles['fieldset']} aria-describedby={legendId}>
                  <legend className={styles['legend']}>
                    <span className={styles['categoryLabel']}>{category.label}</span>
                    {stage ? <span className={styles['categoryStage']}>{stage.name}</span> : null}
                  </legend>

                  <p id={legendId} className={styles['prompt']}>
                    {category.prompt}
                  </p>

                  <ScoreScale
                    group={`score-${category.id}`}
                    points={scorecard.scale}
                    selected={current}
                    onSelect={(value) => setScore(category.id, value as CategoryScore)}
                    layout="grid"
                  />
                </fieldset>
              </li>
            );
          })}
        </ol>

        <p className={styles['storageNote']}>{scorecard.storageNote}</p>

        {/* ------------------------------------------------------------ result */}

        <div className={styles['result']}>
          {isComplete && band ? (
            <>
              <p className={styles['bandRange']}>{band.range}</p>
              <h3 className={styles['bandTitle']}>{band.title}</h3>
              <p className={styles['bandBody']}>{band.body}</p>
            </>
          ) : (
            <>
              <h3 className={styles['bandTitle']}>{scorecard.result.emptyHeading}</h3>
              <p className={styles['bandBody']}>{scorecard.result.emptyBody}</p>
            </>
          )}

          {/*
           * The work list. Only produced once everything is scored — ranking the
           * categories somebody happened to answer first would look like an answer while
           * being worse than none.
           */}
          {isComplete ? (
            weakest.length > 0 ? (
              <div className={styles['weakest']}>
                <h4 className={styles['weakestHeading']}>{scorecard.result.heading}</h4>
                <p className={styles['weakestLede']}>{scorecard.result.lede}</p>

                <ol className={styles['weakestList']}>
                  {weakest.map(({ category, score }) => {
                    const stage = stagesById.get(category.stage);

                    return (
                      <li key={category.id} className={styles['weakestItem']}>
                        <span className={styles['weakestScore']} aria-hidden="true">
                          {score}
                        </span>
                        <div>
                          <p className={styles['weakestLabel']}>{category.label}</p>
                          <p className={styles['weakestPrompt']}>{category.prompt}</p>
                          {stage ? (
                            <a
                              href={`#${stageAnchor(category.stage)}`}
                              className={styles['weakestLink']}
                            >
                              {scorecard.result.readMore}
                              <Icon name="arrow-right" size={14} />
                            </a>
                          ) : null}
                        </div>
                        {/* Announced for screen readers, since the number alone is decorative. */}
                        <span className="visually-hidden">Scored {score} out of 2</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            ) : (
              <div className={styles['weakest']}>
                <h4 className={styles['weakestHeading']}>{scorecard.result.perfectHeading}</h4>
                <p className={styles['weakestLede']}>{scorecard.result.perfectBody}</p>
              </div>
            )
          ) : null}
        </div>

        {/* The bands are a way of deciding what to do next, not a measurement of anything. */}
        <p className={styles['disclaimer']}>{scorecard.disclaimer}</p>
      </Container>
    </Section>
  );
}
