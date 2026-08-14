# The commercial model

**This file is authoritative.** It records what the business sells, for how much, and on
what terms. Every price, term and promise rendered by the site derives from
`client/src/config/pricing.ts` and `client/src/content/offer.ts`, and those files must
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

All figures live in **`client/src/config/pricing.ts`** as numbers, formatted on the way
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

### Conversion Fix — scope published, price awaiting the owner

Added 2026-08-13 by the offer redesign, because `recommendedAction()` sends a site scoring
roughly 65–85% to targeted work and the site's answer to that reader was the phrase "quoted
per site" — a dead end in front of the best-qualified visitor it gets.

| Item            | Value                                                             |
| --------------- | ----------------------------------------------------------------- |
| Scope           | **Published** — `conversionFix.includes` (9 items)                |
| Boundary        | **Published** — `conversionFix.excludes` (4 items)                |
| Timeline        | Typically 1–2 weeks from access and approvals                     |
| Revision policy | Two rounds — deliberately the same phrase and number as the build |
| Price           | **NOT PUBLISHED.** `pricePublished: false`, recommended `$1,900`  |

While `pricePublished` is false: no figure renders anywhere, `sanctionedFigures()` does not
sanction one, and the copy says the figure is scoped from the free website assessment. **See
DECISION 014** — the flag is the owner's, not an implementation detail.

### Growth Partner, after launch — optional

| Item             | Value                                                      |
| ---------------- | ---------------------------------------------------------- |
| Monthly          | **$299/month**                                             |
| Annual prepay    | **$2,990/year**                                            |
| Lead deliverable | **Website Performance Report**, monthly — see DECISION 015 |

### Year-one economics, published on the site

| Path                     | First-year total                       |
| ------------------------ | -------------------------------------- |
| Website only             | **$4,900** one-time                    |
| Website + Growth Partner | **$8,488** ($4,900 + $299 × 12 months) |

- **Growth Partner is a separate purchase, made after the project and never a condition
  of it.** The site says so out loud (`carePricing.optOut`, `carePricing.choice`, the
  hero's own price block).
- Tax is not mentioned on the site. The written agreement governs.
- Rescue work on an existing site, and onboarding a site built by somebody else, are
  **quoted per site**. Larger build scope (several service areas, integrations, bespoke
  functionality) is **quoted in writing before anything starts**. No figure is published
  for any of these.

---

## 3a. Founding-client pricing — the conditions that make it truthful

The FTC's Guides Against Deceptive Pricing (**16 CFR 233.1**) permit a former-price
comparison only where the former price was an actual, bona fide price, offered publicly on
a regular basis, for a reasonably substantial period. **This business has never charged the
standard price.** It is a rate card being established now.

So the site does the following, and must keep doing it:

- The higher figure is labelled **"Standard project price"**. Never "was", "normally",
  "regularly", "reduced from" or "used to be" — a test in `content.test.ts` fails the build
  on all of them.
- It is **never rendered with a strike-through** — tests fail the build on `<s>`, `<del>`,
  `<strike>` on both pricing surfaces.
- **Every surface that publishes the founding price publishes the condition with it.**
  Both pricing surfaces render from one shared component (`PricingBlock`), so they cannot
  disagree; the hero and the entry paths carry the qualification in their own copy.
- The saving is **derived** as standard − founding, never typed.
- The discount has a **real condition**: permission to document the work as a case study,
  stated beside the price and repeated on the terms page.
- **There is no deadline, no countdown, no timer — and no live counter.** The previous
  "10 of 10 still open" string was removed: a hand-maintained availability claim is one
  missed edit from a false statement. The cap of ten is stated in the condition copy;
  `foundingOffer.taken` is edited by hand as agreements are signed, and at ten the
  founding price disappears from the site automatically.

**Three things still require the owner's confirmation** — see §17.

---

## 3b. What is NOT claimed

No per-component dollar "values" are published — no "Conversion Strategy: $1,500 value"
stack. There is no defensible basis for those numbers. The four "included, not sold
separately" items (Website Conversion Blueprint, Local Presence Check, Conversion Tracking
Setup, Service Page Framework) are framed by the obstacle each removes, not by an invented
price.

