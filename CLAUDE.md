# Working in this repository

Read this before writing code. It is the architecture, the rules that are machine-enforced, and
the handful of things that will waste your time if you learn them by discovery.

---

## What this is

JobForge: a marketing site, a customer project portal, and an owner console, for local service
businesses in Greater Seattle. One npm-workspaces monorepo, deployed to Vercel.

**Two frontends, one backend.** They are three interfaces onto one system — not two
applications that talk to each other. See DECISION 026.

```
   apps/client                      apps/admin
   customer.example.com             admin.example.com
        │                                │
        └───────────── HTTPS ────────────┘
                       │
                  apps/server         ← the only security boundary
                       │
                    MongoDB
```

| Workspace          | Stack                                                                             |
| ------------------ | --------------------------------------------------------------------------------- |
| `apps/client/`     | React 19 · Vite 8 · react-router-dom 7 · **CSS Modules** (not Tailwind)           |
| `apps/admin/`      | The owner console: inbox, projects, accounts, assessments. Own bundle and origin. |
| `apps/server/`     | Express 5 · Mongoose 9 · Zod 4 · Stripe · Resend                                  |
| `packages/ui/`     | `@jobforge/ui` — tokens and primitives both apps render                           |
| `packages/shared/` | `@jobforge/shared` — the API contract both apps speak                             |
| `api/`             | The Vercel adapter. No business logic lives here.                                 |

### The three rules that hold this together

1. **The two frontends never import each other.** ESLint fails the build in both directions.
   Two browser bundles cannot trust one another. Anything shared goes in `packages/`; anything
   that needs authorising goes behind an API route.
2. **The server is the security boundary, and it is the only one.** Capabilities in a frontend
   decide what to _render_. `apps/server` re-checks them against the session on every request,
   and that is the only check that decides anything. **No bundle may contain a secret.**
3. **One identity system, two authorisations.** One `User`. The console requires a capability
   a customer does not have. Never build a second auth system.

`npm run verify` is the gate: format → lint → typecheck → tests → build, across all five
workspaces. It must pass before anything is considered done.

---

## The layers, and which way they point

```
routes         app/routes/              marketing · auth · private · demo
   ↓
screens        features/<boundary>/<feature>/*Page.tsx
   ↓
feature parts  features/<boundary>/<feature>/components/
   ↓
patterns       components/patterns/     AppState · Notice · InlineConfirm · RouteFallback
                                        Announcer · OfflineNotice · ScoreScale · DeviceFrame
   ↓
primitives     packages/ui/             Button · Card · Badge · Field · Icon · Layout
                                        Reveal · cx · tokens.css
                                        Table · Tabs · Modal · Drawer · Toast
                                        Tooltip · Switch · Avatar      ← DECISION 029
   ↓
shared behaviour packages/ui/           useResource · useAnnouncerState
                                        useDelayedFlag · useOnlineStatus
                                        useTheme · useUnsavedChanges
                                        (render nothing; both apps need each)
   ↓
shared roots   session/                 state two boundaries both need
   ↓
semantic tokens  packages/ui/src/styles/tokens.css   --color-* --shadow-* --container-*
   ↓
foundation scales  (same file)                       --space-* --radius-* --text-* --z-*
```

**Nothing points back up.** `components/` must never import `features/` — ESLint fails the build
on it. If a shared component needs to know something a feature knows, take it as a prop, or move
the state to a shared root (`session/` is the worked example).

### The three boundaries in `apps/client`

`features/public` · `features/auth` · `features/private`

They separate _audiences_, and each has its own layout and guard. `features/assessment` is not a
boundary — it is a capability all three share. The fourth boundary, `features/admin`, is now a
separate application; see below.

`features/admin` **is gone from `apps/client`** — DECISION 027 moved it to `apps/admin`, so the
customer bundle no longer contains the console at all. DECISION 021's `admin ↔ private` ESLint
isolation is what made that a move rather than an untangling: not one import had to be broken.
The rule that replaces it is rule 1 above, and it is enforced the same way.

**`/admin` is a reachable URL again, and that is not a reversal of the above.** DECISION 034
serves the console's own bundle from the customer project's origin, because a cookie cannot
cross two `*.vercel.app` names. The customer bundle still contains none of it and the budget
guard still cannot see it — what changed is the origin, not the separation.

### The feature entry point is a public API

