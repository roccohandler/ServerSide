# Value Per Second

**Created:** 2026-08-11

|                            | Before                      | After                           |
| -------------------------- | --------------------------- | ------------------------------- |
| Built pages                | 18                          | **17**                          |
| Rendered homepage sections | 20                          | **17**                          |
| FAQ items on the homepage  | 31                          | **8**                           |
| Header nav items           | 5                           | **4**                           |
| Staggered animations       | 32 of 33                    | **10 of 33**, all in an `<ol>`  |
| Eager JavaScript           | 444.7 kB / 136.7 kB gzipped | **444.3 kB / 134.4 kB gzipped** |
| Tests                      | 413 across 29 files         | **436 across 30 files**         |

`npm run verify` green throughout.

**The payload barely moved, and that is the honest result.** Everything cut from the
homepage still ships, because `/services` — where it went — is an eagerly imported route.
The win here is a visitor's _attention_, not their bandwidth; the bandwidth win was the
previous pass, which took the shared chunk from 236 kB to 114 kB by getting four lazy
routes' copy out of the barrel. Reporting these as one number would flatter both.

> Every second a visitor spends on this website must return more value than the second
> cost them. If it does not, the second should not exist.

This is the site's central positioning **and** its build constraint. A business that sells
websites which respect the customer's time cannot ship a website that does not. The site
is the proof, or the claim is marketing.

`docs/business-offer.md` remains authoritative on every commercial fact. Nothing here
changes a price, a term, a guarantee or a scope quantity.

---

## 1. The test

Applied to every page, every section and every element. Five questions, in order — the
first failure is a failure.

1. **What value does this deliver?** Name it in one sentence, in the reader's terms. If
   the sentence is about us rather than about them, it has already failed.
2. **Could it be delivered faster?** Fewer words, fewer steps, fewer screens.
3. **Could it be delivered more clearly?** Would somebody who does not work in this
   industry understand it on the first read?
4. **Is it duplicated?** Does another page or section already do this job? Two things
   doing one job is one thing plus waste.
5. **Does the user actually need it?** Not "is it true", not "is it good" — **need**.

And the quality gate, which decides ties:

> **If removing an element has no meaningful negative consequence: remove it.**

Note the word _meaningful_. Something that costs the visitor zero seconds and zero
attention is not made better by deleting it — see the Testimonials verdict below, which
is the test returning **keep** and is included precisely because a test that only ever
says "cut" is not a test.

## 2. What this philosophy is not

It is not "make the site short". Length is not the metric — **value per second** is. The
audit page takes five minutes and is the highest-value surface on the site, because every
one of those seconds returns something about the reader's own business.

It is not a licence to strip out proof, caveats or limitations. Those are the highest
value-per-second content on the site: they are what a sceptical reader is actually
scanning for, and removing one to save three seconds trades a second of reading for the
whole credibility of the claim it qualified.

And per the brief's own warning: **do not build an agency website that talks endlessly
about how efficient it is.** The philosophy is demonstrated, not narrated. There is no
"our philosophy" section on this site and there should never be one.

---

## 3. Research — current practice, August 2026

Done before any change, per the brief. Three findings shaped the decisions below.

| Finding                                                                                                                                                                                                                         | Source              | What it changed here                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The 2026 thresholds are unchanged: **LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, each at the 75th percentile of real visits.** p75 means the fourth-slowest visitor in four — a mid-range phone on a patchy connection, not a laptop. | corewebvitals.io    | The budget in §7 measures **both gzipped and raw** bytes: gzipped is what crosses the network and drives LCP, raw is what the phone parses and shows up in INP.           |
| **INP is the most commonly failed of the three in 2026.** Practitioners recommend alerting at 80 % of each threshold rather than at the threshold.                                                                              | webvitals.tools     | The budget is set just above the current measured value rather than at a round ceiling. A budget with room in it is a budget that gets spent without anybody deciding to. |
| Above the fold, the highest-leverage element on a service-business page is the headline stating a specific, benefit-oriented value proposition; trust signals belong near the decision point, not in a separate later section.  | bspkn.co, webfx.com | The hero keeps its price on the first screen and its trust points beside the action. Vendor-published uplift percentages are **not** repeated on the site.                |

