/*
 * ============================================================================
 * A TIMESTAMP THE OPERATOR CAN TRUST
 * ============================================================================
 *
 * Every date in this console was printed by slicing the ISO string the server sent:
 *
 *   account.createdAt.slice(0, 10)                      → "2026-08-15"
 *   deployment.at.slice(0, 16).replace('T', ' ')        → "2026-08-15 07:30"
 *
 * That is not a formatting preference, it is **wrong**. The server sends UTC, and slicing
 * prints the UTC clock as though it were the reader's. In Seattle that is seven or eight
 * hours out: a reply logged at 23:30 local renders as the *next day*, and a deployment at
 * 16:45 renders as 23:45. Nothing announces the error — the number looks like a time, so it
 * gets read as one, and the only way to notice is to compare it against something else.
 *
 * The customer application never had this bug: it has always used `toLocaleDateString`. Two
 * applications reading one database and disagreeing about what day something happened is a
 * difference nobody would think to look for.
 *
 * ## Why the console shows a time and the customer application does not
 *
 * Not a style choice either. A customer wants to know their preview arrived on Tuesday; an
 * operator working an inbox wants to know whether a reply went out before or after the one
 * below it. The unit matches the question, so the two formatters differ deliberately and the
 * comment says so in both places.
 *
 * ## The browser's locale, not a pinned one
 *
 * `undefined` for the locale, which means the reader's. Pinning `America/Los_Angeles`
 * because the business is in Greater Seattle was considered and rejected: it hard-codes a
 * business fact into a formatter, and it is wrong the first time the owner reads the inbox
 * from anywhere else — which is exactly when a timestamp matters most.
 * ============================================================================
 */

/**
 * Guards against a malformed or absent timestamp.
 *
 * An em dash rather than "Invalid Date", which is what `toLocaleDateString` renders and what
 * an operator would reasonably read as a data problem worth investigating. It is not: an
 * optional field that is absent is normal, and a response from an older deployment that omits
 * one must not look like corruption.
 */
const ABSENT = '—';

function parse(iso: string | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** A date, in the reader's own timezone. "15 Aug 2026". */
export function formatDate(iso: string | undefined): string {
  const date = parse(iso);
  if (!date) return ABSENT;

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** A date and a time, in the reader's own timezone. "15 Aug 2026, 00:30". */
export function formatDateTime(iso: string | undefined): string {
  const date = parse(iso);
  if (!date) return ABSENT;

  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