Every feature has an `index.ts` exporting what the rest of the application may use. Everything
else in the folder is private. **Importing past a feature's index fails lint.** If you need
something that is not exported, decide whether it belongs in that feature's public API — do not
reach around it.

The one exception is the `lazy()` calls in `app/routes/*.tsx`, which reach a concrete module on
purpose: routing a dynamic import through a barrel merges chunks that `scripts/check-budget.ts`
exists to keep apart.

`@jobforge/ui` is the exception to the exception — safe to import statically from anywhere,
because everything it exports is in the eager bundle already. Never route a `lazy()` through it.

### Feature internals use one vocabulary

`components/ hooks/ services/ utils/ validators/ types/ constants/` — include only what a feature
needs. There is no `sections/` and no `api/`; both were renamed, because the same kind of thing
having two names is how a reader learns to check every folder.

---

## Composition rules

1. **Compose, never extend.** No base components, no class hierarchies, no clone-and-specialise.
   Behaviour arrives as children, props, or a function call.
2. **Rule of Three, then the smallest thing.** Do not extract until the third real occurrence,
   and then extract the smallest _concrete_ function — never a configurable framework.
3. **Abstraction is justified by current repeated use, never anticipated reuse.** Two or more
   real consumers today, or it stays where it is. One consumer means it lives with its consumer.
4. **A screen composes; it does not invent.** A raw `<button>`, `<input>`, `.card` or `.badge`
   class in a screen is a defect, not a shortcut.
5. **Top-level tells the story.** Anything over ~40 code lines should read as a sequence of named
   calls. Mechanics go one level down.
6. **No speculative surface in an eager bundle.** No exported function without a production
   caller. No prop nothing passes. No token for a component that does not exist. Three
   functions were deleted from `capabilityMatch.ts` for exactly this.
   DECISION 029 narrowed the payload half after measuring it: a zero-consumer export in
   `@jobforge/ui` is tree-shaken away entirely, so **a primitive may precede its consumer; an
   eager one may not precede its budget.** Everything else in the rule stands. (`Modal` proved
   the other half on 2026-08-16: its first consumer cost 1.4 kB of eager JS and 1.3 kB of CSS.
   In this package, weight follows use.)
   DECISION 030 drew the rule's outer boundary, which is a different question from its cost:
   **rule 6 is about surface, not about coverage.** A dark palette, a `forced-colors` block and
   a print stylesheet are not API somebody might one day call — they are answers to
   `prefers-color-scheme`, `forced-colors` and `print`, which arrive from real readers on every
   page load this site has ever served. A light-only, screen-only page is a wrong answer to a
   question that was asked, not the absence of a speculative feature. The line: **build the
   response to signals the browser already sends; do not build the machinery for signals
   nothing sends.** That is why there is no message catalogue.
7. **Low indirection.** A feature's entry point is one hop and it is the only sanctioned hop.

---

## Tokens

Every colour, size, radius, shadow and stacking value comes from
`packages/ui/src/styles/tokens.css`. `tokens.test.ts` beside it enforces six rules across
**every app and package** and **each one fails the build**:

1. No colour literal in any UI-colour property.
2. Every `z-index` from the `--z-*` scale.
3. Only the six documented breakpoints.
4. Every stated foreground/background pair clears WCAG AA, computed from the real hex values.
5. Every `font-size` and `border-radius` from a scale.
6. Every spacing value from the rhythm.

### What is deliberately allowed

- **`em` spacing.** Font-relative by design — optical nudges on icons beside text, list marker
  indents. Snapping these to a rem step breaks alignment at every size but one.
- **`inset` box-shadows.** They are rules and rails, not elevation; no `--shadow-*` applies.
- **Dynamic values via CSS custom properties.** `style={{ '--reveal-delay': …}}` is correct.
- **The demo sites.** They depict five _other businesses'_ brands and are exempt by design.

There is **no foundation colour tier**, and that is deliberate — read the note at the top of
`tokens.css`. Each semantic colour is an independently measured contrast value, not a derivation
of a brand hue, so an alias above it would resolve to nothing a re-skin could safely turn.

The exception list in `tokens.test.ts` is checked **in both directions**: an exception that stops
matching anything fails the build. Adding one costs a sentence explaining why.

---

## Naming

| Artifact               | Scheme                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Client components      | `PascalCase.tsx`                                                    |
| Client everything else | `camelCase.ts`                                                      |
| Stylesheets            | `ComponentName.module.css`                                          |
| Server                 | `<feature>.<responsibility>.ts`                                     |
| Feature internals      | `components/ hooks/ services/ utils/ validators/ types/ constants/` |

