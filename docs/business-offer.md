# The commercial model

**This file is authoritative.** It records what the business sells, for how much, and on
what terms. Every price, term and promise rendered by the site derives from
`client/src/content/offer.ts` and `client/src/content/growth.ts`, and those files must
agree with this one and with the written client agreement.

If you are an agent working in this repository: **do not change any decision below on your
own initiative.** They are commercial commitments, not implementation details. Changing a
price, a minimum term, a guarantee or a scope quantity is a business decision that only
the owner can make. If a task seems to require it, say so and stop.

Last reviewed: 2026-08-09.

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

> **The Customer Conversion System** — a managed website system for local service
> businesses, built and maintained around turning the people who already find you into
> phone calls.

This file said "a managed lead-ready website system" until the offer rebuild, which is the
old name and the old emphasis. The word that had to go was **website**: it names the
artefact, and the artefact is the part the buyer cares least about. Nobody with a plumbing
business wants a website.

The name lives in `content/offer.ts` → `offerName`, and everything that refers to the system
by name interpolates it. The Lead-Ready framework in `content/playbook.ts` keeps its own
name deliberately — it is the free guide's six-stage structure, not the paid offer, and
collapsing the two would make the guide read as a sales brochure.

Not "I build websites". The distinction, which the whole homepage is structured around:

| Typical web designer    | This                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Build → Deliver → Leave | Build → Launch → Capture → Track → Maintain → Refresh → Align → Test → Improve → Support |

The promise is responsibility and continuity, not a deliverable. The ten-part system is
modelled in `content/offer.ts` as `systemComponents`, split into a `launch` phase that
happens once and an `ongoing` phase that repeats — that split is the argument for the
monthly fee and is pinned by a test.

---

## 3. Pricing

**Changed 2026-08-12 at the owner's direction**, from a single launch fee plus a monthly
fee to three project tiers plus two care plans. The previous model was one number
(**$2,500** launch, **$299/month**); the $2,500 survives as Foundation's founding price, so
nothing that was already quoted to anybody has moved.

All figures now live in **`client/src/config/pricing.ts`** as numbers, formatted on the way
out. `content/offer.ts` derives `prices` from it and remains the only file in the _content_
layer that names a figure. A test sweeps every string in the content layer and fails the
build on any figure the config did not produce — and the sanctioned list is derived from
the config rather than typed, so adding a tier cannot silently disable the guard.

### Project tiers

| Tier                     | Standard    | Founding client | Saving     |
| ------------------------ | ----------- | --------------- | ---------- |
| Foundation               | **$3,500**  | **$2,500**      | $1,000     |
| **Growth** (recommended) | **$7,500**  | **$4,900**      | **$2,600** |
| Dominate                 | **$12,000** | **$8,500**      | $3,500     |

Payment is half to begin and half on the day the site goes live, derived from whichever
price is actually being paid.

### Care plans, after launch

| Plan                | Price                                 |
| ------------------- | ------------------------------------- |
| Growth Partner      | **$299/month**                        |
| Growth Partner Plus | **$499/month**                        |
| Annual prepay       | **$2,990/year** (Growth Partner only) |

- **The care plan is a separate purchase, made after the project and never a condition of
  it.** The site says so out loud (`carePricing.optOut`). A project priced to only make
  sense with a subscription attached is a project priced dishonestly.
- Tax is not mentioned on the site. The written agreement governs.
- Rescue work on an existing site, and onboarding a site built by somebody else, are
  **quoted per site**. No figure is published for either.

---

## 3a. Founding-client pricing — the conditions that make it truthful

The FTC's Guides Against Deceptive Pricing (**16 CFR 233.1**) permit a former-price
comparison only where the former price was an actual, bona fide price, offered publicly on
a regular basis, for a reasonably substantial period. **This business has never charged the
standard prices.** They are a rate card being established now.

So the site does the following, and must keep doing it:

- The higher figure is labelled **"Standard project price"**. Never "was", "normally",
  "regularly", "reduced from" or "used to be" — a test in `content.test.ts` fails the build
  on all of them.
- It is **never rendered with a strike-through**, because strike-through is how a page
  claims "was" without writing it. Tests in `HomePage.test.tsx` and `ServicesPage.test.tsx`
  fail the build if any `<s>`, `<del>` or `<strike>` appears on either pricing surface.
