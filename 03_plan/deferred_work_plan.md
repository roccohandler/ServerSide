# Deferred Work Plan

**Repository:** JobForge (`ServiceSide` working directory)
**Written:** 2026-08-16
**Continues:** `03_plan/code_design_improvement_plan.md` §0e and `03_plan/ux_completeness_plan.md` §4.6 / §13
**Scope:** the eight items those two documents named, argued about, and deliberately did not do.

---

## 0. Where these eight items come from

Two plans have run to completion in this repository. Each finished by writing down what it had
chosen **not** to build and why — which is the only reason this document can be short about
motivation and long about method. Nothing here is newly discovered; all of it was found, costed
and postponed by a named argument.

| #     | Item                            | Deferred by                           | The stated reason                                                                                         |
| ----- | ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **1** | RTL and i18n                    | `ux_completeness_plan.md` Round 1     | No non-English or RTL audience in the funnel.                                                             |
| **2** | Dark mode                       | `ux_completeness_plan.md` Round 1     | "A committed light design", written into both `index.html` files as `color-scheme: light`.                |
| **3** | `forced-colors`                 | `ux_completeness_plan.md` Round 2     | Not measured, not asked for, and a whole second palette to reason about.                                  |
| **4** | Print beyond the workbook       | `ux_completeness_plan.md` Round 2     | Only the PlayBook artefacts are things anybody prints.                                                    |
| **5** | Pagination controls             | `ux_completeness_plan.md` Round 6     | One operator, a handful of rows; disclosure was judged enough.                                            |
| **6** | In-place re-auth                | `ux_completeness_plan.md` Round 4     | Redirect-with-`from` was cheaper and already existed.                                                     |
| **7** | In-app navigation unsaved guard | Execution, batch 3.4                  | `useBlocker` needs a data router; both apps use `<BrowserRouter>`. "A router migration wearing a UX hat." |
| **8** | **E5** — the mega-stylesheets   | `code_design_improvement_plan.md` §0e | Was a budget problem; became a scheduling one when the CSS ceiling rose to 120/20.                        |

Items 1–6 were the owner's calls in the interrogation rounds. Items 7 and 8 were execution's
calls, recorded in place. **This document reverses all eight** and says, for each, what changed.

---

## 1. The tension, named before anything is built

`CLAUDE.md` composition rule 6 is the sharpest rule in this repository:

> **No speculative surface in an eager bundle.** No exported function without a production
> caller. No prop nothing passes. No token for a component that does not exist.

Six of these eight items are, on the face of it, exactly that. Nobody has asked JobForge for a
dark theme. No Greater Seattle HVAC contractor has requested Arabic. There is no evidence in any
log that a single visitor has run Windows High Contrast Mode against this site. A dark palette
would land in `tokens.css` — the single eagerest file in the repository, linked render-blocking
from every generated HTML page — and by rule 6's letter it is thirty tokens for a reader who has
not turned up.

That is a real argument and it is not obviously wrong. It is also, on inspection, **applying the
rule to the wrong category of thing**, and getting that distinction right is what decides the
shape of everything below.

### The line this plan draws

Rule 6 is about **surface**: API that exists so that somebody might one day call it. A prop
nothing passes, an exported helper with no consumer, a token for a component that was never
built. The cost is that a reader has to work out whether it matters, and the byte cost is only
the visible half.

These items are not surface. They are **answers to questions the browser is already asking.**

A browser on a device set to dark mode sends `prefers-color-scheme: dark` on every page load
this site has ever served. Windows High Contrast sends `forced-colors: active`. Ctrl-P sends
`print`. Those are not hypothetical future requests: they are requests **already arriving**,
today, being answered with a page that ignores them. A light-only page is not the absence of a
speculative feature — it is a **wrong answer to a question that was asked.**

So the line is:

> **Build the response to signals the browser already sends. Do not build the machinery for
> signals nothing sends.**

Applied to the eight:

| Item                   | Signal actually arriving?                                                           | Verdict                                             |
| ---------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------- |
| Dark mode              | `prefers-color-scheme: dark` — on a large fraction of every load                    | **Build**                                           |
| `forced-colors`        | `forced-colors: active` — rare but real, and the failure is total                   | **Build**                                           |
| Print                  | `@media print` — one keystroke away on every page                                   | **Build**                                           |
| RTL                    | Nothing sends `dir=rtl`; **we** set it                                              | **Build the spelling, not the feature** — see below |
| i18n message catalogue | Nothing. No second locale exists, and one would have to be invented                 | **Do not build.** §3.1c                             |
| Pagination             | Not a browser signal — a product one, and the console already **says** it truncated | **Build** — a disclosure with no exit is a dead end |
| In-place re-auth       | Not a browser signal — but expiry is a real event with a bad current answer         | **Build**                                           |
| E5                     | Neither. A structural refactor with a measurable pass/fail                          | **Build, measure, revert on regression**            |

**RTL is the interesting one and it is the reason this line is worth stating.** Nothing sends
`dir=rtl`, so by the rule above RTL is speculative — and it would be, if it meant building a
direction-switching feature. It does not. Converting `padding-left` to `padding-inline-start` is
not new surface, not a new prop, not a new token and not a new byte of consequence: it is the
**correct modern spelling of the same declaration**, and the version that happens to be
direction-agnostic. It passes rule 6 not by exception but by not being surface at all. The
feature — a locale picker, a translated catalogue — is the part that stays unbuilt.

### What this costs, stated up front

The eager CSS ceiling is **120.0 kB raw / 20.0 kB gzipped** and the measured figure is
**112.7 / 18.2**. That is 7.3 kB raw and 1.8 kB gzipped of headroom, and items 2, 3 and 4 all
spend eager CSS. The gzip figure is the binding constraint, not the raw one, and 1.8 kB is not
much. Three things make it survivable and they are all measured rather than assumed:

1. **A dark palette compresses extraordinarily well.** Thirty declarations that are structurally
   identical to thirty declarations twenty lines above them is the best case gzip has.
2. **E5 runs last, after every CSS edit is in.** If the total is over, E5's measurement decides
   whether the answer is a split or a raise, with real numbers instead of an argument.
3. **A raise is available and this plan will argue for one if it needs it** — as DECISION 029
   did, in the same file, in prose, with what it bought. What is not available is spending the
   headroom quietly.

---

## 2. Measured starting state

Taken from a full `npm run verify` on 2026-08-16 before any file was touched.