Include feature folders only as needed. Names reveal intent — `useAdminResource` was renamed to
`useResource` because it was never admin-specific and the name taught the wrong thing.

---

## File size

**400 raw lines or 300 code-only lines** triggers inspection, not an automatic split. This repo
writes long rationale comments — often 40–60% of a file — so a raw-line rule flags prose rather
than responsibility. Judge by whether the file has one reason to change.

---

## Things that will bite you

- **A Vite build in this repo must pin `NODE_ENV` before importing Vite.** Both apps point
  `envDir` at the shared `.env`, which contains `NODE_ENV=development` for the server's benefit
  — and Vite honours it, emitting a _development_ React bundle from a command called `build`,
  silently. `apps/*/scripts/build.ts` sets it first; the dynamic `import('vite')` in those files
  is load-bearing, and setting it in `vite.config.ts` is too late.
- **The payload budget is real and tight.** `scripts/check-budget.ts` fails the build if the
  eager bundle grows. CSS headroom is currently **under 1 kB**. Anything touching `app/routes/`,
  a `lazy()` boundary, or a `content/` import must be checked against it. Splitting a stylesheet
  can _increase_ total CSS through duplication — measure, do not assume.
- **`disabled` and `loading` mean different things on a `Button`.** `disabled` is _not
  applicable_; `loading` is _temporarily busy_. Using `disabled` for busy drops the control out
  of the tab order mid-submit. See `Button.tsx`.
- **Content is data — on the marketing site.** Every word of it lives in
  `apps/client/src/content/`, and changing copy is a content change rather than a component
  change. **That has never been true of `features/private`**, which writes its prose inline, and
  it is not true of `apps/admin` either. Nobody decided that; the portal and the console were
  built later under a different habit. `content/app.ts` holds the strings _shared across_
  workspace screens — where two copies would drift — and screen-specific prose stays with its
  screen. Do not widen the gap; do not pretend it is not there.
- **`content/app.ts` is absent from the content barrel**, like `capabilities.ts` and for the same
  reason: every marketing component imports `content/index.ts`, so a module re-exported from it
  lands in the chunk every visitor to the homepage downloads.
- **`content/capabilities.ts` is deliberately absent from the content barrel** and now lives in
  the feature that reads it. Importing it eagerly puts forty capabilities in every visitor's
  bundle.
- **Lifecycle state changes only through `ProjectService`.** Never assign `project.milestone`
  from a route handler or a component. See `docs/CUSTOMER-PLATFORM.md`.
- **The customer never sees a domain identifier.** `MILESTONE_PRESENTATION` translates every
  stage into a sentence about them. `CustomerProjectView` is built field by field, never by
  deleting fields from the stored shape.
- **Two admin auth mechanisms exist side by side** — a session cookie and a bearer token. See
  DECISION 019.
- **The console only holds a session if it is same-site with the API.** `SameSite=Lax` is
  evaluated on the registrable domain, so two `*.vercel.app` names are two _sites_ and the
  cookie is never sent — sign-in succeeds and loops back to the form, with no error anywhere.
  **DECISION 034 answers this by serving both applications from one origin**: the console is
  built separately and copied to `apps/client/dist/admin`, and one Vercel project serves it at
  `/admin`. Two bundles, one origin — which is what DECISION 027 was actually for, since the
  customer bundle still contains no console and the budget guard still cannot see it. The
  ordering in `scripts/place-console.ts` is load-bearing: `build:client` empties
  `apps/client/dist`, so a console placed before it is deleted by the build that follows,
  silently, on a green deploy. See `apps/admin/DEPLOY.md` and DECISION 034.
- **The console's `base` is `/admin/` in every environment, including development.** Its dev URL
  is therefore `http://localhost:5174/admin/`, not the bare port. `BrowserRouter` takes the same
  value, because Vite's `base` fixes the asset URLs and the router's `basename` fixes the route
  URLs and **both are needed** — with only the first, every internal link points at the
  marketing site's 404.
