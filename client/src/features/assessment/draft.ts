import type { AssessmentAnswer, AssessmentCategory, AssessmentRequest } from '../../types/api';
import { ASSESSMENT_CATEGORIES } from '../../types/api';

/*
 * ============================================================================
 * THE ASSESSMENT DRAFT
 * ============================================================================
 *
 * Somebody answers twenty questions anonymously, presses "save my results", and is
 * asked to create an account. This is where their answers live for the thirty seconds
 * that takes.
 *
 * ## Why the browser and not the server
 *
 * Because an anonymous draft on the server is a record with no owner, and a record with
 * no owner needs an expiry sweep, a claim mechanism, and an answer to "what stops
 * somebody else claiming it". Keeping it in the tab removes all three questions: an
 * abandoned assessment costs nothing and stores nothing, and there is no anonymous row
 * anybody could ever attach to the wrong account.
 *
 * ## Why sessionStorage and not localStorage
 *
 * A draft is meaningful for one sitting. `localStorage` would still be offering to
 * submit last month's answers about a website that has since been rebuilt, and would
 * leave somebody's business details on a shared machine indefinitely. `sessionStorage`
 * is scoped to the tab and cleared when it closes, which is exactly the lifetime this
 * has.
 *
 * ## Everything read back is re-validated
 *
 * Storage is user-writable. A draft is parsed defensively and discarded whole if any
 * part of it is wrong, because the alternative is a malformed object reaching a form
 * that assumed its own shape.
 * ============================================================================
 */

const STORAGE_KEY = 'jobforge.assessment.draft';

/** Long enough for a signup and an email confirmation; short enough to be one sitting. */
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface AssessmentDraft extends AssessmentRequest {
  /** When the draft was saved, so a stale one can be discarded rather than resubmitted. */
  readonly savedAt: number;
}

/** `sessionStorage` throws in private modes and is absent when rendering on a server. */
function storage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

function isCategory(value: unknown): value is AssessmentCategory {
  return (ASSESSMENT_CATEGORIES as readonly string[]).includes(value as string);
}

function parseAnswers(value: unknown): readonly AssessmentAnswer[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const answers: AssessmentAnswer[] = [];
  for (const entry of value) {
    if (typeof entry !== 'object' || entry === null) return null;
    const candidate = entry as Record<string, unknown>;

    if (typeof candidate['questionId'] !== 'string' || candidate['questionId'].length === 0) {
      return null;
    }
    if (!isCategory(candidate['category'])) return null;
    if (
      typeof candidate['value'] !== 'number' ||
      !Number.isInteger(candidate['value']) ||
      candidate['value'] < 0 ||
      candidate['value'] > 4
    ) {
      return null;
    }

    answers.push({
      questionId: candidate['questionId'],
      category: candidate['category'],
      value: candidate['value'],
    });
  }

  return answers;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

export function saveAssessmentDraft(draft: AssessmentRequest): void {
  const store = storage();
  if (!store) return;

  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // Quota exceeded or storage disabled. The assessment still works; it just cannot
    // survive a navigation, which is a degradation rather than a failure.
  }
}

export function readAssessmentDraft(): AssessmentDraft | null {
  const store = storage();
  if (!store) return null;

  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    clearAssessmentDraft();
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    clearAssessmentDraft();
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  const businessName = optionalString(candidate['businessName']);
  const answers = parseAnswers(candidate['answers']);
  const savedAt = candidate['savedAt'];

  if (!businessName || !answers || typeof savedAt !== 'number') {
    clearAssessmentDraft();
    return null;
  }

  // A draft nobody came back for. Submitting it later would attach stale answers to a
  // brand-new account, which is worse than asking somebody to answer again.
  if (Date.now() - savedAt > MAX_AGE_MS) {
    clearAssessmentDraft();
    return null;
  }

  return {
    businessName,
    answers,
    savedAt,
    ...(optionalString(candidate['websiteUrl'])
      ? { websiteUrl: optionalString(candidate['websiteUrl']) as string }
      : {}),
    ...(optionalString(candidate['trade'])
      ? { trade: optionalString(candidate['trade']) as string }
      : {}),
    ...(optionalString(candidate['note'])
      ? { note: optionalString(candidate['note']) as string }
      : {}),
  };
}

export function clearAssessmentDraft(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* nothing useful to do */
  }
}

export function hasAssessmentDraft(): boolean {
  return readAssessmentDraft() !== null;
}

/** Strips the bookkeeping field before the draft is sent. */
export function toSubmission(draft: AssessmentDraft): AssessmentRequest {
  const { savedAt: _savedAt, ...submission } = draft;
  return submission;
}
