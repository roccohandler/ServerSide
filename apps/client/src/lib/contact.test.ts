import { describe, expect, it } from 'vitest';
import { getEmailChannel, getPhoneChannel } from './contact';
import { containsPlaceholder, findPlaceholders, isPlaceholder } from './placeholders';

describe('isPlaceholder', () => {
  it.each([['[BUSINESS_NAME]'], ['[PHONE_NUMBER]'], ['  [ABOUT_INTRO]  ']])(
    'recognises %s',
    (value) => {
      expect(isPlaceholder(value)).toBe(true);
    },
  );

  it.each([['Acme Web Studio'], ['(206) 555-0134'], ['A sentence with [PLACEHOLDER] inside']])(
    'does not treat %s as a bare placeholder',
    (value) => {
      expect(isPlaceholder(value)).toBe(false);
    },
  );

  it('still finds placeholders embedded in a sentence', () => {
    expect(containsPlaceholder('Priced up front. [PRICING_APPROACH]')).toBe(true);
    expect(findPlaceholders('[A_ONE] and [A_TWO] and [A_ONE]')).toEqual(['[A_ONE]', '[A_TWO]']);
  });
});

describe('contact channels', () => {
  /*
   * The site ships with placeholder contact details, so the important behaviour is the
   * one asserted first: an unreplaced value must never become a link that dials or
   * emails nothing.
   */
  it('renders as text, not a link, while the value is a placeholder', () => {
    const phone = getPhoneChannel();
    const email = getEmailChannel();

    if (isPlaceholder(phone.display)) {
      expect(phone.href).toBeNull();
    }
    if (isPlaceholder(email.display)) {
      expect(email.href).toBeNull();
    }
  });

  it('always exposes something to display', () => {
    expect(getPhoneChannel().display.length).toBeGreaterThan(0);
    expect(getEmailChannel().display.length).toBeGreaterThan(0);
  });
});
