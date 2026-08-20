# The conversion-system implementation plan

**Created 2026-08-19.** The tactical plan for implementing every recommendation from the
three-workstream conversion / assessment / positioning report, with the owner's decisions
resolved. This file is the working checklist — items are ticked as they land.

> Read `03_plan/deferred_work_plan.md` §0 first if you are new to these plans: it records
> where measurement contradicted the plan, and this one will accumulate the same.

---

## 0. What the owner decided

Every one of these was open when the report was delivered. They are answers, not proposals,
and each becomes an entry in `docs/owner-decisions-required.md`.

| #            | Question                                                           | Answer                                                                                                                                                                   |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tax          | WA sales tax presentation                                          | **"Plus applicable sales tax."** Prices stay $4,900 / $299; a tax line appears on pricing, checkout and terms; Stripe Tax calculates it                                  |
| 001          | Is $7,500 real?                                                    | **Yes.** It is the rate card. Two-price presentation stands                                                                                                              |
| 009          | Response-guarantee remedy                                          | **Define it.** A month's credit against the next invoice — **not** on request; see the correction in the register                                                        |
| 010          | Deposit refund policy                                              | **Refundable until work starts, then pay-for-work-done**, capped at the deposit                                                                                          |
| 011          | Launch vs final payment                                            | **Payment first, same-day go-live**, with a **10-business-day deemed-acceptance** backstop                                                                               |
| 013          | Support address                                                    | Move off the personal Gmail; one config value, one edit                                                                                                                  |
| Name         | JobForge vs the collision                                          | **Keep it, defend it with copy.** Trademark check flagged, not blocking                                                                                                  |
| Tagline      |                                                                    | **"Websites that ask for the job."**                                                                                                                                     |
| Working line | "We build software to help service-based businesses get more jobs" | **Rejected.** Recorded so it is not revived                                                                                                                              |
| Hero         |                                                                    | **Keep** "More of the people already finding you should be calling you."                                                                                                 |
| Analytics    | Provider                                                           | **Cookieless** (Plausible/Fathom shape), **no consent banner**                                                                                                           |
| Payments     | Owner-sent                                                         | **Stripe Invoices** replace expiring Checkout links                                                                                                                      |
| Scope        | Rule #35 gap                                                       | **A scope record the customer accepts in the portal**, gating `available.deposit`                                                                                        |
| Blueprint    | Relationship to `/audit`                                           | **New route `/blueprint`.** Result shown free; account to keep it                                                                                                        |
| Blueprint    | Money questions                                                    | **Typical job value only, optional, banded**                                                                                                                             |
| Blueprint    | §32 fabrication rule                                               | **Two visually distinct, labelled sections**                                                                                                                             |
| Terms        | Delivery                                                           | Completion = the eight Launch Standard checks · a revision round is one consolidated list · 30 days of silence pauses the project · out-of-scope quoted before it starts |
| Founding     | Mechanism                                                          | **Console control for the counter + a stored case-study permission record**                                                                                              |
| Payload      | Budget                                                             | **Lazy-load new routes, keep the ceiling where it is**                                                                                                                   |
| VCS          |                                                                    | **Commit in logical batches**, `verify` green at each                                                                                                                    |
| Also         |                                                                    | ACH · Google Business Profile prompt · About rewrite · portal proof · revision counter · ownership promise · all ten defects                                             |

---

## 1. Constraints this plan must not break

Non-negotiable, and each one has a guard that fails the build.

1. **Payload budget.** Eager JS 545.0 kB raw / 164.0 kB gz; CSS 120.0 / 20.0 kB gz. Measured
   today: 163.6 gz JS, 19.1 gz CSS. Roughly **0.4 kB JS and 0.9 kB CSS of headroom.** Every
   new route is `lazy()`, reaching a concrete module and never a feature barrel.
