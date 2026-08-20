import { describe, expect, it, vi } from 'vitest';
import { silentLogger } from '../../lib/logger.js';
import {
  createFakeStripeClient,
  createInMemoryBillingRepository,
  createRecordingEmailService,
} from '../../testing/fakes.js';
import type { StoredUser } from '../auth/index.js';
import type { ProjectScope, StoredProject } from '../projects/index.js';
import { amountLabel, BUILD_PRICE_CENTS, EXPECTED_AMOUNT_CENTS } from './billing.amounts.js';
import { createBillingService, type BillingPriceIds } from './billing.service.js';
import { buildCustomerBillingSummary } from './billing.summary.js';

/*
 * ============================================================================
 * CLOSING THE PAYMENT LOOP
 * ============================================================================
 *
 * Three things arrived together in phase 4 and each of them is a rule about money:
 *
 *   1. An owner-created link can be **sent** to the client rather than pasted by hand.
 *   2. `available.final` decides when the second instalment may be bought, and it is the
 *      same boolean the billing page, the dashboard and the checkout route all read.
 *   3. Neither of those may make it possible to buy something twice, or out of order.
 *
 * The gate is tested here at the level it is *written* — a pure function over a user and
 * their projects — rather than only through HTTP, because every one of its conditions is a
 * different state of the same project and building each one through the API would be twenty
 * requests to assert one boolean.
 * ============================================================================
 */

const PRICE_IDS: BillingPriceIds = {
  'build-deposit': 'price_deposit',
  'build-final': 'price_final',
  'growth-partner-monthly': 'price_monthly',
  'growth-partner-annual': 'price_annual',
};

function build() {
  const repository = createInMemoryBillingRepository();
  const emailService = createRecordingEmailService();
  const stripe = createFakeStripeClient();

  stripe.setPriceAmount('price_deposit', EXPECTED_AMOUNT_CENTS['build-deposit']);
  stripe.setPriceAmount('price_final', EXPECTED_AMOUNT_CENTS['build-final']);
  stripe.setPriceAmount('price_monthly', EXPECTED_AMOUNT_CENTS['growth-partner-monthly']);
  stripe.setPriceAmount('price_annual', EXPECTED_AMOUNT_CENTS['growth-partner-annual']);

  const notifier = {
    previewReady: vi.fn(),
    scopeReady: vi.fn(),
    approvalRequested: vi.fn(),
    tasksAssigned: vi.fn(),
    feedbackReplied: vi.fn(),
    projectLaunched: vi.fn(),
    paymentDue: vi.fn(),
    paymentFailed: vi.fn(),
    estimateChanged: vi.fn(),
    assessmentDelivered: vi.fn(),
    reportPublished: vi.fn(),
    fileDelivered: vi.fn(),
    owner: vi.fn(),
  };

  const service = createBillingService({
    repository,
    stripe,
    priceIds: PRICE_IDS,
    siteUrl: 'https://www.example.com',
    emailService,
    notificationRecipient: 'owner@example.com',
    notifier,
    logger: silentLogger,
  });

  return { service, repository, stripe, notifier };
}

async function agreedProject(service: ReturnType<typeof build>['service']) {
  return service.createProject({
    businessName: 'Cascade Heating',
    contactName: 'Dana Reyes',
    email: 'dana@cascadeheating.example',
  });
}

