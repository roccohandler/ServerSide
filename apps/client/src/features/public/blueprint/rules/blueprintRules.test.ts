import { describe, expect, it } from 'vitest';
import { blueprint, blueprintQuestions } from '../../../../content/blueprint';
import {
  buildBlueprint,
  jobValueNote,
  PLANNED_RULES,
  UNKNOWABLE,
  type BlueprintAnswers,
} from './blueprintRules';

/*
 * ============================================================================
 * §32 — NEVER FABRICATE AN AUDIT
 * ============================================================================
 *
 * The brief is emphatic about this and it is the one rule this whole feature exists under:
 * twelve questions about somebody's *business* cannot say anything about their *website*, and
 * a plan that blurs the two is a plan that invents findings.
 *
 * Hedged wording is not a sufficient guard, because readers do not parse hedges — so the
 * separation is structural, and these are the tests that assert the structure rather than the
 * phrasing. Wording can be improved freely. Crossing the line fails the build.
 *
 * ## What "crossing the line" looks like in practice
 *
 * It is never a deliberate act. It is somebody adding a rule that reads *"your homepage
 * probably does not say what you do"* — which is a perfectly reasonable sentence to write,
 * follows from the answers about as well as anything else here, and is a claim about a page
 * nobody has opened. The vocabulary sweep below is what catches that.
 * ============================================================================
 */

/*
 * Second-person claims about a thing the reader owns and we have not seen.
 *
 * Deliberately not a ban on the word "website" — half the copy here is about what a website
 * should do, which is the entire point. What is banned is the possessive plus a *state*: the
 * grammar of a finding.
 */
const FABRICATION_SHAPES: readonly RegExp[] = [
  /\byour (?:website|site|homepage|pages?)\b[^.]{0,30}\b(?:is|are|does|doesn'?t|does not|has|hasn'?t|lacks|fails|loads|looks)\b/i,
  /\byour current (?:website|site)\b/i,
  /\b(?:we|our) (?:looked at|checked|scanned|reviewed|analysed|analyzed|tested) your\b/i,
  /\byour (?:website|site) (?:probably|likely|may|might)\b/i,
];

/** Every string a rule can put in front of a reader. */
const RULE_COPY = PLANNED_RULES.flatMap((rule) => [rule.title, rule.detail]);

describe('the Blueprint never describes a website nobody has seen', () => {
  it('asks nothing about the reader’s existing website', () => {
    const asked = blueprintQuestions.flatMap((question) => [
      question.prompt,
      question.hint ?? '',
      ...question.choices.map((choice) => choice.label),
    ]);

    for (const text of asked) {
      for (const shape of FABRICATION_SHAPES) {
        expect(
          shape.test(text),
          `a question asks about the reader's existing site, which this tool has not seen: "${text}"`,
        ).toBe(false);
      }
    }
  });

  it('never states anything about the reader’s existing website in a recommendation', () => {
    for (const text of RULE_COPY) {
      for (const shape of FABRICATION_SHAPES) {
        expect(
          shape.test(text),
          `a rule makes a claim about a site nobody has opened: "${text}"`,
        ).toBe(false);
      }
    }
  });

  /*
   * ==========================================================================
   * THE STRUCTURAL HALF, AND IT IS THE ONE THAT ACTUALLY HOLDS
   * ==========================================================================
   *
   * `UNKNOWABLE` takes no arguments. That is what makes it impossible for an answer-derived
   * string to reach the "what we would need to look at your site to say" heading — not
   * discipline, not review, but the absence of a parameter to pass one through.
   *
   * A future edit that gave it a signature would break this test, which is the point: the
   * change that would quietly turn the honest half of this page into a second list of
   * findings is exactly the change that cannot be made silently.
   * ==========================================================================
   */
  it('builds the unknowable half from nothing at all', () => {
    expect(UNKNOWABLE.length).toBeGreaterThan(3);

    /* A value, not a function. Nothing about the reader can be fed into it. */
    expect(typeof UNKNOWABLE).toBe('object');
    expect(Array.isArray(UNKNOWABLE)).toBe(true);
  });

  /*
   * And the two halves cannot share an entry. An id appearing on both sides would mean the
   * same sentence rendering under both headings, which is the confusion in its purest form.
   */
  it('keeps the two halves disjoint', () => {
    const planned = new Set(PLANNED_RULES.map((rule) => rule.id));

    for (const item of UNKNOWABLE) {
      expect(planned.has(item.id), `"${item.id}" appears in both halves of the result`).toBe(false);
    }
  });

  /*
   * The sentence that carries the whole arrangement. It is the first thing on the result, and
   * it is the first thing a shortening pass would cut.
   */
  it('says on the result that no website was looked at', () => {
    expect(blueprint.result.basis.toLowerCase()).toContain('not looked at your website');
  });
});

