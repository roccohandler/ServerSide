import { Router, type RequestHandler } from 'express';
import { z } from 'zod';
import { success } from '../../lib/apiResponse.js';
import { parseBody } from '../../lib/requestSchema.js';
import { requireCapability, requireRequestAuth } from '../auth/index.js';
import type { ProjectService } from '../projects/index.js';
import { BILLING_PRODUCTS } from './billing.types.js';
import type { BillingService } from './billing.service.js';
import { buildCustomerBillingSummary } from './billing.summary.js';

export interface CustomerBillingRoutesDependencies {
  readonly billingService: BillingService;
  readonly projectService: ProjectService;
  readonly rateLimiter?: RequestHandler | undefined;
}

/**
 * Only the two things a customer may buy on their own.
 *
 * The two build payments are deliberately excluded — the final payment is owed against
 * an agreed project and is sent as a link by the owner, and a customer paying the
 * second half before there is a first half is not a flow that means anything. An enum
 * of every product would have allowed both.
 */
const CUSTOMER_PURCHASABLE = [
  'build-deposit',
  'growth-partner-monthly',
  'growth-partner-annual',
].filter((product): product is (typeof BILLING_PRODUCTS)[number] =>
  (BILLING_PRODUCTS as readonly string[]).includes(product),
);

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

      const session = await billingService.createCustomerCheckoutSession({
        customer: {
          id: auth.user.id,
          email: auth.user.email,
          stripeCustomerId: auth.user.stripeCustomerId,
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
        },
      });

      response.status(201).json(success({ url: session.url }));
    },
  );

  return router;
}
