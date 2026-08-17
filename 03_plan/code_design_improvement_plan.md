# Code Design & Improvement Plan

**Repository:** JobForge (`ServiceSide` working directory)
**Audit date:** 2026-08-14
**Auditor scope:** read-only architectural review. No source file was modified; this document is the only artifact written.
**Rubric:** Part 1 of the audit brief only. Repository documentation was read for orientation and inventoried as a migration target (phase g), never used as an evaluation criterion.

---

## 0. Stack correction — read this first

The audit brief describes the subject as _"a React Native + Expo + TypeScript application on a MERN + TypeScript backend."_ **The first half is not this repository.** The backend description is accurate; the frontend is not.

| Brief says          | Repository actually is                                       | Evidence                                                                                                            |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| React Native + Expo | **React 19 + Vite 8 + react-router-dom 7, CSS Modules, DOM** | [client/package.json](client/package.json), [client/vite.config.ts](client/vite.config.ts), 60 `*.module.css` files |
| —                   | Express 5 + Mongoose 9 + Zod 4 + Stripe + Resend             | [server/package.json](server/package.json)                                                                          |
| —                   | npm workspaces monorepo, Vercel serverless adapter           | [package.json](package.json), [api/index.ts](api/index.ts)                                                          |

This changes the "adapt, don't transplant" instruction in a specific and consequential way. The brief anticipates translating CSS-variable mechanics into typed TS token modules because React Native has no CSS. **That translation must not happen here.** CSS custom properties are the idiomatic token mechanism for this stack, they are already in use, and they are already test-enforced. Converting them to TS objects would be a large, risky, zero-value migration. Every token recommendation below therefore stays in CSS custom properties, and `index.js` barrels translate to `index.ts` as the brief intends.

**Scale:** 420 source files, 88,199 lines across `client/src`, `server/src`, `api/`. 57 test files.

**Working-tree note:** the audit graded the **on-disk working tree**, not the `HEAD` that existed when it began. At that point the two diverged sharply — 99 tracked paths deleted, ~300 untracked — because the boundary restructure (`features/public/`, `features/private/`) was mid-flight and uncommitted. **During the audit, commit `7f3f75c` ("Add the customer platform and rebuild the marketing site's density") landed and committed that restructure**, so the tree graded here is now also the committed tree. All evidence references below are to files as they exist on disk; line numbers were taken before `7f3f75c` and a handful of files have since moved by a few lines (noted where it matters). The blocking pre-flight step in §5 is therefore already satisfied.

---

## 0b. Reconciliation with the project-portal direction (2026-08-14)

A product direction arrived mid-execution: the application becomes a **customer project portal**
with an owner-facing operations console, and the brief proposed splitting into `apps/client`,
`apps/admin`, `apps/server` plus `packages/ui` and `packages/shared`.

**The headline: this is mostly an extension of an existing, well-reasoned domain — not a new build.**
`server/src/features/projects/` already owns an ordered lifecycle, a `waitingOnCustomer` flag, a
domain→customer translation layer, a version-pinned approval record, and a centralised set of
transition operations. `activity/` already separates `customer` from `internal` audiences. The
capability model is already `resource:action:scope`. Details in `docs/CUSTOMER-PLATFORM.md` §10.

### Gap analysis

| Verdict                | Items                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Already aligned**    | Lifecycle as shared domain concept · waiting-on semantics · domain→customer translation · activity separate from messaging · customer/internal audience split · centralised transitions · permissions foundation · leak-proof customer projection |
| **Needs modification** | Approval becomes per-artefact rather than per-project (D024) · `feedback` gains `messageType` + `readAt` · `activity` gains stage durations                                                                                                       |
| **New work required**  | Specification + versioning · estimates · development substages · system/welcome messages · customer-created project requests · guided first-project flow · zero-state                                                                             |
| **Potential conflict** | `apps/admin` split vs. the existing lazily-loaded admin boundary (D021) · the proposed six-stage lifecycle vs. the existing eight-stage website lifecycle (D022) · projects before payment vs. the deposit qualification gate (D023)              |
| **Should be deferred** | The physical `apps/` + `packages/` restructure, pending D021 · every lifecycle feature, pending D022                                                                                                                                              |
| **No change required** | The whole public marketing surface · billing · deployments · auth · the token layer · the design system                                                                                                                                           |

### Effect on the batches below

Almost everything continues. The migration was sequenced to make feature boundaries explicit, and
that is a **prerequisite** for the portal work whichever way D021 goes.

| Batch                  | Status                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1–A3                  | ✅ **Done.** Unaffected.                                                                                                                                                                           |
| B1–B5                  | **Continue.** Splitting `components/ui` into one file per primitive is the first step of a `packages/ui` extraction if D021 → B.                                                                   |
| C1–C2                  | **Continue, and it de-risks D021.** `AppState` is consumed by both boundaries; moving it to `components/patterns/` is where it must live before either app could share it.                         |
| D1–D2                  | **Continue — now higher value.** Feature entry points are the seam any app split runs along.                                                                                                       |
| D3                     | **Continue.** Session bootstrap being app-level rather than feature-level is a prerequisite for two apps.                                                                                          |
| **D4**                 | ⏸ **PAUSED — blocked on DECISION 021.** Boundary promotion is exactly the question that decision settles.                                                                                          |
| D5                     | **Continue.** The server is shared by both apps regardless; entry points matter more, not less.                                                                                                    |
| E1                     | **Continue.** Both resource hooks serve project surfaces the portal work will rewrite — consolidating first avoids doing it twice.                                                                 |
| E2, E3, E4, E5, E6, E7 | **Continue.** Independent of the portal direction.                                                                                                                                                 |
| **E8**                 | ⬆ **Promoted — do earlier.** Splitting `App.tsx` into route groups creates the exact seam an `apps/admin` split would cut along. Valuable either way, and it makes D021 → B substantially cheaper. |
| F1, F2                 | **Continue.** F1's target vocabulary (`components/ hooks/ services/ utils/ validators/`) already matches the portal brief's proposed feature shape.                                                |
| **F3**                 | ⬆ **Promoted.** Add an `admin ↔ private` isolation zone. This is what delivers D021 option A's guarantee.                                                                                          |
| G1–G4                  | **Partly done now** — `docs/CUSTOMER-PLATFORM.md` §10 and DECISIONS 021–025 are written. The rest still runs last.                                                                                 |

---

## 0c. Execution status (2026-08-14)

The migration below has been executed. `npm run verify` passes: **1,081 tests across 57
files**, zero lint errors, zero lint warnings, eager JS **533.9 kB** (limit 545 kB) and CSS
**111.4 kB** (limit 112 kB).

| Dimension                   | Was    | Now    | What moved it                                                                                                                                             |
| --------------------------- | ------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens               | **A−** | **A**  | A sixth enforced rule (spacing), verified to fail on injected drift. Eight exceptions, each a measurement of a specific element.                          |
| Primitives                  | **B**  | **A−** | `Card` and `Badge` given their own files and stylesheets; `components/ui/index.ts` is the public API; `Button` gained `loading` and `:active`.            |
| Patterns                    | **C−** | **A**  | `AppState` promoted out of `features/private/`, `DeviceFrame` moved off the marketing shelf. Three patterns, an `index.ts`, eleven call sites.            |
| Builder-function structure  | **C**  | **A−** | `createBillingService` 934 → 494 lines; `PricingBlock` 544 → 137; `App.tsx` 482 → 76. `auth.service.ts` (583) was not in scope and is untouched.          |
| Composition vs. abstraction | **B−** | **A**  | Three dead exports deleted; five forms onto `useSubmitStatus`; two resource hooks onto `useResource`; thirty class-joining sites onto `cx`.               |
| File size                   | **B−** | **A−** | Every code offender split. The remaining large files are content data, which splitting buys nothing.                                                      |
| Naming                      | **A**  | **A**  | `sections/` → `components/`, `api/` → `services/`, four server outliers renamed.                                                                          |
| Folder structure            | **C+** | **A**  | 23 client and 13 server entry points; **0** deep imports, **0** `components/`→`features/` imports, **0** `admin`↔`private` imports — all ESLint-enforced. |
| Documentation               | **C−** | **A−** | `CLAUDE.md` written; README structure tree rebuilt; `design-system.md` gained the composition rules, the sixth token rule and all eight exceptions.       |

### Two defects found while executing, neither of which was in the audit

1. **Every form on the site could send twice.** The double-submit guard read
   `status.kind === 'submitting'` from state, and state is a render behind — two
   submissions raised before React re-rendered both passed. `useSubmitStatus` makes the
   guard a ref, and `ContactForm.test.tsx` now pins it. The test was verified to fail
   against the old spelling: it sent **two** leads.

2. **Every busy button dropped out of the tab order.** Twenty-seven call sites spelled
   _temporarily busy_ as `disabled`, and a native disabled button leaves the tab order the
   instant it becomes disabled — so a keyboard user pressing Enter on "Send request" lost
   focus mid-submit and was returned to the top of the document with nothing announced.
   `Button` now takes `loading`, which renders `aria-disabled` + `aria-busy`, stays
   focusable and blocks activation itself.

### Corrections to this document's own findings

- **§1.2's "44 raw spacing declarations" was wrong.** Almost all were legitimate: `em`
  optical nudges, the `margin: -1px` clip idiom, and clearances measured from a specific
  element. Phase A became _enforcement_ rather than migration, and the rule was written to
  exclude those categories explicitly. Two real violations existed; both are fixed.
- **§1.3's "11 badge/chip class sets" was inflated by a faulty pattern** — `[Tt]ag` matches
  `.stage`. The real figure is **six classes across four stylesheets**, and four of them are
  a _different object_: a readable content chip (`.areaChip`, `.industryChip`), not `Badge`'s
  uppercase status marker. That is a genuine gap in the primitive set rather than a
  migration backlog, and it is listed as remaining work below rather than silently closed.
- **`submitLead` was briefly misfiled.** It was moved into `features/public/contact/` before
  its second consumer (the audit) was noticed; it now lives in `lib/leadCapture.ts`.

### What remains

| Item                                          | Why it is still open                                                                                                                                                                         |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E5** — split the six mega-stylesheets       | CSS headroom is **0.6 kB**. Splitting can _increase_ total CSS through duplication; this needs a budget raise argued on its own merits, not smuggled in.                                     |
| **B3 remainder** — 33 ad-hoc `.card*` classes | One proven duplicate migrated (`features/private/components/`, five components). The rest are unaudited, and several are _modifiers passed to_ the primitive rather than re-implementations. |
| **A content-chip primitive**                  | Three real occurrences, so the Rule of Three is met. Not extracted here because it is a new primitive, which is an addition to the system rather than a migration.                           |
| **D4** — physical `apps/` split               | ✅ **Closed.** DECISION 021 option A was superseded by DECISION 026 and the split was executed — see §0d.                                                                                    |
| Every project-portal lifecycle feature        | Correctly deferred — specification versioning, estimates, stage durations, read receipts, `ProjectRequest`. See §0b and `docs/CUSTOMER-PLATFORM.md` §10.                                     |

---

## 0d. The workspace split (2026-08-14, after §0c)

§0c graded a single-workspace repository. It is now five, and D4 — the one structural item
§0c left open — is what closed:

```
apps/client   apps/admin        ← two browser bundles that never import each other
      └───────────┴──→ apps/server   ← the only security boundary
packages/ui   packages/shared   ← what the two frontends are allowed to share
```

DECISION 026 chose it and DECISION 027 finished it. `npm run verify` passes across all five:
**1,126 tests across 62 files**, zero lint errors, zero lint warnings, eager JS **531.4 kB**
(limit 545) and CSS **111.4 kB** (limit 112). The console is a separate **258.7 kB** bundle
that no customer downloads.

| What §0c could not grade | Where it landed                                                                                                                                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The `apps/` seam         | `features/admin` left `apps/client` outright. F3's `admin ↔ private` ESLint isolation is why this was a **move and not an untangling** — not one import had to be broken — and rule 1 in `CLAUDE.md` replaces it. |
| What the two apps share  | `packages/ui` (tokens, primitives, `useResource`) and `packages/shared` (the API contract). `AppState` was deliberately **not** shared: behaviour is worth one copy, appearance here is worth two.                |
| The conversation domain  | `features/conversations` on the server — a read model over leads and feedback, owning no storage. DECISION 027.1.                                                                                                 |

**Four defects were found by guards rather than by looking**, and they are recorded in
DECISION 027 rather than repeated here. The one worth naming is that the console was shipping
a **development React bundle** — 475 kB with 297 `jsxDEV` calls — from the same `envDir` trap
`apps/client` had already solved and written down. 259 kB once fixed, now pinned by
`apps/admin/src/app/bundle.test.ts`.

### Every path below §1 is pre-split, and is left that way on purpose

§§1–8 were written against `client/src/…` and `server/src/…`, and those links no longer
resolve. Rewriting them to `apps/client/src/…` would make most of them **wrong in a worse
way**: the migration this document specifies also deleted and renamed a great many of the
files it cites — `useAdminResource.ts`, `AdminProjectPage.tsx`, `features/admin/api/`,
`sections/` — so a rewritten path would still be broken while implying the file is there. An
audit is evidence of a state, and its evidence has to keep pointing at that state. Sections 0
through 0d are the part of this document that describes today.

### What remains, restated

