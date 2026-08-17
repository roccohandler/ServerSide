import { useEffect } from 'react';

/*
 * ============================================================================
 * THE DOCUMENT TITLE, AND NOTHING ELSE
 * ============================================================================
 *
 * Every screen in this console rendered under one title — the one in `index.html` — because
 * nothing here ever wrote `document.title`. Three things break when that is true, and only
 * the first is obvious:
 *
 *   - Browser history is a list of five identical entries, so "go back to the project I had
 *     open" is a guess.
 *   - Switching tabs with the keyboard reads the same words whichever console tab is which.
 *   - A screen reader announces the document title on navigation. In a single-page
 *     application that is the *only* automatic announcement a route change produces, so
 *     five screens with one title is five navigations that announce nothing has changed.
 *
 * ## Why this is not `useDocumentMeta`
 *
 * The customer application's hook writes a description, a canonical link, five Open Graph
 * properties and three Twitter ones. Every one of them exists to be read by something that
 * indexes or previews a page, and `index.html` here says `noindex, nofollow` — there is
 * nothing to index and no link to preview. Shipping that machinery to a console would be
 * surface with no consumer, which is the one thing composition rule 6 still forbids
 * outright.
 *
 * So: the title, and nothing else.
 * ============================================================================
 */

/** The suffix every console title carries, so a tab is identifiable at any width. */
const SUFFIX = 'JobForge console';

/**
 * Sets the document title for as long as this screen is mounted.
 *
 * @param name What this screen is, in the operator's words — "Inbox", "Projects", or a
 *             business name on the project detail page. The suffix is added here so no
 *             call site can forget it and no two can spell it differently.
 */
export function useTitle(name: string): void {
  useEffect(() => {
    document.title = `${name} — ${SUFFIX}`;
  }, [name]);
}
