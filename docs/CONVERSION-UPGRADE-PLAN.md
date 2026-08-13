# Conversion / revenue positioning upgrade

**Created:** 2026-08-10
**Baseline:** 314 tests, 22 files, green.
**Finished:** all eleven phases. `npm run verify` green, **436 tests / 30 files, 17 pages
built.** Phases 1–9 landed at 402 tests / 28 files; the adversarial review that followed
took it to 413; Phase 11 removed a page and its tests, then added the value-per-second
guards and the motion audit.
**Goal:** the site sells the business outcome — more of the demand you already generate,
captured — rather than website deliverables. The website is the vehicle.

`docs/business-offer.md` remains authoritative on every commercial fact. Nothing in this
plan changes a price, a term, a guarantee or a scope quantity.

---

## 1. What the survey found

Seven read-only agents mapped every subsystem. The findings that shaped this plan:

| #   | Finding                                                                                                                                                                                                                      | Consequence for the plan                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `offer.ts → management.categories` is **dead content** — zero render sites. `ManagementSection` renders `growth.ts → managementCategories` instead.                                                                          | Delete it. Free consolidation.                                                                                                                                   |
| 2   | The recurring service is argued in **five** places: `ManagementSection`, `GrowthSection`, `offerStack.handsoff`, `systemComponents` 05–10, `launch.steps.managed`.                                                           | Consolidate to one anchor section; move depth to `/services`.                                                                                                    |
| 3   | `scorecard.storageNote` promises _"Your answers stay in this browser and are never sent anywhere"_, rendered and pinned by `PlayBookAssessment.test.tsx:235`.                                                                | **The audit cannot be bolted onto `/playbook`.** It gets its own route and its own consent line.                                                                 |
| 4   | `PlayBookPage.test.tsx` pins exactly 1 textbox, exactly 20 `role=group`, exactly 60 radios, zero `<details>`, and **no `\d+\s?%` anywhere in rendered text**.                                                                | A separate `/audit` route avoids all five. Percentages are legal there.                                                                                          |
| 5   | `POST /api/leads` already accepts name, businessName, email, phone, website and a 2000-char `message` that is **not** whitespace-collapsed, and `lead.email.ts` already renders that row through `escapeHtmlWithLineBreaks`. | Audit submits through the existing lead contract. **Zero server files change.**                                                                                  |
| 6   | `content.test.ts:342` sweeps every string in the content barrel for `/\$[\d,]+(?:\.\d{2})?(?:\/mo)?/` and fails on anything outside the five sanctioned prices.                                                              | **No literal currency in the content layer.** The scenario computes from the visitor's own inputs at runtime. LocaliQ CPL figures are unusable and are not used. |
| 7   | The percentage bans are scoped to `demos.items` and `abTesting` only — there is no global percentage sweep.                                                                                                                  | LocaliQ conversion percentages are legal on industry pages and in the audit, with labelling.                                                                     |
| 8   | `HomePage.test.tsx:69-86` pins the document order of six regions.                                                                                                                                                            | The order is being changed deliberately. The test is updated with a comment recording the new argument, not deleted.                                             |
| 9   | `content.test.ts:49-54` hard-asserts `isDemo === true` for every portfolio project; the `demoUrl` guard is currently vacuous.                                                                                                | `demoUrl` can be added. The guard is now non-vacuous: `https`, no placeholder, and not a path on this site.                                                      |
| 10  | `vercel.json:18` CSP is `script-src 'self'` — no third-party scripts. `legal.ts` truthfully states no analytics provider exists.                                                                                             | Analytics stays a seam. New events are declared, not activated.                                                                                                  |

---

## 2. Blocked — needs the owner, not the codebase

These were requested and **cannot be honestly produced in code**. Architecture is built;
the content is left for real inputs.

