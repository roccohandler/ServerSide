/*
 * ============================================================================
 * TURNING A TYPED PHRASE INTO A QUERY THAT CANNOT HURT ANYBODY
 * ============================================================================
 *
 * Two console lists take a search box — projects and accounts — and both of them hand a
 * string from a browser to MongoDB. That is one shared decision with two dangerous ways to
 * get it wrong, so it is made once, here.
 *
 * ## Anchored, not `contains`
 *
 * `/dana/i` finds "Yolanda" and scans every document to do it. `/^dana/i` is a prefix, which
 * an index on the field can actually serve, and it is the query a person means: somebody
 * typing into a search box is typing the beginning of a name. The cost is that "heating" no
 * longer finds "Cascade Heating" — real, and the right trade at a scale where the alternative
 * is a full collection scan per keystroke on a serverless function billed by the second.
 *
 * ## Escaped, always
 *
 * The input is a regular expression the moment it reaches the driver. Unescaped, `(` is a
 * syntax error and `(a+)+$` is a query that pins a CPU for minutes — a denial of service
 * typed into a text field. Every metacharacter is escaped, so what a person types is matched
 * literally and nothing they can type is executable.
 *
 * ## Bounded
 *
 * A 4 kB search term is not a search term. Long inputs are cut rather than refused, because a
 * paste accident should narrow a list rather than produce an error message.
 * ============================================================================
 */

/** Long enough for any business name somebody would type, short enough to be harmless. */
const MAX_TERM_LENGTH = 80;

/** Every character that means something to a regular expression. */
const METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

/**
 * A case-insensitive, anchored, escaped prefix match — or `undefined` when there is nothing
 * to search for, which callers spread into a filter so an empty box means "everything".
 */
export function prefixMatch(term: string | undefined): RegExp | undefined {
  const trimmed = term?.trim().slice(0, MAX_TERM_LENGTH);
  if (!trimmed) return undefined;

  return new RegExp(`^${trimmed.replace(METACHARACTERS, '\\$&')}`, 'i');
}
