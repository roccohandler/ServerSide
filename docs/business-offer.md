# The commercial model

**This file is authoritative.** It records what the business sells, for how much, and on
what terms. Every price, term and promise rendered by the site derives from
`apps/client/src/config/pricing.ts` and `apps/client/src/content/offer.ts`, and those files must
agree with this one and with the written client agreement.

If you are an agent working in this repository: **do not change any decision below on your
own initiative.** They are commercial commitments, not implementation details. Changing a
price, a minimum term, a guarantee or a scope quantity is a business decision that only
the owner can make. If a task seems to require it, say so and stop.

Last reviewed: 2026-08-13.

---

## 1. Target market

Local service businesses that get hired in their own area, primarily in Greater Seattle:
HVAC, plumbing, electrical, roofing, landscaping, painting, cleaning, pest control,
remodelling, general contracting.

The pattern that matters is not the trade. It is a business where a customer searches
locally, forms an impression from a website, and then calls — and where one additional
customer is worth considerably more than the monthly fee. That last condition is what
makes ongoing optimisation worth paying for rather than a nice idea.

Work outside Greater Seattle is accepted where it can be handled remotely, which is all of
it. No on-site services are claimed.

---

## 2. Positioning

> **Customer Conversion Build** — a one-time project that turns more of the people who
> already find a local service business into calls and quote requests, **measured from launch
> day** — plus **Growth Partner**, the optional monthly service that measures what the site
> produces, explains it, and does the work that comes out of it.

**Outcome first, mechanism second, everywhere.** The 2026-08-13 offer redesign changed what
leads every identity surface, because the first words a reader meets decide which shelf they
file the business on:

| Surface            | Now leads with                                                  |
| ------------------ | --------------------------------------------------------------- |
| `site.tagline`     | "More calls and quote requests — from a better website"         |
| `seo.defaultTitle` | "Turn website visitors into calls — Seattle service businesses" |
| `hero.heading`     | "More of the people already finding you should be calling you." |
| Five industry H1s  | the trade's decision moment, not "Websites for X"               |

The word _website_ was **not** removed — it is the mechanism, a reader needs it to know what
they are buying, and the five industry `metaTitle`s deliberately keep "Websites for HVAC
companies" because that is the search term. What changed is that it no longer _defines_ the
business anywhere.

**Three products, not two.** `recommendedAction()` has always had three branches and only two
of them had something to buy. See §3.

**The recurring service leads with measurement.** Growth Partner's scope is an ordered array
(`carePricing.plan.groups`) and the order is a commercial commitment a test enforces:
measure → improve → keep current → keep running → on request. Upkeep is published as the
floor, in those words. The previous order opened on hosting and closed on "measurement, and
what it means in plain English", which is a care plan being sold by a site that elsewhere
argued it was not one.

**Two purchases, two jobs, never blurred.** The 2026-08-13 offer simplification resolved
the previous model's central ambiguity — a plan described as optional in one place and as
step five of the process in another — in the optional direction, everywhere:

- The build stands on its own. The client owns the domain, hosting and content from day
  one, and can run the site themselves after launch.
- Growth Partner starts on launch day **only if the client chooses it**. It is never a
  condition of the build, and the site says so on the first screen, in the pricing block,
  in the process, in the terms and in the FAQ.

The rationale is the business's own stated principle: _a project that only makes sense
with a subscription attached is a project priced dishonestly._ The ten-part system framing
survives, relabelled: four parts are the build ("Build once"), six are Growth Partner
("Keep it working — optional").

Not "I build websites". The promise is responsibility and continuity — with the honest
caveat that the continuity is a purchase the client makes, not an assumption the invoice
makes for them.

---

## 3. Pricing

**Changed 2026-08-13 at the owner's direction** (offer simplification), from three project
tiers and two care plans to **one flagship build and one care plan**:

- **Foundation ($2,500)** was removed: its own description was a fix of an existing site,
  which the "quoted per site" rescue path already covers honestly.