| Asset                                         | Why blocked                                                                                                                                                                                      | What this plan does instead                                                                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live clickable demo URLs                      | No demo sites are deployed. `portfolio.ts` documents that `demoUrl` is absent until one is live. Inventing URLs ships dead links.                                                                | Adds the `demoUrl` rendering path and a hard Demo/Client distinction, so adding a URL later is a one-line edit per project.                                       |
| This site's own measured numbers              | No analytics provider is configured and the CSP blocks one. There is no data.                                                                                                                    | Declares the events. No fabricated numbers, no empty section.                                                                                                     |
| Public teardowns of **real named** businesses | Requires analysing real sites and publishing criticism of named third parties. Fabricating one would be both invented content and potentially defamatory.                                        | Built: `/website-teardown`, six findings on one **composite, explicitly-labelled** first screen that names no business at all. Real teardowns are authored later. |
| "Redacted" sample free review                 | "Redacted" implies a real client review exists. There are no clients.                                                                                                                            | Built: an **illustrative outline** of the six sections the review contains, on the teardown page. A test bans the word "redact" from that content.                |
| Per-trade cost-per-lead figures               | LocaliQ publishes them beside the conversion rates. The currency guard fails the build on them, and comparing a monthly fee to a cost per lead nobody controls is an argument that helps nobody. | Publishes the conversion rates only, verbatim, labelled — and records the reasoning in `content/industries.ts` so nobody adds the money column later.             |

---

## 3. Target homepage narrative

Eight questions, in order. Depth moves to `/services`.

| #   | Question                                 | Section                                                       |
| --- | ---------------------------------------- | ------------------------------------------------------------- |
| 1   | What outcome do you create?              | `Hero`                                                        |
| 2   | Why should I care?                       | `ReframeSection`                                              |
| 3   | What is this worth?                      | **`OpportunitySection`** (new)                                |
| 4   | Where does it leak?                      | `ConversionSection` (extended through revenue)                |
| 5   | What does leaking look like?             | `DemoSection`                                                 |
| 6   | Why believe any of this?                 | **`EvidenceSection`** (new)                                   |
| 7   | What am I actually buying?               | `WhatYoureBuyingSection` (moved up)                           |
| 8   | How does it work?                        | `SystemSection`                                               |
| 9   | What keeps happening?                    | `ManagementSection` (+ `Differentiator` merged)               |
| 10  | How long, and what do I do?              | `LaunchSection`                                               |
| 11  | Can I see anything?                      | Examples + `TrustSection`                                     |
| 12  | What if it goes wrong?                   | `GuaranteeSection`, `CancellationSection` (moved above price) |
| 13  | Where do I start, and what does it cost? | `EntrySection`, `OfferSection`                                |
| 14  | What is the next step?                   | Audit CTA, FAQ, `CtaBanner`                                   |

**Moved to `/services`:** `ValueSection` (8-stage business case), `LocalSearchSection`,
`GrowthSection` (campaign / seasonal / testing depth).

---

## 4. Checklist

### Phase 1 — Homepage consolidation ✅

- [x] Delete dead `offer.ts → management.categories` (zero render sites)
- [x] Merge `DifferentiatorSection` lanes into `ManagementSection`
- [x] Move `ValueSection` to `/services`
- [x] Move `LocalSearchSection` to `/services`
- [x] Move `GrowthSection` to `/services`
- [x] Reorder `HomePage.tsx` to the narrative above
- [x] Update `HomePage.test.tsx` order + presence assertions, with a comment recording why
- [x] Add `ServicesPage.test.tsx` covering the relocated sections
- [x] `npm run test:run` green

### Phase 2 — Outcome / economic positioning ✅

- [x] `content/opportunity.ts` — the one-customer anchor, no currency literals
- [x] `OpportunitySection` component
- [x] Extend `conversion.journey` through lead → customer → revenue
- [x] Widen `JourneyStep` type for the new phase grouping (`JourneyOwner`)
- [x] Fix `Offer.module.css` last-child payoff styling for the longer funnel
- [x] Reframe `offerStack` groups outcome-first (mechanism before deliverables)
- [x] Move `WhatYoureBuyingSection` earlier
- [x] `npm run test:run` green

### Phase 3 — Trust above the price ✅

- [x] Move `GuaranteeSection` above `OfferSection`
- [x] Move `CancellationSection` above `OfferSection`
- [x] Resolve the muted/default tone alternation the move breaks — `LaunchSection`
      retoned to default (it paints no surfaces, so it is the one section that can move
      freely); `TrustSection` relocated above the examples grid it discloses
- [x] New test pins risk reversal _before_ the price, replacing the pin that was removed
- [x] `npm run test:run` green

### Phase 4 — The Website Revenue Audit ✅

