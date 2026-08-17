import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime } from './formatDate';

/*
 * ============================================================================
 * THE BUG THIS REPLACED, PINNED SO IT CANNOT COME BACK
 * ============================================================================
 *
 * Five call sites in this console printed a timestamp by slicing the ISO string:
 *
 *   '2026-08-16T06:30:00.000Z'.slice(0, 10)   →  "2026-08-16"
 *
 * In Seattle that instant is 23:30 on the **fifteenth**. The slice prints tomorrow's date,
 * confidently, with nothing to suggest anything is wrong — and an operator reading an
 * activity trail has no way to tell that two entries an hour apart are shown a day apart.
 *
 * The assertions below deliberately do not pin an exact rendered string: the locale and the
 * timezone belong to whoever is reading, and a test asserting "15 Aug 2026" would fail in
 * CI for the right reason and the wrong one. What is asserted is the property that was
 * broken — that the output tracks the reader's clock rather than UTC's.
 * ============================================================================
 */

/** The instant that exposes the bug: late evening in Seattle, already tomorrow in UTC. */
const LATE_IN_SEATTLE = '2026-08-16T06:30:00.000Z';

describe('a console timestamp', () => {
  it('renders in the reader’s timezone, not UTC', () => {
    const expected = new Date(LATE_IN_SEATTLE).getDate();

    /*
     * Compared against the same Date the browser would build, so this holds in any
     * timezone the suite runs in — including UTC, where the old spelling happened to be
     * right and this assertion is simply satisfied rather than vacuous.
     */
    expect(formatDate(LATE_IN_SEATTLE)).toContain(String(expected));

    /* And the slice this replaced does not agree, anywhere behind UTC. */
    const sliced = Number(LATE_IN_SEATTLE.slice(8, 10));
    if (sliced !== expected) {
      expect(formatDate(LATE_IN_SEATTLE)).not.toBe(LATE_IN_SEATTLE.slice(0, 10));
    }
  });

  it('shows a time as well, because an operator works in minutes', () => {
    const withTime = formatDateTime(LATE_IN_SEATTLE);

    /* A colon is the thing a date alone does not have. */
    expect(withTime).toMatch(/\d:\d\d/);
    expect(formatDate(LATE_IN_SEATTLE)).not.toMatch(/\d:\d\d/);
  });

  it('prints an em dash rather than "Invalid Date" for something absent or malformed', () => {
    /*
     * An absent optional field is normal — `lastLoginAt` on an account that has never signed
     * in, a response from an older deployment that omits a field. "Invalid Date" reads as
     * corruption worth investigating, and it is not.
     */
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('')).toBe('—');
    expect(formatDateTime('not a date')).toBe('—');
  });
});