**One source is deliberately not used.** Several of these articles publish figures of the
form "businesses that rewrite their headline typically see a 15–35 % increase". That is a
vendor's marketing claim about its own service, with no method, no sample and no
denominator. It is exactly the kind of number this site exists to not print. It is
recorded here as research and appears nowhere in `src/content`.

---

## 4. The route audit

18 built pages. Every one against the five questions.

| Route                | The job it does                                                   | Verdict                                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                  | Convince an owner to ask for a review                             | **Keep — cut hard.** 20 sections. See §5.                                                                                                                                                   |
| `/services`          | Depth for somebody who has decided to research                    | **Keep.** It is the destination for everything the homepage cuts, which is what makes cutting the homepage safe rather than lossy.                                                          |
| `/portfolio`         | Show what the work looks like                                     | **Keep.**                                                                                                                                                                                   |
| `/audit`             | Diagnose the reader's _own_ website in five minutes               | **Keep — this is the flagship.** Highest value per second on the site: it is the only page that returns something about the reader rather than about us.                                    |
| 5 × industry page    | Rank for "hvac website" and answer that reader in their own terms | **Keep, all five.** They are search entry points, not browse destinations — they are correctly absent from the header nav. Each is a different argument, and a test pins that they stay so. |
| `/website-teardown`  | Prove what a review finds, before asking for one                  | **Keep.** Proof, per §10 of the brief.                                                                                                                                                      |
| `/playbook`          | Give the whole method away free                                   | **Keep, demote.** Highest _total_ value on the site, low value _per second_ for a first-time visitor. Removed from the header nav; still in the footer, still linked from the audit result. |
| `/playbook/get`      | Capture an email in exchange for the PlayBook                     | **CUT.** See below — this is the clearest failure on the site.                                                                                                                              |
| `/playbook/workbook` | Printable production tool for the owner                           | **Keep.** `noindex`, in no sitemap, linked from nowhere public. It costs a visitor exactly zero seconds. Question 5 is about the _user_, and no user ever reaches it.                       |
| `/about`             | Who is the person who would be doing this                         | **Keep.** One-person business; for this buyer the person _is_ the product.                                                                                                                  |
| `/contact`           | The conversion                                                    | **Keep.**                                                                                                                                                                                   |
| `/privacy`, `/terms` | Legal, and load-bearing — the audit stores answers in the browser | **Keep.**                                                                                                                                                                                   |

### Why `/playbook/get` is cut

It fails questions 4 and 5 outright, and the evidence is in the codebase rather than in
an opinion:

- **The form is already on `/playbook`.** `PlayBookPdfOffer` renders the same fields,
  bound to the same `usePlayBookRequest` hook, posting to the same `/api/subscribers`
  endpoint, from the same `playbook.pdfOffer` content. Two pages, one job, one form.
- **Nothing on the site links to it.** Not the header, not the footer, not the PlayBook.
  A page with no inbound link is a page whose value nobody could find.
- **Its own stated reason defeats itself.** The route comment says it exists because a
  salesperson needs a URL short enough to read out on a call. `/playbook` is shorter to
  say than `/playbook/get`.
- **It asks a visitor to pay — with an email address — for something the page one level
  up gives away free.** That is negative value per second, and it quietly undercuts the
  "nothing essential sits behind an email address" promise `/playbook` makes out loud.

**What is kept:** the email capture itself, the `usePlayBookRequest` hook, the server's
subscriber feature and the workbook delivery. None of that is the problem. The second
page wrapped around them was.

---

## 5. The homepage audit

The homepage rendered **20 sections**. A visitor scrolling all of it covers roughly twelve
thousand pixels to reach a call to action that was also on the first screen.