- [x] `config/trades.ts` — six-trade taxonomy, `other` a first-class option
- [x] `content/audit.ts` — flow copy, disclaimers, consent line, 20 behaviour lines
- [x] Route `/audit` + `PageMeta` + `App.tsx` (lazy) + nav — four-file lockstep complete
- [x] `useAudit` — sibling of `useWebsiteScore`, own storage key, carries trade + funnel
- [x] Funnel inputs, each allowing "I don't know" (`null` distinguished from `0`)
- [x] Step 1 trade → 2 assessment → 3 diagnosis → 4 funnel → 5 scenario → 6 lead
- [x] Diagnosis shape: category → customer behaviour → consequence → improvement
- [x] Scenario computed at runtime from a lever **the visitor moves**, labelled illustrative
- [x] Submit via existing `submitLead` — **zero server files changed**
- [x] PlayBook `storageNote` untouched and still true
- [x] `AuditPage.test.tsx` — 13 cases incl. the 2000-char message budget
- [x] `npm run verify` green

### Phase 5 — Trade personalization ✅

- [x] Trade-aware diagnosis copy in the audit (`tradeBehaviour` overlays, 5 trades)
- [x] Trade taxonomy shared by the audit and the pages
- [x] `content/industries.ts` — five trades, real content differences
- [x] Five routes + `PageMeta` + `App.tsx` + `build-seo.ts` lockstep, all derived from
      `industryPath()` so a slug and a URL cannot drift apart
- [x] Trade-specific CTA wording, and the CTA carries the trade: `/audit?trade=<slug>`
      preselects step one for somebody who has already answered it by being there
- [x] LocaliQ advertising benchmarks, per trade, verbatim, under the source's own category
      names, each labelled `ADVERTISING_BENCHMARK_LABEL`
- [x] Homepage trade chips link to the five pages; the three trades without one stay in
      the same list rather than being demoted to a second group
- [x] Footer "Industries" column — every page on the site links to all five

**The test that makes this not a template:** `IndustryPage.test.tsx` asserts that no
journey step, no friction item and no page-architecture entry is reused between any two of
the five. A template fails it on the first duplicate sentence.

**On the figures.** The five conversion rates (3.70%–9.08%) were verified against LocaliQ's
published report before being written down, not recalled. Cost-per-lead figures are
published in the same table and appear nowhere: the currency guard would fail the build,
and setting a monthly fee against a cost per lead nobody controls helps nobody.

### Phase 6 — Proof ✅

- [x] Portfolio Demo/Client distinction hardened — `PortfolioGrid.test.tsx` pins the
      **rendered** label per card, not just the `isDemo` flag. A flag nobody renders
      protects nothing.
- [x] `demoUrl` rendering path on both the grid and the industry pages; the guard is now
      non-vacuous (https, not a path on this site, no placeholder)
- [x] `/website-teardown` — six findings on a composite first screen, ordered by cost,
      each resolving to a published PlayBook improvement
- [x] Composite disclosure in the opening region, pinned by two tests
- [x] "What a teardown like this cannot tell you" — the paragraph that stops it being an
      advert
- [x] Sample review artifact on the same page, labelled illustrative, with a test
      asserting the word "redact" appears nowhere in it
- [x] **Blocked on the owner:** live demo URLs, real teardown subjects, measured numbers

### Phase 7 — Measurement ✅

- [x] Six new `AnalyticsEvent` members for the audit funnel, each documented
- [x] Wired at their call sites (`audit_started`, `audit_trade_selected`, `audit_scored`,
      `audit_diagnosis_viewed`, `audit_funnel_entered`, `audit_submitted`)
- [x] No privacy claim changes — still a seam, still no provider, CSP unchanged

### Phase 8 — Evidence ✅

- [x] `content/evidence.ts` — three citations, each with a **required** limitation
- [x] `EvidenceCitation` type makes `limitation` mandatory — a compile error, not an overclaim
- [x] `EvidenceList` component (claim / why / limitation / source + dataset)
- [x] Placed once, on the homepage, immediately after the funnel it supports
- [x] LocaliQ per-trade citations — delivered on the industry pages in Phase 5

### Phase 9 — Guards and final pass ✅

- [x] `npm run verify` green (format, lint, typecheck, **402 tests / 28 files**, both
      builds; `build-seo` wrote 18 pages at the time — Phase 11 took it to 17)