- **Dominate ($8,500)** was removed: it promised _ongoing_ work (conversion testing,
  analytics reviews, priority response) inside a one-time fee with no time bound — the
  recurring service sold twice, once of them unsustainably. Multi-area and integration
  work is now custom scope, quoted in writing before anything starts.
- **Growth Partner Plus ($499/mo)** was removed: the $299 scope already included campaign
  landing pages, copy alignments and testing-where-traffic-supports-it in three other
  places, and what remained was an undefined "priority response".

All figures live in **`apps/client/src/config/pricing.ts`** as numbers, formatted on the way
out. `content/offer.ts` derives `prices` from it and remains the only file in the content
layer that names a figure. A test sweeps every string in the content layer and fails the
build on any figure the config did not produce.

### The build

| Item                          | Value      |
| ----------------------------- | ---------- |
| Standard project price        | **$7,500** |
| Founding-client price         | **$4,900** |
| Saving (derived, never typed) | **$2,600** |
| Deposit (half, derived)       | **$2,450** |
| Launch payment (other half)   | **$2,450** |

### Conversion Fix — WITHDRAWN (DECISION 014)

Added 2026-08-13 by the offer redesign, and withdrawn on 2026-08-16. It existed for the middle
branch of `recommendedAction()` — a site scoring roughly 65–85%, whose bones are fine — and it
was a good answer to a real problem: that branch used to end at the words "quoted per site",
handing the best-qualified visitor on the site a diagnosis and a full stop.

**What it never got was a price.** `pricePublished` shipped `false` and stayed false, so the
site published a product it could not quote, in a bounded scope written against a figure
nobody had agreed. DECISION 014 asked for the figure; the answer was to withdraw the product.

**The dead end did not come back**, which is the part that mattered. The `fix` branch still
recommends targeted work rather than a rebuild — it points at the free assessment now, framed
for somebody whose site is basically sound, and the scope and the figure come out of that.
Which is what would have happened anyway: no fix was ever going to be quoted without looking
at the real site.

Nothing named `conversionFix` remains in `config/pricing.ts`, and the currency sweep in
`content.test.ts` now fails the build on any copy still quoting a fix price — the guard doing
its job on the way out rather than the way in.

This section is kept rather than deleted because "why is there no second product for the
middle band?" is a question somebody will ask of this document, and the answer is a decision
rather than an omission.

**`/what-your-website-can-do`** asks for nothing and offers nothing. It is reference material —
see §18.

The audit's recommendation has three honest branches (`recommendedAction`): below ~65% → the
build; 65–85% → a **free review of the real site**, then targeted work quoted in writing;
above ~85% → "you probably do not need a rebuild", with a second-opinion CTA.

---

## 15. Decision register

Authoritative. Treat as the current business model unless the owner explicitly says
otherwise. Rewritten 2026-08-13 — the previous register described the pre-simplification
model and had drifted from the live site.

