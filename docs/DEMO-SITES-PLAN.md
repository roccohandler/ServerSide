# Demonstration sites — implementation plan

Five working example websites, one per trade, running inside this application as lazy
routes. No second deployment, no five repositories, no five domains.

The site currently promises examples it cannot show. `PortfolioGrid` renders
**"Live demo not published yet."** five times, and every industry page carries a `demoId`
pointing at a portfolio entry with no `demoUrl`. This closes that.

---

## 1. What the review found, and what it forces

Five facts about this repository decided more of the design than taste did.

| Finding                                                                                                                                                                                  | What it forces                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`vercel.json` has no SPA fallback.** The only rewrite is `/api/(.*)`; every route is a real HTML file written by `build-seo.ts`.                                                       | All 15 demo routes need `routes.ts` entries **and** `pages.ts` metadata, or a hard refresh 404s. Build goes from 17 pages to 32.                     |
| **`demoUrl` and `demoId` already exist** and are already rendered — `PortfolioGrid` switches on `demoUrl`, `industries.ts` carries `demoId`, and a test asserts every `demoId` resolves. | Almost no new wiring. Filling `demoUrl` lights up three surfaces at once.                                                                            |
| **Every route renders inside `SiteLayout`**, which paints the JobForge header and footer.                                                                                                | Demo routes must sit **outside** that `<Route element={<SiteLayout />}>` block, under a `DemoLayout` of their own. This is the one new architecture. |
| **The eager budget is 457.4 kB of 465 kB**, and `content/index.ts` once carried 236 kB of lazy copy into the eager chunk by re-exporting it.                                             | Demo content lives outside the barrel. Non-negotiable — the guard will fail the build, which is the point.                                           |
| **CSP is `img-src 'self' data:`, `script-src 'self'`.**                                                                                                                                  | Inline SVG is fine (it is markup). No external fonts, no CDN, no map embeds.                                                                         |

---

## 2. Decisions taken

Sixteen questions, answered before a line was written.

| #   | Decision           | Chosen                                                     |
| --- | ------------------ | ---------------------------------------------------------- |
| 1   | Demo shape         | Multi-page site with real routes                           |
| 2   | Fictional identity | Named business, **no social proof of any kind**            |
| 3   | Indexing           | `noIndex`, absent from sitemap                             |
| 4   | Demo forms         | Inert, honest inline message, never touches the lead API   |
| 5   | Routes per demo    | Home + Services + Contact                                  |
| 6   | Visual identity    | Distinct palette and type per trade, shared components     |
| 7   | Disclosure         | Persistent bar pinned above every demo route               |
| 8   | Scope              | All five trades                                            |
| 9   | Imagery            | Inline SVG scenes, no photographs                          |
| 10  | Annotations        | Clean site; the reasoning lives on the portfolio card      |
| 11  | Guards             | Own module outside the barrel, own guard suite             |
| 12  | Entry points       | Portfolio cards + matching industry page. No new nav item. |
| 13  | URL shape          | `/demo/<trade>`                                            |
| 14  | Chunking           | Shared shell chunk + one chunk per trade                   |
| 15  | Bar action         | Back to examples, plus the assessment CTA                  |
| 16  | Address            | Service areas by neighbourhood; no street address, no map  |

---

## 3. The honesty rules

This site's entire positioning is that it fabricates nothing. A demonstration site is, by
definition, a fabrication — so the rule is not "invent nothing", it is **invent the
business, never the evidence.**

**Allowed**, because it is set dressing a reader understands as such:

- A business name, a fictional logo mark, a trade, a service list
- Neighbourhood service areas ("Ballard, Fremont, Greenwood")
- A phone number in the **555-01xx** range — reserved for fiction, and it does not dial
- Prices where a trade would publish them, framed as ranges and clearly fictional
- Copy written the way that trade's customers actually search

**Banned**, because it is manufactured proof and the rest of the site refuses to make it:

- Customer reviews, testimonials, quotes, names, star ratings, review counts
- "Licensed & insured", licence numbers, bonding claims, certifications
- Years in business, jobs completed, customer counts, "family owned since 1998"
- Awards, badges, association memberships, "voted best in Seattle"
- Any guarantee, any response-time promise, any outcome claim
- A street address, an embedded map, or anything that pins a real building

Every one of these gets a test. The demo sites will look emptier than a real HVAC site in
exactly one respect — the proof — and that is the correct trade. A prospect who notices is
a prospect who has understood the pitch.

---

## 4. The five businesses

Names are composed from geography plus trade, deliberately generic in construction and
deliberately not checked against the business register. **See §8 — this needs the owner.**