- [x] Currency guard left intact — no new literal currency anywhere in the content layer
- [x] Maintenance guard caught new copy and the **copy** was reworded, not the guard
- [x] Every citation has a limitation over 80 characters, a dataset, and an `https://`
      source. The type made `limitation` required; these assert it says something.
- [x] Scenario copy carries "illustrative" in the **heading** as well as the disclaimer,
      and states that the lever is the visitor's assumption rather than an estimate
- [x] **No unlabelled advertising benchmark.** A structural sweep, not a wording one:
      anything anywhere in the content barrel carrying a `conversionRate` key or a LocaliQ
      attribution must also carry the exact sanctioned label. A benchmark added later, in
      a file nobody anticipated, in a shape nobody designed for, still fails the build if
      it arrives naked.
- [x] Teardown guards: composite disclosed, sample review illustrative, "redact" banned
- [x] Homepage trade chips resolve to real industry pages
- [x] Final conversion self-audit — below

### Phase 9b — closing the loops between the new surfaces ✅

Three pages were built and then only reachable from a footer. Each of these is a link that
answers a question the reader has at exactly that moment, and each is pinned by a test.

- [x] **Free review → the sample.** `ReviewOfferSection` and the contact page both link to
      the teardown's sample. The objection that stops most people accepting a free anything
      is not "is it really free" — it is "what am I actually going to get", and it was
      being left open at the moment the reader decides. Both render only while
      `site.offer.freeReview.enabled` is true, because the switch has to remove every
      promise of a review, not most of them.
- [x] **Audit → the trade's page.** Choosing a trade in step one offers the page written
      for it. A link out of a form normally costs conversions; it is right here because
      the reader has just said which of the five arguments is theirs, and everything they
      enter stays in this browser. "Something else" gets no link, by design.
- [x] **Industry page → the audit, carrying the trade.** `/audit?trade=<slug>` preselects
      step one, validated against the closed union rather than trusted.
- [x] **Homepage → the five pages**, through the trade chips.
- [x] **Examples → the teardown** — the examples show the result, the teardown shows the
      reasoning, and the sceptical reader wants the second one.

### Phase 9c — two published pages that had stopped being accurate ✅

Neither of these was on any checklist. Both were found by asking what the new surfaces
made untrue, which is the question the rest of this document exists to keep asking.

- [x] **The privacy page did not describe this site any more.** It enumerated what the
      contact form and the PlayBook form collect, and said nothing about the audit — which
      transmits a generated summary of somebody's scores, their weakest five and their own
      traffic, close-rate and job-value figures through a field the page described only as
      "any message you write". Now named explicitly, along with what it contains.
- [x] **Nothing accounted for browser storage.** Two surfaces write to `localStorage` and
      the page listed only transmitted data. New "What stays in your browser" section: what
      is held, that the PlayBook assessment is never transmitted at all, that the audit is
      transmitted only on request, and how to clear both.
- [x] **A guard so this cannot recur.** `content.test.ts` now asserts the privacy page
      names every transmitting surface, says what the audit sends rather than only that it
      sends, accounts for browser storage, and still carries the no-tracking claim with its
      "if that ever changes" clause intact.
- [x] **The FAQ said the PlayBook has "eleven principles". It has twenty.** A wrong number
      on a published page, in the one answer whose job is to make a free resource sound
      worth reading. The count is interpolated from `playbook.principles.length` now, and a
      test bans spelling it out — a spelled-out count cannot be kept in step, which is
      exactly how it went wrong.
- [x] **The FAQ never mentioned the audit**, despite it being the primary conversion path
      and sitting in the main navigation. Added, answering the only two questions people
      have about a free diagnostic: what it costs them, and what happens to what they
      typed. It reaches the homepage's `FAQPage` structured data for free.

---

## 5. Rules this plan does not break

- No price, term, guarantee or scope quantity changes.
- No literal currency figures added to the content layer.
- No fabricated client results, testimonials, case studies, measured numbers or demo URLs.
- Existing guards are extended, never weakened, except `HomePage.test.tsx`'s order pin,
  which encodes an editorial decision this work deliberately changes.
- Advertising benchmarks are always labelled as advertising benchmarks.
- Scenarios are always labelled illustrative and never presented as forecasts.

---

## 6. Final conversion self-audit

