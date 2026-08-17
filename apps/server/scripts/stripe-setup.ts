/*
 * ============================================================================
 * STRIPE CATALOG SETUP — create or verify the exact objects the app expects
 * ============================================================================
 *
 * Usage, from the repo root (reads STRIPE_SECRET_KEY from .env; never prints it):
 *
 *     npm run stripe:setup --workspace server            # create-or-verify
 *     npm run stripe:setup --workspace server -- --verify  # verify only, change nothing
 *
 * What it manages — exactly two Products and four Prices, nothing else:
 *
 *     Website Build    → build_deposit ($2,450 one-time), build_final ($2,450 one-time)
 *     Growth Partner   → growth_partner_monthly ($299/mo), growth_partner_annual ($2,990/yr)
 *
 * Amounts are imported from `src/features/billing/billing.amounts.ts`, the same
 * constants the app verifies against before creating any Checkout Session — so this
 * script cannot drift from the application.
 *
 * Idempotent: Prices are found by lookup key and verified; existing objects are never
 * modified (Stripe Prices are immutable by design — a wrong amount is reported as an
 * error telling you to archive and re-run, never "fixed" silently).
 *
 * Safety: refuses to run against a live-mode key. The founding→standard transition is
 * documented in docs/stripe-pricing-transition.md — it is a deliberate, coordinated
 * change, not something this script does on its own.
 * ============================================================================
 */
import dotenv from 'dotenv';
import Stripe from 'stripe';
import {
  BILLING_CURRENCY,
  EXPECTED_AMOUNT_CENTS,
} from '../src/features/billing/billing.amounts.js';

/* Three levels — see the note in `src/config/env.ts`. The repository root is two up. */
dotenv.config({ path: ['.env', '../.env', '../../.env'], quiet: true });

interface PriceSpec {
  readonly lookupKey: string;
  readonly envVar: string;
  readonly unitAmountCents: number;
  readonly recurring: { readonly interval: 'month' | 'year' } | null;
  readonly nickname: string;
}

interface ProductSpec {
  readonly name: string;
  readonly description: string;
  readonly prices: readonly PriceSpec[];
}

/*
 * ============================================================================
 * THE TWO `name` FIELDS ARE WIRE VALUES. THE DESCRIPTIONS ARE NOT.
 * ============================================================================
 *
 * `findProductByName` looks a Product up by its exact name, so renaming one here does not
 * rename anything in Stripe — it makes the script fail to find the Product that exists and
 * create a second one beside it, with the prices then split across two Products and the
 * lookup keys pointing at whichever ran first. So "Website Build" and "Growth Partner" stay
 * as they are. The customer-facing name of the build changed to "Customer Conversion Build"
 * and lives in the description instead, which is the field Stripe actually renders.
 *
 * Descriptions are safe to edit here **and only take effect on a Product that does not
 * exist yet**: the loop below creates with a description and otherwise only logs "Found".
 * Changing the wording of a live Product is a Dashboard edit, and the script says so when
 * it runs. Renaming a live Product is a Dashboard edit too — and one that has to be made
 * in the same breath as changing the string above it, or the next run creates a duplicate.
 * ============================================================================
 */
const CATALOG: readonly ProductSpec[] = [
  {
    name: 'Website Build',
    description:
      'Customer Conversion Build — a website built to turn more of the people already finding you into calls and quote requests, measured from launch day: research, copy, design, development, conversion tracking, launch verification, and the first 30 days after it goes live.',
    prices: [
      {
        lookupKey: 'build_deposit',
        envVar: 'STRIPE_PRICE_BUILD_DEPOSIT',
        unitAmountCents: EXPECTED_AMOUNT_CENTS['build-deposit'],
        recurring: null,
        nickname: 'Founding deposit',
      },
      {
        lookupKey: 'build_final',
        envVar: 'STRIPE_PRICE_BUILD_FINAL',
        unitAmountCents: EXPECTED_AMOUNT_CENTS['build-final'],
        recurring: null,
        nickname: 'Founding launch payment',
      },
    ],
  },
  {
    name: 'Growth Partner',
    /*
     * Stripe renders this on the Checkout line item and on every invoice, which makes it
     * one of the few strings in the repository a customer reads at the moment they are
     * deciding to pay. The previous wording led with care, monitoring and maintenance —
     * upkeep, priced monthly, which is the reading this product cannot afford. It leads
     * with the measurement now, and it promises a report and the work behind it rather
     * than a result.
     */
    description:
      'Growth Partner — measurement and improvement after launch: a monthly Website Performance Report covering the enquiries that came in, whether that moved, what was changed and why, and what is being looked at next, plus the improvement work behind it, with hosting, updates and monitoring underneath and a 24-business-hour response guarantee.',
    prices: [
      {
        lookupKey: 'growth_partner_monthly',
        envVar: 'STRIPE_PRICE_GROWTH_PARTNER_MONTHLY',
        unitAmountCents: EXPECTED_AMOUNT_CENTS['growth-partner-monthly'],
        recurring: { interval: 'month' },
        nickname: 'Growth Partner monthly',
      },
      {
        lookupKey: 'growth_partner_annual',
        envVar: 'STRIPE_PRICE_GROWTH_PARTNER_ANNUAL',
        unitAmountCents: EXPECTED_AMOUNT_CENTS['growth-partner-annual'],
        recurring: { interval: 'year' },
        nickname: 'Growth Partner annual',
      },
    ],
  },
];

