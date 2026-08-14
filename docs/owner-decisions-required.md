# Owner decisions required

**Internal.** Every unresolved business decision, in one place, so nothing gets decided
by a code change nobody meant as a decision. Each entry states what is currently
implemented, why the decision is the owner's, the options, and a recommendation. Record
the decision by ticking a box and updating `docs/business-offer.md` (and the code, per
its §16 map) in the same pass.

Last reviewed: 2026-08-13.

---

## DECISION 001 — Is the standard price real?

**Current implementation:** the site publishes $7,500 as the "Standard project price"
beside the $4,900 founding price, presented as two concurrent prices (never a
strike-through).

**Why this is yours:** if $7,500 will never actually be charged once the founding
projects are gone, it is a fictional reference price and the whole comparison is
deceptive under 16 CFR 233.1. This is the load-bearing confirmation.

Options:
A. Confirm: $7,500 is the price after founding pricing ends.
B. Set a different standard price (one edit in `config/pricing.ts`).
C. Drop the comparison: publish one price with no discount framing (`foundingOffer.enabled = false`).

**Recommended:** A, if true — otherwise C. Never keep the comparison "for effect."

Owner decision: [ ]

---

## DECISION 002 — Founding price, cap and condition

**Current implementation:** $4,900, first 10 projects, in exchange for case-study
permission. `foundingOffer.taken` is hand-edited; at 10 the discount self-removes. No
live counter is rendered.

**Why this is yours:** the cap and the condition are public claims. Signing an 11th
founding project, or waiving the case-study condition, converts the discount into
decoration.

Options: A. Confirm as implemented. B. Change cap/price. C. Remove founding pricing.

**Recommended:** A, and actually collect the case-study permission in writing
(`docs/proof-collection.md`).

Owner decision: [ ]

---

## DECISION 003 — Growth Partner: optional or mandatory?

**Current implementation:** optional, everywhere, unambiguously (first screen, pricing,
process, terms, FAQ). Tests enforce the wording.

**Why this is yours:** it is the central commercial architecture. The economics do not
require mandatory (the build price stands alone; accounts are in the client's name),
but only you can weigh recurring-revenue certainty against the trust position.

Options: A. Optional (as implemented). B. Mandatory bundle (repricing + consistent
rewrite everywhere — a large, deliberate change).

**Recommended:** A.

Owner decision: [ ]

---

## DECISION 004 — Growth Partner Plus

**Current implementation:** removed. The $299 scope already contained campaign pages,
copy alignments and traffic-permitting testing; Plus's remainder was an undefined
"priority response."

Options: A. Keep removed. B. Reintroduce with a genuinely different, operationally
defined scope (e.g., a measurable faster SLA and a defined monthly work allowance).

**Recommended:** A until real clients make a second tier's difference obvious.

Owner decision: [ ]

---

## DECISION 005 — Growth Partner internal scope caps

**Current implementation:** published quantities exist (1 landing page/mo, 2 alignments/
mo, 4 refreshes/yr, 1 A/B test at a time); internal hour/edit caps are undefined.

**Why this is yours:** the gap between "changes when you ask" and your actual capacity
is a business risk only you can size. See `docs/business-growth-partner-scope.md` for
the four [OWNER DECISION REQUIRED] items (hours guideline, edit counts, extra
copywriting, new SEO work).

**Recommended:** adopt the ~4 hrs/month internal guideline; quote beyond it.

Owner decision: [ ]

---

## DECISION 006 — Minimum term and cancellation

**Current implementation:** 3 months from launch, then month-to-month, 30 days' notice,
annual prepay refunded pro-rata.

Options: A. Confirm. B. Change (edits in `config/pricing.ts` + `offer.ts` + agreement).

**Recommended:** A.

Owner decision: [ ]

---

## DECISION 007 — The 30-day post-launch inclusion

**Current implementation:** the build includes "30 days of post-launch checks, fixes and
small improvements", presented as a five-beat "Your first 30 days" (launch → verify →
observe → improve → report). This restores a deliverable the previous $4,900 tier
documented, but it is a real fulfilment commitment on every build, including
build-only clients.