Written against the finished site rather than against the plan, and deliberately including
what is still weak.

### What a first-time visitor now gets, in order

Outcome → why it matters → what it is worth → where it leaks → what leaking looks like →
why believe it → what you are buying → how it works → what keeps happening → how long →
proof → **what if it goes wrong** → where to start → price → next step. Risk reversal sits
above the price, which is the single biggest structural change on the homepage.

### The three things that carry the argument

1. **The funnel now draws where the job ends.** `conversion.journey` runs ten steps
   through lead → customer → revenue, each marked `demand` / `website` / `business`, and
   the diagram renders the handoff. Claiming the whole chain would have been easier and
   less believable.
2. **The audit is the offer, not a lead magnet.** The useful half — twenty checks, a band,
   the weakest five in customer language — is unconditional and needs no email address.
   Sending it is a separate decision with its own consent line.
3. **Every borrowed number states what it does not show.** Three homepage citations, five
   trade benchmarks, and a type plus a structural test that make an uncaveated one a build
   failure.

### What is still weak, honestly

- **No social proof of any kind.** No testimonials, no case studies, no client count, no
  years in business. The site says so plainly, which is the best available answer and not
  as good as having some.
- **No demo is live.** Five demonstration sites are described and pictured; none can be
  clicked. `demoUrl` is one line per project the day that changes.
- **No measurement.** Twenty-five analytics events are declared and called; nothing
  receives them. Until a provider is connected, every claim in this document about what
  converts better is a hypothesis.
- **The scenario depends on figures most owners do not have.** Every funnel field allows
  "I don't know", and a visitor who does not know their traffic gets fewer lines rather
  than invented ones — correct, and it means the strongest part of the audit is reached
  least often.
- **The industry pages have no local proof.** They argue from how each trade is bought and
  from published category data. A single finished site for one Seattle roofer would be
  worth more than all five pages, and cannot be written — only earned.

### Phase 9d — the systematic count sweep ✅

Having been caught twice by a hand-typed number, the sensible move was to stop finding
them one at a time. A sweep of the content layer, the config and the docs for every
spelled-out count next to a countable noun turned up one more real error and one more
number worth guarding.

- [x] **`docs/business-offer.md` — the file marked authoritative — also said "eleven
      principles".** Same root as the FAQ: `docs/PLAYBOOK-20-PLAN.md` records the
      deliberate upgrade to twenty, and this file was never updated with it. Corrected,
      and the audit added to the same section, since a free resource that has existed for
      several phases had no entry in the register at all. **Neither is a commercial
      decision** — no price, term, guarantee or scope quantity was touched.
- [x] **The offer's "six components" is ten**, in two internal comments (`content/home.ts`,
      `config/routes.ts`). The rendered copy was already right: `offerStack` says "Ten
      parts… four… the other six", and the launch/ongoing split is pinned by a test.
- [x] **The funnel's "six steps before they ever get that far" is correct** — one demand
      step, six the website owns, three the business owns — and is now pinned, along with
      an assertion that every step past the handoff is marked `business`. It was the last
      hand-counted number left in rendered copy.
- [x] **The contact form asks seven things, not six** (an internal comment). `heroForm`
      genuinely asks six; the note now says why they differ.

### Phase 9e — the accessibility and structure pass ✅

The dimension the earlier sweeps had not touched: not whether the new pages say true
things, but whether they are navigable by somebody who cannot see them.

- [x] **A duplicated `visually-hidden` utility, introduced by me.** `styles/global.css`
      already has one, applied as a plain class name in `Field.tsx` and the PlayBook
      assessment. `Teardown.module.css` had a fourth copy of the same five lines; deleted,
      and the TSX now uses the global the way the rest of the codebase does. (The copies in
      `Audit.module.css` and `Assessment.module.css` stay — they hide a radio _input_ that
      has to remain focusable, which is a different problem.)
- [x] **Heading outlines audited on every new page**, and asserted permanently: exactly one
      `h1`, and no skipped level. Checked on all five industry pages rather than one, since
      sections render conditionally on whether a demo or a citation resolves — and on the
      audit in **both** its states, empty and fully completed, because the diagnosis and
      the scenario each add headings only after twenty questions have been answered.
      All clean; the tests are the point.