function fail(message: string): never {
  console.error(`\n✖ ${message}`);
  process.exit(1);
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

async function findProductByName(stripe: Stripe, name: string): Promise<Stripe.Product | null> {
  const result = await stripe.products.search({ query: `active:'true' AND name:'${name}'` });
  return result.data.find((product) => product.name === name) ?? null;
}

function describePrice(spec: PriceSpec): string {
  const cadence = spec.recurring ? `/${spec.recurring.interval}` : ' one-time';
  return `${spec.lookupKey} (${money(spec.unitAmountCents)}${cadence})`;
}

function priceMatches(price: Stripe.Price, spec: PriceSpec): string | null {
  if (price.unit_amount !== spec.unitAmountCents) {
    return `charges ${price.unit_amount === null ? 'no fixed amount' : money(price.unit_amount)}, expected ${money(spec.unitAmountCents)}`;
  }
  if (price.currency !== BILLING_CURRENCY) {
    return `is in ${price.currency}, expected ${BILLING_CURRENCY}`;
  }
  const interval = price.recurring?.interval ?? null;
  const expectedInterval = spec.recurring?.interval ?? null;
  if (interval !== expectedInterval) {
    return `is ${interval ? `recurring ${interval}ly` : 'one-time'}, expected ${expectedInterval ? `recurring ${expectedInterval}ly` : 'one-time'}`;
  }
  return null;
}

async function main(): Promise<void> {
  const verifyOnly = process.argv.includes('--verify');
  const secretKey = process.env['STRIPE_SECRET_KEY'];

  if (!secretKey) {
    fail(
      'STRIPE_SECRET_KEY is not set. Put your Stripe TEST secret key in the repo-root .env first.',
    );
  }
  if (!/^(sk|rk)_test_/.test(secretKey)) {
    fail(
      'STRIPE_SECRET_KEY is not a test-mode key. This script only runs against Stripe Test Mode; set up live mode by re-running with a live key only after every test-mode check passes — and do that deliberately, by hand.',
    );
  }

  const stripe = new Stripe(secretKey);
  const problems: string[] = [];
  const envLines: string[] = [];
  /** Products whose live description no longer matches this file. Never a `problem`. */
  const descriptionDrift: { readonly name: string; readonly description: string }[] = [];

  for (const productSpec of CATALOG) {
    let product = await findProductByName(stripe, productSpec.name);

    if (!product) {
      if (verifyOnly) {
        problems.push(`Product "${productSpec.name}" does not exist.`);
        continue;
      }
      product = await stripe.products.create({
        name: productSpec.name,
        description: productSpec.description,
      });
      console.log(`✔ Created product "${productSpec.name}" (${product.id})`);
    } else {
      console.log(`✔ Found product "${productSpec.name}" (${product.id})`);

      /*
       * Reported, never patched. An existing Product's description is a string customers
       * have already been shown on issued invoices, and rewriting it as a side effect of a
       * verification run is not a change anybody asked this script to make. So a
       * description that has moved on in the repository is printed at the end with the
       * exact text to paste — which is the only way the wording above ever reaches a
       * Stripe account that already has these Products.
       */
      if (product.description !== productSpec.description) {
        descriptionDrift.push({
          name: productSpec.name,
          description: productSpec.description,
        });
      }
    }

    for (const spec of productSpec.prices) {
      const existing = await stripe.prices.list({
        lookup_keys: [spec.lookupKey],
        limit: 1,
      });
      let price = existing.data[0] ?? null;

      if (price) {
        const mismatch = priceMatches(price, spec);
        if (mismatch) {
          problems.push(
            `Price ${describePrice(spec)} exists as ${price.id} but ${mismatch}. Prices are immutable: archive it in the Dashboard, then re-run this script to create the correct one.`,
          );
          continue;
        }
        if (price.product !== product.id) {
          problems.push(
            `Price ${spec.lookupKey} (${price.id}) belongs to product ${String(price.product)}, expected "${productSpec.name}" (${product.id}).`,
          );
          continue;
        }
        console.log(`  ✔ ${describePrice(spec)} → ${price.id}`);
      } else {
        if (verifyOnly) {
          problems.push(`Price ${describePrice(spec)} does not exist.`);
          continue;
        }
        price = await stripe.prices.create({
          product: product.id,
          currency: BILLING_CURRENCY,
          unit_amount: spec.unitAmountCents,
          lookup_key: spec.lookupKey,
          nickname: spec.nickname,
          ...(spec.recurring ? { recurring: { interval: spec.recurring.interval } } : {}),
        });
        console.log(`  ✔ Created ${describePrice(spec)} → ${price.id}`);
      }

      envLines.push(`${spec.envVar}=${price.id}`);
    }
  }

  if (problems.length > 0) {
    console.error('\nProblems found:');
    for (const problem of problems) console.error(`  ✖ ${problem}`);
    process.exit(1);
  }

  console.log('\nAll Stripe objects match the application exactly.');
  if (envLines.length > 0) {
    console.log('\nPut these in your .env (price ids are not secrets):\n');
    for (const line of envLines) console.log(`  ${line}`);
  }

  if (descriptionDrift.length > 0) {
    console.log(
      '\nDescriptions have changed in the repository and this script does not update an existing Product.',
    );
    console.log(
      'Stripe shows a Product description on Checkout line items and on invoices, so until these are edited by hand in the Dashboard, customers still read the old wording:\n',
    );
    for (const item of descriptionDrift) {
      console.log(`  ${item.name} → Product → Description:`);
      console.log(`    ${item.description}\n`);
    }
  }

  console.log(
    '\nStill manual in the Dashboard: the webhook endpoint (+ STRIPE_WEBHOOK_SECRET) and enabling the Customer Portal. See README "Stripe setup".',
  );
}

main().catch((error: unknown) => {
  // Never echo the error object wholesale — SDK errors can embed request details.
  const message = error instanceof Error ? error.message : String(error);
  fail(`Stripe request failed: ${message}`);
});