- **Every surface that publishes a founding price publishes the condition with it.** The
  services page did not, for a while — it carried all three figures with the explanation
  only on the homepage. A test now fails the build on any component that maps over
  `pricing.tiers` without rendering `standardPrice`, and the hero and the entry paths carry
  the qualification in their own copy because they quote the figure outside a card.
- The saving is **derived** as standard − founding, never typed, so a price change cannot
  leave a stale discount claim behind it.
- The discount has a **real condition**: permission to publish the project as a case study,
  stated beside the price and repeated in the terms page.
- There is **no deadline, no countdown and no timer.** The offer is limited by a count,
  which is a number the owner edits by hand.

**Three things require the owner's confirmation before this goes live** — see §17.

---

## 3b. What is NOT claimed

No per-component dollar "values" are published — no "Conversion Strategy: $1,500 value"
stack. There is no defensible basis for those numbers, and inflating them to make the total
look larger is the thing the offer architecture is supposed to avoid rather than achieve.
The value stack communicates **breadth** instead: what each component is and what it does
for the business.

`config/pricing.ts` is structured so real figures can be added later if the business
establishes them — the same pattern `portfolio.ts` uses for `demoUrl`.

---

## 4. Recurring terms

| Term                 | Value                                        |
| -------------------- | -------------------------------------------- |
| Minimum commitment   | 3 months from launch                         |
| After the minimum    | Month-to-month                               |
| Cancellation notice  | 30 days                                      |
| Annual contract      | **None.** Never introduce one.               |
| Billing starts       | Launch day                                   |
| Annual prepay refund | Unused whole months at the $299 monthly rate |

The reason for the three-month minimum, stated on the site without being defensive: ninety
days is roughly what it takes to launch, observe what visitors actually do, find the
friction and begin fixing it. Less than that is measuring noise.

---

## 5. Payment

- **Half the project fee** to begin the work.
- **The other half** on the day the site goes live.
- On Growth at founding pricing that is **$2,450** and **$2,450**; on Foundation it is
  **$1,250** and **$1,250**. Derived from whichever price is being paid, never typed.
- **$299/month** from launch day, if the client takes a care plan. Many will not, and the
  site says so.

---

## 6. Launch scope

| Item            | Value                                                           |
| --------------- | --------------------------------------------------------------- |
| Timeline        | **2–4 weeks** from receiving the required materials             |
| Revision rounds | **2**, within the agreed scope                                  |
| Service pages   | **Up to 6**, plus home, about and contact                       |
| Ownership       | Domain, hosting and content in the client's name from the start |

A revision round is a consolidated set of requested changes submitted together. New pages,
new functionality, new services or a materially changed brief after sign-off are new scope
and are quoted before that work begins.

The timeline is measured from when the client's materials arrive. This is not hedging: the
build is rarely the slow part, and stating the dependency is what makes the range keepable.

**There is no unlimited-revisions promise anywhere, and a test enforces that.** Earlier
copy said the review loop "repeats until you are happy"; it does not, and it never did in
any sustainable version of this business.

---

## 7. Management scope

Included every month:

- Hosting, certificates, backups, security and software updates
- Uptime and form-delivery monitoring, bug fixes
- Content, service and photo changes on request
- Conversion and user-experience improvements
- Measurement, explained in plain English
- 24-hour response guarantee

Quantified inclusions:

| Item                     | Quantity                                                    |
| ------------------------ | ----------------------------------------------------------- |
| Seasonal refreshes       | **4 per year** (~quarterly, timed to the trade)             |
| Campaign landing pages   | **Up to 1 per calendar month**                              |
| Campaign copy alignments | **Up to 2 per calendar month**                              |
| Active A/B tests         | **1 at a time**, where traffic supports a meaningful result |

Unused monthly allowances do not accumulate. Anything beyond them is quoted before it is
built, never added to a bill afterwards.

**Hosting and domain renewal costs are inside the $299.** The accounts are registered in
the client's name; the business pays the bills while management is active, and billing
reverts to the client if it ends. Without this, "accounts in your name" and "one number,
no surprise invoices" would contradict each other.

### Explicitly excluded

- Managing advertising accounts, budgets, bidding or media buying
- Any promise about rankings, leads, traffic, revenue or ROI

---

## 8. A/B testing policy

Formal A/B tests run only where there is enough traffic for a result to mean something,
and only one at a time. **No traffic floor is published**, because a number on the page
disqualifies most readers at the moment they are deciding whether to make contact; the
free website review tells them specifically where they stand.

