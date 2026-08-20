# UX Completeness Plan

**Repository:** JobForge (`ServiceSide` working directory)
**Audit date:** 2026-08-15
**Scope:** `apps/client`, `apps/admin`, `packages/ui`, and the narrow slice of `apps/server` a client state cannot be expressed without.
**Relationship to `code_design_improvement_plan.md`:** this **extends** it. That document graded _structure_ and closed at §0d. This one grades _states_ — what every screen does when the data is slow, absent, refused, stale, or when the person looking at it cannot see it.

---

## 0. Read this first — three corrections to the brief that changed the plan

An audit that does not say where its own instructions were wrong is an audit that quietly
built the wrong thing. Three of the numbers this plan was commissioned against did not
survive being measured.

### 0.1 The budget headroom was roughly six times smaller than stated

The brief said "CSS ~108.0 raw / 16.6 gzip against a 112.0 / 18.0 ceiling … roughly **4 kB of
raw CSS and 1.4 kB gzipped** to spend across everything you propose."

Those are the figures written in the `check-budget.ts` log comment on 2026-08-14 — the
_measured-at-the-time-of-the-raise_ numbers, not the current tree. A build on 2026-08-15
measures:

|                | Measured     | Ceiling before this plan | Headroom   |
| -------------- | ------------ | ------------------------ | ---------- |
| Eager JS raw   | **532.5 kB** | 545.0 kB                 | 12.5 kB    |
| Eager JS gzip  | **161.6 kB** | 164.0 kB                 | 2.4 kB     |
| Eager CSS raw  | **111.4 kB** | 112.0 kB                 | **0.6 kB** |
| Eager CSS gzip | **17.9 kB**  | 18.0 kB                  | **0.1 kB** |

`code_design_improvement_plan.md` §0d already records `111.4 (limit 112)` and gives it as the
reason E5 is still open. Nobody was hiding it; the brief simply quoted the wrong line.

**0.1 kB of gzipped CSS is not a budget, it is a wall.** One selector. Every proposal in this
document that touches an eager stylesheet is priced against a raised ceiling, and §7 is the
ledger.

### 0.2 The dead-CSS guard does not scan where the new primitives go

`design-system.md` §7 argues that adding an unused primitive would fail the build, citing the
`defines no class that nothing renders` test. That test is real and it is good. It is also
scoped to `apps/client/src`:

```ts
// apps/client/src/content/content.test.ts:2607
const root = join(import.meta.dirname, '..'); // → apps/client/src
```

So a zero-consumer component in `packages/ui` or `apps/admin/src` **passes**. §7's argument is
therefore sound as _policy_ and unenforced as _machinery_, and the plan says so rather than
leaning on a guard that would not have fired. What actually holds the line for `packages/ui` is
the payload budget, which is why §7's resolution (§3) is written in terms of bytes rather than
in terms of a test.

### 0.3 `aria-live` in "only four files" undersells what is there

Three production files carry `aria-live` (`CredentialForm`, `AuditScorecard`,
`PlayBookAssessment`); the fourth match is a test. But `role="status"` appears 16 times and
`role="alert"` 28 times, and both are implicit live regions. The accurate statement is
narrower and worse: **every _mutation outcome_ in the private portal and in the whole console
is silent**, while the marketing forms are announced properly. `ContactForm` is the standard the
rest of the application does not meet.

---

## 1. Executive summary — what "furnished" means after the owner's answers

Ten rounds of decisions turned an open-ended brief into a bounded one. The short version:

**Furnished means every state a route can reach is expressed, announced, and recoverable —
plus a complete primitive set for the states routes will reach next.**

Five decisions shape everything below.

| Decision           | What was chosen                                                                  | Consequence                                                                                        |
| ------------------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **The §7 tension** | Decide per primitive, not by rule — and then, per primitive, **build all eight** | §7 stops being "what this system does not have". DECISION 029, §3.                                 |
| **Scope**          | Both frontends, `packages/ui`, and UX-serving server work. Console first.        | 26 batches across 7 phases, severity-ordered.                                                      |
| **The budget**     | Raise CSS to **120.0 raw / 20.0 gzip**, one log entry per raise                  | +8.6 raw / +2.1 gzip from today. Largest raise in the file's history, and §7 is its justification. |
| **Excluded**       | Dark mode, print beyond the workbook, RTL/i18n, forced-colors                    | Four categories, each with a stated reason. §4.6.                                                  |
| **Duplication**    | Behaviour shared in `@jobforge/ui`; appearance duplicated per app                | DECISION 027's rule, applied unchanged to every new state.                                         |

What that buys, in countable terms: **0 layouts without a skip link (from 3)**, **0 routes
without a document title (from 5)**, **0 frontends ignoring `UNAUTHENTICATED` (from 2)**, **0
hand-rolled resource state machines (from 4)**, **0 bespoke outcome-message classes (from 13)**,
**0 `Suspense fallback={null}` (from 5)**, **0 fetch layers without a timeout (from 1)**, **0
UTC-rendered-as-local dates (from 6)**. §11 is the full list.

What it deliberately does not buy: a dark theme, a printed dashboard, a right-to-left layout, a
high-contrast audit, pagination controls, in-place re-authentication, undo on anything the
server cannot reverse, or the seven deferred product features in `CUSTOMER-PLATFORM.md` §10.2.
Each is recorded in §4.6 with the reason, because a plan that does not say what it refused is a
plan that will be asked for those things again in six months.

### The one-sentence read

This codebase has an unusually strong _outcome-for-a-sighted-user-on-a-fast-connection_ culture
and an unusually weak _outcome-for-everybody-else_ culture: every screen renders beautifully
when the data arrives, and the console has no skip link, no page title, no request timeout and
no announcement of any action the owner takes.

---

## 2. Current-state map

### 2.1 The surfaces

| App           | Boundary  | Routes                  | Shell           | Guard                  | Eager?                 |
| ------------- | --------- | ----------------------- | --------------- | ---------------------- | ---------------------- |
| `apps/client` | `public`  | 19 (incl. 5 industries) | `SiteLayout`    | none                   | 7 eager, 12 lazy       |
| `apps/client` | `auth`    | 6                       | `AuthLayout`    | none                   | all lazy               |
| `apps/client` | `private` | 12                      | `AppLayout`     | `RequireAuth`          | all lazy               |
| `apps/client` | `demo`    | 3 patterns × 5 trades   | `DemoLayout`    | none                   | all lazy               |
| `apps/admin`  | —         | 5 + catch-all           | `ConsoleLayout` | `AdminSessionProvider` | none — no split at all |

**37 route patterns / 52 URLs in the customer app; 5 in the console.**

### 2.2 Data states — by screen

`✓` handled · `~` partial · `✗` absent · `n/a` not applicable

| Screen                        | Loading | Slow (>3s) | Empty | Error | Retry | Mutating | Session lost | Timeout |
| ----------------------------- | ------- | ---------- | ----- | ----- | ----- | -------- | ------------ | ------- |
| `/app` dashboard              | ✓       | ✗          | ~     | ✓     | ✓     | n/a      | ✗            | ✓       |
| `/app/projects`               | ✓       | ✗          | ✓     | ✓     | **✗** | n/a      | ✗            | ✓       |
| `/app/projects/:id` (×4 tabs) | ✓       | ✗          | ~     | ✓     | ✓     | ✓        | ✗            | ✓       |
| `/app/billing`                | ✓       | ✗          | n/a   | ✓     | ✓     | ✓        | ✗            | ✓       |
| `/app/assessment`             | ✓       | ✗          | ✓     | ✓     | ✓     | ✓        | ✗            | ✓       |
| `/app/assessment/request`     | n/a     | ✗          | n/a   | ✓     | n/a   | ✓        | ✗            | ✓       |
| `/app/account`                | ✓       | ✗          | n/a   | ✓     | ~     | ✓        | ✗            | ✓       |
| console `/` inbox             | ✓       | ✗          | ✓     | ✓     | ✓     | ~        | ✗            | **✗**   |
| console `/projects`           | ✓       | ✗          | ✓     | ✓     | ✓     | n/a      | ✗            | **✗**   |
| console `/projects/:id`       | ✓       | ✗          | ~     | ✓     | ✓     | ✓        | ✗            | **✗**   |
| console `/accounts`           | ✓       | ✗          | **✗** | ✓     | ✓     | n/a      | ✗            | **✗**   |
| console `/sign-in`            | n/a     | n/a        | n/a   | ✓     | n/a   | ✓        | n/a          | **✗**   |

**Slow-load is `✗` everywhere** because every boundary's Suspense fallback and both session
guards render `null`. **Session-lost is `✗` everywhere** because no frontend file reads
`UNAUTHENTICATED`. **Timeout is `✗` across the whole console** because `apps/admin/src/lib/api.ts`
has no `AbortController`.

### 2.3 Identity states