describe('a checkout link the owner sends', () => {
  it('emails the client only when asked, and says who it went to', async () => {
    const { service, notifier } = build();
    const project = await agreedProject(service);

    const quiet = await service.createCheckoutSession({
      projectId: project.id,
      product: 'build-deposit',
    });

    expect(quiet.emailedTo).toBeUndefined();
    expect(notifier.paymentDue).not.toHaveBeenCalled();

    const sent = await service.createCheckoutSession({
      projectId: project.id,
      product: 'build-deposit',
      notifyCustomer: true,
    });

    expect(sent.emailedTo).toBe('dana@cascadeheating.example');
    expect(notifier.paymentDue).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'deposit',
        businessName: 'Cascade Heating',
        /* The Stripe URL itself — this client may have no account to sign in to yet. */
        payUrl: sent.url,
      }),
    );
  });

  /*
   * The figure is never typed into a message. It comes from `EXPECTED_AMOUNT_CENTS`, which is
   * the same constant `requireVerifiedPrice` checks the Stripe Price against — so an email
   * quoting one number while Stripe charges another is not a mistake that can be made in one
   * place. Asserting the derivation rather than "$2,450" is what keeps that true after a
   * price change.
   */
  it('quotes the amount from the same constant the Price is verified against', async () => {
    const { service, notifier } = build();
    const project = await agreedProject(service);

    await service.createCheckoutSession({
      projectId: project.id,
      product: 'build-final',
      notifyCustomer: true,
    });

    expect(notifier.paymentDue).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'final', amountLabel: amountLabel('build-final') }),
    );
  });

  /*
   * The published terms say Growth Partner starts on launch day *only if the client chooses
   * it*. An unsolicited "pay for this monthly service" message is not that, whatever the
   * button that produced it said — so the send is refused at the service, not only by the
   * console's narrowed enum.
   */
  it('never emails a subscription link', async () => {
    const { service, notifier } = build();
    const project = await agreedProject(service);

    const result = await service.createCheckoutSession({
      projectId: project.id,
      product: 'growth-partner-monthly',
      notifyCustomer: true,
    });

    expect(result.url).toMatch(/^https:\/\//);
    expect(result.emailedTo).toBeUndefined();
    expect(notifier.paymentDue).not.toHaveBeenCalled();
  });

  /*
   * The refusal an operator has to be able to act on. `requireVerifiedPrice` compares the
   * configured Stripe Price against the published figure and refuses the whole operation
   * when they disagree — before a link exists, and before anybody is emailed.
   */
  it('creates nothing and sends nothing when Stripe disagrees with the published price', async () => {
    const { service, stripe, notifier } = build();
    const project = await agreedProject(service);

    stripe.setPriceAmount('price_deposit', 200_000);

    await expect(
      service.createCheckoutSession({
        projectId: project.id,
        product: 'build-deposit',
        notifyCustomer: true,
      }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });

    expect(stripe.checkoutRequests).toHaveLength(0);
    expect(notifier.paymentDue).not.toHaveBeenCalled();
  });
});

/*
 * ============================================================================
 * AN INVOICE, WHICH IS WHAT AN OWNER-SENT PAYMENT SHOULD HAVE BEEN
 * ============================================================================
 *
 * DECISION 041. A Checkout Session expires after 24 hours, so one sent on a Friday afternoon
 * is dead before Monday — and the client's only symptom is an expiry page for a payment they
 * were trying to make.
 *
 * Four properties, and three of them are about money going wrong quietly.
 * ============================================================================
 */
