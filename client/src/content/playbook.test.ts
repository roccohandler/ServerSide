import { describe, expect, it } from 'vitest';
import { playbook, playbookStages } from './playbook';
import { qualification } from './qualification';
import { idealCustomer, serviceArea } from '../config/market';
import { bandFor } from '../features/playbook/useWebsiteScore';

/*
 * ============================================================================
 * THE PLAYBOOK'S OWN GUARDS
 * ============================================================================
 *
 * The content model is enforced by the compiler — `PlaybookPrinciple` requires every
 * field, so a half-written improvement will not build. What types cannot check is
 * everything below: that there are exactly twenty, that the numbering tells the truth,
 * that every scorecard category points at an improvement that exists, and that the
 * qualification copy never tells anybody they do not qualify.
 * ============================================================================
 */

describe('the twenty improvements', () => {
  it('is exactly twenty of them', () => {
    expect(playbook.principles).toHaveLength(20);
  });

  it('gives every improvement a unique id', () => {
    const ids = playbook.principles.map((principle) => principle.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  /*
   * The numbers run 01–20 down the page in stage order, so the sticky navigation and the
   * numbering can never disagree. Getting this wrong is invisible in review and obvious
   * to anybody reading the page.
   */
  it('numbers them 01 to 20, in order', () => {
    playbook.principles.forEach((principle, index) => {
      expect(principle.number).toBe(String(index + 1).padStart(2, '0'));
    });
  });

  it('keeps each stage contiguous, in the order the stages are declared', () => {
    const stageOrder = playbookStages.map((stage) => stage.id);
    const seen = playbook.principles.map((principle) => stageOrder.indexOf(principle.stage));

    expect(seen).not.toContain(-1);
    // Non-decreasing: every improvement is in the same stage as the last, or a later one.
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  it('puts at least one improvement in every stage', () => {
    for (const stage of playbookStages) {
      const count = playbook.principles.filter((p) => p.stage === stage.id).length;
      expect(count, `${stage.name} has no improvements`).toBeGreaterThan(0);
    }
  });

  /*
   * §26: fail loudly on malformed content. The compiler catches a missing field; this
   * catches a field filled in with a placeholder-ish scrap to make it compile.
   */
  it('gives every improvement real content in every required part', () => {
    for (const principle of playbook.principles) {
      const label = `${principle.number} ${principle.name}`;

      expect(principle.metaConcept.length, `${label}: metaConcept`).toBeGreaterThan(25);
      expect(principle.uxProblem.length, `${label}: uxProblem`).toBeGreaterThan(30);
      expect(principle.consequence.length, `${label}: consequence`).toBeGreaterThan(30);
      expect(principle.principle.length, `${label}: principle`).toBeGreaterThan(25);
      expect(principle.quickTest.length, `${label}: quickTest`).toBeGreaterThan(30);
      expect(principle.whyItMatters.length, `${label}: whyItMatters`).toBeGreaterThan(30);
      expect(principle.practices.length, `${label}: practices`).toBeGreaterThanOrEqual(3);
    }
  });

  it('points every cross-reference at an improvement that exists', () => {
    const ids = new Set(playbook.principles.map((principle) => principle.id));

    for (const principle of playbook.principles) {
      for (const related of principle.relatedPrinciples ?? []) {
        expect(ids.has(related), `${principle.id} references unknown "${related}"`).toBe(true);
        expect(related, `${principle.id} references itself`).not.toBe(principle.id);
      }
    }
  });

  /*
   * The quick test is the only part a reader can act on without first deciding to change
   * something, which makes it the most likely thing on the page to actually get done. It
   * has to be a thing you do, not a thing you consider.
   */
  it('makes every quick test something a person performs', () => {
    for (const principle of playbook.principles) {
      expect(
        principle.quickTest,
        `${principle.number} ${principle.name}: the quick test should be an instruction`,
      ).toMatch(
        /open|count|read|run|write|score|blur|show|submit|time|click|put|press|list|answer|screenshot|search|take|when did/i,
      );
    }
  });

  /* Examples across many trades, so the resource reads as applying to service businesses. */
  it('draws its examples from more than a handful of trades', () => {
    const copy = JSON.stringify(playbook.principles).toLowerCase();
    const trades = [
      'hvac',
      'plumb',
      'electric',
      'roof',
      'landscap',
      'tree',
      'garage door',
      'concrete',
      'clean',
      'paint',
      'remodel',
      'pest',
      'floor',
    ];

    const mentioned = trades.filter((trade) => copy.includes(trade));
    expect(mentioned.length).toBeGreaterThanOrEqual(8);
  });
});

describe('the six stages', () => {
  it('is exactly six, numbered in order', () => {
    expect(playbookStages).toHaveLength(6);
    playbookStages.forEach((stage, index) => {
      expect(stage.number).toBe(String(index + 1).padStart(2, '0'));
    });
  });

  it('gives every stage a question a reader can answer about their own site', () => {
    for (const stage of playbookStages) {
      expect(stage.question).toMatch(/\?$/);
      expect(stage.summary.length).toBeGreaterThan(40);
    }
  });
});

/* ------------------------------------------------------------------ scorecard */

describe('the 40-point assessment', () => {
  const { scorecard } = playbook;

  it('has one category per improvement, and forty points available', () => {
    expect(scorecard.categories).toHaveLength(playbook.principles.length);
    expect(scorecard.categories.length * 2).toBe(40);
  });

  it('points every category at an improvement that explains it', () => {
    const ids = new Set(playbook.principles.map((principle) => principle.id));

    for (const category of scorecard.categories) {
      expect(
        ids.has(category.principleId),
        `category "${category.id}" points at unknown improvement "${category.principleId}"`,
      ).toBe(true);
    }
  });

  it('asks every category as a question', () => {
    for (const category of scorecard.categories) {
      expect(category.prompt, `${category.label}`).toMatch(/\?$/);
    }
  });

  it('scores zero to two, and says what each means', () => {
    expect(scorecard.scale.map((point) => point.value)).toEqual(['0', '1', '2']);
    for (const point of scorecard.scale) expect(point.label.length).toBeGreaterThan(3);
  });

  /*
   * The bands have to cover 0 through 40 with no gap and no overlap, or a real score
   * resolves to nothing and the result panel silently shows the empty state.
   */
  it('covers every possible score with exactly one band', () => {
    for (let score = 0; score <= 40; score += 1) {
      const matching = scorecard.bands.filter((band) => score >= band.min && score <= band.max);
      expect(matching, `score ${score} matches ${matching.length} bands`).toHaveLength(1);
    }

    expect(scorecard.bands[0]?.min).toBe(0);
    expect(scorecard.bands.at(-1)?.max).toBe(40);
  });

  it('resolves a score to the band its range describes', () => {
    for (const band of scorecard.bands) {
      expect(bandFor(band.min)?.id).toBe(band.id);
      expect(bandFor(band.max)?.id).toBe(band.id);
      // And the printed range agrees with the numbers behind it.
      expect(band.range).toContain(String(band.min));
      expect(band.range).toContain(String(band.max));
    }
  });

  /*
   * The most important sentence in the whole assessment. Without it this is a made-up
   * number presented as a diagnosis.
   */
  it('says out loud that it is not a validated benchmark', () => {
    expect(scorecard.disclaimer).toMatch(/illustrative/i);
    expect(scorecard.disclaimer).toMatch(/not a validated benchmark/i);
  });

  it('promises nothing about revenue or leads from a score', () => {
    const copy = [scorecard.lede, scorecard.disclaimer, ...scorecard.bands.map((band) => band.body)]
      .join(' ')
      .toLowerCase();

    for (const forbidden of ['guarantee', 'revenue you', 'predicts', 'will get you']) {
      expect(copy).not.toContain(forbidden);
    }
  });
});

/* ------------------------------------------------------------------ priorities */

describe('the priority tiers', () => {
  it('covers every improvement exactly once', () => {
    const listed = playbook.priorities.tiers.flatMap((tier) => tier.principleIds);
    const ids = playbook.principles.map((principle) => principle.id);

    expect(new Set(listed).size).toBe(listed.length);
    expect([...listed].sort()).toEqual([...ids].sort());
  });

  it('puts the quick, high-impact fixes first', () => {
    const first = playbook.priorities.tiers[0];
    expect(first?.principleIds).toContain('clarity');
    expect(first?.principleIds).toContain('mobile');
    expect(first?.principleIds).toContain('cta');
  });
});

/* ------------------------------------------------------------------ qualification */

describe('who the service is for', () => {
  /*
   * The single most important thing about this section. A business that is too small this
   * year is a client in three, and being told "you do not qualify" is the one thing they
   * will remember. It is a recommendation engine, not an application form.
   */
  it('never tells anybody they do not qualify', () => {
    const copy = JSON.stringify(qualification).toLowerCase();

    for (const forbidden of [
      'do not qualify',
      "don't qualify",
      'not eligible',
      'rejected',
      'we only work with',
      'too small',
      'unfortunately',
    ]) {
      expect(copy, `qualification copy says "${forbidden}"`).not.toContain(forbidden);
    }
  });

  it('offers a genuinely useful path to anybody outside the profile', () => {
    expect(qualification.otherwise.body).toMatch(/playbook/i);
    // And the free review stays open to everybody, whatever size they are.
    expect(qualification.otherwise.reviewNote).toMatch(/anybody|whatever size/i);
  });

  it('keeps a way in for somebody who thinks the guideline is wrong about them', () => {
    expect(qualification.exception.heading).toBeTruthy();
    expect(qualification.exception.body).toMatch(/generalisation|generalization/i);
  });

  it('leads with the reason rather than the number', () => {
    // The rationale is in the lede; the figure is in a separate, later note.
    expect(qualification.lede).toContain(idealCustomer.rationale);
    expect(qualification.lede).not.toContain('$');
  });

  it('describes the fit with more than just revenue', () => {
    expect(qualification.signals.length).toBeGreaterThanOrEqual(5);
  });
});

describe('the market configuration', () => {
  it('is the single source of the service area', () => {
    expect(serviceArea.cities.length).toBeGreaterThan(0);
    expect(new Set(serviceArea.cities).size).toBe(serviceArea.cities.length);
    expect(serviceArea.short).toBe('Greater Seattle');
  });

  it('does not claim to turn up on site outside the area', () => {
    expect(serviceArea.remotePolicy).toMatch(/remotely/i);
  });

  it('keeps the revenue guideline switchable in one place', () => {
    expect(typeof idealCustomer.showRevenueGuideline).toBe('boolean');

    if (!idealCustomer.showRevenueGuideline) {
      expect(qualification.revenueNote).toBeNull();
    } else {
      expect(qualification.revenueNote).toContain(idealCustomer.revenueGuideline);
      // Stated as a guideline, never as a rule about who may make contact.
      expect(qualification.revenueNote).toMatch(/guideline/i);
    }
  });
});
