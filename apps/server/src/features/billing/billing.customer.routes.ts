import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { parseBody } from '../../lib/requestSchema.js';
import { requireCapability, requireRequestAuth } from '../auth/index.js';
import type { ProjectService } from '../projects/index.js';
import { BILLING_PRODUCTS } from './billing.types.js';
import type { BillingService } from './billing.service.js';
import { buildCustomerBillingSummary, type CustomerBillingSummary } from './billing.summary.js';

export interface CustomerBillingRoutesDependencies {
  readonly billingService: BillingService;
  readonly projectService: ProjectService;
  readonly rateLimiter?: RequestHandler | undefined;
}

/**
 * What a customer may name, and — separately — when they may buy it.
 *
 * ============================================================================
 * TWO LAYERS, BECAUSE THEY ANSWER TWO DIFFERENT QUESTIONS
 * ============================================================================
 *
 * This list used to be the whole gate, and it excluded `build-final` entirely. The reason
 * given was right: "a customer paying the second half before there is a first half is not a
 * flow that means anything". What changed is that the flow now has a first half to check for —
 * a deposit that has cleared, and a build that has reached launch.
 *
 * So the enum answers *is this a thing a customer buys at all* — which is a fact about the
 * product line and never varies — and `AVAILABILITY` below answers *may this customer buy it
 * today*, which is a fact about their project and varies constantly.
 *
 * Keeping the second in `buildCustomerBillingSummary` rather than writing it here is the
 * important half. The billing page renders `available.*` to decide which buttons exist; this
 * route consults the same booleans to decide which purchases are allowed. One rule, read
 * twice, so the screen and the endpoint cannot disagree — which is the specific defect that
 * let `available.plan` drift from the dashboard's `choose-plan` action for months.
 * ============================================================================
 */
const CUSTOMER_PURCHASABLE = [
  'build-deposit',
  'build-final',
  'growth-partner-monthly',
  'growth-partner-annual',
].filter((product): product is (typeof BILLING_PRODUCTS)[number] =>
  (BILLING_PRODUCTS as readonly string[]).includes(product),
);

/** Which `available` flag decides each product. The two subscriptions share one. */
const AVAILABILITY: Readonly<
  Record<(typeof BILLING_PRODUCTS)[number], keyof CustomerBillingSummary['available']>
> = {
  'build-deposit': 'deposit',
  'build-final': 'final',
  'growth-partner-monthly': 'plan',
  'growth-partner-annual': 'plan',
};

/** One sentence per product for the refusal, so it says what is actually wrong. */
const UNAVAILABLE: Readonly<Record<(typeof BILLING_PRODUCTS)[number], string>> = {
  'build-deposit': 'Your deposit is already paid — there is nothing further owed on it.',
  'build-final':
    'The launch payment opens once your deposit has cleared and your website is going live. If you think that has happened, send us a message and we will look.',
  'growth-partner-monthly':
    'Growth Partner starts on launch day. It will be here once your website is live.',
  'growth-partner-annual':
    'Growth Partner starts on launch day. It will be here once your website is live.',
};

const startCheckoutSchema = z.strictObject({
  product: z.enum(CUSTOMER_PURCHASABLE as [string, ...string[]]),
});

/**
 * `/api/app/billing` — what a signed-in customer may do with their own money.
 *
 * Three routes and no more, because Stripe already has the rest. Invoices, payment
 * methods, subscription cancellation and receipts all live in Stripe's hosted portal,
 * which is a page that is already built, already accessible, already PCI-compliant and
 * already correct. Rebuilding any of it here would be worse in every one of those ways.
 *
 * What is never returned: a Stripe customer id, a subscription id, a session id, a
 * payment-intent id or anything about a card. `buildCustomerBillingSummary` is an
 * allow-list — see the note there.
 */
export function createCustomerBillingRouter(
  dependencies: CustomerBillingRoutesDependencies,
): Router {
  const { billingService, projectService, rateLimiter } = dependencies;
  const router = Router();

  const limited: RequestHandler[] = rateLimiter ? [rateLimiter] : [];

  router.get('/', requireCapability('billing:read:own'), async (request, response) => {
    const auth = requireRequestAuth(request);
    const projects = await projectService.listForOwner(auth.user.id, 10);

    response.json(
      success({
        billing: buildCustomerBillingSummary({ user: auth.user, projects }),
      }),
    );
  });

  router.post(
    '/checkout',
    requireCapability('billing:checkout:own'),
    ...limited,
    async (request, response) => {
      const auth = requireRequestAuth(request);
      const { product } = parseBody(startCheckoutSchema, request.body);

      /*
       * The gate, and it is on the server because that is the only place a gate is one.
       *
       * The billing page hides the buttons it should hide, and that is presentation: a request
       * typed by hand reaches this line regardless. Recomputing from the same summary the page
       * renders means there is one rule about what may be bought and both surfaces read it.
       */
      const projects = await projectService.listForOwner(auth.user.id, 10);
      const billing = buildCustomerBillingSummary({ user: auth.user, projects });
      const purchasable = product as (typeof BILLING_PRODUCTS)[number];

      if (!billing.available[AVAILABILITY[purchasable]]) {
        throw new AppError('VALIDATION_ERROR', UNAVAILABLE[purchasable]);
      }

      const session = await billingService.createCustomerCheckoutSession({
        customer: {
          id: auth.user.id,
          email: auth.user.email,
          stripeCustomerId: auth.user.stripeCustomerId,
          /* Carried, not checked here. The refusal is in the service — see its note. */
          demo: auth.user.demo,
        },
        product: product as (typeof BILLING_PRODUCTS)[number],
      });

      /*
       * A URL to redirect to, and nothing else. In particular this does not mark
       * anything as paid — the browser reaching Stripe proves the browser reached
       * Stripe. The webhook is the only thing that changes state.
       */
      response.status(201).json(success({ url: session.url, product: session.product }));
    },
  );

  router.post(
    '/portal',
    requireCapability('billing:read:own'),
    ...limited,
    async (request, response) => {
      const auth = requireRequestAuth(request);

      const session = await billingService.createCustomerPortalSession({
        customer: {
          id: auth.user.id,
          email: auth.user.email,
          stripeCustomerId: auth.user.stripeCustomerId,
          demo: auth.user.demo,
        },
      });

      response.status(201).json(success({ url: session.url }));
    },
  );

  return router;
}
