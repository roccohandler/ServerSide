import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button, ButtonLink, Container, Icon, Section, SectionHeading } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { findPageMeta } from '../../../content';
import { blueprint } from '../../../content/blueprint';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { track } from '../../../lib/analytics';
import { buildBlueprint, jobValueNote, UNKNOWABLE } from './rules/blueprintRules';
import { useBlueprint } from './useBlueprint';
import styles from './Blueprint.module.css';

const meta = findPageMeta(routes.blueprint);

/*
 * ============================================================================
 * `/blueprint`
 * ============================================================================
 *
 * DECISION 042. Twelve questions about somebody's **business**, and a plan for what a website
 * for a business like theirs has to do.
 *
 * ## The one rule this page exists to keep
 *
 * §32 of the brief: *never fabricate an audit*. Nothing here has looked at the reader's
 * website, so nothing here may describe it. That is enforced structurally rather than by
 * careful wording, in three places:
 *
 *   1. `content/blueprint.ts` asks only about the business. A test sweeps it.
 *   2. `rules/blueprintRules.ts` splits the output in two. `UNKNOWABLE` **takes no arguments**,
 *      so no answer-derived string can reach the second heading by any path.
 *   3. This page renders them under two separate headings with different styling, because
 *      readers do not parse hedges and a single list of carefully-qualified sentences would
 *      be read as findings about their site.
 *
 * ## Why the result is free
 *
 * The same exchange `/audit` already makes, in the same order: value first, then the ask. A
 * reader who has answered twelve questions has earned the answer; asking for an account
 * *before* showing it would be a toll rather than a trade. The account is offered underneath,
 * to keep it.
 *
 * ## `lazy()` and the budget
 *
 * Dynamically imported from `app/routes/marketingRoutes.tsx`, and `content/blueprint.ts` is
 * deliberately absent from the content barrel — twelve questions and twenty-odd rules in the
 * chunk every visitor to the homepage downloads is exactly what `scripts/check-budget.ts`
 * exists to fail over.
 * ============================================================================
 */
