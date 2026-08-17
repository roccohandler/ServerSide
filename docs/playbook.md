# The PlayBook

The free resource, and the top of the funnel. This file explains how it is put together
and the rules it follows, so a future change does not quietly turn it into a brochure.

[`docs/business-offer.md`](business-offer.md) stays authoritative for anything commercial.

---

## 1. What it is

**The Service Business Website PlayBook** — twenty improvements that turn more of the
visitors a service business already has into calls and quote requests.

|             |                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Public page | `/playbook` — the whole thing, unfolded, no email required. Carries the email form too.        |
| Workbook    | `/playbook/workbook` — `noindex`, unlinked. Print it to PDF.                                   |
| Content     | `apps/client/src/content/playbook.ts`                                                          |
| Types       | `PlaybookPrinciple`, `PlaybookStageMeta`, `ScorecardCategory`, `ScorecardBand`, `PriorityTier` |
| Guards      | `apps/client/src/content/playbook.test.ts`                                                     |

---

## 2. The three rules

1. **No invented statistics.** Where research is referenced it is named, and the limits of
   what it actually studied are stated. Checkout usability work from an ecommerce lab
   supports "ask for less"; it is not a benchmark for how many fields a plumber's quote
   form should have.
2. **No promised result.** "Reduces friction" and "makes the next step obvious" are
   defensible. "Increases leads by 30%" is not, from anybody.
3. **Every improvement is something the reader can act on today**, on their own site,
   without hiring anybody.

A test sweeps the rendered page for percentages and for the claims this business has
decided not to make.

---

## 3. The free half is the larger half

Everything is on the public page: all twenty improvements with their practices, quick
tests and examples, the six-stage framework, the priority tiers, and the full forty-point
assessment. Nothing is behind a `<details>` and nothing is behind the email form — a test
asserts both.

What the workbook adds is paperwork, not ideas: audit sheets with boxes, prompts with
lines to write on, a printable scorecard. Somebody who reads the page and never gives us
an email address should still leave able to find real problems on their own website.

This is not generosity. It is the only version that makes the paid service look like what
it is: the same work, done for them, by somebody who does it every day.

---

## 4. The six stages

The order is the order it happens in. A weak link early makes everything after it
irrelevant, which is the argument for grouping rather than listing.

| #   | Stage           | Improvements                                                      |
| --- | --------------- | ----------------------------------------------------------------- |
| 01  | Get found       | 01 local relevance, 02 search intent                              |
| 02  | Get understood  | 03 clarity, 04 first screen, 05 hierarchy, 06 navigation          |
| 03  | Get experienced | 07 speed, 08 mobile, 09 accessibility, 10 colour                  |
| 04  | Get trusted     | 11 trust, 12 proof placement, 13 expectations                     |
| 05  | Get contacted   | 14 cta, 15 forms, 16 service pages, 17 friction, 18 message match |
| 06  | Get better      | 19 measurement, 20 continuous improvement                         |

**Numbers run 01–20 down the page, in stage order**, so the sticky navigation and the
numbering can never disagree. A test asserts the numbering and that each stage stays
contiguous.

### The deliberate overlaps

Four pairs sit next to each other on purpose, and each names the other in
`relatedPrinciples` rather than pretending otherwise:

- **Clarity / The first screen** — what the screen _says_ versus how to _evaluate_ the
  whole screen in five seconds.
- **Trust / Proof placement** — what evidence exists versus putting it beside the claim.
- **Measurement / Continuous improvement** — what to count versus the loop that uses it.
- **Forms / Friction** — the form itself versus every other step in the way.

---

## 5. The shape of an improvement

Every one carries the same eight parts, and all of them are **required by the type** — a
half-written improvement is a compile error, not a gap discovered on the live page. That
is how §26's "fail loudly on malformed content" is satisfied without a runtime validator
shipping to production to check content that cannot change at runtime.

| Field          | What it is                                 |
| -------------- | ------------------------------------------ |
| `metaConcept`  | The sentence somebody repeats a week later |
| `uxProblem`    | What goes wrong                            |
| `consequence`  | What it costs, in business terms           |
| `principle`    | The rule, in one line                      |
| `practices`    | Three to six things to do                  |
| `quickTest`    | Something checkable in under five minutes  |
| `whyItMatters` | Why it is worth doing at all               |
| `stage`        | Which of the six it belongs to             |

Optional: `example` (weak versus clearer), `research` (named and bounded), `warning`,
`chain`, `relatedPrinciples`, `serviceNote`.

`serviceNote` is the **only** place an improvement may mention the paid service. A free
resource that sells on every page is an advert and gets read like one.

---

## 6. The assessment

Twenty categories, two points each, forty available. `useWebsiteScore` owns the state.

- **The total is the least interesting output.** The five weakest categories are the
  point, because that is a work list somebody can start on Monday.
