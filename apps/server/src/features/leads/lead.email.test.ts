import { describe, expect, it } from 'vitest';
import { buildNewLeadEmail, describeInquiryType } from './lead.email.js';
import type { StoredLead } from './lead.types.js';

function buildStoredLead(overrides: Partial<StoredLead> = {}): StoredLead {
  return {
    id: 'lead-1',
    name: 'Dana Reyes',
    businessName: 'Cascade Heating & Air',
    email: 'dana@cascadeheating.example',
    phone: '(206) 555-0134',
    website: 'https://cascadeheating.example',
    inquiryType: 'improve-website',
    message: 'Our site is slow on phones.',
    status: 'new',
    source: 'website-contact-form',
    notificationStatus: 'pending',
    createdAt: new Date('2026-03-04T17:45:00.000Z'),
    updatedAt: new Date('2026-03-04T17:45:00.000Z'),
    ...overrides,
  };
}

describe('buildNewLeadEmail', () => {
  it('includes every detail the owner needs to follow up', () => {
    const message = buildNewLeadEmail({ lead: buildStoredLead(), recipient: 'owner@example.com' });

    expect(message.to).toBe('owner@example.com');
    expect(message.replyTo).toBe('dana@cascadeheating.example');
    expect(message.subject).toContain('Cascade Heating & Air');

    for (const expected of [
      'Dana Reyes',
      '(206) 555-0134',
      'dana@cascadeheating.example',
      'https://cascadeheating.example',
      describeInquiryType('improve-website'),
      'Our site is slow on phones.',
      '2026-03-04 17:45 UTC',
    ]) {
      expect(message.text).toContain(expected);
    }
  });

  it('says so explicitly when optional fields were left blank', () => {
    const message = buildNewLeadEmail({
      lead: buildStoredLead({ website: undefined, message: undefined }),
      recipient: 'owner@example.com',
    });

    expect(message.text).toContain('Website: Not provided');
    expect(message.text).toContain('Message: Not provided');
  });

  it('escapes visitor supplied content instead of trusting it as markup', () => {
    const message = buildNewLeadEmail({
      lead: buildStoredLead({
        name: '<script>alert(1)</script>',
        businessName: 'Bob & Sons "Plumbing"',
        message: 'Line one\nLine two <b>bold</b>',
      }),
      recipient: 'owner@example.com',
    });

    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.html).toContain('Bob &amp; Sons &quot;Plumbing&quot;');
    expect(message.html).not.toContain('<b>bold</b>');
    // Newlines still render as line breaks, so a multi-line message stays readable.
    expect(message.html).toContain('Line one<br />Line two');
  });

  it('keeps the plain text alternative in sync with the HTML version', () => {
    const message = buildNewLeadEmail({ lead: buildStoredLead(), recipient: 'owner@example.com' });

    expect(message.text).toContain('New website inquiry');
    expect(message.html).toContain('New website inquiry');
  });
});