| State                                | Handled today                                             | Gap                                                                            |
| ------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Signed out → private route           | ✓ `RequireAuth` redirects with `from`                     | —                                                                              |
| Session expired **mid-action**       | ✗                                                         | Server message shown inline; page stays dead. **High**                         |
| Signed in, no console capability     | ✓ `AdminSessionProvider` treats as anonymous, with a note | —                                                                              |
| Wrong credentials on console         | ✓ "That account is not an owner account."                 | —                                                                              |
| Account with no project              | ~ `AppEmpty` on `/app/projects`                           | Points at Billing; three other screens say different things                    |
| **DECISION 028 account, no request** | ~ `finish-request` `CurrentAction` on the dashboard only  | `/app/projects`, `/app/assessment`, `/app/billing` do not express it. **High** |
| Project with no preview yet          | ✗ `ApprovalPanel` returns `null`                          | An absence where an explanation belongs                                        |
| Unverified email                     | ✓ Note at the foot of the dashboard, deliberately quiet   | —                                                                              |

### 2.4 Input states

| Concern                 | Marketing forms                   | Auth forms                   | Private portal         | Console      |
| ----------------------- | --------------------------------- | ---------------------------- | ---------------------- | ------------ |
| Field-level invalid     | ✓                                 | ✓ blur + submit              | ✓                      | ~            |
| Form-level summary      | ✓ linked, focused (`ContactForm`) | ✓ focused (`CredentialForm`) | ✗                      | ✗            |
| Server-rejected field   | ✓                                 | ✓ rendered out of step order | ✓                      | ~            |
| Double-submit           | ✓ `useSubmitStatus` ref guard     | ✓ `busy` early return        | ✓                      | ~            |
| Autofill / password mgr | ✓                                 | ✓ shadow username input      | n/a                    | ✓            |
| `maxLength`             | ~ 1 of 2                          | n/a                          | ~ 1 of 2               | **✗ 0 of 3** |
| Unsaved changes         | **✗**                             | **✗**                        | **✗**                  | **✗**        |
| Destructive confirm     | n/a                               | n/a                          | ✓ `ApprovalPanel` only | **✗**        |

**Zero `beforeunload`, zero `useBlocker`, zero `window.confirm` repo-wide.** The console's
milestone `<select>` changes what a customer sees on `onChange`; a console reply sends an email
irreversibly. Neither confirms.

### 2.5 Environment states

| State                    | Status                             | Evidence                                                                            |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------- |
| `prefers-reduced-motion` | ✓ **globally**, and correctly      | `global.css:200` neutralises every animation and transition                         |
| Focus ring               | ✓ **globally**, one contract       | `global.css:168`, `--color-focus` measured on all three grounds                     |
| 320px — marketing/portal | ✓ mobile-first, six breakpoints    | —                                                                                   |
| 320px — **console**      | **✗**                              | Two tables, 10 and 7 columns, in a scroll container. ~3× viewport                   |
| 400% zoom                | ~                                  | Same as 320px; the console is the failure                                           |
| Keyboard                 | ~                                  | Skip link on 2 of 5 layouts; focus moves on 3 of 5                                  |
| Screen reader            | ~                                  | See §2.6                                                                            |
| Offline                  | **✗**                              | Nothing reads `navigator.onLine`                                                    |
| Slow 3G / cold chunk     | **✗**                              | 5 × `fallback={null}` + 2 × `return null`                                           |
| Deep link / hard refresh | ✓                                  | 47 prebuilt HTML files + the `/app/**` rewrite                                      |
| Back / forward           | ✓                                  | Project tabs are real routes, deliberately                                          |
| Scroll restoration       | ✓                                  | `SiteLayout`, `AppLayout`, `AuthLayout` each own it                                 |
| `prefers-color-scheme`   | **out of scope**                   | `<meta name="color-scheme" content="light">` in both `index.html` — already decided |
| `forced-colors`          | **out of scope**                   | 0 rules                                                                             |
| Print                    | ~ **out of scope beyond workbook** | `global.css` + 2 playbook stylesheets, where printing is the product                |

### 2.6 Cross-cutting

| Concern                    | `SiteLayout`    | `AuthLayout` | `AppLayout` | `DemoLayout` | `ConsoleLayout` |
| -------------------------- | --------------- | ------------ | ----------- | ------------ | --------------- |
| Skip link                  | ✓               | **✗**        | ✓           | **✗**        | **✗**           |
| Focus move on route change | ✓               | ✓            | ✓           | ~            | **✗**           |
| `<main>` landmark          | ✓               | ✓            | ✓           | ✓            | ~ no `tabIndex` |
| Error boundary             | ✓ keyed on path | ✓            | **✗**       | **✗**        | **✗**           |
| Document title             | ✓ 27 call sites | ✓            | ✓           | ✓            | **✗ zero**      |
| Live region                | ✗               | ✗            | ✗           | ✗            | ✗               |

**`AppLayout` has no error boundary.** `SiteLayout` and `AuthLayout` both wrap their outlet;
the private shell does not, so a throw in any `/app` page takes the whole application down to
`App`'s `variant="whole"` screen — losing the navigation, the sign-out control and the support
address. This was not in the brief's observations and is the single highest-severity finding
that nobody had noticed.

### 2.7 The duplication census

| Thing duplicated                   | Count  | Where                                                                                      |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------------ |
| Resource-loading state machine     | **5**  | `useResource` + 4 hand-rolled: `DashboardPage`, `ProjectsPage`, `BillingPage`, `InboxPage` |
| Bespoke outcome-message class sets | **13** | 10 in `features/private`, 2 in the console, 1 in `auth`                                    |
| Date-formatting vocabulary         | **2**  | 6 × `toLocaleDateString`, 6 × `.slice()` — the second renders **UTC as local**             |
| Inline confirm                     | 1      | `ApprovalPanel` — the shape two console actions need                                       |

### 2.8 Developer-surface defect (reported 2026-08-15)

`npm run dev` starts all three workspaces with `concurrently`. Vite is ready in ~350 ms; the
server runs `tsx watch` and has to compile and reach Atlas. Both session providers fire
`/api/auth/me` into a port with nothing on it:

```
[admin]  http proxy error: /api/auth/me
         AggregateError [ECONNREFUSED]
[client] http proxy error: /api/auth/me
         AggregateError [ECONNREFUSED]
```

Twice per app, because `<StrictMode>` double-invokes effects in development.

**Both applications behave correctly** — the client's `AuthContext` treats a failed `/me` as
anonymous by written decision, and the console falls to its sign-in form. What is wrong is that
a normal, expected, self-healing startup race prints an unhandled-error stack trace four times,
which teaches a reader that a stack trace at boot is nothing to worry about. That is the
habit that hides the next real one.

### 2.9 Severity roll-up

| Severity    | Count | Character                                                                                                                                    |
| ----------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **High**    | 12    | Reachable today, no recovery. §5 ranks them.                                                                                                 |
| **Medium**  | 19    | Degrades badly, recovers.                                                                                                                    |
| **Low**     | 14    | Mostly the four excluded environment categories.                                                                                             |
| **Refused** | 6     | Impersonation, in-console Stripe, role control, password admin, account delete, realtime inbox — all declined in writing already. Untouched. |

---

## 3. The §7 resolution

### 3.1 The tension, stated once

`design-system.md` §7 does not merely note the absence of a Modal, Toast, Tooltip, Switch and
Avatar — it argues the absence is a correctness property, and composition rule 6 generalises it:
"no exported function without a production caller, no prop nothing passes, no token for a
component that does not exist." A brief asking for every state a user _can_ reach necessarily
asks for surface no code path produces today. The two cannot both stand.

The owner's answer was to decide per primitive rather than by rule, and then, per primitive, to
build all eight. That **is** a rule change, arrived at one component at a time, and pretending
otherwise would leave `design-system.md` asserting something the repository has stopped doing.

### 3.2 What actually holds the line

Not the dead-CSS test — §0.2 shows it does not scan `packages/ui`. What holds the line is the
payload budget, and it holds it in exactly one direction: **`@jobforge/ui`'s barrel is eager**
(verified — `Button`, `Card`, `Badge` and `Field` classes are all present in
`dist/assets/index-*.css`, which `index.html` links). So a primitive in the barrel is downloaded
by every visitor to the homepage whether or not anything renders it.

That gives rule 6 a sharper and more defensible form than the one it has: the objection was
never to unused code, it was to unused code **in the bundle a stranger downloads to read a
marketing page**. Rewriting the rule around that is the resolution.

### 3.3 The exact text to add to `docs/owner-decisions-required.md`

