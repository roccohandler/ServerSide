import Stripe from 'stripe';
import type { VerifiedStripeEvent } from './billing.types.js';

/*
 * The narrow seam between this application and the Stripe SDK.
 *
 * The billing service depends on this interface rather than on `Stripe`, so the business
 * rules — which product maps to which mode, what a webhook advances, when the owner is
 * emailed — are tested with an in-memory fake. Only this file knows the SDK exists.
 *
 * The secret key never leaves the server. Nothing in `client/` imports this module, and
 * the key is read from an environment variable that has no `VITE_` prefix, so it cannot
 * be inlined into the public bundle.
 */

export interface CheckoutSessionRequest {
  readonly mode: 'payment' | 'subscription';
  readonly priceId: string;
  readonly customerEmail: string;
  /**
   * The Stripe customer this payment belongs to, when the payer already has one.
   *
   * Sending only `customer_email` lets Stripe create a *guest* customer for every
   * payment — a returning payer ends up as two Stripe customers, and the one the
   * application stored is not the one holding the second payment. The consequences are
   * quiet and expensive: invoices split across two records, a billing portal that opens
   * on the wrong history, and a later subscription with no continuity from the build
   * that preceded it.
   *
   * Stripe rejects a session carrying both `customer` and `customer_email`, so the two
   * are mutually exclusive below — the id wins wherever we have one.
   */
  readonly customerId?: string | undefined;
  readonly metadata: Readonly<Record<string, string>>;
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface CreatedCheckoutSession {
  readonly id: string;
  /** The hosted payment page. Null only in exotic configurations; treated as an error. */
  readonly url: string | null;
}

export interface PriceAmount {
  /** Null when the Price has no fixed amount (metered/custom) — treated as a mismatch. */
  readonly unitAmountCents: number | null;
  readonly currency: string;
}

/*
 * ============================================================================
 * AN INVOICE, FOR THE PAYMENTS THE OWNER SENDS
 * ============================================================================
 *
 * DECISION 041. A Checkout Session expires after 24 hours, so a payment link sent on a Friday
 * afternoon is dead before Monday — and the client's only symptom is a page telling them the
 * link has expired, for a payment they were trying to make.
 *
 * An invoice has a permanent hosted URL, a PDF, a due date and Stripe's own reminder
 * schedule. It is also the document a business buying a $4,900 asset actually wants: their
 * bookkeeper needs an invoice, and a Checkout receipt is not one.
 *
 * ## Self-serve Checkout is unchanged and stays
 *
 * The two are for different moments. Checkout is a customer paying under their own initiative,
 * on a page they are already looking at, where a 24-hour window is irrelevant because they pay
 * within a minute. This is the owner asking somebody to pay something, later, by email.
 * ============================================================================
 */
export interface InvoiceRequest {
  /**
   * The Stripe customer to bill. **Required, unlike a Checkout session.**
   *
   * An invoice has to belong to a customer — there is no guest path — so the caller resolves
   * or creates one first. That is stricter than Checkout and it is the better shape: it is
   * exactly the duplicate-customer problem `customerId` was added to `CheckoutSessionRequest`
   * to fix, made impossible rather than merely handled.
   */
  readonly customerId: string;
  readonly priceId: string;
  /** What the line reads as on the invoice and the PDF. */
  readonly description: string;
  /** How long they have. Stripe sends its own reminders against this. */
  readonly daysUntilDue: number;
  readonly metadata: Readonly<Record<string, string>>;
}

export interface CreatedInvoice {
  readonly id: string;
  /** The permanent hosted page. Null is treated as an error by the caller. */
  readonly url: string | null;
  readonly number: string | null;
}

export interface StripeClient {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CreatedCheckoutSession>;
  /**
   * Finds or creates the Stripe customer for an address.
   *
   * Needed because an invoice cannot be raised against a bare email the way a Checkout session
   * can. Searching before creating is what stops the owner-sent path minting a second customer
   * for somebody who already has one — the same failure `customerId` fixed on the Checkout
   * side, arriving here as a requirement rather than an option.
   */
  ensureCustomer(params: {
    readonly email: string;
    readonly name?: string | undefined;
  }): Promise<{ readonly id: string }>;
  /**
   * Raises an invoice, finalises it and sends it. See `InvoiceRequest`.
   *
   * One method rather than three, because a draft invoice nobody finalised is indistinguishable
   * from a payment nobody asked for — and the three steps have no meaningful intermediate state
   * for this application to hold.
   */
  createAndSendInvoice(request: InvoiceRequest): Promise<CreatedInvoice>;
  /**
   * What a configured Price actually charges. Retrieved before every checkout session
   * so a mistyped dashboard amount is refused loudly rather than sent to a client.
   */
  getPriceAmount(priceId: string): Promise<PriceAmount>;
  /**
   * A Stripe customer-portal session, so a subscribed client can manage their own
   * billing details and invoices on Stripe's hosted page.
   */
  createBillingPortalSession(params: {
    readonly customerId: string;
    readonly returnUrl: string;
  }): Promise<{ readonly url: string }>;
  /**
   * A negative customer-balance transaction — the response-guarantee remedy. The
   * credit sits on the customer and Stripe applies it to the next invoice
   * automatically; no coupon is involved.
   */
  createCustomerBalanceCredit(params: {
    readonly customerId: string;
    readonly amountCents: number;
    readonly currency: string;
    readonly description: string;
  }): Promise<{ readonly id: string }>;
  /**
   * Refunds up to `amountCents` of the subscription's most recent paid invoice —
   * the guarantee remedy when the client is leaving and no next invoice exists.
   * @throws when the subscription has no refundable paid invoice.
   */
  refundSubscriptionCharge(params: {
    readonly subscriptionId: string;
    readonly amountCents: number;
  }): Promise<{ readonly id: string }>;
  /**
   * Verifies a webhook payload against its signature header.
   * @throws when the signature is invalid — the caller answers 400, never 500.
   */
  verifyWebhook(payload: Buffer, signature: string): VerifiedStripeEvent;
}

export interface RealStripeClientOptions {
  readonly secretKey: string;
  readonly webhookSecret: string;
}

export function createStripeClient(options: RealStripeClientOptions): StripeClient {
  const stripe = new Stripe(options.secretKey);

  return {
    async createCheckoutSession(request) {
      const session = await stripe.checkout.sessions.create({
        mode: request.mode,
        line_items: [{ price: request.priceId, quantity: 1 }],
        /*
         * ==================================================================
         * BANK TRANSFER, ON THE ONE-OFF PAYMENTS ONLY
         * ==================================================================
         *
         * A $2,450 instalment on a card costs about $73 in fees; the same payment by ACH costs
         * cents. Over a build's two halves that is roughly $133 the business keeps, on a price
         * that is already the discounted one.
         *
         * **What it costs is time.** An ACH debit clears in several business days rather than
         * seconds, and this system already handles that correctly: the Checkout session
         * completes `unpaid`, `sessionIsPaid` refuses to advance anything, and the money is
         * announced later by `checkout.session.async_payment_succeeded` — or not, by
         * `async_payment_failed`, which now reaches the customer as well as the owner. Nothing
         * downstream assumes a payment is instant.
         *
         * The trade is therefore: the deposit takes a few days to put somebody on the
         * schedule. That is acceptable on a build that takes two to four weeks, and the
         * customer chooses — card is still offered and is still what most people will use.
         *
         * **Subscriptions stay card-only.** A recurring charge that can silently fail days
         * later, on a plan whose whole promise is a monthly report arriving, is a different
         * kind of risk from a one-off instalment — and Growth Partner's fee is small enough
         * that the saving would not pay for the first missed month.
         * ==================================================================
         */
        ...(request.mode === 'payment'
          ? { payment_method_types: ['card' as const, 'us_bank_account' as const] }
          : {}),
        // Exactly one of these: Stripe refuses a session carrying both.
        ...(request.customerId
          ? { customer: request.customerId }
          : { customer_email: request.customerEmail }),
        metadata: { ...request.metadata },
        /*
         * The same metadata again on the objects the session creates: the subscription,
         * so subscription webhooks can find the project; the PaymentIntent, so a later
         * refund's charge can be traced back to what was refunded.
         */
        ...(request.mode === 'subscription'
          ? { subscription_data: { metadata: { ...request.metadata } } }
          : { payment_intent_data: { metadata: { ...request.metadata } } }),
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        // A stable label for comparing checkout flows in the Stripe dashboard.
        integration_identifier: 'jobforge-checkout-nqvwrkte',
      });

      return { id: session.id, url: session.url };
    },

    async ensureCustomer({ email, name }) {
      /*
       * Searched before created. `list` by email rather than the Search API: search is
       * eventually consistent by Stripe's own documentation, and a customer created a second
       * ago is exactly the one this call is most likely to be asked about.
       */
      const existing = await stripe.customers.list({ email, limit: 1 });
      const found = existing.data[0];
      if (found) return { id: found.id };

      const created = await stripe.customers.create({ email, ...(name ? { name } : {}) });
      return { id: created.id };
    },

    async createAndSendInvoice(request) {
      /*
       * Draft first, then the line, then finalise, then send. The order is Stripe's and it is
       * not optional: an invoice item attaches to a *draft*, and finalising is what turns a
       * draft into a document with a number and a permanent URL.
       *
       * `collection_method: 'send_invoice'` is what makes this an invoice a person pays rather
       * than a charge Stripe attempts against a stored card — which is the whole difference
       * between this and the subscription path.
       */
      const draft = await stripe.invoices.create({
        customer: request.customerId,
        collection_method: 'send_invoice',
        days_until_due: request.daysUntilDue,
        description: request.description,
        metadata: { ...request.metadata },
        /* Stripe's own reminder schedule, which is half the reason to use an invoice at all. */
        auto_advance: true,
        /*
         * Bank transfer offered here too, and it matters more on an invoice than on a Checkout
         * page: an invoice is what a client's bookkeeper opens, and a bookkeeper paying a
         * four-figure bill reaches for a bank transfer rather than a company card. The saving
         * is the same ~$73 an instalment. See the note on the Checkout path above.
         */
        payment_settings: { payment_method_types: ['card', 'us_bank_account'] },
      });

      if (!draft.id) throw new Error('Stripe returned an invoice with no id.');

      /*
       * `pricing: { price }` rather than a bare `price`, which is what current API versions
       * take — the flat field was removed. The amount still comes from the Price, so
       * `requireVerifiedPrice` remains the only thing that decides what a client is charged
       * and no figure is ever passed from here.
       */
      await stripe.invoiceItems.create({
        customer: request.customerId,
        invoice: draft.id,
        pricing: { price: request.priceId },
        quantity: 1,
      });

      const finalised = await stripe.invoices.finalizeInvoice(draft.id);
      if (!finalised.id) throw new Error('Stripe returned a finalised invoice with no id.');

      const sent = await stripe.invoices.sendInvoice(finalised.id);

      return {
        id: sent.id ?? finalised.id,
        url: sent.hosted_invoice_url ?? null,
        number: sent.number ?? null,
      };
    },

    async getPriceAmount(priceId) {
      const price = await stripe.prices.retrieve(priceId);
      return { unitAmountCents: price.unit_amount, currency: price.currency };
    },

    async createBillingPortalSession({ customerId, returnUrl }) {
      const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
      });
      return { url: session.url };
    },