Options: A. Keep (recommended — it materially strengthens the build-only offer and the
handover story). B. Remove (one config line + the section). C. Shorten the window.

**Recommended:** A — but only if you will genuinely deliver the day-30 plain-English
report to every client.

Owner decision: [ ]

---

## DECISION 008 — Capacity statement

**Current implementation:** "One build at a time — that is what keeps the two-to-four-
week timeline realistic." From `capacity.concurrentBuilds = 1`.

**Why this is yours:** it is a public statement about how you operate. If you ever run
two builds at once while it is published, it becomes the fake scarcity it replaced.

Options: A. Confirm one at a time. B. Publish a different real number (e.g., 2/month).
C. Remove scarcity entirely until capacity is measurable.

**Recommended:** A while solo.

Owner decision: [ ]

---

## DECISION 009 — Response-guarantee waiver mechanism in Stripe

**Current implementation:** the promise and automatic remedy are published; the billing
mechanics are undefined (credit next invoice vs. refund the month).

**Recommended:** credit the next invoice via a one-time coupon; refund only when the
client is cancelling anyway. Record in `docs/guarantee-terms.md`.

Owner decision: [ ]

---

## DECISION 010 — Refund policy on the build

**Current implementation:** none is published. The deposit's refundability if a client
walks away mid-build is undefined anywhere.

**Why this is yours:** it is a cash and legal decision. Do not let the first dispute
decide it for you.

Options: A. Deposit non-refundable once work begins, stated in the agreement.
B. Pro-rated refund for work not yet performed. C. Cooling-off window then A.

**Recommended:** decide with the agreement's legal review; B is the most defensible
default.

Owner decision: [ ]

---

## DECISION 011 — Final-payment timing enforcement

**Current implementation:** "half on the day it goes live." Undefined: does the site
launch before or after the second payment clears?

Options: A. Payment link sent at approval; site launches when it clears (recommended —
clean, and the client has already seen the finished site in review). B. Launch first,
invoice due on launch day (trust-forward, collection risk).

Owner decision: [ ]

---

## DECISION 012 — Assessment form fields

**Current implementation:** the contact form asks 7 fields (2 optional); industry/
primary-service questions live in the self-serve audit instead, which carries trade
context via `?trade=`.

Options: A. Keep the short form (recommended — every field costs submissions).
B. Add industry/service/service-area fields per the Phase 3 brief's Part 32.

Owner decision: [ ]

---

## DECISION 014 — The Conversion Fix price ⚠ **BLOCKS PUBLICATION OF THE FIGURE**

**Current implementation:** `conversionFix` exists in `client/src/config/pricing.ts` with a
**published scope and boundary** and `pricePublished: false`. While that flag is false the
site renders the product, its scope, what it excludes and a call to action, and says the
figure is scoped from the free website assessment and agreed in writing. No number appears
anywhere, and `sanctionedFigures()` does not sanction one — so copy that types it fails the
build. Setting the flag to `true` publishes `from` on every surface at once.

**Why this exists at all:** `recommendedAction()` sends a site scoring roughly 65–85% to
targeted work rather than a rebuild, which is most established businesses with a working
website — and until this pass the site's answer to that reader was the phrase "quoted per
site" with no product, no boundary and nothing to press. That is a dead end in front of the
best-qualified visitor the site gets.

**Why the price is yours:** it is a rate, and the previous `$2,500` Foundation tier was
withdrawn precisely because a fixed figure for unseen work is a guess wearing a price tag.
What makes a figure defensible here is the **bounded scope** now published beside it: a
diagnostic against the twenty checks, the findings fixed on the existing site, tracking
configured and verified, a baseline recorded, two revision rounds, 30 days of checks, and
four stated exclusions. It is a fixed _method_, not an unknown amount of repair.