| Item                                   | Status                                                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **E5** — the six mega-stylesheets      | **Unblocked 2026-08-15, not executed.** See the note below.                                                                              |
| **B3 remainder** — ad-hoc `.card*`     | Still open, still unaudited.                                                                                                             |
| **A content-chip primitive**           | Still open. An addition to the system rather than a migration.                                                                           |
| Realtime delivery for the inbox        | Deferred by DECISION 027. The transport choice should follow a working request/response path, not precede it.                            |
| Inbound email threading                | Deferred by DECISION 027. A prospect's reply lands in the owner's mail; threading it back needs an inbound provider and a matching rule. |
| Every project-portal lifecycle feature | Unchanged from §0c — specification versioning, estimates, stage durations, read receipts, `ProjectRequest`.                              |

### 0e. E5 is unblocked (2026-08-15)

E5 has been open since §0c for one stated reason, repeated in §0d: **CSS headroom is 0.6 kB, and
splitting a stylesheet can _increase_ the total through duplication.** That was the whole
argument, and it is no longer true.

`03_plan/ux_completeness_plan.md` raised the eager CSS ceiling from 112.0 / 18.0 to **120.0 /
20.0** — DECISION 029 — and finished at a measured 112.7 / 18.2. There are now **7.3 kB of raw
headroom and 1.8 kB gzipped**, which is enough to attempt a split and measure the result rather
than to argue about it in advance.

**It was deliberately not executed there.** E5 is a structural change with no UX state behind it,
and it is the riskiest item available: `Offer.module.css` has 347 classes and 16 importers, and
the failure mode is silent — the total goes up and nothing complains until the next budget check.
Doing it inside a plan about states would also have spent, on a refactor, the headroom that plan
raised for its own work.

So it is now a **scheduling** decision rather than a budget one. Whoever takes it should split one
stylesheet, measure, and stop if the total moves the wrong way. `Offer.module.css` alone is the
bounded version.

### 0f. E5 was executed, once, and the premise was wrong (2026-08-16)

`03_plan/deferred_work_plan.md` §3.8 and §9.13 hold the full record. Three things a reader
needs from here:

**1. The target list above is stale.** `Offer.module.css` is no longer a mega-stylesheet — the
offer rebuild (`7f3f75c`) split it, and it does not appear in the top fifteen by line count
today. The measured list is `Demo` (1,282), `Value` (990), `PlayBook` (835), `Pricing` (681),
`Home` (626), `Audit` (622), `Workbook` (604) and `Capabilities` (558).

**2. Splitting made the total smaller, not larger.** `YearOneEconomics.module.css` was cut out
of `Pricing.module.css` — ten classes, one consumer, no other reference anywhere. Eager CSS
moved **118.4 → 118.3 kB raw, gzipped unchanged at 19.2**. The argument that blocked this item
across §0c, §0d and §0e — that splitting can _increase_ the total through duplication — did not
hold on the first file it was tested against.

**3. The split found a defect class the guards cannot see, and that is why it stopped.**
`Pricing.module.css` serves eight components, several of which also import `Offer.module.css`.
A component can therefore write `styles['x']` and `offer['x']` for two different classes with
the same name, and a rule in one file is silently shadowed by the other.
`content.test.ts`'s dead-class sweep matches a class _name_ against the source, so it counts
the shadowed rule as live. Two instances were found in one seam: `.yearOnePaths`, provably dead
and deleted, and the `terms*` set, which carries real styling and was **left in place** because
relocating it changes what the page looks like — a visual change dressed as a refactor.

**E5 is therefore still open, and its next step is not another split.** It is extending
`content.test.ts` to check dead classes **per stylesheet** rather than per name. That guard is
what makes the remaining seven files safe to cut, and it is a smaller and better-specified piece
of work than what this document has been carrying since §0c.

---

## 1. Executive summary