2. **The price triangle.** `config/pricing.ts` → `billing.amounts.ts` → Stripe Prices, guarded
   by `pricing.sync.test.ts` and `requireVerifiedPrice`. A tax rate is **not** a price and must
   not enter the triangle as one.
3. **No promised results.** `content.test.ts` sweeps the hero and the guarantee block for
   result claims. New copy goes through the same sweep — including `/pricing` and `/blueprint`.
4. **Tokens.** No colour literal, no off-scale spacing, both palettes declared, AA on every
   stated pair. `tokens.test.ts` fails the build on each.
5. **The server is the only security boundary.** Scope acceptance, invoice state and the
   deposit gate are re-checked server-side on every request. Nothing in a bundle decides.
6. **Webhooks stay idempotent.** Claim → interpret → mark → release, unchanged.
7. **The demo never reaches Stripe.** Both session creators refuse a demo customer on line one.
   Invoices must do the same.
8. **CSP.** Any new script host needs both `vercel.json` policies updated, and
   `scripts/check-csp.ts` must still pass.

---

## 2. Batches, in dependency order

Each batch ends with `npm run verify` green.

> **Commits are blocked in this environment.** A user-locked hook refuses `git add` and
> `git commit`, so the batch boundaries below are checkpoints rather than commits — each one
> is a point where the tree is green and could be committed by hand. The tree also arrived
> carrying two earlier, finished bodies of work: the DECISION 036 dark palette, and the Phase 0
> billing fixes from the conversion audit. Both are verify-green and neither is part of a batch
> here.

### Batch A — Terms, policy and positioning `[x]` — done 2026-08-19

Content and config only. No schema, no new routes. This unblocks `/pricing`, which cannot be
written until the terms it publishes exist.

- [x] `docs/owner-decisions-required.md`: answered 001, 009, 010, 011 and 013 in place; added
      DECISION 037–042.
- [x] `config/pricing.ts`: added `salesTax`. States _that_ tax applies and never a rate — so
      `sanctionedFigures()` does not grow and the currency sweep keeps meaning what it meant.
- [x] `content/legal.ts` terms: four new sections — `tax`, `refunds`, `completion` (approval +
      the eight Launch Standard checks + 10-business-day deemed acceptance) and `delays` (30 days
      pauses the project). The `launch` section gained the revision-round definition in full and
      the "quoted before, never after" clause.
- [x] `content/site.ts`: tagline → `Websites that ask for the job.`, with DECISION 038's
      reasoning replacing the superseded rationale.
- [x] Ownership promise: the consequence added to the homepage bullet. The full named block is
      Batch B, on `/pricing`, where somebody is actually weighing the risk.
- [x] `content.test.ts`: nine new guards across two describe blocks.
- [ ] `content/legal.ts` privacy — deliberately held to Batch C, where the analytics copy
      changes with the provider. Doing it here would publish a description of a build that
      does not exist yet.

**Acceptance:** met. `verify` green; eager JS **160.0 kB gz**, down from 163.6; no figure changed.

#### What the measurement contradicted

**The terms were 0.8 kB over the payload budget, and the fix was not in the terms.**
`content/legal.ts` was re-exported from `content/index.ts`, and both legal routes were eager —
so 25 kB of privacy and terms prose sat in the chunk every page modulepreloads, read by almost
no first-time visitor. It had always been that way and nothing had ever failed, because nothing
had recently changed enough to blame.

Splitting the route recovered **4.0 kB gzipped** — ten times what the new clauses cost. Two
things are worth taking from it:

1. The barrel's own note already forbade this ("if it is a lazy route's content, import it
   directly"). The rule was written after `industries`, `teardown`, `playbook` and `audit` were
   found doing it. `legal` predated the rule and nobody went back to check.
2. The budget guard failed on the one kind of content that could not be cut. That is the guard
   working: it forced the question "what eager weight is _not_ earning its place", which is the
   question nobody asks while there is headroom.