| #   | Decision                           | Value                                                                                                                                                                            |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Build price (standard)             | $7,500 one-time (product: **Customer Conversion Build**)                                                                                                                         |
| 2   | Build price (founding client)      | $4,900 one-time, condition: case-study permission                                                                                                                                |
| 3   | Founding cap                       | 10 projects; `taken` edited by hand; no live counter                                                                                                                             |
| 4   | Launch payment                     | $2,450 deposit, $2,450 at launch (derived halves)                                                                                                                                |
| 5   | Growth Partner                     | $299/month — **optional, always**                                                                                                                                                |
| 6   | Annual prepay                      | $2,990/year, secondary to monthly                                                                                                                                                |
| 7   | Growth Partner Plus                | **Removed** 2026-08-13                                                                                                                                                           |
| 8   | Foundation / Dominate tiers        | **Removed** 2026-08-13                                                                                                                                                           |
| 9   | Minimum term (plan only)           | 3 months, from launch day                                                                                                                                                        |
| 10  | After the minimum                  | Month-to-month                                                                                                                                                                   |
| 11  | Cancellation notice                | 30 days                                                                                                                                                                          |
| 12  | Annual contract                    | None                                                                                                                                                                             |
| 13  | Annual refund on cancellation      | Pro-rata at $299/month                                                                                                                                                           |
| 14  | Plan billing starts                | Launch day, only if chosen                                                                                                                                                       |
| 15  | Launch revisions                   | 2 rounds (`buildScope.revisionRounds`)                                                                                                                                           |
| 16  | Service pages included             | Up to 6, plus home/about/contact (`buildScope`)                                                                                                                                  |
| 17  | Launch timeline                    | 2–4 weeks after materials received                                                                                                                                               |
| 18  | Seasonal refreshes                 | 4 per year                                                                                                                                                                       |
| 19  | Campaign landing pages             | Up to 1 per month                                                                                                                                                                |
| 20  | Campaign copy alignments           | Up to 2 per month                                                                                                                                                                |
| 21  | A/B testing                        | Where traffic supports it; 1 at a time; no published floor                                                                                                                       |
| 22  | Response guarantee                 | 24 business hours; month's fee waived; automatic                                                                                                                                 |
| 23  | Business hours                     | Mon–Fri, 8am–6pm Pacific                                                                                                                                                         |
| 24  | Hosting and domain costs           | Inside the $299 while the plan runs; client pays directly otherwise                                                                                                              |
| 25  | Ownership                          | Client retains website and domain throughout                                                                                                                                     |
| 26  | Ad management                      | Excluded                                                                                                                                                                         |
| 27  | Ranking / lead / revenue guarantee | None, ever                                                                                                                                                                       |
| 28  | Scarcity                           | One build at a time; no counters, no timers                                                                                                                                      |
| 29  | Primary market                     | Greater Seattle; remote work accepted anywhere                                                                                                                                   |
| 30  | Managing a site built elsewhere    | Yes, after a paid onboarding                                                                                                                                                     |
| 31  | Rescuing an existing site          | Quoted per site                                                                                                                                                                  |
| 32  | Larger build scope                 | Quoted in writing before anything starts                                                                                                                                         |
| 33  | Payments                           | Stripe: deposit link → launch link → optional subscription                                                                                                                       |
| 34  | Payment state                      | Advanced only by verified Stripe webhooks                                                                                                                                        |
| 35  | Public checkout                    | None — scope is agreed in writing before any payment                                                                                                                             |
| 36  | Year-one cost                      | Published: $4,900 alone, $8,488 with the plan                                                                                                                                    |
| 37  | Enquiry retention                  | 24 months after last meaningful contact                                                                                                                                          |
| 38  | Onboarding data                    | Collected on /welcome after deposit; stored + emailed                                                                                                                            |
| 39  | Analytics provider                 | None configured; event seam only                                                                                                                                                 |
| 40  | Testimonials                       | None, because there are no clients yet                                                                                                                                           |
| 41  | Voice                              | First person plural — JobForge speaks as the company (2026-08-13; was first person singular). Founder-run reality stated plainly on /about                                       |
| 42  | Audit nav label                    | "Score your site"; the tool is named **Website Score** (DECISION 016)                                                                                                            |
| 43  | Conversion Fix                     | **WITHDRAWN 2026-08-16.** It never got a price, so the site was publishing a product it could not quote. The audit’s middle branch offers the free review instead — DECISION 014 |
| 44  | Website Performance Report         | Monthly, for every Growth Partner client. Measurement + explanation + improvement work; **never a promise the number rises** — DECISION 015                                      |
| 45  | Enquiry baseline                   | Recorded in writing on launch day, as a build deliverable                                                                                                                        |
| 46  | Day-30 report                      | Written, to every build client, whether or not they take Growth Partner                                                                                                          |
| 47  | Recurring scope order              | measure → improve → current → floor → on request. Test-enforced; the order is the claim                                                                                          |
| 48  | Guarantees                         | Four: built-to-agreement, the Launch Standard, **measurement and reporting**, if-we-break-it-we-fix-it                                                                           |
| 49  | Market comparison                  | Published, generic. **No provider or platform may be named in it** — test-enforced                                                                                               |     |
| 50  | The capability library             | Published at `/what-your-website-can-do`. Every entry labelled `included-build`, `included-partner`, `additional-scope`, `roadmap` or `not-offered` — DECISION 017               |
| 51  | Eleven quotable extras             | Real, deliverable, **in neither price**, quoted before work starts. None has been built for a client yet, and `maturity` says which are specified-only                           |
| 52  | Four stated directions             | SMS alerts, automated review requests, job-software handoff, invoice links. **Not sellable.** The page says nobody will suggest otherwise on a call                              |
| 53  | Two public refusals                | Accounting connection and an assistant chat window. Listed **with the reasoning**, because the reasoning is more useful than the omission                                        |
| 54  | Trades taxonomy                    | Twelve, one list, `config/trades.ts`. Six have no page and are audit options only — DECISION 018                                                                                 |