| Trade       | Business                      | Service areas                                     | Palette                 | Angle                                               |
| ----------- | ----------------------------- | ------------------------------------------------- | ----------------------- | --------------------------------------------------- |
| HVAC        | Cascade Comfort Heating & Air | Ballard, Fremont, Greenwood, Wallingford, Phinney | Deep blue + warm orange | Emergency first. Phone never leaves the screen.     |
| Plumbing    | Emerald Line Plumbing         | West Seattle, Burien, White Center, Delridge      | Navy + copper           | Urgent and planned work split before anything else. |
| Roofing     | Rainshadow Roofing            | Shoreline, Edmonds, Lynnwood, Mountlake Terrace   | Charcoal + signal red   | Large infrequent purchase. Process before selling.  |
| Landscaping | Alder & Fern Landscaping      | Kirkland, Redmond, Bothell, Woodinville           | Forest green + cream    | Decided with the eyes. Image-led, seasonal.         |
| Electrical  | Sound Current Electric        | Renton, Kent, Tukwila, SeaTac                     | Near-black + amber      | Residential and commercial separated in one click.  |

Each demo's three pages do the job that trade's own industry page says it must:

- **Home** — who you are, what you fix, where you work, one obvious action. Above the fold.
- **Services** — the trade's real service list, written the way customers describe the job.
- **Contact** — a short quote form asking only what is needed to price the work.

---

## 5. Architecture

```
client/src/
  config/
    demos.ts                  slugs, paths, palette tokens, route helpers
  content/demos/              OUTSIDE content/index.ts. Never re-export.
    types.ts                  DemoSite, DemoService, DemoPalette
    hvac.ts  plumbing.ts  roofing.ts  landscaping.ts  electrical.ts
    demoMeta.ts               15 PageMeta entries (leaf, mirrors industryMeta.ts)
    index.ts                  local barrel — NOT the content barrel
  features/demo/
    DemoLayout.tsx            shell: bar + demo header + outlet + demo footer
    DemoBar.tsx               persistent disclosure + back + assessment CTA
    DemoHeader.tsx            per-trade nav, tap-to-call
    DemoFooter.tsx            service areas, hours, no address
    DemoHomePage.tsx          template, one per trade via content
    DemoServicesPage.tsx
    DemoContactPage.tsx
    DemoQuoteForm.tsx         inert; never imports lib/api
    DemoScene.tsx             inline SVG scenes, selected by trade
    Demo.module.css           layout + per-trade token blocks
    *.test.tsx
```

**Routing.** Demo routes are siblings of the `SiteLayout` block, not children:

```tsx
<Routes>
  <Route element={<SiteLayout />}>…every existing route…</Route>
  <Route path="/demo/:trade" element={<DemoLayout />}>
    <Route index element={<DemoHomePage />} />
    <Route path="services" element={<DemoServicesPage />} />
    <Route path="contact" element={<DemoContactPage />} />
  </Route>
</Routes>
```

**Chunking.** `DemoLayout` and the three page templates are one lazy chunk. Each trade's
content module is a second, loaded by slug through a static map of dynamic imports — a map,
not a template-literal import, so Rollup can see all five and split them.

**Palette.** Each trade sets CSS custom properties on the layout root. One shared component
set, five token blocks, zero duplicated layout CSS.

---

## 6. The checklist

### Phase 0 — foundations

- [x] `config/demos.ts`: five slugs, `demoPath(slug, page?)`, palette token names
- [x] `content/demos/types.ts`: `DemoSite`, `DemoService`, `DemoPalette`, `DemoScene`
- [x] Confirm the demo content modules are absent from `content/index.ts` and stay absent

### Phase 1 — the shell