**A second, smaller one: `site.tagline` had no consumer at all.** The header dropped it when it
would not fit (427px into 141px), and the comment above the field went on claiming it was
rendered there. So the string describing what this business _is_ had been dead for months, on a
brand whose main risk is being filed under the wrong category. It renders in the footer now.

### Batch B — `/pricing` `[x]` — done 2026-08-19

The highest-value single artifact. A live follow-up email already linked to it.

- [x] `config/routes.ts`, `content/pages.ts` (indexed, priority 0.9), `content/pricingPage.ts`
      (outside the barrel, in the sweep corpus).
- [x] `features/public/pricing/` — page, stylesheet, index, nine tests. `lazy()` on the
      concrete module.
- [x] Blocks: the shared `PricingBlock` at full depth (both prices, founding condition,
      deliverables, plan, year-one economics, coverage and market comparisons, commercial
      terms) plus the four this page adds — the **tax line** under the lede, **ownership** as a
      named block, **How paying works** (five clauses, each linking into the term), and the
      **objections**, including the one that sends some readers somewhere cheaper.
- [x] Header nav, footer nav, and the follow-up email's action.

**Acceptance:** met. Eager JS **160.6 kB gz**, CSS 19.3. `verify` green.

#### What the measurement contradicted

**The follow-up email was worse than "links to a page that doesn't exist".** Its button read
"Ask a question" and went to `/app/messages`, directly under a paragraph about the pricing page
— so it named one destination and offered another, and the destination it named did not exist.
Both halves are fixed: the button now goes where the sentence points, and asking a question is
still the first thing the email offers ("the quickest way to ask is to write back").

**`ServicesPage` was reaching into `features/public/home/components/` and passing lint.** The
restricted-import pattern needs three path segments after `features`, and
`../home/components/PricingBlock` has one too few — so the rule's letter permitted exactly what
its message forbids. `PricingBlock` is part of the home feature's public API now, which is what
the rule's message actually asks for, and the third consumer is what settled it.

**Terms anchors resolved to nothing.** `LegalPage` put every section's id on `key` and never on
the element, so `#refunds` had never worked. It only mattered once another page needed to send
somebody to one clause of a fourteen-clause page.

### Batch C — Analytics, privacy and CSP `[x]` — done 2026-08-19

- [x] `config/env.ts`: `analytics.domain` / `analytics.scriptSrc`, plus `analyticsEnabled()` —
      the one place that decides, read by three unrelated things. **Both unset means nothing
      loads at all**, the same shape as `DEMO_PASSCODE` and `UNSUBSCRIBE_SECRET`.
- [x] `lib/analytics.ts`: `loadAnalytics()` injects the script (with the provider's own queue,
      so events fired before it downloads are not lost) and `track()` gained the provider
      branch ahead of the `dataLayer` one. **No event was renamed.**
- [x] `vercel.json`: the provider host in `script-src` and `connect-src`.
- [x] `scripts/check-csp.ts`: a second pairing guard — if `VITE_ANALYTICS_SRC` is set, its
      origin must appear in both directives.
- [x] `content/legal.ts` privacy: the `tracking` section and the closing clause of `what` are
      both generated from `analyticsEnabled()`.
- [x] `.env.example`, and six tests.

**Acceptance:** met. Eager JS **160.9 kB gz** (the script is external, not bundled).

#### The judgement worth recording

**The script is injected from `main.tsx`, not written into `index.html`.** The vendor's own
instructions say to paste a tag, and there are two reasons not to. `index.html` is read by
`build-seo.ts` and `check-csp.ts` and produces fifty-one prerendered documents, so a
conditional tag would make those documents differ by configuration. And the CSP says
`script-src 'self'` plus hashes — an inline snippet would need a third hash to maintain, while
a `src` from an allowed origin loads whether the tag was parsed or created.

**The privacy page is now generated, and that is the point of the batch.** Its previous version
ended "if that ever changes this page changes with it" — a promise kept by whoever remembered,
on the page a signup form links to as the notice being agreed to. Setting one environment
variable, possibly by somebody who has never opened that file, would have made it a false
statement of fact with nothing in any build noticing. Two paragraphs, one condition, and the
tests assert the property in **both** directions so they still mean something on the day the
provider is switched on.