| Dimension                       | Grade  | One-line justification                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Design tokens**               | **A−** | A single, disciplined semantic layer in [tokens.css](client/src/styles/tokens.css) with machine enforcement in [tokens.test.ts](client/src/styles/tokens.test.ts) — colour, z-index, breakpoints, type scale and radius cannot drift. Gaps are narrow: spacing and shadow are unenforced (44 + 7 raw declarations), and there is no component-token tier (§1.2). |
| **Primitives**                  | **B**  | One canonical Button (38 consumers), Field family (15), Icon (45), Layout family (59), and only 3 files containing raw `<svg>` — two of them justified. But six primitives are packed into one `Layout.tsx`, and Card/Badge are re-implemented as ad-hoc classes in 10 and 11 stylesheets respectively (§1.3).                                                   |
| **Patterns**                    | **C−** | `components/patterns/` exists and holds exactly one component. The genuine pattern set — loading/error/empty — lives inside a _feature_ at [AppState.tsx](client/src/features/private/components/AppState.tsx) and is reached across a boundary by three admin files (§1.3).                                                                                     |
| **Builder-function structure**  | **C**  | `createBillingService` is a single **713-line** function ([billing.service.ts:221-934](server/src/features/billing/billing.service.ts#L221-L934)); `PricingBlock` is a **460-line** render body. Orchestration and mechanics are interleaved in both (§1.1).                                                                                                     |
| **Composition vs. abstraction** | **B−** | Over-abstraction is contained but real: [capabilityMatch.ts](client/src/lib/capabilityMatch.ts) exports 16 functions, **8 with zero production consumers**. Under-composition is the larger debt: four near-identical form-submit hooks (900 lines), two divergent copies of one data hook, and `cx` hand-inlined 12+ times (§1.7).                              |
| **File size**                   | **B−** | 76 files cross 300 raw lines, but comment density runs 40–60%, so raw counts overstate the problem. On a 400-raw/300-code threshold, **7** genuine multi-responsibility offenders remain — plus six mega-stylesheets led by [Offer.module.css](client/src/features/public/home/Offer.module.css) at **3,048 lines / 347 classes / 16 importers** (§1.4).         |
| **Naming**                      | **A**  | 100% PascalCase for `.tsx` components and 100% camelCase for `.ts` on the client; `<feature>.<responsibility>.ts` on the server with five outliers. The deviation that matters is not casing — it is non-parallel _internal shapes_ across sibling features (§1.5).                                                                                              |
| **Folder structure**            | **C+** | Hybrid, mid-restructure. `public/` and `private/` boundaries exist, but `admin/`, `auth/` and `assessment/` sit as peers of them. **Zero of 27 client features have a public-API entry point** (0/27), against 8/13 on the server, and 15 imports reach into another feature's internals (§1.6).                                                                 |
| **Documentation**               | **C−** | 23 project `.md` files. The README's project-structure tree predates the boundary restructure entirely and still lists `features/ home, services, portfolio…` and two server features where thirteen exist. No `CLAUDE.md` or agent-rule file exists at all (§1.8).                                                                                              |

**The one-sentence read:** this codebase has an unusually strong _design-token_ culture and an unusually weak _module-boundary_ culture. Tokens are enforced by tests and hold; feature boundaries are enforced by nothing and have already been breached fifteen times. The migration should leave the token layer largely alone and spend its effort on entry points, the pattern layer, and three oversized orchestrators.

---

## 2. Current-state map

### 2.1 Actual tree (UI-relevant)

```
.
├── api/index.ts                     Vercel adapter — no business logic
├── client/
│   ├── scripts/                     build, build-seo, check-budget, capture-previews, fetch-media
│   └── src/
│       ├── app/                     App.tsx (481L), ErrorBoundary, router/{RequireAuth,RequireAdmin}
│       ├── assets/demos/            per-trade avif/webp/mp4 media
│       ├── components/
│       │   ├── ui/                  Button, Field, Icon, Layout, Reveal, ContactLink   ← PRIMITIVES
│       │   ├── patterns/            ScoreScale                                          ← 1 file only
│       │   ├── brand/               Logo
│       │   ├── layout/              SiteLayout, AuthLayout, AppLayout, Header, Footer,
│       │   │                        WorkspaceBar, PlaceholderNotice
│       │   └── marketing/           CtaBanner, Evidence, DeviceFrame, ReportExample
│       ├── config/                  routes(64), trades(14), demos(12), pricing(9), env(4), market(2)
│       ├── content/                 24 modules, ~11k lines, barrel at index.ts  ← ALL COPY
│       ├── features/
│       │   ├── public/              about audit capabilities contact demo faq home industries
│       │   │                        legal notFound playbook portfolio services teardown welcome
│       │   ├── private/             account api assessment billing components dashboard projects
│       │   ├── admin/               (peer of boundaries)  api/ + 4 loose files
│       │   ├── auth/                (peer of boundaries)  api/ components/ pages/ + 2 hooks
│       │   └── assessment/          (peer of boundaries)  api/ + draft.ts + fromAudit.ts
│       ├── hooks/                   useDocumentMeta(28), useInViewOnce(7), useActiveSection(1)
│       ├── lib/                     analytics(33), api(5), http(4), capabilityMatch(4),
│       │                            placeholders(3), contact(2)
│       ├── styles/                  tokens.css (360L), global.css, tokens.test.ts (406L)
│       └── types/                   content.ts (1101L), api.ts (535L)
└── server/src/
    ├── app/                         app.ts (530L), routes.ts (239L)
    ├── config/                      env.ts (363L)
    ├── features/                    activity admin assessments auth billing dashboard
    │                                deployments feedback leads onboarding projects
    │                                subscribers tasks          ← 13 features, 8 with index.ts
    ├── infrastructure/              database/mongoose, email/{email,resend}.service
    ├── lib/                         apiResponse appError emailTheme html logger requestSchema
    ├── middleware/                  csrf errorHandler notFound rateLimit requestContext
    └── testing/                     fakes.ts (563L), authFakes.ts (685L), platformApp.ts
```

**Structural classification (§1.6): hybrid, trending feature-first.** The server is close to the target — `features/<capability>/<capability>.<responsibility>.ts` with public-API entry points on the majority. The client is genuinely feature-first at the _folder_ level but has no public-API layer at all, and its boundary tier is half-built.

### 2.2 Boundary & feature census

**Real audiences in this application** (derived from the router, the layouts and the server guards, not from any doc):

| Boundary  | Audience                                                  | Shell                      | Guard                                  |
| --------- | --------------------------------------------------------- | -------------------------- | -------------------------------------- |
| `public`  | Anonymous visitors — marketing site + the five demo sites | `SiteLayout`, `DemoLayout` | none                                   |
| `auth`    | The crossing point: anonymous → signed-in                 | `AuthLayout`               | none                                   |
| `private` | Signed-in customers                                       | `AppLayout`                | `RequireAuth` + server `requireAuth`   |
| `admin`   | The owner/operator                                        | `AdminLayout`              | `RequireAdmin` + server `requireAdmin` |

`assessment` is **not** a boundary — it is a capability consumed by three of them (`public/audit`, `auth`, `private/assessment`). Its placement as a peer of the boundaries is a category error.

**Findings:**

- **Zero client features expose a public API.** `find features -name 'index.ts*'` → 0 results across 27 feature folders. Every consumer therefore imports a deep path, which is why the next finding exists.
- **15 imports reach into another feature's internals.** The worst is [StartAssessmentPage.tsx:10-11](client/src/features/private/assessment/StartAssessmentPage.tsx#L10-L11), where the _private_ boundary reaches into `public/audit/useAudit` **and** into `public/audit/sections/AuditScorecard` — past the feature, past its top level, into its `sections/` folder. Others: `admin` → `private/components/AppState` (3 files), `admin`/`private`/`app/router` → `auth/useAuth` (5 files), `auth` → `assessment/{api,draft}` (2), `assessment` → `public/playbook/useWebsiteScore` (1).
- **Shared UI imports feature code — the dependency direction is inverted.** [Header.tsx:5](client/src/components/layout/Header.tsx#L5), [AppLayout.tsx:5](client/src/components/layout/AppLayout.tsx#L5) and [WorkspaceBar.tsx:3](client/src/components/layout/WorkspaceBar.tsx#L3) all import `../../features/auth/useAuth`. `components/ui/` itself is clean — no primitive imports feature code.
- **Non-parallel internal shapes.** Of 27 features: three use `sections/` (`public/home`, `public/audit`, `public/playbook`), one uses `components/` + `pages/` (`auth`), five use `api/`, and the remaining eighteen are flat. `public/contact` holds 13 loose files; `public/playbook` holds 11.
- **Server, by contrast, is close to target:** 8/13 features have `index.ts`, and most cross-feature traffic goes through it. Ten imports still bypass it — e.g. [billing.repository.ts:1](server/src/features/billing/billing.repository.ts#L1) reaching `../projects/project.model.js`, [dashboard.routes.ts:6](server/src/features/dashboard/dashboard.routes.ts#L6) reaching `../billing/billing.summary.js`. Five features lack an entry point: `admin`, `billing`, `leads`, `onboarding`, `subscribers`.

### 2.3 Token inventory

All tokens live in one file, [client/src/styles/tokens.css](client/src/styles/tokens.css) (360 lines, ~55% commentary).

| Tier (§1.2)    | Present?                                  | Contents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Foundation** | **Partial — by design**                   | The _non-colour_ scales are foundation tokens in all but name: `--space-1…11` + `--space-hair`, `--radius-xs…full`, `--text-xs…4xl`, `--leading-*`, `--weight-*`, `--tracking-*`, `--z-raised/sticky/overlay`, `--transition-*`, `--ease-emphasised`. The four brand colour literals are documented in a comment ([tokens.css:48-67](client/src/styles/tokens.css#L48-L67)) rather than declared, with a stated rationale: each semantic colour is an independently _measured_ contrast value, not a derivation of a brand hue, so an alias would resolve to nothing a re-skin could safely turn. |
| **Semantic**   | **Yes — this is the whole colour system** | `--color-ink`, `--color-ink-muted`, `--color-ink-inverse`, `--color-on-accent`, `--color-surface{,-muted,-sunken,-dark,-dark-raised,-on-dark{,-strong}}`, `--color-page`, `--color-brand{,-strong}`, `--color-accent{,-strong,-deep,-text}`, `--color-tint-{brand,accent,success,danger}`, `--color-border{,-strong,-dark}`, `--color-focus`, `--color-success`, `--color-danger`, `--shadow-{sm,md,lg,card}`, `--container-{width,narrow,gutter}`, `--section-gap`.                                                                                                                              |
| **Component**  | **None**                                  | Zero `--button-*`, `--input-*`, `--card-*` tokens exist. Per §1.2 this tier is optional; its absence is not currently a defect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

**Enforcement already in place** — [tokens.test.ts](client/src/styles/tokens.test.ts), 406 lines, five rules, each with a "guards the guard" assertion so a broken regex cannot pass silently:

1. No colour literal in any UI-colour property across all `*.module.css` (>200 declarations checked).
2. Every `z-index` from the `--z-*` scale.
3. Only the six documented breakpoints; `max-width` must be a step minus `0.001rem`.
4. Every stated foreground/background pair computed against the real WCAG formula and required to clear 4.5:1 (>30 pairs), with a drift check that the test's palette table still matches `tokens.css`.
5. Every `font-size` and `border-radius` from a scale, with a two-directional exception list — a stale exception **fails** the test.

**Hardcoded-value sweep (feature code):**

| Category                                             | Count                           | Enforced?      | Top offenders                                                                                                                                                                                          |
| ---------------------------------------------------- | ------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hex in UI colour properties                          | **0**                           | ✅ rule 1      | —                                                                                                                                                                                                      |
| Hex anywhere outside `tokens.css`                    | 3                               | partial        | [Industry.module.css](client/src/features/public/industries/Industry.module.css), `global.css` (×2)                                                                                                    |
| Raw `z-index`                                        | **0**                           | ✅ rule 2      | —                                                                                                                                                                                                      |
| Off-scale breakpoint                                 | **0**                           | ✅ rule 3      | —                                                                                                                                                                                                      |
| Off-scale `font-size` / `border-radius`              | **0** (2 documented exceptions) | ✅ rule 5      | —                                                                                                                                                                                                      |
| **Raw spacing** (`padding`/`margin`/`gap` in px/rem) | **44**                          | ❌ **gap**     | Offer 13, PlayBook 5, Value 3, Home 3, Demo 3, Services 2, Contact 2, **Field 2**, ReportExample 2, DeviceFrame 2, +7 files ×1                                                                         |
| **Raw `box-shadow`**                                 | **7**                           | ❌ **gap**     | (explicitly excluded from rule 1 by design)                                                                                                                                                            |
| Inline `style={{}}` in TSX                           | 4                               | ❌ not scanned | [PasswordPages.tsx](client/src/features/auth/pages/PasswordPages.tsx) ×2, [ProgressBar.tsx](client/src/features/private/components/ProgressBar.tsx), [Reveal.tsx](client/src/components/ui/Reveal.tsx) |

Two of the 44 raw-spacing declarations are inside a **primitive** ([Field.module.css](client/src/components/ui/Field.module.css)), which is the leak that matters most — a primitive that hardcodes spacing exports that decision to all 15 of its consumers.

### 2.4 Primitive census

| Primitive                                            | Canonical impl                                                                                                                    | Consumers | Variants/states                                                               | Gaps                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button                                               | [Button.tsx](client/src/components/ui/Button.tsx) — `Button` + `ButtonLink`                                                       | **38**    | 4 variants × 2 sizes × `block`; correct `<button>` vs `<a>` vs `<Link>` split | 12 raw `<button>` elements survive outside `ui/`; 3 stylesheets declare `.button`-like classes                                                                                                                                                                                 |
| Field family                                         | [Field.tsx](client/src/components/ui/Field.tsx) — TextField, PasswordField, TextAreaField, SelectField, RadioGroupField, Honeypot | **15**    | error/hint/optional, full `aria-describedby` wiring, hidden "Error:" prefix   | 6 raw `<input>/<textarea>/<select>` outside `ui/`; `describedBy` logic duplicated at [Field.tsx:33](client/src/components/ui/Field.tsx#L33), [:288](client/src/components/ui/Field.tsx#L288) and [DemoQuoteForm.tsx:97](client/src/features/public/demo/DemoQuoteForm.tsx#L97) |
| Icon                                                 | [Icon.tsx](client/src/components/ui/Icon.tsx)                                                                                     | **45**    | single `name`/`size` surface                                                  | Excellent. Only 3 files contain raw `<svg>`: `Icon` itself, `Logo` (brand mark), `GoogleSignInButton` (Google's mark must be pixel-exact per their brand terms). No ad-hoc SVG in features.                                                                                    |
| Layout family                                        | [Layout.tsx](client/src/components/ui/Layout.tsx) — Container, Section, SectionHeading, **Card**, **Badge**, Grid                 | **59**    | Section tones, Grid 2/3 col, Card interactive/flush, Badge 3 tones            | **Six primitives in one 176-line file**; `Card` and `Badge` are not layout                                                                                                                                                                                                     |
| Card                                                 | as above                                                                                                                          | —         | —                                                                             | **10 stylesheets declare their own `.card*` classes**                                                                                                                                                                                                                          |
| Badge/chip/pill                                      | as above                                                                                                                          | —         | —                                                                             | **11 stylesheets declare their own `.badge`/`.chip`/`.pill`/`.tag` classes**                                                                                                                                                                                                   |
| Reveal (motion)                                      | [Reveal.tsx](client/src/components/ui/Reveal.tsx)                                                                                 | **26**    | —                                                                             | fine                                                                                                                                                                                                                                                                           |
| ContactLink                                          | [ContactLink.tsx](client/src/components/ui/ContactLink.tsx)                                                                       | 7         | —                                                                             | fine                                                                                                                                                                                                                                                                           |
| Modal / Sheet / Tooltip / Avatar / Switch / Checkbox | **none**                                                                                                                          | —         | —                                                                             | Not built. `tokens.css:327-347` explicitly declines to pre-declare z-index layers for them. **Correct under §1.7 (YAGNI) — do not build these speculatively.**                                                                                                                 |

**State coverage per primitive** (§1.3 requires a primitive to own hover/press/focus/disabled/loading):

| State             | Button                                                                                                                                                               | Field family           | Card / Badge | Verdict                                                         |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------ | --------------------------------------------------------------- |
| hover             | ✅ all 4 variants, correctly gated `:not(:disabled)`                                                                                                                 | ✅ ×4                  | ✅ ×2        | good                                                            |
| focus             | ✅ **globally** — [global.css:168](client/src/styles/global.css#L168) `:focus-visible { outline: 3px solid var(--color-focus) }`, one ring for the whole application | ✅ same                | ✅ same      | **strength — a single focus contract, not a per-primitive gap** |
| press / `:active` | ❌ **none**                                                                                                                                                          | ❌                     | ❌           | gap (F-26)                                                      |
| disabled          | ✅ `.base:disabled` + hover correctly suppressed                                                                                                                     | ❌ no disabled styling | n/a          | partial                                                         |
| **loading**       | ❌ **no prop, no styling**                                                                                                                                           | n/a                    | n/a          | **gap — hand-rolled at 9+ call sites (F-26)**                   |
| reduced motion    | ✅ **globally** — [global.css:200](client/src/styles/global.css#L200) neutralises every animation and transition                                                     | ✅ same                | ✅ same      | strength                                                        |

Two things this table corrects about a naive reading: focus and reduced-motion appear absent from every primitive stylesheet **because they are handled once, globally** — which is the correct architecture and must not be "fixed" by pushing them into primitives. The genuine gaps are **press** and **loading**.

**Verdict:** one canonical implementation per primitive that exists. This is the strongest part of the codebase. The counted failure is _bypass_, not duplication — features reach for a raw element or a local class instead of the primitive — plus two missing states on Button.

### 2.5 Pattern census

`components/patterns/` contains exactly one component. Every other recurring composite is either inside a feature or not extracted at all.

| Pattern (§1.3)                     | Where it lives now                                                                                                                                   | Consumers                                      | Verdict                                                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Loading / Error / Empty state      | [features/private/components/AppState.tsx](client/src/features/private/components/AppState.tsx) — `AppLoading`, `AppError`, `AppEmpty`               | **11 call sites across `private` and `admin`** | **Misplaced.** A pattern used by two boundaries living inside one of them. Promotion is justified by actual current repeated use (§1.7). |
| ScoreScale                         | [components/patterns/ScoreScale.tsx](client/src/components/patterns/ScoreScale.tsx)                                                                  | 2 features (`public/audit`, `public/playbook`) | ✅ correctly placed                                                                                                                      |
| DeviceFrame                        | [components/marketing/DeviceFrame.tsx](client/src/components/marketing/DeviceFrame.tsx)                                                              | **6 features**                                 | Correctly shared, arguably mis-foldered (`marketing/` vs `patterns/`)                                                                    |
| FormField (Label+Input+Hint+Error) | already inside `Field.tsx` as `FieldShell`                                                                                                           | 15                                             | ✅ solved                                                                                                                                |
| Empty state, re-implemented inline | [AdminProjectsPage.tsx:49-58](client/src/features/admin/AdminProjectsPage.tsx#L49-L58) uses local `.panel`/`.heading`/`.muted` instead of `AppEmpty` | —                                              | under-composition                                                                                                                        |
| ConfirmDialog, SearchBar, Toast    | do not exist                                                                                                                                         | —                                              | ✅ not needed — do not build (§1.7 YAGNI)                                                                                                |

`AppState` also **re-implements two primitives**: a raw `<button className={styles['retry']}>` where `Button` belongs, and a raw `<Link className={styles['emptyAction']}>` where `ButtonLink` belongs.

### 2.6 Abstraction audit

**Over-abstraction (§1.7):**

| Finding                                                                                                                                                                                                                                                                                                                     | Evidence                                                                                                                                                                                                                                                                                                                             | Severity |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `capabilityMatch.ts` exports 16 functions; **8 have zero production consumers.** `byCategory`, `byLifecycleStage`, `groupByTier`, `isAlreadyIncluded` are called _only by their own tests_ (dead). `fitScore`, `isAvailableToday`, `matchesIndustry`, `matchesServiceModel` are used internally and should not be exported. | [capabilityMatch.ts](client/src/lib/capabilityMatch.ts) 392L + 561L test                                                                                                                                                                                                                                                             | **High** |
| `capabilityMatch.ts` sits in shared `lib/` but **all four consumers are inside `features/public/capabilities/`**                                                                                                                                                                                                            | [CapabilitiesPage](client/src/features/public/capabilities/CapabilitiesPage.tsx), [CapabilityCard](client/src/features/public/capabilities/CapabilityCard.tsx), [CapabilityExplorer](client/src/features/public/capabilities/CapabilityExplorer.tsx), [IntegrationList](client/src/features/public/capabilities/IntegrationList.tsx) | Medium   |
| `lib/api.ts` is 52 lines of **three one-line pass-through wrappers** (`submitLead`, `requestPlaybook`, `submitOnboarding` → `httpPost(path, payload)`), and it holds the API operations for **three different features** while `admin`/`private`/`auth` correctly keep theirs in `features/<x>/api/`                        | [api.ts:25-51](client/src/lib/api.ts#L25-L51)                                                                                                                                                                                                                                                                                        | Medium   |
| `ReportExample.tsx` in shared `components/marketing/` — **1 consumer**                                                                                                                                                                                                                                                      | [CarePlans.tsx](client/src/features/public/home/sections/CarePlans.tsx)                                                                                                                                                                                                                                                              | Low      |
| `useActiveSection.ts` in shared `hooks/` — **1 consumer**                                                                                                                                                                                                                                                                   | [PlayBookPrinciples.tsx](client/src/features/public/playbook/sections/PlayBookPrinciples.tsx)                                                                                                                                                                                                                                        | Low      |

**Indirection-chain sweep (§1.7, ≥3 hops):** the deepest real chain is `feature api/ → lib/http → fetch` — **2 hops**, and `http.ts` genuinely centralises the `ApiResult` envelope, error mapping, credentials and CSRF for 30+ operations. Justified; not a finding. No chain of 3 or more hops for a simple behaviour exists anywhere in the client.

Notably **absent**: no class inheritance, no HOC chains, no `renderConfig` mega-components, no plugin systems, no premature interfaces with one implementation, no wrapper-around-a-library-just-in-case, no ≥3-hop indirection. The largest prop surface on any single component is 3 (`PricingBlock`). This codebase does not have an over-abstraction problem in the classic sense.

**Under-composition (§1.7, §1.1):**

| Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Evidence                                                                                                                                                                                                                                                                                                                    | Severity |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Four near-identical form-submit hooks, 900 lines total.** All four share: a `{idle\|submitting\|error\|sent}` discriminated union, `honeypotValue` state, a `useRef` in-flight guard, an `if (status.kind === 'submitting') return` early exit, and a validate→track→post→setStatus sequence.                                                                                                                                                                                                                                                                                                                     | [useContactForm](client/src/features/public/contact/useContactForm.ts) 165L, [useHeroLeadForm](client/src/features/public/contact/useHeroLeadForm.ts) 230L, [usePlayBookRequest](client/src/features/public/playbook/usePlayBookRequest.ts) 116L, [useAuditSubmit](client/src/features/public/audit/useAuditSubmit.ts) 210L | **High** |
| **Two copies of one data hook, with divergent behaviour.** `useAdminResource<TData>(key, fetch)` (3 consumers) and `useProjectOverview(projectId)` (1 consumer) are the same state machine; the second's own header comment says it was the model for the first. Their `mutate` semantics **disagree**: `useAdminResource` refetches after a _failed_ mutation ([:103](client/src/features/admin/useAdminResource.ts#L103)); `useProjectOverview` returns early and does not ([:86-89](client/src/features/private/projects/useProjectOverview.ts#L86-L89)). That is a latent stale-data defect, not a style issue. | both files                                                                                                                                                                                                                                                                                                                  | **High** |
| `cx` / `[...].filter(Boolean).join(' ')` hand-inlined in **12+ places**; a real `cx` exists but is private to `Layout.tsx`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | [Layout.tsx:9](client/src/components/ui/Layout.tsx#L9) + 12 inline sites incl. `Logo` ×2, `DeviceFrame` ×2, `Header`, `ScoreScale`, `ProjectPage`, `DemoChrome`, `ProductShot`, `Field` ×2                                                                                                                                  | Medium   |
| **713-line function.** `createBillingService` returns a 9-method object; its `handleWebhookEvent` alone spans [:542-933](server/src/features/billing/billing.service.ts#L542-L933) with a 9-case switch, each case containing full mechanics inline.                                                                                                                                                                                                                                                                                                                                                                | [billing.service.ts:221-934](server/src/features/billing/billing.service.ts#L221-L934)                                                                                                                                                                                                                                      | **High** |
| **460-line render body.** `PricingBlock` renders nine distinct commercial blocks in one JSX return, documented in its own header as a nine-question sequence — a numbered list of steps that are not functions.                                                                                                                                                                                                                                                                                                                                                                                                     | [PricingBlock.tsx:83-544](client/src/features/public/home/sections/PricingBlock.tsx#L83-L544)                                                                                                                                                                                                                               | **High** |
| `AdminProjectPage` — **read in full; the diagnosis is narrower than the line count suggests.** Its first 45 lines are a correct builder (params → error state → meta → `fetch` callback → resource → `run` orchestrator → guard clauses), and `UrlForm`/`TaskForm`/`ReplyForm` are **already extracted** below. The defect is the ~230-line JSX return holding five unnamed inline panels (facts, milestone, deployment, tasks, feedback).                                                                                                                                                                          | [AdminProjectPage.tsx:103-336](client/src/features/admin/AdminProjectPage.tsx#L103-L336)                                                                                                                                                                                                                                    | Medium   |
| `CredentialForm` body ~370 lines                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | [CredentialForm.tsx:86-460](client/src/features/auth/components/CredentialForm.tsx#L86-L460)                                                                                                                                                                                                                                | Medium   |

### 2.7 File-size audit

**Threshold used: 400 raw lines OR 300 code-only lines** (comments and blanks stripped). The brief's default is 300; this repository writes deliberately essay-length rationale comments running 40–60% of many files, so a raw-line rule would flag prose rather than responsibility. Both numbers are reported so the judgment is auditable. _This threshold is an Owner Decision (§6, D3)._

At 300 raw lines: **76 files** — of which 21 are tests, 13 are stylesheets, 17 are content data. At the adjusted threshold, the real list is:

| File                                                                          | Raw  | Code    | Verdict                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------- | ---- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [billing.service.ts](server/src/features/billing/billing.service.ts)          | 934  | **606** | **Split.** Webhook handling, checkout creation, portal sessions and project CRUD are four reasons to change.                                                                                                                                             |
| [types/content.ts](client/src/types/content.ts)                               | 1101 | **480** | **Split** by content domain, tracking `content/` modules. One type file for 24 content modules is a coupling magnet.                                                                                                                                     |
| [AdminProjectPage.tsx](client/src/features/admin/AdminProjectPage.tsx)        | 516  | **390** | **Split.** Page orchestration + 3 form components + milestone/URL/task/feedback mechanics.                                                                                                                                                               |
| [app/app.ts](server/src/app/app.ts)                                           | 530  | **379** | **Borderline — inspect.** Already decomposed into `createEmailService`/`createDatabaseConnect`/`createConfiguredStripeClient`/`createDefaultServices`; `createApp` at [:337](server/src/app/app.ts#L337) is a legitimate builder. Leave unless it grows. |
| [WelcomePage.tsx](client/src/features/public/welcome/WelcomePage.tsx)         | 420  | **368** | **Split** — a page and a multi-step onboarding form in one file.                                                                                                                                                                                         |
| [auth.service.ts](server/src/features/auth/auth.service.ts)                   | 578  | **346** | **Inspect.** Cohesive (one credential lifecycle) but near the line.                                                                                                                                                                                      |
| [PricingBlock.tsx](client/src/features/public/home/sections/PricingBlock.tsx) | 544  | **323** | **Split** — see §2.6. Nine named blocks, one builder.                                                                                                                                                                                                    |
| [types/api.ts](client/src/types/api.ts)                                       | 535  | ~300    | **Inspect** — contract file, high cohesion, mirrored by [contract.sync.test.ts](client/src/types/contract.sync.test.ts). Probably leave.                                                                                                                 |
| [config/pricing.ts](client/src/config/pricing.ts)                             | 649  | 254     | **Leave** — one cohesive responsibility (every figure as a number), guarded by [pricing.sync.test.ts](client/src/config/pricing.sync.test.ts).                                                                                                           |
| [App.tsx](client/src/app/App.tsx)                                             | 481  | 265     | **Leave the file, restructure the function** — 25 `lazy()` declarations + one route tree. See §4/F-08.                                                                                                                                                   |
| [capabilityMatch.ts](client/src/lib/capabilityMatch.ts)                       | 392  | **161** | **Move, then shrink** — 161 code lines is fine; the problem is placement and 8 unused exports.                                                                                                                                                           |
| [Field.tsx](client/src/components/ui/Field.tsx)                               | 369  | 261     | **Leave** — six form primitives, high cohesion, one reason to change.                                                                                                                                                                                    |
| [content/capabilities.ts](client/src/content/capabilities.ts)                 | 1861 | —       | **Leave as data**, but relocate (see §3). Content data files are not code modules; splitting them buys nothing.                                                                                                                                          |

**Stylesheets are the unlisted offender.** These are not covered by the code threshold but violate §1.4 the same way — one file, many responsibilities, many importers:

| Stylesheet                                                                     | Lines     | Classes | Importers |
| ------------------------------------------------------------------------------ | --------- | ------- | --------- |
| [Offer.module.css](client/src/features/public/home/Offer.module.css)           | **3,048** | **347** | **16**    |
| [Demo.module.css](client/src/features/public/demo/Demo.module.css)             | 1,226     | —       | 8         |
| [Value.module.css](client/src/features/public/home/Value.module.css)           | 990       | —       | 9         |
| [PlayBook.module.css](client/src/features/public/playbook/PlayBook.module.css) | 780       | —       | 7         |
| [Home.module.css](client/src/features/public/home/Home.module.css)             | 626       | —       | 6         |
| [Audit.module.css](client/src/features/public/audit/Audit.module.css)          | 622       | —       | 6         |

A CSS Module shared by 16 components has stopped being a module and become a global stylesheet with a hashed prefix — the exact coupling CSS Modules exist to prevent.

### 2.8 Naming drift

| Check                               | Result                                                                                                                                                                                                                      |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client `.tsx` casing                | **100% PascalCase.** Sole deviation: `main.tsx`, which is the Vite entry convention. ✅                                                                                                                                     |
| Client `.ts` casing                 | **100% camelCase.** Zero deviations. ✅                                                                                                                                                                                     |
| CSS Modules                         | 100% `<Name>.module.css`. ✅                                                                                                                                                                                                |
| Server file naming                  | `<feature>.<responsibility>.ts` dominant. Outliers: `currentAction.ts`, `identity.ts`, `password.ts`, `tokens.ts`, and `billing.customer.routes.ts` (three segments where the scheme has two).                              |
| Feature-dir singular/plural         | Mixed on both sides — client `industries`/`services` vs `home`/`contact`; server `leads`/`projects`/`tasks` vs `billing`/`auth`/`dashboard`. Defensible (mass nouns vs count nouns) but undocumented, so it reads as drift. |
| `PlayBook` casing                   | **Not drift.** `PlayBook` is the product's spelling and is used consistently across 20+ files including content; `playbook` lowercase is used for the URL and folder, which is correct.                                     |
| Intention-revealing names           | Strong throughout. `useAdminResource` is the one misleading name — it is a generic resource hook, not an admin-specific one, and its location reinforces the wrong idea.                                                    |
| **Parallel naming across siblings** | **The real failure.** See §2.2 — three features use `sections/`, one uses `components/`+`pages/`, five use `api/`, eighteen are flat. Same artifact class, four different shapes.                                           |

### 2.9 Dependency-direction check

| Rule (§1.2, §1.6)                                      | Status                                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Features import shared UI, not vice versa              | **❌ 3 violations** — `components/layout/{Header,AppLayout,WorkspaceBar}` import `features/auth/useAuth`                                                                                          |
| No primitive imports feature code                      | ✅ `components/ui/` is clean                                                                                                                                                                      |
| Pages don't decide primitive styling                   | ✅ largely — `Button`/`Field`/`Layout` own their own variants; leakage is via _bypass_ (raw `<button>`), not via prop-drilled styling                                                             |
| Cross-feature consumption via entry points             | **❌ 15 client violations** (no entry points exist), **10 server violations**                                                                                                                     |
| Feature code never consumes foundation tokens directly | ✅ **N/A by design** — the colour layer is semantic-only; the scale tokens (`--space-*`, `--radius-*`, `--text-*`) are _intended_ for direct consumption and there is no aliasing tier above them |
| Enforcement                                            | **❌ none.** [eslint.config.js](eslint.config.js) (104 lines) has no `no-restricted-imports` zones. Token rules are enforced by tests; boundary rules by nothing.                                 |

### 2.10 Documentation inventory (scoping for phase g — not used as rubric)

23 project `.md` files. **No `CLAUDE.md`, no `AGENTS.md`, no `.cursorrules`, no `.claude/` directory exists.**

| Document                                                                                                                                                                                                                                                                                                                                                                                                                                            | Lines | Describes architecture?                 | What the migration invalidates                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [README.md](README.md)                                                                                                                                                                                                                                                                                                                                                                                                                              | 819   | **Yes — heavily**                       | §"Project structure" tree ([:459-487](README.md#L459-L487)) is wholly pre-restructure: no `public/private/admin/auth/assessment`, no `components/patterns/` or `brand/`, server shown with 2 features where 13 exist. Plus stale paths at [:620](README.md#L620) (`features/demo/`) and [:720](README.md#L720) (`features/contact/`). Also the `components/ui/` inventory line and the `capabilityMatch` table row. |
| [docs/design-system.md](docs/design-system.md)                                                                                                                                                                                                                                                                                                                                                                                                      | 268   | **Yes — it is the §1.8 doc, partially** | §1 "Where it lives", §3 "Primitives", §4 "Patterns", §8 "Adding to it" all need re-pointing after primitives split and patterns move. §2 Tokens and §6 "What is enforced" stay largely true. **No composition-rules section exists.**                                                                                                                                                                               |
| [docs/CUSTOMER-PLATFORM.md](docs/CUSTOMER-PLATFORM.md)                                                                                                                                                                                                                                                                                                                                                                                              | —     | Yes                                     | Describes the private/admin surfaces and their file layout                                                                                                                                                                                                                                                                                                                                                          |
| [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md)                                                                                                                                                                                                                                                                                                                                                                                          | —     | Yes                                     | `features/playbook/…` paths ([:178](docs/IMPLEMENTATION-PLAN.md#L178), [:181](docs/IMPLEMENTATION-PLAN.md#L181))                                                                                                                                                                                                                                                                                                    |
| [docs/DEMO-SITES-PLAN.md](docs/DEMO-SITES-PLAN.md)                                                                                                                                                                                                                                                                                                                                                                                                  | —     | Yes                                     | `features/demo/` tree ([:112](docs/DEMO-SITES-PLAN.md#L112))                                                                                                                                                                                                                                                                                                                                                        |
| [docs/PLAYBOOK-20-PLAN.md](docs/PLAYBOOK-20-PLAN.md)                                                                                                                                                                                                                                                                                                                                                                                                | —     | Yes                                     | `features/services/` ([:143](docs/PLAYBOOK-20-PLAN.md#L143))                                                                                                                                                                                                                                                                                                                                                        |
| [docs/business-offer.md](docs/business-offer.md)                                                                                                                                                                                                                                                                                                                                                                                                    | —     | Partly                                  | `features/home/sections/PricingBlock.tsx` ([:532](docs/business-offer.md#L532))                                                                                                                                                                                                                                                                                                                                     |
| [docs/CONVERSION-UPGRADE-PLAN.md](docs/CONVERSION-UPGRADE-PLAN.md), [OFFER-REBUILD.md](docs/OFFER-REBUILD.md), [VALUE-PER-SECOND.md](docs/VALUE-PER-SECOND.md), [GOOGLE-SIGN-IN.md](docs/GOOGLE-SIGN-IN.md), [VISUAL-ASSETS.md](docs/VISUAL-ASSETS.md), [DEMO-QUALITY-UPGRADE.md](docs/DEMO-QUALITY-UPGRADE.md), [stripe-pricing-transition.md](docs/stripe-pricing-transition.md), [owner-decisions-required.md](docs/owner-decisions-required.md) | —     | Incidentally                            | Scattered `features/…` and `components/…` path references                                                                                                                                                                                                                                                                                                                                                           |
| [docs/deployment.md](docs/deployment.md)                                                                                                                                                                                                                                                                                                                                                                                                            | 110   | **No — route/infra only**               | Appeared in commit `7f3f75c` during the audit. Describes Vercel rewrites, headers and env vars, not source structure. Verify only that its `/app` and `/admin` rewrite reasoning still matches the boundary set after phase (d).                                                                                                                                                                                    |
| `docs/{MEDIA-CREDITS, business-growth-partner-scope, future-performance-guarantee, guarantee-terms, launch-standard-checklist, offer-configuration-checklist, playbook, proof-collection}.md`                                                                                                                                                                                                                                                       | —     | **No**                                  | Business/legal content — out of phase-g scope                                                                                                                                                                                                                                                                                                                                                                       |

**Phase-g scope: 13 documents to update, 1 to spot-check (`deployment.md`), 8 to leave alone, 1 agent-rule file to create.**

---

## 3. Target architecture

### 3.1 Layer diagram (adapted to React + Vite + CSS Modules)

```
  screens / pages          features/<boundary>/<feature>/*Page.tsx
        │  may import ▼
  feature components       features/<boundary>/<feature>/components/, sections/
        │  ▼
  patterns                 components/patterns/     ← composes primitives
        │  ▼
  primitives               components/ui/           ← owns variants, states, a11y
        │  ▼
  ( component tokens )     — none today; mint only under the D2 policy
        │  ▼
  semantic tokens          styles/tokens.css  --color-*, --shadow-*, --container-*
        │  ▼
  foundation scales        styles/tokens.css  --space-*, --radius-*, --text-*,
                                              --leading-*, --weight-*, --tracking-*,
                                              --z-*, --transition-*, --ease-*
```

**Two deliberate divergences from the brief's canonical model, both stack- and evidence-driven:**

1. **No separate foundation _colour_ tier.** [tokens.css:48-67](client/src/styles/tokens.css#L48-L67) argues that each semantic colour is an independently measured contrast value against a measured ground — `--color-accent-text` is not "ember, darker", it is _the one ember that clears 4.5:1 on cream_. An alias layer above that would resolve to nothing a re-skin could safely turn, which is precisely the indirection-that-does-not-pay-for-itself §1.7 forbids. The non-colour scales already _are_ the foundation tier. **Recommendation: keep as is.** (Owner Decision D1.)
2. **No TS token modules.** CSS custom properties are the platform-native mechanism here and are already machine-enforced. Translating them to TS would be motion without value.

### 3.2 Target feature tree (real paths)

```
client/src/
├── app/                              application shell — router, boundaries, session
│   ├── App.tsx                       route tree only; route groups extracted
│   ├── routes/                       publicRoutes.tsx, authRoutes.tsx,
│   │                                 appRoutes.tsx, adminRoutes.tsx, demoRoutes.tsx
│   ├── session/                      ← MOVED from features/auth
│   │   ├── AuthContext.tsx
│   │   ├── useAuth.ts
│   │   └── index.ts
│   ├── router/                       RequireAuth, RequireAdmin
│   └── ErrorBoundary.tsx
│
├── components/                       THE DESIGN SYSTEM
│   ├── ui/                           PRIMITIVES — one file per primitive
│   │   ├── Button.tsx  Button.module.css
│   │   ├── Card.tsx    Card.module.css        ← EXTRACTED from Layout.tsx
│   │   ├── Badge.tsx   Badge.module.css       ← EXTRACTED from Layout.tsx
│   │   ├── Container.tsx  Section.tsx  Grid.tsx   ← layout primitives, split out
│   │   ├── Field.tsx   Icon.tsx  Reveal.tsx  ContactLink.tsx
│   │   ├── cx.ts                              ← the one class-joiner
│   │   └── index.ts                           ← design-system public API
│   ├── patterns/
│   │   ├── AppState.tsx                       ← PROMOTED from features/private
│   │   ├── ScoreScale.tsx
│   │   ├── DeviceFrame.tsx                    ← moved from marketing/
│   │   └── index.ts
│   ├── brand/                        Logo
│   ├── layout/                       SiteLayout AuthLayout AppLayout Header Footer
│   │                                 WorkspaceBar PlaceholderNotice   (no feature imports)
│   └── marketing/                    CtaBanner, Evidence
│
├── config/  content/  hooks/  lib/  styles/  types/     (shared roots; 2+ consumers each)
│
└── features/
    ├── shared/                       cross-boundary capabilities
    │   └── assessment/               ← MOVED from features/assessment
    │       ├── api/  draft.ts  fromAudit.ts  index.ts
    ├── public/
    │   └── <feature>/
    │       ├── components/           feature-specific UI  (replaces ad-hoc `sections/`)
    │       ├── hooks/                one per file
    │       ├── services/             one operation per file (today: api/)
    │       ├── utils/  validators/  types/  constants/    as needed
    │       ├── <Feature>.module.css  or per-component modules
    │       └── index.ts              ← PUBLIC API (currently missing on all 27)
    ├── auth/                         boundary: the anonymous→signed-in crossing
    │   └── components/ pages/ services/ hooks/ index.ts
    ├── private/
    │   └── account/ assessment/ billing/ dashboard/ projects/ + index.ts each
    └── admin/
        └── accounts/ projects/ + index.ts each

server/src/                           already close to target — finish it
└── features/<capability>/
    ├── <capability>.{routes,controller,service,repository,model,schema,types,email}.ts
    └── index.ts                      ← add to admin, billing, leads, onboarding, subscribers
```

### 3.3 Folder-structure diff

| Current                                                           | Target                                                                                       | Why                                                                                     |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `features/{admin,auth,assessment}` as peers of `public`/`private` | `features/{public,auth,private,admin}` as the four boundaries; `features/shared/assessment/` | §1.6 — boundaries separate audiences; `assessment` is a capability, not an audience     |
| No `index.ts` on any of 27 client features                        | `index.ts` on every feature                                                                  | §1.6 — the feature entry point is a public API                                          |
| `Layout.tsx` = Container+Section+SectionHeading+Card+Badge+Grid   | one file per primitive, `components/ui/index.ts` barrel                                      | §1.3, §1.5 — Card and Badge are not layout                                              |
| `features/private/components/AppState.tsx`                        | `components/patterns/AppState.tsx`                                                           | §1.3 — 11 consumers across 2 boundaries                                                 |
| `features/auth/{AuthContext,useAuth}`                             | `app/session/`                                                                               | §1.2/§1.6 — restores dependency direction for `components/layout/`                      |
| `lib/capabilityMatch.ts` (+561L test)                             | `features/public/capabilities/utils/capabilityMatch.ts`                                      | §1.6 — all 4 consumers are in that one feature                                          |
| `content/capabilities.ts` (1,861L)                                | `features/public/capabilities/content/capabilities.ts`                                       | §1.6 — single-feature data, already excluded from the content barrel for bundle reasons |
| `components/marketing/ReportExample.tsx`                          | `features/public/home/components/ReportExample.tsx`                                          | §1.6 — 1 consumer                                                                       |
| `hooks/useActiveSection.ts`                                       | `features/public/playbook/hooks/useActiveSection.ts`                                         | §1.6 — 1 consumer                                                                       |
| `features/public/{home,audit,playbook}/sections/`                 | `components/`                                                                                | §1.5 — parallel naming across siblings                                                  |
| `Offer.module.css` (3,048L, 16 importers)                         | per-component modules under `features/public/home/components/`                               | §1.4                                                                                    |
| ESLint: no boundary rules                                         | `no-restricted-imports` zones                                                                | makes §1.6 enforceable rather than aspirational                                         |

### 3.4 Composition rules feature code will follow (§1.7)

1. **Compose, never extend.** No base components, no class hierarchies, no clone-and-specialise. Behaviour arrives as children, props, or a function call.
2. **Rule of Three, and then the smallest thing.** Do not extract until the third real occurrence. When you extract, extract the _smallest concrete function_ that removes the duplication — never a configurable framework. The four form hooks earn a shared `useSubmitStatus`; they do **not** earn a form library.
3. **Abstraction is justified by current repeated use, never by anticipated reuse.** Two or more real consumers today, or it stays where it is. One consumer means it lives with its consumer.
4. **A screen composes; it does not invent.** If a screen writes a raw `<button>`, `<input>`, `.card` or `.badge` class, that is a defect, not a shortcut.
5. **Top-level tells the story.** A component or service over ~40 code lines should read as a sequence of named calls (§1.1). Mechanics go one level down, in the same file or an adjacent one.
6. **No speculative surface.** No exported function without a production caller. No prop that nothing passes. No token for a component that does not exist.
7. **Low indirection.** A feature's entry point is one hop and it is the _only_ sanctioned hop. Nothing else may add a layer whose sole job is forwarding.

---

## 4. Gap analysis

Severity: **S1** = correctness risk or actively blocks the target architecture · **S2** = structural debt with real maintenance cost · **S3** = tidy-up.

| #    | Finding                                                                                                                                                                                                                                                                                                                                                                                                      | §        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sev    | Proposed remedy                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-01 | Two copies of one data hook with **divergent `mutate` semantics** — one refetches after a failed mutation, the other does not                                                                                                                                                                                                                                                                                | 1.7      | [useAdminResource.ts:97-106](client/src/features/admin/useAdminResource.ts#L97-L106) vs [useProjectOverview.ts:79-98](client/src/features/private/projects/useProjectOverview.ts#L79-L98)                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | **S1** | Keep the existing generic (3 real consumers, Rule of Three already satisfied), move it to `hooks/useResource.ts`, rename off "admin", and make `useProjectOverview` a **three-line concrete call** into it. Decide the failure semantics explicitly. No new abstraction — one is deleted.                                                                                                                                                                  |
| F-02 | Zero of 27 client features expose a public API, so all 15 cross-feature imports reach into internals                                                                                                                                                                                                                                                                                                         | 1.6      | `find features -name 'index.ts*'` → 0; [StartAssessmentPage.tsx:10-11](client/src/features/private/assessment/StartAssessmentPage.tsx#L10-L11) reaches into `public/audit/sections/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **S1** | Add `index.ts` to each feature exporting only what other features consume. This is a boundary, not an abstraction layer — one hop, and it _removes_ fifteen deeper ones. Enforce with ESLint `no-restricted-imports`.                                                                                                                                                                                                                                      |
| F-03 | Shared UI imports feature code — dependency direction inverted                                                                                                                                                                                                                                                                                                                                               | 1.2, 1.6 | [Header.tsx:5](client/src/components/layout/Header.tsx#L5), [AppLayout.tsx:5](client/src/components/layout/AppLayout.tsx#L5), [WorkspaceBar.tsx:3](client/src/components/layout/WorkspaceBar.tsx#L3)                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **S1** | **Move**, don't wrap: relocate `AuthContext`/`useAuth` to `app/session/`. Session state has 8+ consumers across shared layout, router guards and three boundaries — it is application state, not `auth`-feature state. `features/auth/` keeps the credential screens and API. Zero new indirection.                                                                                                                                                        |
| F-04 | `createBillingService` is a **713-line** function; `handleWebhookEvent` is a 9-case switch with all mechanics inline                                                                                                                                                                                                                                                                                         | 1.1, 1.4 | [billing.service.ts:221-934](server/src/features/billing/billing.service.ts#L221-L934), cases at [:703](server/src/features/billing/billing.service.ts#L703)–[:879](server/src/features/billing/billing.service.ts#L879)                                                                                                                                                                                                                                                                                                                                                                                                                                             | **S1** | Extract each `case` body to a named module-level function (`handleCheckoutCompleted`, `handleInvoicePaid`, `handleSubscriptionChanged`, `handlePaymentFailed`, `handleChargeRefunded`) taking explicit dependencies. **Keep the switch** — it is the story. Do not build a handler registry or an event-map object; that would trade a readable switch for a lookup table (§1.7).                                                                          |
| F-05 | Four near-identical form-submit hooks, 900 lines                                                                                                                                                                                                                                                                                                                                                             | 1.7, 1.1 | [useContactForm](client/src/features/public/contact/useContactForm.ts), [useHeroLeadForm](client/src/features/public/contact/useHeroLeadForm.ts), [usePlayBookRequest](client/src/features/public/playbook/usePlayBookRequest.ts), [useAuditSubmit](client/src/features/public/audit/useAuditSubmit.ts)                                                                                                                                                                                                                                                                                                                                                              | **S1** | Extract exactly **one** small hook — `useSubmitStatus()` owning the `{idle\|submitting\|error\|sent}` union, the in-flight ref guard, and the honeypot field. ~35 lines, four proven consumers. Each feature keeps its own values shape, its own validation and its own analytics call. **Explicitly not a form framework** — no schema prop, no field config, no generic submit pipeline.                                                                 |
| F-06 | `PricingBlock` renders nine commercial blocks in one 460-line return                                                                                                                                                                                                                                                                                                                                         | 1.1, 1.4 | [PricingBlock.tsx:83-544](client/src/features/public/home/sections/PricingBlock.tsx#L83-L544)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **S2** | Its own header comment already numbers the nine steps. Turn each into a named local component (`FoundingCondition`, `BuildCard`, `ConversionFixCard`, `YearOneFigures`, `RelationshipDiagram`, `CommercialTerms`, `MarketComparison`) and let `PricingBlock` become the ~30-line builder that composes them. Same file or an adjacent `components/` folder — no props plumbing beyond what is already computed.                                            |
| F-07 | `capabilityMatch.ts` exports 16 functions; 8 have zero production consumers                                                                                                                                                                                                                                                                                                                                  | 1.7      | [capabilityMatch.ts](client/src/lib/capabilityMatch.ts); `byCategory`/`byLifecycleStage`/`groupByTier`/`isAlreadyIncluded` called only by tests                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | **S2** | Delete the four dead functions and their tests. Un-export the four internal-only ones (`fitScore`, `isAvailableToday`, `matchesIndustry`, `matchesServiceModel`) and test them through `recommendFor`/`filterCapabilities`, which is where they are actually reachable.                                                                                                                                                                                    |
| F-08 | `App.tsx` mixes 25 `lazy()` declarations with the route tree                                                                                                                                                                                                                                                                                                                                                 | 1.1      | [App.tsx:46-270](client/src/app/App.tsx#L46-L270) then [:272](client/src/app/App.tsx#L272)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **S2** | Split into `app/routes/{publicRoutes,authRoutes,appRoutes,adminRoutes,demoRoutes}.tsx`, each owning its own `lazy()` calls and exporting a `<Route>` fragment. `App()` becomes a ~25-line builder: boundary → router → provider → five route groups. Preserves every code-split boundary; verify against `check-budget`.                                                                                                                                   |
| F-09 | `AppState` (loading/error/empty) lives in a feature but serves two boundaries                                                                                                                                                                                                                                                                                                                                | 1.3, 1.6 | [AppState.tsx](client/src/features/private/components/AppState.tsx); imported by [AdminAccountsPage:2](client/src/features/admin/AdminAccountsPage.tsx#L2), [AdminProjectPage:7](client/src/features/admin/AdminProjectPage.tsx#L7), [AdminProjectsPage:4](client/src/features/admin/AdminProjectsPage.tsx#L4) + 8 private call sites                                                                                                                                                                                                                                                                                                                                | **S2** | Promote to `components/patterns/AppState.tsx`. Justified by 11 current consumers across 2 boundaries — not speculative.                                                                                                                                                                                                                                                                                                                                    |
| F-10 | `AppState` re-implements Button and ButtonLink                                                                                                                                                                                                                                                                                                                                                               | 1.3      | raw `<button className={styles['retry']}>` and `<Link className={styles['emptyAction']}>` in [AppState.tsx](client/src/features/private/components/AppState.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | **S2** | Use `Button` and `ButtonLink`. Delete the local classes.                                                                                                                                                                                                                                                                                                                                                                                                   |
| F-11 | Card re-implemented in 10 stylesheets; Badge/chip/pill in 11                                                                                                                                                                                                                                                                                                                                                 | 1.3      | `.card*` in 10 `*.module.css`; `.badge`/`.chip`/`.pill`/`.tag` in 11                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | **S2** | Audit each against `Card`/`Badge`. Migrate what matches; where a genuine variant is needed, add it to the primitive rather than to the feature stylesheet. Demo-site stylesheets are a legitimate exception — those depict five other businesses' brands.                                                                                                                                                                                                  |
| F-12 | 12 raw `<button>` and 6 raw form controls outside `components/ui/`                                                                                                                                                                                                                                                                                                                                           | 1.3      | [AppLayout](client/src/components/layout/AppLayout.tsx) ×2, [Header](client/src/components/layout/Header.tsx), [DemoQuoteForm](client/src/features/public/demo/DemoQuoteForm.tsx) ×3, [CapabilityExplorer:212](client/src/features/public/capabilities/CapabilityExplorer.tsx#L212), [AuditFunnel:160](client/src/features/public/audit/sections/AuditFunnel.tsx#L160), +5                                                                                                                                                                                                                                                                                           | **S2** | Case-by-case: menu toggles and disclosure buttons may legitimately need bare elements — add `IconButton` to `ui/` **only if** three or more such cases survive review. `DemoQuoteForm`'s duplicated `aria-describedby` wiring should reuse `FieldShell` even where the demo's visual styling differs.                                                                                                                                                      |
| F-13 | Single-feature code in shared roots                                                                                                                                                                                                                                                                                                                                                                          | 1.6      | `lib/capabilityMatch.ts` (4 consumers, all in `public/capabilities`); `components/marketing/ReportExample.tsx` (1); `hooks/useActiveSection.ts` (1)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | **S2** | Move each into its consuming feature. The shared-root bar is two or more features.                                                                                                                                                                                                                                                                                                                                                                         |
| F-14 | Six mega-stylesheets, led by 3,048 lines / 347 classes / 16 importers                                                                                                                                                                                                                                                                                                                                        | 1.4      | [Offer.module.css](client/src/features/public/home/Offer.module.css), [Demo](client/src/features/public/demo/Demo.module.css), [Value](client/src/features/public/home/Value.module.css), [PlayBook](client/src/features/public/playbook/PlayBook.module.css), [Home](client/src/features/public/home/Home.module.css), [Audit](client/src/features/public/audit/Audit.module.css)                                                                                                                                                                                                                                                                                   | **S2** | Split per-component alongside the component split (F-06). A module imported by 16 components is a global stylesheet with a hashed prefix. Do this _with_ F-06, not before — splitting CSS ahead of the components it serves creates churn.                                                                                                                                                                                                                 |
| F-15 | Spacing and shadow are the only unenforced token categories: 44 raw spacing declarations, 7 raw shadows                                                                                                                                                                                                                                                                                                      | 1.2      | [Offer.module.css](client/src/features/public/home/Offer.module.css) ×13, [PlayBook](client/src/features/public/playbook/PlayBook.module.css) ×5, [Value](client/src/features/public/home/Value.module.css) ×3, **[Field.module.css](client/src/components/ui/Field.module.css) ×2 (in a primitive)**                                                                                                                                                                                                                                                                                                                                                                | **S2** | Migrate the 44 to `--space-*`, starting with the two inside a primitive. Then add a sixth rule to [tokens.test.ts](client/src/styles/tokens.test.ts) mirroring the existing shape — same offenders array, same "guards the guard" assertion, same two-directional exception list. Extending a proven mechanism, not inventing one.                                                                                                                         |
| F-16 | `admin`, `auth`, `assessment` sit as peers of the `public`/`private` boundaries                                                                                                                                                                                                                                                                                                                              | 1.6      | `ls client/src/features`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | **S2** | Promote `auth` and `admin` to named boundaries (they have distinct audiences, layouts and guards). Move `assessment` to `features/shared/assessment/` — three boundaries consume it. (Owner Decision D4.)                                                                                                                                                                                                                                                  |
| F-17 | Ten server cross-feature imports bypass the entry point; five features lack one                                                                                                                                                                                                                                                                                                                              | 1.6      | [billing.repository.ts:1](server/src/features/billing/billing.repository.ts#L1), [dashboard.routes.ts:6](server/src/features/dashboard/dashboard.routes.ts#L6), [deployment.service.ts:3-4](server/src/features/deployments/deployment.service.ts#L3-L4), [admin.routes.ts:22](server/src/features/admin/admin.routes.ts#L22), +6                                                                                                                                                                                                                                                                                                                                    | **S2** | Add `index.ts` to `admin`, `billing`, `leads`, `onboarding`, `subscribers`; re-export what the ten deep imports need; rewrite them. The server is 80% there — this is finishing, not restructuring.                                                                                                                                                                                                                                                        |
| F-18 | Non-parallel internal shapes across sibling features                                                                                                                                                                                                                                                                                                                                                         | 1.5, 1.6 | 3 use `sections/`, 1 uses `components/`+`pages/`, 5 use `api/`, 18 flat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **S3** | Standardise on the §1.6 vocabulary: `components/ hooks/ services/ utils/ validators/ types/ constants/`, included only as needed. Rename `sections/` → `components/`, `api/` → `services/` with one operation per file.                                                                                                                                                                                                                                    |
| F-19 | Six primitives in one `Layout.tsx`; `Card` and `Badge` are not layout                                                                                                                                                                                                                                                                                                                                        | 1.3, 1.5 | [Layout.tsx](client/src/components/ui/Layout.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **S3** | Split one file per primitive with a `components/ui/index.ts` barrel. Import sites change from a path to a name.                                                                                                                                                                                                                                                                                                                                            |
| F-20 | `cx` hand-inlined 12+ times while a real one is private to `Layout.tsx`                                                                                                                                                                                                                                                                                                                                      | 1.7      | [Layout.tsx:9](client/src/components/ui/Layout.tsx#L9) + 12 sites                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | **S3** | Promote to `components/ui/cx.ts` and use it. Twelve consumers; the smallest possible concrete function.                                                                                                                                                                                                                                                                                                                                                    |
| F-21 | `AdminProjectsPage` re-implements an empty state inline                                                                                                                                                                                                                                                                                                                                                      | 1.3      | [AdminProjectsPage.tsx:49-58](client/src/features/admin/AdminProjectsPage.tsx#L49-L58)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **S3** | Use `AppEmpty` after F-09.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| F-22 | Four inline `style={{}}` uses bypass the token system unscanned                                                                                                                                                                                                                                                                                                                                              | 1.2      | [PasswordPages.tsx](client/src/features/auth/pages/PasswordPages.tsx) ×2, [ProgressBar.tsx](client/src/features/private/components/ProgressBar.tsx), [Reveal.tsx](client/src/components/ui/Reveal.tsx)                                                                                                                                                                                                                                                                                                                                                                                                                                                               | **S3** | Inspect each. Dynamic values (a progress percentage) are legitimate as CSS custom-property assignments; static ones move to the stylesheet.                                                                                                                                                                                                                                                                                                                |
| F-23 | Five server files deviate from `<feature>.<responsibility>.ts`                                                                                                                                                                                                                                                                                                                                               | 1.5      | `currentAction.ts`, `identity.ts`, `password.ts`, `tokens.ts`, `billing.customer.routes.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **S3** | Rename to the two-segment scheme (`auth.password.ts`, `auth.tokens.ts`, `dashboard.currentAction.ts`, …) or document the exception. Low value; batch with other churn.                                                                                                                                                                                                                                                                                     |
| F-24 | No agent-rule file exists                                                                                                                                                                                                                                                                                                                                                                                    | 1.8      | no `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.claude/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | **S2** | Create `CLAUDE.md` in phase (g) carrying the composition rules, the feature-first layout, the token layers and the naming scheme. Its absence is why a restructure could get half-done without anything catching it.                                                                                                                                                                                                                                       |
| F-25 | README's project-structure tree is wholly pre-restructure                                                                                                                                                                                                                                                                                                                                                    | 1.8      | [README.md:459-487](README.md#L459-L487), plus [:620](README.md#L620), [:720](README.md#L720)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | **S2** | Phase (g). A doc that teaches the old layout will have agents recreate it.                                                                                                                                                                                                                                                                                                                                                                                 |
| F-26 | **Button owns no `loading` and no press state.** §1.3 makes both the primitive's job. Instead the loading state is hand-rolled at **9+ call sites** by swapping the label text, each inventing its own string (`'Sending…'`, `'Saving…'`, `'Opening Stripe…'`, `'Approving…'`). No `:active` rule exists on any variant.                                                                                     | 1.3      | [PasswordPages.tsx:185](client/src/features/auth/pages/PasswordPages.tsx#L185), [:355](client/src/features/auth/pages/PasswordPages.tsx#L355), [BillingPage.tsx:177](client/src/features/private/billing/BillingPage.tsx#L177), [:290](client/src/features/private/billing/BillingPage.tsx#L290), [ApprovalPanel.tsx:83](client/src/features/private/projects/ApprovalPanel.tsx#L83), [FeedbackThread.tsx:84](client/src/features/private/projects/FeedbackThread.tsx#L84), [StartAssessmentPage.tsx:155](client/src/features/private/assessment/StartAssessmentPage.tsx#L155), +2; [Button.module.css](client/src/components/ui/Button.module.css) has no `:active` | **S2** | Add a `loading?: boolean` prop to `Button` that owns the busy affordance (`aria-busy`, disabled-while-busy, a spinner or a stable-width label slot) and an `:active` rule per variant. **Justified by 9 current consumers, not by anticipated reuse (§1.7).** Keep the _words_ in the call site — the primitive owns the mechanics of "busy", the feature owns its own copy. Do not add a `loadingText` prop; that would move copy into the design system. |
| F-27 | **Two non-equivalent disabled mechanisms coexist.** 11 sites use `disabled={busy}`; [CredentialForm.tsx:511](client/src/features/auth/components/CredentialForm.tsx#L511) uses `aria-disabled={busy \|\| undefined}`. These differ materially — `disabled` removes the control from the tab order and blocks the click; `aria-disabled` announces disabled while still focusable and still firing `onClick`. | 1.3, 1.5 | [AdminProjectPage.tsx:175](client/src/features/admin/AdminProjectPage.tsx#L175) et al. (11 sites) vs [CredentialForm.tsx:511](client/src/features/auth/components/CredentialForm.tsx#L511)                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **S2** | Pick one and state the rule in the design-system doc. Recommend `aria-disabled` for **submit** buttons (keeps the control focusable so a screen-reader user can find why it is blocked; the form hooks' existing `useRef` guard already prevents double-submit) and `disabled` everywhere else. Resolve as part of F-26 so `Button` encodes the choice rather than each call site re-deciding it.                                                          |
| F-28 | `lib/api.ts` is three one-line pass-throughs holding **three different features'** operations in a shared root, while `admin`/`private`/`auth` correctly colocate theirs                                                                                                                                                                                                                                     | 1.6, 1.7 | [api.ts:25-51](client/src/lib/api.ts#L25-L51); cf. [adminApi.ts](client/src/features/admin/api/adminApi.ts), [appApi.ts](client/src/features/private/api/appApi.ts), [authApi.ts](client/src/features/auth/api/authApi.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                           | **S3** | Dissolve it into `features/public/contact/services/submitLead.ts`, `features/public/playbook/services/requestPlaybook.ts`, `features/public/welcome/services/submitOnboarding.ts` — one operation per file per §1.6. This **deletes** a layer rather than adding one. `lib/http.ts` stays; it has 30+ consumers and earns its place.                                                                                                                       |

---

## 5. Migration plan

**Global rules for every batch:** one batch = one commit; `npm run verify` (format → lint → typecheck → 57 test files → build) must pass before commit; rollback is `git revert` of that single commit. `client/scripts/check-budget.ts` guards the eager-bundle payload — any batch touching `App.tsx`, `lazy()` boundaries, or `content/` imports must be checked against it specifically.

**Pre-flight (blocking, do first):** the working tree carries ~300 untracked files and 99 deletions from an in-flight restructure. **Commit or stash that state before batch A1.** Every estimate below assumes a clean tree; starting a migration on top of an uncommitted restructure makes every rollback ambiguous.

### Phase (a) — Token layer consolidation · 3 batches · ~2 days

| Batch  | Scope                                                                                                                                             | Files   | Risk              | Verification                                           | Rollback |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------- | ------------------------------------------------------ | -------- |
| **A1** | Migrate the 44 raw spacing declarations to `--space-*`, **primitives first** ([Field.module.css](client/src/components/ui/Field.module.css))      | ~17 CSS | Low — visual only | `npm run verify`; visual diff of Home, Offer, PlayBook | revert   |
| **A2** | Add spacing + `box-shadow` rules to [tokens.test.ts](client/src/styles/tokens.test.ts), mirroring the existing rule shape and exception mechanism | 1 test  | Low               | rule must fail before A1 and pass after                | revert   |
| **A3** | Resolve the 3 stray hex and the 4 inline `style={{}}` uses                                                                                        | 5       | Low               | `npm run verify`                                       | revert   |

_Visible UI delta: none intended — this phase must be pixel-neutral, and that is the point. Any visible change means a token was mismapped._

### Phase (b) — Primitive canonicalisation · 5 batches · ~4 days

| Batch  | Scope                                                                                                                                                                    | Files                    | Risk                                            | Verification                                                                              | Rollback |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| **B1** | `cx.ts` → `components/ui/`; replace 12 inline joiners (F-20)                                                                                                             | ~13                      | Low                                             | `npm run verify`                                                                          | revert   |
| **B2** | Split `Layout.tsx` into `Container/Section/SectionHeading/Card/Badge/Grid`; add `components/ui/index.ts` (F-19)                                                          | 7 new + ~59 import sites | **Medium** — highest import fan-out in the repo | `npm run verify`; [outline.test.tsx](client/src/app/outline.test.tsx) must pass unchanged | revert   |
| **B3** | Migrate the 10 ad-hoc `.card*` and 11 `.badge`/`.chip` class sets to the primitives; add genuine missing variants **to the primitive** (F-11). Exclude demo stylesheets. | ~20                      | **Medium** — real visual risk                   | `npm run verify`; page-by-page visual review                                              | revert   |
| **B4** | Review the 12 raw `<button>` and 6 raw form controls (F-12); introduce `IconButton` **only if** ≥3 cases justify it                                                      | ~15                      | Low                                             | `npm run verify`; a11y tests (`jsx-a11y` is already in lint)                              | revert   |

| **B5** | Add `loading` + `:active` to `Button`; settle the `disabled` vs `aria-disabled` rule and encode it in the primitive; migrate the 9+ hand-rolled label swaps (F-26, F-27) | ~12 | **Medium** — touches every submit path | `npm run verify`; a11y lint; keyboard walkthrough of one form per boundary | revert |

_Visible UI delta: B3 is the first batch a person can see — consistent card lift and badge treatment across the site. B5 is the second: every button in the product gains a real press and busy affordance._

### Phase (c) — Pattern extraction · 2 batches · ~1 day

| Batch  | Scope                                                                                                             | Files            | Risk | Verification     | Rollback |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ---------------- | ---- | ---------------- | -------- |
| **C1** | Promote `AppState` → `components/patterns/`; add `patterns/index.ts`; move `DeviceFrame` from `marketing/` (F-09) | ~18 import sites | Low  | `npm run verify` | revert   |
| **C2** | `AppState` uses `Button`/`ButtonLink` (F-10); `AdminProjectsPage` uses `AppEmpty` (F-21)                          | 3                | Low  | `npm run verify` | revert   |

_Visible UI delta: retry and empty-state actions gain the real button treatment on every private and admin page._

### Phase (d) — Feature-first restructuring + public-API entry points · 5 batches · ~4 days

Order matters: entry points **before** any move, so cross-feature imports have somewhere to land.

| Batch  | Scope                                                                                                                                       | Files     | Risk                                                      | Verification                                                                                                                                                                                                                        | Rollback |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **D1** | Add `index.ts` to all 27 client features exporting current cross-feature consumption only (F-02)                                            | 27 new    | Low — additive, nothing rewritten yet                     | `npm run verify`                                                                                                                                                                                                                    | revert   |
| **D2** | Rewrite the 15 deep cross-feature imports to go through entry points                                                                        | ~15       | Low                                                       | `npm run verify`                                                                                                                                                                                                                    | revert   |
| **D3** | Move `AuthContext`/`useAuth` → `app/session/`; repoint 8 consumers (F-03)                                                                   | ~10       | **Medium** — touches the provider every page mounts under | `npm run verify`; [boundary.test.tsx](client/src/app/boundary.test.tsx), [AppLayout.test.tsx](client/src/components/layout/AppLayout.test.tsx), [credentialPages.test.tsx](client/src/features/auth/pages/credentialPages.test.tsx) | revert   |
| **D4** | Boundary promotion: `auth`/`admin` as named boundaries; `assessment` → `features/shared/assessment/` (F-16) — **pending Owner Decision D4** | ~20 moved | Medium                                                    | `npm run verify`                                                                                                                                                                                                                    | revert   |
| **D5** | Add `index.ts` to the 5 server features that lack one; rewrite the 10 deep server imports (F-17)                                            | ~15       | Low                                                       | `npm run verify`; server API tests                                                                                                                                                                                                  | revert   |

### Phase (e) — Feature migration, value elimination, abstraction dismantling · 8 batches · ~6 days

| Batch  | Scope                                                                                                                                                                       | Files              | Risk                                 | Verification                                                                                                                                                                                                                                                                                                    | Rollback |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **E1** | Consolidate `useProjectOverview` into a shared `hooks/useResource.ts`; **resolve the divergent failure semantics explicitly** (F-01)                                        | 4                  | **Medium** — behavioural             | `npm run verify`; [DashboardPage.test.tsx](client/src/features/private/dashboard/DashboardPage.test.tsx); manual admin mutation walkthrough                                                                                                                                                                     | revert   |
| **E2** | Extract `useSubmitStatus`; rewrite the four form hooks onto it (F-05)                                                                                                       | 6                  | **Medium** — every lead-capture path | `npm run verify`; [ContactForm.test.tsx](client/src/features/public/contact/ContactForm.test.tsx), [HeroLeadForm.test.tsx](client/src/features/public/contact/HeroLeadForm.test.tsx), [AuditPage.test.tsx](client/src/features/public/audit/AuditPage.test.tsx); **manual end-to-end submit of all four forms** | revert   |
| **E3** | Split `billing.service.ts` webhook handlers into named functions (F-04)                                                                                                     | 3–5                | **High** — payment path              | [billing.service.test.ts](server/src/features/billing/billing.service.test.ts) (893L) + [billing.api.test.ts](server/src/features/billing/billing.api.test.ts) must pass **unchanged**; Stripe CLI webhook replay                                                                                               | revert   |
| **E4** | Split `PricingBlock` into nine named blocks + builder (F-06)                                                                                                                | 2–9                | Medium                               | [HomePage.test.tsx](client/src/features/public/home/HomePage.test.tsx) (651L) must pass unchanged                                                                                                                                                                                                               | revert   |
| **E5** | Split `Offer.module.css` alongside E4; then `Value`, `Home`, `PlayBook`, `Audit`, `Demo` (F-14)                                                                             | ~6 CSS + importers | Medium                               | `npm run verify`; `check-budget`; visual review                                                                                                                                                                                                                                                                 | revert   |
| **E6** | Delete 4 dead `capabilityMatch` exports + tests; un-export 4 internal ones; move the module and `content/capabilities.ts` into `features/public/capabilities/` (F-07, F-13) | ~8                 | Low                                  | `npm run verify`; **`check-budget` is critical** — `capabilities.ts` is deliberately absent from the content barrel to keep it out of the eager bundle                                                                                                                                                          | revert   |
| **E7** | Move `ReportExample` and `useActiveSection` into their consuming features (F-13); dissolve `lib/api.ts` into three feature `services/` files, keeping `lib/http.ts` (F-28)  | 8                  | Low                                  | `npm run verify`                                                                                                                                                                                                                                                                                                | revert   |
| **E8** | Split `App.tsx` into five route-group modules (F-08)                                                                                                                        | 6                  | **Medium** — every `lazy()` boundary | `npm run verify`; **`check-budget` must not regress**; [outline.test.tsx](client/src/app/outline.test.tsx)                                                                                                                                                                                                      | revert   |

### Phase (f) — Old-way removal + repo-wide verification · 4 batches · ~3 days

| Batch  | Scope                                                                                                                                                                                               | Files     | Risk         | Verification                                                          | Rollback |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------ | --------------------------------------------------------------------- | -------- |
| **F1** | Rename `sections/` → `components/`, `api/` → `services/` (one operation per file); align feature internals to the §1.6 vocabulary (F-18)                                                            | ~60 moved | Low but wide | `npm run verify`                                                      | revert   |
| **F2** | Server naming outliers → `<feature>.<responsibility>.ts` (F-23)                                                                                                                                     | 5         | Low          | `npm run verify`                                                      | revert   |
| **F3** | ESLint `no-restricted-imports` zones: features may not import another feature's internals; `components/**` may not import `features/**`; `components/ui/**` may not import `components/patterns/**` | 1         | Low          | `npm run lint` must fail on a deliberately-added violation, then pass | revert   |
| **F4** | **Verification audit** — run every check in §8 and record the numbers                                                                                                                               | 0         | —            | the §8 checklist                                                      | —        |

### Phase (g) — MANDATORY FINAL PHASE: documentation alignment · 4 batches · ~2 days

_The migration is not complete until this phase is done. Scoped by §2.10._

| Batch  | Scope                                                                                                                                                                                                                                                                                                                             | Files | Risk | Verification                               | Rollback |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ---- | ------------------------------------------ | -------- |
| **G1** | Rewrite [README.md](README.md) §"Project structure" to the real tree; fix the stale paths at [:620](README.md#L620), [:720](README.md#L720); update the `components/ui/` inventory and the `capabilityMatch` table row (F-25)                                                                                                     | 1     | Low  | every path in the doc resolves — script it | revert   |
| **G2** | Update [docs/design-system.md](docs/design-system.md): §1 "Where it lives", §3 Primitives (one file each), §4 Patterns (AppState, ScoreScale, DeviceFrame), §8 "Adding to it". **Add a new "Composition rules" section** carrying §3.4 verbatim. Expand §6 "What is enforced" with the spacing/shadow rules and the ESLint zones. | 1     | Low  | reviewed against the real tree             | revert   |
| **G3** | Update the 11 remaining architecture-referencing docs: `CUSTOMER-PLATFORM`, `IMPLEMENTATION-PLAN`, `DEMO-SITES-PLAN`, `PLAYBOOK-20-PLAN`, `business-offer`, `CONVERSION-UPGRADE-PLAN`, `OFFER-REBUILD`, `VALUE-PER-SECOND`, `GOOGLE-SIGN-IN`, `VISUAL-ASSETS`, `DEMO-QUALITY-UPGRADE`, `stripe-pricing-transition`                | 12    | Low  | path-resolution script                     | revert   |
| **G4** | **Create `CLAUDE.md`** (F-24): feature-first layout, boundary set, the §3.4 composition rules, token layers, naming scheme, "never do X" list (no raw hex, no raw spacing, no cross-feature internal import, no export without a caller)                                                                                          | 1 new | Low  | read-through against §3                    | revert   |

**Total: 31 batches across 7 phases, ≈22 working days.** Phases (a)–(c) are independently valuable and shippable; (d) is the load-bearing one; (g) is non-negotiable.

---

## 6. Owner Decisions Required

**D1 — Foundation colour tier: add one, or keep the measured-semantic model?**

| Option                                | Consequence                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Keep as is — RECOMMENDED**      | [tokens.css:48-67](client/src/styles/tokens.css#L48-L67) argues each semantic colour is an independently measured contrast value, not a derivation. An alias tier would resolve to nothing a re-skin could safely turn, and adds four declarations to every visitor's first stylesheet on a repo with a payload budget. Consistent with §1.7. |
| (b) Add `--brand-*` foundation tokens | Matches the canonical three-tier model literally. Costs indirection that pays back nothing today, and risks the accent-selection error the current comments exist to prevent.                                                                                                                                                                 |

**D2 — Component-token minting policy.** Zero exist today. Recommendation: **mint none by default**; a component token is created only when a primitive needs a value the semantic layer genuinely cannot express, and it is added in the same commit as its consumer. Alternative: pre-mint `--button-*`/`--field-*` sets for a future theming story — not recommended, YAGNI (§1.7).

**D3 — File-size threshold.** This audit used **400 raw / 300 code-only lines**, because comment density runs 40–60% here. Options: (a) adopt 400/300 as the standing rule — recommended; (b) adopt the brief's flat 300 raw, which flags 76 files including 17 pure-data content modules; (c) 300 code-only only. Whichever is chosen should be written into `CLAUDE.md` in G4.

**D4 — Boundary set and the home of `assessment`.**

| Option                                                                                                             | Consequence                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **(a) Four boundaries (`public`, `auth`, `private`, `admin`) + `features/shared/` for `assessment` — RECOMMENDED** | Matches the four real audiences (each has its own layout and guard). `assessment` is consumed by three of them, so it is a shared capability, not an audience. |
| (b) Three boundaries; fold `auth` under `public`                                                                   | `auth` has its own `AuthLayout` and its own audience-transition role; folding it hides that.                                                                   |
| (c) Keep `auth`/`admin`/`assessment` as peers                                                                      | Zero migration cost, but the tree stops announcing the access model — the §1.6 point of boundaries.                                                            |

**D5 — `useAdminResource` / `useProjectOverview` failure semantics (F-01).** The two disagree today. `useAdminResource` refetches after a _failed_ mutation on the reasoning that a rejected write may still have changed something; `useProjectOverview` returns early. **Recommendation: adopt the refetch-always behaviour** (the safer of the two, and the one three of the four call sites already have), and state the reason in the consolidated hook. This is a behaviour change to the customer project page and needs the owner's sign-off, not the executor's.

**D6 — Demo-site stylesheets: in or out of scope?** The five demo sites deliberately depict _other businesses'_ brands and are already exempted from parts of the token rules. Recommendation: **out of scope for F-11 and F-15**, explicitly documented as an exception in `design-system.md` G2. Alternative: bring them in, which would require a second token namespace — a real abstraction with one purpose, not obviously worth it.

**D7 — `content/` layer: leave, or co-locate single-feature copy?** `content/` is ~11k lines across 24 modules behind a barrel, and it is a deliberate content-as-data architecture. Several modules serve exactly one feature (`capabilities` 1,861L, `audit` 503L, `teardown` 271L, `welcome` 166L). Recommendation: **move only `capabilities.ts`** (E6) — it is already excluded from the barrel for bundle reasons, so moving it is consistent rather than disruptive — and leave the rest. Alternative: co-locate all single-feature content, which is a large diff for a modest §1.6 gain and would break the "all copy in one place" property the repo is built around.

**D8 — Batch cadence.** 31 batches ≈ 22 working days. Options: (a) sequential, as ordered — safest, recommended; (b) parallelise (a) and (d), which do not overlap in files; (c) phases (a)–(c) only for now, deferring the structural work — delivers the visible UI wins and the token completion without the boundary migration.

---

## 7. Design-system doc outline

Target: `docs/design-system.md`, rewritten in G2. Success criterion (§1.8): six months from now, an agent or the owner reads this file and builds a screen correctly with no archaeology.

```
# The JobForge design system

1. How to use this document
   1.1 Who it is for (a person or an agent building a screen)
   1.2 The three questions it answers: which token, which component, where does my file go

2. Where everything lives
   2.1 The layer diagram (foundation scales → semantic tokens → primitives → patterns
       → feature components → screens)
   2.2 The dependency rule, and the ESLint zones that enforce it
   2.3 Map: file path → layer

3. Tokens
   3.1 The model, and why there is no foundation colour tier here  (record D1)
   3.2 The palette: four brand literals, and the accent's three values
   3.3 The scales: space, radius, type, leading, weight, tracking, z, motion
   3.4 Contrast: what is measured, what cannot be measured statically
   3.5 How to add a token — the checklist, and the same-commit-as-its-consumer rule
   3.6 Component tokens: the minting policy  (record D2)

4. Primitives  (components/ui/)
   4.1 The inventory, one row per primitive, with its variants/sizes/states
   4.2 What a primitive owns: variants, states, accessibility, responsive behaviour,
       token consumption
   4.3 What a primitive must never do: import feature code, hardcode a value,
       accept a styling escape hatch
   4.4 When to add one — and the three-real-cases bar

5. Patterns  (components/patterns/)
   5.1 The inventory: AppState, ScoreScale, DeviceFrame
   5.2 A pattern composes primitives and solves a recurring UX problem
   5.3 Primitive vs. pattern vs. feature component — the decision tree
   5.4 The promotion bar: two or more features actually use it

6. Composition rules  ← NEW; codifies §1.7 for future agents
   6.1 Compose, never extend
   6.2 Rule of Three, then the smallest concrete extraction
   6.3 Abstraction is justified by current repeated use, never anticipated reuse
   6.4 A screen composes; it does not invent
   6.5 Top-level tells the story (the Stepdown Rule, with a before/after from PricingBlock)
   6.6 No speculative surface — no export without a caller
   6.7 Low indirection — the feature entry point is the one sanctioned hop
   6.8 Worked examples: the four form hooks, the billing webhook switch

7. Feature structure
   7.1 The four boundaries and what each is for
   7.2 The internal shape: components/ hooks/ services/ utils/ validators/ types/ constants/
   7.3 index.ts is a public API — what to export, what to keep private
   7.4 Cross-feature and cross-boundary imports: the one legal form
   7.5 The shared-root bar, and where single-feature code belongs

8. Naming
   8.1 PascalCase.tsx, camelCase.ts, Name.module.css
   8.2 Server: <feature>.<responsibility>.ts
   8.3 Parallel naming across sibling features
   8.4 Intention-revealing names — and the useAdminResource cautionary tale

9. Layout, spacing and responsive
   9.1 Container / Section / Grid, and why a feature never sets its own width
   9.2 The six breakpoints and what each is for
   9.3 Spacing comes from --space-*, always

10. Accessibility
   10.1 The contrast floor and how it is measured
   10.2 Labels, describedby, and the error pattern
   10.3 Focus, the focus ring token, and keyboard reachability
   10.4 button vs. a vs. Link

11. The brand mark

12. What is enforced, and how
   12.1 The six rules in styles/tokens.test.ts
   12.2 The ESLint import zones
   12.3 check-budget.ts and the eager-payload ceiling
   12.4 Deliberately not enforced, and why
   12.5 The exception list, and why a stale exception fails the build

13. What this system does not have, on purpose
    (no modal, no toast, no dropdown, no component tokens, no theme switcher —
     add the token in the same commit as the thing that needs it)

14. File-size thresholds  (record D3)

15. Adding to the system — the checklist
```

---

## 8. Definition of done

A final repo-wide audit must produce every one of these results. Each is a command or a countable check, not a judgment.

**Tokens (§1.2)**

- [ ] `0` colour literals in UI-colour properties across `*.module.css` — _already true; must remain_
- [ ] `0` raw `z-index`, `0` off-scale breakpoints, `0` off-scale `font-size`/`border-radius` — _already true; must remain_
- [ ] `0` raw spacing declarations (`padding`/`margin`/`gap` in px/rem) outside `tokens.css` — **from 44**
- [ ] `0` raw `box-shadow` outside `tokens.css` and its documented exceptions — **from 7**
- [ ] `0` stray hex outside `tokens.css`/`global.css` — **from 1**
- [ ] `tokens.test.ts` carries **6** rules (colour, z-index, breakpoints, contrast, type/radius, **spacing/shadow**), each with its guards-the-guard assertion and a two-directional exception list
- [ ] Every component token that exists has a consumer in the same commit that introduced it

**Primitives (§1.3)**

- [ ] Exactly one implementation per primitive; `components/ui/` is one file per primitive with an `index.ts`
- [ ] `0` ad-hoc `.card*` class sets outside `components/ui/` and the demo stylesheets — **from 10**
- [ ] `0` ad-hoc `.badge`/`.chip`/`.pill`/`.tag` sets outside `components/ui/` and the demo stylesheets — **from 11**
- [ ] Every raw `<button>` / `<input>` / `<textarea>` / `<select>` outside `components/ui/` is either eliminated or carries a one-line comment stating why the primitive does not fit
- [ ] `0` files containing raw `<svg>` other than `Icon.tsx`, `Logo.tsx`, `GoogleSignInButton.tsx`
- [ ] `0` raw spacing/colour values inside any `components/ui/*.module.css`
- [ ] `Button` owns `loading` and `:active`; `0` call sites hand-roll a busy state by swapping label text — **from 9+**
- [ ] Exactly **one** disabled mechanism in use, stated in the design-system doc — **from 2 non-equivalent ones**
- [ ] Focus and reduced-motion remain handled **once, globally** — not duplicated into primitives

**Patterns (§1.3)**

- [ ] `AppState`, `ScoreScale`, `DeviceFrame` all in `components/patterns/` with an `index.ts`
- [ ] `0` inline re-implementations of a loading, error or empty state in any feature
- [ ] `0` patterns re-implementing a primitive (no raw `<button>`/`<Link>` styled as one inside `components/patterns/`)

**Builder-function structure (§1.1)**

- [ ] `0` functions over **300 code-only lines** — **from 1 (713)**
- [ ] `createBillingService`'s `handleWebhookEvent` is a switch of named handler calls; no case body exceeds ~15 lines
- [ ] `PricingBlock` is a builder under 40 lines composing named blocks
- [ ] `App()` is a builder under 40 lines composing five route groups
- [ ] `check-budget.ts` passes with no eager-payload regression against the pre-migration baseline

**Composition vs. abstraction (§1.7)**

- [ ] `0` exported functions with zero production consumers, repo-wide — **from 8 in `capabilityMatch.ts` alone**
- [ ] `0` single-consumer modules in shared roots (`components/`, `hooks/`, `lib/`, `config/`) — **from 3**
- [ ] `0` pass-through wrapper components, `0` HOC chains, `0` config-object-driven renderers, `0` inheritance-like hierarchies — _already true; must remain_
- [ ] `0` indirection chains of ≥3 hops for a simple behaviour — _already true; must remain_
- [ ] `lib/api.ts` no longer exists; its three operations live in their features' `services/` — `lib/http.ts` retained
- [ ] `0` duplicate implementations of the resource hook; `0` behavioural divergence between its call sites — **from 2**
- [ ] Exactly **one** `cx` in the repository — **from 13**
- [ ] The four form hooks share exactly one extracted hook, and that hook takes no schema, field config, or generic submit pipeline

**File size (§1.4)**

- [ ] `0` non-test, non-content source files over 400 raw / 300 code-only lines, except those carrying a written cohesion justification — **from 7**
- [ ] `0` `*.module.css` over 400 lines or with more than 4 importers — **from 6**

**Naming (§1.5)**

- [ ] 100% PascalCase `.tsx`, 100% camelCase `.ts` on the client — _already true; must remain_
- [ ] 100% `<feature>.<responsibility>.ts` on the server — **from 5 outliers**
- [ ] Every feature's internals use only the §1.6 vocabulary (`components/ hooks/ services/ utils/ validators/ types/ constants/`); `0` uses of `sections/` or `pages/` — **from 4**

**Folder structure & dependency direction (§1.6, §1.2)**

- [ ] Every feature has an `index.ts` — **client from 0/27, server from 8/13**
- [ ] `0` cross-feature imports that bypass an entry point — **client from 15, server from 10**
- [ ] `0` imports from `components/**` into `features/**` — **from 3**
- [ ] `0` imports from `components/ui/**` into `components/patterns/**` or `features/**` — _already true; must remain_
- [ ] The four boundaries are the only children of `features/` besides `shared/`
- [ ] ESLint `no-restricted-imports` zones exist and **fail** on a deliberately introduced violation
- [ ] `npm run verify` passes end to end

**Documentation (§1.8) — the migration is not done until all of these pass**

- [ ] **`0` repository documents describe the pre-migration architecture.** Every `features/…` and `components/…` path in every `.md` resolves to a real file — verified by a script, not by reading
- [ ] `README.md` §"Project structure" matches the real tree, including all four boundaries, `components/patterns/`, `components/brand/`, and all 13 server features
- [ ] `docs/design-system.md` follows the §7 outline, including the new **Composition rules** section
- [ ] `CLAUDE.md` exists and carries: the boundary set, the feature-internal vocabulary, the composition rules, the token layers, the naming scheme, and the file-size threshold
- [ ] Every Owner Decision (D1–D8) is recorded with its chosen option and its reason in either `design-system.md` or `CLAUDE.md`
- [ ] The 8 business/legal docs are confirmed untouched and out of scope

---

_End of plan. No migration step has been executed; no source file was modified._
