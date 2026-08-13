import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/appError.js';
import { HONEYPOT_FIELD } from '../leads/lead.types.js';
import { parseSubscriberRequest } from './subscriber.schema.js';
import { PLAYBOOK_CONSENT_TEXT, SUBSCRIPTION_ASSETS } from './subscriber.types.js';

/*
 * This schema is the security boundary for a public, one-field, unauthenticated POST.
 * Everything below exists because the browser's validation is a convenience and this is
 * the thing that actually has to hold.
 */

function expectAppError(body: unknown): AppError {
  try {
    parseSubscriberRequest(body);
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    return error as AppError;
  }
  throw new Error('Expected parseSubscriberRequest to throw.');
}

describe('parsing a subscribe request', () => {
  it('accepts an email address and defaults the asset', () => {
    const result = parseSubscriberRequest({ email: 'dana@example.com' });

    expect(result.email).toBe('dana@example.com');
    expect(result.asset).toBe('playbook-workbook');
    expect(result.isBotSubmission).toBe(false);
  });

  it('normalises case and surrounding whitespace', () => {
    // People paste addresses out of other applications; a leading space is not an error.
    const result = parseSubscriberRequest({ email: '  Dana@Example.COM ' });
    expect(result.email).toBe('dana@example.com');
  });

  it('rejects something that is not an email address', () => {
    const error = expectAppError({ email: 'dana at example dot com' });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields?.['email']).toBeTruthy();
  });

  it('rejects a missing email address', () => {
    const error = expectAppError({});
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.fields?.['email']).toBeTruthy();
  });

  it('rejects an oversized email address', () => {
    const error = expectAppError({ email: `${'a'.repeat(250)}@example.com` });
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a body that is not an object', () => {
    for (const body of [null, 'dana@example.com', 42, ['dana@example.com']]) {
      expect(expectAppError(body).code).toBe('MALFORMED_REQUEST');
    }
  });

  /*
   * An unexpected key means a stale client or somebody probing the endpoint. Neither is
   * a request to half-understand.
   */
  it('rejects unknown keys rather than ignoring them', () => {
    const error = expectAppError({ email: 'dana@example.com', subscribeToEverything: true });
    expect(error.code).toBe('MALFORMED_REQUEST');
  });

  it('rejects an unknown asset', () => {
    const error = expectAppError({ email: 'dana@example.com', asset: 'the-secret-one' });
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('flags a filled honeypot without failing the request', () => {
    // The bot must not learn that it was caught, so this parses successfully.
    const result = parseSubscriberRequest({
      email: 'dana@example.com',
      [HONEYPOT_FIELD]: 'Acme Corp',
    });

    expect(result.isBotSubmission).toBe(true);
    expect(result.email).toBe('dana@example.com');
  });

  it('does not treat an empty honeypot as a bot', () => {
    const result = parseSubscriberRequest({ email: 'dana@example.com', [HONEYPOT_FIELD]: '   ' });
    expect(result.isBotSubmission).toBe(false);
  });
});

describe('the subscription contract', () => {
  it('offers exactly one asset today', () => {
    expect(SUBSCRIPTION_ASSETS).toEqual(['playbook-workbook']);
  });

  /*
   * The client has the mirror of this assertion against `playbook.pdfOffer.form.consent`.
   * If the promise on the page is reworded and this is not, one of the two fails — which
   * is the point, because otherwise we would store consent to words nobody was shown.
   */
  it('pins the consent wording that gets stored with every record', () => {
    expect(PLAYBOOK_CONSENT_TEXT).toBe(
      'One email with the PlayBook in it. No sequence, no list, and no sharing your address with anybody.',
    );
  });
});
