import type { Error as MongooseError } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { LeadModel } from './lead.model.js';
import { LEAD_FIELD_LIMITS } from './lead.types.js';

/*
 * Mongoose validates documents in memory, so the schema — the last line of defence
 * before data reaches the collection — can be tested without a running database.
 */

const validLead = {
  name: 'Dana Reyes',
  businessName: 'Cascade Heating & Air',
  email: 'Dana@Cascadeheating.example',
  phone: '(206) 555-0134',
  inquiryType: 'improve-website',
  status: 'new',
  source: 'website-contact-form',
  notificationStatus: 'pending',
};

/*
 * Deliberately typed loosely. These tests feed the model values the type system would
 * normally reject — that is the point: the schema is the last check before data reaches
 * the collection, and it has to hold even if something upstream lets bad input through.
 */
async function invalidFields(document: Record<string, unknown>): Promise<string[]> {
  try {
    await new LeadModel(document).validate();
    return [];
  } catch (error) {
    return Object.keys((error as MongooseError.ValidationError).errors).sort();
  }
}

describe('Lead model', () => {
  it('accepts a valid lead and lowercases the email', async () => {
    const lead = new LeadModel(validLead);

    await expect(lead.validate()).resolves.toBeUndefined();
    expect(lead.email).toBe('dana@cascadeheating.example');
  });

  it('requires the fields needed to follow up', async () => {
    expect(await invalidFields({})).toEqual([
      'businessName',
      'email',
      'inquiryType',
      'name',
      'phone',
      'source',
    ]);
  });

  it('defaults a new lead to status "new" and an unsent notification', () => {
    const lead = new LeadModel({ ...validLead, status: undefined, notificationStatus: undefined });

    expect(lead.status).toBe('new');
    expect(lead.notificationStatus).toBe('pending');
  });

  it('rejects a status outside the supported set', async () => {
    expect(await invalidFields({ ...validLead, status: 'invoiced' })).toEqual(['status']);
  });

  it('rejects an inquiry type outside the API contract', async () => {
    expect(await invalidFields({ ...validLead, inquiryType: 'something-else' })).toEqual([
      'inquiryType',
    ]);
  });

  it('enforces the same length limits as the request schema', async () => {
    expect(
      await invalidFields({
        ...validLead,
        message: 'x'.repeat(LEAD_FIELD_LIMITS.message + 1),
      }),
    ).toEqual(['message']);
  });
});