> ## DECISION 029 — The design system gains a state layer, and §7 becomes an inventory
>
> **Built as described** (2026-08-15). Full specification: `03_plan/ux_completeness_plan.md`.
>
> ### The problem
>
> `docs/design-system.md` §7 said the application "contains no modal, dialog, tooltip, popover,
> switch or avatar", that adding them "would ship dead CSS on every visit", and that "a primitive
> is added when the second usage appears, not before". Composition rule 6 generalised it: no
> speculative surface, anywhere.
>
> Both sentences were true and both were written about a fifteen-route marketing site. The
> repository is now three surfaces — a marketing site, a customer project portal and an owner
> console — and a state audit found twelve high-severity gaps of which four were in the console
> alone. Several of the states a portal has to express (a confirmation that is not a page, a
> transient notification, a definition a reader can hover) have no shape in the system to be
> expressed in, so each screen invents one. Thirteen bespoke outcome-message classes across
> eleven files is what that looks like after two years.
>
> ### The decision
>
> Eight primitives are added: `Table`, `Tabs`, `Modal`, `Drawer`, `Toast`, `Tooltip`, `Switch`,
> `Avatar`. Six of them have no consumer on the day they land, and that is the part of this
> decision that needs defending rather than the components themselves.
>
> **Rule 6 is amended rather than deleted**, because the thing it was protecting is real and
> measurable:
>
> > **No speculative surface in an eager bundle.** A design-system primitive may precede its
> > consumer; an eager one may not precede its budget. Every primitive added ahead of a call
> > site is measured into `check-budget.ts` in the commit that adds it, and the raise carries
> > its own log entry saying what it bought. Everything else rule 6 forbade — an exported
> > function with no caller, a prop nothing passes, a token for a component that does not exist
> > — still stands.
>
> The distinction is the one `@jobforge/ui`'s own header already draws: its barrel is eager, so
> "costs nothing that was not already downloaded" is true of an import and false of an addition.
> The budget is what makes that honest, and the budget is what this decision spends.
>
> **§7 becomes an inventory.** It stops listing what the system does not have and starts listing
> what it has, why each was built, and what is still deliberately absent — Popover, Accordion,
> Menu, Combobox, DatePicker, Pagination — each with the call-site count that would justify it.
>
> ### What it costs, stated rather than hidden
>
> The eager CSS ceiling goes from 112.0 / 18.0 to **120.0 / 20.0** — +8.6 kB raw and +2.1 kB
> gzipped over the measured tree, and the largest raise `check-budget.ts` has recorded. Roughly
> 6.3 kB raw of that is the eight primitives; the rest is the state surface in §4.
>
> Against it: the same pass **deletes** thirteen bespoke message classes across five stylesheets
> and consolidates four hand-rolled data-loading state machines into one, so the net is smaller
> than the gross and the shape of the system is smaller than either.
>
> Also spent: three z-index tokens. `tokens.css` predicted them by name — "a dropdown belongs at
> 30, a modal at 50, a toast at 60" — and declined to declare them until something needed one.
> Three things now do.
>
> ### What this does not change
>
> The two frontends still never import each other. `components/` still never imports `features/`.
> Appearance is still duplicated between the customer app and the console and behaviour is still
> shared — DECISION 027's rule, applied unchanged to every component below. The server is still
> the only security boundary.
>
> Owner decision: [x] **Build the full set** (2026-08-15).

---

## 4. Target state

### 4.1 New surface, by layer

Layers are `CLAUDE.md`'s, and every row states the call sites that exist **on the day it lands**.

| Component            | Layer            | Home                          | Real consumers at landing                           | Eager?         | Est. CSS raw |
| -------------------- | ---------------- | ----------------------------- | --------------------------------------------------- | -------------- | ------------ |
| `Table`              | primitive        | `@jobforge/ui`                | console projects, console accounts                  | **eager**      | ~0.8 kB      |
| `Tabs`               | primitive        | `@jobforge/ui`                | customer `ProjectPage` (4 tabs)                     | **eager**      | ~0.6 kB      |
| `Modal`              | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~1.2 kB      |
| `Drawer`             | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~1.0 kB      |
| `Toast`              | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~1.0 kB      |
| `Tooltip`            | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~0.6 kB      |
| `Switch`             | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~0.7 kB      |
| `Avatar`             | primitive        | `@jobforge/ui`                | none — DECISION 029                                 | **eager**      | ~0.4 kB      |
| `useDelayedFlag`     | shared behaviour | `@jobforge/ui`                | 5 Suspense boundaries + 2 guards                    | eager, 0 CSS   | 0            |
| `useOnlineStatus`    | shared behaviour | `@jobforge/ui`                | `AppLayout`, `ConsoleLayout`                        | eager, 0 CSS   | 0            |
| `useAnnouncer`       | shared behaviour | `@jobforge/ui`                | `AppLayout`, `ConsoleLayout`                        | eager, 0 CSS   | 0            |
| `Notice` (client)    | pattern          | `client/components/patterns/` | **10** existing sites + offline + session           | lazy           | +0.6 / −1.1  |
| `Notice` (console)   | pattern          | `admin/components/`           | 2 existing + offline + truncation                   | n/a — no guard | +0.5         |
| `InlineConfirm` ×2   | pattern          | both apps                     | `ApprovalPanel` + console milestone + console reply | lazy / n/a     | ~0.4 each    |
| `RouteFallback` ×2   | pattern          | both apps                     | 5 Suspense boundaries + 2 guards                    | **1 eager**    | ~0.3 each    |
| `AppLoading` shapes  | pattern (extend) | `client/components/patterns/` | 8 screens, 3 shapes                                 | lazy           | ~0.5         |
| `useTitle`           | hook             | `apps/admin/src/hooks/`       | all 5 console screens                               | n/a            | 0            |
| `formatDate/Time` ×2 | util             | both apps                     | 12 existing call sites                              | mixed          | 0            |

**Six of eight primitives ship without a consumer.** That is DECISION 029, it is paid for in
§7's ledger, and it is the only place in this plan where something is built ahead of its need.

### 4.2 Behaviour shared, appearance duplicated

DECISION 027's rule, applied without exception:

```
@jobforge/ui              renders nothing, shared
  useResource             (exists)
  useDelayedFlag          the 400ms threshold — one number, not two
  useOnlineStatus         online/offline listener
  useAnnouncer            writes to a live region the layout owns
  Table Tabs Modal Drawer Toast Tooltip Switch Avatar

apps/client/…/patterns/   renders words and colour — customer voice, cream ground
  AppState (extend)  Notice  InlineConfirm  RouteFallback

apps/admin/…/components/  renders words and colour — operator voice, charcoal ground
  State (extend)     Notice  InlineConfirm  RouteFallback
```

`useDelayedFlag` is the worked example of why the line is where it is: if the 400 ms threshold
lived in each app it would be 400 in one and 300 in the other within a year, and nobody would
notice — which is precisely how `useAdminResource` and `useProjectOverview` came to disagree
about what happens after a failed write.

### 4.3 Session expiry — the mechanism

```
any request  ──→  UNAUTHENTICATED
                       │
                       ▼
             onSessionLost()                 one callback, registered by the session root
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
  AuthContext                  AdminSessionProvider
  setStatus('anonymous')       setState({status:'anonymous'})
        │                             │
        ▼                             ▼
  RequireAuth  (unchanged)     App  (unchanged)
  <Navigate to={login}         renders SignInPage
    state={{ from }} />
```

No component learns a new concept, no route is added, and the return-path machinery
`AuthLayout`'s history-index comment describes already exists. `UNAUTHENTICATED` is the **only**
code that gets client-side behaviour; every other failure keeps the server's words, which is
what `State.tsx` and the console's `ProjectPage` both defend in writing.

### 4.4 The loading contract

| Situation                   | Today                  | Target                                        |
| --------------------------- | ---------------------- | --------------------------------------------- |
| Lazy chunk, warm connection | nothing (correct)      | nothing for 400 ms — **unchanged behaviour**  |
| Lazy chunk, slow connection | nothing, indefinitely  | `RouteFallback` after 400 ms, `role="status"` |
| Session check on `/app`     | `null`, then the page  | same, `RouteFallback` after 400 ms            |
| Data load, any screen       | `AppLoading` — 3 boxes | `AppLoading shape="lines\|cards\|table"`      |
| Mutation in flight          | `Button loading` ✓     | unchanged, plus an announcement on completion |

`shape` takes three concrete values, not eight. `shape="dashboard" | "billing" | "project"` is a
page list wearing a prop and it grows by one every time a screen is added.

### 4.5 Confirmation and undo

| Action                                    | Reversible?                     | Treatment                                             |
| ----------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| Customer approves website                 | by requesting changes           | `InlineConfirm` — **exists**, migrated to the pattern |
| Customer requests changes (pre-approval)  | yes, the safe direction         | none — `ApprovalPanel`'s argument stands              |
| Customer requests changes (post-approval) | takes a launch off the schedule | `InlineConfirm` — **new**                             |
| Console changes milestone                 | **yes** — server-side           | `InlineConfirm` + **undo window** (§4.7)              |
| Console sends reply                       | **no** — the email has left     | `InlineConfirm` showing recipient and first line      |
| Console adds task / sets URLs             | yes, by editing                 | none                                                  |

### 4.6 What is deliberately not built

A plan that does not record its refusals gets asked for them again.

