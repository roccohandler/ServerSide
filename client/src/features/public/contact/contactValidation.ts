import { INQUIRY_TYPES, type InquiryType } from '../../../types/api';

/*
 * Client-side validation exists for one reason: telling someone about a typo without
 * making them wait for a round trip. It is NOT a security boundary — the server
 * revalidates everything in `server/src/features/leads/lead.schema.ts`, and that is the
 * check that counts.
 *
 * The rules here are deliberately the same shape as the server's, and deliberately
 * forgiving. Rejecting a real customer's phone number costs more than accepting a
 * slightly odd one.
 */

export const CONTACT_FIELDS = [
  'name',
  'businessName',
  'email',
  'phone',
  'website',
  'inquiryType',
  'message',
] as const;

export type ContactFieldName = (typeof CONTACT_FIELDS)[number];

export type ContactFormValues = Record<ContactFieldName, string>;

export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

export const MESSAGE_MAX_LENGTH = 2000;

export const emptyContactForm: ContactFormValues = {
  name: '',
  businessName: '',
  email: '',
  phone: '',
  website: '',
  inquiryType: '',
  message: '',
};

/** Matches the server: enough of an address to be worth sending to. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function hasDialableDigits(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function looksLikeWebsite(value: string): boolean {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

function isInquiryType(value: string): value is InquiryType {
  return (INQUIRY_TYPES as readonly string[]).includes(value);
}

/*
 * One validator per field, exported individually.
 *
 * The hero form asks for a subset of these, one step at a time, and must apply exactly
 * the same rules as the full contact form — otherwise a value the hero accepts gets
 * rejected by the server a step later, which is the worst possible moment to find out.
 * Composing the whole-form check from the same functions is what keeps that honest.
 *
 * Each returns `undefined` when the value is acceptable, or a message that says what to
 * fix rather than merely that something is wrong.
 */

export function validateName(value: string): string | undefined {
  return value.trim().length < 2 ? 'Please enter your name.' : undefined;
}

export function validateBusinessName(value: string): string | undefined {
  return value.trim().length === 0 ? 'Please enter your business name.' : undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (email.length === 0) return 'Please enter your email address.';
  if (!looksLikeEmail(email)) return 'Please enter a valid email address.';
  return undefined;
}

export function validatePhone(value: string): string | undefined {
  const phone = value.trim();
  if (phone.length === 0) return 'Please enter a phone number.';
  if (!hasDialableDigits(phone)) {
    return 'Please enter a phone number we can reach you on, including the area code.';
  }
  return undefined;
}

/** Optional everywhere it is asked for, so an empty value is always acceptable. */
export function validateWebsite(value: string): string | undefined {
  const website = value.trim();
  if (website.length === 0) return undefined;
  if (!looksLikeWebsite(website)) {
    return 'Please enter a valid website address, for example acmeplumbing.com.';
  }
  return undefined;
}

export function validateInquiryType(value: string): string | undefined {
  return isInquiryType(value.trim()) ? undefined : 'Please choose what you need help with.';
}

export function validateMessage(value: string): string | undefined {
  return value.trim().length > MESSAGE_MAX_LENGTH
    ? `Please keep your message under ${MESSAGE_MAX_LENGTH} characters.`
    : undefined;
}

export function validateContactForm(values: ContactFormValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};

  const checks: Record<ContactFieldName, string | undefined> = {
    name: validateName(values.name),
    businessName: validateBusinessName(values.businessName),
    email: validateEmail(values.email),
    phone: validatePhone(values.phone),
    website: validateWebsite(values.website),
    inquiryType: validateInquiryType(values.inquiryType),
    message: validateMessage(values.message),
  };

  for (const field of CONTACT_FIELDS) {
    const message = checks[field];
    if (message) errors[field] = message;
  }

  return errors;
}

/** Field order for the error summary, so it reads in the same order as the form. */
export function orderErrors(
  errors: ContactFieldErrors,
): { field: ContactFieldName; message: string }[] {
  return CONTACT_FIELDS.flatMap((field) => {
    const message = errors[field];
    return message ? [{ field, message }] : [];
  });
}