describe('an invoice the owner sends', () => {
  it('bills the verified Price and nothing this side computed', async () => {
    const { service, stripe } = build();
    const project = await agreedProject(service);

    const invoice = await service.createInvoice({
      projectId: project.id,
      product: 'build-deposit',
    });

    expect(invoice.url).toMatch(/^https:\/\//);
    expect(invoice.emailedTo).toBe('dana@cascadeheating.example');

    const [request] = stripe.invoiceRequests;
    expect(request?.priceId).toBe('price_deposit');
    /*
     * No amount anywhere in the request. The figure comes from the Stripe Price, which
     * `requireVerifiedPrice` has already checked against the published one — the same
     * property the Checkout path holds, and the reason neither can produce a wrong charge.
     */
    expect(JSON.stringify(request)).not.toContain('245000');
  });

  /*
   * The refusal an operator has to be able to act on, and it happens before anything exists.
   * A mistyped dashboard Price is a loud 503 rather than a wrong figure in a client's inbox —
   * which on an invoice is considerably worse than on a link, because an invoice is a document
   * with a number that has to be credited rather than a URL that can be ignored.
   */
  it('raises nothing when Stripe disagrees with the published price', async () => {
    const { service, stripe } = build();
    const project = await agreedProject(service);

    stripe.setPriceAmount('price_deposit', 200_000);

    await expect(
      service.createInvoice({ projectId: project.id, product: 'build-deposit' }),
    ).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });

    expect(stripe.invoiceRequests).toHaveLength(0);
  });

  /*
   * The published terms say in five places that Growth Partner starts on launch day *only if
   * the client chooses it*. `createCheckoutSession` refuses to *email* a subscription link;
   * this refuses to create the thing at all, because an invoice with a due date is a
   * considerably stronger ask than a URL somebody can ignore.
   */
  it('refuses to invoice the monthly plan', async () => {
    const { service, stripe } = build();
    const project = await agreedProject(service);

    await expect(
      service.createInvoice({ projectId: project.id, product: 'growth-partner-monthly' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });

    expect(stripe.invoiceRequests).toHaveLength(0);
  });

  /*
   * One customer, not two. An invoice cannot bill a bare address the way Checkout can, so this
   * path resolves one — and resolving it from the project's stored id when there is one is
   * what stops the owner-sent path minting a second Stripe customer for a returning payer.
   */
  it('bills the customer the project already has, without looking one up', async () => {
    const { service, repository, stripe } = build();
    const project = await agreedProject(service);
    await repository.updateProject(project.id, { stripeCustomerId: 'cus_existing' });

    await service.createInvoice({ projectId: project.id, product: 'build-final' });

    expect(stripe.invoiceRequests[0]?.customerId).toBe('cus_existing');
    expect(stripe.customerLookups).toHaveLength(0);
  });

  it('resolves and remembers a customer the first time', async () => {
    const { service, repository, stripe } = build();
    const project = await agreedProject(service);

    await service.createInvoice({ projectId: project.id, product: 'build-deposit' });

    expect(stripe.customerLookups).toHaveLength(1);

    const stored = await repository.findProjectById(project.id);
    expect(stored?.stripeCustomerId).toBe(stripe.invoiceRequests[0]?.customerId);
  });
});

/* ------------------------------------------------------- what may be bought, and when */

