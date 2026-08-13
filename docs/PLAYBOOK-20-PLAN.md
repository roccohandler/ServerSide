# PlayBook → 20-Point Lead-Generation System

**Status:** complete — `npm run verify` green (314 tests, 22 files, 11 pages)
**Created:** 2026-08-09
**Partly superseded, 2026-08-11:** decision 7 below built a share route at
`/playbook/get`. It was removed in the value-per-second pass — the same form was already
on `/playbook`, nothing linked to the second page, and `/playbook` is shorter to read out
than `/playbook/get` was. The email capture, the endpoint and the delivery behaviour are
unchanged. See [`VALUE-PER-SECOND.md`](VALUE-PER-SECOND.md) §4. **The rest of this
document is a historical record and is not being edited to match.**
**Scope:** turn the PlayBook from eleven pieces of website advice into a 20-improvement
system with a working self-assessment, a priority engine, a professional PDF, a
one-minute prospect-share flow, and honest qualification.

Companion to [`docs/business-offer.md`](business-offer.md), which stays authoritative for
anything commercial. Nothing in this plan changes a price, a term or a guarantee.

---

## 1. What the review found

| Area            | State                                                                                                                                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Content model   | Data-driven. `playbook` in `content/playbook.ts`, typed by `PlaybookPrinciple`. Extend it; do not build a second system.                                                                      |
| Principles      | **11**: speed, mobile, clarity, hierarchy, colour, trust, cta, forms, service-pages, message-match, measurement. These map exactly onto the brief's 01–11, so the nine new ones are additive. |
| Principle shape | `id, number, name, heading, uxProblem, consequence, principle, practices, example?, research?, warning?, chain?, serviceNote`. Missing: `metaConcept`, `quickTest`, `whyItMatters`, `stage`.  |
| Scorecard       | 12 static categories × 0–2, bands to 24. Must become 20 × 0–2 = **40**, and become interactive.                                                                                               |
| Routes          | `/playbook` (public, full), `/playbook/workbook` (noindex, unlinked, printable).                                                                                                              |
| Sections        | `PlayBookHero`, `PlayBookIntroduction`, `PlayBookPrinciples`, `PlayBookFixFirst`, `PlayBookScorecard`, `PlayBookPdfOffer`.                                                                    |
| Capture         | `POST /api/subscribers` → store with consent record → notify owner. Owner sends by hand.                                                                                                      |
| Analytics       | Seam only, no provider. `playbook_viewed`, `playbook_download_requested`, `playbook_download_failed` exist.                                                                                   |
| Service area    | `site.serviceArea` — 10 cities, already centralised.                                                                                                                                          |
| Tests           | 251 passing. `PlayBookPage.test.tsx` asserts every play is published in full; `content.test.ts` sweeps for forbidden claims and placeholders.                                                 |
| Design system   | CSS Modules over tokens. No animation library — `Reveal` is IntersectionObserver + CSS. 3 runtime dependencies.                                                                               |

**Architectural conclusion:** extend the content model, add one interactive component
(the scorer), and add two routes. No new dependency. No second content system.

---

## 2. Decisions

### From the brief (fixed)

Exactly 20 improvements; the six-stage Lead-Ready framework; the eight-part principle
shape; 0/1/2 scoring to 40; the four score bands; three priority tiers; no promises of
leads, rankings, revenue or ROI; Core Web Vitals stated accurately and never as a ranking
guarantee; A/B testing only where traffic supports it.

### Resolved this session (16 answers)

| #   | Decision        | Value                                                                                                                                                             |
| --- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Assessment      | **Interactive scorer.** 20 categories, live total /40, band, and a generated weakest-five priority list.                                                          |
| 2   | Qualification   | **Static section + conversation.** Honest profile, below-threshold path to the free PlayBook, exception email route. No self-serve gate.                          |
| 3   | PDF delivery    | **Auto-send when `PLAYBOOK_PDF_URL` is configured**, falling back to notify-the-owner when it is not.                                                             |
| 4   | Page structure  | **Six stage sections + sticky jump nav.** One page, fully crawlable.                                                                                              |
| 5   | Detail level    | **Everything expanded.** Nothing behind a `<details>`.                                                                                                            |
| 6   | The $1M figure  | **Named quietly**, after the profile description. Centralised in config.                                                                                          |
| 7   | Share flow      | **`/playbook/get`** — minimal route, one email field.                                                                                                             |
| 8   | Fix-first lists | **Both.** Static Priority 1/2/3 tiers, plus personalised weakest-five after scoring. Keep `dontDoThis`.                                                           |
| 9   | Score memory    | **localStorage, with a reset control.** Nothing leaves the device.                                                                                                |
| 10  | Service area    | **Keep the ten cities.** Restructure into a fuller config.                                                                                                        |
| 11  | PDF scope       | **One document.** Rebuild `/playbook/workbook` as the complete PDF.                                                                                               |
| 12  | Analytics       | **Per stage** (6), plus assessment started/completed and the existing PDF events.                                                                                 |
| 13  | Headline        | "20 improvements that turn more of the visitors you already have into calls and quote requests."                                                                  |
| 14  | Example trades  | **All of them** — HVAC, plumbing, electrical, roofing, landscaping, tree service, garage door, concrete, cleaning, painting, remodelling, pest control, flooring. |
| 15  | Overlaps        | **Sharpen each to its own job**, with explicit cross-references (`relatedPrinciples`).                                                                            |
| 16  | Validation      | **Types + tests.** Required fields non-optional; tests assert 20, unique ids, 01–20 order, valid stage, non-trivial content.                                      |

