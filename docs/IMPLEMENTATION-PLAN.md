# Commercialization Implementation Plan

**Status:** complete — all phases delivered, `npm run verify` green (251 tests, 19 files)
**Created:** 2026-08-09
**Scope:** turn the site from "here is what I would sell" into "here is what I sell, what it
costs, what you get, and what happens if it goes wrong" — with zero blocking placeholders.

This file is the working plan. `docs/business-offer.md` is the permanent record of the
commercial model and is the file future agents must not contradict.

---

## 1. What the review found

| Area               | State before this pass                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Offer architecture | Complete. 10 system components split launch/ongoing, offer stack, value education, demos, growth services. Nothing needs rebuilding.          |
| Pricing            | Two-tier structure exists and renders. Both figures are `[PLACEHOLDER]` and degrade to "Quoted per project".                                  |
| Response guarantee | Fully modelled in `content/growth.ts`, `enabled: false`, remedy is a placeholder, section is written and gated.                               |
| Revisions          | `offer.ts` launch step + FAQ both say the loop "repeats until you are happy" — unlimited.                                                     |
| Launch timeline    | `launch.target` is `null`; page says "live in weeks, not months" and nothing else.                                                            |
| Legal              | `[DATA_RETENTION_POLICY]`, `[PROJECT_TERMS]` outstanding. Privacy page correctly states no analytics.                                         |
| About              | 3 of 4 sections are placeholders.                                                                                                             |
| Contact            | `availability` reads `24/7 7 Days a week,holidays are only available for emergency services` — a 24/7 claim with a typo.                      |
| PlayBook           | Public page complete (11 plays, fix-first, scorecard). PDF offer copy exists; **no capture UI, no endpoint, no PDF**.                         |
| Analytics          | `lib/analytics.ts` seam wired to 10 events, no sink. Privacy page truthful.                                                                   |
| Server             | Leads feature is a clean template: schema → model → repository → service → controller → routes → email. No subscribers feature.               |
| Tests              | 193 passing. `content.test.ts` asserts the response guarantee stays OFF and the remedy stays a placeholder — both must be inverted this pass. |

**Blocking placeholders: 12.** `[LAUNCH_PRICE]` `[MANAGEMENT_PRICE]` `[PRICING_APPROACH]`
`[PRICING_ANSWER]` `[TIMELINE_ANSWER]` `[SERVICE_AREA_ANSWER]` `[ABOUT_INTRO]`
`[ABOUT_WHO_I_AM]` `[ABOUT_WHY_SERVICE_BUSINESSES]` `[DATA_RETENTION_POLICY]`
`[PROJECT_TERMS]` `[RESPONSE_GUARANTEE_REMEDY]`

---

## 2. Decisions — authoritative

### From the master prompt (not negotiable)

| Decision                            | Value                                                          |
| ----------------------------------- | -------------------------------------------------------------- |
| Launch fee                          | **$2,500** one-time                                            |
| Management fee                      | **$299/month**                                                 |
| Annual prepay                       | **$2,990/year** (secondary to the monthly price)               |
| Minimum term                        | **3 months**, then month-to-month                              |
| Cancellation                        | **30 days' notice** after the minimum                          |
| Revisions                           | **2 structured rounds** within agreed scope                    |
| Launch timeline                     | **2–4 weeks** after required materials received                |
| Seasonal refreshes                  | **4 per year** (~quarterly)                                    |
| Campaign landing pages              | **up to 1 per month**                                          |
| Campaign copy alignment             | **up to 2 per month**                                          |
| A/B testing                         | only where traffic supports a meaningful result                |
| Response guarantee                  | **ON.** 24 hours, covered business week                        |
| Remedy                              | **that month's $299 management fee waived**, no partial credit |
| Guarantee covers                    | **response, never resolution**                                 |
| Ad management                       | **excluded**                                                   |
| Ranking / lead / revenue guarantees | **none, ever**                                                 |
| Ownership                           | client retains website + domain                                |
| Primary market                      | Greater Seattle; remote clients accepted                       |

### Resolved this session (20 answers)