- **`import.meta.env.BASE_URL` is `/admin/` and a router basename must be `/admin`.** Vite always
  appends the slash; React Router's `stripBasename` runs `pathname.startsWith(basename)` before
  normalising anything, and `'/admin'.startsWith('/admin/')` is false — so the router matches
  nothing and **renders nothing**. `/admin/` works, so every link inside the console is fine and
  the only broken URL is the bare one a person types: a blank page, one warning in a console
  nobody has open, every test and every build green. `normaliseBasename` in
  `apps/admin/src/config/routes.ts` is the fix. Its guard has to pass `'/admin/'` in **by hand**
  — under Vitest `BASE_URL` is `'/'`, which never had the bug, so a test that reads the derived
  constant passes against the broken code. That near miss is why the normalisation is an
  exported function rather than an inline `.replace`.
- **A conversation is a read model, not a collection.** `features/conversations` owns no
  storage: it merges leads and feedback and dispatches replies on a qualified `lead:`/`comment:`
  id. Never give it a model — a second definition of "unanswered" is the failure it avoids.
- **A comment has a scope, and exactly one of two fields carries it.** `projectId` for a change
  request about a website, `accountUserId` for a message from somebody with no project open.
  `scopeOf` is the only reader of either and `scopeFields` the only writer — two nullable
  columns that must agree are two columns that eventually will not, unless nothing else can see
  them. Account messages joined the console inbox **without a line changing in it**, because
  `listAwaitingTeamReply` names `parentId`, `resolvedAt` and `authorRole` and has never named a
  scope. That is the whole argument for having refused a `messages` collection.