### Derived (documented, not asked)

- **`stage` is a required field on every principle**, not a lookup table. The grouping is
  the framework; a principle that does not know its stage cannot be rendered.
- **The scorer is uncontrolled-by-default and works without JS for reading.** The 20
  categories and their prompts render as content; only the scoring is interactive, so a
  crawler and a no-JS reader still get the whole assessment.
- **`PLAYBOOK_PDF_URL` is a server variable, not `VITE_`-prefixed.** The client must never
  need to know it; the server decides which email to send.
- **The qualification section lives on `/services`, not `/playbook`.** The PlayBook is the
  free resource; putting "who I work with" in the middle of it turns a gift into a filter.

---

## 3. The 20 principles

| #   | Id                       | Stage           | Status                       |
| --- | ------------------------ | --------------- | ---------------------------- |
| 01  | `speed`                  | Get Experienced | keep, add meta/quickTest/why |
| 02  | `mobile`                 | Get Experienced | keep, extend                 |
| 03  | `clarity`                | Get Understood  | keep, extend                 |
| 04  | `hierarchy`              | Get Understood  | keep, extend                 |
| 05  | `colour`                 | Get Experienced | keep, extend                 |
| 06  | `trust`                  | Get Trusted     | keep, extend                 |
| 07  | `cta`                    | Get Contacted   | keep, extend                 |
| 08  | `forms`                  | Get Contacted   | keep, extend                 |
| 09  | `service-pages`          | Get Contacted   | keep, extend                 |
| 10  | `message-match`          | Get Contacted   | keep, extend                 |
| 11  | `measurement`            | Get Better      | keep, extend                 |
| 12  | `local-relevance`        | Get Found       | **new**                      |
| 13  | `navigation`             | Get Understood  | **new**                      |
| 14  | `first-screen`           | Get Understood  | **new**                      |
| 15  | `proof`                  | Get Trusted     | **new**                      |
| 16  | `expectations`           | Get Trusted     | **new**                      |
| 17  | `accessibility`          | Get Experienced | **new**                      |
| 18  | `search-intent`          | Get Found       | **new**                      |
| 19  | `friction`               | Get Contacted   | **new**                      |
| 20  | `continuous-improvement` | Get Better      | **new**                      |

Stage counts: Found 2, Understood 4, Experienced 4, Trusted 3, Contacted 5, Better 2.

Renumbered during implementation so 01–20 ascend down the page in stage order, rather than
keeping the brief’s original numbering and showing 12 and 18 side by side under "Get found".

**Overlap resolution.** `clarity` is what the first screen _says_; `first-screen` is how to
_evaluate_ the whole screen in five seconds. `trust` is what evidence exists; `proof` is
placing it beside the claim it supports. `measurement` is what to count;
`continuous-improvement` is the loop that uses it. Each carries `relatedPrinciples`.

---

## 4. Checklist

### Phase 1 — Content model

- [x] `types/content.ts`: `PlaybookStage` union; add required `metaConcept`, `quickTest`, `whyItMatters`, `stage` to `PlaybookPrinciple`; add optional `relatedPrinciples`, `businessTypes`
- [x] `types/content.ts`: `ScorecardCategory` with `stage` and `principleId`
- [x] `content/playbook.ts`: the six `stages` with descriptions
- [x] `content/playbook.ts`: extend all 11 existing principles with the new required fields
- [x] `content/playbook.ts`: nine new principles (12–20)
- [x] `content/playbook.ts`: renumber 01–20, assign stages
- [x] `content/playbook.ts`: examples across all 13 trades
- [x] `content/playbook.ts`: hero and headings rewritten for 20
- [x] `content/playbook.ts`: scorecard → 20 categories, 40 points, four bands
- [x] `content/playbook.ts`: `priorityTiers` — §9's three static tiers
- [x] `content/playbook.ts`: assessment result copy (band explanations, weakest-five framing)