| Not built                                      | Why                                                                                                                                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dark mode                                      | Both `index.html` files declare `color-scheme: light` as "a committed light design". All 23 palette colours are independently measured against a light ground; a dark theme is a second measured palette, not a token swap. |
| RTL / i18n                                     | One market, one locale, `site.seo.locale` fixed. Logical properties already used where they cost nothing.                                                                                                                   |
| Print beyond the workbook                      | Printing is a product feature exactly once — "open it, print to PDF, send the PDF". Nobody prints a dashboard.                                                                                                              |
| `forced-colors`                                | Would require auditing 64 stylesheets for state conveyed by background alone. Low yield on a light design.                                                                                                                  |
| Pagination controls                            | Server bounds at 50/source; the console has one operator. Truncation is **disclosed** instead. Threshold for revisiting: a few hundred rows.                                                                                |
| In-place re-authentication                     | Would need a modal over a live page holding unsaved work. The redirect keeps `from`; the work is lost either way without a draft mechanism.                                                                                 |
| Undo on a sent reply                           | The email has been delivered. DECISION 027.2 records that a reply sends **before** it marks, deliberately.                                                                                                                  |
| `CUSTOMER-PLATFORM.md` §10.2                   | Seven deferred product features with their own decisions (022–025). Product roadmap, not state completeness.                                                                                                                |
| Popover, Accordion, Menu, Combobox, DatePicker | Zero call sites and no state in this audit needs one. Listed in the new §7 with the count that would justify each.                                                                                                          |

### 4.7 The server slice

Three changes, each existing solely so a client state can be expressed truthfully.

