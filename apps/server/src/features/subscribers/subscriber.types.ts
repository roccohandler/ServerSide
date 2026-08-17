/*
 * ============================================================================
 * PLAYBOOK SUBSCRIBERS
 * ============================================================================
 *
 * Somebody asks for the workbook version of the PlayBook. That is the whole feature.
 *
 * What this deliberately is NOT:
 *
 *   - a mailing list. There is no sequence, no campaign and no segmentation, and the
 *     privacy page says so. If that ever changes, the consent copy in
 *     `client/src/content/playbook.ts` and `content/legal.ts` have to change first,
 *     because what people agreed to is what they agreed to.
 *   - an automated delivery pipeline. The request is stored and the owner is notified;
 *     the owner sends the workbook. Wiring an automatic send to a PDF that does not
 *     exist would be faking the feature, which is worse than not having it.
 *
 * `consentedAt` and `consentText` are stored together on purpose. A record that somebody
 * consented is worth very little without a record of what they were shown when they did.
 * ============================================================================
 */

/**
 * The exact wording shown next to the submit button when consent is given.
 *
 * Duplicated in `client/src/content/playbook.ts` — `pdfOffer.form.consent` — and both
 * copies have a test pinning this literal, so a reworded promise on the page fails the
 * build rather than silently storing consent to something nobody was shown. Same
 * arrangement as the inquiry-type slugs, and for the same reason: a shared package would
 * cost a build step on every deploy for one sentence.
 *
 * If this changes, it is a change to what people are agreeing to. Change the client copy,
 * change this, and expect both tests to tell you about the third place you forgot.
 */
export const PLAYBOOK_CONSENT_TEXT =
  'One email with the PlayBook in it. No sequence, no list, and no sharing your address with anybody.';

/** Which asset was requested. One value today; the field exists so a second one is cheap. */
export const SUBSCRIPTION_ASSETS = ['playbook-workbook'] as const;

export type SubscriptionAsset = (typeof SUBSCRIPTION_ASSETS)[number];

/**
 * Whether the owner has been told about this request, and therefore whether anybody has
 * actually sent the thing that was asked for.
 */
export const SUBSCRIBER_NOTIFICATION_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const;

export type SubscriberNotificationStatus = (typeof SUBSCRIBER_NOTIFICATION_STATUSES)[number];

/** Shared by the zod schema and the Mongoose model. */
export const SUBSCRIBER_FIELD_LIMITS = {
  email: 254,
  consentText: 500,
} as const;

/** A request that has passed schema validation and normalisation. */
export interface ValidatedSubscriberInput {
  readonly email: string;
  readonly asset: SubscriptionAsset;
  /** True when the honeypot input arrived filled in. */
  readonly isBotSubmission: boolean;
}

/** What the repository is asked to store. */
export interface NewSubscriberRecord {
  readonly email: string;
  readonly asset: SubscriptionAsset;
  readonly source: string;
  /** When consent was given, and what the person was shown when they gave it. */
  readonly consentedAt: Date;
  readonly consentText: string;
  readonly notificationStatus: SubscriberNotificationStatus;
}

export interface StoredSubscriber extends NewSubscriberRecord {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * The result of a request.
 *
 * A discriminated union for the same reason the lead feature uses one: "we deliberately
 * threw this away" must never be confusable with "we stored it", even though the visitor
 * sees the same response either way.
 */
export type SubscriptionOutcome =
  | {
      readonly kind: 'created';
      readonly subscriber: StoredSubscriber;
      readonly notification: SubscriberNotificationStatus;
    }
  | { readonly kind: 'duplicate'; readonly subscriber: StoredSubscriber }
  | { readonly kind: 'discarded'; readonly reason: 'honeypot' };
