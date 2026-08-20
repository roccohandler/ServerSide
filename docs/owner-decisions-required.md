# Owner decisions required

**Internal.** Every unresolved business decision, in one place, so nothing gets decided
by a code change nobody meant as a decision. Each entry states what is currently
implemented, why the decision is the owner's, the options, and a recommendation. Record
the decision by ticking a box and updating `docs/business-offer.md` (and the code, per
its §16 map) in the same pass.

Last reviewed: 2026-08-13.

---

## DECISION 001 — Is the standard price real? — ANSWERED: A, it is the rate card

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

Owner decision: [x] **A — 2026-08-19.** $7,500 is the price the work is offered at once the ten
founding projects are taken. The two-price presentation stands unchanged, and the reasoning at
the top of `config/pricing.ts` is now confirmed rather than assumed: it is a rate card being
established, not a price history, so the standard price is labelled and concurrent and is never
rendered with a strike-through.

**What this closes.** The presentation was legally load-bearing under 16 CFR 233.1 and rested on
an unconfirmed premise. It no longer does. **What it does not close:** the confirmation is only
worth anything while it stays true. If the business ever decides it will not charge $7,500,
option C is one edit — `foundingOffer.enabled = false` — and every trace of the comparison leaves
the site with it.

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

## DECISION 009 — Response-guarantee waiver mechanism in Stripe — ANSWERED: credit the next invoice

**Current implementation:** the promise and automatic remedy are published; the billing
mechanics are undefined (credit next invoice vs. refund the month).

**Recommended:** credit the next invoice via a one-time coupon; refund only when the
client is cancelling anyway. Record in `docs/guarantee-terms.md`.

Owner decision: [x] **Credit the next invoice — 2026-08-19.** A month's fee is applied as a
credit against the next monthly invoice. A refund is issued instead only where the client is
cancelling and there is no next invoice to credit.

**One correction, and it is the whole reason this needed writing down.** The brief for this
decision proposed a credit _applied on request_. The terms already published say the opposite —
"waived in full and **applied without you having to request it**" — and a mechanism that requires
a request would have quietly weakened a live promise to make it easier to administer. So the
remedy stays automatic from the client's side. What is being decided here is only how the money
moves, which is a question the client never has to hold.

**What that means for the implementation.** Automatic-from-the-client's-side is not the same as
automatic-in-code, and this decision does not pretend otherwise: whether a reply was _substantive_
inside 24 business hours is a judgement no timestamp can make, so the credit is applied by the
owner. The console gains the action, the credit is recorded against the project, and the
customer sees it on their billing page without having asked. What the system genuinely can do is
notice the risk — a message awaiting a team reply past the window is exactly what
`listAwaitingTeamReply` already surfaces — so the console flags it rather than deciding it.

**Not `docs/guarantee-terms.md`.** The terms are published in `content/legal.ts` under
`response`, which is the copy a client actually reads. A second document restating them is a
second place for them to drift, which is the failure the whole content layer is arranged to
avoid.