| #   | Decision                        | Value                                                                                                                               |
| --- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Hero                            | **CTA-only.** No form in or beside the hero. Primary CTA deep-links to `/contact#request`. Honours the earlier correction over §24. |
| 2   | Managing a site I didn't build  | **Yes, after a paid onboarding** (audit + fix, quoted per site), then $299/mo                                                       |
| 3   | Is management bundled?          | **Default yes, opt-out possible.** Sold as one system; never described as mandatory.                                                |
| 4   | Existing site that needs fixing | **Quoted separately** as a rescue engagement, then $299/mo                                                                          |
| 5   | Launch payment terms            | **50% deposit ($1,250) / 50% at launch**                                                                                            |
| 6   | Billing start                   | **At launch.** 3-month minimum runs from launch.                                                                                    |
| 7   | Hosting + domain                | **Included in $299, paid by me.** Accounts stay in the client's name and transfer on exit.                                          |
| 8   | Tax                             | **Not mentioned.** Written agreement governs.                                                                                       |
| 9   | Business hours                  | **Mon–Fri, 8am–6pm Pacific.** Weekends + US federal holidays pause the clock.                                                       |
| 10  | Remedy application              | **Automatic.** Client never has to ask.                                                                                             |
| 11  | Designated support email        | **Keep `maxwellacuenca@gmail.com`**, exposed as one config field so it can be swapped later                                         |
| 12  | A/B traffic floor               | **No published number.** Eligibility rule explained; specifics given in the free assessment.                                        |
| 13  | About voice                     | **"Independent, by choice."** One person, one build at a time. No years, no client count, no credentials.                           |
| 14  | Out of hours                    | **Site-down emergencies only, best effort.** Explicitly outside the 24-hour clock.                                                  |
| 15  | Pricing location                | **Homepage section + services page.** No `/pricing` route.                                                                          |
| 16  | Annual cancellation             | **Pro-rata refund at the $299 monthly rate** (they don't keep the discount they didn't earn)                                        |
| 17  | PlayBook capture                | **Store + notify.** Real endpoint, real record, real consent stamp; owner sends the PDF.                                            |
| 18  | The PDF                         | **Print-optimised `/playbook/workbook` route**, `noindex`, out of the sitemap, unlinked. Print to PDF.                              |
| 19  | Service pages included          | **Up to 6**, plus home/about/contact. Beyond that is quoted.                                                                        |
| 20  | Analytics                       | **Seam only, no provider.** Add the extra events §23 lists. Privacy page stays truthful.                                            |

### Derived decisions (documented, not asked)

- **Hosting cost is inside $299** but accounts are in the client's name — so the terms say
  the client authorises billing to my card while managed, and takes over billing on exit.
  Without this the two existing claims contradict each other.
- **`/playbook/workbook` is a production tool, not a public page.** Unlinked, `noindex`,
  excluded from `sitemap.xml`. It is how the PDF gets made, not a way around the email form.
- **Structured data gains `Offer` / `PriceSpecification`** now that prices are real.
- **`manage-website` inquiry slug stays** — decision 2 keeps that path alive.

---

## 3. Architecture — what goes where

Nothing gets rebuilt. New commercial facts land in the content layer; new UI renders them.

```
content/offer.ts       prices, annual option, commercial terms, revisions, timeline
content/growth.ts      response guarantee ON, scope quantities (4/yr, 1/mo, 2/mo)
content/site.ts        business hours object, support email, emergency note
content/faq.ts         20 answers, zero placeholders
content/legal.ts       retention (24mo), project terms, management terms, subscribers
content/about.ts       3 placeholders filled
content/trust.ts       [PRICING_APPROACH] filled
content/playbook.ts    workbook content + capture copy matched to reality
content/entry.ts       NEW — the three ways in (launch / rescue / manage-existing)
```

**One rule enforced by test:** every price string in the content layer must derive from
`pricing.launch.amount` / `pricing.management.amount` or match them exactly. §41's
"$149 here, $299 there" failure becomes a failed build.

---

## 4. Checklist

### Phase 1 — Commercial facts in the content layer

- [x] `content/site.ts`: replace the 24/7 availability line with Mon–Fri 8am–6pm Pacific
- [x] `content/site.ts`: add structured `contact.hours` (days, window, timezone, label)
- [x] `content/site.ts`: add `contact.supportEmail` as the designated guarantee channel
- [x] `content/site.ts`: add the out-of-hours best-effort note
- [x] `types/content.ts`: extend `SiteContact` for the above
- [x] `content/offer.ts`: `$2,500` and `$299/mo` as real prices
- [x] `content/offer.ts`: annual `$2,990/year` option, visually secondary
- [x] `content/offer.ts`: `[PRICING_APPROACH]` → real sentence
- [x] `content/offer.ts`: `launch.target` → `2–4 weeks`, with the materials caveat
- [x] `content/offer.ts`: launch step 3 — "repeats until you are happy" → 2 revision rounds
- [x] `content/offer.ts`: new `commercialTerms` export (term, notice, payment, revisions, scope, ownership, cancellation)
- [x] `content/offer.ts`: 6 service pages stated as included scope
- [x] `content/trust.ts`: `[PRICING_APPROACH]` → real sentence
- [x] `content/entry.ts`: NEW — three routes in (new build / rescue / manage existing)

### Phase 2 — The response guarantee

- [x] `content/growth.ts`: `responseGuarantee.enabled` → `true`
- [x] `content/growth.ts`: remedy → automatic waiver of that month's fee, real string
- [x] `content/growth.ts`: channels → website form + designated business email only
- [x] `content/growth.ts`: business-week definition, weekend/holiday pause
- [x] `content/growth.ts`: exclusions finalised, plain-English public summary
- [x] `content/growth.ts`: `notGuaranteed` disclosure block (§17)
- [x] `content/growth.ts`: scope quantities — 4 refreshes/yr, 1 landing page/mo, 2 alignments/mo
- [x] `GuaranteeSection.tsx`: render the guarantee as a visually strong block, not a footnote

### Phase 3 — Pricing and offer UI