**Recommended figure: `from: 1_900` — "From $1,900".** The reasoning, so it can be argued
with rather than accepted:

| Consideration                                     | Effect on the number                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The build is $4,900 founding / $7,500 standard    | A fix should be visibly a fraction of it, or the build looks overpriced rather than better value                  |
| The withdrawn Foundation tier was $2,500 founding | That scope was looser than this one; a tighter scope should not cost more                                         |
| $1,900 is ~39% of the founding build              | Reads as "much cheaper, clearly smaller" — the ladder points the right way                                        |
| "From" rather than flat                           | The diagnostic is fixed; the corrective work is capped by the exclusions and anything beyond them is quoted first |

Options:
A. Confirm `from: 1_900` and set `pricePublished: true`.
B. Set a different figure and publish (one number, one flag).
C. Leave `pricePublished: false` indefinitely — the product, scope and CTA still work; only
the figure is withheld.

**Recommended:** A or B. C is a legitimate holding position and costs less than it used to,
but a published figure is what turns this from a conversation into a purchase.

Owner decision: [ ]

---

## DECISION 015 — The Website Performance Report is a monthly operational commitment

**Current implementation:** the Website Performance Report is now the **headline deliverable
of Growth Partner** — first in the plan's scope, its own block in the pricing surface with a
worked example, a row in the comparison table, a line in the guarantee, the fifth stage of
the after-launch sequence, and the answer to the dashboard's "choose a plan" action. Four
things, every month: what the website produced, whether it moved, what was changed and why,
and what is being looked at next.

**Why this is yours:** it is the single largest fulfilment commitment added by the offer
redesign, and it is the reason the recurring fee stops reading as upkeep. It is also a
promise that has to be kept in a month when nothing much happened, which is the month it is
tempting to skip. **A report that arrives ten months out of twelve is worse than no report**,
because its absence is now something the client notices.

Note what it is _not_: it promises measurement, explanation and improvement work, never that
the number goes up. The illustrative example on the site deliberately shows a month where
enquiries fell, with the reason attached, and a test asserts it keeps doing so.

Options:
A. Confirm — the report is produced every month for every Growth Partner client.
B. Reduce the cadence (quarterly) — this would need the copy, the plan's scope, the
comparison table and the guarantee changed together, and it substantially weakens the
offer.
C. Remove it — reverts the recurring service to an activity list, and with it the whole
argument for the price.

**Recommended:** A, and build the template before the first client launches rather than in
the first month it is due.

Owner decision: [ ]

---

## DECISION 016 — Two product renames are now published

**Current implementation, changed by the offer redesign:**

| Was                             | Is                            | Where it lives                        |
| ------------------------------- | ----------------------------- | ------------------------------------- |
| The Customer Conversion Website | **Customer Conversion Build** | `config/pricing.ts` → `flagship.name` |
| Website Revenue Audit           | **Website Score**             | `content/audit.ts` → `audit.name`     |

**Why the build was renamed:** _website_ is the artefact, and the artefact is the half a
template also has — so naming the product after it invited the one comparison the offer
cannot win. "Build" names the engagement. The word is not banished: it is in the statement
under the name, in the tagline's second clause, and throughout the FAQ, where it explains
rather than defines.

**Why the audit was renamed:** the site had a free website assessment, a Website Revenue
Audit and a PlayBook — three things all reading as free offers, so a visitor had to work out
which one they wanted before they could want anything. There is one hierarchy now: an
**offer** (the free website assessment), a **tool** (the Website Score), and a **resource**
(the PlayBook).

**Why this needs your confirmation:** both are things you have to say on the phone, and the
Stripe **Product name** `Website Build` was deliberately _not_ changed — `findProductByName`
matches exactly, so a rename in the script would create a duplicate Product with the prices
split across two. The descriptions were updated and require a Dashboard edit to take effect.

