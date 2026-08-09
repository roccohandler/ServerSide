import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/appError.js';
import { buildValidLeadRequestBody } from '../../testing/fakes.js';
import { parseLeadRequest } from './lead.schema.js';
import { HONEYPOT_FIELD, LEAD_FIELD_LIMITS } from './lead.types.js';

function expectRejection(body: unknown): AppError {
  try {
    parseLeadRequest(body);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error('expected parseLeadRequest to reject the body');
}

describe('parseLeadRequest', () => {
  it('accepts and normalises a well formed submission', () => {
    const lead = parseLeadRequest(
      buildValidLeadRequestBody({
        name: '  Dana   Reyes ',
        email: '  Dana@Cascadeheating.EXAMPLE ',
      }),
    );

    expect(lead).toMatchObject({
      name: 'Dana Reyes',
      email: 'dana@cascadeheating.example',
      // A bare domain gains a scheme rather than being rejected.
      website: 'https://cascadeheating.example',
      inquiryType: 'improve-website',
      isBotSubmission: false,
    });
  });

  it('reports every missing required field at once, keyed by field name', () => {
    const error = expectRejection({ inquiryType: 'new-website' });

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(Object.keys(error.fields ?? {}).sort()).toEqual([
      'businessName',
      'email',
      'name',
      'phone',
    ]);
  });

  it('rejects an invalid email address', () => {
    const error = expectRejection(buildValidLeadRequestBody({ email: 'not-an-email' }));

    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields?.['email']).toMatch(/valid email/i);
  });

  it.each([
    ['(206) 555-0134', 'US formatting with punctuation'],
    ['206.555.0134', 'dot separators'],
    ['+1 206 555 0134', 'an international prefix'],
    ['2065550134', 'digits only'],
  ])('accepts %s (%s)', (phone) => {
    expect(parseLeadRequest(buildValidLeadRequestBody({ phone })).phone).toBeTruthy();
  });

  it('rejects a phone number with too few digits to dial', () => {
    const error = expectRejection(buildValidLeadRequestBody({ phone: '555-0134' }));

    expect(error.fields?.['phone']).toMatch(/area code/i);
  });

  it('treats an omitted or blank website as not provided', () => {
    expect(parseLeadRequest(buildValidLeadRequestBody({ website: '   ' })).website).toBeUndefined();

    const { website: _website, ...withoutWebsite } = buildValidLeadRequestBody();
    expect(parseLeadRequest(withoutWebsite).website).toBeUndefined();
  });

  it('rejects a website value that is not a usable address', () => {
    const error = expectRejection(buildValidLeadRequestBody({ website: 'javascript:alert(1)' }));

    expect(error.fields?.['website']).toMatch(/valid website/i);
  });

  it('rejects an unknown inquiry type', () => {
    const error = expectRejection(buildValidLeadRequestBody({ inquiryType: 'something-else' }));

    expect(error.fields?.['inquiryType']).toMatch(/choose what you need help with/i);
  });

  it('rejects a message beyond the maximum length', () => {
    const error = expectRejection(
      buildValidLeadRequestBody({ message: 'x'.repeat(LEAD_FIELD_LIMITS.message + 1) }),
    );

    expect(error.fields?.['message']).toMatch(/characters or fewer/i);
  });

  it('flags a filled honeypot without failing validation', () => {
    const lead = parseLeadRequest(
      buildValidLeadRequestBody({ [HONEYPOT_FIELD]: 'http://spam.example' }),
    );

    expect(lead.isBotSubmission).toBe(true);
  });

  it('ignores an empty honeypot, which is what a real visitor submits', () => {
    const lead = parseLeadRequest(buildValidLeadRequestBody({ [HONEYPOT_FIELD]: '' }));

    expect(lead.isBotSubmission).toBe(false);
  });

  it('rejects unexpected keys rather than silently dropping them', () => {
    const error = expectRejection(buildValidLeadRequestBody({ role: 'admin', status: 'closed' }));

    expect(error.code).toBe('MALFORMED_REQUEST');
  });

  it.each([[null], ['a string'], [[]], [42]])('rejects a non-object body: %s', (body) => {
    expect(expectRejection(body).code).toBe('MALFORMED_REQUEST');
  });
});