### Phase 2 — Qualification and service area

- [x] `config/market.ts`: NEW — service area, revenue guideline, fit signals, exception path
- [x] `content/site.ts`: `serviceArea` reads from the market config
- [x] `content/qualification.ts`: NEW — who this is for, below-threshold path, exception route
- [x] `features/services/`: qualification section on the services page
- [x] Never state or imply rejection; recommendation only

### Phase 3 — PlayBook UI

- [x] `PlayBookHero`: 20-improvement framing, jump links
- [x] `PlayBookSystem`: NEW — the six-stage framework
- [x] `PlayBookNav`: NEW — sticky stage nav, scroll-spy, reduced-motion safe
- [x] `PlayBookPrinciples`: grouped by stage; meta concept, quick test and why-it-matters rendered
- [x] `PlayBook.module.css`: stage headers, meta-concept callout, quick-test callout, sticky nav
- [x] Mobile: nav collapses to a horizontal scroller, never a fixed overlay

### Phase 4 — The assessment

- [x] `useWebsiteScore.ts`: NEW — 20 scores, total, band, weakest five, localStorage, reset
- [x] `PlayBookAssessment.tsx`: NEW — radiogroup per category, live total, band, priorities
- [x] Accessible: fieldset/legend per category, keyboard operable, `aria-live` on the total
- [x] Renders all 20 categories as readable content before any interaction
- [x] `Assessment.module.css`

### Phase 5 — Prospect share flow

- [x] `config/routes.ts`: `playbookGet: '/playbook/get'`
- [x] `content/pages.ts`: metadata for it
- [x] `PlayBookGetPage.tsx`: NEW — minimal, one field, reuses `usePlayBookRequest`
- [x] `app/App.tsx`: route
- [x] Thank-you state → free website review CTA

### Phase 6 — PDF

- [x] `content/playbook.ts`: `workbook` becomes the full document — cover, executive summary, 20 principles, framework, 40-point scorecard, priorities, service page
- [x] `WorkbookPage.tsx`: rebuilt to render it
- [x] `Workbook.module.css`: page numbers, running headers, per-section page breaks, TOC
- [x] Print check: no orphaned headings, no split tables

### Phase 7 — Auto-send

- [x] `server/config/env.ts`: `PLAYBOOK_PDF_URL`, optional
- [x] `subscriber.email.ts`: second template addressed to the subscriber
- [x] `subscriber.service.ts`: send to subscriber when configured, else notify owner
- [x] Server tests for both paths
- [x] `.env.example` and README

### Phase 8 — Analytics

- [x] Six `playbook_stage_viewed` events, one per stage
- [x] `assessment_started`, `assessment_completed`
- [x] Wire at call sites

### Phase 9 — Tests

- [x] Exactly 20 principles; unique ids; 01–20 in order; every stage valid
- [x] Every required field present and non-trivial
- [x] Scorecard has 20 categories, each mapping to a real principle id
- [x] Score maths: max 40, band boundaries, weakest-five selection
- [x] Every principle still published in full on the public page
- [x] Assessment keyboard-accessible and announced
- [x] `/playbook/get` renders and submits
- [x] Qualification copy never states rejection
- [x] Market config drives the service area
- [x] No statistic, no promised result, no placeholder (existing guards extended)

### Phase 10 — QA

- [x] `npm run verify`
- [x] Six-perspective review (§32)
- [x] Implementation report

---

## 5. Risks

| Risk                                                  | Mitigation                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Page becomes enormous and slow — while teaching speed | No new dependency; `Reveal` already in use; measure the bundle before and after and report it                 |
| Twenty principles read as repetitive                  | Distinct meta concept per principle, distinct trade per example, `relatedPrinciples` for the genuine overlaps |
| Scorer is inaccessible                                | fieldset/legend per category, real radios, `aria-live` total, keyboard-tested                                 |
| Qualification reads as rejection                      | Copy reviewed against §15; a test asserts no rejection language                                               |
| Auto-send emails a dead link                          | Gated on `PLAYBOOK_PDF_URL`; unset means the existing notify-the-owner path, unchanged                        |
| Existing tests weakened to pass                       | Extend, never relax. The "publishes every play in full" assertion stays and now covers 20.                    |