/*
 * ============================================================================
 * THE ENGINE
 * ============================================================================
 */
describe('building a plan', () => {
  const ANSWERS: BlueprintAnswers = {
    trade: ['hvac'],
    stage: ['new'],
    size: ['solo'],
    area: ['metro'],
    sources: ['referrals', 'repeat'],
    want: ['emergency'],
    customer: ['homes'],
    contact: ['phone'],
    answering: ['missed'],
    proof: ['photos'],
    blocker: ['volume'],
  };

  /*
   * Nobody may reach the end of twelve questions and be shown an empty page. One rule matches
   * unconditionally for exactly this reason, and this is what stops it being deleted as
   * redundant by somebody tidying the list.
   */
  it('always produces something, even from no answers at all', () => {
    expect(buildBlueprint({}).length).toBeGreaterThan(0);
  });

  it('orders the plan by what matters most to this reader', () => {
    const weights = PLANNED_RULES.filter((rule) => rule.match(ANSWERS)).map((rule) => rule.weight);
    const plan = buildBlueprint(ANSWERS);

    expect(plan).toHaveLength(weights.length);
    /* Descending, and stable — a plan that reshuffles between two loads is one nobody trusts twice. */
    expect(plan.map((item) => item.title)).toEqual(buildBlueprint(ANSWERS).map((i) => i.title));
    for (let index = 1; index < plan.length; index += 1) {
      const previous = PLANNED_RULES.find((rule) => rule.id === plan[index - 1]?.id);
      const current = PLANNED_RULES.find((rule) => rule.id === plan[index]?.id);
      expect(previous?.weight ?? 0).toBeGreaterThanOrEqual(current?.weight ?? 0);
    }
  });

  it('answers the answers it was given', () => {
    const plan = buildBlueprint(ANSWERS).map((item) => item.id);

    /* Urgent work, missed calls, and under two years — the three loudest things they said. */
    expect(plan).toContain('urgent-contact');
    expect(plan).toContain('missed-calls');
    expect(plan).toContain('new-proof');

    /* And not the ones they did not say. */
    expect(plan).not.toContain('seasonal');
    expect(plan).not.toContain('directory-exit');
  });

  /*
   * The rule that never fires from `match` alone. `referral-landing` requires word of mouth
   * *and* the absence of search, because a business that has both is not the business that
   * recommendation is written for — and a negated condition is the kind that silently stops
   * working when somebody adds a value to the question.
   */
  it('does not offer the referral plan to somebody who is also found by search', () => {
    const both = buildBlueprint({ ...ANSWERS, sources: ['referrals', 'search'] }).map((i) => i.id);
    expect(both).not.toContain('referral-landing');
    expect(both).toContain('search-foundation');
  });
});

/*
 * ============================================================================
 * EVERY QUESTION HAS TO CHANGE THE ANSWER
 * ============================================================================
 *
 * This is the guard the feature most needed and did not have.
 *
 * When the rules were first written, **no rule matched on `trade` and none on `jobValue`** —
 * so two of the twelve questions, including the *first* one and the one people are most
 * reluctant to answer, had no effect on the plan at all. Every test passed. The result looked
 * personalised. It simply was not, along those two axes.
 *
 * That is the failure a tool like this cannot survive: a reader who answers "roofing" and
 * gets a plan that would read identically for a dog groomer has been shown that the
 * personalisation was decoration, and every other claim on the page inherits the doubt.
 *
 * ## The test is mechanical rather than a matter of care
 *
 * For each question, it holds every *other* answer fixed and sweeps that question's own
 * choices. If two different answers to the same question can never produce different plans,
 * the question is decoration and this fails — by name, saying which one.
 *
 * It cannot be satisfied by adding a rule that merely mentions the field. The plans have to
 * actually differ.
 * ============================================================================
 */