| Measure                   | Value                                                           |
| ------------------------- | --------------------------------------------------------------- |
| Tests                     | **1,243 across 79 files**                                       |
| Lint                      | 0 errors, 0 warnings                                            |
| Eager JS (`apps/client`)  | **534.9 kB raw / 162.4 kB gzipped** — ceiling 545.0 / 164.0     |
| Eager CSS (`apps/client`) | **112.7 kB raw / 18.2 kB gzipped** — ceiling 120.0 / 20.0       |
| Console bundle            | ~259 kB, no customer downloads it                               |
| Uncommitted               | 705 files (the two completed plans), by the owner's instruction |

### The eight items, as they exist on disk today

| Item            | What is actually there now                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dark mode       | **Nothing.** Zero `prefers-color-scheme` occurrences in any source file. Both `index.html` files declare `color-scheme: light` with a comment calling it a committed choice. |
| `forced-colors` | **Nothing.** Zero occurrences.                                                                                                                                               |
| Print           | **Three blocks.** `global.css` (5 lines: black on white), `Assessment.module.css`, `Workbook.module.css`. Nothing else in five workspaces.                                   |
| RTL             | **Nothing.** 139 direction-dependent physical declarations across `apps/client`, `apps/admin` and `packages/ui`, against 68 logical ones. No `dir` attribute anywhere.       |
| Pagination      | Server sends `hasMore` for conversations only; the inbox renders a notice about it and offers no way to see the rest. Projects and accounts send neither.                    |
| Re-auth         | Client redirects to `/login?from=…`; console falls back to the sign-in form. Both discard the page.                                                                          |
| Nav guard       | `useUnsavedChanges` is `beforeunload` only, in both apps, with a header stating the gap.                                                                                     |
| E5              | `Offer.module.css` is **no longer a mega-stylesheet** — see the correction below. Eight files over 500 lines remain, led by `Demo` (1,282) and `Value` (990).                |

### First correction to the source documents, before starting

`code_design_improvement_plan.md` §688 lists E5's targets as "`Offer.module.css` alongside E4;
then `Value`, `Home`, `PlayBook`, `Audit`, `Demo`", and §0e calls `Offer.module.css` at **3,048
lines / 347 classes / 16 importers** the bounded version of the job. **That is no longer true.**
The offer rebuild (`7f3f75c`) already split it; `Offer.module.css` does not appear in the top
fifteen stylesheets by line count today. The real target list is measured in §3.8 and it is a
different list.

---

## 3. The eight items

Each says what exists, what "done" means, what it costs, and what would make it wrong.

### 3.1 Direction and locale

#### 3.1a What is wrong now

139 declarations hard-code a side. Most are innocuous today because the only direction is
`ltr` — and every one of them is a declaration written in the older of two spellings, where the
newer spelling is the same length, does the same thing, and has been supported by every browser
this site targets for four years.

The inventory:

| Property                       | Count | Logical equivalent              |
| ------------------------------ | ----: | ------------------------------- |
| `border-left` / `border-right` |    57 | `border-inline-start` / `-end`  |
| `padding-left` / `-right`      |    30 | `padding-inline-start` / `-end` |
| `left:` / `right:`             |    29 | `inset-inline-start` / `-end`   |
| `margin-left` / `-right`       |    14 | `margin-inline-start` / `-end`  |
| `text-align: left` / `right`   |     9 | `text-align: start` / `end`     |

`border-left` dominating the list is not an accident: it is the rail idiom — a 3px ember bar
down the side of a callout — repeated across the marketing site. In RTL that rail belongs on the
other side, and `border-inline-start` is the declaration that knows it.

#### 3.1b What "done" means

- Every direction-dependent physical property in `packages/ui`, `apps/client/src` and
  `apps/admin/src` replaced with its logical equivalent, **except** where the value is genuinely
  physical (a `transform`, a `background-position`, a shadow offset that is about light source
  rather than reading order) — each of which is listed as an exception with a sentence.
- The demo sites are **exempt**, on the existing grounds: they depict five other businesses'
  brands, they are not JobForge, and they will never be served in Arabic.
- `<html dir>` is set from one module rather than hard-coded, and `<html lang>` with it.
- A **seventh enforced rule** in `tokens.test.ts`: no direction-dependent physical property in
  any stylesheet outside the exception list, checked in both directions like the other six.

#### 3.1c What is deliberately _not_ built, and why

**A message catalogue.** Not a partial one, not a scaffold, not `t('home.hero.title')` with one
locale behind it. This is the single most important scoping decision in this document, so it is
stated at length rather than in a footnote:

- Extracting every string would touch essentially every file in two applications. The marketing
  site is already content-as-data in `apps/client/src/content/`, which makes _its_ half
  tractable — but `features/private` and all of `apps/admin` write prose inline, deliberately
  and by a documented habit (`CLAUDE.md`, "Content is data — on the marketing site").
- A catalogue with exactly one locale in it is a framework with one consumer. That is rule 6 and
  the Rule of Three at the same time, and it is the textbook case both were written for.
- The translations would have to be **invented**. Nobody has specified a second locale; picking
  one and writing Spanish or Arabic copy for a Seattle HVAC sales page is a product act
  disguised as an engineering one, and the result would be shipped, unreviewed, in the voice of
  a business that never approved it.

What _is_ built is the part that is not speculative: the direction spelling above, `lang`/`dir`
plumbing, and **`Intl` for every date and number** — because a hand-rolled date format is wrong
in a second locale _and_ wrong today for anybody whose OS is not set to US English, which is a
bug in the current single-locale product, not preparation for a future one.

### 3.2 Dark mode

#### 3.2a The hard part is not the CSS

`tokens.css` opens with a note explaining that there is **no foundation colour tier** on purpose:
every semantic token is an independently measured contrast value against a specific ground, not
a derivation of a brand hue. `tokens.test.ts` rule 4 then computes WCAG AA from the real hex
values of every pair the file states.

That design decision is what makes dark mode expensive and what makes it safe. Expensive,
because a dark theme is not an inversion — thirty values have to be **chosen and measured
again** against dark grounds, and the four accent variants (`--color-accent`,
`-accent-strong`, `-accent-deep`, `-accent-text`) exist precisely because ember's lightness makes
it behave differently on every ground. On charcoal, `--color-accent-text`'s job is done by
`--color-accent` itself, which is 5.0:1 there. Safe, because rule 4 will refuse the build if a
single dark pair is guessed rather than measured.

#### 3.2b The pieces

1. **A second measured palette** in `tokens.css`, declared three times over: `:root` stays the
   light values; `@media (prefers-color-scheme: dark)` guarded by `:root:not([data-theme='light'])`
   so an explicit light choice beats the OS; and `:root[data-theme='dark']` so an explicit dark
   choice beats a light OS. Redefining **only** the tokens, never the structure.
