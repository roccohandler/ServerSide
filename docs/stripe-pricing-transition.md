# Switching from founding to standard pricing

**Internal.** The exact, coordinated change the owner makes when the founding cohort
ends (the 10th founding agreement signs) and the build price becomes the standard
**$7,500**, paid as **$3,750 + $3,750**. Nothing in this file happens automatically,
and nothing else in the codebase hard-codes this transition — the guards below _force_
the steps to happen together by failing loudly when they don't.

Stripe Prices are immutable: the transition creates **new** Prices and archives the
founding ones. It never edits an existing Price.

## The steps, in order

1. **Publish the change** — in `client/src/config/pricing.ts`, set
   `foundingOffer.taken: 10` (or `enabled: false`). The site now shows one price,
   $7,500, and every founding block, saving line and comparison removes itself.

2. **Mirror the server's expected amounts** — in
   `server/src/features/billing/billing.amounts.ts`, set
   `BUILD_PRICE_CENTS = 750_000`. The halves ($3,750) stay derived; do not type them.
   _Guard:_ `client/src/config/pricing.sync.test.ts` fails the build until steps 1 and
   2 agree.

3. **Create the standard Prices in Stripe** (test mode first, then live) — run
   `npm run stripe:setup --workspace server`. Because the amounts now derive to
   $3,750, the script creates the new Prices under the same **Website Build** product.
   Give them fresh lookup keys by archiving the old ones first, or create manually:
   - Standard deposit — $3,750 one-time
   - Standard launch payment — $3,750 one-time

4. **Swap the environment variables** — point the existing names at the new Price ids:
   - `STRIPE_PRICE_BUILD_DEPOSIT=price_…` (the $3,750 deposit)
   - `STRIPE_PRICE_BUILD_FINAL=price_…` (the $3,750 final)

   The names `STRIPE_PRICE_BUILD_DEPOSIT_STANDARD` / `STRIPE_PRICE_BUILD_FINAL_STANDARD`
   are reserved for running both cohorts side by side; today the application reads only
   the two unsuffixed names, and a signed founding agreement that hasn't paid yet keeps
   its price by having its links minted before the swap (or by temporarily pointing the
   env back at the archived founding Prices — archived Prices still work for existing
   sessions but cannot be used in new ones, so mint any outstanding founding links first).

5. **Archive the founding Prices** in the Dashboard (Products → Website Build →
   the $2,450 prices → Archive). Never delete; they are the immutable record of what
   founding clients paid.

6. **Redeploy.** _Guard:_ the server retrieves every configured Price before creating
   a Checkout Session and refuses with a 503 if the amount disagrees with
   `billing.amounts.ts` — a missed step here can never mischarge a client; it can only
   refuse to create links until fixed.

7. **Sweep the unguarded prose** — README's commercial-model table and
   `docs/business-offer.md` carry $2,450/$8,488 literals that tests do not guard.
   Update them in the same commit.

## What does NOT change

- Growth Partner prices, products and env vars.
- The webhook endpoint, events, or any billing code.
- Anything about how Checkout Sessions are created — the same two-payment flow simply
  points at different Prices.