describe('every question earns its place', () => {
  /* A complete set, so each sweep varies exactly one axis. */
  const BASE: BlueprintAnswers = {
    trade: ['hvac'],
    stage: ['established'],
    size: ['small'],
    area: ['local'],
    sources: ['search'],
    want: ['planned'],
    customer: ['homes'],
    contact: ['phone'],
    answering: ['someone'],
    proof: ['photos'],
    blocker: ['volume'],
    jobValue: ['250-1000'],
  };

  const plansFor = (id: string, values: readonly string[]) =>
    values.map((value) =>
      buildBlueprint({ ...BASE, [id]: [value] })
        .map((item) => item.id)
        .join('|'),
    );

  for (const question of blueprintQuestions) {
    it(`"${question.id}" changes the plan`, () => {
      const plans = new Set(
        plansFor(
          question.id,
          question.choices.map((c) => c.value),
        ),
      );

      expect(
        plans.size,
        `Answering "${question.prompt}" differently never produces a different plan. Either a rule ` +
          `should match on "${question.id}", or the question should not be asked — a reader who ` +
          `answers it and gets the same result has been shown the personalisation is decoration.`,
      ).toBeGreaterThan(1);
    });
  }

  /*
   * And the trade specifically, because it is question one and it is the answer that most
   * decides whether the reader believes the rest. Four businesses that are bought in four
   * genuinely different ways must not receive the same plan.
   */
  it('gives four differently-bought trades four different plans', () => {
    const plans = ['hvac', 'roofing', 'landscaping', 'photography'].map((trade) =>
      buildBlueprint({ ...BASE, trade: [trade] })
        .map((item) => item.id)
        .join('|'),
    );

    expect(new Set(plans).size).toBe(4);
  });
});

/*
 * ============================================================================
 * §53 — THE MONEY QUESTION NEVER BECOMES A PREDICTION
 * ============================================================================
 *
 * The one optional question buys the plan the right to be specific about what a job is worth.
 * It does not buy the right to say what a website will earn, and the distinction is the whole
 * reason the question was allowed in at all.
 *
 * "A job like that is worth $1,000 to $5,000, so one enquiry that goes elsewhere is a real
 * amount of money" restates something the reader already told us. "You could earn $52,000
 * more" is a forecast about a market nobody here controls — and it is the sentence this
 * feature would drift into within two edits if nothing stopped it.
 * ============================================================================
 */
describe('the job-value note', () => {
  const PROMISE_SHAPES: readonly RegExp[] = [
    /\byou (?:will|could|can expect to|would) (?:earn|make|get|win|book)\b/i,
    /\b(?:increase|double|grow|boost)\b[^.]{0,30}\b(?:revenue|income|jobs?|bookings?)\b/i,
    /\bper (?:year|month)\b[^.]{0,20}\bmore\b/i,
  ];

  it('is absent when they skipped it or said it varies', () => {
    expect(jobValueNote({})).toBeNull();
    expect(jobValueNote({ jobValue: ['varies'] })).toBeNull();
  });

  it('never predicts what a website will earn', () => {
    for (const band of ['under-250', '250-1000', '1000-5000', 'over-5000']) {
      const note = jobValueNote({ jobValue: [band] });
      expect(note, `no note for the "${band}" band`).not.toBeNull();

      for (const shape of PROMISE_SHAPES) {
        expect(shape.test(note ?? ''), `the ${band} note predicts a result: "${note}"`).toBe(false);
      }
    }
  });

  /*
   * Every band a question offers has to have a note, or the reader who picked it answered an
   * extra question for nothing. `varies` is the deliberate exception and is asserted above.
   */
  it('covers every band the question offers', () => {
    const question = blueprintQuestions.find((entry) => entry.id === 'jobValue');
    expect(question, 'the job-value question is gone').toBeDefined();

    for (const choice of question?.choices ?? []) {
      if (choice.value === 'varies') continue;
      expect(
        jobValueNote({ jobValue: [choice.value] }),
        `"${choice.value}" is offered as an answer and produces no note`,
      ).not.toBeNull();
    }
  });
});