### Batch D — Scope acceptance `[x]` — done 2026-08-19

Closes the gap between business rule #35 and self-serve checkout. Landed as described: a
`ProjectScope` value on the project (absent or whole, never half), `sendScope` / `acceptScope`
on `ProjectService`, one admin route and one customer route, `available.deposit` gated on
`scopeAllowsSelfServeDeposit`, a panel in each application, and a new `scope.ready` notification.
Sixteen new tests; `verify` green.

#### What the measurement contradicted

**Three things the plan did not anticipate, and the first two were latent defects.**

1. **A payment against an owner-created project never marked the deposit paid.**
   `activateForCustomer`'s existing-project branch only re-seeded tasks. That was correct for as
   long as the only way to reach it was a _redelivery_ of the payment that had created the
   project — where the deposit was paid by definition. DECISION 040 makes it the ordinary path,
   and without a fix the deposit would clear at Stripe while the project sat at `pending`
   forever: the portal would keep offering the button and the only record of the money would be
   Stripe's dashboard.

2. **The dashboard would have pointed at a button that is no longer there.** With no project,
   `currentAction` returned `pay-deposit` and sent people to `/app/billing`. Two new kinds —
   `request-scope` and `accept-scope` — replace it, and the second is the first customer-visible
   state a project has ever had, because until now a project could not exist before a payment.

3. **The lifecycle test walked straight from an assessment to a $2,450 payment**, which is what
   made the gap easy to miss for as long as it existed. It now walks the real path, and asserts
   the refusal in the middle.

**One judgement worth recording: the accepted price must equal the price Stripe will charge.**
Not just "a scope was accepted" — `scopeAllowsSelfServeDeposit` compares the figures. A bespoke
quote is a normal thing to send and is settled by an invoice; a customer accepting one number
and being charged another is the worst failure available here, and the check is three lines.

### Batch D — original checklist

- [ ] `apps/server/src/features/projects/scope.types.ts` — `ProjectScope`: `version`, `lines`,
      `priceCents`, `sentAt`, `acceptedAt`, `acceptedByUserId`. **Acceptance is the presence of
      a date**, matching `report.deliveredAt` and `publishedAt`.
- [ ] Repository + service. Sending a new version after acceptance **clears** acceptance.
- [ ] Admin route: send/replace a scope. Customer route: accept. Both re-checked server-side.
- [ ] `billing.summary.ts`: `available.deposit` gains `&& scopeAccepted`.
- [ ] Portal panel: read the scope, accept it, show what was accepted and when.
- [ ] Console panel: compose and send; show acceptance state.
- [ ] Tests: cannot pay without acceptance · acceptance is idempotent · a new version withdraws
      it · a customer cannot accept another customer's scope.

**Acceptance:** an unaccepted scope makes the deposit button absent from the payload, not
hidden by the client.

### Batch F — The Website Blueprint `[x]` — done 2026-08-19

`/blueprint`, lazy, indexed, linked from the footer. Twelve business questions in
`content/blueprint.ts` (outside the barrel, in the sweep corpus), a rules layer in
`features/public/blueprint/rules/`, one question per screen, and a result in two structurally
separate halves. Twelve tests.

#### What the measurement contradicted

**The §32 guard caught two real ones, and neither was the kind it was written for.** Both rules
it flagged presumed the reader _has_ a website — "somebody who has landed on your site", "your
site is rarely how somebody finds you". Neither is a fabricated finding, which is what the
guard was aimed at. Both are worse in a different way: this tool is built to work for somebody
with **no website at all**, which is the population `/audit` cannot serve and a large share of
this market, and a rule that quietly assumes a site reads as nonsense to them.