---

## 3c. Scarcity

The only limitation the site publishes is the real one: **one website build at a time**
(`capacity.concurrentBuilds = 1`), stated as the reason the 2–4 week timeline is keepable.
A test fails the build on any counter-style scarcity claim ("N of M still open", "only N
spots").

---

## 4. Recurring terms (Growth Partner)

| Term                 | Value                                        |
| -------------------- | -------------------------------------------- |
| Optional             | **Always.** Never a condition of the build.  |
| Minimum commitment   | 3 months from launch                         |
| After the minimum    | Month-to-month                               |
| Cancellation notice  | 30 days                                      |
| Annual contract      | **None.** Never introduce one.               |
| Billing starts       | Launch day — **only if the plan was chosen** |
| Annual prepay refund | Unused whole months at the $299 monthly rate |

The published terms are **grouped by purchase** (`commercialTerms.groups`): the build's
terms and the plan's terms never appear in one flat list, because that is how a plan
minimum once read as a build minimum. A test enforces the grouping.

**Without Growth Partner:** the hosting and domain accounts are already in the client's
name; they pay those providers directly and get the logins and a walkthrough at launch.
The site answers this explicitly (FAQ `self-hosting`).

---

## 5. Payment

Collected through **Stripe**, after scope is agreed in writing and never before:

1. **Deposit** — half the project fee (**$2,450** at founding pricing) via a Stripe
   Checkout link the owner sends. Success lands on `/welcome`, which explains what
   happens next and collects onboarding materials.
2. **Launch payment** — the other half, on the day the site goes live, via a second link.
3. **Growth Partner** — if chosen, a Stripe subscription ($299/mo or $2,990/yr) starting
   on launch day.

Payment state is advanced **only by verified Stripe webhooks** — never by a browser
reaching a success page. There is no public checkout; every payment follows a written
agreement. See §16 for where this lives, and README for the Stripe setup checklist.

---

## 6. Build scope

| Item            | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| Timeline        | **2–4 weeks** from receiving the required materials             |
| Revision rounds | **2**, within the agreed scope                                  |
| Service pages   | **Up to 6**, plus home, about and contact                       |
| Ownership       | Domain, hosting and content in the client's name from the start |

One count, everywhere: `buildScope` in `config/pricing.ts` is the single source for the
service-page and revision-round quantities, and a words-to-numbers test fails the build on
any copy that states a different figure. (The previous model published four, six and eight
service pages at once.)

A revision round is a consolidated set of requested changes submitted together. New pages,
new functionality, new services or a materially changed brief after sign-off are new scope
and are quoted before that work begins.

**There is no unlimited-revisions promise anywhere, and a test enforces that.**

The published process is: free assessment → scope, price and agreement → deposit →
Week 1 strategy and design → Week 2 build → Week 3 review and polish → Week 4 launch →
**your choice** (run it yourself, or Growth Partner). The last beat is a choice, not a
step — a test fails the build if any copy schedules the plan unconditionally.

---

## 7. Growth Partner scope

**The order below is a commercial commitment, not a presentation choice**, and a test asserts
it (`content.test.ts` → "leads the recurring scope with measurement and ends it with
upkeep"). The scope lives in `carePricing.plan.groups` as an ordered array for exactly that
reason: which group comes first decides what a buyer believes the fee is for.

**1. Every month, first — measure:**

- The **Website Performance Report**: what the website produced, whether it moved, what we
  changed and why, and what we are looking at next
- Calls and quote requests counted as real events rather than estimated
- Measured against the baseline recorded at launch

**2. Every month, from what the measurement shows — improve:**

- Conversion and user-experience improvements on the pages that bring in the most work
- Calls to action, forms and service pages refined where the numbers point
- Speed and mobile experience monitored
- A/B testing where traffic supports a meaningful result; a considered improvement, called
  that, where it does not

**3. As the business changes — keep current:**

- Content, service and photo changes on request
- Business information, hours and service area kept true
- A seasonal refresh each quarter

**4. Continuously — the floor.** Published _as_ the floor, in those words
(`carePricing.plan.floorNote`), because plenty of companies will keep a website online for a
fraction of this fee and a page presenting upkeep as the headline invites that comparison:

- Hosting, certificates, backups, security and software updates
- Uptime and form-delivery monitoring, bug fixes

Each quarter:

| Item               | Quantity                                        |
| ------------------ | ----------------------------------------------- |
| Seasonal refreshes | **4 per year** (~quarterly, timed to the trade) |

When needed:

| Item                     | Quantity                                                    |
| ------------------------ | ----------------------------------------------------------- |
| Campaign landing pages   | **Up to 1 per calendar month**                              |
| Campaign copy alignments | **Up to 2 per calendar month**                              |
| Active A/B tests         | **1 at a time**, where traffic supports a meaningful result |

Unused monthly allowances do not accumulate. Anything beyond them is quoted before it is
built, never added to a bill afterwards. Nothing is described as unlimited, because
nothing is.

**Hosting and domain renewal costs are inside the $299.** The accounts are registered in
the client's name; the business pays the bills while the plan is active, and billing
reverts to the client if it ends.

### Explicitly excluded

- Managing advertising accounts, budgets, bidding or media buying
- Any promise about rankings, leads, traffic, revenue or ROI

---

## 8. A/B testing policy

Unchanged: formal tests run only where traffic supports a meaningful result, one at a
time, no published traffic floor, and evidence-based improvement — called what it is —
in the months (most months, for most local businesses) where traffic is too thin.

---

## 9. Response guarantee

`responseGuarantee` in `client/src/content/growth.ts`. **Live** (`enabled: true`).
Unchanged by the simplification:

| Term                    | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| Window                  | **24 business hours**                                            |
| Business hours          | **Monday–Friday, 8am–6pm Pacific** (from `site.contact.hours`)   |
| Excluded from the clock | Weekends and US federal holidays — they pause it                 |
| Qualifying channels     | The website support form; the designated business email          |
| Remedy                  | **That month's $299 management fee waived in full**              |
| Applied                 | **Automatically.** The client never has to notice, chase or ask. |

It guarantees a response, never a resolution; it guarantees nothing about leads, rankings,
sales, traffic or revenue, and the site says so directly underneath the promise.

---

## 10. Launch guarantees

Four instruments, all about work rather than results, presented under one FAQ answer
(`what-guaranteed`) and their own sections:

1. **Built to what we agreed** — work continues until the written requirements are met.
2. **The Launch Standard** — the site does not launch until it passes the published
   eight-check standard, each check verifiable by the client on launch day.
3. **If I break it, I fix it** — at no additional charge.
4. **The response guarantee** (Growth Partner only) — §9.

Never convert any of these into a revenue, lead, ranking or ROI guarantee.

### Future performance guarantee — deliberately NOT implemented

Once real client data exists, a conditional performance guarantee could be evaluated:
defined baseline conversion metric, measurement methodology, traffic threshold,
measurement period, qualified-conversion definition, exclusions, and a remedy such as
continued optimisation at no management fee until an agreed threshold is reached. **Do not
publish anything like this now** — there is no evidence base to responsibly promise any
conversion figure, and the site's whole credibility position depends on not doing so.

---

## 11. Cancellation

- The client keeps the website, the domain, the hosting account and the content — they
  were always in the client's name.
- Billing for hosting and domain renewals reverts to the client; the accounts stay where
  they are, only the payment method changes. **Hosting becomes the client's cost to pay
  directly** — stated on the site, not discovered afterwards.
- Campaign landing pages remain part of the client's website.
- Any active A/B test is ended and the designated version left live.
- Prepaid annual months that were not used are refunded at $299/month.

---

## 12. The three ways in

`entryPaths` in `client/src/content/entry.ts`.

| Situation                      | Response                        | Price           | Then                             |
| ------------------------------ | ------------------------------- | --------------- | -------------------------------- |
| Needs a website built          | The build                       | **$4,900**      | Growth Partner optional, $299/mo |
| Has a site that is not working | Fix rather than replace         | Quoted per site | Growth Partner optional, $299/mo |
| Wants their existing site run  | One-time onboarding audit + fix | Quoted per site | Growth Partner, $299/mo          |

Every path describes the plan as the optional choice it is. Managing a site the business
did not build always begins with a paid onboarding.

---

## 13. What is never claimed

Unchanged, and test-enforced: no guaranteed leads/rankings/revenue/customers/sales/
traffic/ROI; no "#1 on Google"; no invented testimonial, client, review count, case study
or statistic (**there are no clients yet, and the site says so**); no measured result
attached to a demonstration; no "24/7" anything; no unlimited revisions; no analytics
claims while no provider is configured. Additionally, post-simplification: no
counter-style scarcity, no recurring deliverable inside a one-time list, no build
deliverable inside the plan's lists, and no page/revision/minimum count that disagrees
with the config.

---

## 14. Free resources

One hierarchy, three things: an **offer** — the free website assessment, the primary CTA
everywhere; a **tool** — the **Website Score** at `/audit`, labelled "Score your site" in
navigation; and a **resource** — the **PlayBook**, free in full, with the workbook sent by
email by hand.

A fourth thing was added by the capability layer and is deliberately not a fourth free offer:
**`/what-your-website-can-do`** asks for nothing and offers nothing. It is reference material —
see §18.

The audit's recommendation has three honest branches (`recommendedAction`): below ~65% → the
build; 65–85% → **Conversion Fix**, whose scope is published and whose price is owner-gated;
above ~85% → "you probably do not need a rebuild", with a second-opinion CTA.

---

## 15. Decision register

Authoritative. Treat as the current business model unless the owner explicitly says
otherwise. Rewritten 2026-08-13 — the previous register described the pre-simplification
model and had drifted from the live site.

| #   | Decision                           | Value                                                                                                                                                              |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Build price (standard)             | $7,500 one-time (product: **Customer Conversion Build**)                                                                                                           |
| 2   | Build price (founding client)      | $4,900 one-time, condition: case-study permission                                                                                                                  |
| 3   | Founding cap                       | 10 projects; `taken` edited by hand; no live counter                                                                                                               |
| 4   | Launch payment                     | $2,450 deposit, $2,450 at launch (derived halves)                                                                                                                  |
| 5   | Growth Partner                     | $299/month — **optional, always**                                                                                                                                  |
| 6   | Annual prepay                      | $2,990/year, secondary to monthly                                                                                                                                  |
| 7   | Growth Partner Plus                | **Removed** 2026-08-13                                                                                                                                             |
| 8   | Foundation / Dominate tiers        | **Removed** 2026-08-13                                                                                                                                             |
| 9   | Minimum term (plan only)           | 3 months, from launch day                                                                                                                                          |
| 10  | After the minimum                  | Month-to-month                                                                                                                                                     |
| 11  | Cancellation notice                | 30 days                                                                                                                                                            |
| 12  | Annual contract                    | None                                                                                                                                                               |
| 13  | Annual refund on cancellation      | Pro-rata at $299/month                                                                                                                                             |
| 14  | Plan billing starts                | Launch day, only if chosen                                                                                                                                         |
| 15  | Launch revisions                   | 2 rounds (`buildScope.revisionRounds`)                                                                                                                             |
| 16  | Service pages included             | Up to 6, plus home/about/contact (`buildScope`)                                                                                                                    |
| 17  | Launch timeline                    | 2–4 weeks after materials received                                                                                                                                 |
| 18  | Seasonal refreshes                 | 4 per year                                                                                                                                                         |
| 19  | Campaign landing pages             | Up to 1 per month                                                                                                                                                  |
| 20  | Campaign copy alignments           | Up to 2 per month                                                                                                                                                  |
| 21  | A/B testing                        | Where traffic supports it; 1 at a time; no published floor                                                                                                         |
| 22  | Response guarantee                 | 24 business hours; month's fee waived; automatic                                                                                                                   |
| 23  | Business hours                     | Mon–Fri, 8am–6pm Pacific                                                                                                                                           |
| 24  | Hosting and domain costs           | Inside the $299 while the plan runs; client pays directly otherwise                                                                                                |
| 25  | Ownership                          | Client retains website and domain throughout                                                                                                                       |
| 26  | Ad management                      | Excluded                                                                                                                                                           |
| 27  | Ranking / lead / revenue guarantee | None, ever                                                                                                                                                         |
| 28  | Scarcity                           | One build at a time; no counters, no timers                                                                                                                        |
| 29  | Primary market                     | Greater Seattle; remote work accepted anywhere                                                                                                                     |
| 30  | Managing a site built elsewhere    | Yes, after a paid onboarding                                                                                                                                       |
| 31  | Rescuing an existing site          | Quoted per site                                                                                                                                                    |
| 32  | Larger build scope                 | Quoted in writing before anything starts                                                                                                                           |
| 33  | Payments                           | Stripe: deposit link → launch link → optional subscription                                                                                                         |
| 34  | Payment state                      | Advanced only by verified Stripe webhooks                                                                                                                          |
| 35  | Public checkout                    | None — scope is agreed in writing before any payment                                                                                                               |
| 36  | Year-one cost                      | Published: $4,900 alone, $8,488 with the plan                                                                                                                      |
| 37  | Enquiry retention                  | 24 months after last meaningful contact                                                                                                                            |
| 38  | Onboarding data                    | Collected on /welcome after deposit; stored + emailed                                                                                                              |
| 39  | Analytics provider                 | None configured; event seam only                                                                                                                                   |
| 40  | Testimonials                       | None, because there are no clients yet                                                                                                                             |
| 41  | Voice                              | First person plural — JobForge speaks as the company (2026-08-13; was first person singular). Founder-run reality stated plainly on /about                         |
| 42  | Audit nav label                    | "Score your site"; the tool is named **Website Score** (DECISION 016)                                                                                              |
| 43  | Conversion Fix                     | Scope + boundary published; **price owner-gated** (`pricePublished: false`, recommended $1,900) — DECISION 014                                                     |
| 44  | Website Performance Report         | Monthly, for every Growth Partner client. Measurement + explanation + improvement work; **never a promise the number rises** — DECISION 015                        |
| 45  | Enquiry baseline                   | Recorded in writing on launch day, as a build deliverable                                                                                                          |
| 46  | Day-30 report                      | Written, to every build client, whether or not they take Growth Partner                                                                                            |
| 47  | Recurring scope order              | measure → improve → current → floor → on request. Test-enforced; the order is the claim                                                                            |
| 48  | Guarantees                         | Four: built-to-agreement, the Launch Standard, **measurement and reporting**, if-we-break-it-we-fix-it                                                             |
| 49  | Market comparison                  | Published, generic. **No provider or platform may be named in it** — test-enforced                                                                                 |     |
| 50  | The capability library             | Published at `/what-your-website-can-do`. Every entry labelled `included-build`, `included-partner`, `additional-scope`, `roadmap` or `not-offered` — DECISION 017 |
| 51  | Eleven quotable extras             | Real, deliverable, **in neither price**, quoted before work starts. None has been built for a client yet, and `maturity` says which are specified-only             |
| 52  | Four stated directions             | SMS alerts, automated review requests, job-software handoff, invoice links. **Not sellable.** The page says nobody will suggest otherwise on a call                |
| 53  | Two public refusals                | Accounting connection and an assistant chat window. Listed **with the reasoning**, because the reasoning is more useful than the omission                          |
| 54  | Trades taxonomy                    | Twelve, one list, `config/trades.ts`. Six have no page and are audit options only — DECISION 018                                                                   |

---

## 16. Where each decision lives in the code

| Decision                              | File                                                                          |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| **All prices, as numbers**            | **`client/src/config/pricing.ts`**                                            |
| The build outcome groups              | `config/pricing.ts` → `buildOutcomes` (derives `flagship.includes`)           |
| **Conversion Fix + its price gate**   | **`config/pricing.ts` → `conversionFix`, `fixPriceLabel()`**                  |
| The monthly report                    | `content/offer.ts` → `websiteReport`; UI `components/marketing/ReportExample` |
| Launch → baseline → 30 days → monthly | `content/offer.ts` → `afterLaunch`; UI `AfterLaunchSection`                   |
| How the two purchases relate          | `content/offer.ts` → `relationship`                                           |
| Market comparison (nobody named)      | `content/offer.ts` → `marketComparison`                                       |
| The recurring scope, in order         | `content/offer.ts` → `carePricing.plan.groups`                                |
| The flagship build and its scope      | `config/pricing.ts` → `flagship`, `buildScope`                                |
| **Founding-client offer and cap**     | **`config/pricing.ts` → `foundingOffer`**                                     |
| Growth Partner plan                   | `config/pricing.ts` → `growthPartner`                                         |
| Capacity constraint                   | `config/pricing.ts` → `capacity`                                              |
| Year-one arithmetic                   | `config/pricing.ts` → `yearOneTotal()`                                        |
| Price strings the copy interpolates   | `content/offer.ts` → `prices` (derived)                                       |
| The pricing block, on both pages      | `features/home/sections/PricingBlock.tsx`                                     |
| The build card / plan / comparison    | `content/offer.ts` → `pricing`, `carePricing`, `comparison`                   |
| Which action the assessment suggests  | `config/pricing.ts` → `recommendedAction`                                     |
| The launch standard                   | `content/offer.ts` → `launchStandard`                                         |
| Published terms (grouped)             | `content/offer.ts` → `commercialTerms.groups`                                 |
| Cancellation                          | `content/offer.ts` → `cancellation`                                           |
| Launch process (weeks + choice)       | `content/offer.ts` → `launch`                                                 |
| Who does what                         | `content/offer.ts` → `responsibilities`                                       |
| Launch guarantees                     | `content/offer.ts` → `guarantee`                                              |
| Response guarantee                    | `content/growth.ts` → `responseGuarantee`                                     |
| A/B testing policy                    | `content/growth.ts` → `abTesting`                                             |
| Business hours                        | `content/site.ts` → `contact.hours`                                           |
| The three ways in                     | `content/entry.ts`                                                            |
| Retention and terms in public words   | `content/legal.ts`                                                            |
| Stripe products / webhooks            | `server/src/features/billing/` + env (see `.env.example`)                     |
| Post-deposit onboarding               | `client/src/features/welcome/` + `server/src/features/onboarding/`            |
| **The capability library**            | **`client/src/content/capabilities.ts`**                                      |
| Capability shapes + honesty fields    | `client/src/types/content.ts` → `Capability`, `CapabilityAvailability`        |
| Which capabilities suit which trade   | `client/src/lib/capabilityMatch.ts` (pure; takes the library as an argument)  |
| Trades + how each trade's work is     |
| bought                                | `client/src/config/trades.ts` → `trades`, `Trade.serviceModels`               |
| The explorer, lifecycle, integrations | `client/src/features/public/capabilities/`                                    |
| The guards on all of it               | `client/src/content/content.test.ts`                                          |
| Guards on the capability library      | `client/src/content/capabilities.test.ts` (+ `lib/capabilityMatch.test.ts`)   |

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