Options: A. Confirm both. B. Confirm one. C. Revert either (each is one line).

**Recommended:** A.

Owner decision: [ ]

---

## DECISION 017 — The capability library publishes four commitments and two refusals ⚠ **THE ONLY NEW PUBLIC PROMISES SINCE THE OFFER REBUILD**

**Current implementation:** `/what-your-website-can-do` publishes the whole capability
library. Every entry carries an `availability`, and three of the five values are the ones that
need your sign-off, because each is a statement about what this business will and will not do.

**What is now published as `additional-scope` — "real, quoted separately":**

| Capability                | What you would be agreeing to build, on request         |
| ------------------------- | ------------------------------------------------------- |
| Service-area pages        | A real page per town, written about that town           |
| Online booking            | A calendar-backed booking flow                          |
| Quote estimator           | A questionnaire returning an honest range               |
| Immediate acknowledgement | An auto-reply naming what they asked about              |
| Review display + request  | Reviews on service pages, plus a one-tap ask link       |
| Recurring-service page    | A page selling the client's own regular arrangement     |
| List capture              | An incentive, a field, and a handoff to their list tool |
| Service tiers             | Good/better/best presented on the site                  |
| Financing link            | Their existing provider's application, in place         |
| Deposit payments          | Card deposits into the client's own merchant account    |

Eleven of these. **None has been built for a client**, because there are no clients yet.
`maturity` distinguishes the ones whose pattern is settled (`established`) from the ones that
are specified only (`new`) — and a reader sees that distinction on the card.

**What is published as `roadmap` — "intended, not built, no date":** text-message enquiry
alerts, automated review requests, job-software handoff (Jobber / Housecall Pro), returning-
customer reminders, and invoice payment links. Five. The page states plainly that none can be
bought and that nobody will suggest otherwise on a call.

**What is published as `not-offered`, with the reasoning:** QuickBooks/accounting connection
and an assistant chat window. Two refusals, each with a paragraph explaining why — the
accounting one argues your payment provider and job software are the right route, the chat one
argues fixing the pages beats putting a machine in front of them.

**Why this needs your confirmation:** the eleven `additional-scope` entries are the closest
this site comes to a menu, and an owner who has not read them will be asked to quote one.
The two refusals are positions you now hold in public. Both are one field each to change.

Options: A. Confirm all three groups as published. B. Demote specific `additional-scope`
entries to `roadmap` (a capability you would rather not be asked for). C. Withdraw either
refusal, which turns it into `roadmap` and removes the reasoning.

**Recommended:** A, with one caveat worth acting on before the first enquiry: read
`quote-estimator` and `service-tiers`. Both are `new` — specified, never built — and both are
the kind of thing a customer assumes is a fortnight's work and is not.

Owner decision: [ ]

---

## DECISION 018 — Six trades were added to the audit's own list

**Current implementation:** `config/trades.ts` went from six entries to twelve. Cleaning, pest
control, auto detailing, photography, personal training and moving are now real options, all
with `hasPage: false`.

**Why:** the capability library maps recommendations onto the kind of business reading it, and
those six are in the brief it was built from. The alternative was a second industry enum
inside the capability library, which is the duplicate taxonomy `config/trades.ts` exists to
prevent — a capability recommended for a business the audit cannot identify.

**The cost, stated rather than discovered:** `/audit` step 1 is a radio group generated from
this list, so it is now twice as tall on a phone, above the assessment that is the point of the
page. And for the six new trades the diagnosis is identical to "something else", because
trade-specific audit content exists only for the five with pages.

