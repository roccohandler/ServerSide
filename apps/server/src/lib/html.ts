const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes visitor-supplied text before it is interpolated into notification HTML.
 *
 * Lead notifications are assembled as HTML strings and mailed to the business owner,
 * so untrusted input reaching that template unescaped would let a submitter inject
 * markup (or a disguised link) into the owner's inbox.
 */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPES[character] ?? character);
}

/** Escapes, then turns newlines into `<br />` so multi-line messages stay readable. */
export function escapeHtmlWithLineBreaks(value: string): string {
  return escapeHtml(value).replace(/\r?\n/g, '<br />');
}