- [x] **New-tab links now announce themselves.** Both places I added `target="_blank"` —
      `EvidenceList` and the industry benchmark source — opened a new tab silently. Opening
      one is a context change, and a link that does it without saying so is one a
      screen-reader user discovers by finding themselves somewhere else. A visually-hidden
      "(opens in a new tab)" now travels with every external source link, and a test
      asserts **all** of them on a page carry it — a page where only some do is worse than
      one where none do, because the missing one reads as internal.

### Phase 9f — auditing my own work the way Phase 1 audited the old work ✅

Phase 1 of this plan opened by deleting `offer.ts → management.categories`: content that
was written, populated, and read by nothing. Turning that same check on the code added
since found that I had committed the identical failure four times, plus one real bug.

- [x] **`Trade.urgency` — dead.** A three-value union, populated for all six trades, read
      by nothing. It looked useful and was not: how long a trade's decision takes is
      already carried by `IndustryPageContent.decisionWindow`, in a sentence that is
      actually rendered and says far more than one of three words could. Deleted rather
      than found a use for — a parallel encoding nobody reads is how two sources of truth
      start.
- [x] **`Trade.name` — dead.** Six strings ("an HVAC company", …) never rendered. `label`
      and `buyingContext` are what the UI uses. Deleted.
- [x] **`FUNNEL_FIELDS` — dead export.** `AuditFunnel` renders the four inputs explicitly
      because each has its own label, hint and suffix, so iterating keys bought nothing.
- [x] **`audit.hero.startLabel` — dead copy.** Written for a "Start the audit" button the
      page never grew, because the audit is one page rather than a wizard: the first
      question is already on screen, and a button that scrolls to something visible costs a
      tap to do nothing.
- [x] **A real bug: the close rate had no ceiling.** Nothing stopped somebody typing 500
      into a percentage field, and the arithmetic downstream is
      `enquiries * (closeRate / 100)` — so it showed **five times as many customers as
      enquiries.** An impossible number, on the one page whose entire defence is that the
      arithmetic is sober, and precisely what a sceptical owner testing the calculator
      would type first. Clamped to 100 in `useAudit` (where `setLever` already clamps),
      including on the way out of `localStorage`, which is user-writable. Clamped rather
      than rejected: 100 is the largest truthful answer, and discarding the input would
      lose the rest of their work to a typo.

### The failure mode this work kept hitting

Not overclaiming. **Pages quietly ceasing to describe the site.** The privacy page, the FAQ
count and the vacuous `demoUrl` guard were all written correctly and then made wrong by
something added later, and none of them would have failed a review that only read the new
code. Every one of them is now pinned by a test that reads the content rather than the
copy — the count is counted, the privacy page is checked against the surfaces that exist,
and the advertising label is required structurally rather than by wording.

The question worth asking before each future addition is not "is this claim defensible" but
**"what did this just make untrue somewhere else".**

### Phase 10 — the name, the navigation bar, and what replaced them ✅

Two owner requests, both landed here rather than in a separate document because both
changed files this plan is responsible for.

- [x] **`ServiceSideSites` → `ServiceSide`.** Shorter, and it drops a repetition: "Side"
      and "Sites" were the same idea twice, which is what made the old name awkward out
      loud and on the phone. One line in `content/site.ts` and one in `seo.titleSuffix`;
      nothing else in the repository holds the name as a literal, so reverting is the same
      two lines. **This is a brand decision, not an implementation detail** — it is
      recorded here so it is visible rather than buried in a diff.
- [x] **The header bar was wrapping onto two lines.** The cause was `.navLink` having no
      `white-space: nowrap`, so "Free audit" broke across two lines at every viewport
      width and took the whole bar with it. Fixed there, plus `nowrap` on the brand, the
      tagline and the button, `flex-wrap: nowrap` on the row, and `min-width: 0` on the
      brand so it is the thing that shrinks. The tagline hides between 64rem and 80rem,
      which is where the bar is tightest.
- [x] **A shorter label for the header's call to action.** `site.cta.navLabel`, "Get my
      free review", against the full "Get my free website review" everywhere else. Same
      destination — this is the bar's wording, not a second offer — and a test asserts it
      stays genuinely shorter than the full label rather than drifting back.
- [x] **One nav item removed: the PlayBook.** Covered under Phase 11 below; it is the
      §17 half of the same problem.

### Phase 11 — Value Per Second ✅

