/**
 * Placeholder detection.
 *
 * Content values that have not been decided yet are written as `[LIKE_THIS]`. Knowing
 * which values are still placeholders lets the UI degrade honestly: an unreplaced phone
 * number renders as plain text rather than as a `tel:` link that dials nothing, and
 * structured data is omitted rather than published with a fake business name.
 */

const PLACEHOLDER_PATTERN = /^\[[A-Z0-9_]+\]$/;

export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERN.test(value.trim());
}

/** True when the string contains a placeholder anywhere inside it. */
export function containsPlaceholder(value: string): boolean {
  return /\[[A-Z0-9_]+\]/.test(value);
}

/** Every distinct placeholder token found in a string, e.g. `['[PRICING_APPROACH]']`. */
export function findPlaceholders(value: string): string[] {
  return [...new Set(value.match(/\[[A-Z0-9_]+\]/g) ?? [])];
}

/**
 * Walks any content value and collects the placeholders inside it.
 * Used by the development-only banner that lists what still needs filling in.
 */
export function collectPlaceholders(value: unknown, found = new Set<string>()): Set<string> {
  if (typeof value === 'string') {
    for (const token of findPlaceholders(value)) found.add(token);
    return found;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectPlaceholders(item, found);
    return found;
  }

  if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectPlaceholders(item, found);
  }

  return found;
}