When traffic is insufficient — which will be most months for most local service
businesses — the work is evidence-based improvement instead: analytics, known usability
principles, page speed, and what the phone is saying. **It is called what it is.** An
improvement made on judgement is never presented as a test result.

This honesty is a commercial position, not modesty. "We constantly A/B test your website",
said to a business with forty visitors a week, is a lie with a straight face.

---

## 9. Response guarantee

`responseGuarantee` in `client/src/content/growth.ts`. **Live** (`enabled: true`).

| Term                    | Value                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| Window                  | **24 business hours**                                            |
| Business hours          | **Monday–Friday, 8am–6pm Pacific** (from `site.contact.hours`)   |
| Excluded from the clock | Weekends and US federal holidays — they pause it                 |
| Qualifying channels     | The website support form; the designated business email          |
| Remedy                  | **That month's $299 management fee waived in full**              |
| Applied                 | **Automatically.** The client never has to notice, chase or ask. |

**A qualifying response** is acknowledgement plus an answer, a next step, or a statement of
what is needed to proceed. From a person, not an automated acknowledgement.

**It guarantees a response, never a resolution.** "I have looked at it, here is what
happens next" is keepable at any hour. "It will be fixed" would be an SLA on somebody
else's hosting company. A test asserts the distinction survives every copy edit.

**It guarantees nothing about leads, rankings, sales, traffic or revenue**, and the site
says so directly underneath the promise. That disclosure makes the guarantee more
credible, not less.

### Exclusions

Requests through other channels; weekends and US federal holidays; third-party outages
(hosting, registrar); systems the client controls that the business cannot access; time
spent waiting on the client; work outside the agreed scope; security incidents needing a
third party to act first; duplicate or automated messages; events outside either party's
control.

### Out of hours

If a site is down or its forms have stopped delivering, contact any time and the business
will do what it can. This is **best effort, explicitly outside the guarantee**, and worded
that way on the site.

---

## 10. Launch guarantees

Two, both about work rather than results:

1. If the website is not delivered according to the requirements agreed in writing, work
   continues until it is.
2. If a change made by the business stops the website working properly, it is fixed at no
   additional charge.

Never convert either into a revenue, lead, ranking or ROI guarantee.

---

## 11. Cancellation

- The client keeps the website, the domain, the hosting account and the content — they
  were always in the client's name.
- Billing for hosting and domain renewals reverts to the client.
- Campaign landing pages remain part of the client's website.
- Any active A/B test is ended and the designated version left live.
- Prepaid annual months that were not used are refunded at $299/month.

Cancelling stops the ongoing work. It does not cost the client their website, domain,
content or access. This is published on the homepage as its own section because it is the
strongest thing on the page, and because most buyers in this market have been burned once.

---

## 12. The three ways in

`entryPaths` in `client/src/content/entry.ts`.

| Situation                      | Response                        | Price           | Then    |
| ------------------------------ | ------------------------------- | --------------- | ------- |
| Needs a website built          | Full launch                     | **$2,500**      | $299/mo |
| Has a site that is not working | Fix rather than replace         | Quoted per site | $299/mo |
| Wants their existing site run  | One-time onboarding audit + fix | Quoted per site | $299/mo |

Management is the default with every launch and is never described as mandatory. A client
who genuinely wants the build alone can have it scoped that way.

Managing a site the business did not build always begins with a paid onboarding, so
nothing is taken on at a fixed monthly price without first being brought to a standard
worth standing behind.

---

## 13. What is never claimed

Not a style guide — a list of things that would be untrue:

- Guaranteed leads, rankings, revenue, customers, sales, traffic or ROI
- "#1 on Google", "page one", "dominate search"
- Any testimonial, client name, logo, review count, case study or statistic that is not
  real. **There are no clients yet, and the site says so.**
- Any measured result attached to a demonstration
- "24/7" anything, while the promise is a business-hours window
- Unlimited revisions
- Analytics claims — no provider is configured, and the privacy page says so truthfully

`client/src/content/content.test.ts` sweeps every string in the content layer for these.
A hurried edit that adds one fails the build rather than reaching a customer.

---

## 14. Free resources