- **`features/followup` is the only thing that emails somebody who did not ask.** Four rules in
  one table in `followup.types.ts`, at most **two** per account ever, and never after they buy.
  Three things are load-bearing and each fails silently if broken: the unique
  `(userId, ruleKey)` index (claim **before** sending — a check-then-write is correct until two
  runs overlap), the signed unsubscribe link (an unsigned one lets anybody unsubscribe anybody,
  and the victim's only symptom is a supplier who stopped writing), and the suppression list,
  which the **digest checks too** so there is one answer to "may we write to this person".
- **`UNSUBSCRIBE_SECRET` unset leaves follow-up entirely unwired** — no `/api/cron/followup`, no
  `/api/unsubscribe`, nobody emailed. Deliberately **not** `CRON_SECRET`: that is rotated by
  Vercel on their schedule, and rotating it would invalidate every unsubscribe link already
  sitting in an inbox. Both secrets are needed for anything to send.
- **`GET /api/admin/worklist` decides nothing.** Every group in `worklist.ts` is a call to a
  method that already existed for another screen — the assessment queue, `findOverdue`, the
  unmatched panel, `hasRequested`, the project list. It owns one constant, `STALE_AFTER_DAYS`.
  The console's Today screen renders what it is given and computes no thresholds, because a
  worklist is exactly the surface that grows a second opinion about what "overdue" means.
- **A console reply sends before it marks, and lead intake stores before it notifies.** The two
  orders are opposite on purpose; each has a comment saying which asset it is protecting.
- **The primary call to action creates an account before it takes a request.** "Get my free
  website assessment" lands on `/get-my-assessment` — the same `CredentialForm` as `/signup` in
  a different frame — and the request itself is asked for at `/app/assessment/request` once
  there is somewhere to attach it. The account _is_ the lead capture: somebody who stops after
  it has still left a name and an address, which the seven-field contact form could not do.
  `/audit` and `/contact` stay completely ungated. See DECISION 028 and
  `docs/ACCOUNT-FIRST-CAPTURE.md`.
- **There are two account doors, and only one of them is the offer.** DECISION 031 put
  `Create an account` beside `Sign in` in the header — utility strip, collapsed menu, and one
  entry in the footer — pointing at `/signup`, **not** at `/get-my-assessment`. The reason is
  the same one that made `/get-my-assessment` a route of its own: a control has to keep the
  promise its own words made, and a link reading "Create an account" that opens a page about a
  free assessment has changed the subject. Neither half of the pair may wear the accent —
  `Header.test.tsx` fails the build on it — because ember is rationed to the one primary action.
  The two are counted apart by `cta_clicked` locations `nav_signup` / `nav_signup_mobile`, which
  is the only way to learn whether a door with no offer on it produces accounts the offer button
  was not producing.
- **`CredentialForm` opens on step two when `?email=` arrives already valid**, gated on the same
  `validateField` that `Continue` runs. It costs the Google option on the entry screen, which is
  recoverable through `Change` — the reasoning is in the component and the trade is recorded in
  `credentialPages.test.tsx`, which had to be rewritten to say so rather than edited around.
- **Signing out from the marketing header does not navigate; signing out from `AppLayout`
  does.** That is not drift. A private page cannot stay on screen without a session and a public
  one can, so taking a reader away from an article they were part-way through would cost them
  their place for nothing. Both call sites carry a comment saying which surface they are.
- **`dotenv` reads three paths, and the repository root is the third.** `.env` lives at the
  root and the server workspace is two levels down, so `['.env', '../.env']` — correct when the
  server was at `server/` — silently pointed at a nonexistent `apps/.env` after DECISION 026.
  The symptom is not a configuration error: it is the console answering "We cannot reach our
  records right now" to a correct password, because the server has no `MONGODB_URI` while both
  Vite apps read the same file happily through their `envDir`.
- **A webfont needs two CSP entries, not one.** `style-src` for the stylesheet on
  `fonts.googleapis.com` and `font-src` for the files on `fonts.gstatic.com`. Both `vercel.json`
  files had neither, so Archivo never loaded in production on either origin and both apps
  rendered in the system fallback with nothing in any log.
- **The inline theme script and the CSP hash are a pair, and nothing but one guard knows it.**
  Both `index.html` documents carry six lines that stamp the reader's saved theme on `<html>`
  before first paint. Both `vercel.json` policies say `script-src 'self'`, so each carries a
  `'sha256-…'` of that script's exact bytes. Rename a variable in it and the digest changes:
  every test passes, every build passes, `vite dev` serves no CSP at all so it works perfectly
  locally, and the theme silently stops working **in production only**. `scripts/check-csp.ts`
  runs after `build` in `npm run verify`, recomputes the digest from the built HTML, and prints
  the hash to paste.
- **A data router costs 16.6 kB gzipped and this repository does not have one.** `useBlocker`
  needs `createBrowserRouter`; migrating was measured at eager JS 537.9 → 591.9 kB raw, because
  the data layer arrives whether or not a route uses a loader. The budget guard refused it. The
  in-app unsaved-changes guard is a capture-phase click listener in `useUnsavedChanges` instead —
  read its header before reaching for the router again.
- **There are two features called demo, and they are unrelated.**
  `apps/client/src/features/public/demo` is the five _marketing demonstration sites_ — other
  businesses' brands, exempt from the token rules. `apps/server/src/features/demo` is Demo Mode.
  The client half of Demo Mode is therefore called **`promo`**, and its route is `/promo`.
- **Demo Mode is a customer, not a mode.** DECISION 033. One account with `role: 'customer'` and
  a `demo` flag on the user document; the ownership boundary that already existed does all the
  isolation. There is deliberately **no `if (isDemo)`** beyond four readers: the banner, the tour
  inside it, `AppLayout`'s decision to render them, and the server. Anything else branching on it
  is the demonstration diverging from the product. See `docs/DEMO-MODE.md`.
- **`DEMO_PASSCODE` unset leaves `/api/demo` unmounted**, exactly as `CRON_SECRET` does for
  `/api/cron` — a genuine 404 rather than "not configured", so the feature cannot be half-on.
  The passcode must never gain a `VITE_` prefix; `demo.api.test.ts` sweeps the client source for
  the attempt.
- **The demo never reaches Stripe.** `createCustomerCheckoutSession` and
  `createCustomerPortalSession` refuse a demo customer on their **first line**, before the Price
  lookup and before the client is touched — which is what makes "no live charge is possible"
  provable by a test rather than argued from configuration. There is deliberately no Stripe test
  mode in a process holding live keys.
- **The CSRF guard accepts a request whose `Origin` equals its own `Host`.** It cost an evening
  to find out why it had to: the allowlist is built from `PUBLIC_SITE_URL` and `CLIENT_ORIGIN`,
  so a deployment served from a URL those do not name — a preview, a renamed project, a domain
  added later — answers **403 to every state-changing request from a signed-in browser** while
  every read works perfectly. Same-origin is not cross-site and needs no configuration. The
  rejection log now names both origins, which is the other half of the fix.
- **Draft and published are different states, and only one is visible.** The assessment review
  (`report.deliveredAt`) and the monthly report (`publishedAt`) both work this way, and in both
  the draft is _absent from the customer's payload_ rather than hidden behind a flag the client
  is asked to respect. Saving and publishing are two buttons for the same reason: the thing on
  the other side of the second one is an email that cannot be recalled.
- **An estimated launch date that moves emails the customer; a first one does not.** That rule
  lives in `ProjectService.setEstimate` and is why the estimate has its own route rather than
  being a seventh field on `updateDetails`. **Absent is a legitimate state** and must render as
  "not set yet" — never as a placeholder date.
- **`git mv` is blocked** by a local hook. Use plain `mv`; git detects the rename.
- **`.gitattributes` is load-bearing on Windows, and its absence fails a build nobody changed.**
  `.prettierrc` sets `endOfLine: "lf"` and `verify` opens with `format:check`, so LF is the gate
  rather than a preference — while git on Windows defaults to `core.autocrlf=true` and rewrites
  every text file to CRLF **on checkout**. The two disagree silently: `git diff` shows nothing,
  because autocrlf normalises back to LF when comparing, so the repository content is correct
  the entire time. Then somebody switches branch, git re-materialises every file that differs
  through the CRLF filter, and 119 files nobody touched are rejected by `format:check` with an
  empty diff to explain it. That is not hypothetical; it happened on a routine merge to `main`.
  `* text=auto eol=lf` makes the checkout itself produce LF whatever `core.autocrlf` says, so
  nobody has to configure their machine to be able to run `npm run verify`.
- **A root script that wraps a workspace script needs a trailing `--`.** `npm run admin:create`
  forwards nothing without it: `npm run admin:create -- --check` appends `--check` to the
  _outer_ npm, which swallows it as an unknown config flag and runs the inner script with no
  arguments at all. On `admin:create` that means a command asking to _report_ silently performs
  the privilege grant instead. `npm run admin:create --workspace @jobforge/server --` is the
  form that forwards. The failure prints `npm warn Unknown cli config` and is otherwise silent.
- **The workspace selector is `@jobforge/server`, not `server`.** `--workspace server` matched
  the old top-level directory and stopped resolving when DECISION 026 moved everything into
  `apps/*` — the same root cause as the `dotenv` path above, and it sat wrong in `.env.example`
  for both `admin:create` and `stripe:setup`. Root aliases now exist for all three server
  scripts, so `npm run admin:create` and `npm run preflight` need no selector at all.
- **A moved workspace needs `npm install`.** The `node_modules/@jobforge/*` symlinks point at the
  old path until you re-run it, and the failure looks like a missing module rather than a stale link.
- **Vercel's Root Directory is a dashboard setting and a directory move cannot update it.** The
  one project's root is the **repository root** (empty).
  DECISION 026 moved the code into `apps/*` and the customer project kept pointing at `client/`,
  so every deploy failed in under two seconds with `The specified Root Directory "client" does
not exist` — before a file was compiled, with nothing in the repository able to catch it. See
  `docs/deployment.md`.
- **Never add a source-shaped name to a directory skip-list.** `tokens.test.ts` once skipped
  `public` to avoid static assets and silently stopped checking `features/public` — thirty-two
  stylesheets, the whole marketing site, unenforced and still green.

---

## Where the decisions are

- `docs/owner-decisions-required.md` — the decision register, `DECISION 001`–`033`. Extend it;
  do not start a parallel ADR folder.
- `docs/DEMO-MODE.md` — what `/promo` is, how to turn it on and off, what is simulated and why,
  and the seven things that actually protect it. Read it before changing anything under
  `features/demo`.
- `docs/CUSTOMER-PLATFORM.md` — the lifecycle, the boundaries, and the project-portal direction.
- `docs/design-system.md` — tokens, primitives, patterns, and what is enforced.
- `03_plan/code_design_improvement_plan.md` — the architecture migration and its current status.
- `03_plan/ux_completeness_plan.md` — the state audit and what it changed. Its §0 records three
  corrections to its own brief, and the batch notes record five more where the measurement
  contradicted the plan. Read those before trusting any number in it.
- `03_plan/deferred_work_plan.md` — the eight items the two plans above named and did not do:
  dark mode, forced colours, print, direction, pagination, in-place re-auth, the in-app unsaved
  guard, and E5. §1 draws the line rule 6 needed and §9 records where the measurements
  contradicted the plan — including the two that reversed a decision.
- `03_plan/header_account_entry_plan.md` — the second account door, DECISION 031. §4 is the
  fifteen closed questions and what each one shut off; §7 is why an inline email field and a
  header modal were both refused on 0.3 kB of gzipped headroom; §10 records where the build
  contradicted the plan.

When a change modifies a previous decision, supersede it explicitly and say why. The
documentation has to make the architecture understandable to somebody arriving in six months.