- [x] `OfferSection.tsx`: pricing cards carry the real figures, cadence, includes, CTA
- [x] `OfferSection.tsx`: annual option rendered secondary to the monthly price
- [x] `OfferSection.tsx`: terms footnote (3-month minimum, then month-to-month)
- [x] New `ValueStackSection`: §33's four groups (Build / Convert / Improve / Stay out of the weeds)
- [x] New `TermsSection` or terms block: what happens if I cancel (§20)
- [x] Services page: pricing repeated, same source of truth
- [x] `Offer.module.css`: styles for the annual option, terms, value-stack groups

### Phase 4 — FAQ, legal, about

- [x] `content/faq.ts`: all 20 questions from §34, `[PRICING_ANSWER]` / `[TIMELINE_ANSWER]` / `[SERVICE_AREA_ANSWER]` filled
- [x] `content/legal.ts`: `[DATA_RETENTION_POLICY]` → 24 months after last meaningful interaction
- [x] `content/legal.ts`: `[PROJECT_TERMS]` → the §19 business rules in plain English
- [x] `content/legal.ts`: privacy gains a PlayBook-subscriber section
- [x] `content/legal.ts`: privacy restates that no analytics provider is configured
- [x] `content/about.ts`: `[ABOUT_INTRO]`, `[ABOUT_WHO_I_AM]`, `[ABOUT_WHY_SERVICE_BUSINESSES]`

### Phase 5 — PlayBook capture + workbook

- [x] `apps/server/src/features/subscribers/`: types, schema, model, repository, service, controller, routes, email
- [x] `apps/server/src/app/routes.ts`: mount `/api/subscribers`
- [x] `apps/server/src/testing/fakes.ts`: in-memory subscriber repository
- [x] Server tests: schema, service, API
- [x] `apps/client/src/types/api.ts`: subscriber request/response contract
- [x] `apps/client/src/lib/api.ts`: `subscribe()`
- [x] `features/playbook/PlayBookPdfSection.tsx` + `usePlayBookSubscribe.ts`
- [x] `content/playbook.ts`: capture copy matched to what actually happens
- [x] `content/playbook.ts`: `workbook` content — audit sheets, worksheets, checklists
- [x] `features/playbook/WorkbookPage.tsx` + print CSS
- [x] `config/routes.ts`: `workbook` route; `pages.ts`: `noIndex`, out of the sitemap
- [x] `build-seo.ts`: confirm noindex routes are excluded

### Phase 6 — Analytics events (§23)

- [x] `lib/analytics.ts`: add `offer_viewed`, `guarantee_viewed`, `playbook_viewed`, `playbook_download_requested`, `contact_form_submitted`
- [x] Wire the new events at their call sites
- [x] Confirm no privacy claim changes (no provider is being added)

### Phase 7 — Documentation

- [x] `docs/business-offer.md`: the full commercial record (§37)
- [x] `docs/business-offer.md`: decision register (§38)
- [x] `README.md`: replace "commercial decisions still open" with "decided — see docs/business-offer.md"
- [x] `README.md`: placeholder table reduced to what genuinely remains
- [x] `README.md`: document the subscribers endpoint and the workbook route

### Phase 8 — Tests

- [x] `content.test.ts`: invert the response-guarantee assertions (now ON, remedy real)
- [x] `content.test.ts`: **no `[PLACEHOLDER]` anywhere in the content layer** — the §39 guard
- [x] `content.test.ts`: pricing consistency — one launch figure, one monthly figure, site-wide
- [x] `content.test.ts`: no "unlimited revisions" language survives
- [x] `content.test.ts`: no `24/7` claim in the contact or guarantee copy
- [x] `content.test.ts`: guarantee copy still promises response, never resolution
- [x] `content.test.ts`: FAQ covers all 20 §34 topics
- [x] `HomePage.test.tsx`: prices render, guarantee renders, hero is CTA-only
- [x] `PlayBookPage.test.tsx`: capture form present, free content still complete
- [x] New `WorkbookPage.test.tsx`

### Phase 9 — Final QA (§40)

- [x] `npm run verify` green
- [x] Repository-wide placeholder sweep — zero in production UI
- [x] Grep for contradictory pricing
- [x] Grep for contradictory guarantee language
- [x] Grep for "maintenance" language that minimises the recurring service
- [x] Reduced-motion and accessibility unaffected
- [ ] Implementation report

---

## 5. Risks

| Risk                                                                     | Mitigation                                                                                                                             |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Price drift between homepage, services, FAQ, terms, docs                 | Single `pricing` source + a test that sweeps every content string for a currency figure that isn't one of the three sanctioned amounts |
| Response guarantee becomes a resolution SLA through a copy edit          | Existing test on `/not a resolution/i` kept, plus a new one on the remedy wording                                                      |
| `/playbook/workbook` gets indexed and the capture form becomes pointless | `noIndex: true` + excluded from sitemap + unlinked + asserted in test                                                                  |
| Legal pages read as if reviewed                                          | Keep the on-screen "not reviewed by a lawyer" notice; the new terms are plain-English business rules, not legal drafting               |
| Bundle size                                                              | No new dependencies. Print CSS is a media query, capture form reuses existing `Field` primitives.                                      |