**`UNKNOWABLE` takes no arguments, and a test asserts the signature.** That is what makes the
two halves impossible to mix rather than merely careful — an answer-derived string has no path
to the "what we would need to look at your site to say" heading, and the edit that would create
one cannot be made silently.

**The currency sweep caught the job-value bands**, correctly. They are sanctioned explicitly
alongside the existing exception for the customer-revenue guideline, and **derived from the
question** rather than typed — so adding a band cannot leave the guard behind. Exempting the
module by name was refused: it is a surface that talks about money, so it is the last place
that should be outside the sweep.

### Batch E — Stripe Invoices `[x]` — done 2026-08-20

`createAndSendInvoice` and `ensureCustomer` on the Stripe seam, `createInvoice` on the billing
service, an admin route, an invoice button beside the checkout one, and `invoice.paid` handling
for one-off invoices. Nine tests, including the demo refusal.

#### What the measurement contradicted

**`applyInvoicePaid` returned early without a subscription id.** A subscription invoice carries
one and an owner-raised build invoice does not — so a paid build invoice would have settled
_nothing_: money cleared at Stripe, the project stayed `pending`, the portal went on offering
the button, and the only record of the payment would have been Stripe's dashboard. The
one-off branch writes the same fields `applyCheckoutSession` does, deliberately identical,
because the two are two ways of asking for the same money.

**An invoice cannot bill a bare email.** That turned out to be an improvement rather than a
constraint: the path has to resolve a Stripe customer first, which makes the duplicate-customer
problem _impossible_ here rather than merely handled — the thing `customerId` was added to the
Checkout request to patch.

**Growth Partner cannot be invoiced at all.** `createCheckoutSession` refuses to _email_ a
subscription link; this refuses to create the document, because an invoice with a due date is a
considerably stronger ask than a URL somebody can ignore, and the terms say the plan starts only
if the client chooses it.

### Batch H — Trust, proof and the founding mechanism `[x]` — done 2026-08-20

- [x] **Revision-round counter.** `revisionRounds` on the project, incremented by
      `requestChanges` — which is exactly what the terms define a round as. The portal shows
      which round they are on, against an allowance the _server_ sends, and
      `pricing.sync.test.ts` now guards that number the way it guards the prices.
- [x] **Case-study permission as a record.** It rides on the scope, because the permission
      **is the condition of the price** — so it belongs on the document that states the price.
      A console switch turns it on; the customer's acceptance becomes the permission record,
      dated, named and versioned.
- [x] **Response-guarantee remedy** (DECISION 009) as a console action. Credit only.
- [x] **Google Business Profile prompt** as a post-launch task, seeded when a project reaches
      `live` — the one task that arrives after a launch rather than before it.
- [x] **ACH**, on the one-off payments and on invoices. Subscriptions stay card-only.
- [x] **About rewrite.** Two changes and a new section — see below.
- [ ] **Portal proof on the marketing site — not done, and it needs you.**
- [ ] **Founding counter as a console setting — not done, and it cannot be.** Both explained
      in §4 below.

#### What the measurement contradicted

**The About page called this business "a software and digital growth company".** That was the
single most damaging sentence left on the site after DECISION 038 — `getjobforge.com` sells
field-service-management _software_ to these exact trades, and this was the page whose entire
job is being believed telling a reader they had found a software company. Both it and the
opening "digital growth systems" are gone.

**A section was added that says when not to buy.** The research ranks a demonstrated
willingness to lose the sale as the strongest trust asset available to a business with no case
studies, and this page had every other founder-led signal without it. Every claim in it is
checkable against something else on the site — the audit's third branch really does recommend
leaving a working site alone, and `localSearch.caveat` really does say a Google listing matters
more than the website.

**A flaky test turned out to be a test defect worth fixing rather than re-rolling.**
`DashboardPage.test.tsx` asserted an effect's side-effect synchronously after a DOM query.
`findByText` resolves when the text lands; React flushes the effect after that commit. On an
idle machine the two share a tick and the assertion is accidentally right; under the full
suite's load they do not. It is a `waitFor` now, and the `toHaveBeenCalledTimes(1)` — the part
that actually matters — still fails immediately on a second call.