| Change                           | File                                        | Why a client state needs it                                                                                                                 |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProjectService.undoMilestone`   | `apps/server/src/features/projects/`        | Lifecycle state changes **only** through `ProjectService` — `CUSTOMER-PLATFORM.md` §10.3. An undo written any other way is the rule broken. |
| `total` on the conversation list | `apps/server/src/features/conversations/`   | The inbox cannot honestly say "showing 50 of N" without N.                                                                                  |
| `AppError` message review        | `apps/server/src/lib/appError.ts` + callers | Every message is shown verbatim by decision; that only works if every message reads well to its actual audience.                            |

---

## 5. Gap analysis — target minus current, ranked

| #   | Gap                                                             | Severity | Who hits it            | Batch      |
| --- | --------------------------------------------------------------- | -------- | ---------------------- | ---------- |
| 1   | `AppLayout` has no error boundary — a throw kills the whole app | **High** | Any customer           | 2.3        |
| 2   | Session expiry mid-action unhandled in both apps                | **High** | Every signed-in user   | 2.4        |
| 3   | Console has no request timeout                                  | **High** | The owner              | 1.3        |
| 4   | Console has no skip link, no focus move, no `main` tabindex     | **High** | Keyboard/AT operator   | 1.2        |
| 5   | Console has no document title on any screen                     | **High** | Everyone; AT worst     | 1.1        |
| 6   | Mutation outcomes announced nowhere (8 sites)                   | **High** | AT customers + owner   | 1.2 / 2.5  |
| 7   | 5 × `fallback={null}` + 2 × `return null`                       | **High** | Slow connections       | 2.3        |
| 8   | Console milestone + reply have no confirmation                  | **High** | The owner, once        | 3.2        |
| 9   | 4 hand-rolled resource machines                                 | High     | Maintenance            | 2.1        |
| 10  | 13 bespoke outcome messages                                     | High     | Maintenance + bytes    | 1.4 / 2.2  |
| 11  | 6 UTC-as-local date renders                                     | High     | The owner, silently    | 1.5        |
| 12  | DECISION 028 account incoherent across 4 screens                | High     | The warmest lead       | 2.6        |
| 13  | Console tables unusable below 48rem                             | Medium   | Owner on a phone       | 1.5        |
| 14  | No `maxLength` on 5 server-bound fields                         | Medium   | Anyone who types a lot | 3.3        |
| 15  | No unsaved-changes protection anywhere                          | Medium   | Long forms             | 3.4        |
| 16  | Nothing reads `navigator.onLine`                                | Medium   | Anyone on a train      | 3.1        |
| 17  | Console `AccountsPage` has no empty state                       | Medium   | First-run owner        | 1.4        |
| 18  | Inbox truncates at 50/source silently                           | Medium   | Owner, eventually      | 1.4        |
| 19  | `AppLoading` is one shape for 8 screens                         | Medium   | Everyone, mildly       | 2.3        |
| 20  | No preview → `ApprovalPanel` renders nothing                    | Medium   | Customer mid-build     | 2.6        |
| 21  | `AuthLayout` / `DemoLayout` have no skip link                   | Medium   | Keyboard               | 2.3 / 5.1  |
| 22  | `/app/projects` error has no retry                              | Medium   | Customer               | 2.1        |
| 23  | Demo media has no load-failure handling                         | Medium   | Prospect on the demos  | 5.1        |
| 24  | `CredentialForm` hand-passes `aria-disabled`, loses `aria-busy` | Medium   | AT during sign-up      | 3.3        |
| 25  | Dev startup prints 4 unhandled stack traces                     | Medium   | Every developer        | 5.2        |
| 26  | No automated a11y assertion in 65 test files                    | Medium   | Future regressions     | throughout |

---

## 6. Phased migration — 26 batches

Every batch passes `npm run verify` on its own. Every batch touching CSS, an eager route, a
`lazy()` boundary or a `content/` import is followed by a measured client build.

### Phase 1 — The owner console · 5 batches

_First because it holds 4 of the 12 High findings, and because `apps/admin` has no payload guard
— so the highest-value fixes in the repository are also the only free ones._

| Batch | Files                                                                   | What changes                                                                                                                                                                      | Proof                                       | Bytes    | Risk    |
| ----- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------- | ------- |
| 1.1   | `admin/src/hooks/useTitle.ts` + 5 pages                                 | A 12-line hook; every screen sets `<Page> — JobForge console`. No og, no canonical — the console is `noindex`.                                                                    | `a11y.test.tsx`: every route sets a title   | 0 CSS    | Low     |
| 1.2   | `ConsoleLayout.tsx` + `.module.css`                                     | Skip link, `<main tabIndex={-1}>`, focus on route change, persistent `aria-live` region, `useAnnouncer`                                                                           | Guard test; render test for the live region | ~0.3 kB  | Low     |
| 1.3   | `admin/src/lib/api.ts`                                                  | 15 s `AbortController` timeout; `UNAUTHENTICATED` → `onSessionLost`. Keeps the 204 branch and the operator-voiced message.                                                        | `api.test.ts` — timeout fires, 204 still ok | 0 CSS    | **Med** |
| 1.4   | `admin/components/Notice.tsx`, `State.tsx`, `AccountsPage`, `InboxPage` | `Notice` replaces `.problem` and `.error`; `AccountsPage` gains `Empty`; inbox discloses truncation using the server's `total` (falls back to a count comparison until 6.2 lands) | Render tests × 3                            | ~+0.5 kB | Low     |
| 1.5   | `Projects.module.css`, `admin/src/utils/formatDate.ts`, 6 call sites    | Tables stack to labelled rows below 48rem; one date formatter replaces 6 `.slice()` calls                                                                                         | `formatDate.test.ts` pins the UTC bug       | ~+0.6 kB | Low     |

### Phase 2 — The customer portal · 6 batches

| Batch | Files                                                                                          | What changes                                                                                                                                                    | Proof                                                                | Bytes                 | Risk    |
| ----- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------- | ------- |
| 2.1   | `DashboardPage`, `ProjectsPage`, `BillingPage`                                                 | Migrate onto `useResource`; `/app/projects` gains the missing retry. ~120 lines deleted.                                                                        | Existing page tests + `states.test.ts`                               | lazy, net −           | **Med** |
| 2.2   | `patterns/Notice.tsx` + 10 call sites across 5 sheets                                          | One `Notice` with `tone` replaces 10 bespoke `.error`/`.banner`/`.note` class sets                                                                              | Render test; dead-CSS guard proves the old classes are gone          | lazy, **net −0.5 kB** | **Med** |
| 2.3   | `AppState.tsx`, `RouteFallback.tsx`, `SiteLayout`, `AppLayout`, `AuthLayout`, 3 route modules  | `shape` prop; delayed `RouteFallback` replaces 5 `fallback={null}` and 2 `return null`; **`AppLayout` gains an error boundary**; `AuthLayout` gains a skip link | `a11y.test.tsx`; a fake-timer test for the 400 ms delay              | **+0.3 eager**        | **Med** |
| 2.4   | `lib/http.ts`, `session/AuthContext.tsx`, `RequireAuth`                                        | `UNAUTHENTICATED` → session cleared → redirect carrying `from`                                                                                                  | Render test: expire mid-mutation, assert the redirect and the `from` | eager +0.4 kB JS      | **Med** |
| 2.5   | `AppLayout`, `ProjectPage`, `TaskList`, `FeedbackThread`, `ApprovalPanel`                      | Live region in the shell; every mutation outcome announced, success and failure                                                                                 | Render tests × 4                                                     | 0 CSS                 | Low     |
| 2.6   | `ProjectsPage`, `AssessmentPage`, `BillingPage`, `ApprovalPanel`, `TaskList`, `FeedbackThread` | The DECISION 028 account says one coherent thing on all four screens; no-preview explains itself; empty feedback and tasks get real empty states                | Render tests × 6                                                     | lazy ~+0.3 kB         | Low     |

### Phase 3 — Shared behaviour and input states · 4 batches

| Batch | Files                                                                   | What changes                                                                                                                                                                              | Proof                                                  | Bytes                    | Risk    |
| ----- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------ | ------- |
| 3.1   | `ui/useDelayedFlag.ts`, `ui/useOnlineStatus.ts`, both shells            | Offline notice in `AppLayout` and `ConsoleLayout`, announced once. Comment states the honest limit: `onLine` detects an adapter, not a network.                                           | Render test with a faked event                         | eager +0.2 JS, ~+0.5 CSS | Low     |
| 3.2   | `InlineConfirm` ×2, `ApprovalPanel`, console `ProjectPage`, `InboxPage` | Extract the confirm; migrate `ApprovalPanel`; add it to milestone and reply. Reply shows recipient + first line.                                                                          | Render tests: cancel does nothing, confirm fires once  | ~+0.8 kB total           | **Med** |
| 3.3   | 5 forms + `CredentialForm`                                              | `maxLength` mirroring each Zod `.max()`; `CredentialForm` uses `loading` instead of hand-passed `aria-disabled`                                                                           | A test reading the server schemas and asserting parity | 0 CSS                    | Low     |
| 3.4   | `WelcomePage`, console `TaskForm`/`ReplyForm`, `PlayBookAssessment`     | `beforeunload` on the long forms; the PlayBook assessment persists like `/audit` already does. **No credential form gets storage** — `draft.ts`'s argument applies hardest to a password. | Render tests + a storage round-trip test               | 0 CSS                    | Low     |

### Phase 4 — The primitive set and its tokens · 5 batches

_DECISION 029. Six of these land without a consumer, and every batch is measured._

| Batch | Files                                                                 | What changes                                                                                                           | Proof                                                  | Est. eager CSS | Risk    |
| ----- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- | ------- |
| 4.1   | `tokens.css`, `tokens.test.ts`                                        | `--z-dropdown: 30`, `--z-modal: 50`, `--z-toast: 60` — the three the file predicted by name                            | `tokens.test.ts` still green; contrast table unchanged | ~+0.1 kB       | Low     |
| 4.2   | `ui/Table.tsx`, `ui/Tabs.tsx`, console tables, customer `ProjectPage` | The two with real consumers. `Tabs` renders `NavLink`s — the tabs are routes and must stay routes.                     | Existing page tests + new render tests                 | ~+1.4 kB       | **Med** |
| 4.3   | `ui/Modal.tsx`, `ui/Drawer.tsx`                                       | Focus trap, scroll lock, `aria-modal`, Escape, restore focus on close                                                  | Render tests for trap and restore                      | ~+2.2 kB       | **Med** |
| 4.4   | `ui/Toast.tsx`                                                        | Region, stacking, dismiss timing, hover-pause, `aria-live` on the container                                            | Render test incl. hover-pause                          | ~+1.0 kB       | Low     |
| 4.5   | `ui/Tooltip.tsx`, `ui/Switch.tsx`, `ui/Avatar.tsx`                    | Tooltip on `aria-describedby` + focus, never hover-only. `Switch` is `role="switch"`. `Avatar` falls back to initials. | Render tests × 3                                       | ~+1.7 kB       | Low     |

### Phase 5 — Marketing, demos and the developer surface · 2 batches

| Batch | Files                                    | What changes                                                                                                                                                                                                                                                                                                                                                                                                          | Proof                 | Bytes         | Risk |
| ----- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------- | ---- |
| 5.1   | `DemoMedia`, `DemoLayout`, `ProductShot` | `onError` fallbacks on demo imagery and the ambient video; the video respects `prefers-reduced-motion`; `DemoLayout` gains a skip link                                                                                                                                                                                                                                                                                | Render tests × 3      | lazy ~+0.3 kB | Low  |
| 5.2   | `apps/*/vite.config.ts`                  | The proxy's `configure` hook turns `ECONNREFUSED` into one readable line — "the API is not up yet; it will connect when it is" — instead of an `AggregateError` stack ×4. **No `wait-on` dependency**: this repo has three runtime dependencies and adding one to quiet a log would be its own punchline. A comment records that both apps already degrade correctly and that `<StrictMode>` is why it appears twice. | Manual: `npm run dev` | 0             | Low  |

### Phase 6 — The server slice · 2 batches

| Batch | Files                                                        | What changes                                                                         | Proof                                                             | Risk    |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- | ------- |
| 6.1   | `projects/project.service.ts`, `admin.routes.ts`, `activity` | `undoMilestone` within a window, its activity entry, its route, its capability check | Service + API tests; a test that no other path writes `milestone` | **Med** |
| 6.2   | `conversations/`, `lib/appError.ts`                          | `total` on the list response; `AppError` message review against the audit            | `contract.sync.test.ts`; conversation API test                    | Low     |

### Phase 7 — Documentation and the register · 2 batches

_Mandatory. `CLAUDE.md`: "the documentation has to make the architecture understandable to somebody arriving in six months."_

| Batch | Files                                                                                             | What changes                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1   | `design-system.md`, `CLAUDE.md`, `owner-decisions-required.md`, `code_design_improvement_plan.md` | §3 gains eight primitives; §4 gains four patterns; **§7 becomes an inventory**; §8 rule 6 amended; DECISION 029 added; the older plan gets a dated note that the 120.0 ceiling unblocks E5 |
| 7.2   | `check-budget.ts`, this file                                                                      | The budget log entry in the file's own voice; final `npm run verify`; §7 ledger reconciled against the measured build                                                                      |

---

## 7. Budget ledger

**Every figure below is measured.** The projection this table originally carried is kept in the
right-hand column, because the gap between the two is the most useful thing in this document.

| After                   | Eager CSS raw | Eager CSS gzip | Eager JS raw | Eager JS gzip | _Projected CSS raw_ |
| ----------------------- | ------------- | -------------- | ------------ | ------------- | ------------------- |
| **Start**               | 111.4         | 17.9           | 532.5        | 161.6         | _111.4_             |
| Phase 1 (console)       | 111.4         | 17.9           | 532.5        | 161.6         | _111.4_             |
| Phase 2 (portal)        | 112.1         | 18.0           | 534.0        | 162.0         | _~111.7_            |
| Phase 3 (shared, input) | 112.1         | 18.0           | 534.6        | 162.3         | _~112.2_            |
| Phase 4 (+8 primitives) | **112.7**     | **18.2**       | **534.9**    | **162.4**     | _**~118.6**_        |
| Phases 5–7              | 112.7         | 18.2           | 534.9        | 162.4         | _~118.6_            |
| **Ceiling**             | **120.0**     | **20.0**       | 545.0        | 164.0         | —                   |
| **Headroom left**       | **7.3**       | **1.8**        | **10.1**     | **1.6**       | _~1.4_              |

**The projection was wrong by 5.9 kB, for the reason recorded in batch 4.3.** §7 budgeted
~6.3 kB for eight primitives on the assumption that an unused export in an eager barrel is
weight every visitor downloads. It is not — Rollup drops it and the CSS module goes with it — so
the six with no consumer cost nothing. What actually moved the number was the delayed route
fallback, three skip links, and `Table` and `Tabs`, the two that have consumers.

The raise to 120.0 / 20.0 was still necessary: the previous ceiling had **0.6 kB** of headroom
and the first eager byte of this work failed the build in batch 2.3. But it bought headroom and
the state layer, not the primitives.

**The JS ceiling was never raised.** §7 flagged its gzip line as the real risk, projecting
~163.6 against 164.0. It finished at 162.4 — the four shared hooks, the session-lost handler and
`FIELD_LIMITS` came to about 0.8 kB gzipped rather than the 2.0 projected.

Phase 1 is flat because `apps/admin` is a separate bundle with no `check-budget`. Phase 2 is
nearly flat because the private portal is entirely lazy and the `Notice` consolidation **removes**
about 0.5 kB from lazy chunks.

**The JS gzip line is the risk, not CSS.** It ends at ~163.6 against a 164.0 ceiling — 0.4 kB.
If a measured build exceeds it, JS is raised to **550.0 / 166.0** with its own log entry; that
raise is not pre-authorised and I will report the measurement before taking it.

### The `check-budget.ts` entry to add, in the file's own voice

> ```
> 2026-08-15: CSS 112.0 → 120.0 kB raw, 18.0 → 20.0 gzipped. Measured 111.4 / 17.9.
>
> The state layer — DECISION 029. This is the largest raise this file has recorded and the
> first one that is not copy on the primary page, so it gets the sharpest justification.
>
> What the ~8.6 kB raw and ~2.1 kB gzipped bought:
>
>   - Eight primitives in `@jobforge/ui`: Table, Tabs, Modal, Drawer, Toast, Tooltip,
>     Switch, Avatar (~6.3 kB raw). Two of them — Table and Tabs — replace code that
>     already existed in the console's shared stylesheet and in ProjectPage's tabClass
>     helper. **Six of them have no consumer on the day they land**, which is exactly what
>     composition rule 6 forbade until DECISION 029 amended it to forbid only the eager
>     case without a measured budget. This is that measurement.
>   - Three z-index tokens (~0.1 kB). tokens.css named them in a comment — "a dropdown
>     belongs at 30, a modal at 50, a toast at 60" — and declined to declare them until
>     something needed one. Three things now do.
>   - The delayed route fallback, which is the only eager part of the state work
>     (~0.3 kB): it lives in SiteLayout, and a fallback that arrives in a chunk is a
>     fallback that was not there when the chunk was slow.
>
> What was given back, because "raise it" is the answer this file exists to make awkward:
>
>   - Thirteen bespoke outcome-message classes across five stylesheets, replaced by one
>     Notice pattern per app. Roughly −0.5 kB, all of it in lazy chunks, so it does not
>     show in the eager figure — but the shape of the system got smaller, not larger.
>   - Four hand-rolled data-loading state machines onto the useResource that already
>     existed for exactly this reason. ~120 lines.
>
> No new dependency. No new eager route. Nothing lazy was re-exported from content/index.ts.
> ```

---

## 8. Content additions

### 8.1 An honest note about where private-portal copy lives

`CLAUDE.md` says "every word lives in `apps/client/src/content/`". That is true of the
**marketing site**. It is not true of `features/private`, which writes its prose inline —
`AppState`'s "We could not load that", the dashboard's "Nothing is waiting on you", every
panel's body text. The rule was written for the marketing surface and the portal grew under a
different convention without anyone deciding to.

This plan does not resolve that, and does not silently make it worse. **Strings shared across
private screens go into a new `content/app.ts`; strings belonging to one screen stay where that
screen already puts them.** §10 records the inconsistency in `CLAUDE.md` so the next person is
choosing rather than guessing.

### 8.2 New strings

**`apps/client/src/content/app.ts`** — new module, shared across private screens

| Key               | Text                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `session.expired` | "Your session ended. Sign in and we will take you back to where you were."                        |
| `offline.title`   | "You are offline."                                                                                |
| `offline.body`    | "We will keep trying. Anything you have typed is still here."                                     |
| `loading.generic` | "Loading"                                                                                         |
| `retry.label`     | "Try again"                                                                                       |
| `unsaved.warning` | "You have not finished this yet. Leave the page and you will lose it."                            |
| `preview.notYet`  | "There is nothing to approve yet. We will email you the moment your preview is ready to look at." |

**In place, beside the screens that own them** — the DECISION 028 coherence strings on
`/app/projects`, `/app/assessment` and `/app/billing`; the empty feedback and tasks states; the
post-approval change confirmation. Drafted to the existing voice, reviewed by the owner in the
diff.

**`apps/admin` — inline, per Round 4.** The console has no content layer and inventing one for
~12 operator strings across 5 screens is a new architecture, not a copy change. New strings:

| Where             | Text                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `AccountsPage`    | "No accounts yet. One appears here the moment somebody signs up."                |
| `InboxPage`       | "Showing the {n} oldest. Reply to some to see the rest."                         |
| Milestone confirm | "Move this to '{stage}'? The customer's dashboard changes and this is recorded." |
| Reply confirm     | "Send this to {name}? It goes out as email and cannot be taken back."            |
| Offline           | "You are offline. Nothing will save until the connection is back."               |

**No string in `offer.ts`, `pricing.ts` or `qualification.ts` is touched.** `content.test.ts`
pins ~40 assertions about pricing language, the founding-price condition, guarantee wording and
cancellation terms. If a state genuinely requires one, the batch stops and asks.

---

## 9. Test plan

Two tiers, matching how this repository already enforces things. **Every guard is verified to
fail on an injected violation** — `tokens.test.ts`'s standard, and the reason its rules hold.

### Tier 1 — source-reading guards

**`apps/client/src/app/a11y.test.tsx`** and **`apps/admin/src/app/a11y.test.tsx`**

| Assertion                                      | Catches                            | Guards-the-guard     |
| ---------------------------------------------- | ---------------------------------- | -------------------- |
| Every layout renders a skip link               | 3 missing today                    | layout count > 3     |
| Every layout moves focus on route change       | `ConsoleLayout`                    | same                 |
| Every layout owns an `aria-live` region        | all 5                              | same                 |
| Every route module sets a document title       | all 5 console screens              | route count > 4      |
| No `Suspense fallback={null}` in `app/routes/` | the 5                              | `Suspense` count > 0 |
| Every layout is wrapped by an `ErrorBoundary`  | `AppLayout`, `DemoLayout`, console | layout count > 3     |

**`apps/client/src/features/private/states.test.tsx`** — every screen using `useResource`
renders loading, error and empty without throwing, asserted from the module list rather than a
hand-maintained array, so a new screen is covered for free.

**`apps/client/src/lib/fieldLimits.test.ts`** — reads the server's Zod schemas and asserts every
client `maxLength` matches. A client and a server that disagree about what is acceptable is the
defect that already bit `TaskForm`'s description field once.

### Tier 2 — render tests, only where the state branches

| State                 | Test                          | Asserts                                                              |
| --------------------- | ----------------------------- | -------------------------------------------------------------------- |
| Session expiry        | `sessionExpiry.test.tsx` ×2   | Redirect happens, `from` carried, session cleared                    |
| Offline               | `offline.test.tsx` ×2         | Notice appears on `offline`, clears on `online`, announced once      |
| Delayed fallback      | `RouteFallback.test.tsx`      | Nothing before 400 ms, `role="status"` after (fake timers)           |
| InlineConfirm         | `InlineConfirm.test.tsx` ×2   | Cancel calls nothing; confirm calls once; busy blocks a second press |
| Inbox truncation      | `InboxPage.test.tsx` (extend) | Disclosed at the limit, absent below it                              |
| Notice tones          | `Notice.test.tsx` ×2          | `problem` → `role="alert"`, `success`/`info` → `role="status"`       |
| Date formatting       | `formatDate.test.ts` ×2       | The UTC-as-local bug fails against the old spelling                  |
| Unsaved changes       | `unsaved.test.tsx`            | Handler registered when dirty, removed when clean                    |
| Mutation announcement | 4 render tests                | Success and failure both write to the live region                    |
| Undo milestone        | server service + API tests    | Window respected; no other path writes `milestone`                   |

**~14 new test files, not 60.** Exhaustive route × state coverage would be 150–250 cases, most
of them asserting that a shared component still renders — which the shared component's own test
already asserts once.

### Guards added to existing files

- `tokens.test.ts` — unchanged rules; the three new `--z-*` tokens must not break the drift check
- `content.test.ts` — the dead-CSS guard proves the 13 replaced classes are gone
- `bundle.test.ts` (admin) — unchanged; still pins the production React build

---

## 10. Documentation alignment

Mandatory, and the plan is not done until every row is true.

| File                                      | Change                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/design-system.md` **§1**            | Fix the stale paths — it still says `apps/client/src/styles/tokens.css`; the file has been `packages/ui/src/styles/tokens.css` since DECISION 026                     |
| `docs/design-system.md` **§3**            | Eight primitives added to the inventory table, each with variants, states and consumers                                                                               |
| `docs/design-system.md` **§4**            | Four patterns added: `Notice`, `InlineConfirm`, `RouteFallback`, and `AppState`'s shapes                                                                              |
| `docs/design-system.md` **§6**            | Note that the dead-CSS guard scans `apps/client/src` only, so it is policy for `packages/ui` and machinery for the app — §0.2                                         |
| `docs/design-system.md` **§7**            | **Rewritten as an inventory.** What exists, why, and what is still deliberately absent with the call-site count that would justify each                               |
| `docs/design-system.md` **§8**            | Rule 6 amended to the eager-bundle form. The old text kept as the reasoning it replaces, not deleted                                                                  |
| `CLAUDE.md`                               | The state layer in the layer diagram; the amended rule 6; the `content/` inconsistency in §8.1 stated plainly; the console's own conventions                          |
| `docs/owner-decisions-required.md`        | DECISION 029, verbatim as §3.3                                                                                                                                        |
| `03_plan/code_design_improvement_plan.md` | A dated note in §0d: the 120.0 ceiling unblocks **E5**, which was blocked on headroom alone. Not executed here — it is a structural change with no UX state behind it |
| `apps/client/scripts/check-budget.ts`     | The log entry in §7                                                                                                                                                   |
| **This file**                             | Boxes ticked as batches land; a one-line note wherever reality contradicted the plan                                                                                  |

---

## 11. Definition of done

Every line is a command or a count, with the figure measured on 2026-08-15 as its "from".

**Cross-cutting accessibility**

- [x] `0` layouts without a skip link — **from 3** (`AuthLayout`, `DemoLayout`, `ConsoleLayout`)
- [x] `0` layouts that do not move focus on route change — **from 1** (`ConsoleLayout`)
- [x] `0` layouts without an `aria-live` region — **from 5**
- [x] `0` routes without a document title — **from 5** (all of `apps/admin`)
- [x] `0` layouts not wrapped by an `ErrorBoundary` — **from 3**
- [x] `0` mutation outcomes that announce nothing — **from 8**

**Data and identity states**

- [x] `0` frontends ignoring `UNAUTHENTICATED` — **from 2**
- [x] `0` fetch layers without a request timeout — **from 1**
- [x] `0` `Suspense fallback={null}` or `return null` loading guards — **from 7**
- [x] `0` hand-rolled resource state machines — **from 4**
- [x] `0` data-backed screens without loading, error, empty and retry — **from 5**
- [x] `0` screens where the DECISION 028 account is told something different — **from 4**

**Input states**

- [x] `0` server-bound text fields without a `maxLength` matching the server — **from 5**
- [x] `0` long forms with no unsaved-changes protection — **from 4**
- [x] `0` irreversible actions without a confirmation — **from 2** (console milestone, console reply)
- [x] `0` call sites spelling _busy_ as `aria-disabled` instead of `loading` — **from 1**

**Consistency**

- [x] `0` bespoke outcome-message class sets — **from 13**
- [x] `0` UTC-rendered-as-local dates — **from 6**
- [x] `1` date-formatting vocabulary per app — **from 2 in one app**
- [x] `0` console screens unusable below 48rem — **from 2**

**Environment**

- [x] `0` app shells that do not report offline — **from 2**
- [x] `0` demo media without a load-failure fallback — **from ~12**
- [x] `0` unhandled stack traces on `npm run dev` — **from 4**

**System**

- [x] `8` new primitives in `@jobforge/ui`, each with a test — **from 0**
- [x] `3` new `--z-*` tokens, added in the same commit as a consumer or a documented plan for one
- [x] Eager CSS ≤ **120.0 kB raw / 20.0 kB gzip**, measured — from 111.4 / 17.9
- [x] Eager JS ≤ **545.0 / 164.0**, measured, or raised with its own log entry — from 532.5 / 161.6
- [x] `~14` new test files, **each verified to fail on an injected violation**
- [x] Every guard in §9 present and green
- [x] `npm run verify` passes across all five workspaces
- [x] Every row of §10 is true

---

## 12. The master checklist

**Phase 1 — the owner console**

- [x] 1.1 `useTitle` and titles on all five console screens
- [x] 1.2 `ConsoleLayout`: skip link, focus management, `<main tabIndex={-1}>`, live region
      — _note: the live region ended up in `app/App.tsx` rather than in the layout, so it
      covers the signed-out state too; the console has no eager/lazy trade to protect. The
      context split into `useAnnounce.ts` because `react-refresh/only-export-components`
      warns on a module exporting both a provider and a hook — the same split as
      `AuthContext.tsx`/`useAuth.ts`._
- [x] 1.3 `admin/lib/api.ts`: 15 s timeout and `UNAUTHENTICATED` handling
- [x] 1.4 Console `Notice`; `AccountsPage` empty state; inbox truncation disclosed
      — _note: truncation is disclosed from `conversations.length >= limit` rather than from a
      server `total`, which lands in 6.2. `>=` not `===`, because the server bounds each
      source and merges two._
- [x] 1.5 Console tables stack below 48rem; one date formatter replaces five `.slice()` calls
      — _note: five, not six. The audit counted six console sites; two of them were in one
      expression. The client's six `toLocaleDateString` calls were already correct and are
      untouched._

**Phase 1 measured:** 1,173 tests (from 1,126), 0 lint errors, 0 warnings. Eager JS 532.5 /
161.6 and CSS 111.4 / 17.9 — **unchanged**, as predicted: `apps/admin` is a separate bundle
with no `check-budget`. The console's own CSS grew 18.55 → 20.15 kB raw for the skip link, the
`Notice` pattern and the stacked-table media query, against no ceiling.

**Phase 2 — the customer portal**

- [x] 2.1 `DashboardPage`, `ProjectsPage`, `BillingPage` onto `useResource`; missing retry added
      — _note: **four** screens, not three. `AssessmentPage` was a fifth hand-rolled copy the
      audit missed, so §2.7's count of five implementations was itself one short — there were
      six. It carried one side effect `useResource` has no place for (clearing a stale draft
      from storage when a score has landed); that stays as an effect which drives storage, not
      state. A source guard in `features/private/states.test.ts` now fails on any new
      `new AbortController()` in the boundary, so a seventh cannot appear quietly._
- [x] 2.2 Client `Notice` replaces ten bespoke message classes
      — _note: `NoticeAction` was added alongside it for the billing banner's "Check again"
      control. The alternative was the feature importing `Notice.module.css` directly, which
      is the same defect as reaching past a feature's index. The dead-CSS guard found all six
      orphaned classes the moment the call sites moved, which is the pairing it exists for._
- [x] 2.3 `AppLoading` shapes; delayed `RouteFallback`; `AppLayout` error boundary; `AuthLayout` skip link
      — _four notes, all of them corrections to this plan._ 1. **The budget raise landed here, not in 7.2.** `check-budget.ts` failed this batch by
      **0.1 kB** — CSS 112.1 against a 112.0 ceiling — so the raise to 120.0 / 20.0 was
      applied with its log entry in this commit rather than at the end. That is the file
      working as designed: the raise arrives with the change that needed it, not as
      bookkeeping afterwards. 2. **`DemoLayout` moved forward from 5.1.** The new `a11y.test.ts` guard found it had
      neither a skip link nor an error boundary. A guard cannot land red, so both were
      built here; batch 5.1 shrinks to the media failure states. 3. **`useDelayedFlag` moved forward from 3.1**, because `RouteFallback` needs it. 4. **An existing test asserted the wrong property.** `DemoLayout.test.tsx` used "no skip
      link" as its proxy for "not inside `SiteLayout`". That proxy stopped being true for
      the right reason; it now asserts `#main-content` is absent and that the demo's own
      skip link targets `#demo-main`, which is the property it was reaching for.
- [x] 2.4 `UNAUTHENTICATED` → session cleared → redirect carrying `from`
- [x] 2.5 Live region in `AppLayout`; every mutation outcome announced
      — _note: `content/app.ts` is a **new** content module and is deliberately **absent from
      `content/index.ts`**, for the same reason `capabilities.ts` is: every marketing
      component imports the barrel, so a module re-exported from it lands in the eager chunk
      however carefully its consumer was split. Its header records the honest finding that
      "every word lives in `content/`" has never been true of `features/private`._
- [x] 2.6 Zero-data states: DECISION 028 coherence, no-preview, empty feedback and tasks
      — _note: the `/app/projects` empty state now points at the **dashboard**, not at
      Billing. The audit called this a copy problem; it is an architectural one. Since
      DECISION 028 the commonest visitor to that page has not asked for anything yet, and
      sending them to a payment page asks for money before anybody has spoken to them. This
      page cannot tell the two apart and must not try — `chooseCurrentAction` on the server
      gives exactly one answer and the dashboard renders it. `TaskList`'s empty states were
      already correct and were left alone._

**Phase 2 measured:** 1,197 tests (from 1,173). Eager JS 532.5 → **534.0** raw (162.0 gzip);
CSS 111.4 → **112.1** raw (18.0 gzip). The CSS movement is `RouteFallback` plus two skip
links; the JS is `useAnnouncerState` and `useDelayedFlag` entering the eager `@jobforge/ui`
barrel, plus the session-lost hook in `http.ts`. Everything else in this phase is in lazy
chunks and the `Notice` consolidation took CSS out of them.

**Phase 3 — shared behaviour and input states**

- [x] 3.1 `useDelayedFlag`, `useOnlineStatus`, offline notice in both shells
      — _note: `useDelayedFlag` landed in 2.3 because `RouteFallback` needed it. The hook's
      header states the honest limit `navigator.onLine` has: a `false` is reliable, a `true`
      proves nothing, so it is used only to **add** an explanation and never to suppress or
      reinterpret a `NETWORK_ERROR`._
- [x] 3.2 `InlineConfirm` extracted; wired to approval, milestone and reply
      — _note: the console's milestone `<select>` now sets a **pending** value; nothing is
      sent until the question is answered. Four console operations also gained success
      announcements, which §2.6 of this plan had assigned to batch 2.5 but which live on the
      console's own `run` helper. Three existing inbox tests failed correctly — the reply flow
      gained a step — and were updated rather than worked around._
- [x] 3.3 `maxLength` parity with the server schemas; `CredentialForm` uses `loading`
      — _note: the limits became `FIELD_LIMITS` in `@jobforge/shared`, pinned by four new
      assertions in `contract.sync.test.ts` that read the numbers out of the server's own
      source. Hard-coding them in the forms would have been the same defect one level down:
      a `.max()` changed on the server and not in the browser is a form that lies, and nothing
      about it is a type error._
- [x] 3.4 `beforeunload` on the long forms
      — _**correction to §2.4 and gap #15 of this plan.** The audit said "`/audit` alone
      persists to `localStorage`". That is wrong: `useWebsiteScore.ts` persists the PlayBook
      assessment too, under `serviceside.playbook.score.v1`, and says so in its header. Both
      scoring tools were already safe, so this batch is `beforeunload` only — `/welcome`'s
      fourteen fields and the console's task and reply boxes. `CredentialForm` deliberately
      gets neither: a password in storage is exactly what `draft.ts` refuses._

**Phase 3 measured:** 1,208 tests (from 1,197). Eager JS 534.0 → **534.6** raw (162.3 gzip),
CSS **unchanged** at 112.1 / 18.0. The JS is `useOnlineStatus` and `FIELD_LIMITS` entering the
eager graph; the `InlineConfirm` and offline CSS is all in lazy chunks or the console's bundle.

**Phase 4 — the primitive set**

- [x] 4.1 `--z-dropdown`, `--z-modal`, `--z-toast` in `tokens.css`
- [x] 4.2 `Table` and `Tabs`, with their existing consumers migrated
      — _note: `AccountsPage`'s header argued that a third file holding `.table` for two
      consumers is an abstraction extracted at two, and it was right about a **stylesheet**.
      What moved is three behaviours, one of which — `data-label` on every cell — is invisible
      on the desktop where it is written and wrong on the phone where it is read. A required
      prop cannot be forgotten; a class can. `Tabs` is a `<nav>` of links and deliberately not
      an ARIA tablist, because these four views are real routes._
- [x] 4.3 `Modal` and `Drawer`
      — _**this measurement contradicts §3 and §7 of this plan, and DECISION 029's premise.**
      After both landed, the eager bundle did not move at all: CSS 112.7 before and after, and
      `aria-modal` appears in **no chunk in `dist`**. Rollup drops a barrel export nothing
      imports, and the CSS module goes with it because its import lives inside the dropped
      file._
      _So a zero-consumer primitive in `@jobforge/ui` costs **zero bytes**, not the ~4.9 kB
      §7's ledger budgeted for the six. The payload half of composition rule 6 does not apply
      to a tree-shakeable module at all — which makes the case for building them stronger than
      the plan argued, and makes the budget raise something the **other** work needed rather
      than something these six bought. DECISION 029's text and the `check-budget.ts` entry are
      both corrected in 7.1/7.2 rather than left asserting a cost that was not measured._
      _A `--color-scrim` token was added, because the token guard correctly refused two
      `rgb(23 25 30 / 55%)` literals and `design-system.md` §9 says a colour becomes a token
      rather than an exception. Two consumers, same commit._
- [x] 4.4 `Toast`
      — _note: it deliberately carries **no** live-region role. Both applications already own
      one region each, and two regions announcing one outcome is worse than none. Its real
      purpose is the case a live region cannot cover — a message that must survive a
      navigation — and nothing does that today._
- [x] 4.5 `Tooltip`, `Switch`, `Avatar`
      — _note: a `spacing` exception was added for `Switch.module.css`, whose hint is indented
      by the track's width plus the row's gap so it lines up under the label. That is the
      exception list working as designed: a measurement of specific elements, written down._

**Phase 4 measured, and it contradicts §7 of this plan.** 1,236 tests (from 1,208). Eager JS
534.6 → **534.9** raw (162.4 gzip); CSS 112.1 → **112.7** raw (18.2 gzip). §7's ledger
predicted ~118.6 / ~19.6 after this phase, on the assumption that eight primitives cost ~6.3 kB
of eager CSS. **The measured cost of the six with no consumer is zero** — the 0.6 kB that did
move is `Table` and `Tabs`, which have consumers. Everything else was tree-shaken away.

**Phase 5 — marketing, demos and the developer surface**

- [x] 5.1 Demo media failure states; ambient video reduced-motion; `DemoLayout` skip link
- [x] 5.2 Vite proxy turns the startup `ECONNREFUSED` into one readable line

**Phase 6 — the server slice**

- [x] 6.1 `ProjectService.undoMilestone`, its route, its activity entry, its tests
- [x] 6.2 `total` on the conversation list; `AppError` message review

**Phase 7 — documentation**

- [x] 7.1 `design-system.md` §1/§3/§4/§6/§7/§8, `CLAUDE.md`, DECISION 029, the E5 note
- [x] 7.2 The `check-budget.ts` log entry; final `npm run verify`; ledger reconciled

---

_Plan written 2026-08-15. No source file has been modified. Execution begins on approval._

---

## 13. Closing note — what the execution learned (2026-08-15)

Twenty-six batches, `npm run verify` green after every one, **1,243 tests across 79 files** from
1,126 across 65. Eight findings contradicted this plan while it was being executed. They are
recorded in the batch notes above and collected here, because a plan that was right about
everything is a plan nobody measured.

| What the plan said                                | What was measured                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Six zero-consumer primitives cost ~4.9 kB eager   | **Zero.** Rollup drops them; `aria-modal` is in no chunk. §7's ledger was wrong by 5.9 kB.       |
| Four hand-rolled resource state machines          | **Six.** `AssessmentPage` was a fifth, found mid-migration; the audit's own count was one short. |
| `/audit` alone persists its answers               | **Both** scoring tools persist. `useWebsiteScore` has since it was written.                      |
| `DemoLayout` gaps belong in batch 5.1             | Found by the new guard in **2.3**, so they were fixed there. A guard cannot land red.            |
| The `/app/projects` empty state is a copy problem | An **architectural** one: it must not guess a next step `chooseCurrentAction` owns.              |
| Six console `.slice()` date sites                 | **Five.** Two were in one expression.                                                            |
| The budget entry belongs in phase 7               | It belongs in **2.3**, where the guard demanded it — which is how `check-budget.ts` is designed. |
| `Table` is an abstraction extracted at two        | True of a _stylesheet_. What moved is behaviour, one part of which is invisible where written.   |

The one worth carrying forward is the first. **In `@jobforge/ui`, weight follows use, not
declaration** — which means the payload argument that shaped §7 for two years does not apply to a
tree-shakeable module, and the real cost of an unused primitive is the maintenance it starts
rather than the bytes it does not add. DECISION 029 and `check-budget.ts` both record it.

### What was deliberately not built

Dark mode, RTL and i18n, print beyond the workbook, `forced-colors`, pagination controls,
in-place re-authentication, undo on anything the server cannot reverse, and the seven deferred
product features in `CUSTOMER-PLATFORM.md` §10.2. Each is in §4.6 with its reason.

Two more, decided during execution: **in-app navigation is not guarded against unsaved changes**
— `useBlocker` needs a data router and both apps use `<BrowserRouter>`, so `beforeunload` covers
reload, tab close and typed URL and nothing else, which `useUnsavedChanges` states rather than
implies. And **E5 was not executed**, though the new ceiling unblocks it; that is recorded in
`code_design_improvement_plan.md` §0e as a scheduling decision rather than a budget one.

### §14. Six of those were built the next day (2026-08-16)

`03_plan/deferred_work_plan.md` took every item in the list above and did it. This section
exists so a reader of §4.6 does not act on a deferral that has been reversed.

| Deferred here                                              | Now                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dark mode                                                  | **Built**, then narrowed. A second measured palette and a no-flash bootstrap behind a CSP hash. The control is two states and `prefers-color-scheme` is no longer consulted — light is the site, dark is a request. DECISION 036, `deferred_work_plan.md` §9.14. |
| `forced-colors`                                            | **Built.** Eleven components, plus a new `tokens.test.ts` rule keeping system colours inside their block.                                                                                                                                                        |
| Print beyond the workbook                                  | **Built.** A token-level print palette, chrome marked with `data-print`, and four screens.                                                                                                                                                                       |
| RTL                                                        | **The spelling, built.** 139 physical declarations converted and rule 7 added.                                                                                                                                                                                   |
| i18n message catalogue                                     | **Still not built**, and the reason is sharper now — see DECISION 030. What _was_ built is `Intl` formatting, which fixed two live bugs.                                                                                                                         |
| Pagination controls                                        | **Built.** All three console lists, raising the limit rather than offsetting.                                                                                                                                                                                    |
| In-place re-auth                                           | **Built.** Both applications; `Modal`'s first consumer.                                                                                                                                                                                                          |
| In-app navigation guard                                    | **Built — without the router.** See below.                                                                                                                                                                                                                       |
| E5                                                         | **One split, measured, then stopped.** `code_design_improvement_plan.md` §0f.                                                                                                                                                                                    |
| Undo on irreversible actions, `CUSTOMER-PLATFORM.md` §10.2 | Unchanged. Still correctly deferred.                                                                                                                                                                                                                             |

**The one correction to this document's own closing note.** §13 recorded that in-app navigation
was not guarded because `useBlocker` needs a data router. That reasoning was right and the
conclusion was wrong by one step: migrating was _measured_ at **+54.0 kB raw / +16.6 kB gzipped**
of eager JavaScript — the whole data layer, none of which this application uses — and
`check-budget.ts` refused the build. The capability ships anyway, as a capture-phase click
listener in `useUnsavedChanges`, for **1.1 kB**. The genuine remaining gap is the back button,
which `popstate` cannot block without breaking for everybody who meant it, and the hook now says
so.