export function BlueprintPage() {
  useDocumentMeta(meta ?? { path: routes.blueprint, title: 'Website Blueprint', description: '' });

  const state = useBlueprint();

  /*
   * One event on arrival, and one on completion. Deliberately not one per question: twelve
   * near-identical rows tell you the same thing as a start and a finish while making the
   * report worse — the same judgement `playbook_stage_viewed` records at greater length.
   */
  useEffect(() => {
    track('blueprint_started');
  }, []);

  const finished = state.finished;

  useEffect(() => {
    if (finished) track('blueprint_completed');
  }, [finished]);

  if (!state.finished && state.current) {
    const question = state.current;
    const chosen = state.answers[question.id] ?? [];

    return (
      <Section labelledBy="blueprint-heading">
        <Container narrow>
          <SectionHeading
            id="blueprint-heading"
            level={1}
            eyebrow={blueprint.eyebrow}
            title={blueprint.heading}
            lede={blueprint.lede}
          />

          <p className={styles['assurance']}>
            {blueprint.intro.time} · {blueprint.intro.cost}
          </p>

          {/*
           * The progress line, and it says how many are left rather than how far they have
           * come. "Question 3 of 12" is the number somebody is actually deciding on, and
           * hiding it is the trick this page is built not to play.
           */}
          <p className={styles['progress']} aria-live="polite">
            {blueprint.progressLabel(state.step, state.total)}
          </p>

          <div className={styles['question']}>
            <h2 className={styles['prompt']}>{question.prompt}</h2>
            {question.hint ? <p className={styles['hint']}>{question.hint}</p> : null}

            {/*
             * Buttons rather than radios, and `aria-pressed` rather than a checked state.
             *
             * A single-select advances on tap, so these are actions rather than a form that is
             * submitted later — and a radio that navigates on selection is a control lying
             * about what it is. The multi-select ones stay pressed and wait for `Next`.
             */}
            <ul className={styles['choices']}>
              {question.choices.map((choice) => {
                const selected = chosen.includes(choice.value);

                return (
                  <li key={choice.value}>
                    <button
                      type="button"
                      className={styles['choice']}
                      aria-pressed={selected}
                      onClick={() => {
                        state.choose(choice.value);
                        if (!question.multiple) state.next();
                      }}
                    >
                      <span>{choice.label}</span>
                      {selected ? <Icon name="check" size={18} /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className={styles['controls']}>
            {state.step > 1 ? (
              <Button variant="secondary" onClick={state.back}>
                {blueprint.backLabel}
              </Button>
            ) : null}

            {/*
             * `Next` appears for a multi-select, which has nothing else to advance it, and for
             * an optional question, which has to be passable without an answer. A single-select
             * needs neither and does not get one.
             */}
            {question.multiple ? (
              <Button onClick={state.next} disabled={!state.answered}>
                {state.step === state.total ? blueprint.finishLabel : blueprint.nextLabel}
              </Button>
            ) : null}

            {question.optional ? (
              <Button variant="ghost" onClick={state.next}>
                {blueprint.skipLabel}
              </Button>
            ) : null}
          </div>

          <p className={styles['privacy']}>{blueprint.intro.privacy}</p>
        </Container>
      </Section>
    );
  }

  const plan = buildBlueprint(state.answers);
  const valueNote = jobValueNote(state.answers);

  return (
    <>
      <Section labelledBy="blueprint-result-heading">
        <Container narrow>
          <SectionHeading
            id="blueprint-result-heading"
            level={1}
            eyebrow={blueprint.result.eyebrow}
            title={blueprint.result.heading}
          />

          {/*
           * The first thing on the result, before anything that could be mistaken for a
           * finding. A reader who believes we looked at their site will read every line below
           * as a verdict on it, and by then it is too late to say otherwise.
           */}
          <p className={styles['basis']}>{blueprint.result.basis}</p>
        </Container>
      </Section>

      <Section labelledBy="blueprint-planned-heading" tone="muted">
        <Container narrow>
          <SectionHeading
            id="blueprint-planned-heading"
            level={2}
            title={blueprint.result.plannedHeading}
            lede={blueprint.result.plannedLede}
          />

          <ol className={styles['plan']}>
            {plan.map((item) => (
              <li key={item.id} className={styles['planItem']}>
                <h3 className={styles['planTitle']}>{item.title}</h3>
                <p className={styles['planDetail']}>{item.detail}</p>
              </li>
            ))}
          </ol>

          {valueNote ? <p className={styles['valueNote']}>{valueNote}</p> : null}
        </Container>
      </Section>

      {/*
       * The second half, and it is a different section rather than a differently-styled block
       * inside the first. §32: readers do not parse hedges, and the only reliable way to say
       * "this is a different kind of statement" is to put it somewhere different.
       */}
      <Section labelledBy="blueprint-unknown-heading">
        <Container narrow>
          <SectionHeading
            id="blueprint-unknown-heading"
            level={2}
            title={blueprint.result.unknownHeading}
            lede={blueprint.result.unknownLede}
          />

          <ul className={styles['unknown']}>
            {UNKNOWABLE.map((item) => (
              <li key={item.id} className={styles['unknownItem']}>
                {item.title}
              </li>
            ))}
          </ul>

          <div className={styles['handoff']}>
            <h3 className={styles['handoffHeading']}>{blueprint.result.handoff.heading}</h3>
            <p className={styles['handoffBody']}>{blueprint.result.handoff.body}</p>
            <ButtonLink
              to={blueprint.result.handoff.cta.to}
              size="lg"
              onClick={() => track('cta_clicked', { location: 'blueprint-assessment' })}
            >
              {blueprint.result.handoff.cta.label}
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/*
       * ======================================================================
       * THE STEP THAT WAS MISSING — DECISION 043
       * ======================================================================
       *
       * The result went from a personalised strategy straight to an offer of a *free
       * assessment*: somebody who had just described their business and been shown what their
       * website should do was offered another free thing. A funnel with no floor.
       *
       * This is the floor, and it sits **after** the honest half rather than before it. The
       * reader has been told plainly that nobody has looked at their site, and only then is
       * the build offered — which is the order that makes the offer credible instead of
       * making the recommendations read as sales copy.
       * ======================================================================
       */}
      <Section labelledBy="blueprint-build-heading" tone="brand">
        <Container narrow>
          <SectionHeading
            id="blueprint-build-heading"
            level={2}
            eyebrow={blueprint.result.build.eyebrow}
            title={blueprint.result.build.heading}
            lede={blueprint.result.build.lede}
          />

          <ul className={styles['buildFacts']}>
            {blueprint.result.build.facts.map((fact) => (
              <li key={fact}>{fact}</li>
            ))}
          </ul>

          {blueprint.result.build.standardNote ? (
            <p className={styles['buildStandard']}>{blueprint.result.build.standardNote}</p>
          ) : null}

          <div className={styles['buildActions']}>
            <ButtonLink
              to={blueprint.result.build.cta.to}
              size="lg"
              onClick={() => track('cta_clicked', { location: 'blueprint-build' })}
            >
              {blueprint.result.build.cta.label}
            </ButtonLink>
            <Link to={routes.pricing} className={styles['buildSecondary']}>
              See everything that is included
            </Link>
          </div>

          <p className={styles['buildNote']}>{blueprint.result.build.note}</p>
        </Container>
      </Section>

      <Section labelledBy="blueprint-limits-heading" tone="muted">
        <Container narrow>
          <h2 id="blueprint-limits-heading" className={styles['limitsHeading']}>
            What this is not
          </h2>
          <p className={styles['limits']}>{blueprint.result.limits}</p>

          <Button variant="ghost" onClick={state.restart}>
            Answer them again
          </Button>
        </Container>
      </Section>
    </>
  );
}
