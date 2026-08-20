/*
 * ============================================================================
 * THE AGREED SCOPE — THE WRITTEN AGREEMENT, AS A RECORD
 * ============================================================================
 *
 * `docs/business-offer.md` rule #35 says the scope is agreed in writing before any payment.
 * `/app/billing` offered a deposit button to any customer with an unpaid project. Both were
 * live, and one of them was wrong.
 *
 * The fix is not to remove the self-serve path — a buyer who has decided should not have to
 * wait for somebody to answer an email. It is to make the written agreement a thing the
 * product holds: the owner composes and sends a scope, the customer reads and accepts it, and
 * the acceptance records **who**, **when**, and **which version**. See DECISION 040.
 *
 * ## Acceptance is the presence of a date
 *
 * The same shape as `report.deliveredAt` and `publishedAt`, and for the same reason: a
 * nullable timestamp cannot disagree with a boolean beside it, because there is no boolean
 * beside it. `acceptedAt` present means accepted; absent means not. There is no
 * `isAccepted`, and there must never be one.
 *
 * ## A new version withdraws acceptance
 *
 * `sendScope` always writes a fresh `version` and always clears `acceptedAt`. Otherwise "you
 * accepted this" would point at a document that has since changed, which is precisely the
 * sentence a scope record exists to make defensible six months later. It is also the only
 * safe default: an owner correcting a typo and an owner adding £2,000 of work look identical
 * from here, and only one of them is safe to carry an old acceptance forward.
 *
 * ## The price on the scope and the price Stripe charges
 *
 * `priceCents` is what the customer is agreeing to. `billing.amounts.ts` is what Stripe
 * charges. They are two numbers in two files and they can disagree, so
 * `scopeAllowsSelfServeDeposit` refuses the self-serve button unless they match exactly.
 *
 * A customer accepting one figure and being charged another is the worst failure available
 * here, and it is worse than the button being missing: an owner who quotes a non-standard
 * price simply invoices instead (DECISION 041), which is what they would have done anyway.
 * The check is three lines and it makes the whole arrangement safe to leave unattended.
 * ============================================================================
 */

export const SCOPE_FIELD_LIMITS = {
  summary: 300,
  line: 300,
  lines: 30,
  notes: 2000,
  name: 100,
} as const;

/** What the owner sends, and what the customer accepts. Stored on the project. */
export interface ProjectScope {
  /**
   * Increments on every send. It is what "which version did they accept" means, and it is
   * why the customer's own copy shows it — a client and an owner reading different documents
   * with the same name is the failure this whole record exists to prevent.
   */
  readonly version: number;
  /** One line: what is being built, in the customer's terms. */
  readonly summary: string;
  /** The deliverables being agreed. Rendered as a list on both sides. */
  readonly lines: readonly string[];
  /** The agreed total, in cents. Never a formatted string — see `billing.amounts.ts`. */
  readonly priceCents: number;
  /** Anything outside the standard scope, or a condition attached to this project. */
  readonly notes?: string | undefined;
  /**
   * ==========================================================================
   * THE FOUNDING-CLIENT CONDITION, AS A RECORD
   * ==========================================================================
   *
   * `config/pricing.ts` is explicit that the founding price is truthful only while three
   * things hold, and the first is: *"A founding client actually agrees to the project being
   * documented as a case study. If the business stops asking for that, the discount has no
   * condition attached and the standard price stops being the price."*
   *
   * That agreement had nowhere to live. It was a sentence in the published terms and a
   * conversation somebody remembered — which means the one thing making a discount legal under
   * 16 CFR 233.1 was the thing least likely to be provable a year later.
   *
   * So it rides on the scope, and that is deliberate rather than convenient: the permission
   * **is the condition of the price**, so it belongs on the document that states the price.
   * Accepting a scope with this set is accepting both, and the portal says so directly above
   * the button rather than burying it in terms.
   *
   * Absent or false is the ordinary case — a standard-price project asks for nothing.
   */
  readonly caseStudy?: boolean | undefined;
  readonly sentAt: Date;
  /** A name, not a user id — the same argument `estimateUpdatedBy` makes. */
  readonly sentBy: string;
  /** Present exactly when the customer has accepted **this** version. */
  readonly acceptedAt?: Date | undefined;
  /** Which account accepted. The id, because this one has to be provable. */
  readonly acceptedByUserId?: string | undefined;
  /** Who they were at the time, so the record reads without a second lookup. */
  readonly acceptedName?: string | undefined;
}

/** What the owner supplies when sending or replacing a scope. */
export interface ScopeInput {
  readonly summary: string;
  readonly lines: readonly string[];
  readonly priceCents: number;
  readonly notes?: string | undefined;
  /** Whether this is a founding-client scope. See `ProjectScope.caseStudy`. */
  readonly caseStudy?: boolean | undefined;
  readonly sentBy: string;
}

/**
 * What the customer is shown. Built field by field, like `CustomerProjectView`, so a field
 * added to storage is invisible until somebody decides it should be visible.
 *
 * `acceptedByUserId` is deliberately absent: the customer knows who they are, and the id is
 * an internal handle a browser has no use for.
 */
export interface CustomerScopeView {
  readonly version: number;
  readonly summary: string;
  readonly lines: readonly string[];
  readonly priceCents: number;
  readonly notes?: string | undefined;
  /** True when accepting this also grants case-study permission. Stated above the button. */
  readonly caseStudy: boolean;
  readonly sentAt: string;
  readonly acceptedAt?: string | undefined;
  readonly acceptedName?: string | undefined;
}

export function toCustomerScopeView(scope: ProjectScope): CustomerScopeView {
  return {
    version: scope.version,
    summary: scope.summary,
    lines: [...scope.lines],
    priceCents: scope.priceCents,
    notes: scope.notes,
    caseStudy: scope.caseStudy === true,
    sentAt: scope.sentAt.toISOString(),
    acceptedAt: scope.acceptedAt?.toISOString(),
    acceptedName: scope.acceptedName,
  };
}

/** `true` when this scope has been accepted. The only reader of `acceptedAt`'s meaning. */
export function scopeAccepted(scope: ProjectScope | undefined): boolean {
  return Boolean(scope?.acceptedAt);
}

/**
 * Whether the self-serve deposit button may be offered against this scope.
 *
 * Two conditions, and the second is the one that is easy to leave out. The scope must be
 * accepted, **and** the figure the customer accepted must be the figure Stripe will charge.
 * A bespoke quote is a perfectly normal thing for the owner to send; what it is not is
 * something the standard Checkout price can settle.
 */
export function scopeAllowsSelfServeDeposit(
  scope: ProjectScope | undefined,
  buildPriceCents: number,
): boolean {
  return scopeAccepted(scope) && scope?.priceCents === buildPriceCents;
}