**Why this needs your confirmation:** it widens the audience the site _invites_ — personal
training and photography are not trades, though they match the published test ("a customer
finds you locally and then contacts you"). The marketing copy was not changed: the homepage
chips, the SEO descriptions and `config/market.ts` still lead with the five home-service
trades.

Options: A. Keep all six. B. Keep the four home-service ones (cleaning, pest control, moving,
auto detailing) and drop photography and personal training. C. Write per-trade audit diagnosis
content for the new ones, so choosing them changes the result.

**Recommended:** A now, C when there is evidence anybody is choosing them —
`audit_trade_selected` already carries the slug, so the data to decide with is being collected
the moment an analytics provider is connected.

Owner decision: [ ]

---

## DECISION 019 — Two admin authentication mechanisms now exist side by side

**Current implementation:** privileged access is granted two different ways, and they do not
share a notion of identity.

| Surface        | Authenticates with                 | Knows who you are |
| -------------- | ---------------------------------- | ----------------- |
| `/api/admin/*` | Session cookie + `role: 'admin'`   | **Yes**           |
| `/api/billing` | `BILLING_ADMIN_TOKEN` bearer token | **No**            |

The session-based one is what the new admin surface uses, and it satisfies the principle that a
privileged API verifies authenticated identity, admin authorization and resource-level
authorization independently. The token-based one predates accounts: it authorises the _request_
without identifying a _person_, so an action taken through it cannot be attributed to anybody and
a leaked token is indistinguishable from the owner.

**Why this needs your decision:** the token endpoints are the ones that touch money — creating
projects, issuing checkout links, recording a waived month. They are currently the least
attributable part of the system and the most consequential. Nothing is broken today; the
question is whether that stays acceptable.

**Deliberately not changed by this work.** Moving billing behind the session would mean either
calling it from the admin browser — which would put a Stripe-adjacent surface in React — or
rewriting the endpoints, and neither belongs in the same change as building the admin UI.

Options: A. Leave as is, and keep the token in a password manager rather than a shell history.
B. Add `requireAdmin` **alongside** the token, so both are required — a one-line change per route
that makes every billing action attributable to a staff account. C. Replace the token with the
session entirely and operate billing from the admin surface.

**Recommended:** B. It keeps curl working, costs almost nothing, and turns an anonymous
privileged channel into an attributable one. C is the eventual answer and needs its own design —
see the note in `client/src/features/admin/api/adminApi.ts` about why no Stripe call belongs in
a browser.

Owner decision: [ ]

---

## DECISION 020 — The admin account is provisioned by hand, not seeded at boot

**Current implementation:** `npm run admin:create --workspace server` reads `ADMIN_EMAIL` and
`ADMIN_PASSWORD` from the server-side environment and either creates the account with
`role: 'admin'` or promotes an existing one. It is idempotent, refuses the `.env.example`
placeholders, refuses a password shorter than the customer minimum, and never prints the
password. **The running application never loads either variable** — they are deliberately absent
from `src/config/env.ts`, so no service, handler or error response can reach them.

`repository.setRole` is the only write in the application that can grant privilege, it has no
HTTP route, and `admin.api.test.ts` sweeps the source tree to assert that stays true.

**Why this needs your decision:** it means a fresh production deployment has **no admin** until
you run the script against the production database. That is the intended trade — a boot-time
seed would keep a live credential in the deployment environment forever and make "who has admin"
a property of an environment variable a dashboard typo could change — but it is an operational
step you have to know about.

**Already done in development:** the existing account for your address was promoted from
`customer` to `admin`. Its password was not touched.

**What to do before the first production deploy:** set both variables in the production
environment, run the script once, then remove them. The role lives on the user document.

Options: A. Keep it manual. B. Add boot-time seeding for convenience. C. Manual, plus a
health-check warning when no admin account exists.

**Recommended:** A, and C if you ever forget and spend twenty minutes wondering why `/admin` is
empty.

Owner decision: [ ]

---

## DECISION 013 — Support email and business address

**Current implementation:** a personal Gmail serves as both public and contractual
support address; no business address is published (Stripe verification will require one
privately regardless).

**Recommended:** move `supportEmail` to a domain mailbox before the first Growth
Partner client — it is the channel the response guarantee is measured on.

Owner decision: [ ]