- [ ] `stripe.client.ts`: invoice create/finalise/send. Still the only file that knows the SDK.
- [ ] `billing.service.ts`: `createInvoice`, refusing a demo customer on the first line.
- [ ] `billing.webhooks.ts`: `invoice.paid`, `invoice.payment_failed`, `invoice.finalized`.
      Routed through the same claim/mark/release idempotency.
- [ ] Console: "Send an invoice" replaces "Mint a checkout link"; the old path stays for now
      and is marked deprecated in a comment.
- [ ] Tests: invoice ids stored · redelivery is a no-op · a demo customer is refused.

### Batch F — The Website Blueprint `[ ]`

- [ ] `config/routes.ts`: `blueprint: '/blueprint'`; `content/pages.ts` entry, indexed.
- [ ] `content/blueprint.ts` — twelve **business** questions, no technical ones. Absent from
      the barrel.
- [ ] `features/public/blueprint/rules/` — the extensible rules layer. **No hardcoded
      "Seattle HVAC = X" in a component** (§50). Rules are data; the engine is small and pure.
- [ ] Optional banded job-value question. Never presented as a revenue promise.
- [ ] Result page: **two labelled sections** — "Based on what you told us" and "What we would
      need to look at your site to say". Different styling. §32 is enforced by a test asserting
      no business-answer-derived string appears in the second section.
- [ ] Handoff to the human assessment at `/app/assessment/request`.
- [ ] Draft to `sessionStorage`, submitted once a session exists — the pattern
      `AuditKeepResults` already uses. Nothing anonymous reaches the database.
- [ ] Events: reuse the taxonomy's shape; new names added, none renamed.
- [ ] `lazy()`, concrete module.

### Batch G — The ten defects `[x]` — done 2026-08-20

All ten closed, with eleven new tests. `verify` green.

#### Two of them were not what the report said they were

**The audit CTA was not re-routed, and the reasoning matters more than the fix.** The report
called "Keep these results" landing on `/signup` rather than `/get-my-assessment` a defect,
because the funnel events fire only on the offer page. The measurement half is real and is
fixed — `audit-signup` is now its own `cta_clicked` location. The routing half is not: that
button says "Create my account and keep these", offering an account to hold results the reader
has _already been given_. Landing it on a page headed about a free assessment changes the
subject, which is exactly the bait-and-switch DECISION 031 refused when it declined to point
the header's "Create an account" at the offer either. The separate location is also a better
number than the one asked for — it distinguishes the most qualified account this site produces
from a cold arrival on the offer page.

**Fixing the manual launch path exposed a second defect in the same method.** `setUrls`
announced a launch on _any_ production-URL change, so correcting a typo in a domain emailed a
client "your website is live" a month after it was. Nothing in the method knew the difference
between launching and editing until the milestone move gave it a name. A URL change on a live
site is now recorded as `internal` — the audit trail keeps it, the customer is not told their
website went live twice.

**And one that only became reachable because of Batch D**, recorded there: a payment against an
owner-created project never marked the deposit paid.

### Batch G — original checklist

- [ ] Milestone transition-legality graph in `ProjectService` (the doc comment already claims it).
- [ ] `approvedDeploymentId` actually written on approval.
- [ ] Duplicate-payment race: re-check availability at fulfilment, not only at session creation.
- [ ] Build-payment failure reaches a customer surface (subscription failures already do).
- [ ] Manual launch path (`PATCH /urls`) moves the milestone.
- [ ] Assessment queue pagination — `ShowMore` already exists and is used by four other pages.
- [ ] Audit "Keep these results" routes to `/get-my-assessment`, not `/signup`.
- [ ] Lead status `'closed'` becomes settable from the console.
- [ ] `docs/business-offer.md`: Conversion Fix references removed (withdrawn by DECISION 014).
- [ ] Console layout comment claiming there are no Stripe controls; worklist link to an
      assessment route the console router does not define.