function makeUser(overrides: Partial<StoredUser> = {}): StoredUser {
  return {
    id: 'user-1',
    email: 'dana@cascadeheating.example',
    name: 'Dana Reyes',
    role: 'customer',
    emailVerified: true,
    identities: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeProject(overrides: Partial<StoredProject> = {}): StoredProject {
  return {
    id: 'project-1',
    businessName: 'Cascade Heating',
    contactName: 'Dana Reyes',
    email: 'dana@cascadeheating.example',
    ownerUserId: 'user-1',
    status: 'deposit-paid',
    milestone: 'launching',
    approval: 'approved',
    depositStatus: 'paid',
    finalStatus: 'pending',
    subscriptionStatus: 'none',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  };
}

const availabilityFor = (project: StoredProject) =>
  buildCustomerBillingSummary({ user: makeUser(), projects: [project] }).available;

describe('when the launch instalment may be bought', () => {
  it('is offered once the deposit has cleared and the build is going live', () => {
    expect(availabilityFor(makeProject()).final).toBe(true);
  });

  /*
   * The condition that stops this being the back half of a build nobody started. Without it
   * the portal would sell the second instalment to somebody who has paid for nothing.
   */
  it('is refused when the deposit has not cleared', () => {
    expect(availabilityFor(makeProject({ depositStatus: 'pending' })).final).toBe(false);
  });

  /* Stripe would take the money a second time perfectly happily. */
  it('is refused when it is already paid', () => {
    expect(availabilityFor(makeProject({ finalStatus: 'paid' })).final).toBe(false);
  });

  /*
   * Half up front and half on launch day, which is what the published terms say. Collecting
   * the second half during the build is collecting for work not yet delivered.
   */
  it('is refused while the build is still in progress', () => {
    for (const milestone of ['onboarding', 'planning', 'building', 'review', 'approval'] as const) {
      expect(availabilityFor(makeProject({ milestone })).final, milestone).toBe(false);
    }
  });

  /*
   * ==========================================================================
   * AND IT STAYS OFFERED AFTER THE SITE GOES UP
   * ==========================================================================
   *
   * The plan said `milestone === 'launching'`. The build uses `>=`, and this is the test
   * that says why: `PROJECT_STATUSES` defines `launched` as "site live; final payment
   * received **or due**", so a live site with an outstanding balance is a documented state.
   * Equality would make the pay button appear when the launch began and vanish on the day
   * the site went up — leaving the owner chasing an invoice the portal had just stopped
   * offering to settle.
   * ==========================================================================
   */
  it('stays offered on a live site whose balance is outstanding', () => {
    expect(availabilityFor(makeProject({ milestone: 'live', status: 'launched' })).final).toBe(
      true,
    );
  });
});

/**
 * An accepted scope at the published price — the state a customer is in when the deposit is
 * legitimately theirs to pay. DECISION 040.
 *
 * A helper rather than an inline literal because every deposit test needs it now, and because
 * the two fields that matter (`acceptedAt` and `priceCents`) are exactly the two a test would
 * otherwise get subtly wrong while still passing.
 */
function acceptedScope(overrides: Partial<ProjectScope> = {}): ProjectScope {
  return {
    version: 1,
    summary: 'A six-page website for Cascade Heating.',
    lines: ['Home, about and contact', 'Six service pages'],
    priceCents: BUILD_PRICE_CENTS,
    sentAt: new Date('2026-01-01T00:00:00.000Z'),
    sentBy: 'Maxwell Cuenca',
    acceptedAt: new Date('2026-01-02T00:00:00.000Z'),
    acceptedByUserId: 'user-1',
    acceptedName: 'Dana Reyes',
    ...overrides,
  };
}

describe('when the deposit may be bought', () => {
  it('is offered once an accepted scope exists and the build is unpaid', () => {
    expect(
      availabilityFor(
        makeProject({ depositStatus: 'pending', status: 'agreed', scope: acceptedScope() }),
      ).deposit,
    ).toBe(true);
  });

  /*
   * ==========================================================================
   * RULE #35, ENFORCED BY THE SERVER RATHER THAN INTENDED BY THE BUSINESS
   * ==========================================================================
   *
   * `docs/business-offer.md` has always said the scope is agreed in writing before any
   * payment, and this button was the reason that was aspirational — a customer could pay
   * $2,450 against nothing anybody had written down.
   *
   * Three states, three refusals, and the third is the one that is easy to leave out.
   * ==========================================================================
   */
  it('is refused when no scope has been sent', () => {
    expect(
      availabilityFor(makeProject({ depositStatus: 'pending', status: 'agreed' })).deposit,
    ).toBe(false);
  });

  it('is refused when a scope has been sent but not accepted', () => {
    const sent = acceptedScope();
    const { acceptedAt: _at, acceptedByUserId: _by, acceptedName: _name, ...unaccepted } = sent;

    expect(
      availabilityFor(
        makeProject({ depositStatus: 'pending', status: 'agreed', scope: unaccepted }),
      ).deposit,
    ).toBe(false);
  });

  /*
   * The one that protects the customer rather than the business: they accepted one figure and
   * Checkout would charge another. A bespoke quote is a perfectly normal thing for the owner
   * to send — it is settled by an invoice (DECISION 041), not by the standard Checkout price,
   * and the button being absent is what makes that the only available path.
   */
  it('is refused when the accepted price is not the price Stripe would charge', () => {
    expect(
      availabilityFor(
        makeProject({
          depositStatus: 'pending',
          status: 'agreed',
          scope: acceptedScope({ priceCents: BUILD_PRICE_CENTS + 100_000 }),
        }),
      ).deposit,
    ).toBe(false);
  });

  it('is refused once it has been paid', () => {
    expect(availabilityFor(makeProject()).deposit).toBe(false);
  });

  /*
   * A cancelled project keeps an unpaid deposit forever, so the count alone left the
   * button sitting there indefinitely — inviting payment for work that has been called
   * off. Taking that money would be worse than refusing it; starting again is a new
   * project, which the owner creates.
   */
  it('is refused on a cancelled project, however unpaid it is', () => {
    expect(
      availabilityFor(
        makeProject({ depositStatus: 'pending', status: 'cancelled', scope: acceptedScope() }),
      ).deposit,
    ).toBe(false);
  });
});
