import { site } from '../content/site';
import { isPlaceholder } from './placeholders';

/**
 * Derives usable links from the centralised contact details.
 *
 * The header, hero, contact page, footer and structured data all call these, so the
 * phone number and email address exist in exactly one place — `content/site.ts`.
 */

export interface ContactChannel {
  /** What the visitor reads. */
  readonly display: string;
  /** `tel:` or `mailto:` URL, or null while the value is still a placeholder. */
  readonly href: string | null;
}

/** Strips formatting so `(206) 555-0134` dials correctly. */
function toDialString(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+1${cleaned}`;
}

export function getPhoneChannel(): ContactChannel {
  const { phone } = site.contact;
  return {
    display: phone,
    href: isPlaceholder(phone) ? null : `tel:${toDialString(phone)}`,
  };
}

export function getEmailChannel(): ContactChannel {
  const { email } = site.contact;
  return {
    display: email,
    href: isPlaceholder(email) ? null : `mailto:${email}`,
  };
}