---

## 16. Where each decision lives in the code

| Decision                              | File                                                                                                                         |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **All prices, as numbers**            | **`apps/client/src/config/pricing.ts`**                                                                                      |
| The build outcome groups              | `config/pricing.ts` → `buildOutcomes` (derives `flagship.includes`)                                                          |
| The audit's three branches            | `config/pricing.ts` → `recommendedAction()` — the middle one offers the free review                                          |
| The monthly report                    | `content/offer.ts` → `websiteReport`; UI `components/marketing/ReportExample`                                                |
| Launch → baseline → 30 days → monthly | `content/offer.ts` → `afterLaunch`; UI `AfterLaunchSection`                                                                  |
| How the two purchases relate          | `content/offer.ts` → `relationship`                                                                                          |
| Market comparison (nobody named)      | `content/offer.ts` → `marketComparison`                                                                                      |
| The recurring scope, in order         | `content/offer.ts` → `carePricing.plan.groups`                                                                               |
| The flagship build and its scope      | `config/pricing.ts` → `flagship`, `buildScope`                                                                               |
| **Founding-client offer and cap**     | **`config/pricing.ts` → `foundingOffer`**                                                                                    |
| Growth Partner plan                   | `config/pricing.ts` → `growthPartner`                                                                                        |
| Capacity constraint                   | `config/pricing.ts` → `capacity`                                                                                             |
| Year-one arithmetic                   | `config/pricing.ts` → `yearOneTotal()`                                                                                       |
| Price strings the copy interpolates   | `content/offer.ts` → `prices` (derived)                                                                                      |
| The pricing block, on both pages      | `features/home/sections/PricingBlock.tsx`                                                                                    |
| The build card / plan / comparison    | `content/offer.ts` → `pricing`, `carePricing`, `comparison`                                                                  |
| Which action the assessment suggests  | `config/pricing.ts` → `recommendedAction`                                                                                    |
| The launch standard                   | `content/offer.ts` → `launchStandard`                                                                                        |
| Published terms (grouped)             | `content/offer.ts` → `commercialTerms.groups`                                                                                |
| Cancellation                          | `content/offer.ts` → `cancellation`                                                                                          |
| Launch process (weeks + choice)       | `content/offer.ts` → `launch`                                                                                                |
| Who does what                         | `content/offer.ts` → `responsibilities`                                                                                      |
| Launch guarantees                     | `content/offer.ts` → `guarantee`                                                                                             |
| Response guarantee                    | `content/growth.ts` → `responseGuarantee`                                                                                    |
| A/B testing policy                    | `content/growth.ts` → `abTesting`                                                                                            |
| Business hours                        | `content/site.ts` → `contact.hours`                                                                                          |
| The three ways in                     | `content/entry.ts`                                                                                                           |
| Retention and terms in public words   | `content/legal.ts`                                                                                                           |
| Stripe products / webhooks            | `apps/server/src/features/billing/` + env (see `.env.example`)                                                               |
| Post-deposit onboarding               | `apps/client/src/features/welcome/` + `apps/server/src/features/onboarding/`                                                 |
| **The capability library**            | **`apps/client/src/features/public/capabilities/content/capabilities.ts`**                                                   |
| Capability shapes + honesty fields    | `apps/client/src/types/content.ts` → `Capability`, `CapabilityAvailability`                                                  |
| Which capabilities suit which trade   | `apps/client/src/features/public/capabilities/utils/capabilityMatch.ts` (pure; takes the library as an argument)             |
| Trades + how each trade's work is     |
| bought                                | `apps/client/src/config/trades.ts` → `trades`, `Trade.serviceModels`                                                         |
| The explorer, lifecycle, integrations | `apps/client/src/features/public/capabilities/`                                                                              |
| The guards on all of it               | `apps/client/src/content/content.test.ts`                                                                                    |
| Guards on the capability library      | `apps/client/src/features/public/capabilities/content/capabilities.test.ts` (+ `capabilities/utils/capabilityMatch.test.ts`) |

