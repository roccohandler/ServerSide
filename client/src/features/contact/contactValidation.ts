import { INQUIRY_TYPES, type InquiryType } from '../../types/api';

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

export function validateContactForm(values: ContactFormValues): ContactFieldErrors {
  const errors: ContactFieldErrors = {};
  const trimmed = (field: ContactFieldName) => values[field].trim();

  if (trimmed('name').length < 2) {
    errors.name = 'Please enter your name.';
  }

  if (trimmed('businessName').length === 0) {
    errors.businessName = 'Please enter your business name.';
  }

  const email = trimmed('email');
  if (email.length === 0) {
    errors.email = 'Please enter your email address.';
  } else if (!looksLikeEmail(email)) {
    errors.email = 'Please enter a valid email address.';
  }

  const phone = trimmed('phone');
  if (phone.length === 0) {
    errors.phone = 'Please enter a phone number.';
  } else if (!hasDialableDigits(phone)) {
    errors.phone = 'Please enter a phone number we can reach you on, including the area code.';
  }

  const website = trimmed('website');
  if (website.length > 0 && !looksLikeWebsite(website)) {
    errors.website = 'Please enter a valid website address, for example acmeplumbing.com.';
  }

  if (!isInquiryType(trimmed('inquiryType'))) {
    errors.inquiryType = 'Please choose what you need help with.';
  }

  if (trimmed('message').length > MESSAGE_MAX_LENGTH) {
    errors.message = `Please keep your message under ${MESSAGE_MAX_LENGTH} characters.`;
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