### Batch H — Trust, proof and the founding mechanism `[ ]`

- [ ] Revision-round counter in the portal, reading the same definition the terms publish.
- [ ] Founding-client counter as a console setting, not a source constant.
- [ ] Case-study permission: a stored, timestamped record against the project.
- [ ] Response-guarantee remedy wired as a console action (DECISION 009).
- [ ] Google Business Profile prompt as a post-launch task.
- [ ] About-page rewrite: founder-led, which the research ranks top-three for a business with
      no case studies yet.
- [ ] Portal proof on the marketing site — screenshots of a real portal surface.
- [ ] ACH as a payment method (T+4 latency accepted; ~$133/project saved).

---

## 3. New decisions this plan creates

| #   | Decision                                                                                                                                                       |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 037 | Washington sales tax is presented exclusive of price, calculated at checkout                                                                                   |
| 038 | The tagline leads with the category noun. **Modifies** the reasoning in `site.ts` that put the outcome first — the name collision changed which risk is larger |
| 039 | Analytics is cookieless, build-time gated, and no consent banner is shown                                                                                      |
| 040 | Scope acceptance is a product record, and it gates the deposit                                                                                                 |
| 041 | Owner-sent payments are Stripe Invoices; Checkout stays for self-serve                                                                                         |
| 042 | The Website Blueprint is a separate tool at `/blueprint`, not a change to `/audit`                                                                             |

## 3a. The two things that were asked for and not built

Both were selected, both are reasonable asks, and each is recorded here rather than quietly
dropped.

### Portal proof on the marketing site — blocked on an asset only you can make

The research is right that this is a real gap: the customer portal is a genuinely unusual thing
for a business this size to have, and no prospect can currently see it before buying. The build
is small — a section on `/pricing` or `/services` with two or three captures.

**What is missing is the captures.** They have to be of a real portal with real content, and
inventing a screenshot of a fabricated project would be exactly the kind of manufactured proof
`content/testimonials.ts` refuses to carry. `npm run capture` already exists for the Open Graph
image and is the obvious place to add it.

The cheapest honest version: enter Demo Mode at `/promo`, capture the dashboard, the project
page and the new scope panel, and they are real screens of a real system with a business that is
labelled a demonstration on every one of them.

### The founding counter as a console setting — architecturally not possible as asked

`foundingOffer.taken` gates whether the founding price appears **on the marketing site**, and
the marketing site is prerendered: `build-seo.ts` writes fifty-one HTML files and the price is
compiled into the bundle. A console control could change a database row and no visitor would
see a different number until the next deploy — which is a control that appears to work and does
not.

Making it live would mean the marketing pages fetching their price from the API, which trades a
prerendered page for a network round trip on the most important number on the site, and puts
the published price behind an availability question. That is a much larger decision than a
counter.

**What was built instead is better than the thing asked for**, and this is the divergence worth
arguing with: the count is now **derivable rather than remembered**. Every founding-client scope
carries `caseStudy`, and an accepted one is a dated, named, versioned permission record. The
number of founding projects signed is a query over accepted scopes rather than a figure somebody
has to keep in their head — which was the actual problem. Editing `taken` remains a deliberate,
one-line, redeploy-level act, which is the correct weight for a change to a published price.

## 4. Flagged, not blocking

- **Trademark.** `getjobforge.com` plus three other JobForge products. A USPTO and Washington
  state search should happen before further brand spend. Copy defends the name; it cannot
  remove the collision.
- **DOR registration.** The tax line is copy. Registering, collecting and remitting is not.
- **The founding offer is 0 of 10** and the discount is only truthful while the condition is
  really asked for. Batch H builds the mechanism; running it is the owner's.

## 5. Where measurement contradicted the plan

_Appended as it happens. Nothing yet._
