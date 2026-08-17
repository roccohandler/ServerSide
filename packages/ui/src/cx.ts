/**
 * Joins class names, dropping anything falsy.
 *
 * This existed in thirteen places before it existed in one: `Layout.tsx` had it as a private
 * helper and twelve other files wrote `[a, b].filter(Boolean).join(' ')` inline. That is well
 * past the point where the duplication has proven itself, and it is the smallest concrete
 * function that removes it — not a class-name library, not a variant engine. Anything more
 * would be a framework wearing a utility's name.
 *
 * `false` is in the union because `cond && styles['x']` is the idiom every call site uses;
 * accepting only `string | undefined` would push each of them back to a ternary.
 */
export function cx(...values: (string | undefined | false | null)[]): string {
  return values.filter(Boolean).join(' ');
}
