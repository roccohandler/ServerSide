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

export interface StripeClient {
  createCheckoutSession(request: CheckoutSessionRequest): Promise<CreatedCheckoutSession>;
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
        customer_email: request.customerEmail,
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
