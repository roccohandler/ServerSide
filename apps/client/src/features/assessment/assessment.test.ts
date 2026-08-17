import { beforeEach, describe, expect, it } from 'vitest';
import { playbook } from '../../content/playbook';
import {
  clearAssessmentDraft,
  hasAssessmentDraft,
  readAssessmentDraft,
  saveAssessmentDraft,
  toSubmission,
} from './draft';
import { assessmentCategoriesAreMapped, assessmentFromAudit } from './fromAudit';

/*
 * The two pieces of the funnel that live entirely in the browser: the mapping from the
 * public audit's vocabulary to the stored one, and the draft that survives a sign-up.
 *
 * Both are the kind of code that fails silently. A category that maps to nothing is
 * dropped from a score without anybody noticing; a draft that fails to parse is twenty
 * answers gone. So the tests are mostly about the failure directions.
 */

const DRAFT = {
  businessName: 'Cascade Heating & Air',
  websiteUrl: 'https://cascadeheating.example',
  answers: [
    { questionId: 'speed', category: 'speed' as const, value: 2 },
    { questionId: 'mobile', category: 'mobile' as const, value: 4 },
  ],
};

beforeEach(() => {
  window.sessionStorage.clear();
});

describe('the audit-to-assessment mapping', () => {
  /*
   * The guard that makes the mapping exhaustive by construction. A twenty-first audit
   * category would otherwise be silently excluded from every score, which looks exactly
   * like nothing being wrong.
   */
  it('maps every one of the audit’s categories to a real theme', () => {
    const { unmapped, unknownThemes } = assessmentCategoriesAreMapped(
      playbook.scorecard.categories,
    );

    expect(
      unmapped,
      'these audit categories have no assessment theme, so they are dropped from the score',
    ).toEqual([]);
    expect(unknownThemes, 'these map to a theme that does not exist').toEqual([]);
  });

  it('doubles the audit’s 0–2 scale onto the assessment’s 0–4', () => {
    const submission = assessmentFromAudit({
      businessName: 'Cascade Heating & Air',
      categories: playbook.scorecard.categories,
      scores: { speed: 2, mobile: 0, clarity: 1 },
    });

    expect(submission?.answers).toEqual(
      expect.arrayContaining([
        { questionId: 'speed', category: 'speed', value: 4 },
        { questionId: 'mobile', category: 'mobile', value: 0 },
        { questionId: 'clarity', category: 'clarity', value: 2 },
      ]),
    );
  });

  /*
   * A blank is "they did not say", not "not at all". Scoring it zero would publish a
   * claim about somebody's website that they never made — on the page whose entire
   * credibility rests on being sober about exactly that.
   */
  it('omits unanswered categories rather than scoring them zero', () => {
    const submission = assessmentFromAudit({
      businessName: 'Cascade Heating & Air',
      categories: playbook.scorecard.categories,
      scores: { speed: 1 },
    });

    expect(submission?.answers).toHaveLength(1);
    expect(submission?.answers[0]?.questionId).toBe('speed');
  });

  it('produces nothing at all when nothing has been answered', () => {
    expect(
      assessmentFromAudit({
        businessName: 'Cascade Heating & Air',
        categories: playbook.scorecard.categories,
        scores: {},
      }),
    ).toBeNull();
  });

  it('carries the website and the trade when they are known', () => {
    const submission = assessmentFromAudit({
      businessName: 'Cascade Heating & Air',
      websiteUrl: 'https://cascadeheating.example',
      trade: 'hvac',
      categories: playbook.scorecard.categories,
      scores: { speed: 1 },
    });

    expect(submission?.websiteUrl).toBe('https://cascadeheating.example');
    expect(submission?.trade).toBe('hvac');
  });
});

describe('the assessment draft', () => {
  it('survives a round trip', () => {
    saveAssessmentDraft(DRAFT);

    const read = readAssessmentDraft();
    expect(read?.businessName).toBe('Cascade Heating & Air');
    expect(read?.answers).toHaveLength(2);
    expect(hasAssessmentDraft()).toBe(true);
  });

  it('strips its own bookkeeping before the draft is sent', () => {
    saveAssessmentDraft(DRAFT);

    const read = readAssessmentDraft();
    expect(read).toHaveProperty('savedAt');
    expect(toSubmission(read!)).not.toHaveProperty('savedAt');
  });

  it('is gone once cleared', () => {
    saveAssessmentDraft(DRAFT);
    clearAssessmentDraft();

    expect(readAssessmentDraft()).toBeNull();
    expect(hasAssessmentDraft()).toBe(false);
  });

  it('reports nothing when nothing was ever saved', () => {
    expect(readAssessmentDraft()).toBeNull();
  });

  /* ---------------------------------------------------------- hostile input */

  /*
   * Storage is user-writable and survives deploys. Everything below is a shape that
   * could genuinely be in there — hand-edited, left by an older release, or truncated —
   * and every one of them has to produce "no draft" rather than a malformed object
   * reaching a form that assumed its own shape.
   */
  it.each([
    ['not JSON at all', 'nonsense{'],
    ['a bare array', '[]'],
    ['null', 'null'],
    ['no business name', JSON.stringify({ answers: DRAFT.answers, savedAt: Date.now() })],
    ['no answers', JSON.stringify({ businessName: 'X', savedAt: Date.now() })],
    ['an empty answer list', JSON.stringify({ businessName: 'X', answers: [], savedAt: 1 })],
    [
      'an answer with an unknown category',
      JSON.stringify({
        businessName: 'X',
        answers: [{ questionId: 'a', category: 'astrology', value: 2 }],
        savedAt: Date.now(),
      }),
    ],
    [
      'an answer outside the scale',
      JSON.stringify({
        businessName: 'X',
        answers: [{ questionId: 'a', category: 'speed', value: 99 }],
        savedAt: Date.now(),
      }),
    ],
    [
      'a fractional answer',
      JSON.stringify({
        businessName: 'X',
        answers: [{ questionId: 'a', category: 'speed', value: 1.5 }],
        savedAt: Date.now(),
      }),
    ],
    ['no timestamp', JSON.stringify({ businessName: 'X', answers: DRAFT.answers })],
  ])('discards %s', (_name, stored) => {
    window.sessionStorage.setItem('jobforge.assessment.draft', stored);

    expect(readAssessmentDraft()).toBeNull();
    // And it cleans up after itself, so the same bad value is not re-parsed every load.
    expect(window.sessionStorage.getItem('jobforge.assessment.draft')).toBeNull();
  });

  /*
   * A draft nobody came back for. Submitting it later would attach stale answers about
   * a website that may since have been rebuilt to a brand-new account.
   */
  it('discards a draft that is hours old', () => {
    window.sessionStorage.setItem(
      'jobforge.assessment.draft',
      JSON.stringify({
        ...DRAFT,
        savedAt: Date.now() - 3 * 60 * 60 * 1000,
      }),
    );

    expect(readAssessmentDraft()).toBeNull();
  });

  it('keeps a draft from a few minutes ago', () => {
    window.sessionStorage.setItem(
      'jobforge.assessment.draft',
      JSON.stringify({ ...DRAFT, savedAt: Date.now() - 60_000 }),
    );

    expect(readAssessmentDraft()).not.toBeNull();
  });
});