- **Only produced when all twenty are scored.** A partial assessment would rank whichever
  categories somebody answered first, which looks like an answer while being worse than
  none.
- **Real radios in real fieldsets**, keyboard operable, total announced with
  `aria-live="polite"`. The page contains an improvement about accessible forms; the one
  interactive thing on it has to mean that.
- **Every category is readable before anything is interactive**, so a crawler, a printer
  and a browser with a failed bundle all still get the whole assessment.
- **`localStorage`, and nowhere else.** The copy says so and there is a visible reset. The
  privacy page needs no change because nothing leaves the device. Unrecognised or corrupt
  stored data is discarded rather than trusted — storage is user-writable and survives
  deploys.

Bands cover 0–40 with no gap and no overlap; a test walks every possible score. They are
labelled an **illustrative self-assessment**, not a validated benchmark, and nothing
claims a score predicts revenue.

---

## 7. Where to start

Two lists, deliberately distinct:

- **Static priority tiers** (`playbook.priorities`) for anybody who has not scored. Every
  improvement appears exactly once across the three tiers — a test asserts it.
- **Your weakest five**, generated from the assessment, for anybody who has.

Somebody who skims deserves an answer; somebody who does the work deserves a better one.

---

## 8. Delivery

A `/playbook/get` used to sit beside `/playbook` here, carrying a second copy of the same
form for a salesperson to read out on a call. It was removed in the value-per-second pass:
`/playbook` is shorter to say, the form was already on it, and nothing on the site linked
to the second page. Only the page went — the hook, the endpoint and the delivery logic
below are unchanged.

```
/playbook          read it all free, and the one field is on the page
       ↓
POST /api/subscribers
       ↓
   PLAYBOOK_PDF_URL set?
       ├── yes → subscriber is emailed the workbook link     → delivery: "sent"
       └── no  → owner is notified and sends it by hand      → delivery: "queued"
```

The response carries `delivery`, and **the confirmation copy is chosen from it**. That is
the whole reason the field exists: there is no path through this code that tells somebody
to check an inbox nothing is filling.

To turn on automatic delivery: open `/playbook/workbook`, print to PDF, host the file, set
`PLAYBOOK_PDF_URL`. Nothing else changes.

Consent wording is duplicated as `PLAYBOOK_CONSENT_TEXT` on the server and stored with
every record, pinned by a test on both sides — so what is stored always matches what the
person was shown. There is no sequence and no list; adding one means changing that
sentence first and asking people to opt in separately.

---

## 9. Qualification

`config/market.ts` holds the service area and the ideal-customer profile.
`content/qualification.ts` turns them into copy, rendered on `/services` — **not** on the
PlayBook, because putting a fit test in the middle of a gift turns it into a filter.

The rules:

- **Lead with the reason, not the number.** "Enough customer volume for this to pay for
  itself" is something somebody can check against their own business.
- **The `$1M+` guideline comes second**, and `idealCustomer.showRevenueGuideline` removes
  it in one edit.
- **Describe fit with qualities**, not revenue alone. Eight signals, and they matter more
  than the figure.
- **Nobody is ever told they do not qualify.** Below the profile, the recommendation is
  the free PlayBook. There is always a route to say "I think I am a fit anyway".

A test asserts no rejection language appears anywhere in that file. A business too small
this year is a client in three, and how this page treats them now decides whether they
come back.

---

## 10. Performance

The PlayBook argues about page weight, so it has to be honest about its own.

The three PlayBook routes are **lazy-loaded**. Twenty improvements written out in full,
the assessment, and a workbook that renders all of it again for print came to roughly a
third of the bundle — carried by every homepage visitor, most of whom never open it.
`/playbook/workbook` in particular is a production tool that has no business in the bundle
a customer downloads.

Everything else stays eagerly imported: the marketing pages are small and share almost all
of their components.

No new runtime dependency was added for any of this. The stage navigation is
`useActiveSection` — an IntersectionObserver and about thirty lines. The PDF is produced by
the browser's own print renderer.

---

## 11. Analytics

`playbook_viewed`, six `playbook_stage_viewed` events, `assessment_started`,
`assessment_completed` (carrying the score), `playbook_download_requested`,
`playbook_download_failed`.

Per stage rather than per improvement: six rows tell you how far people read, and twenty
near-identical rows tell you the same thing while making the report worse.

**No provider is configured**, so none of it is transmitted. The privacy page says so, and
that stays true until somebody wires a tag manager into `index.html` — at which point
`content/legal.ts` changes in the same commit.

---

## 12. Changing it

- Adding an improvement means **twenty-one**, and several tests will say so. Update the
  count, the scorecard, the priority tiers and the maximum score together.
- Every scorecard category must point at a real `principleId`.
- Every improvement must appear in exactly one priority tier.
- Rewording the consent means changing `PLAYBOOK_CONSENT_TEXT` too.
- Nothing may move behind a `<details>`, and nothing may leave the public page for the
  workbook alone.
