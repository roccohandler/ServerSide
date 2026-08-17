/*
 * ============================================================================
 * THE EMAIL PALETTE
 * ============================================================================
 *
 * The same JobForge identity the website uses — Forge Charcoal, Cast Cream, Ember Orange
 * — expressed for a medium that has no custom properties, no stylesheets it can rely on,
 * and no guarantee that any given declaration survives the client.
 *
 * ## Why this file exists
 *
 * The five email builders each held their own hex literals, which is how the owner's
 * notification drifted to one grey and the subscriber's delivery email to another. A
 * transactional email is the first thing a customer sees from this business after the
 * website, and two of them in two palettes is two businesses. The website solved this
 * with `styles/tokens.css`; this is the same rule applied to the half of the product that
 * arrives in an inbox.
 *
 * ## What email forces us to do differently
 *
 * - **Every value is a literal, inlined at the call site.** Mail clients strip `<style>`
 *   blocks and none of them support custom properties. There is no way to be DRY inside
 *   the HTML, so the deduplication happens here, in TypeScript, before the string exists.
 * - **The font stack leads with Archivo and expects to fall through.** Almost no reader
 *   will have it installed and there is no `@font-face` worth attempting in email. Naming
 *   it costs nothing and means the handful of clients that do have it render the brand
 *   face; everybody else gets the system grotesk, which is what the site's own fallback
 *   stack is.
 * - **Ember is never a text colour here.** It is 3.0:1 on cream and mail clients do not
 *   let a reader adjust anything. `accentFill` (with `onAccent` on top) is the only place
 *   the accent is allowed to carry words.
 * ============================================================================
 */

export const emailTheme = {
  /** Forge Charcoal. Body text, headings. 15.2:1 on `page`, 17.6:1 on `surface`. */
  ink: '#17191E',
  /** Secondary text — labels, timestamps, footnotes. 5.8:1 on `page`. */
  inkMuted: '#5F5B54',

  /** Cast Cream. The outer ground an email card sits on. */
  page: '#F3EEE4',
  /** Pure White. The card itself. */
  surface: '#FFFFFF',
  /** The hairline around the card. */
  border: '#E4DED2',

  /** Ember Orange. Rules and bars only — never text, never a fill behind text. */
  accent: '#E85C24',
  /** Ember Deep. The one fill allowed to carry a label, at 4.9:1 with `onAccent`. */
  accentFill: '#C4471A',
  /** What sits on `accentFill`. White, not cream — cream on that fill is 4.3:1. */
  onAccent: '#FFFFFF',

  /** See the note above on why Archivo leads a stack that will usually fall through. */
  font: "Archivo,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;
