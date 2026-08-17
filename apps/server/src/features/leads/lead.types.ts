/**
 * Canonical inquiry-type values.
 *
 * These slugs are the API contract. The *labels* shown to visitors live in the client
 * (`client/src/content/contact.ts`) and can be reworded freely, but the slugs here and
 * there must stay in sync — both sides have a test asserting this exact list.
 */
export const INQUIRY_TYPES = [
  'new-website',
  'improve-website',
  /*
   * Added when the business moved from selling websites to managing them. Without it
   * the most valuable enquiry there is — "I have a site, I want you to run it" — had to
   * arrive as `improve-website`, which is a different conversation. Adding a value to
   * this list is backward compatible: existing documents keep their slug.
   */
  'manage-website',
  'no-website',
  'not-sure',
] as const;

export type InquiryType = (typeof INQUIRY_TYPES)[number];

/** Deliberately minimal. This is a record of a conversation to have, not a CRM pipeline. */
export const LEAD_STATUSES = ['new', 'contacted', 'closed'] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Whether the owner was told about this lead. Stored so a delivery failure is
 * diagnosable later — see `lead.service.ts` for the persist-then-notify tradeoff.
 */
export const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

/**
 * Name of the hidden anti-spam input. Must match `HONEYPOT_FIELD` in the client.
 * Named to look like a plausible business field so naive bots fill it in.
 */
export const HONEYPOT_FIELD = 'companyFax';

/** Maximum accepted lengths. Shared by the zod schema and the Mongoose model. */
export const LEAD_FIELD_LIMITS = {
  name: 100,
  businessName: 120,
  email: 254,
  phone: 32,
  website: 300,
  message: 2000,
} as const;

/** A submission that has passed schema validation and normalisation. */
export interface ValidatedLeadInput {
  readonly name: string;
  readonly businessName: string;
  readonly email: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
  /** True when the honeypot input arrived filled in. */
  readonly isBotSubmission: boolean;
}

/**
 * What a signed-in customer sends from `/app/assessment/request`.
 *
 * Deliberately four fields and no identity. Who this is comes from the session — there is
 * no `name`, no `email` and no `userId` here to be supplied, which is what makes "a request
 * belongs to whoever sent it" a property of the system rather than a convention. The same
 * rule `AssessmentService.submit` states about assessments.
 *
 * There is no honeypot either. The endpoint is behind `requireAuth`, so getting to it costs
 * an account; a hidden input defends a form anybody can POST to, and this is not one.
 */
export interface ValidatedCustomerRequestInput {
  readonly businessName: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
}

/** What the repository is asked to store. */
export interface NewLeadRecord {
  readonly name: string;
  readonly businessName: string;
  readonly email: string;
  readonly phone: string;
  readonly website?: string;
  readonly inquiryType: InquiryType;
  readonly message?: string;
  readonly status: LeadStatus;
  readonly source: string;
  readonly notificationStatus: NotificationStatus;
  /**
   * The account that sent it, when there is one.
   *
   * Optional, and it stays optional: the contact form is anonymous by design and always
   * will be — somebody who wants to send a message must never have to make an account
   * first. What this field records is that a *particular* request arrived from a person who
   * already had one, which is what lets the console answer "who signed up and never asked
   * for anything" without guessing by email address.
   *
   * Matching on the address would have been the no-migration option and it is wrong: an
   * address is something a person types, twice, differently, and a lead matched to an
   * account by a string comparison is a lead attached to the wrong account the first time
   * somebody uses a plus-alias.
   */
  readonly userId?: string;
}

/** A lead as it exists in the database, mapped away from any Mongoose specifics. */
export interface StoredLead extends NewLeadRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The result of a submission attempt.
 *
 * A discriminated union rather than a boolean because the three outcomes are handled
 * differently by the controller *and* because "we deliberately threw this away" must
 * not be confusable with "we saved it".
 */
export type LeadSubmissionOutcome =
  | {
      readonly kind: 'created';
      readonly lead: StoredLead;
      readonly notification: NotificationStatus;
    }
  | { readonly kind: 'duplicate'; readonly lead: StoredLead }
  | { readonly kind: 'discarded'; readonly reason: 'honeypot' };