---

## 18. The capability layer

Added after the offer rebuild, and deliberately outside it.

**What it is.** `/what-your-website-can-do` publishes every capability a local service website
can have — forty of them across ten areas of the business, twelve third-party systems, and an
eight-stage customer lifecycle. Thirteen are in the build, nine in Growth Partner, eleven are
quotable extra scope, five are stated directions and two are refusals. Each capability carries
two independent honesty fields:
`availability` (how you would actually get it) and `maturity` (how settled the implementation
is). They are separate axes on purpose — something can be quotable extra scope whose pattern is
settled, or quotable extra scope that has been specified and never built, and a buyer deserves
to know which.

**Why it is not part of the offer.** The offer sells three products to somebody deciding. This
answers a later question — _what is possible, and which of it applies to me_ — and the honest
answer to that includes four things this business will not sell and two it has decided against.
A section of `/services` could not carry that without arguing against the page it sat on.

**The rule that keeps it truthful.** Anything claiming to be `included-build` or
`included-partner` carries an `offerAnchor` naming the `systemComponents`, `flagship.outcomes`
or `carePricing.plan.groups` entry that already says so, and a test resolves every pointer. The
library is therefore incapable of becoming a second description of the offer: if the offer
changes, the pointer breaks and the build fails.

**What it must never do**, all test-enforced: print a figure of any kind (no percentage, no
multiple, no currency — there is no client data behind one); mark something `standard` maturity
that nobody is paying for; let a purchasable capability depend on an unavailable one; put a
capability in the foundation group that is not in a price; or describe an integration by its
mechanism rather than its consequence.

**The one deliberately empty thing.** No capability touches the `serve` lifecycle stage,
because nothing on a website makes the work good. A test names that stage as the only permitted
gap, so a _second_ empty stage — a real regression — fails the build.

---

## 19. Owner confirmation required

Three facts remain claims made to the public that only the owner can confirm. **Getting
any of them wrong turns a truthful discount into a deceptive one.**

| #   | The claim                                                                                                  | Why it needs confirming                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The standard price is a real price** — $7,500 is what the work is offered at once founding pricing ends. | If there is no intention to ever charge it, it is not a standard price and the whole comparison has to go. This is the load-bearing one.                          |
| 2   | **The cap of ten is real.** `foundingOffer.total = 10`, `taken` edited by hand.                            | Signing an eleventh founding project while the site claims a cap of ten is the same defect as a countdown timer that resets.                                      |
| 3   | **Case-study permission is genuinely required** to get founding pricing.                                   | It is the condition that makes the lower price a qualified discount rather than simply the price. If it is not actually asked for, the standard price is fiction. |

Also requiring the owner's action before the payment flow is live: the Stripe setup in
`.env.example` (products, prices, webhook endpoint, admin token). Until then the site
runs exactly as before and the billing endpoints answer 503.

Set `foundingOffer.enabled = false` — or let `taken` reach `total` — and every trace of
the discount disappears from the site.