2. **Shadows.** `--shadow-*` are charcoal at 4–12% alpha. On a charcoal surface they are
   invisible, and elevation stops reading. Dark needs its own set — deeper alpha and a hairline
   — which is why the shadow tokens are in the redefined block and not left alone.
3. **`--color-surface-dark`** is the token that breaks. In light mode it means "the inverted
   band" — the footer, the CTA block. In dark mode there is no inversion to do. It must resolve
   to something that still reads as _a different surface from the page_, or every dark band
   disappears into the ground.
4. **The toggle.** Three states, not two: System / Light / Dark. Two states cannot express "do
   what my OS does", which is the state the majority of people want and the one that is free.
5. **No flash.** `prefers-color-scheme` alone needs no JavaScript and cannot flash. Only the
   _override_ can — and reading `localStorage` before first paint means an inline script, which
   **the CSP forbids**: both `vercel.json` files say `script-src 'self'` with no `unsafe-inline`.
   See §3.2c; this is the constraint that shapes the implementation.
6. **The demo sites stay light.** They depict other businesses. `Demo.module.css` references
   seven `--color-*` tokens, and each one is a place where a customer's brand would be repainted
   by a JobForge visitor's OS setting. The demo frame pins its own `color-scheme` and resolves
   those seven against the light values regardless of theme.
7. **`meta color-scheme`** becomes `light dark` in both `index.html` files — and the comment that
   currently calls the light design committed gets rewritten rather than deleted, because the
   next reader deserves to know it was a decision that changed and not a line nobody noticed.
8. **`theme-color`** gains a `media="(prefers-color-scheme: dark)"` sibling.

#### 3.2c The CSP constraint, and what it forces

`script-src 'self'` blocks an inline bootstrap script. Three ways out, and the third is chosen:

| Option                                                            | Verdict                                                                                                                            |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Loosen CSP to `unsafe-inline`                                     | **No.** Trading a documented XSS mitigation for one frame of paint is the worst trade in this document.                            |
| External `/theme.js`                                              | **No.** A blocking request before first paint is worse than the flash it prevents; async reintroduces the flash.                   |
| **Inline script + `sha256-` hash in CSP, verified at build time** | **Yes.** Keeps CSP strict, costs ~250 bytes, and the hash drifting is caught by a guard rather than by a blank page in production. |

The guard is the load-bearing half: a build step recomputes the digest of the inline script from
the built HTML and fails if it does not match the literal in `vercel.json`. Without it, editing
the script silently breaks the theme in production only, on a CSP violation that never appears in
any log this project reads. That failure mode is exactly the one `check-budget.ts` exists to
prevent for bytes, and it gets the same treatment.

### 3.3 Forced colours

Windows High Contrast Mode does not adjust a palette — it **replaces** it, discarding
`background-color`, `border-color`, `box-shadow` and `background-image` and substituting a
user's system colours. Everything that carries meaning in a background or a shadow and nothing
else stops carrying it.

The inventory of what breaks, which is what makes this small rather than open-ended:

| Surface                      | What is lost                                             | The fix                                                  |
| ---------------------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| `Button` primary/secondary   | Fill and border both flatten; the two look identical     | Explicit `border` + system keywords per variant          |
| `Badge` tones                | Tone is background-only                                  | Border, and the tone carried by outline rather than fill |
| `Card`                       | Elevation is `--shadow-card`; shadows are discarded      | A border in forced-colors only                           |
| Focus ring                   | Survives if `outline`, vanishes if `box-shadow`          | Audit every ring; `outline` everywhere it is not already |
| `Switch`                     | On/off is entirely track colour                          | Border + a knob that moves against a bordered track      |
| `Modal` / `Drawer` scrim     | `--color-scrim` is discarded; the dialog floats unframed | A border on the dialog                                   |
| `ScoreScale`, progress rails | Fill-versus-empty is background only                     | Border on the track, `Highlight` on the fill             |
| `Notice` tones               | Tone is tint background                                  | Border, and the icon already carries the meaning         |

System colour keywords (`CanvasText`, `ButtonText`, `Highlight`, `GrayText`, `LinkText`) are
colour literals as far as `tokens.test.ts` rule 1 is concerned. Rule 1 gains a narrow, stated
allowance: **system colour keywords, inside a `forced-colors` block, only.** Scoped to the block
rather than to the file, so it cannot become a hole.

### 3.4 Print

The current print support is five lines in `global.css` setting `#000` on `#fff` — which, note,
are two colour literals inside a print block, and rule 1 already tolerates them. That is the
whole of it outside the two PlayBook artefacts.

What gets built:

1. **A real baseline in `global.css`.** Chrome removed: header, footer, nav, skip links, the
   cookie-free CTA bars. Ink restored: dark inverted bands un-inverted, because a charcoal band
   prints as a solid black rectangle and empties a cartridge. Shadows and animations dropped.
   `orphans`/`widows`, and `break-inside: avoid` on cards so a project card is not split across
   a page boundary.
2. **Print forces light**, whatever the theme is. A dark theme printed is the same solid
   rectangle, over the whole page. This is one `@media print` block re-declaring the light
   palette, and it must come after the dark blocks.
3. **Link URLs.** In the content column only — `a[href^="http"]::after { content: " (" attr(href) ")" }`
   — never in navigation, because printing a nav is what step 1 already prevented.
4. **The three screens somebody actually prints**, beyond the workbook:
   - `/audit` results — a score somebody hands to a partner.
   - Billing / invoice history — receipts.
   - The customer's project overview — a status page for a meeting.

### 3.5 Pagination

The inbox currently renders: _"Showing the 50 oldest. There are more waiting — reply to some of
these and the rest appear."_ That sentence is honest and it is a dead end: it tells somebody
there is a room behind the wall and hands them no door. The `ux_completeness_plan` note beside
it argues no control is needed at this scale, and it is right about the scale and wrong about
the shape — the cost of being told about an inaccessible remainder is higher than the cost of
one button.

**"Show more" raises the limit; it does not offset.** This is the one non-obvious call here and
it is worth the sentence: the conversation list is a **merged read model** over two sources,
sorted oldest-first, and rows arrive continuously. An offset window over a list that shifts
underneath it can skip a row entirely — and the row it skips is a person waiting for a reply.
Re-requesting a _larger prefix_ of the same query cannot skip anything. It costs one extra
request's worth of rows the client already had, at a scale where that is free.

Scope: the console's three lists — conversations, projects, accounts. Projects and accounts get
`hasMore` on the server, which they do not have today. The server's `max(200)` bound rises, with
a comment, so the control is not itself a dead end four clicks in.