**Built 2026-08-20.** `GuaranteePanel` on the console's project page, `POST
/api/admin/projects/:id/guarantee-credit`, and a customer-visible activity entry so the waiver
is something they _see_ rather than something they would have to ask about. The panel renders
nothing on a project with no plan.

**The route hard-codes `remedy: 'credit'`, and the omission is the decision.** DECISION 019
keeps anything that moves money _out_ — refunds, cancellations, payment statuses — on the
`BILLING_ADMIN_TOKEN` surface, because those are irreversible and a mis-click on a page holding
several customers' projects is a different kind of accident from a mis-typed curl command. The
refund remedy stays there, for the client who is leaving and has no next invoice to credit.

It is one press rather than a confirmation dialog, and that is only safe because
`recordGuaranteeCredit` is idempotent per project-month — a confirmation in front of a remedy is
a reason not to apply it.

---

## DECISION 010 — Refund policy on the build — ANSWERED: B, refundable until work starts

**Current implementation:** none is published. The deposit's refundability if a client
walks away mid-build is undefined anywhere.

**Why this is yours:** it is a cash and legal decision. Do not let the first dispute
decide it for you.

Options: A. Deposit non-refundable once work begins, stated in the agreement.
B. Pro-rated refund for work not yet performed. C. Cooling-off window then A.

**Recommended:** decide with the agreement's legal review; B is the most defensible
default.

Owner decision: [x] **B — 2026-08-19.** Published as `refunds` in `content/legal.ts`:

- **Before the first working session**, the deposit is refunded in full, no reason required.
- **After it**, the refund is the deposit less the fair value of work completed to that point,
  and the deposit is the ceiling — a cancelled project can cost the client nothing beyond it.
- **Where the business cannot deliver**, the full deposit is returned regardless of stage.

**Why B rather than the cooling-off window.** A window is easier to administer and it protects
the wrong party: the clock can expire while the work has not started, so a client who paid on
Monday and heard nothing for a fortnight would have lost their refund to a date rather than to
any work being done. Tying the boundary to _work beginning_ makes it a fact about the project
instead of a fact about the calendar, and it is the version that can be stated as reassurance on
the pricing page without a caveat immediately underneath it.

The boundary is checkable, which is the property that matters in a dispute: the first working
session produces an activity entry, and the project moves off `onboarding`.

**Note for the legal review this page has always asked for:** "fair value of work completed" is
the phrase carrying the weight. The written agreement should say how it is assessed.

---

## DECISION 011 — Final-payment timing enforcement — ANSWERED: A, plus deemed acceptance

**Current implementation:** "half on the day it goes live." Undefined: does the site
launch before or after the second payment clears?

Options: A. Payment link sent at approval; site launches when it clears (recommended —
clean, and the client has already seen the finished site in review). B. Launch first,
invoice due on launch day (trust-forward, collection risk).

Owner decision: [x] **A, with a backstop — 2026-08-19.** The code already implements A:
`approve()` moves the project to `launching`, `setMilestone` emails that the balance is payable,
and `available.final` opens at `launching`. What was missing was not behaviour but a published
term, and one clause the behaviour has no answer for.

**The published order.** The balance is payable on approval; the site goes live the same working
day the payment clears. Nothing about that changes.

**The backstop — 10 business days.** If a preview is delivered and an approval requested, and no
response of any kind arrives within ten business days, the work is **deemed accepted** and the
balance becomes due. Published as `acceptance` in `content/legal.ts`.

**Why a backstop is needed at all, and why ten.** Without it a finished build can be held open
indefinitely by silence: the milestone cannot advance, the balance cannot be invoiced, and the
one-build-at-a-time capacity claim — which is the reason the two-to-four-week timeline is
keepable — is being spent on a project nobody is progressing. Ten business days is a fortnight
of working time. It is long enough that a holiday or a busy month does not trigger it, and short
enough that it resolves inside a billing cycle. Five was considered and rejected for the first
reason.

**What deemed acceptance is not.** It is not a launch. Nothing goes live on a deemed acceptance
without the payment, exactly as with a real one — it makes the balance due, not the site public.
And it is only reachable from a state the client was actually told about: the approval request
sends an email and writes an activity entry, both of which are the evidence that the clock
started.

**Related:** DECISION 010 (refunds) and the client-delay clause, which pauses a project after 30
days of silence during _onboarding_ — a different stage and a different remedy. The two are
deliberately separate: silence before a build has anything to show is a scheduling problem, and
silence in front of a finished website is a payment problem.

---

## DECISION 012 — Assessment form fields

**Current implementation:** the contact form asks 7 fields (2 optional); industry/
primary-service questions live in the self-serve audit instead, which carries trade
context via `?trade=`.

Options: A. Keep the short form (recommended — every field costs submissions).
B. Add industry/service/service-area fields per the Phase 3 brief's Part 32.

Owner decision: [ ]

---

## DECISION 014 — The Conversion Fix price — ANSWERED: withdraw the product

**Answered 2026-08-16. Conversion Fix is removed from the site.** This entry asked for one
number and the number never came, which turned out to be the answer.

**What it was:** `conversionFix` in `apps/client/src/config/pricing.ts` carried a published
scope, a published boundary, and `pricePublished: false`. While that flag was false the site
rendered the product, its scope, what it excluded and a call to action, and said the figure was
scoped from the free website assessment and agreed in writing. No number appeared anywhere, and
`sanctionedFigures()` did not sanction one — so copy that typed it failed the build.

**Why it existed:** `recommendedAction()` sends a site scoring roughly 65–85% to targeted work
rather than a rebuild, which is most established businesses with a working website — and the
site's answer to that reader had been the phrase "quoted per site" with no product, no boundary
and nothing to press. That is a dead end in front of the best-qualified visitor the site gets.

**Why it was withdrawn rather than priced.** The recommended figure was `from: 1_900`, and the
reasoning behind it still holds — a fix should be visibly a fraction of a $4,900 build, and the
withdrawn $2,500 Foundation tier had a looser scope than this one. What did not hold is the
premise underneath the whole entry: that publishing a figure would turn a conversation into a
purchase. It would not have. Every path to this product ran through the free website assessment
anyway, because corrective work cannot be quoted from a form — and once the quote comes out of
the assessment, a published "from" price is a number the client meets twice and the second one
is the real one. That is worse than no number.

So the product was a name and a card in front of a conversation that was going to happen either
way. **The dead end is what mattered, and it did not come back:** the audit's `fix` branch and
the entry section's middle path both now offer the free website assessment, framed for somebody
whose site is basically sound, with the work quoted in writing afterwards. A named step the
reader can take, with an honest statement of when the figure arrives.

**What this removed, in code:** `FixOffer`, `conversionFix` and `fixPriceLabel()` from
`config/pricing.ts`; the `fix` block from `content/offer.ts`; `ConversionFixCard`; the
conversion-fix stylesheet block; and the `'conversion-fix'` value from `pricing_tier_selected`.
The **event name stays** — event vocabulary outlives the code that fires it, and historical rows
carrying that value are still real observations. See the note in `lib/analytics.ts`.

**What is deliberately still true:** this business does smaller corrective jobs. It quotes them
after looking at the site, in writing, which is what it would always have done.

Owner decision: [x] Withdrawn — 2026-08-16

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

## DECISION 019 — Two admin authentication mechanisms now exist side by side — ANSWERED: B

**Answered 2026-08-16. Option B is built.** `/api/billing` requires `requireAdmin` **and** the
bearer token; either one alone answers NOT_FOUND. The rest of this entry is the reasoning, kept
because the shape of the answer matters more than the choice.

**What it was:** privileged access was granted two different ways, and they did not share a
notion of identity.

| Surface        | Authenticates with                              | Knows who you are |
| -------------- | ----------------------------------------------- | ----------------- |
| `/api/admin/*` | Session cookie + `role: 'admin'`                | **Yes**           |
| `/api/billing` | Session cookie + `role: 'admin'` + bearer token | **Yes** (was no)  |

The session-based one is what the admin surface uses, and it satisfies the principle that a
privileged API verifies authenticated identity, admin authorization and resource-level
authorization independently. The token-based one predates accounts: it authorised the _request_
without identifying a _person_, so an action taken through it could not be attributed to anybody
and a leaked token was indistinguishable from the owner.

That mattered because the token endpoints are the ones that touch money — creating projects,
issuing checkout links, recording a waived month. They were the least attributable part of the
system and the most consequential.

Options considered: A. Leave as is, and keep the token in a password manager rather than a shell
history. B. Add `requireAdmin` **alongside** the token, so both are required. C. Replace the token
with the session entirely and operate billing from the admin surface.

**Why B and not C.** C would put the money endpoints behind one credential — a cookie — and a
cookie is the credential most likely to be stolen from a browser. Keeping both means a compromise
has to hold two different kinds of secret at once, and it costs one `--cookie` on a curl command.
The console links of §8.2 are the working surface for the operations an operator actually
performs day to day; the token surface stays for reconciliation and for the things no screen has.

**Three consequences worth knowing:**

1. **The guards are ordered, and the order is load-bearing.** `requireAdmin` runs first, so the
   "set `BILLING_ADMIN_TOKEN`" 503 is reached only by somebody already signed in as staff.
   Ordered the other way, an anonymous prober on an unconfigured deployment would be told both
   that there is a billing surface here and what it is waiting for.
2. **Every state-changing request writes an attribution line** — `billing.admin_operation`, with
   the staff account's id and redacted address. Reads do not; a `GET /projects` is somebody
   reconciling, and a line per read would bury the five that are about money.
3. **The line goes to the log rather than to the activity stream.** A project reached through
   this surface may have no `ownerUserId` at all, and an activity entry with no account behind it
   is one nobody can ever be shown. The console's checkout links write activity as well, because
   there the project is resolved and its stream exists.

Owner decision: [x] B — built 2026-08-16

---

## DECISION 020 — The admin account is provisioned by hand, not seeded at boot

**Current implementation:** `npm run admin:create --workspace @jobforge/server` reads `ADMIN_EMAIL` and
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

Owner decision: [x] **Move it — 2026-08-19.** `site.contact.supportEmail` is already separate
from `site.contact.email` for exactly this reason, and the separation was built before there was
a reason to use it. The remaining work was to prove the separation is real rather than
decorative: that nothing anywhere renders the address as a literal, so pointing it at a domain
mailbox is one edit rather than a hunt.

**The mailbox itself is the owner's to create**, and until it exists the value stays as it is —
a support channel that bounces is worse than a personal one that works. What has changed is that
switching it costs one line, and a guard now fails the build if the literal reappears anywhere
outside `content/site.ts`.

**Why it matters more than it looks.** This is the address the response guarantee is _measured
on_ — the terms name "the designated business email" as one of the two qualifying channels. An
address that can be lost with a personal account is a contractual commitment resting on a
consumer product's password reset.

---

> **Superseded by DECISION 026 (2026-08-14).** Option A was chosen and served its purpose:
> the ESLint isolation it required is what made the eventual split a move rather than an
> untangling. The applications are now physically separate.

## DECISION 021 — Do the client and admin become two deployed applications, or one application with two boundaries?

**Current implementation:** the admin surface is a lazily-loaded boundary inside the client
application. It already has everything the "separate product" argument asks for:

| Concern            | Admin today                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| Layout             | `AdminLayout` — its own, not a variant of `AppLayout`                                                     |
| Navigation         | its own, in `AdminLayout`                                                                                 |
| Routing            | its own `/admin` subtree in `App.tsx`                                                                     |
| Guard              | `RequireAdmin`, plus `requireAdmin` on the server                                                         |
| Bundle             | four `lazy()` chunks; `scripts/check-budget.ts` fails the build if any of it reaches the customer payload |
| Server permissions | `project:read:any` / `project:write:any` — separate capabilities, not a flag                              |

So **zero admin code ships to a customer today**, and the two experiences already compose
independently. What a physical split would add is a separate build, a separate deploy target and a
separate origin.

**Why this needs your decision:** the split has real, non-obvious costs and one real benefit, and
which dominates depends on where you expect this to go commercially rather than on anything in the
code.

Costs: a second Vite build and Vercel target; `components/ui` (59 consumers) and `components/patterns`
must be extracted into a shared package _before_ either app can build, which makes it a prerequisite
rather than a follow-up; session bootstrap, CSRF and cookie scope have to work across two origins;
the `WorkspaceBar` bridge between surfaces stops being an in-app link.

Benefit: independent deploy cadence, and a hard guarantee — by impossibility rather than by lint —
that admin code cannot import customer code or the reverse.

Options:
A. **Logical separation now, physical split deferred.** Treat `admin` as a first-class boundary with
its own public API, and forbid `admin ↔ private` imports with ESLint zones.
B. **Split now** into `apps/client`, `apps/admin`, `apps/server` with `packages/ui` and
`packages/shared`. Pay the extraction cost before the lifecycle work adds more surface to move.
C. Extract only the server contracts into `packages/shared`; leave both front ends where they are.

**Recommended: A.** The stated goals — independent layouts, navigation, routing, dashboards and
workflows, and an admin UX that is not a variation of the customer UX — are all achievable, and
mostly already true, without a second deployable. The one thing a split buys that A does not is
enforcement by impossibility, and that is worth paying for when a second person works on one side
without the other, or when admin needs its own deploy cadence. Neither is true today. Choosing A now
does not cost you B later: the feature entry points, the shared-UI extraction and the route-group
split are the same work in both, which is why they are sequenced first regardless.

**This decision blocks** batch D4 of `03_plan/code_design_improvement_plan.md`, which is paused
pending it.

Owner decision: [x] **A — logical separation now, physical split deferred** (2026-08-14). `admin`
becomes a first-class boundary with its own public API; `admin ↔ private` imports are forbidden by
ESLint rather than by being in separate builds. D4 is unblocked. Revisit if a second person starts
working on one side without the other, or admin needs its own deploy cadence.

---

## DECISION 022 — Is the project lifecycle being renamed, generalised, or joined by a second one?

**Current implementation:** `PROJECT_MILESTONES` in `apps/server/src/features/projects/project.types.ts`
is an ordered eight-stage lifecycle for **a website build**:

```
onboarding → planning → building → review → revisions → approval → launching → live
```

It is the source of truth, it is server-owned, `milestoneIndex` turns it into the customer's progress
bar, and `MILESTONE_PRESENTATION` already translates every stage into customer language with an
explicit `waitingOnCustomer` flag. The new direction proposes a six-stage lifecycle for **custom
application development**:

```
Request Submitted → Specification → Specification Approval → Development → Final Review → Delivered
```

**Why this needs your decision:** these are not the same lifecycle with different words. The existing
one has no specification stage and no customer-submitted request; the proposed one has no onboarding,
revisions or launch stage. More importantly, the entire published product — the offer, the pricing,
the five demo sites, the twelve trades, the assessment — sells _websites for local service
businesses_. A lifecycle built around specifications and application delivery describes a different
product. Which of these is true changes the data model, not just the labels.

Options:
A. **Rename and extend the existing lifecycle.** One lifecycle; insert a specification stage before
building and a request stage before onboarding. Cheapest, and correct if this is the same product
described more carefully.
B. **Two project types on one domain.** `Project.kind = 'website' | 'application'`, each with its own
ordered stage list and presentation map. Stage machinery, activity spine, approvals, messaging and
permissions are all shared; only the stage list and its translation differ.
C. **Replace the website lifecycle.** Correct only if the trades website business is being retired —
which would also invalidate most of `apps/client/src/content/`.

**Recommended: B, contingent on your answer to "is this a second product?"** If it is one product
described better, A is right and much cheaper. I cannot settle this from the codebase: the code says
"websites for plumbers", the brief says "specifications and application delivery", and only you know
which is the plan.

Owner decision: [x] **A — one lifecycle, renamed and extended** (2026-08-14). Same product. There is
no `Project.kind`; the eight-stage website lifecycle stays and gains a specification stage before
`building` and a request stage ahead of `onboarding`. Customer-facing wording changes; the ordered
list, `milestoneIndex`, the progress bar and `MILESTONE_PRESENTATION` all survive unchanged in shape.

---

## DECISION 023 — Can a project exist before any money has changed hands?

**Current implementation:** a project is created either by the owner (`createForOwner`) or by a
verified Stripe deposit webhook (`activateForCustomer`). `PROJECT_STATUSES` begins at `agreed` —
"scope agreed in writing; nothing paid yet" — and `chooseCurrentAction` sends a customer with no
project to the assessment, then to the deposit. There is no path by which a customer creates a
project themselves.

The new direction requires `submitProjectRequest()` — a guided flow ending in a customer-created
project, before payment.

**Why this needs your decision:** this changes the commercial funnel, not just the UI. Today the
deposit is what puts somebody on the schedule, and that is a deliberate qualification gate — it is
what stops the build queue filling with enquiries. A customer-created project needs a pre-commercial
state, and you need to decide what a request entitles somebody to: a queue position, an estimate, a
response time, or nothing until they pay.

It also interacts with DECISION 010 (build refund policy) and DECISION 008 (capacity statement), both
of which are written on the assumption that a project implies a paid deposit.

Options:
A. Add a `requested` status ahead of `agreed`; a request creates a project the owner must accept. The
deposit gate stays exactly where it is.
B. Requests are a separate `ProjectRequest` entity that becomes a project on acceptance.
C. No customer-created projects; keep the assessment → deposit funnel and treat the guided flow as a
richer onboarding _after_ payment.

**Recommended: B.** It gives you the guided intake and the zero-state experience without putting
speculative rows into the table that billing, deployments, tasks and the admin queue all read. A is
simpler, but every existing project query then has to remember to exclude `requested`, and the ones
that forget will quietly show unpaid work as though it were scheduled.

Owner decision: [x] **B — a separate `ProjectRequest` entity** (2026-08-14). `Project` continues to
mean "work we are doing". A request becomes a project on owner acceptance; the deposit gate stays
exactly where it is. Every existing project query is unaffected by construction.

---

## DECISION 024 — Two approval gates, or one that moves?

**Current implementation:** `APPROVAL_STATES` (`not_ready → ready_for_review → changes_requested →
approved`) is a single per-project state machine, and it approves **the finished website before
launch**. The record pins what was approved: `approvedAt` plus `approvedDeploymentId`, so "you
approved this" names a specific deployment.

The new direction adds a **specification approval before development starts**, with its own versions
(`Draft / Submitted / Approved / Superseded`) and its own request/response record.

**Why this needs your decision:** if both gates exist, approval stops being a property of the project
and becomes a property of _an artefact_ — a specification version, or a deployment. That is a real
model change: `project.approval` would become `approvals[]`, each naming what it approved. Doing it
now is cheap; doing it after the specification feature ships means migrating live approval records.

Options:
A. **Generalise now.** One `Approval` record with `subjectType` (`specification` | `deployment`),
`subjectVersion`, `requestedBy`, `respondedBy`, `decision`, `comment`. `project.approval` becomes a
derived view of the latest deployment approval, so nothing on the customer dashboard changes.
B. Keep `project.approval` for the launch gate and add a separate `SpecificationApproval`.
C. Move the existing gate to the specification and drop launch approval.

**Recommended: A.** The existing gate already demonstrates the thing that matters — an approval names
the exact artefact it approved — and the specification requirement is that same pattern a second
time. Generalising once beats maintaining two. C is wrong: approving a specification is not approving
the built result, and you want both defensible.

Owner decision: [x] **A — generalise now** (2026-08-14). One `Approval` record carrying
`subjectType` (`specification` | `deployment`) and `subjectVersion`. `project.approval` becomes a
derived view of the latest deployment approval, so `CustomerProjectView` and the dashboard are
unchanged. Done before the specification feature ships, so no live approval records are migrated.

---

## DECISION 025 — How much operational detail does the customer see?

**Current implementation:** the split already exists and is enforced in two places.
`ACTIVITY_AUDIENCES = ['customer', 'internal']` tags every activity record, and
`MILESTONE_PRESENTATION` is a deliberate translation layer — the comment in `project.types.ts` puts
it as "`building` is not a word a plumber owes anybody". `CustomerProjectView` is built field by
field rather than by deleting fields from `StoredProject`, so a newly stored field is invisible until
somebody decides otherwise.

The new direction adds development substages (`Building / Testing / Polishing / Final QA / Ready for
Delivery`) and asks that customers see a simplified representation.

**Why this needs your decision:** the machinery to do this correctly already exists, so the only open
question is the product one — how much do you want to show? Showing "Testing" invites "why has it
been in testing for four days?". Showing nothing invites "what is happening?". The existing lifecycle
answers this by making every customer-visible stage a sentence about them rather than a status about
us.

Options:
A. Substages are `internal` only. The customer sees "Your website is being built" for the whole of
development, with the estimate carrying the timing information.
B. Substages are customer-visible with their own translated presentation, as a secondary line under
the stage.
C. Customer-visible only as activity entries when a substage changes — no live substage label on the
dashboard.

**Recommended: A, with the estimate doing the work.** The question a customer has during a build is
"when", not "which internal phase". An estimate with a last-updated date answers it honestly; a
substage label answers a question they did not ask, and creates one they did not have. Keep substages
for the admin queue, where they are genuinely operational.

Owner decision: [x] **A — substages are `internal` only** (2026-08-14). The customer sees the stage
sentence plus an estimate with a last-updated date. Substages exist for the admin queue and are
tagged `internal` in activity, so they never reach `CustomerProjectView`.

---

## DECISION 026 — Two applications, one backend. **Supersedes DECISION 021 option A.**

**What changed.** DECISION 021 chose option A: keep the owner console as a lazily-loaded
boundary inside one application, because a physical split was not yet worth paying for. The
owner has since specified a separate console they sign into to talk to prospects and reply to
clients, deployed independently. That is option B, and it is now the decision.

**021 was not wrong, and it is why this was cheap.** Its whole point was that
`admin ↔ private` isolation, enforced by ESLint, would make an eventual split "a move rather
than an untangling". That held: no import had to be broken to separate them.

**The shape.**

```
        customer.example.com          admin.example.com
          apps/client                    apps/admin
               │                              │
               └───────────── HTTPS ──────────┘
                              │
                        apps/server            ← the only security boundary
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                  Auth     MongoDB    Notify
```

**The three rules this commits to.**

1. **The two frontends never address each other.** Neither may import the other; ESLint fails
   the build on it in both directions. Two browser bundles cannot trust one another, because
   anything one "verifies" about the other's user is a claim made by code that user controls.
2. **The server is the security boundary, and it is the only one.** Both applications ship
   capability strings and use them to decide what to _render_. `apps/server` re-checks every
   capability against the session on every request, and that check is the only one that
   decides anything. No bundle may ever contain a secret.
3. **One identity system, two authorisations.** Not two auth systems — that doubles every
   password-reset failure mode and makes "is this person an owner?" a question with two
   answers. One `User`; the console requires a capability a customer does not have.

**What was built for it:** `apps/client`, `apps/admin`, `apps/server`, plus `packages/ui`
(the design system) and `packages/shared` (the API contract). `npm run verify` passes across
all five workspaces.

**What is deliberately not built yet**, and must not be assumed to exist:

| Not yet                                   | Why it is separate                                                                                                                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The conversation domain on the server     | `/api/admin/conversations` and its reply route are new domain work — a model, an authorisation rule and a notifier. The console's inbox is wired to them and renders its error state honestly until they exist. |
| Moving `features/admin` into `apps/admin` | The existing project/account console still lives in `apps/client` and still works. Moving it is mechanical and should land with the conversation work, not before it.                                           |
| Realtime delivery                         | The backend publishes the event; the transport (SSE or WebSocket) is a choice that should follow a working request/response path, not precede it.                                                               |

Owner decision: [x] **B — two applications against one backend** (2026-08-14), superseding
021 option A.

---

## DECISION 027 — The conversation domain, and the console's screens follow it

**Status: closed.** This finishes DECISION 026's "not yet" table. Everything on it that was
scoped as the next increment now exists; what remains is listed at the bottom and is smaller
than it was.

### 027.1 A conversation is a read model, not a collection

The console's front page answers one question: _who have I not got back to?_ Two kinds of
person are waiting, and from the owner's side of the desk they are the same job:

```
  lead     ──→ a prospect. No account, no portal.   The reply is an email.
  comment  ──→ a customer. Has a portal.            The reply is a comment on their thread.
```

The obvious build is a `conversations` collection that both of those write into. It was
refused, and the reason is the one that matters: it would make lead intake write to two
places, make the feedback feature write to two places, and create a _second_ definition of
"unanswered" that can disagree with the first. Two answers to "is somebody waiting?" is worse
than none, because one of them will be shown.

So `features/conversations` owns no storage. It reads leads and feedback, merges them oldest
first, and hands back a **qualified id** — `lead:<id>` or `comment:<id>` — which is the entire
cost of the design and is paid in one file. Replying dispatches on it: a prospect gets an
email, a customer's reply goes through `FeedbackService.addComment`, the same call the admin
project route already makes. Nothing about what a reply _is_ was re-implemented.

`comment:` rather than `project:` is deliberate. A customer with three outstanding change
requests is three rows, because that is how the owner works through them — each answered on
its own thread and marked done on its own.

### 027.2 Send first, then mark — the opposite of lead intake

`lead.service.ts` persists before it notifies, because there the lead is the asset and a failed
email must not lose it. A console reply inverts that, and the inversion is the point:

> Marking a lead `contacted` is only a _claim_ that the reply went out. Write the mark first
> and let the send fail, and the person drops off the only list that tracks them having never
> heard from anybody — silently, permanently, and with the owner seeing the same error banner
> either way.

So the mail goes first and a delivery failure propagates with nothing written. A failure of the
_bookkeeping_ after a successful send is swallowed and logged instead, because the reply cannot
be unsent and telling the owner it failed makes them send it twice. Both directions are
asserted; inverting the order fails a test that says so by name.

### 027.3 The console owns its own screens

`features/admin` is gone from `apps/client`. Projects, one project, and accounts are now
`apps/admin`, alongside the inbox. The customer bundle no longer contains the console at all —
not lazily, not behind a guard — and there is no `/admin` route to guess at.

`useResource` moved to `@jobforge/ui`: two applications now load-one-thing-then-act-on-it, and
two copies of that state machine had already drifted once. The _state components_ did not move
and were duplicated instead — the console's chrome is charcoal and says "Internal" precisely so
it cannot be mistaken for the customer application, and a shared empty state would put the
customer's voice on a screen showing five other businesses' data. Behaviour is worth one copy;
appearance here is worth two.

### 027.4 The console must be a subdomain of the API's domain

**This is a deployment constraint, not a preference, and it fails silently.**

The session cookie is `SameSite=Lax`, and `SameSite` is evaluated on the _site_ — the
registrable domain — not the origin. `admin.jobforge.example → www.jobforge.example/api` is
cross-origin and same-site, so the cookie is sent. `jobforge-admin.vercel.app →
jobforge.vercel.app/api` is two _sites_, because `vercel.app` is on the Public Suffix List, and
no cookie is sent at all: sign-in succeeds and the console immediately shows the sign-in form
again, with no error and a server behaving perfectly.

`SameSite=None; Secure` would lift the restriction and was refused twice over — it gives up the
strongest of the three CSRF layers in `middleware/csrf.ts`, and Safari blocks third-party
cookies regardless, so it buys a deployment shape that still does not work.

Recorded in `apps/admin/DEPLOY.md` beside the three settings that have to agree
(`VITE_API_URL`, the console's `connect-src`, and `CLIENT_ORIGIN` on the API).

### What this found on the way

Three defects that would have shipped, each caught by a guard rather than by looking:

| Defect                                                                                                                                                                                | Found by                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PATCH` missing from the server's CORS allowlist                                                                                                                                      | Reasoning about the move — the console's two PATCHes were same-origin before, so the list was correct by accident                                                                                                                                                                                                                                                                                                                             |
| The console's fetch layer reported a `204` as a failure                                                                                                                               | Writing the reply test against real `fetch` rather than a stubbed `post`                                                                                                                                                                                                                                                                                                                                                                      |
| `feedback:write:any` was exempted as "redundant by construction"                                                                                                                      | The stale-exemption half of the existing capability guard, the moment a route started checking it                                                                                                                                                                                                                                                                                                                                             |
| **The console was shipping a development React bundle** — `jsxDEV` for every element, with its source file and line number attached. 475 kB → 259 kB once fixed, 141 → 82 kB gzipped. | Reading the built artefact rather than trusting the command name. `apps/client/scripts/build.ts` had solved this exact trap already: `envDir` points at the shared `.env`, which contains `NODE_ENV=development` because the _server_ runs in development locally, and Vite honours it. The console inherited the `envDir` and not the fix. Now pinned in `apps/admin/scripts/build.ts` and guarded by `bundle.test.ts`, which opens `dist/`. |

### What is still deliberately not built

| Not yet                              | Why it is separate                                                                                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Realtime delivery                    | The backend publishes the event; SSE versus WebSocket is a choice that should follow a working request/response path rather than precede it.               |
| Inbound email                        | A prospect's reply lands in the owner's mail, not in the console. Threading it back in needs an inbound provider and a matching rule — a different system. |
| A stored reply history for prospects | The outbound mail BCCs the owner, so there is a record where they already work. A collection nothing reads is the speculative surface this repo forbids.   |

Owner decision: [x] **Built as described** (2026-08-14).

## DECISION 028 — The primary call to action creates an account before it takes a request

**Built as described** (2026-08-14). Full specification: `docs/ACCOUNT-FIRST-CAPTURE.md`.

### The problem

"Get my free website assessment" is the primary action on every page — the header, the hero,
the pricing cards, the closing banner. It pointed at `/contact#request`: seven fields, five of
them required, and **nothing written anywhere until all of them are valid**. Somebody who typed
their name and their email address and then stopped left no row, no address and no way to know
they had ever been here.

`useHeroLeadForm.ts` had already named this and deferred it:

> catching those would need an endpoint that accepts a partial lead, and inventing one that
> quietly drops half-leads into a collection nobody reads would be worse than not having it. If
> the funnel events ever show real drop-off … that is the moment to build it.

### The decision

Two stages instead of one, and the first stage produces a durable record:

```
Get my free website assessment  →  /get-my-assessment      →  /app/assessment/request
                                   email · name · password    phone · site · what · anything else
                                   ═══ ACCOUNT EXISTS ═══
                                       the capture
```

**The partial record is a `User`, not a new collection.** `features/assessment/draft.ts` refuses
an anonymous half-record on three grounds — it needs an expiry sweep, a claim mechanism, and an
answer to "what stops somebody else claiming it". An account has none of those problems: it is a
record whose owner is itself. That is the whole argument, and it is why this is not the endpoint
the comment above was worried about.

### What it costs, stated rather than hidden

Total requests will probably fall. Gating trades volume for qualification, and some fraction of
the people who would have filled in seven fields will not choose a password. What it buys is
that the ones who stop now stop _after_ leaving a name and an address, and that an abandoned
funnel is a follow-up rather than a silence.

Four mitigations are built rather than hoped for: Google sign-in makes the account one click;
the form is three steps of one question with the count on screen; `/contact` is unchanged, still
in the footer and linked from the new page; and `/audit` stays completely free and account-free —
its own page metadata promises "no email address required" and that promise is kept.

Reversible in one line: `site.cta.primary.to` in `content/site.ts`.

### 028.1 The capture is only real if the owner is told

A record nobody looks at is a row. So `auth.service.ts` emails `CONTACT_NOTIFICATION_EMAIL` on
every account creation — both the password branch and the Google one — best-effort, never
failing a signup, with the address in the subject line so a phone inbox can be triaged without
opening anything.

**Every account, not only the ones from `/get-my-assessment`.** Sign-up is one endpoint reached
from four places, and which page somebody was on is a browser-side fact. Sending the notification
only when the client says so would mean trusting a claim in a request body to decide whether the
owner hears about a prospect. At this volume every account is worth knowing about; if that stops
being true the answer is a digest, not a flag.

### 028.2 The console gains a call list, and the inbox does not change

`GET /api/admin/accounts` composes in `hasRequested` from one batched query, and the Accounts
table gained **Asked for** and **Signed up**. A `Nothing yet` in that column is somebody who came
for an assessment, chose a password, and stopped — the warmest lead this business gets that
nobody has spoken to.

The inbox is deliberately untouched. Its definition is everybody _waiting on a reply_, defended
at length in `conversation.service.ts`, and somebody who has not asked a question is not waiting
for an answer. A second definition of "unanswered" is the failure that feature exists to avoid.

### 028.3 Identity comes from the session, and the schema cannot be talked out of it

`POST /api/app/assessment-request` is a second router inside `/app` rather than a flag on
`/api/leads`. The public endpoint is anonymous, honeypotted and IP-limited, and everything it
knows about the sender is a claim in the body; this one is behind `requireAuth` and its schema is
a `strictObject` with **no identity fields in it at all**, so a body carrying `name` or `email`
is a malformed request rather than a field that gets quietly ignored.

One handler serving both would have put the most security-relevant `if` in the codebase inside a
route nobody reads twice. `billing.customer.routes.ts` is the same shape for the same reason.

### What this found on the way

| Defect                                                                                                                                                                                                                                                                                                                                                                                          | Found by                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **The server never loaded the repository's `.env`.** `dotenv` was given `['.env', '../.env']`, correct when the server was at `server/` and pointing at a nonexistent `apps/.env` since DECISION 026. Signing in to the console answered "We cannot reach our records right now" with a correct password and a healthy Atlas cluster. `create-admin.ts` and `stripe-setup.ts` had the same bug. | Reading the failing path rather than the message. Now three paths, with a regression test asserting the property rather than the list. |
| **Neither app's CSP allowed Google Fonts.** `index.html` loads Archivo on both origins; `style-src` and `font-src` permitted neither, so the brand typeface silently never arrived in production and both apps rendered in the system fallback.                                                                                                                                                 | Adding the same font link to the console and checking what would block it.                                                             |
| The `finish-request` action outranked a completed assessment, sending a customer who was ready to buy back to a contact form.                                                                                                                                                                                                                                                                   | `lifecycle.api.test.ts`, by name. The branch now requires _both_ no request and no assessment.                                         |
| The platform test harness let the app resolve its own `LeadService`, which meant a Mongo repository with no connection — seven tests about sessions and password hashes answered 503 the moment the dashboard started reading leads.                                                                                                                                                            | The suite, immediately. The harness now injects the in-memory one, as it already did for `authRepository`.                             |

Owner decision: [x] **Built as described** (2026-08-14).

---

## DECISION 029 — The design system gains a state layer, and §7 becomes an inventory

**Built as described** (2026-08-15). Full specification: `03_plan/ux_completeness_plan.md`.

### The problem

`docs/design-system.md` §7 said the application "contains no modal, dialog, tooltip, popover,
switch or avatar", that adding them "would ship dead CSS on every visit", and that "a primitive
is added when the second usage appears, not before". Composition rule 6 generalised it: no
speculative surface, anywhere.

Both sentences were true and both were written about a fifteen-route marketing site. The
repository is now three surfaces — a marketing site, a customer project portal and an owner
console — and a state audit found twelve high-severity gaps, four of them in the console alone.
Several of the states a portal has to express have no shape in the system to be expressed in, so
each screen invented one: **thirteen bespoke outcome-message treatments across eleven files**,
differing in a border, a tint, and — the part that mattered — in whether they carried an ARIA
role at all.

### The decision

Eight primitives are added: `Table`, `Tabs`, `Modal`, `Drawer`, `Toast`, `Tooltip`, `Switch`,
`Avatar`. Two replace code that already existed twice over. **Six have no consumer on the day
they land**, and that is the part of this decision that needed defending.

Rule 6 is **amended rather than deleted**:

> **No speculative surface in an eager bundle.** A design-system primitive may precede its
> consumer; an eager one may not precede its budget. Everything else rule 6 forbade — an
> exported function with no caller, a prop nothing passes, a token for a component that does
> not exist — still stands.

**§7 becomes an inventory.** It stops listing what the system does not have and starts listing
what it has, why each was built, and what is still deliberately absent — Popover, Accordion,
Menu, Combobox, DatePicker, Pagination — each with the call-site count that would justify it.

### The premise this was argued on turned out to be wrong

Recorded here rather than quietly fixed, because it is the more useful half of the decision.

The amendment above assumes an unused export in `@jobforge/ui` is weight every visitor
downloads, since that barrel is eager. **It is not.** Measured after `Modal` and `Drawer`
landed: the eager bundle did not move by a single byte, and `aria-modal` appears in no chunk in
`dist` at all. Rollup drops a barrel export nothing imports, and the CSS module goes with it
because its import lives inside the dropped file.

So the payload objection — the one §7 was built on and the one this decision spent a budget
raise to answer — does not apply to a tree-shakeable module. The eager ceiling did have to rise
from 112.0 / 18.0 to 120.0 / 20.0, but **the six bought none of it**: that was the delayed route
fallback, three skip links, `Table` and `Tabs`, and a ceiling the previous raise had left with
0.6 kB of headroom.

What survives of rule 6 here is the part worth keeping, and it is not about bytes: an unused
component is untested against real use, and every one is a maintenance obligation that starts
the day it lands. That is why the six carry unusually thorough tests — the focus trap, the
Escape key, the returned focus, the paused timer, the resolvable description — rather than
unusually thorough arguments.

### What it cost, stated rather than hidden

The eager CSS ceiling rose from 112.0 / 18.0 to **120.0 / 20.0**, the largest raise
`check-budget.ts` has recorded. Measured after everything landed: **112.7 raw / 18.2 gzipped**,
which is 7.3 kB of headroom left rather than the ~1.4 kB the plan projected.

Also spent: four semantic tokens. Three z-index layers `tokens.css` had already named in a
comment — "a dropdown belongs at 30, a modal at 50, a toast at 60" — and `--color-scrim`, added
with the two components that use it because the token guard correctly refused two
`rgb(23 25 30 / 55%)` literals and `design-system.md` §9 says a colour becomes a token rather
than an exception.

Given back in the same pass: thirteen bespoke message classes across five stylesheets, replaced
by one `Notice` per application, and six hand-rolled data-loading state machines onto the
`useResource` that already existed for exactly that reason.

### What this does not change

The two frontends still never import each other. `components/` still never imports `features/`.
Appearance is still duplicated between the customer application and the console and behaviour is
still shared — DECISION 027's rule, applied unchanged to `Notice`, `InlineConfirm`, the offline
notice and the live region. The server is still the only security boundary.

Owner decision: [x] **Build the full set** (2026-08-15).

---

## DECISION 030 — Answer the browser, not the roadmap (2026-08-16)

**Status: decided and executed.** `03_plan/deferred_work_plan.md` holds the full record; this
is what a reader arriving in six months needs to know.

### The question

Two completed plans each finished by listing what they had chosen not to build. Eight items were
on those lists — dark mode, `forced-colors`, print beyond the workbook, RTL and i18n, pagination
controls, in-place re-auth, the in-app unsaved-changes guard, and E5's mega-stylesheets — and
every one of them was refused for a stated reason at the time.

Six of the eight look like exactly what composition rule 6 forbids: **no speculative surface in
an eager bundle**. Nobody has asked this business for a dark theme. No Greater Seattle HVAC
contractor has requested Arabic. Not one log line records a visitor in Windows High Contrast
Mode. A second palette lands in `tokens.css`, the eagerest file in the repository.

### The decision, and the line it draws

Rule 6 is about **surface** — API that exists so somebody might one day call it. These are not
surface. They are **answers to questions the browser is already asking.**

`prefers-color-scheme: dark` arrives on a large share of every page load this site has ever
served. `forced-colors: active` arrives from every reader in high-contrast mode. `print` is one
keystroke away on every page. A light-only, screen-only page is not the _absence_ of a
speculative feature — it is a **wrong answer to a question that was asked**.

So:

> **Build the response to signals the browser already sends. Do not build the machinery for
> signals nothing sends.**

That line decides all eight, including the two it refuses:

|                                                    | Verdict                                                                                                                                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dark mode, `forced-colors`, print                  | **Built.** The signal arrives today.                                                                                                                                                                                                                                                 |
| RTL                                                | **The spelling, not the feature.** `padding-inline-start` is the same declaration correctly spelled; it is not surface at all. Enforced by `tokens.test.ts` rule 7.                                                                                                                  |
| i18n message catalogue                             | **Not built.** No second locale exists and one would have to be _invented_ — picking a language and writing sales copy for it is a product act wearing engineering clothes. What _was_ built is `Intl` formatting, which fixes two live bugs rather than preparing for a hypothesis. |
| Pagination, in-place re-auth, the navigation guard | **Built.** Not browser signals — real events with bad current answers.                                                                                                                                                                                                               |
| E5                                                 | **One split, measured, then stopped.** See below.                                                                                                                                                                                                                                    |

### The three measurements that changed a decision

1. **The data router costs 16.6 kB gzipped.** `useBlocker` is the supported way to stop an
   in-app navigation discarding a form, and it needs `createBrowserRouter`. Migrating moved
   eager JS from 537.9 to **591.9 kB raw / 180.0 gzipped** — the whole data layer, none of
   which this application uses. `check-budget.ts` refused the build and refusing it was right.
   The capability ships anyway, as a capture-phase click listener in `useUnsavedChanges`, for
   **1.1 kB**. Full numbers in `apps/client/src/app/App.tsx`.

2. **Splitting a stylesheet made it smaller.** E5 was blocked across two plans on the argument
   that splitting can _increase_ total CSS through duplication. Splitting `YearOneEconomics` out
   of `Pricing.module.css` moved eager CSS 118.4 → **118.3 kB raw**, gzipped unchanged, because
   the split found a **dead rule the guards cannot see**: `content.test.ts` matches a class
   _name_ against the source, so a rule shadowed by an identically-named class in another
   stylesheet counts as live. Two instances found in one seam. E5 stops there, and the next
   step is the guard rather than the next split.

3. **The second palette found a defect in the first.** `tokens.test.ts` computes AA over both
   palettes for every foreground/background pair any stylesheet states together. The first run
   failed on `--color-ink` over `--color-ink-inverse` at **1.00:1** — a chip that worked only
   because cream happens to be both "text on a dark band" and "the page ground" in light. A
   single-palette design cannot tell the right token from a token that happens to hold the right
   value.

### What it cost

Eager JS **534.9 → 539.0 kB raw / 162.4 → 163.7 gzipped** (ceiling 545 / 164, **not raised**).
Eager CSS **112.7 → 118.3 / 18.2 → 19.2** (ceiling 120 / 20, **not raised**). Tests **1,243 →
1,279** across **79 → 84** files. Zero lint errors, zero warnings.

Three new build-failing guards: `tokens.test.ts` rule 7 (no side hard-coded on the inline axis),
rule 8 (system colours only inside a `forced-colors` block), and `scripts/check-csp.ts`, which
recomputes the inline theme bootstrap's `sha256-` from the built HTML and fails when it has
drifted from the policy in `vercel.json` — a failure that is otherwise invisible everywhere
except production.

### What this does not change

The two frontends still never import each other. `components/` still never imports `features/`.
The server is still the only security boundary. Appearance is still duplicated between the two
applications and behaviour still shared — DECISION 026's line, applied again to `useTheme`,
`useUnsavedChanges`, both `ThemeControl`s, both `ReauthDialog`s and both `LeaveGuard`s.

Owner decision: [x] **Do all eight** (2026-08-16).

---

## DECISION 031 — A second door, with no offer painted on it (2026-08-16)

**Status: decided and executed.** `03_plan/header_account_entry_plan.md` holds the full record —
fifteen closed questions and the alternatives each of them shut off. This is what a reader
arriving in six months needs to know.

### The question

DECISION 028 pointed every primary call to action at `/get-my-assessment` on the argument that
an account is a record that owns itself, so the account **is** the lead capture. That decision
stands, entirely, and nothing in this one touches it.

What it left behind is that the site's only visible way to make an account has an offer painted
on it. The header carried `Sign in` and nothing beside it, and the only account-creating control
anywhere said **Get my free website assessment**. A person who does not want an assessment — a
current customer setting up access, somebody comparing vendors — reads that button as not for
them, correctly, and then has nowhere to go.

`content.test.ts` justified `/signup` as _"linked from the header and from the sign-in page"_ for
the whole of that period. The second half was true. The first half never was.

### The decision

Two doors, because there are two intents and neither is wrong:

| Intent                               | Door                        | Frame                                           |
| ------------------------------------ | --------------------------- | ----------------------------------------------- |
| "Tell me what is wrong with my site" | `Get my assessment` — ember | The offer. Free, two minutes, four questions.   |
| "I want an account"                  | `Create an account` — text  | The account. What it holds, then what it costs. |

The second is a quiet text link in the utility strip beside `Sign in`, separated by a rule,
built a second time in the collapsed menu because the strip does not exist below `64rem`, and a
third time in the footer — one entry, which is the one surface that carries it at every width
with no click. **Neither half of the pair wears the accent.** Ember is still rationed to one
action per screen, and `Header.test.tsx` now fails the build on both halves rather than one.

Three smaller things travel with it, each of which was a gap the pair made visible:

1. **A way out.** The only `Sign out` in this application was inside `AppLayout`, so a signed-in
   customer on the marketing site had to navigate _into_ their private workspace in order to
   leave it. It sits beside `Dashboard` now, and — unlike `AppLayout`'s — it does **not**
   navigate. The page is public and stays readable; the strip flipping back is the confirmation.
2. **An address that arrived answered is not asked for again.** `CredentialForm` read `?email=`
   and then showed the visitor their own address under a `Continue` button. It opens on step two
   instead, gated on `validateField` — the same function `Continue` runs.
3. **`/signup` says what the account is for.** Its lede answered a pricing objection, which was
   right while every visitor arrived from a page full of prices. The answer leads now and the
   reassurance follows, word for word.

### What was refused, and why

- **An inline email field in the strip**, and **a dropdown carrying the Google button**. Both
  are the more literal reading of "quick create account". The first puts a form in a 30px
  utility strip; the second drags `GoogleSignInButton` out of the lazy auth chunk and into every
  page load. A `Modal` was refused on the same grounds — its first consumer was measured at
  1.4 kB eager JS and 1.3 kB CSS, against 0.3 kB of gzipped JS headroom.
- **Pointing the link at `/get-my-assessment`.** It would promise an account and deliver an
  offer pitch, which is the exact bait-and-switch DECISION 028 built a separate route to avoid.
- **`Sign up` as the label.** It differs by one letter from the control immediately beside it.
  The phrase is `Create an account`, which is `CredentialForm`'s four-file rule for a link.
- **Collapsing the sign-up form to two steps.** The three-step split was measured; skipping a
  step somebody has already answered is not the same act as removing one they have not.
- **Sign out in `WorkspaceBar`.** It is hidden inside `/app`, which is where a customer sits
  longest.

### What this narrows

`content.test.ts` refused account links in the footer, in writing: _"a footer full of account
links on a marketing page is navigation nobody asked for."_ That still holds for a **column** of
them and there is not one. `site.footerNav` is unchanged, which matters because that list also
drives `sitemap.xml` and both credential routes are `noindex`. What changed is one entry outside
that list, for a reason that was not available when the note was written: the header pair is
invisible below `64rem` unless a menu is opened.

### What it cost

Eager JS **539.0 → 540.1 kB raw / 163.7 → 163.8 gzipped**. Eager CSS **118.3 → 118.8 raw /
19.2 gzipped, unchanged**. Tests **1,279 → 1,292** across **84 → 85** files.

**Neither ceiling was raised, and one of them should be.** The change fits — 545 / 164 and
120 / 20 both hold — but it fits with **0.2 kB of gzipped JS to spare**, and
`check-budget.ts`'s own raise note from three days earlier says of a 0.6 kB margin that "0.6 kB
is not a budget". 0.2 kB is less than that. Nothing was raised here because the decision taken
was to raise only if the change did not fit, and it did; the number is recorded so that the next
person to add a line to an eager component knows what they are working against, and so that the
next raise is a deliberate act rather than a build failure on a comment.

### What this does not change

`primaryCta` still reads `Get my free website assessment` and still lands on
`/get-my-assessment`, whose frame, lede, escape hatches and three analytics events are untouched.
`/audit` is still ungated. `/contact` is still ungated. The three signup steps still exist. **No
server file was modified** — this is entry points and copy, and the endpoints they reach already
existed.

Owner decision: [x] **Build the pair** (2026-08-16).

---

## DECISION 032 — The portal delivers, it does not only display — ANSWERED: build the deliverables

**Answered 2026-08-16.** Phase 5 of `03_plan/mvp_closure_plan.md`.

**What was wrong.** The customer portal _displayed_. It showed a milestone, a score somebody had
given themselves, and a payment history. Every actual deliverable — the review of their website,
the monthly report, the date it would be finished — happened in an email or a phone call and left
no trace in the system that sold it.

The sharpest version of that: **the primary call to action on every marketing page is "Get my
free website assessment", and the thing it promises had no representation in the application at
all.** A visitor answered twenty questions, the machine scored them, and the portal showed that
score as though it were the deliverable. The owner's actual review lived in an inbox. There was
no queue, no record of whether one had ever been written, and no way for the customer to tell
whether they had been forgotten.

**What was built.** Three deliverables, and one rule shared by two of them.

1. **The assessment review.** `summary`, `findings[]` with a severity, `recommendations[]`, a
   byline and a delivery date. A console queue of everybody waiting, oldest first, with the
   editor on the same screen as the list — because writing one is the only thing anybody comes
   to that screen to do.
2. **The Website Performance Report.** `features/reports`. DECISION 015 sells it as a monthly
   operational commitment and nothing measured it; a commitment nothing measures is one that
   quietly stops. It has an overdue check, and the customer gets a permanent Reports screen —
   the sixth item in a navigation whose comment says it is short on purpose, which it earned by
   being a _purchase_ rather than a feature.
3. **The estimated launch date.** Three fields, its own domain operation, and one rule that is
   the whole reason it is not a seventh field on the edit form.

**The rule shared by the first two: draft and published are different states, and only one is
visible.** In both, the draft is **absent from the customer's payload** rather than hidden behind
a flag the client is asked to respect — so the only way a half-written review could reach
somebody is if a person published it. Saving and publishing are two buttons, because a flag on a
save is a checkbox somebody ticks by accident on the eighth revision and the thing on the other
side of it is an email that cannot be recalled.

**The rule the third one turns on: a date that moves silently is worse than no date.** Setting a
first estimate is quiet — good news arriving, which they will see the moment they open the
portal. _Moving_ one emails them, because a customer who finds out by noticing a different number
on a page they happened to revisit has not been told; they have been left to discover it.
Clearing it is silent too, and deliberately: "we no longer know when this will be finished" is
not a sentence to put in an automated email without a person writing the rest of it. **Absent is
a legitimate state** and renders as nothing at all, never as a placeholder date.

Owner decision: [x] Built — 2026-08-16

---

## DECISION 033 — Demo Mode is a customer, not a mode — ANSWERED: one account, one flag

**Answered 2026-08-16.** Phase 7 of `03_plan/mvp_closure_plan.md`. Full account in
`docs/DEMO-MODE.md`.

**The gap.** The product could not be shown to anybody. A prospective partner, a friend, or
somebody being sold to had three options: watch a screen share, be given a real account on the
production database, or be shown the marketing site and asked to imagine the rest. The first does
not scale, the second is a data-protection decision nobody made, and the third is what every
competitor does.

**The decision.** A private entry at `/promo`, a passcode checked on the server, and an isolated
demonstration customer whose account exercises **the real application** — not a second frontend,
not a screenshot tour, not a mocked API.

And the single decision everything else follows from: **the demo account is a customer.**
`role: 'customer'`, plus one `demo` flag on the user document. Every piece of isolation is the
ownership boundary that already existed and was already tested — `authorizeOwnership`,
`createProjectAccess`, and 404-never-403 — and not one line of it needed changing. It also makes
"no admin access, no owner functionality, no administrative APIs" true **by construction**, since
`requireAdmin` already answers `NOT_FOUND` to every customer.

**Four things were refused, and each refusal is the reasoning:**

- **A `demo` column on every collection.** Eleven repositories, and one forgotten filter is a
  leak in _either_ direction.
- **A separate database.** Mongoose binds models at module scope; per-request `useDb()` means
  changing every repository in the application to buy isolation the ownership boundary provides.
- **A second authentication system.** One session mechanism means one place expiry, rotation,
  `SameSite` and signout are implemented, and the demo inherits every one of them.
- **Stripe test mode in production.** A second client and a second set of Price ids in a process
  holding live keys. Getting that wrong charges somebody.

**The payment invariant is restated, not weakened.** Payment state moves on a verified webhook,
**or** on an explicitly demo-scoped simulation against a demo-owned project. One extra door,
named, and unreachable without the passcode. `createCustomerCheckoutSession` refuses a demo
customer on its first line, before the Price lookup and before the client is touched — which is
what makes "no live charge is possible" provable by a test rather than argued from configuration.

**The price of the decision, paid in three named places.** Demo rows are real rows, so they would
appear in the owner's own picture of the business: the project list, the accounts list and the
inbox each exclude them, and `?includeDemo=true` puts them back.

**Known limitation, recorded before it was discovered:** one demo account, shared. Two people
demonstrating at once share a dataset, and one pressing Reset is visible to the other. A
per-session account was refused because creating accounts from a public endpoint is an abuse
vector and the isolation it buys is isolation from _other demo users_, which is the least
important kind here.

**Added on the owner's request, the same day:** the banner names the testers it was set up for,
and carries a six-stop guided tour of the customer journey. Both are presentational; nothing
authorises against a name, and the tour navigates rather than intercepts — it blocks nothing,
disables nothing, and a tester who ignores it finds it still on the step they left it on.

Owner decision: [x] Built — 2026-08-16

---

## DECISION 034 — Where the owner console is served from — ANSWERED: one origin, two bundles

**Supersedes DECISION 027.4.** That decision put the console on its own Vercel project and its
own origin, and recorded — correctly, at length, in `apps/admin/DEPLOY.md` — that the console
would only hold a session if its origin were a subdomain of the API's domain. The recorded fix
was to attach a real domain to both projects.

The recorded fix is right and it is a **purchase standing between the owner and their own
console**. On `*.vercel.app` names the console cannot work at all: `SameSite=Lax` is evaluated
on the registrable domain, `vercel.app` is on the Public Suffix List, so two `*.vercel.app`
names are two _sites_ and the browser sends no cookie between them. Sign-in succeeds and the
console immediately shows the sign-in form again — no error, no failed request, a healthy
server, nothing in any log.

**The decision: serve both applications from the customer project, the console at `/admin`.**

The reason this is not a retreat is that **DECISION 027 bought two bundles, not two origins**,
and two bundles is the property that mattered:

- `apps/client` still contains no console. A visitor to the homepage downloads none of it —
  separate document, separate JavaScript, separate CSS, reached only by asking for `/admin`.
- The two frontends still import nothing from each other, in either direction, and ESLint still
  fails the build on an attempt. Not one import changed.
- The customer payload budget is unaffected, because `check-budget.ts` follows what
  `dist/index.html` references and the console is not referenced by it.

`scripts/place-console.ts` is the whole mechanism: build both, copy `apps/admin/dist` into
`apps/client/dist/admin`. The order is load-bearing and the script says so — `build:client`
empties `apps/client/dist`, so a console placed before it is deleted by the build that follows,
silently, on a deploy whose log is entirely green.

**What is given up, stated rather than hoped about.** `/admin` is guessable on the public origin
again, which is what DECISION 027 removed. That is obscurity, not security: `requireAdmin`
answers `NOT_FOUND` to every non-admin, `apps/server` is the only security boundary and re-checks
every capability against the session, and no bundle contains a secret. The console's documents
carry `noindex, nofollow` and `Referrer-Policy: no-referrer` so nothing indexes or leaks a URL.

**What was rejected:**

| Rejected                              | Why                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Buy a domain first                    | Correct eventually, and it blocks the owner from using the console they have built today                           |
| `SameSite=None` on the session cookie | `auth.cookies.ts` refused it with reasons that have not changed. Weakening a cookie to fix a hostname is backwards |
| Merge the console into `apps/client`  | Gives up the thing DECISION 027 actually bought, and puts the console in the customer's payload budget             |
| A proxy route on the customer origin  | A second place requests are authorised, which is the failure `apps/admin` having no `api/` exists to prevent       |

**Reversible, and the path is written down.** The day a real domain exists,
`admin.example.com` is a better home: a second Vercel project rooted at `apps/admin`, `base`
back to `/`, and the `/admin` rewrite deleted. `apps/admin/vercel.json` is kept for exactly that
shape and `apps/admin/DEPLOY.md` documents both.

Owner decision: [x] Built — 2026-08-17

---

## DECISION 035 — Following up on somebody who went quiet — ANSWERED: two emails, then a person

DECISION 028 made the account the lead capture: somebody who stops after the credential form
has still left a name and an address. **Nothing had ever used the address.** That was the
largest hole in the funnel, and it was invisible because the capture worked perfectly — the
records were there and nobody was written to.

**The decision: four rules, at most two emails per account, and never after they buy.**

The rules are a table in `apps/server/src/features/followup/followup.types.ts` — one screen,
meant to be argued with. Day 1 and day 4 for an account that asked for nothing; day 3 and day
10 for one that asked and did not buy. Everything is measured from the signup date, because two
clocks means two answers to "how long had this person been waiting" on the day a rule misfires.

**Two is the cap and it is enforced separately from the table.** Four rules exist and no
account can receive more than two of them — the mixed case (nudged on day 1, requests on day 2,
now in the other track) would otherwise collect three. A third automated email to somebody who
has ignored two is not persistence; it is spam with a schedule, and the address it burns is one
the business paid to acquire.

**This is marketing mail, and it is treated as such.** Every message carries a one-click
unsubscribe, the suppression is stored against the **address** rather than the account so
signing up again does not reset it, and the **digest honours the same list** — one answer to
"may we write to this person", not two.

Three mechanisms are load-bearing, and each fails silently if it is broken:

| Mechanism                                              | What it prevents                                                                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Unique `(userId, ruleKey)`, claimed **before** sending | The same sentence every morning. A check-then-write is correct until two runs overlap                     |
| An HMAC on the unsubscribe link                        | Anybody unsubscribing anybody. The victim never finds out; they experience a supplier who stopped writing |
| The suppression check before rule selection            | Emailing somebody who has said stop, which is the one failure that is also a legal one                    |

**`UNSUBSCRIBE_SECRET` unset leaves the whole feature unwired** — no cron route, no unsubscribe
route, nobody emailed. The `DEMO_PASSCODE` pattern, chosen for a sharper reason: this is the
only feature in the application that writes to somebody who did not ask to hear from us, so
switching it on should be an act rather than a default. Deliberately not `CRON_SECRET`, which
Vercel rotates on its own schedule — rotating that would invalidate every unsubscribe link
already sitting in an inbox.

**Also in this phase, and both following the same rule — own no definitions:**

- **Account messages.** A customer between projects can now write to the owner without being
  filed as a prospect. It is a comment with a second scope, not a `messages` collection, so it
  reached the console inbox without a line changing there.
- **The worklist.** `GET /api/admin/worklist` and the console's Today screen answer "what is
  going stale", which is a different question from the inbox's "who is waiting". Every group is
  a call to a method that already existed for another screen.

Owner decision: [x] Built — 2026-08-17

---

## DECISION 036 — Which palette is the site — ANSWERED: light, for everybody, and dark on request (2026-08-19)

**Superseded:** DECISION 030, in one respect only. That decision wired a measured dark palette
to `prefers-color-scheme` under the heading "answer the browser, not the roadmap". The palette
was right and it stays. The wiring was wrong and it is gone.

**The symptom.** The same URL rendered a charcoal page on a desktop in dark mode and a cream one
on an iPhone in light mode, and the owner — who had not thought of himself as having designed
two themes — could not say which one was the site. That question is the finding. A marketing
page whose owner cannot name its palette has two first impressions, and a business with one
conversion goal cannot afford the second one to be a surprise.

**What the audit found, and it was not what anybody expected.** Both palettes clear WCAG AA on
every pairing the site actually renders; the dark values are genuinely measured, not inverted;
the two dark blocks were in perfect step. The gap was not contrast. It was that **the dark
palette is a token translation and the light one is a design**:

- **Zero of ninety `.module.css` files** contain a single dark-specific rule. Every dark
  decision in the product lives in one forty-line block.
- **The structural rhythm does not survive the translation.** Cream page against charcoal band
  is 15.21:1, and it is the loudest device on the homepage — eight section bands plus the header
  and the footer. Read from the dark palette the same two tokens are **1.08:1**. The bands
  flatten into the page. No token block can fix that; it is a second composition.
- **Two colour tokens were never re-measured** for the second palette and nothing said so.
- **The guard sees 15.2% of the surface.** `tokens.test.ts` can only measure a rule that states
  a foreground and a background together: 144 of 948 colour-bearing rules. Three role-inversion
  defects had shipped through it, one of them the logo on every page.

**The decision.** The light palette — Cast Cream and Forge Charcoal — is **the site**, for every
visitor, whatever their machine is set to. The `@media (prefers-color-scheme: dark)` block is
deleted. The dark palette stays, in full, reachable through the Appearance control that already
existed in the footer and in both workspace bars.

**Why, specifically for this business rather than in general:**

1. **The buyer reads this outdoors.** Contractors, on a phone, in daylight. Positive polarity —
   dark text on a light ground — measures better for reading speed and acuity, and Piepenbrock
   et al. (2013) is the study that matters here because it set out to find the age effect and
   found the advantage holds for **older** adults too. A dark screen is at its worst under a
   bright sky. This audience is over forty and outside.
2. **Cast Cream is a quarter of the brand.** A palette that deletes it is not this site with the
   lights off.
3. **The product being sold is a light website.** The hero browser frame and all ten portfolio
   captures are screenshots of bright pages. A dark chrome around light product photography for
   a whole scroll is a sales page arguing with its own evidence.
4. **`prefers-color-scheme` is one global answer to a per-application question**, usually set
   once, at night, for a phone. Honouring it is not the same as respecting the reader — what
   accessibility guidance asks for is _user control_, and a control is what remains. WCAG
   requires no part of this either way; SC 1.4.3 asks for contrast, which both palettes have.

**What this is not.** It is not the removal of dark mode. Every dark value still exists, still
clears AA, and is two clicks away. Only the default moved — and a default is a design decision,
not a preference to be inherited from an operating system.

**What went with it:** the three-state control. _Match my system_ was the default and it has no
meaning without the media query — every value of it now resolves to light. Both applications
drop to two options in the same change. A stored `system` from before reads as `light`, which is
the palette it would now have produced anyway, so there is no migration to write.

**Four things were fixed in the same change, because the audit found them:**

| Fix                                                                        | What was wrong                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The phone bezel, the demonstration banner, and the logo tile on every band | Each painted an object with a token that means _text_, so each inverted with the palette. The logo tile hit 1.08:1 against the header and disappeared.                                                                                                                                                                                           |
| Four custom properties that were never defined                             | `--color-accent-fill`, `--color-ink-subtle`, `--container-prose`, `--container-xs`. CSS discards the whole declaration silently: the word "Demonstration" had no fill, and two elements had no measure.                                                                                                                                          |
| The light elevation set, raised ~1.7×                                      | White on cream is 1.16:1 and the hairline is 1.34:1, so the shadow is the _only_ separation — and it ran at 4% while the dark set ran at 35% to solve the same problem. This is the measurable answer to "the light one looks less finished".                                                                                                    |
| Three new build guards                                                     | One forbids `prefers-color-scheme` in `tokens.css`, so reversing this decision is deliberate. One forbids painting a surface with a text token. One fails on a custom property that is defined nowhere. A fourth asserts both palettes declare the same colours, with a named, both-ways-checked allowlist for the two that legitimately do not. |

Owner decision: [x] Built — 2026-08-19

---

## DECISION 037 — Washington sales tax is presented exclusive of the price — ANSWERED (2026-08-19)

**The law, not a preference.** Washington's ESSB 5814 took effect **1 October 2025** and moved
custom website development — including the support and consulting sold alongside it — into the
definition of a taxable retail sale. The build is taxable. The monthly service almost certainly
is. In Greater Seattle the combined rate is around 10%, which is roughly **$490 on a $4,900
build** and about **$30 a month** on Growth Partner.

**What was decided.** The published prices do not change. `$4,900` and `$299/mo` stay exactly as
they are and tax is stated separately — on the pricing page, in the terms, and calculated at
checkout by Stripe Tax.

**Why exclusive rather than inclusive.**

1. **It is what a business buyer expects.** Both prices are quoted to businesses who account for
   tax themselves, and a tax-inclusive figure is the one that makes their bookkeeping harder
   rather than easier.
2. **Inclusive pricing makes the rate a pricing decision.** The combined rate varies by delivery
   address inside the service area and changes when a jurisdiction changes it. An inclusive price
   would have to move every time, and `config/pricing.ts` is a file whose whole design is that a
   figure appears once and everything derives from it — a number that changes for reasons
   unrelated to the offer does not belong in it.
3. **Absorbing it costs a tenth of the margin** on a founding-priced build, on a rate card that
   already leads with a discount.

**The rule this establishes: a tax rate is not a price and never enters the price triangle.**
`config/pricing.ts` states _that_ tax applies and what the line reads; it states no rate and no
figure. `sanctionedFigures()` therefore does not grow, and the currency sweep in
`content.test.ts` keeps meaning what it meant. Stripe is the only thing that computes an amount,
because the amount depends on an address the site does not have until checkout.

**Still the owner's, and not blocked by this decision.** Registering with the Department of
Revenue, enabling Stripe Tax on the account, and remitting. The copy is honest the day it ships —
"plus applicable sales tax" is true whether or not collection is switched on — but collecting
without being registered is not an option, and the liability has been accruing since October 2025
either way.

---

## DECISION 038 — The tagline leads with the category noun — ANSWERED (2026-08-19)

**Modifies the reasoning recorded in `content/site.ts`**, which argued that the outcome should
lead and the mechanism explain. That argument was right about the general case and is overtaken
by a specific fact.

**The fact.** `getjobforge.com` is field-service-management software sold to "electricians,
plumbers, HVAC technicians, and contractors", launching Q1 2026 — the same trades, the same
metro-scale buyer, a different product. Three other products called JobForge also exist.

**Why that changes the calculation.** The misread this site was written to avoid was _job board_.
That one is close to harmless: it is implausible to a tradesperson reading a page about websites,
and it self-corrects within a sentence. The misread that actually costs money is **job-management
software**, and it is dangerous for the opposite reason — it is entirely plausible, it is what a
competitor with a nearly identical name genuinely sells to this exact audience, and a plausible
misread never self-corrects. The reader does not discover they were wrong; they conclude the site
is not for them and leave.

**What was decided.** The tagline becomes **"Websites that ask for the job."**

- **"Websites" leads**, and that is the whole point: naming the category in the first word is the
  cheapest available defence against being filed as software.
- **"ask for the job"** names the mechanism — a page with one obvious next step on it — and
  claims no result. It is what the site _does_, not what the buyer _gets_.
- It does not promise booked work. The distinction the previous rationale drew is preserved
  intact: `conversion` still marks "Books the work" as the client's, and this line still stops
  where that boundary does. Asking is the website's job. Answering the phone is theirs.

**What was rejected, and recorded so it is not revived.** _"We build software to help
service-based businesses get more jobs."_ It contains **software**, contains **jobs**, and omits
**website** — it is, almost word for word, the competitor's own positioning, and it is the single
most damaging sentence available to this business. It must not appear in copy, in metadata, in an
advertisement, or in a pitch.

**Unchanged: the hero headline.** _"More of the people already finding you should be calling
you."_ It survived every candidate tested. Its comparative modifies traffic the business already
has rather than its revenue, and its mood is normative rather than predictive — which is why it
says something strong without promising anything.

**Not resolved by this decision.** The trademark and search-discoverability exposure. Copy can
defend a name; it cannot clear one. A USPTO and Washington State search should happen before any
further brand spend.

---

## DECISION 039 — Analytics is cookieless, build-time gated, and shows no consent banner — ANSWERED (2026-08-19)

**The problem.** `lib/analytics.ts` declares a 36-event funnel taxonomy, and every call site
fires into `window.dataLayer` — which nothing creates. Every number in the conversion report is
therefore unmeasurable, including the ones the site was restructured to produce.

**What was decided.** A cookieless, privacy-preserving provider (Plausible or Fathom shape),
loaded only when configured, with no consent banner.

**Why cookieless rather than GA4.**

1. **The privacy page is a published promise and it is currently true.** Analytics that sets no
   cookie and collects no personal data lets that page keep saying something close to what it
   says now. GA4 would require rewriting it into the standard document nobody reads, which is a
   real cost on a site whose whole position is that it publishes what others hide.
2. **The payload budget.** Roughly 0.4 kB gzipped of eager JS headroom. A cookieless script is
   about 1 kB and loads externally; GA4's is an order of magnitude larger.
3. **No banner is needed** when there is nothing to consent to — which avoids putting an
   interstitial in front of the first screen of a site whose primary metric is what happens on it.

**Build-time gated, and the precedent is deliberate.** Unset means _nothing loads at all_ — no
script tag, no CSP entry in use, no events leaving the browser — exactly as `DEMO_PASSCODE` unset
leaves `/api/demo` unmounted and `UNSUBSCRIBE_SECRET` unset leaves follow-up entirely unwired.
The feature cannot be half-on, and the privacy copy is generated from the same configuration, so
the page cannot describe a build it is not part of.

**The event names do not change.** Renaming an event is the one thing `lib/analytics.ts` warns
against in its own header, because a name is what a report is grouped by six months later. The
taxonomy ships as written.

**Still the owner's.** Creating the account, and accepting the roughly $9 a month. Until then the
sink stays unconfigured and the site behaves exactly as it does today.

---

## DECISION 040 — Scope acceptance is a product record, and it gates the deposit — ANSWERED (2026-08-19)

**The contradiction this resolves.** `docs/business-offer.md` rule #35 says scope is agreed in
writing before any payment. `/app/billing` offers a self-serve deposit button to any customer
with an unpaid project. Both are live. One of them is wrong, and the research is clear that
removing the self-serve path would be the wrong one to fix — a buyer who has decided should not
have to wait for an email.

**What was decided.** The written agreement becomes a **record in the product** rather than a
habit outside it. The owner composes and sends a scope from the console; the customer reads and
accepts it in the portal; acceptance stores who accepted, when, and **which version**.
`available.deposit` is gated on an accepted scope.

**Why acceptance is the presence of a date.** The same shape as `report.deliveredAt` and
`publishedAt`, and for the same reason: a nullable timestamp cannot disagree with a boolean
beside it, because there is no boolean beside it. An unaccepted scope is one with no
`acceptedAt`, and the deposit is not offered — which is a fact about the payload, not a control
the client is asked to leave alone.

**Sending a new version withdraws acceptance.** Otherwise "you accepted this" points at a
document that has since changed, which is precisely the sentence a scope record exists to make
defensible.

**What this does not do.** It does not make the deposit harder to pay for a client who has agreed
something — it makes agreeing something a thing they can do in ninety seconds instead of a thread.
Rule #35 stops being aspirational and starts being enforced by the server.

---

## DECISION 041 — Owner-sent payments become Stripe Invoices — ANSWERED (2026-08-19)

**The defect.** A Checkout Session expires after 24 hours. A payment link sent on a Friday
afternoon is dead before Monday, and the client's only symptom is a page telling them the link
has expired — for a payment they were trying to make.

**What was decided.** Owner-initiated payments are **Stripe Invoices**: a permanent hosted URL, a
PDF, a due date, and Stripe's own reminder schedule. Self-serve Checkout at `/app/billing` is
unchanged and stays the path for a customer paying under their own initiative.

**Why invoices are better here than a re-mint button.**

1. **The link stops expiring**, which is the actual defect rather than a symptom of it.
2. **The client gets a document.** A business buying a $4,900 asset has a bookkeeper who wants an
   invoice, and a Checkout receipt is not one. This is a real gap in the product, not a
   technicality.
3. **Reminders exist without anybody writing them**, which removes the most tedious part of
   chasing a balance from the owner's week.

**Two rules carried over unchanged.** The demo customer is refused on the **first line**, before
any Price lookup and before the Stripe client is touched, exactly as both Checkout creators do —
that is what makes "no live charge is possible in the demonstration" provable by a test rather
than argued from configuration. And invoice webhooks go through the same claim → interpret →
mark → release idempotency as every other event, because Stripe delivers at least once.

---

## DECISION 042 — The Website Blueprint is a separate tool at `/blueprint` — ANSWERED (2026-08-19)

**The naming problem first, because it is the one that would have caused the damage.** Five
things in this repository are already called _assessment_: the marketing offer ("free website
assessment"), the `/audit` Website Score, `features/private/assessment`, the server's
`features/assessments`, and the console's assessment queue. The new tool is a **Blueprint**
everywhere — in the route, in the copy, in the code, and in conversation.

**What it is.** Twelve questions about somebody's _business_ — trade, service area, how customers
find them, what they want more of — producing a personalised plan for what their website should
do. **No technical questions.** It works for somebody who has no website at all, which is the
population `/audit` cannot serve.

**Why a separate route rather than replacing or extending `/audit`.** They answer different
questions for different people. `/audit` scores a site that exists, against twenty checks, for
somebody who suspects theirs is underperforming. The Blueprint plans a site for a business, for
somebody deciding what they need. Merging them produces a thirty-two-question flow before anybody
sees a result; replacing `/audit` deletes a working funnel, its content and its events to solve a
problem it does not have.

**The result is shown free, and the account keeps it.** The same exchange `/audit` already makes,
in the same order: value first, then the ask. The draft lives in `sessionStorage` until a session
exists, so nothing anonymous is ever written to the database — which is what makes the privacy
copy about it true rather than reassuring.

**§32 of the brief, enforced structurally rather than by wording.** A Blueprint built from twelve
business answers cannot say _anything_ about the reader's actual website, and hedged phrasing is
not a sufficient guard because readers do not parse hedges. So the output has **two visually
distinct, separately headed sections**: "Based on what you told us", and "What we would need to
look at your site to say". The second is the handoff to the human assessment. A test asserts no
answer-derived recommendation can appear in it.

**One optional money question**, banded, asking typical job value only. Enough to make the plan
specific; never presented as a prediction of what the reader will earn. Enquiry counts, close
rates and revenue stay out — they belong to the human assessment request, where somebody has
already committed.

**The rules are data, not components.** `content/blueprint.ts` holds the questions and
`features/public/blueprint/rules/` holds the mapping, so a sixth trade or a new recommendation is
an entry rather than a branch inside JSX. §50 of the brief asked for this specifically, and the
failure it prevents is a component that knows Seattle HVAC pricing.

---

## DECISION 043 — One narrative: category, Blueprint-first, and the plan that leads to the offer — ANSWERED (2026-08-20)

**Modifies DECISION 038 (the tagline) and DECISION 028's destination.** Neither is reversed;
both are refined by facts that were not available when they were taken.

### The tagline was wrong, and it was wrong in an instructive way

DECISION 038 chose **"Websites that ask for the job."** on the correct reasoning that the
category noun has to lead. The noun did lead. The rest of the line was the problem.

It put **the single most contested word in this brand's landscape into the promise.** "Job"
already appears in the business name, in the competitor's name, and in the competitor's entire
category — [getjobforge.com](https://getjobforge.com/) is live today as _"JobForge — Coming
Soon | Field Service Management Software"_ for "electricians, plumbers, HVAC technicians, and
contractors". Adding a fourth use of the word in the one line meant to disambiguate makes the
misfiling **easier**, not harder.

It also does not survive being read cold. "Ask for the job" is borrowed from sales — _ask for
the close_ — and next to a name like JobForge it reads as a website applying for work, which is
the job-board misreading the line existed to prevent.

**Replaced with "Websites that turn visitors into calls."** — 38 characters, category first,
outcome second, and no contested word in it.

### Why "calls" and not "customers" or "jobs"

Both of those sit on the far side of a boundary this site spends an entire section drawing.
`conversion` runs the funnel through to the invoice and marks "Books the work" as
`owner: 'business'`; `conversion.handoff` says outright that what you charge, whether you have
capacity and whether somebody picks up are the client's.

A **call** is the last thing on the website's side of that line. It is what the work can
honestly claim to affect, it is the word this market uses, and it is already the outcome named
everywhere else on the site. Quote requests are the other half and live in supporting copy —
a tagline is a compression, and 38 characters a roofer reads correctly at a glance beats 60
that are complete.

### The category is websites, not software

The strongest argument against "software" is not that it overstates the product, though it
does — the commercial product today is a website project. It is that **category is the mental
box a buyer files you in**, and the software box already contains Jobber, ServiceTitan, and a
company with this company's exact name launching into it. Choosing it means being invisible in
a category this business does not compete in, under a name somebody else is about to spend
money on.

`Customer-conversion websites for local service businesses` is the eyebrow now. It is the
category, it is accurate, and nothing else in that box is called JobForge.

### The primary call to action is the Blueprint

**Modifies DECISION 028's destination, not its principle.** That decision moved every primary
action to `/get-my-assessment` because the account _is_ the capture and one field beats seven.
Both halves stand; `/get-my-assessment` is untouched, indexed, in the footer, and is where the
Blueprint's own result hands off.

What changed is that something now exists with a **lower** first commitment than an email
address and a far better claim to being the product demonstration. Interactive tools convert at
6.2–8.3% against 3.8% for gated static offers, and assessment tools in professional services
land at 7–10%. They produce _fewer_ raw leads and convert them to qualified opportunities at a
materially higher rate — which is the right trade for a business that takes one build at a
time.

DECISION 028's own words were "the first conversion should never be 'decide whether to spend
$4,900'". The Blueprint is a smaller first step than the one that decision settled on, and it
ends by showing the reader the thing being sold, worked through against their own business.
The capture is not lost. It moves to the moment it is worth most.

### Two questions were being asked and ignored

**No rule matched on `trade`, and none on `jobValue`.** Question one — the answer that most
decides whether a reader believes the tool is about them — had no effect on the plan. Neither
did the one question people are most reluctant to answer.

Every test passed. The result looked personalised. Along those two axes it was not.

Fixed by grouping trades **by how the work is bought** rather than by trade (break-fix,
considered property work, recurring visible work, appearance, personal outcome, logistics), so
a new trade is an entry rather than a rule; and by making banded job value drive _priority_ —
low value is a routing problem, high value is a shortlisting problem — rather than appending a
sentence.

**A guard now fails the build if any question stops changing the answer.** It holds every other
answer fixed, sweeps one question's choices, and fails by name if two different answers can
never produce two different plans. It cannot be satisfied by a rule that merely mentions the
field.

### The Blueprint result now leads to the offer

It ended by offering a _free assessment_ — somebody who had just described their business and
been shown what their website should do was offered another free thing. A funnel with no floor,
at the highest-intent moment this site produces.

The offer block sits **after** the honest half, deliberately: the reader is told plainly that
nobody has looked at their site, and only then is the build offered. That order is what makes
the offer credible instead of making the recommendations read as sales copy. It is conditional
in its own words — _"if you want it built"_ — and it ends with the way out stated as plainly as
the way in.

### What was deliberately not changed

- **The hero headline.** "More of the people already finding you should be calling you" beat
  every candidate tested and is normative rather than predictive. The eyebrow now carries the
  category, which frees the headline to stay pure outcome.
- **The meta title.** "Turn website visitors into calls — Seattle service businesses" was
  already the strategy this decision arrived at independently.
- **The 50/50 payment architecture, the scope gate, the terms, and the analytics model.** All
  four were audited against current guidance and none needed changing. Only the explanatory
  copy around the final payment did.