**The free website review.** No charge, no obligation. Looks at speed, mobile usability,
clarity, calls to action, form friction, trust gaps, service pages, local relevance,
message match and whether anything is measured. The prospect gets the list whether or not
they hire anybody. Toggled by `site.offer.freeReview.enabled`.

**The PlayBook.** Published in full at `/playbook` — twenty improvements, a fix-first list
and a 40-point scorecard, none of it gated. The workbook version (audit sheets,
worksheets, checklists) is requested by email.

**The Website Revenue Audit.** Published at `/audit`. The same twenty checks, scored by
the visitor against their own website, returning a band and the five weakest categories
written in customer terms. **No charge and no email address required to see the result** —
sending it is a separate, opt-in step that submits through `POST /api/leads`. It asks for
nothing the free assessment does not already ask for, so it creates no new commitment.

Requests go to `POST /api/subscribers`, which stores the address with a consent record and
notifies the owner. **The owner then sends the workbook**, produced by printing
`/playbook/workbook` to PDF. Nothing is auto-delivered and the confirmation copy says so —
there is no mailing system, and pretending otherwise would be discovered by the first
person who sat refreshing their inbox.

Consent wording is duplicated as `PLAYBOOK_CONSENT_TEXT` on the server and pinned by a
test on both sides, so what is stored always matches what the person was shown. There is
no sequence and no list; adding one means changing that sentence and asking people to opt
in separately.

---

## 15. Decision register

Authoritative. Treat as the current business model unless the owner explicitly says
otherwise.

| #   | Decision                           | Value                                                      |
| --- | ---------------------------------- | ---------------------------------------------------------- |
| 1   | Launch fee                         | $2,500 one-time                                            |
| 2   | Management fee                     | $299/month                                                 |
| 3   | Annual prepay                      | $2,990/year, secondary to monthly                          |
| 4   | Launch payment                     | $1,250 deposit, $1,250 at launch                           |
| 5   | Minimum term                       | 3 months, from launch day                                  |
| 6   | After the minimum                  | Month-to-month                                             |
| 7   | Cancellation notice                | 30 days                                                    |
| 8   | Annual contract                    | None                                                       |
| 9   | Annual refund on cancellation      | Pro-rata at $299/month                                     |
| 10  | Billing starts                     | Launch day                                                 |
| 11  | Launch revisions                   | 2 rounds                                                   |
| 12  | Service pages included             | Up to 6, plus home/about/contact                           |
| 13  | Launch timeline                    | 2–4 weeks after materials received                         |
| 14  | Seasonal refreshes                 | 4 per year                                                 |
| 15  | Campaign landing pages             | Up to 1 per month                                          |
| 16  | Campaign copy alignments           | Up to 2 per month                                          |
| 17  | A/B testing                        | Where traffic supports it; 1 at a time; no published floor |
| 18  | Response guarantee                 | 24 business hours                                          |
| 19  | Business hours                     | Mon–Fri, 8am–6pm Pacific                                   |
| 20  | Weekends and US federal holidays   | Pause the clock                                            |
| 21  | Qualifying channels                | Website support form; designated business email            |
| 22  | Remedy                             | That month's management fee waived in full                 |
| 23  | Remedy applied                     | Automatically, without the client asking                   |
| 24  | Guarantee covers                   | Response, never resolution                                 |
| 25  | Out-of-hours                       | Site-down best effort, outside the guarantee               |
| 26  | Hosting and domain costs           | Inside the $299; accounts in the client's name             |
| 27  | Ownership                          | Client retains website and domain throughout               |
| 28  | Ad management                      | Excluded                                                   |
| 29  | Ranking / lead / revenue guarantee | None, ever                                                 |
| 30  | Primary market                     | Greater Seattle                                            |
| 31  | Outside the area                   | Accepted where the work is remote                          |
| 32  | Management with a launch           | Default, opt-out possible, never mandatory                 |
| 33  | Managing a site built elsewhere    | Yes, after a paid onboarding                               |
| 34  | Rescuing an existing site          | Quoted per site                                            |
| 35  | Enquiry retention                  | 24 months after last meaningful contact                    |
| 36  | Subscriber retention               | Until deletion is requested or the purpose ends            |
| 37  | Analytics provider                 | None configured; event seam only                           |
| 38  | Testimonials                       | None, because there are no clients yet                     |
| 39  | Voice                              | First person singular; one-person business                 |
| 40  | PlayBook                           | Free in full; workbook by email, sent by hand              |

---