- [x] `DemoBar` — disclosure, back to examples, assessment CTA, `cta_clicked` with location
- [x] `DemoLayout` — resolves the trade from the URL, 404s on an unknown slug, sets palette
- [x] `DemoHeader` / `DemoFooter` — per-trade nav, tap-to-call, service areas, no address
- [x] Register the routes in `App.tsx` **outside** `SiteLayout`
- [x] Scroll and focus management on demo route changes (SiteLayout's job, redone here)

### Phase 2 — the page templates

- [x] `DemoHomePage` — hero, services strip, service area, why-us, quote CTA
- [x] `DemoServicesPage` — full service list with per-service detail
- [x] `DemoContactPage` — hours, areas, tap-to-call, inert quote form
- [x] `DemoQuoteForm` — validates, never submits, honest inline result, links to assessment
- [x] `DemoScene` — one inline SVG per trade, `role="img"` with a real label

### Phase 3 — content, five trades

- [x] `hvac.ts` — Cascade Comfort Heating & Air
- [x] `plumbing.ts` — Emerald Line Plumbing
- [x] `roofing.ts` — Rainshadow Roofing
- [x] `landscaping.ts` — Alder & Fern Landscaping
- [x] `electrical.ts` — Sound Current Electric
- [x] `demoMeta.ts` — 15 `PageMeta` entries, every one `noIndex: true`

### Phase 4 — visual identity

- [x] Five palette token blocks in `Demo.module.css`
- [x] Per-trade hero treatment driven by content, not by a per-trade component
- [x] Verify contrast on every palette; no palette ships below WCAG AA on body text

### Phase 5 — wiring

- [x] `routes.ts` — 15 demo route constants
- [x] `pages.ts` — spread `demoMeta`, so `build-seo.ts` writes all 15 files
- [x] `portfolio.ts` — set `demoUrl` on all five projects
- [x] Confirm each industry page's `demoId` now resolves to a live demo link
- [x] Portfolio cards carry the three reasoning bullets (decision 10)

### Phase 6 — guards

- [x] Demo content sweep: no review, testimonial, rating, licence, award, years-in-business
- [x] Phone numbers match `/\(\d{3}\) 555-01\d{2}/` and nothing else
- [x] Every demo declares `isFictional: true`; every route renders `DemoBar`
- [x] `DemoQuoteForm` never imports `lib/api` — source-scanning test
- [x] Every demo route is `noIndex` in `pages.ts`
- [x] Heading outline on all 15 demo routes
- [x] Demo content is not reachable from `content/index.ts` — import-graph test
- [x] Negative-control every one of the above

### Phase 7 — verification

- [x] `npm run verify` green
- [x] Eager budget unmoved — demos must add **zero** to the eager chunk
- [x] `build-seo` writes 32 pages; sitemap still lists 16
- [x] Update `README.md` route table, `docs/business-offer.md` §14, `docs/OFFER-REBUILD.md` §13
- [x] Record what the demos do **not** claim, and why, in this file

---

## 7. What this deliberately does not do

- **No annotation overlay.** The demo is the product; the reasoning lives on the card.
- **No "before" version.** The teardown already does before/after, with `SiteMock`.
- **No new nav item.** Demos are reached from the two surfaces that already point at them.
- **No real form submissions.** A demo that captures a lead is a demo that misled somebody.
- **No stock photography.** Hundreds of kB and a licence record, to show a stranger's van.

---

## 8. Needs the owner

1. **The five business names have not been checked against the Washington business
   register or against Google.** Any of them could be a real company, and a fictional site
   carrying a real trading name is a genuine problem. Confirm, or replace them.
2. **The 555-01xx numbers do not dial**, which is correct for fiction and means a prospect
   tapping "Call" in a demo gets nothing. That is the intended behaviour; confirm it reads
   as deliberate rather than broken.
3. **Fictional price ranges on the demo service pages** — whether to publish them at all is
   a judgment about how closely the demos should resemble a real quote.

---

## 9. What actually happened

All forty items shipped. `npm run verify` is green: **526 tests across 32 files**, 32 pages
built, eager JS 461.1 kB (140.2 kB gzipped) against a 465 kB / 142 kB budget.

Four things went differently from the plan, and each is worth recording.

### `use()` was written first, and had to be thrown away

The shell originally read its trade content with React 19's `use()`, suspending on the
promise from `content/demos/index.ts`. It works in a browser. **It never resolves under the
act environment the test suite runs in** — forty-two assertions sat on the suspense
fallback indefinitely, including every accessibility check on all fifteen routes.

Replaced with five `React.lazy` components, each closing over one trade's module. Same
chunking, same suspense boundary, and the mechanism `App.tsx` already uses for five routes.
A feature whose correctness cannot be asserted is a feature that breaks silently later, so
the new API did not get to be load-bearing on the strength of it working when clicked.

### The guard caught the author, twice, within a minute of being written

- **`Tested and certified on completion`**, in the electrical demo's rewiring service. A
  fictional company certifies nothing. Now "Every circuit tested before we leave".
- **`No charge for a return within thirty days`**, in the plumbing demo. A promise, and a
  business that does not exist cannot keep one. Now "Told plainly whether it will happen
  again".

Both were written by the same person who wrote the rule banning them, in the same sitting.

### Two existing guards had to be rewritten rather than satisfied

- **`demoUrl` required `https://` and forbade a leading slash**, on the stated reasoning
  that "a demo served from a path of the marketing site is a page of the marketing site".
  That objection was right about the failure it feared. It is answered by architecture
  rather than by URL scheme: the demo routes render outside `SiteLayout`, so no JobForge
  header, footer, skip link or `#main-content` exists on them, and `DemoLayout.test.tsx`
  asserts exactly that. The rewritten guard checks the link resolves to a real demo route,
  which is strictly stronger than checking it starts with `https://`.
- **The orphan-route guard** only knew about the header and footer navigations. It now
  reads the portfolio's `demoUrl` values as a real link source, so removing one turns its
  route into an orphan and fails the build — which is what should happen.

### The eager bundle grew by 3.7 kB, and that was unavoidable

`demoMeta.ts` has to be reachable from `pages.ts`, which every page component imports, so
fifteen titles and descriptions are eager whatever else is lazy. Everything else — five
shells, three templates, five content modules, five palettes, five SVG scenes — is in lazy
chunks that a visitor to the homepage never downloads.

That leaves **3.9 kB of headroom** against the budget. The next content addition of any
size will fail `check-budget.ts`, which is the guard working rather than a problem to
pre-empt: raising the number without saying what the bytes bought is the thing that file
exists to make awkward.

---

## 10. Still needs the owner

Unchanged from §8, and none of it is a code change:

1. **The five business names have not been checked** against the Washington business
   register or against Google. Any of them could be a real company.
2. **The 555-01xx numbers do not dial**, and are deliberately not `tel:` links — a live
   `tel:` on a fictional number is a misdial pointed at whoever really holds it. Confirm
   that reads as deliberate rather than broken.
3. **No prices appear on any demo.** The type allows them and no demo uses one, because a
   fictional quote is the one piece of set dressing a reader might act on.
