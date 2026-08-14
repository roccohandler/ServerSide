# Offer configuration checklist — everything required from the owner

**Internal.** The single list of what the owner personally has to supply, confirm or do
before the offer is fully live and taking real payments. Code cannot complete any item
here. Cross-references: decisions with options live in `docs/owner-decisions-required.md`;
the commercial record is `docs/business-offer.md`.

Last reviewed: 2026-08-13.

---

## REQUIRED FROM OWNER

### BUSINESS

- [ ] Legal business name (entity for the client agreement and Stripe verification)
- [x] Customer-facing business name — **JobForge** (`content/site.ts`; renamed from ServiceSide 2026-08-13)
- [ ] Business address (Stripe verification requires one; the site publishes none — decide if it should)
- [ ] Business email on its own domain — currently a personal Gmail in `site.contact.email`
- [x] Business phone — 206-973-6798 (`content/site.ts`)
- [ ] Support email — currently the same personal Gmail; it is the response guarantee's
      contractual channel, so move it deliberately (`site.contact.supportEmail`)
- [x] Support hours — Mon–Fri 8am–6pm Pacific (`site.contact.hours`)

### PRICING (see owner-decisions 001–004)

- [ ] Confirm flagship standard price: $7,500 — **must be a price you will actually charge**
- [ ] Confirm founding price: $4,900
- [ ] Confirm founding cap of 10 and that case-study permission is genuinely required
- [x] Deposit percentage: 50% (derived, $2,450)
- [x] Final-payment timing: launch day
- [ ] Confirm Growth Partner price: $299/month, $2,990/year
- [x] Growth Partner Plus: removed 2026-08-13 (restore only as a deliberate decision)
- [ ] Confirm Growth Partner is optional (implemented as optional everywhere)
- [ ] Confirm minimum subscription term: 3 months

### FULFILLMENT

- [ ] Confirm the 2–4 week timeline is one you can keep at one build at a time
- [ ] Confirm 2 revision rounds
- [ ] Confirm the Launch Standard checklist (`docs/launch-standard-checklist.md`) matches
      what you will actually perform, every time
- [ ] Confirm the 30-day post-launch inclusion (owner-decisions 007)
- [ ] Confirm customer responsibilities as published (`responsibilities` in offer.ts)
- [ ] Fill the [OWNER DECISION REQUIRED] items in `docs/business-growth-partner-scope.md`
- [ ] Confirm the response SLA and pick the waiver mechanism (owner-decisions 009)

### GUARANTEES

- [ ] Confirm Launch Standard guarantee wording
- [ ] Confirm If-I-Break-It-I-Fix-It boundaries (`docs/guarantee-terms.md`)
- [ ] Confirm 24-business-hour response guarantee + automatic remedy
- [ ] Confirm there is deliberately no money-back guarantee on the build (or decide one)

### PAYMENT (see README "Stripe setup" for the walkthrough)

- [ ] Stripe account created
- [ ] Stripe business verification completed (legal name, address, ID, bank)
- [ ] Bank account connected for payouts
- [ ] Products created: Website Build, Growth Partner
- [ ] Prices created: $2,450 one-time (deposit), $2,450 one-time (launch),
      $299/month recurring, $2,990/year recurring
- [ ] Price IDs pasted into env: `STRIPE_PRICE_BUILD_DEPOSIT`, `STRIPE_PRICE_BUILD_FINAL`,
      `STRIPE_PRICE_GROWTH_PARTNER_MONTHLY`, `STRIPE_PRICE_GROWTH_PARTNER_ANNUAL`
- [ ] `STRIPE_SECRET_KEY` configured (server env only — never `VITE_`)
- [ ] Webhook endpoint added: `https://<domain>/api/billing/webhook`, subscribed to the
      seven events listed in `.env.example`
- [ ] `STRIPE_WEBHOOK_SECRET` configured
- [ ] `BILLING_ADMIN_TOKEN` set (long, random)
- [ ] `PUBLIC_SITE_URL` set to the production origin
- [ ] Customer portal enabled in Stripe (Settings → Billing → Customer portal)
- [ ] Test-mode payment completed end to end (deposit link → pay → webhook → project
      shows `deposit-paid` → owner email received)
- [ ] Test-mode failed payment exercised (declined card → nothing marked paid)
- [ ] Test-mode subscription completed (subscribe → `active`; cancel → `canceled`)
- [ ] Live-mode keys swapped in only after all test-mode items pass

### LEGAL (nothing in this repo is attorney-approved; the pages say so on screen)

- [ ] Written client agreement drafted and reviewed (project scope, payments, IP,
      revisions, termination)
- [ ] Growth Partner agreement (term, cancellation, SLA, waiver mechanism)
- [ ] Terms page reviewed (`content/legal.ts`)
- [ ] Privacy policy reviewed (`content/legal.ts`)
- [ ] Refund policy decided and documented (owner-decisions 010)
- [ ] Cancellation policy confirmed as published
- [ ] Guarantee boundaries reviewed (`docs/guarantee-terms.md`)

### BRAND / ASSETS

- [x] Name, favicon, OG image present
- [ ] Replace demonstration portfolio with real client work as it exists
      (`docs/proof-collection.md` is the process)

### ANALYTICS

- [ ] Choose and connect an analytics provider (the event seam is ready —
      `lib/analytics.ts`; update `content/legal.ts` in the same commit, as its comment
      requires)
- [ ] Verify the funnel events flow: cta_clicked → audit_* → lead_form_submitted →
      pricing_tier_selected → onboarding_submitted