## 16. Where each decision lives in the code

| Decision                            | File                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| **All prices, as numbers**          | **`client/src/config/pricing.ts`**                       |
| **Founding-client offer and cap**   | **`config/pricing.ts` → `foundingOffer`**                |
| Price strings the copy interpolates | `content/offer.ts` → `prices` (derived)                  |
| Pricing cards, annual option        | `content/offer.ts` → `pricing`                           |
| Care plans after launch             | `content/offer.ts` → `carePricing`                       |
| The care-plan block, on both pages  | `features/home/sections/CarePlans.tsx`                   |
| Which tier the assessment suggests  | `config/pricing.ts` → `recommendedTier`                  |
| The launch standard                 | `content/offer.ts` → `launchStandard`                    |
| Published terms                     | `content/offer.ts` → `commercialTerms`                   |
| Cancellation                        | `content/offer.ts` → `cancellation`                      |
| Launch timeline and process         | `content/offer.ts` → `launch`                            |
| Launch guarantees                   | `content/offer.ts` → `guarantee`                         |
| Response guarantee                  | `content/growth.ts` → `responseGuarantee`                |
| A/B testing policy                  | `content/growth.ts` → `abTesting`                        |
| Seasonal and campaign quantities    | `content/growth.ts` → `seasonal`, `campaignAlignment`    |
| Business hours                      | `content/site.ts` → `contact.hours`                      |
| The three ways in                   | `content/entry.ts`                                       |
| Retention and terms in public words | `content/legal.ts`                                       |
| Consent wording                     | `content/playbook.ts` + `server/.../subscriber.types.ts` |
| The guards on all of it             | `client/src/content/content.test.ts`                     |

---

## 17. Owner confirmation required before this goes live

Three facts in §3a were supplied by the brief rather than derived from anything already in
this repository, and each one is a claim made to the public. **They are recorded here
rather than assumed, because getting any of them wrong turns a truthful discount into a
deceptive one.**

| #   | The claim                                                                                                                       | Why it needs confirming                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **The standard prices are real prices** — $3,500 / $7,500 / $12,000 are what the work is offered at once founding pricing ends. | If there is no intention to ever charge them, they are not standard prices and the whole comparison has to go. This is the load-bearing one.                                                                                                    |
| 2   | **The cap of ten is real.** `foundingOffer.total = 10`.                                                                         | The site states it as fact. If the intention is to keep offering founding pricing past ten, the number is wrong and should be raised or removed rather than quietly exceeded. `remaining` is edited by hand and there is deliberately no timer. |
| 3   | **Case-study permission is genuinely required** to get founding pricing.                                                        | It is the condition that makes the lower price a qualified discount rather than simply the price. If it is not actually asked for, the standard price is fiction.                                                                               |

Set `foundingOffer.enabled = false` and every trace of the discount disappears from the
site — the standard prices become the prices, and nothing is left advertising an offer that
is not being honoured.

### Also unconfirmed, and smaller

- **The $499 Growth Partner Plus tier** is new. Its scope is drawn from work already
  described elsewhere in this file (A/B testing, campaign pages, monthly reviews), so
  nothing in it is invented — but the price and the split between the two plans are the
  owner's call.
- **Dominate promises integration and custom functionality**, in two lines: "Integration
  with the tools you already run the business on" and "Custom functionality where an
  off-the-shelf answer does not fit". For a service business those tools mean scheduling
  and dispatch software — Jobber, Housecall Pro, ServiceTitan — and connecting to one is
  the most expensive thing in any tier. It is bounded by that tier's published terms
  ("scope is agreed in writing before anything starts, because at this size no two are the
  same"), which is what stops it being an open-ended promise at a fixed $8,500. **Confirm
  the boundary is one you would hold to on a call**, because the buyer will read those two
  lines as "yes" before they read the terms.
- **Tier scope quantities** — four service pages on Foundation, eight on Growth — were
  chosen to be consistent with the previous "up to six" and to make the tiers genuinely
  different. They are scope commitments and should be confirmed.
- **The names.** "Foundation", "Growth" and "Dominate" for the projects; "Growth Partner"
  and "Growth Partner Plus" for the plans. None of them is a commitment and all of them are
  said out loud on the phone — "the Dominate package" in particular is worth deciding
  deliberately rather than inheriting from a draft. Changing any of them is one edit in
  `config/pricing.ts`.