### 3.6 In-place re-auth

Today, an expiry mid-work throws the page away. The customer app redirects to `/login?from=…`
and comes back to a **remounted** screen: any half-filled form is gone. The console re-renders
the sign-in form and loses the same way.

Both are strictly better than the state before `ux_completeness_plan` (a dead page showing "You
are not signed in." with every control present and nothing working) and both still discard work.

In-place re-auth is a modal over the page you are already on: email, password, done, page
intact. It is also the **first consumer of `Modal`**, which is the primitive DECISION 029 built
and measured at zero eager bytes precisely because nothing imported it. It will cost something
now, and that is the intended shape of that decision rather than a surprise.

Two honesty constraints:

- **The request that triggered it is lost.** Re-running it after re-auth is a much larger change
  (every call site would have to be replayable) and would silently re-fire a mutation somebody
  may no longer want. The modal says what happened and returns them to a page that works.
- **It must never appear for an anonymous visitor.** `UNAUTHENTICATED` arrives from `/auth/me`
  on every marketing page load and from a wrong password on the sign-in form. The existing
  functional-update guard — only from `authenticated`, only from `signedIn` — is what makes this
  safe, and the tests that pin it must be extended rather than trusted.
- The customer app must **lazy-load** the modal. `AuthContext` is eager; a dialog that only
  signed-in customers can ever see must not be in the marketing bundle.

### 3.7 In-app navigation guard

The blocker on this is exact and was written down at the time: `useBlocker` requires a data
router, both apps use `<BrowserRouter>`, and migrating "rewrites `App.tsx` and all four route
modules, invalidates the documented `<Routes>` reads its children constraint and its ESLint
exemption, and moves the chunk boundaries `check-budget.ts` exists to hold."

**Two of those four are avoidable, and that is what makes this tractable now.**
`createRoutesFromElements` accepts the existing `<Route>` JSX trees verbatim. The route modules
do not get rewritten; `App.tsx` swaps `<BrowserRouter><Routes>…</Routes></BrowserRouter>` for
`<RouterProvider router={…} />` and the `lazy()` boundaries — which are what the chunk map is
made of — are untouched by construction. What genuinely changes is the router runtime's weight,
which is measured rather than argued, and the ESLint exemption's justification, which gets
rewritten.

Then `useUnsavedChanges` gains the half it documents as missing, and its long comment about the
gap is **superseded rather than deleted**, because a reader who has seen the old one deserves to
know it was closed rather than that it never existed.

### 3.8 E5 — the mega-stylesheets

Measured today, not from §688's list:

| Stylesheet                                   | Lines | Eager? | Verdict                                                                     |
| -------------------------------------------- | ----: | ------ | --------------------------------------------------------------------------- |
| `demo/Demo.module.css`                       | 1,282 | lazy   | **Split.** Five demo pages plus chrome in one file; the clearest seam here. |
| `home/Value.module.css`                      |   990 | eager  | **Split, carefully.** Eager, so duplication shows up in the budget at once. |
| `playbook/PlayBook.module.css`               |   835 | lazy   | **Split.**                                                                  |
| `home/components/pricing/Pricing.module.css` |   681 | eager  | **Split.** Already in a `pricing/` folder with multiple components.         |
| `home/Home.module.css`                       |   626 | eager  | **Inspect first.** May be one screen with one reason to change.             |
| `audit/Audit.module.css`                     |   622 | lazy   | **Split.**                                                                  |
| `playbook/Workbook.module.css`               |   604 | lazy   | **Inspect first.** One artefact, one reason to change.                      |
| `capabilities/Capabilities.module.css`       |   558 | lazy   | **Inspect first.**                                                          |

The method is fixed by §0e and not negotiable: **split one, measure, stop if the total moves the
wrong way.** The failure mode is silent — shared declarations get duplicated into two chunks and
nothing complains until the next budget check — so every split is followed by a build, and the
number goes in the ledger whether it is good or bad.

E5 runs **last**, after every other CSS edit has landed. Splitting a file and then editing both
halves for dark mode, forced colours and print would be doing the work twice and measuring it
never.

---

## 4. Sequence, and why this order

```
1  Direction        ── every later CSS edit is then written in the correct spelling
2  Dark mode        ── the largest token change; everything visual sits on it
3  Forced colours   ── needs the dark work's border discipline already in place
4  Print            ── must come after dark, because it overrides it
5  Pagination       ── independent; server + console
6  In-place re-auth ── independent; first consumer of Modal
7  Data router      ── riskiest; done when nothing else is in flight
8  E5               ── measures a settled stylesheet set
9  Documentation    ── DECISION 030, design-system.md, CLAUDE.md, both plans
```

Three of those orderings are load-bearing rather than arbitrary:

- **Direction before everything**, so that no rule written in phases 2–4 has to be converted
  afterwards.
- **Print after dark**, because "print forces light" is a cascade fact: the print block has to
  come after the blocks it overrides.
- **E5 last**, per §0e and per the paragraph above it.

---

## 5. The batches

Each batch ends with `npm run verify` green. Any batch touching CSS, an eager route, a `lazy()`
boundary or a `content/` import is followed by a build measurement recorded in §8.

### Phase 1 — Direction and locale

- [x] **1.1** Convert `packages/ui` stylesheets to logical properties. Measure.
- [x] **1.2** Convert `apps/client/src` (excluding `features/public/demo`) to logical properties.
- [x] **1.3** Convert `apps/admin/src` to logical properties.
- [x] **1.4** Add `tokens.test.ts` rule 7 — no direction-dependent physical property — with a
      two-directional exception list, and verify it fails on injected drift.
- [x] **1.5** `lang`/`dir` from one module in both apps; `Intl` for every date and number;
      a guard against hand-rolled formatting reappearing.

### Phase 2 — Dark mode

- [x] **2.1** Choose and **measure** the dark palette: thirty tokens, every stated pair computed
      against WCAG AA with the same algorithm `tokens.test.ts` uses.
- [x] **2.2** Declare it — `@media (prefers-color-scheme: dark)` guarded, plus `[data-theme]`
      both ways. Shadows and `--color-surface-dark` handled explicitly. Measure.
      **Amended 2026-08-19 (DECISION 036): the media query is gone.** The palette stays; only
      `[data-theme='dark']` reaches it. See §9.14 — including why this batch's own note about
      `--color-surface-dark` breaking turned out to be the whole story.
- [x] **2.3** Extend `tokens.test.ts` rule 4 to compute AA over the dark set as well, and verify
      it fails on a deliberately bad dark pair.
- [x] **2.4** The theme control: three states, persisted, announced, in both apps.
      **Amended 2026-08-19: two states.** "Match my system" has no meaning once no stylesheet
      asks the system. See §9.14.
- [x] **2.5** No-flash bootstrap: inline script, `sha256-` in both CSPs, and the build guard that
      fails when the digest drifts.
- [x] **2.6** Pin the demo sites to light and prove it with a test.
- [x] **2.7** `meta color-scheme`, `theme-color`, and the two comments that need superseding.
      **Amended 2026-08-19: back to `light`, and one `theme-color`.** Both comments were
      superseded a second time rather than reverted, which is the point of writing them that way.
      See §9.14.

### Phase 3 — Forced colours

- [x] **3.1** Rule 1 allowance for system keywords inside `forced-colors` blocks, scoped to the
      block, checked in both directions.
- [x] **3.2** `packages/ui` primitives: Button, Badge, Card, Field, Switch, Modal, Drawer, Toast,
      Table, Tabs.
- [x] **3.3** Client patterns and marketing surfaces that carry meaning in a fill.
- [x] **3.4** Console surfaces. Measure.

### Phase 4 — Print

- [x] **4.1** The `global.css` baseline, including forcing light over any theme.
- [x] **4.2** `/audit` results.
- [x] **4.3** Billing and invoice history.
- [x] **4.4** The customer project overview. Measure.

### Phase 5 — Pagination

- [x] **5.1** Server: `hasMore` for projects and accounts; the max bound raised with a comment.
- [x] **5.2** The console's "Show more" control, announced, with the count it is showing.
- [x] **5.3** Wire all three lists; supersede the "no pagination control" note in `InboxPage`.

### Phase 6 — In-place re-auth

- [x] **6.1** The customer application: a lazily-loaded `Modal`, only from `authenticated`.
- [x] **6.2** The console: the same shape, plus the console-capability check.
- [x] **6.3** Tests that an anonymous visitor and a wrong password never see it. Measure.

### Phase 7 — Data router and the navigation guard

- [x] **7.1** `createRoutesFromElements` + `RouterProvider` in `apps/client`. **Measure the JS
      delta before anything else in this phase.**
- [x] **7.2** The same in `apps/admin`.
- [x] **7.3** `useUnsavedChanges` gains `useBlocker`; the confirmation UI in both apps.
- [x] **7.4** Supersede the hook's gap comment and the ESLint exemption's justification.

### Phase 8 — E5

- [x] **8.4** `Pricing.module.css` → `YearOneEconomics.module.css`. Measured: **118.4 → 118.3
      raw, 19.2 gzipped unchanged.** The block-and-measure question §0e asked is answered.
- [x] **8.1–8.3, 8.5–8.6** Inspected and **stopped**, deliberately and with a reason. See §9.13
      — the split surfaced a defect class that is worth more reported than half-fixed, and
      §0e's own instruction is "split one stylesheet, measure, and stop".

### Phase 9 — Documentation

- [x] **9.1** DECISION 030 in `docs/owner-decisions-required.md`.
- [x] **9.2** `docs/design-system.md`: the dark palette, rule 7, the forced-colors allowance,
      print, and the theme control.
- [x] **9.3** `CLAUDE.md`: rule 6's boundary as §1 draws it, the CSP-hash guard, and the router.
- [x] **9.4** Close §0e in `code_design_improvement_plan.md`; close §4.6/§13 in
      `ux_completeness_plan.md`. Final `npm run verify` and the closing ledger.

---

## 6. Guards this plan adds

A rule nobody can break by accident is worth more than a rule written down. Each of these fails
the build.

| Guard                                                              | Prevents                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `tokens.test.ts` rule 7 — no direction-dependent physical property | The 139 declarations coming back one at a time                  |
| Rule 4 extended over the dark palette                              | A dark token guessed rather than measured                       |
| Rule 1's `forced-colors` allowance, scoped to the block            | System keywords leaking into ordinary rules                     |
| CSP digest check on the inline theme bootstrap                     | A production-only, log-free theme failure                       |
| A test that the demo frame ignores the theme                       | Repainting another business's brand from a visitor's OS setting |
| `Intl`-only formatting check                                       | Hand-rolled dates and currency reappearing                      |

---

## 7. What is still deliberately not built

Recorded here so the next reader does not have to infer it from silence.

| Not built                               | Why                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A message catalogue / second locale** | §3.1c. The translations would be invented, and a one-locale catalogue is a framework with one consumer.                                               |
| **Replaying the request that expired**  | §3.6. Every call site would have to be replayable, and a replayed mutation is worse than a retry the person chose.                                    |
| **Undo on genuinely irreversible acts** | Unchanged from `ux_completeness_plan` §13. A sent email cannot be unsent, and a confirmation in front of it is the honest control.                    |
| **Realtime delivery for the inbox**     | Unchanged from DECISION 027. Pagination makes polling less pressing, not more.                                                                        |
| **Inbound email threading**             | Unchanged from DECISION 027. Needs an inbound provider.                                                                                               |
| **The remaining `code_design` items**   | B3's ad-hoc `.card*` classes and the content-chip primitive. Both are additions to the system rather than completions of it; neither is in this plan. |

---

## 8. Ledger

Filled in as batches land. Every row is measured, never estimated.

| Batch     | Eager JS raw / gzip   | Eager CSS raw / gzip | Tests | Note                                                               |
| --------- | --------------------- | -------------------- | ----- | ------------------------------------------------------------------ |
| _start_   | 534.9 / 162.4         | 112.7 / 18.2         | 1,243 | Ceilings 545/164 and 120/20                                        |
| 1.1 – 1.5 | 534.9 / 162.4         | **113.2** / 18.2     | 1,246 | Direction. +0.5 kB raw, **+0.0 gzipped** — see the note in §9.     |
| 2.1 – 2.7 | **536.0** / **162.8** | **115.5** / **18.5** | 1,255 | Dark mode entire. +2.3 kB CSS, +1.1 kB JS. Ceilings untouched.     |
| 3.1 – 3.4 | 536.0 / 162.8         | **116.2** / **18.7** | 1,255 | Forced colours. +0.7 kB raw across eleven components.              |
| 4.1 – 4.4 | 536.0 / 162.8         | **117.1** / **18.9** | 1,256 | Print. +0.9 kB raw. **2.9 kB raw / 1.1 kB gzip of headroom left.** |
| 5.1 – 5.3 | 536.0 / 162.8         | 117.1 / 18.9         | 1,258 | Pagination. Console-only; zero eager cost to the customer bundle.  |
| 6.1 – 6.3 | **537.9** / **163.4** | **118.4** / **19.2** | 1,267 | Re-auth. `Modal`'s first consumer — see §9.10.                     |
| _7.1 try_ | _591.9 / 180.0_       | _118.4 / 19.2_       | —     | **Data router. Refused by the budget guard: +54.0 / +16.6.**       |
| 7.1 – 7.4 | **539.0** / **163.6** | 118.4 / 19.2         | 1,279 | The guard, built without the router. +1.1 / +0.2. See §9.12.       |
| 8.4       | 539.0 / **163.7**     | **118.3** / 19.2     | 1,279 | E5. CSS went **down** — a dead rule, not duplication. §9.13.       |
| **final** | **539.0** / **163.7** | **118.3** / **19.2** | 1,279 | Ceilings 545 / 164 and 120 / 20, **neither raised**.               |

**Against the start: eager JS +4.1 kB raw / +1.3 kB gzipped, eager CSS +5.6 / +1.0, for
thirty-six new tests and everything in §0.** Both ceilings held. The one raise this plan
pre-authorised itself to argue for was never needed — and the one increase it did refuse
(+54.0 / +16.6, the data router) was larger than everything above put together.

---

## 8b. Closing state (2026-08-16)

`npm run verify` green end to end, including the new `check:csp` step.

|                                           | Start                 | Final                                 |
| ----------------------------------------- | --------------------- | ------------------------------------- |
| Tests                                     | 1,243 across 79 files | **1,279 across 84**                   |
| Lint                                      | 0 errors, 0 warnings  | **0 errors, 0 warnings**              |
| Eager JS                                  | 534.9 / 162.4         | **539.0 / 163.7** (ceiling 545 / 164) |
| Eager CSS                                 | 112.7 / 18.2          | **118.3 / 19.2** (ceiling 120 / 20)   |
| Build-failing guards on the design system | 6                     | **8**, plus `scripts/check-csp.ts`    |

Nothing is committed, per the owner's standing instruction. 707 files changed.

### The three that changed a decision

Every plan in this repository has a list of places the measurement contradicted it. Nine are in
§9. These three reversed something:

1. **The data router costs 16.6 kB gzipped** (§9.12), so it was refused and the capability built
   another way for 0.2 kB. §3.7 had budgeted for a raise.
2. **Splitting a stylesheet made it smaller** (§9.13), which is the opposite of the argument
   that had blocked E5 across two plans and three sections.
3. **The second palette found a defect in the first** (§9.4) — a chip at 1.00:1 that worked in
   light only by coincidence. Dark mode was justified as coverage; it paid for itself as a test.

---

## 9. Execution notes

Appended as reality contradicts the plan. The previous two plans each accumulated eight of
these, which is the normal number and the reason this section exists before the work starts
rather than after it.

### 9.1 The logical spelling is free, and the raw figure says otherwise (batch 1.5)

`padding-inline-start` is eight characters longer than `padding-left`, and 143 of them moved the
eager CSS from **112.7 to 113.2 kB raw**. The gzipped figure did not move at all: 18.2 before,
18.2 after.

That is worth recording because the raw number is the one a reader checks and the gzipped one is
the one a visitor downloads. A longer property name repeated 143 times is the single most
compressible change it is possible to make to a stylesheet — the dictionary learns it once. §1
predicted this for the dark palette and it turns out to be measurable a phase earlier.

### 9.2 The Intl guard found two live bugs, not preparation for a future one (batch 1.5)

§3.1c argued that `Intl` is a present-tense fix rather than i18n scaffolding. Two of the three
sites it caught prove it, and one of them contradicted its own comment:

- `AuditFunnel.formatValue` passed `'en-US'` under a docstring reading _"which is also correct
  for anybody outside the US"_. It grouped a German visitor's own revenue figure with American
  separators, on a page whose entire premise is that the numbers are theirs.
- `formatCount` and the enquiry-rate row used `toFixed(1)`, which writes a full stop as the
  decimal separator for every reader on earth regardless of what their system uses.

The third — `pricing.ts`'s `money()` — is the one case where a fixed locale is right, and it is
now the guard's single documented allowance rather than an accident that looked like the others.

### 9.13 E5's premise was wrong, and the split found a defect the guards cannot see (batch 8)

**The measurement §0e asked for, twice deferred, is in.** Splitting `YearOneEconomics` out of
`Pricing.module.css` moved eager CSS **118.4 → 118.3 kB raw, with the gzipped figure
unchanged at 19.2.** It went _down_.

E5 had been open across two plans on one argument, repeated in §0c, §0d and §0e: _"splitting can
increase total CSS through duplication."_ On this file it did not, and the reason is the finding
that matters more than the byte count.

#### The defect class

`Pricing.module.css` is 681 lines serving **eight** components, and several of those components
import a _second_ stylesheet — `Offer.module.css` — for the vocabulary they share. So a
component can write `styles['x']` and `offer['x']` for two different classes with the same name,
and a rule in one file can be silently shadowed by the other.

Two instances were found while cutting one seam:

| Class                                        | In `Pricing.module.css` | Actually applied from                         | Status                              |
| -------------------------------------------- | ----------------------- | --------------------------------------------- | ----------------------------------- |
| `.yearOnePaths`                              | a full grid rule        | `offer['yearOnePaths']`                       | **dead**, now deleted               |
| `.termsSummary` + 3 dependants, `.termsList` | full base styling       | `offer['termsSummary']`, `offer['termsList']` | **dead**, left in place — see below |

**`content.test.ts`'s dead-class sweep cannot see either.** It matches a class _name_ against
the source, and `offer['yearOnePaths']` is a use of that name — so the sweep counts the class as
live no matter which stylesheet the rule is in. That blind spot is invisible in a
one-component stylesheet and grows with every component a stylesheet serves. A 681-line file
with eight consumers is where it hides.

#### Why the remaining splits stopped

`.yearOnePaths` was deleted because it was provably dead and nothing rendered differently. The
`terms*` set is the same defect and **not** the same fix: those five rules carry real
styling — a summary marker, an open state, a list layout — and removing or relocating them
changes what the page looks like, in a direction no build output can confirm. That is a visual
change dressed as a refactor, and shipping it inside a plan about deferred work would be
exactly the "silent failure" §0e warned about, just with a different mechanism.

So E5 stops here, with its central question answered and a second finding written down rather
than half-acted-on. What remains for whoever takes it next is smaller and better specified than
what this plan inherited:

1. Extend `content.test.ts` to check dead classes **per stylesheet** rather than per name. That
   is the guard that makes the rest of E5 safe, and it should come first.
2. Then split, with the `terms*` shadowing as the first thing to resolve — visually, by
   somebody who can look at the page.

### 9.12 The data router costs sixteen kilobytes gzipped, and the answer was no (batch 7.1)

**The most consequential measurement in this plan, and the one that reversed a decision.**

§3.7 argued the migration was tractable because `createRoutesFromElements` avoids two of the
four costs the original deferral listed. That part was right, and better than predicted: the
four route modules were **not touched at all**, so not one `lazy()` boundary moved. `App.tsx`
swapped eleven lines.

The cost §3.7 said would be "measured rather than argued" is the one that killed it:

|                  | Before   | With the data router | Δ         |
| ---------------- | -------- | -------------------- | --------- |
| Eager JS raw     | 537.9 kB | **591.9 kB**         | **+54.0** |
| Eager JS gzipped | 163.4 kB | **180.0 kB**         | **+16.6** |

`createBrowserRouter` brings the whole data layer — loaders, actions, fetchers, revalidation,
and the route-matching machinery behind them. **This application uses none of it.** Sixteen
kilobytes of render-blocking JavaScript on every marketing page, on a site whose product _is_
its first screen, to warn about unsaved work on four forms that all sit behind a sign-in.

`check-budget.ts` refused the build and refusing it was correct. §1 of this plan said "what is
not available is spending the headroom quietly"; this was not quiet, it was a 10% increase in
the eager bundle, and no argument about developer ergonomics survives that ratio.

**The capability was still delivered.** `useUnsavedChanges` in `@jobforge/ui` now carries a
capture-phase click listener that catches every in-app anchor — which is every `Link`, every
`NavLink` and every plain anchor, because react-router renders real anchors and intercepts
their clicks. Running in the capture phase is what makes it work: the listener sees the event
_before_ the router's own handler, so `preventDefault()` stops the navigation rather than
racing it. **1.1 kB raw, 0.2 kB gzipped.**

What that version does not catch is the back button — `popstate` fires after the history entry
has already changed, so "blocking" it means pushing the reader's own entry back and breaking
the button for everybody who meant it. That is the same gap `beforeunload` has, it is stated in
the hook's header rather than implied, and it is a considerably smaller gap than the one that
existed this morning.

Three other things fell out of doing it this way:

- **The two hooks became one.** Both applications had their own copy of the one-line
  `beforeunload` hook. It is now in `@jobforge/ui` with the rest of the shared behaviour, and
  the dialog — `LeaveGuard` — is duplicated per application, which is DECISION 026's line
  drawn in the usual place.
- **A double confirmation, caught by writing the test.** `proceed` leaves the page while the
  form is still dirty, so `beforeunload` fires and the browser asks a _second_ time about a
  departure the reader just confirmed in our own dialog. One ref fixes it.
- **The five ignore-cases are the hard part.** Modified clicks, middle clicks,
  `target="_blank"`, downloads, and `#fragment` links — every skip link on the site is the
  last of those. A guard that interrupts a middle click is a guard people learn to dismiss
  without reading, which is how the one that matters gets dismissed too.

### 9.10 DECISION 029's prediction, now with a number (batch 6.1)

`check-budget.ts` records that the six zero-consumer primitives cost **exactly zero** eager
bytes, because Rollup drops a barrel export nothing imports — and that "they will cost something
the day something imports them."

`ReauthDialog` is that day for `Modal`. Eager JS moved 536.0 → **537.9 kB** and eager CSS
117.1 → **118.4**, against an `AuthContext` change worth a few hundred bytes. So the primitive
and its stylesheet are roughly **1.4 kB raw of eager JS and 1.3 kB of eager CSS**, arriving in
the bundle the first time a component reached for them.

Worth recording precisely because it is the shape the amended rule 6 predicted rather than a
surprise: in this package, weight follows use. It also means the remaining five — Drawer, Toast,
Tooltip, Switch, Avatar — are each carrying a comparable unspent cost.

### 9.11 Two negative tests were the ones worth writing (batch 6.3)

The positive case — the dialog appears when the session expires — was never in doubt. The two
that would have shipped broken are:

- **An anonymous visitor.** `UNAUTHENTICATED` is not an unusual response in this application, it
  is the _normal_ one: every visitor to every marketing page produces one from `/api/auth/me`.
  A naive implementation puts a password dialog on the homepage in front of a stranger.
- **A wrong password on the sign-in form.** Which produces the same code, from a page whose
  entire job is to collect that password.

Both were already guarded by the "only from `authenticated`" transition the previous plan built,
and both are now asserted rather than reasoned about. What did change is _how_ the status is
read: the old code decided inside a `setStatus` updater, which was free because the decision was
the update. Raising a separate flag from inside an updater is a side effect in a function React
is allowed to call twice, so it moved to a ref.

### 9.7 The forced-colors rule was an allowance in the plan and a restriction in reality (batch 3.1)

§3.3 said rule 1 would need "a narrow, stated allowance" for system colour keywords, because
`CanvasText` is a colour literal. **It did not.** Rule 1 looks for `#`, `rgb(` and `hsl(` —
scoped to those on purpose, per the note at the top of `tokens.test.ts` — so a system keyword
was never going to fire it.

Which is the actual problem, pointing the other way: `Highlight` outside a forced-colors block
is worse than a hex, because a hex at least renders the same thing on every machine. So the
batch produced a **new eighth rule** rather than an exception to the first — system colours are
allowed only inside `@media (forced-colors: active)`, with no exception list, brace-counted
rather than regex-matched because a media block contains rules that contain braces.

### 9.8 The focus ring was already correct, and nothing knew it (batch 3.2)

The plan's inventory listed "focus ring — survives if `outline`, vanishes if `box-shadow`" as
something to audit. The audit found **zero** `box-shadow` focus rings across five workspaces:
`global.css` declares one `:focus-visible` rule, it uses `outline`, and every component
inherits it.

That is the design paying off years later, and it is worth naming because it was not luck — it
is a consequence of there being exactly one focus style rather than one per component. The only
change needed was naming `Highlight` as the forced-colors outline colour, which does not alter
what the browser does; it makes the declaration say what will happen.

### 9.9 The print palette is smaller than a third copy (batch 4.1)

§3.4 planned to "un-invert dark bands" element by element. Overriding the **tokens** inside
`@media print` does the same job in eighteen declarations and reaches every rule in five
workspaces without any of them knowing about print — including ones written later.

It also settles the theme interaction the plan flagged: a dark theme printed is a black page,
and the print block redefines `--color-page` and `--color-surface-dark` to `#fff` regardless of
which palette is active. One block, after both.

### 9.4 The second palette found a live defect in the first (batch 2.3)

§3.2a argued that measuring the dark palette is what makes having one safe. It paid for itself
the first time it ran, on a rule nobody had reason to suspect:

```
DifferentiatorSection.module.css [dark]  .laneStrong .laneStep:nth-child(n + 3)
  --color-ink on --color-ink-inverse = 1.00:1
```

The emphasised chips in the homepage's comparison used `--color-ink-inverse` as a **background**.
That is a text token, and the rule only worked because cream happens to be both "the text on a
dark band" and "the page ground" in the light palette. In dark, `--color-ink` is also cream, and
the chip rendered cream on cream — invisible.

The fix is `--color-surface-dark` as the foreground: the chip is the band inverted, so it takes
the band's colour as its text and the band's text as its fill. Both themes, no new token. The
same mistake was then found in `Demo.module.css` — see §9.5.

**The general lesson is worth more than the fix.** A single-palette design cannot distinguish
"the right token" from "a token that happens to hold the right value". A second palette is a
type system for colour roles, and this codebase had two role errors in it.

### 9.5 The demo sites needed almost nothing, and the one thing they needed was invisible (batch 2.6)

§3.2b item 6 planned to pin the whole demo subtree to light, on the assumption that five other
businesses' brands would otherwise be repainted by a JobForge visitor's operating system.
**Measured, they were already immune.** Every colour below the disclosure bar comes from
`--demo-*`, which are per-trade literals rather than JobForge tokens. There was nothing to pin.

Seven `--color-*` references existed and all seven were in the JobForge disclosure bar — which
_should_ follow the theme, because it is this company's chrome. Three of them carried the same
role error as §9.4 and were fixed the same way; the planned `contrast-dark` exception was
written, then deleted, because with the roles correct there was nothing to except.

What the demo did genuinely need was **`color-scheme: light` on its shell** — one declaration
that paints nothing. Without it, a dark-mode reader's native form controls render charcoal
inside the demo quote form on a bright landscaping website. That is the one seam where an
operating system reaches through a depiction, it is invisible in every screenshot, and it was
not in the plan.

### 9.6 The CSP hash needed a guard more than the script needed a hash (batch 2.5)

§3.2c chose the inline bootstrap with a `sha256-` in both policies over the two alternatives,
and called the build guard "the load-bearing half". Building it confirmed that in a way worth
recording: the digest changed when a **variable was renamed**, and nothing else in the
toolchain — not lint, not typecheck, not the tests, not the build — has any idea the script and
the policy are related.

The failure it prevents is the shape this repository has the least defence against: green
locally, green in CI, and broken only in production, where `vite dev` serves no CSP at all and
the violation goes to a `report-uri` that does not exist. `scripts/check-csp.ts` recomputes it
from the built HTML and prints the hash to paste. Verified by renaming `stored` to `saved` and
watching it fail with the correct replacement.

### 9.3 The guard could not count its own offenders (batch 1.4)

Every other rule in `tokens.test.ts` proves it ran by counting the declarations it inspected.
Rule 7 cannot: its job is to leave **zero** physical declarations, so an offender count of zero
is both the success state and the symptom of a broken directory walk. It counts the _logical_
spelling instead — 139 of them — which is the number that would collapse if the walk stopped
finding files. Worth knowing before the next repository-wide rule is written with the same
shape.

### 9.14 Phase 2 built the right palette and wired it to the wrong question (2026-08-19, DECISION 036)

This is the third entry in this document that reverses a decision, and it reverses one of this
document's own — §1's central argument, applied to item 2.

**§1 said:** build the response to signals the browser already sends; do not build the machinery
for signals nothing sends. `prefers-color-scheme: dark` arrives on a large fraction of every
load, so a light-only site was "a wrong answer to a question that had been asked". That reasoning
is why the dark palette exists, it produced thirty measured tokens and a real second theme, and
none of that is being undone.

**What it got wrong** was treating the arriving signal as the question. `prefers-color-scheme` is
one global setting — usually chosen once, at night, for a phone — and the site received it as
though it were a per-application preference about _this_ page. It is a signal about the reader's
environment, not an instruction about which of two designs a business should lead with.

**And they were never two designs.** The audit that found this measured what Phase 2 actually
produced:

|                                                     |                                              |
| --------------------------------------------------- | -------------------------------------------- |
| `.module.css` files containing a dark-specific rule | **0 of 90**                                  |
| Cream page against a charcoal band, light           | **15.21:1**                                  |
| The same two tokens, dark                           | **1.08:1**                                   |
| Colour tokens never re-measured for dark            | **2** (`--color-surface-on-dark`, `-strong`) |
| Colour-bearing CSS rules rule 4 can measure         | **144 of 948 — 15.2%**                       |

Batch 2.2's own checklist named the third row before it happened: "`--color-surface-dark` is the
token that breaks... it must resolve to something that still reads as _a different surface from
the page_, or every dark band disappears into the ground." `#0B0D11` against `#15171C` satisfies
the sentence and not the intent. Eight homepage section bands, the header and the footer all take
their structure from that one contrast, and in the second palette they flatten.

Nothing in a token block can fix that, because it is not a palette problem — it is that every
composition in this repository was designed against cream, and a translation of the _values_ does
not translate the _decisions_. Which is fine for an alternate a reader asks for, and not fine for
the first thing a contractor sees on a phone in a driveway.

**So the palette stays and the media query goes.** Light is the site; dark is reached from the
Appearance control, which is what batch 2.4 built and what makes this cheap. Batch 2.4's three
states became two in the same change — "Match my system" cannot mean anything once no stylesheet
asks the system.

**The three defects it flushed out are the more useful finding.** Rule 4 needs a foreground and a
background stated in the same block, so it never saw any of them: a phone bezel painted with
`--color-ink` (charcoal in light, **cream** in dark, on the hero), the demonstration banner doing
the same and becoming the brightest element on a dark page, and `.onDark` in `Logo.module.css`
pairing two _inverting_ tokens so the mark's tile hit 1.08:1 against the header and vanished — on
every page, in both applications' shells. All three are legible. None is right. §9.4 records that
a second palette is "a type system for colour roles"; this is the part of that type system rule 4
cannot check, and there is now a rule that can.

The same sweep found four `var(--x)` references to custom properties defined nowhere, three of
them added after this plan closed. CSS discards the whole declaration and says nothing, so the
word "Demonstration" — which its own stylesheet comment calls the thing that has to be
unmistakable — had no fill at all.
