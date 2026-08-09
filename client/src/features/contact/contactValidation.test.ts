import { describe, expect, it } from 'vitest';
import {
  emptyContactForm,
  MESSAGE_MAX_LENGTH,
  orderErrors,
  validateContactForm,
  type ContactFormValues,
} from './contactValidation';

function values(overrides: Partial<ContactFormValues> = {}): ContactFormValues {
  return {
    name: 'Dana Reyes',
    businessName: 'Cascade Heating & Air',
    email: 'dana@cascadeheating.example',
    phone: '(206) 555-0134',
    website: 'cascadeheating.example',
    inquiryType: 'improve-website',
    message: 'Our site is slow on phones.',
    ...overrides,
  };
}

describe('validateContactForm', () => {
  it('passes a complete submission', () => {
    expect(validateContactForm(values())).toEqual({});
  });

  it('reports every empty required field', () => {
    expect(Object.keys(validateContactForm(emptyContactForm)).sort()).toEqual([
      'businessName',
      'email',
      'inquiryType',
      'name',
      'phone',
    ]);
  });

  it.each([
    ['(206) 555-0134', 'punctuation'],
    ['206.555.0134', 'dots'],
    ['+1 206 555 0134', 'a country code'],
    ['2065550134', 'plain digits'],
  ])('accepts a phone number written with %s (%s)', (phone) => {
    expect(validateContactForm(values({ phone })).phone).toBeUndefined();
  });

  it('rejects a phone number that is too short to dial', () => {
    expect(validateContactForm(values({ phone: '555-0134' })).phone).toMatch(/area code/i);
  });

  it.each([['acmeplumbing.com'], ['https://acmeplumbing.com'], ['http://www.acme.co.uk/services']])(
    'accepts %s as a website',
    (website) => {
      expect(validateContactForm(values({ website })).website).toBeUndefined();
    },
  );

  it.each([['not a website'], ['javascript:alert(1)'], ['http://nodot']])(
    'rejects %s as a website',
    (website) => {
      expect(validateContactForm(values({ website })).website).toMatch(/valid website/i);
    },
  );

  it('treats a blank website as acceptable, because it is optional', () => {
    expect(validateContactForm(values({ website: '   ' })).website).toBeUndefined();
  });

  it('rejects an inquiry type that is not part of the API contract', () => {
    expect(validateContactForm(values({ inquiryType: 'something-else' })).inquiryType).toBeTruthy();
  });

  it('rejects a message past the maximum length', () => {
    const message = 'x'.repeat(MESSAGE_MAX_LENGTH + 1);
    expect(validateContactForm(values({ message })).message).toMatch(/under 2000/i);
  });

  it('ignores surrounding whitespace when deciding whether a field was filled in', () => {
    expect(validateContactForm(values({ name: '   ' })).name).toBeTruthy();
  });
});

describe('orderErrors', () => {
  it('lists problems in the order the fields appear in the form', () => {
    const ordered = orderErrors({
      message: 'Too long.',
      name: 'Required.',
      email: 'Invalid.',
    });

    expect(ordered.map((entry) => entry.field)).toEqual(['name', 'email', 'message']);
  });
});