    async createCustomerBalanceCredit({ customerId, amountCents, currency, description }) {
      // Negative amount = a credit that reduces the customer's next invoice.
      const transaction = await stripe.customers.createBalanceTransaction(customerId, {
        amount: -Math.abs(amountCents),
        currency,
        description,
      });
      return { id: transaction.id };
    },

    async refundSubscriptionCharge({ subscriptionId, amountCents }) {
      const invoices = await stripe.invoices.list({
        subscription: subscriptionId,
        status: 'paid',
        limit: 1,
      });
      const invoice = invoices.data[0];
      if (!invoice?.id) {
        throw new Error('The subscription has no paid invoice to refund.');
      }

      /*
       * Current API versions attach payments to invoices through InvoicePayments;
       * the invoice object itself no longer carries a payment_intent field.
       */
      const payments = await stripe.invoicePayments.list({ invoice: invoice.id, status: 'paid' });
      const payment = payments.data[0]?.payment;
      const paymentIntentId =
        typeof payment?.payment_intent === 'string'
          ? payment.payment_intent
          : payment?.payment_intent?.id;
      const chargeId = typeof payment?.charge === 'string' ? payment.charge : payment?.charge?.id;

      if (!paymentIntentId && !chargeId) {
        throw new Error('The paid invoice has no refundable payment.');
      }

      const refund = await stripe.refunds.create({
        ...(paymentIntentId ? { payment_intent: paymentIntentId } : { charge: chargeId }),
        amount: amountCents,
      });
      return { id: refund.id };
    },

    verifyWebhook(payload, signature) {
      const event = stripe.webhooks.constructEvent(payload, signature, options.webhookSecret);
      return {
        id: event.id,
        type: event.type,
        data: { object: event.data.object as unknown as Record<string, unknown> },
      };
    },
  };
}