A repositioning rather than an edit, planned in **`docs/VALUE-PER-SECOND.md`**, which
carries the audit: the test itself, the research it was grounded in, a verdict on all 18
pages and all 20 homepage sections, and the Job / User Question / Desired Outcome table.

Only the results belong here.

- [x] **`/playbook/get` deleted.** A second page carrying the same email form as
      `/playbook`, bound to the same hook, posting to the same endpoint, rendering the same
      `pdfOffer` content — and linked from nowhere on the site. Its stated reason was that
      a salesperson needed a short URL to read out; `/playbook` is shorter to say. 18 built
      pages → 17. The capture, the hook and the server's subscriber feature are untouched.
- [x] **Three sections moved from the homepage to `/services`:** the value stack (a second
      notation for a list already on the page), the competitor comparison (the management
      section makes the argument with real monthly work in it) and the three entry paths
      (three cards restating three pricing tiers, immediately above the pricing tiers).
- [x] **The FAQ was capped at 8 of 31.** The section's own lede promises "the things people
      ask first" and the page was rendering every one of them. The other twenty-three are
      on `/services`, and there is a link to them under the list.
- [x] **The PlayBook left the header navigation.** Highest _total_ value on the site,
      lowest value _per second_ for somebody arriving cold — twenty improvements is a
      reading commitment offered to a visitor who has not yet decided the business is worth
      two minutes. Still in the footer, still linked from the audit result, which is the
      reader it was written for.

**Three guards, so none of it decays:**

- [x] **An eager payload budget** (`client/scripts/check-budget.ts`) that parses the built
      `index.html`, sums the entry chunk, every modulepreload and every stylesheet, and
      fails the build over the ceiling. It runs from `scripts/build.ts`, so it runs on
      every `npm run verify`. Current: **eager JS 444.3 kB (134.4 kB gzipped), CSS 83.5 kB
      (13.3 kB gzipped).** This is the guard the 236 kB barrel regression needed and did
      not have.
- [x] **A homepage section budget** and a **tone-alternation test**. `HomePage.tsx`
      described the alternation rule in three separate comments and nothing enforced it —
      removing `EntrySection` broke the run and took three tone changes to repair, none of
      which any test would have caught.
- [x] **A no-orphan-routes test.** Every route is linked from the navigation or named in a
      list of deliberate exceptions with its reason. `/playbook/get` existed for months
      with every test green; this is what would have failed.
- [x] **A no-dead-anchors test**, added after the sweep below found one. Every constant in
      `sections` must be rendered as an `id` by some component.

### Phase 11b — auditing this pass the way Phase 9f audited the last one ✅

Every new guard was **made to fail** by injecting a real violation and reverting: the
stagger policy named the offending file and line, the tone test reported _"Bands 12 and 13
after the hero are both default"_, and the payload budget failed the build and printed the
two causes that have ever actually moved it. A guard nobody has seen fail is not a guard.

- [x] **One dead constant found and deleted: `sections.contact`.** It named a fragment no
      component rendered and nothing linked to — the same failure as the dead
      `management.categories` this plan opened with, one file over. The new anchor test
      makes the next one impossible to add quietly.
- [x] **910 CSS module classes swept — clean.** The only four unreferenced are `Button`'s
      variants, reached through `styles[variant]`.
- [x] **No modules orphaned by deleting `/playbook/get`.** `usePlayBookRequest` has exactly
      one consumer and the subscriber endpoint is still reached.
- [x] **Band counts measured rather than assumed: homepage 17, `/services` 11**, so the
      section budget is exactly tight. That the depth page is shorter than the front page
      is recorded in `docs/VALUE-PER-SECOND.md` §11 as the number a future pass should
      argue with.

### Phase 11c — two accessibility defects, neither of them new ✅

The audit above checked what this pass changed. This checked what it should have changed
and did not: `/services` gained three sections and thirty-one FAQ answers, and nothing
verified the heading outline still held.

- [x] **`/services` jumped `h1` → `h3`.** `ServiceList` was passed `headingLevel={3}`
      directly beneath the page's own `h1`, leaving level 2 empty.
- [x] **`/portfolio` did the same** with `PortfolioGrid`, by taking its default.

