import { useCallback, useMemo, useState } from 'react';
import { blueprintQuestions } from '../../../content/blueprint';
import type { BlueprintAnswers } from './rules/blueprintRules';

/*
 * ============================================================================
 * TWELVE QUESTIONS, ONE AT A TIME
 * ============================================================================
 *
 * One question per screen rather than a twelve-question form, and it is the same judgement
 * the audit made for the same reason: a form of twelve is a commitment somebody weighs up
 * before starting, and twelve screens of one is twelve decisions each of which is obviously
 * cheap. The progress line is what makes that honest rather than a trick — it says how many
 * are left, always.
 *
 * ## Nothing is stored anywhere
 *
 * State lives here, in the component tree, for the life of the tab. **Not `localStorage`**,
 * unlike the audit and the PlayBook scorecard — those are twenty-question scorecards somebody
 * might genuinely come back to across a week, and this is five minutes end to end. Persisting
 * it would mean a returning visitor met a half-finished plan they had forgotten starting, and
 * would make the privacy line ("close the tab and nothing is stored") false.
 *
 * The draft written on the way to signing up is `sessionStorage`, which the credential pages
 * already read — see `AuditKeepResults` for the same handoff.
 * ============================================================================
 */

export interface BlueprintState {
  readonly answers: BlueprintAnswers;
  /** The question on screen, or `null` once every question has been passed. */
  readonly current: (typeof blueprintQuestions)[number] | null;
  readonly step: number;
  readonly total: number;
  /** True once the reader has reached the result. */
  readonly finished: boolean;
  /** True when the current question has an answer, so `Next` means something. */
  readonly answered: boolean;
  choose(value: string): void;
  next(): void;
  back(): void;
  restart(): void;
}

export function useBlueprint(): BlueprintState {
  const [answers, setAnswers] = useState<BlueprintAnswers>({});
  const [index, setIndex] = useState(0);

  const total = blueprintQuestions.length;
  const finished = index >= total;
  const current = finished ? null : (blueprintQuestions[index] ?? null);

  const choose = useCallback(
    (value: string) => {
      if (!current) return;

      setAnswers((previous) => {
        const existing = previous[current.id] ?? [];

        /*
         * A multi-select toggles; a single-select replaces. Toggling rather than only adding
         * matters more than it looks: the two multi-select questions are about reality, and a
         * reader who taps the wrong one has no other way to take it back.
         */
        const next = current.multiple
          ? existing.includes(value)
            ? existing.filter((entry) => entry !== value)
            : [...existing, value]
          : [value];

        return { ...previous, [current.id]: next };
      });
    },
    [current],
  );

  /*
   * A single-select question advances on its own; a multi-select waits for `Next`.
   *
   * That asymmetry is deliberate and it is the whole feel of the thing. Auto-advancing a
   * single choice removes a tap from ten of the twelve screens; auto-advancing a multi-select
   * would make the second option impossible to reach.
   */
  const next = useCallback(() => setIndex((value) => Math.min(value + 1, total)), [total]);
  const back = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), []);

  const restart = useCallback(() => {
    setAnswers({});
    setIndex(0);
  }, []);

  const answered = current ? (answers[current.id] ?? []).length > 0 : false;

  return useMemo(
    () => ({
      answers,
      current,
      step: index + 1,
      total,
      finished,
      answered,
      choose,
      next,
      back,
      restart,
    }),
    [answers, current, index, total, finished, answered, choose, next, back, restart],
  );
}