| #   | Section                 | The job                                      | Verdict                                                                                                                                                     |
| --- | ----------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Hero`                  | What, who for, what it costs, what to do     | **Keep.**                                                                                                                                                   |
| 2   | `ReframeSection`        | Why should I care                            | **Keep.** Also carries the trade chips — the only route into the industry pages from the homepage.                                                          |
| 3   | `OpportunitySection`    | What is one more customer worth              | **Keep — proposed for merge, and the merge was rejected.** See below.                                                                                       |
| 4   | `ConversionSection`     | Where the demand you already have leaks away | **Keep — same.**                                                                                                                                            |
| 5   | `EvidenceSection`       | Why believe any of this                      | **Keep.** Proof with its limitations attached.                                                                                                              |
| 6   | `DemoSection`           | Show a leak rather than describe one         | **Keep — and it is the best thing on the page.** Interactive before/after: value delivered in about two seconds, with no reading.                           |
| 7   | `WhatYoureBuying`       | The value stack as an equation               | **Cut → `/services`.** It restates `SystemSection` in a second notation. Question 4.                                                                        |
| 8   | `SystemSection`         | The mechanism                                | **Keep.**                                                                                                                                                   |
| 9   | `DifferentiatorSection` | Us versus hiring a web designer              | **Cut → `/services`.** `ManagementSection` makes this argument with the actual monthly work in it. A competitor comparison is depth, not a first read.      |
| 10  | `ManagementSection`     | What keeps happening after launch            | **Keep.** This is what is actually being sold.                                                                                                              |
| 11  | `LaunchSection`         | How long, and what do I have to do           | **Keep.**                                                                                                                                                   |
| 12  | `TrustSection`          | These are demonstrations, not client work    | **Keep.** Honesty immediately before the grid it qualifies.                                                                                                 |
| 13  | Examples                | Can I see anything                           | **Keep.**                                                                                                                                                   |
| 14  | `TestimonialsSection`   | Real customer words                          | **Keep — the test says keep.** It renders `null`: no clients, no invented quotes. It costs the visitor zero seconds, so the quality gate does not reach it. |
| 15  | `GuaranteeSection`      | What if it goes wrong                        | **Keep — proposed for merge, rejected.** See below.                                                                                                         |
| 16  | `CancellationSection`   | What if I want out                           | **Keep — same.**                                                                                                                                            |
| 17  | `EntrySection`          | Three ways this usually starts               | **Cut → `/services`.** Its three cards restate the pricing tiers with different headings, immediately above the pricing tiers.                              |
| 18  | `OfferSection`          | The price                                    | **Keep.**                                                                                                                                                   |
| 19  | `ReviewOfferSection`    | The free assessment — the actual ask         | **Keep.**                                                                                                                                                   |
| 20  | FAQ                     | The last objections                          | **Keep, capped at 8 of 31.** The rest move to `/services`, linked from under the list.                                                                      |
| 21  | `CtaBanner`             | The close                                    | **Keep.**                                                                                                                                                   |

### The two merges that were rejected, and why that matters

Both were on the plan when this document was first written. Both failed the test when it
was actually applied to them rather than to a summary of them.

**`Opportunity` + `Conversion`.** The case for merging was that both answer "what is this
worth". They do not. One asks what a customer is worth; the other asks where you lose
them. Question 4 is _is it duplicated_, and the honest answer was no. The merge would also
have removed no words at all — it would have moved a `<section>` boundary and cascaded
every heading inside `ConversionSection` down a level.

**`Guarantee` + `Cancellation`.** These genuinely are one question — "what is my
downside?" — so the merge survived question 4. It failed question 2. `GuaranteeSection` is
already the longest block on the page; adding the exit terms would have produced a single
280-line band a reader has to read _into_ to find the part they care about, in place of
two labelled bands they can skip between. **Scannability is value per second.** A heading
is a way of not reading something.

A related decision that came up while cutting: **the response guarantee's limits were not
moved off the homepage.** Three columns of operational detail and a list of exclusions are
the heaviest thing in `GuaranteeSection`, and relegating them to `/terms` would have been
the single largest byte saving available. They stayed. A promise published more
prominently than its limits is a different promise, and §2 of this document says so.

**Result: 20 rendered sections → 17, and 31 FAQ items → 8.** Three cut to `/services`,
zero merges, nothing deleted outright. Every word removed from the homepage is still
published where a reader who wants it will find it — and `ServicesPage.test.tsx` asserts
each one arrived, which is what stops the next pass from turning a move into a deletion.

### The tone cascade, recorded because it was not obvious

`EntrySection` sat between the exit terms and the price and its muted band was what let
`OfferSection` be white. Removing it put two white bands together, which makes the pricing
cards — `--color-surface`, separated from their background by a 1px border — effectively
vanish. Repairing it took three tone changes for one deletion: the price took muted, the
free-review block took default, the FAQ took muted.

Nothing would have caught that. `HomePage.tsx` described the rule in three separate
comments and no test enforced it. There is one now.

---

## 6. Job / User question / Desired outcome

Required by the brief for every page and every section. It lives here rather than in
`src/content` on purpose: it is a design artifact, and adding a `job` field beside every
`title` and `description` in the content layer would be a third description of the same
thing — the test applied to the test.

| Page                | Job                                    | The question in the user's head      | Desired outcome                    |
| ------------------- | -------------------------------------- | ------------------------------------ | ---------------------------------- |
| `/`                 | Convert a cold owner into an enquiry   | "Can this person get me more calls?" | Requests the free assessment       |
| `/services`         | Answer a researching buyer in full     | "What exactly am I paying for?"      | Reaches the price convinced        |
| `/portfolio`        | Show the standard of work              | "Does their stuff look any good?"    | Believes the work is competent     |
| `/audit`            | Diagnose their site, free              | "What is wrong with _mine_?"         | Finishes, and sends the result     |
| industry pages      | Meet trade-specific search intent      | "Do they understand _my_ trade?"     | Starts the audit, trade pre-filled |
| `/website-teardown` | Prove the review is worth having       | "What would I actually get?"         | Requests the review                |
| `/playbook`         | Give the method away, build authority  | "Can I just do this myself?"         | Either does it, or hires it out    |
| `/about`            | Make the person credible               | "Who am I actually dealing with?"    | Trusts a one-person business       |
| `/contact`          | Take the enquiry with minimum friction | "How do I reach them?"               | Submits, or calls                  |

### The homepage, section by section

The seventeen bands, in order. The point of writing it out is that **the third column has
to be a different sentence every time.** Two sections answering the same question in the
reader's head is the duplication test failing, and it is far easier to see here than in a
1,400-line page component.

| #   | Section      | Job                                               | The question in their head            | Desired outcome                     |
| --- | ------------ | ------------------------------------------------- | ------------------------------------- | ----------------------------------- |
| 1   | Hero         | State the offer, the price and the action         | "What is this and is it for me?"      | Keeps reading, or acts immediately  |
| 2   | Reframe      | Move the subject from websites to customers       | "Do I even need a new website?"       | Recognises their own site           |
| 3   | Opportunity  | Put a value on one more customer                  | "Is any of this worth paying for?"    | Has a frame for the price           |
| 4   | Conversion   | Show where demand already leaks away              | "Where am I actually losing people?"  | Sees a fixable gap                  |
| 5   | Evidence     | Answer "says who" with sources and their limits   | "Why should I believe you?"           | Stops discounting the argument      |
| 6   | Demo         | Show a leak instead of describing one             | "What does that look like?"           | Sees it in about two seconds        |
| 7   | System       | Name what gets built                              | "What do I actually get?"             | Understands the deliverable         |
| 8   | Management   | Justify a recurring fee with recurring work       | "What am I paying for every month?"   | Sees work, not a subscription       |
| 9   | Launch       | Set the timeline and their own workload           | "How long, and what do I have to do?" | Stops imagining a six-month project |
| 10  | Trust        | Disclose that the examples are demonstrations     | "Are these real clients?"             | Trusts the next section more        |
| 11  | Examples     | Show the standard of the work                     | "Is their work any good?"             | Believes it is competent            |
| 12  | Testimonials | Carry real customer words — none yet, renders nil | "Has anyone actually hired them?"     | (Nothing, honestly, for now)        |
| 13  | Guarantee    | State what is promised and what is not            | "What if this does not work?"         | Sees the limits stated first        |
| 14  | Cancellation | State the exit                                    | "What if I want out?"                 | Stops treating it as a lock-in      |
| 15  | Offer        | Publish the price and the terms                   | "What does it cost?"                  | Judges the number against the value |
| 16  | Review offer | Make the ask, and answer the last objection       | "What do I actually get if I ask?"    | Requests the review                 |
| 17  | FAQ          | Clear the residue                                 | "But what about…?"                    | Runs out of reasons not to          |

**Two rows are worth reading closely.** Rows 3 and 4 are the merge this pass rejected —
different questions, so they stayed apart. Row 12 answers a question with nothing, which
is the correct behaviour while there are no customers and the reason that section renders
`null` rather than an invented quote.

---

## 7. The philosophy, made enforceable

The brief's §21 — apply it to implementation, not just copy. All four of these fail the
build, which is the only kind of principle that survives contact with a deadline.

| Guard                                                                   | Where                                  | What it stops                                                                           |
| ----------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------- |
| **Eager payload budget** — bytes downloaded before anything is rendered | `scripts/check-budget.ts`, in `verify` | A page-weight regression landing silently, as the 236 kB barrel regression did          |
| **Homepage section budget** — a hard cap on rendered bands              | `HomePage.test.tsx`                    | The page growing back one well-meaning section at a time                                |
| **Tone alternation** — no two neighbouring bands on the same surface    | `HomePage.test.tsx`                    | Pricing cards and FAQ rows vanishing into a same-coloured background after a reorder    |
| **No orphan routes** — every route linked, or its absence written down  | `content.test.ts`                      | Another `/playbook/get`: a page nothing links to, doing a job another page already does |

Three notes on how they are set, because a guard that is wrong is worse than none:

- **The payload budget parses the built HTML rather than trusting the bundler's report.**
  It sums the entry chunk, every `modulepreload` and every stylesheet, and it throws if it
  finds zero of either — a measurement that silently measures nothing is exactly the
  failure the whole file exists to prevent. It runs from `scripts/build.ts`, so it runs on
  every `npm run verify` rather than only in CI.
- **The budget numbers are the measured cost plus a small allowance**, not a round number
  with headroom. The allowance is bigger than a copy edit and smaller than a new
  dependency or a new eager route, which are the only things that have ever actually moved
  this number. Practitioner guidance for 2026 is to alert at 80 % of Google's thresholds
  rather than at them; the same logic applies to bytes.
- **The section budget is a ceiling, not a target.** Adding the eighteenth section is
  allowed. It just cannot be done without changing a number in front of a person, next to
  a comment asking what the section delivers that `/services` could not carry.

---

## 8. Motion, and what it is allowed to say

The brief: animation must communicate something. Applied to `Reveal`, it did not.

The component's own comment said it existed "to walk the reader through the six components
of the offer rather than to decorate the page". By the time anybody counted it was on
**33 lists across 24 files, 32 of them staggered** — including three-column grids of cards
with no order at all.

A staggered reveal makes a claim: _these arrive one after another because the order means
something_. On the funnel, the launch timeline, the six stages and the twenty
improvements, that is true, and the motion carries information the layout cannot. On a
grid of service categories it is false, and the reader pays for it — 460 ms of transition
plus up to 420 ms of delay before the last card is readable, to be told about a sequence
that does not exist.

**`index` became `sequence`, and only `sequence` produces a delay.** The rename is the
mechanism: it made all 33 call sites a type error, so each had to be looked at instead of
left as whatever it already was. Ten kept the stagger — every one of them inside an `<ol>`.
Twenty-three now fade in place, at once. `Reveal.test.tsx` pins the contract and then
reads the repository to assert no `sequence` is ever passed outside an `<ol>`, because
"we were disciplined about this" is precisely the claim that was already false once.

Two more, both on the first screen, found by actually running the brief's §23 test rather
than assuming the hero passed it:

- **The call to action was fading in 210 ms late**, on top of a 480 ms fade, so the button
  finished arriving most of a second after the page painted. The hero's own comment says a
  visitor sent by a referral is already sold and should not have to read a sales page to
  act; making them watch the button appear is the same mistake in motion. The action and
  the reassurance beside it now have no delay. Everything above them can arrive politely.
- **The two prices were separated by a vertical rule**, which reads as a choice. They are
  both halves of one offer, and a reader who gives the screen five seconds and leaves
  thinking it is "$2,500 _or_ $299 a month" has been misled by a divider — a reading that
  makes the cheaper number look like the whole price. The rule is now the word "plus",
  rendered rather than `aria-hidden`, because a screen-reader user had neither.

The `<h1>` remains the one element with no entrance animation: it is the
largest-contentful-paint candidate and fading it in would push back the moment the page
counts as painted.

### The §23 comprehension test, run

| Time | What a first-time reader has                | Verdict                                                                                                                                         |
| ---- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 5 s  | Eyebrow, headline, both prices, button      | **Pass.** What it is, who for, what it costs, what to do — all four without scrolling. The price ambiguity above was the one defect, now fixed. |
| 15 s | \+ subheading, differentiator, trust points | **Pass.** Names the reader's trade and the city; "one person, start to finish" is the difference in six words.                                  |
| 30 s | \+ the reframe and the trade chips          | **Pass.** They can check the argument against their own site, and their trade is a link.                                                        |

**The headline was not rewritten**, and that is a decision rather than an omission — see
§3 on the one source deliberately not used, and §9.

---

## 9. What Core Web Vitals work was already right

Checked rather than assumed, because §12 asks for LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1
and three of the usual causes were already handled:

- **No web fonts at all.** `--font-sans` is a system stack. Zero font requests, no
  flash of invisible text, nothing render-blocking. This is worth stating because it is the
  kind of thing a redesign quietly undoes.
- **Every `<img>` carries `width`, `height`, `loading="lazy"` and `decoding="async"`.**
  Intrinsic dimensions on every image is the single largest CLS lever and both image sites
  on the site already had it.
- **No third-party scripts.** The CSP is `script-src 'self'` and analytics is a seam with a
  no-op `track()`. Nothing can inject a long task into INP.

What is left is genuinely unmeasurable here: all three thresholds are p75 of real visits,
and there is no field data. The payload budget in §7 is the proxy, and §10 records it as
one.

---

## 10. What was deliberately not done

- **The industry pages were not cut.** They are the only realistic organic-search strategy
  this site has, they are already absent from the header nav, and a visitor who lands on
  one from a search is getting a page written for their exact question. Cutting them would
  have been applying the philosophy to the wrong metric — total pages, rather than value
  per second.
- **No "our philosophy" or "how we work" section was added anywhere.** The brief warns
  against exactly this and it is the easiest mistake to make with a philosophy this
  quotable. Value per second appears in this document and in the guards. It does not
  appear as a marketing section on a marketing website.
- **No product was invented.** The brief raises a "Value Per Second Audit" as a concept to
  consider. The site already has the Website Revenue Audit, which does that job. Renaming
  a live product is a commercial decision and belongs to the owner.
- **The headline was not rewritten.** §8 records the §23 test being run rather than
  assumed: the first screen passes at all three durations, and it publishes a price, which
  almost nobody in this market does. It produced two defects, both fixed. Rewriting a
  headline that passes — on the strength of a vendor-published "15–35 % uplift" figure with
  no method, sample or denominator behind it — would be changing the single most important
  element on the site for a reason §3 rejects. **What it actually needs is a measurement**,
  and that is blocked on the same analytics decision as everything else in
  `docs/CONVERSION-UPGRADE-PLAN.md` §2.
- **`Reveal` was not deleted.** The quality gate says remove anything whose removal costs
  nothing, and dropping the fade entirely was on the table. It stayed: it is zero
  dependencies, it degrades to fully visible for reduced-motion and for browsers without
  `IntersectionObserver`, and a fade is not a claim about the content the way a stagger is.
  The stagger was the part making a false claim, so the stagger is the part that went.

---

## 11. Auditing this pass the way it audited the site

Phase 9f of the conversion plan turned Phase 1's dead-content check on the code Phase 1
had written, and found four dead exports and a real bug. Same discipline here.

### Every new guard was made to fail

A guard that has never failed is a guard nobody has tested. Each was checked by injecting
a real violation and confirming the failure, then reverting:

| Guard            | Violation injected                          | Result                                                                   |
| ---------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Stagger policy   | `sequence={0}` on the exit-terms `<ul>`     | Failed, naming `CancellationSection.tsx:35`                              |
| Anchor render    | A `sections.ghost` nothing renders          | Failed, naming the constant and where to delete it                       |
| Tone alternation | Removed `tone="muted"` from `OfferSection`  | Failed: _"Bands 12 and 13 after the hero are both default"_              |
| No orphan routes | A `/orphan` route with metadata and no link | Failed, naming both ways to fix it                                       |
| Payload budget   | Lowered the gzip ceiling to 100 kB          | **Failed the build**, and printed the two causes that have ever moved it |

### What the sweeps found

| Sweep                                                 | Result                                                                                                                                                                 |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dead anchor constants in `sections`                   | **One: `contact`.** Named a fragment no component rendered and nothing linked to. Deleted, and the guard above now makes it impossible to add another silently.        |
| Unreferenced CSS module classes (910 scanned)         | **Clean.** The four flagged are `styles[variant]` dynamic lookups on `Button`.                                                                                         |
| Orphaned modules after deleting `/playbook/get`       | **Clean.** `usePlayBookRequest` has exactly one consumer (`PlayBookPdfOffer`); `requestPlaybook` and the subscriber endpoint are still reached.                        |
| `/services` band order after absorbing three sections | **Correct.** default → brand → default ×3 → muted → brand → muted → default → muted → brand. The three consecutive defaults are the pre-existing surface-agnostic run. |
| Which eight FAQ answers the homepage kept             | **Sound.** Cost, contract, payment, after-launch, is-the-monthly-optional, timeline, existing site, can-you-manage-mine. Those are the things people ask first.        |

### The band counts, measured rather than assumed

**Homepage 17. `/services` 11.** The section budget is therefore exactly tight — it has no
slack in it, which is the only kind worth having.

It is worth stating plainly that **the depth page is shorter than the front page**, and
that this is not obviously right. The defence is that the two have different jobs: the
homepage has to do the whole argument for somebody who will never click anything, while
`/services` only has to satisfy somebody who already did. If a future pass wants to argue
the homepage should be shorter still, this is the number to argue with.

**`/services` deliberately has no budget of its own.** A second ceiling nobody could
defend a value for would be the shape of a guard without the substance of one.

### Two accessibility defects, neither of them new

Checking what this pass changed found nothing. Checking what it _should_ have changed and
did not found two — and both had been shipping long before it.

`/services` gained three sections and twenty-three FAQ answers, and nothing verified the
heading outline still held. It did not, and neither did `/portfolio`:

- **`/services` rendered `ServiceList` at level 3 directly beneath the page's `h1`**,
  leaving level 2 empty.
- **`/portfolio` did the same with `PortfolioGrid`**, by taking its default.

Both components default to `3`, which is correct on the homepage — a section heading
occupies level 2 there — and wrong on the page where the list is the first thing under the
title. A screen reader announces that a level was skipped and offers no way to find out
what was in it, and skimming by heading is precisely how that reader handles a long page.

`IndustryPage.test.tsx` has enforced this on the five industry pages since they were built.
**The standard existed and had simply never been pointed at the rest of the site.**
`app/outline.test.tsx` now checks nine pages, including the PlayBook and the workbook,
which had no outline test at all despite being the two longest documents here. Both passed
— but correct-and-untested looks identical to correct, right up until somebody adds a
section.

This is the eager-bundle regression again in a different medium: the defect was never
hidden, it was just never measured.

---

## 12. What is still open

Nothing in this pass is half-finished. These are the things it could not decide alone.

| Open                                                                                                                                                                                                                                                                     | Whose call                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| **Field Core Web Vitals.** Every threshold in §3 is a p75 of real visits. This repository can measure bytes and it cannot measure LCP, INP or CLS, because there is no analytics provider and the CSP blocks one. The budget is a proxy — a good one, and still a proxy. | Owner (§2 of the conversion plan) |
| **Whether the PlayBook should stay a route at all.** It survived on total value. If it turns out nobody reads past the third improvement, the honest move is to cut it to the five that matter — but that is a decision to make from data, not from taste.               | Needs measurement                 |
| **Renaming the Website Revenue Audit.** The brief floats "Value Per Second Audit". It is a live product name and a positioning decision.                                                                                                                                 | Owner                             |

---

## 13. What happened next

The offer rebuild — positioning, three tiers, founding-client pricing, the Launch Standard,
and the bridge from the assessment into the offer — is in `docs/OFFER-REBUILD.md`.

Two of its findings belong here, because both are this document's own subject matter and
both were defects in work done during _this_ pass:

- **`Reveal`'s stagger audit did not extend to the cascade.** Two pricing grids rendered
  two-plus-an-orphan at every desktop width, in two different files, because a
  `min-width: 64rem` rule was written before a `min-width: 48rem` rule that set the same
  property on the same selector. Both media queries match at desktop; equal specificity
  means source order decides. `content.test.ts` fails the build on that shape now.
- **The homepage's "every second must earn its place" was never applied to `/services`.**
  It carried a lone annual price for a plan it never described, and a link the audit
  produced — `/services#offer` — that scrolled nowhere, because the anchor guard checked
  that section ids are rendered _somewhere_ rather than on the page being linked to.

The lesson is the same one §11 recorded and did not fully learn: a guard that reads content
cannot see a defect that lives in the cascade or in a cross-page link. Both now have their
own.