Both components default to 3, which is right on the homepage — where a section heading
already occupies level 2 — and wrong on the page where the list is the first thing under
the title. **Neither defect was caused by this pass; both had been shipping.** A screen
reader announces that a level was skipped and gives the reader no way to find out what was
in it, and skimming by heading is how that reader reads a long page.

`IndustryPage.test.tsx` had enforced exactly this on the five industry pages since they
were built. The standard existed; it had never been applied to the rest of the site.

- [x] **`app/outline.test.tsx` now checks nine pages** — the seven eager ones plus the
      PlayBook and the workbook, which had **no outline test at all** despite being the two
      longest documents on the site. Both passed; being correct and being untested look
      identical until somebody adds a section. The industry pages, the teardown and the
      audit keep their own checks next to their own content.
- [x] Both `headingLevel` unions widened to `2 | 3 | 4`, with the rank documented as a
      property of _where the list sits on the page_ rather than a style choice.

**Motion was audited too, and it was the worst offender on the site.** `Reveal` was
introduced to walk a reader through one ordered list; it had reached 33 lists across 24
files with 32 of them staggered, including grids of cards with no order. A stagger claims
the order means something. `index` became `sequence`, which made all 33 call sites a type
error so each had to be decided rather than inherited — 10 kept it, all inside an `<ol>`;
23 now fade in place. `Reveal.test.tsx` pins the contract and reads the repository to
assert the rule holds.

Running the brief's 5/15/30-second comprehension test — rather than assuming the first
screen passed it — found two more:

- [x] **The header call to action was fading in 210 ms late**, on top of a 480 ms fade. The
      hero exists partly so a referred visitor can act without reading; making them watch
      the button appear is the same mistake in motion. Delay removed from the action and
      the reassurance beside it.
- [x] **The two prices were separated by a vertical rule, which reads as a choice.** They
      are both halves of one offer, and "$2,500 _or_ $299 a month" makes the cheaper number
      look like the whole price. The rule is now the word "plus", rendered rather than
      `aria-hidden`, and a test asserts it is never a word meaning "or".

**Two proposed merges were rejected when the test was applied to them properly** —
`Opportunity`+`Conversion` are two questions rather than one asked twice, and splitting
`Guarantee` from `Cancellation` is faster to scan than one 280-line block. The response
guarantee's limits were also the largest byte saving on the page and were **not** moved:
a promise published more prominently than its limits is a different promise.

### What would move the number most, in order

1. One real client, with permission to name them.
2. One published demo URL.
3. An analytics provider, so the sequence above stops being an argument and starts being a
   measurement — and so the value-per-second claims can be checked against field data
   rather than against a budget file.

The first two are the owner's to produce. The third is a decision plus an update to
`content/legal.ts`, which currently states truthfully that this site does no analytics
tracking.

---

## Phase 11 — the offer rebuild ✅

Positioning, pricing architecture, discount presentation, risk reversal and the bridge from
the assessment into the offer. It has its own document — **`docs/OFFER-REBUILD.md`** — which
carries the full report and the eighteen-question final audit.

What belongs in _this_ plan's register, because it changes things this plan is responsible
for:

- **`client/src/config/pricing.ts` is now the only file that states a figure as a number.**
  §2 of this plan listed "no literal currency figures added to the content layer" as a rule;
  it is now enforced by derivation rather than by discipline — the currency guard's
  allow-list is generated from the same config the copy interpolates.
- **The offer's name changed** from "The Local Lead-Ready Website System" to
  **"The Customer Conversion System"**, and the primary call to action from "free website
  review" to "free website assessment". Both are positioning decisions recorded in
  `docs/business-offer.md`; nine tests that had pinned the old wording were fixed by reading
  the label from the content layer instead of by re-pinning the new one.
- **The audit is no longer a dead end.** `recommendedTier()` turns a score into a tier, and
  above roughly 85% it recommends nothing at all — which is the branch that makes the other
  two worth reading.
- **Three founding-price questions now block publication**, recorded in
  `docs/business-offer.md` §17. They are commercial facts, not implementation details, and
  no answer to any of them was inferred.

The failure mode this plan named in Phase 9f — _pages quietly ceasing to describe the site_ —
recurred, twice, in the same shape: the homepage was updated and `/services` was not. It
published three conditional prices with no condition, and the annual price of a plan it never
showed. Both are fixed, and both now have a test that reads the page rather than the copy.
