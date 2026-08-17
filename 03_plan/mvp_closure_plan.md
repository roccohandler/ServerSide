# MVP Closure Plan

**Repository:** JobForge (`ServiceSide` working directory)
**Written:** 2026-08-16
**Continues:** `03_plan/code_design_improvement_plan.md`, `03_plan/ux_completeness_plan.md`,
`03_plan/deferred_work_plan.md` — all three complete
**Scope:** everything between "the architecture is finished" and "a stranger can buy this and be
delivered to without the owner opening a terminal"

---

## 0. What this document is, and what it is not

The three plans above finished the **architecture**. This one finishes the **product**.

That distinction is the reason this plan exists and the reason it looks different from its
predecessors. Those documents found defects in things that were built. This one finds **things
that were never built at all** — and every single one of them sits on a code path that already
runs, has a name, and stops.

Five examples of the shape, before the detail:

- `ONBOARDING_TASKS` seeds a task called `upload-logo`. There is no upload anywhere in five
  workspaces. The task is an instruction the system cannot receive the answer to.
- `conversation.service.ts` replies to a customer by writing a comment on their project. Nothing
  emails them. The reply is correct, durable, attributed — and invisible until they next sign in.
- `admin.routes.ts` refuses to add a task to a project with no `ownerUserId`, telling the
  operator to "attach an account first". Nothing in this repository can attach an account.
- `/welcome` collects fourteen fields of build-critical information. No screen reads them.
- `RESEND_FROM_EMAIL` is on `@resend.dev`, which delivers only to the account owner's own
  address. **Every customer-facing email this system sends today is undeliverable.**

None of these are bugs. Each is a deliberate stopping point that was correct when the surface
around it did not exist yet. What has changed is the bar: the owner's answer to "what does MVP
ready mean" was **public launch — anyone can sign up and self-serve the whole thing**, which is
the bar at which every one of these becomes load-bearing.

### What this plan is not

It is not a redesign. Nothing in `CLAUDE.md` is being renegotiated, no decision in
`docs/owner-decisions-required.md` is being reversed except where this document says so
explicitly and says why. Every gap below is closed by **extending a feature that already exists**
in the direction it already points — which is what `docs/CUSTOMER-PLATFORM.md` §10.1 instructs,
in a table headed "Do not build a parallel system for any row above."

---

## 1. The scope, as decided

Twenty-four questions were answered before this document was written. The answers are recorded
here rather than in a chat log, because they are the plan's premises and every one of them is
arguable.

| #   | Question               | Answer                                                                                   |
| --- | ---------------------- | ---------------------------------------------------------------------------------------- |
| 1   | MVP bar                | **Public launch / can be sold.** Anyone signs up and self-serves end to end              |
| 2   | Must-fix gaps          | **All four** — customer emails, file uploads, console project ops, payment closure       |
| 3   | Effort appetite        | **Thorough.** Estimates, unread state, onboarding screens, search, digests, DECISION 019 |
| 4   | Dependencies           | **Vercel-native only.** Vercel Blob, Resend, MongoDB. No new vendors                     |
| 5   | Customer emails        | **All four groups** — preview/approval, replies, tasks, live + payment                   |
| 6   | Owner alerts           | **Immediate for money + action, daily digest for the rest**                              |
| 7   | In-app notifications   | **Yes, both apps**                                                                       |
| 8   | Email config state     | _Investigated_ — see §2.1. It is worse than assumed                                      |
| 9   | File transfer          | **Vercel Blob direct upload**                                                            |
| 10  | Console file ops       | **All four** — per-task, project panel, delete/replace, owner→client upload              |
| 11  | Monthly report         | **Structured screen in the portal**                                                      |
| 12  | Onboarding submissions | **Both** — list screen and project panel                                                 |
| 13  | Console operations     | **All four** — create, attach account, edit fields, search/filter                        |
| 14  | Stripe operations      | **Console sends checkout links**, plus DECISION 019 option B                             |
| 15  | Final payment          | **Fully self-serve from the `launching` milestone**                                      |
| 16  | Conversion Fix         | **Removed from the MVP**                                                                 |
| 17  | Assessment delivery    | **Structured report in the portal**                                                      |
| 18  | Messaging              | **General thread per account**                                                           |
| 19  | Estimates              | **Target launch date on the project**                                                    |
| 20  | Quiet leads            | **Both** — automated nudge sequence and an owner worklist                                |
| 21  | Production gaps        | **All four** — email domain, Stripe, Google + Vercel webhook, admin + CORS               |
| 22  | Analytics              | **Nothing real — build it**                                                              |
| 23  | Sequencing             | **Unblock production first**                                                             |
| 24  | Working style          | **Run to completion, report at each phase boundary**                                     |

### The one answer that changes published copy

**#16 — Conversion Fix is removed.** This is the only answer that is not purely additive, and it
has a consequence the question did not name: `recommendedAction()` in `config/pricing.ts` has
three branches, and the middle one (`fix`, for a site scoring 65–85%) exists specifically to
point at Conversion Fix. Deleting the product without re-pointing the branch would return the
audit to the exact dead end DECISION 014 was written to remove — a diagnosis with nothing behind
it — and `pricing.test.ts` asserts every branch resolves to something a reader can act on.

§8.4 handles this. The branch will point at a **human review** rather than at nothing: the same
free assessment the rest of the site offers, framed for somebody whose site is basically sound.
That is honest (it is what would actually happen), it keeps the test passing, and it removes a
product without removing an answer.

---

## 2. Measured starting state

### 2.1 Configuration — what is actually set

Read from the working `.env` on 2026-08-16. Values redacted; presence is the finding.

| Variable                     | State             | Consequence                                                                |
| ---------------------------- | ----------------- | -------------------------------------------------------------------------- |
| `MONGODB_URI`                | set               | —                                                                          |
| `RESEND_API_KEY`             | set               | —                                                                          |
| `RESEND_FROM_EMAIL`          | **`@resend.dev`** | 🔴 **Every customer email is undeliverable**                               |
| `CONTACT_NOTIFICATION_EMAIL` | personal Gmail    | 🟠 DECISION 013 — also the contractual support address                     |
| `STRIPE_SECRET_KEY`          | **unset**         | 🔴 No checkout. `/api/app/billing/checkout` answers 503                    |
| `STRIPE_WEBHOOK_SECRET`      | **unset**         | 🔴 No fulfilment. A paid deposit creates no project                        |
| `STRIPE_PRICE_*` (×4)        | **unset**         | 🔴 No product is purchasable                                               |
| `BILLING_ADMIN_TOKEN`        | **unset**         | 🟠 Owner billing endpoints switched off entirely                           |
| `GOOGLE_CLIENT_ID`           | **unset**         | 🟠 Google button hidden. DECISION 028's "one click" mitigation is not live |
| `VERCEL_WEBHOOK_SECRET`      | **unset**         | 🟠 Preview/production URLs must be typed by hand                           |
| `CLIENT_ORIGIN`              | **unset**         | 🟠 Falls back to a derived `admin.` subdomain — see DECISION 027.4         |

**The `@resend.dev` finding is the single most important line in this document.** Resend's shared
sandbox domain accepts mail from anybody and delivers it **only to the address that owns the
Resend account**. Every path below is therefore dead in production today, silently, with a
success response and a `logger.info` on the server:

- email verification (`buildVerifyEmailEmail`)
- password reset (`buildPasswordResetEmail`) — an account is currently unrecoverable
- the welcome email (`buildWelcomeEmail`)
- a prospect reply from the console inbox (`buildProspectReplyEmail`)
- the PlayBook workbook delivery (`buildWorkbookDeliveryEmail`)

Nothing in the codebase is wrong. `resend.email.service.ts` correctly checks `result.error` and
throws `EmailDeliveryError` on rejection — but a sandbox send to a non-owner address is not
rejected at the API, it is dropped downstream. This is invisible to every guard in the
repository and would be invisible in production.

### 2.2 What exists and works

Stated because the plan below must not rebuild any of it.

| Capability                                                           | Where                        |
| -------------------------------------------------------------------- | ---------------------------- |
| Sessions, scrypt, Google verification, capabilities, ownership → 404 | `features/auth`              |
| Activity spine with `customer` / `internal` audience                 | `features/activity`          |
| Lifecycle chokepoint — 8 milestones, undo window, approval           | `features/projects`          |
| Idempotent Stripe fulfilment at three levels                         | `features/billing`           |
| Merged inbox read model over leads + comments                        | `features/conversations`     |
| Deployment provider port, four fields wide                           | `features/deployments`       |
| One-answer dashboard action chooser                                  | `features/dashboard`         |
| Bounded lists with exact `hasMore`                                   | `admin.routes.ts` `page()`   |
| Contract pinning across the workspace boundary                       | `contract.sync.test.ts`      |
| Payload budget, token rules, CSP hash guard                          | `scripts/`, `tokens.test.ts` |

### 2.3 Budget headroom

From `deferred_work_plan.md` §8b, after E5:

| Measure                   | Value                      | Ceiling       |
| ------------------------- | -------------------------- | ------------- |
| Eager JS (`apps/client`)  | 534.9 kB raw / 162.4 kB gz | 545.0 / 164.0 |
| Eager CSS (`apps/client`) | 112.7 kB raw / 18.2 kB gz  | 120.0 / 20.0  |

**10.1 kB raw / 1.6 kB gzipped of JS headroom, and 7.3 / 1.8 of CSS.** Every screen this plan
adds is inside `/app` or the console, both of which are already lazy — so the eager cost should
be near zero. It will be **measured at each phase boundary, not assumed**, and any phase that
moves the eager figure gets a note explaining why before it is accepted.

---

## 3. Architecture: the three new features, and why they are features

Everything in this plan lands in one of three new server features or extends an existing one.
Naming them up front, with the argument for each being a feature rather than a helper, because
`CLAUDE.md` composition rule 3 says abstraction is justified by current repeated use.

### 3.1 `features/notifications` — the delivery port

**Why it is a feature and not a method on each service.** Six services need to tell somebody
something: `projects`, `tasks`, `feedback`, `deployments`, `billing`, `assessments`. Putting the
email construction in each would produce six different opinions on tone, six different unsubscribe
stories, and six places to change the from-address. Putting it in `infrastructure/email` would be
wrong in the other direction — that layer is a transport and knows nothing about milestones.

**Its shape is `BillingFulfillment`'s, deliberately.** A port injected into the services that
need it, defaulting to a no-op, and it **never throws**. The rule from `billing.service.ts`
applies unchanged and for the same reason: the state change is already durable, and losing a
milestone transition because an email bounced would be strictly worse than a missed email.

```
ProjectService ─┐
TaskService    ─┤
FeedbackService─┼──→ Notifier (port) ──→ EmailService ──→ Resend
DeploymentSvc  ─┤         │
BillingService ─┘         └──→ ActivityRecorder (already there — not duplicated)
```

**It does not own read state.** Read state is §3.2. A notification is an _outbound_ act; unread
is a property of the reader.

### 3.2 Read state — extending `activity`, not a new collection

The customer already has a stream: `activity`, filtered to `audience: 'customer'`. The unread
count is therefore **"entries since a marker"**, and the marker is one field.

`activityReadAt` on the user document for the customer app. `consoleReadAt` for the console —
a separate field because they are separate questions asked by the same person on two origins.

**Why not a `Notification` collection with a `readAt` per row.** Because it would be a second
definition of "what happened", and the repository has an explicit rule against exactly that
(`features/conversations`: "a second definition of unanswered is the failure it avoids"). Every
event this plan would put in such a collection is already an `ActivityType`. A per-row read state
buys per-item dismissal, which nobody asked for and which costs a collection, an index, a
retention question and a backfill.

**What this cannot do, stated now:** it cannot express "I read entry 3 but not entry 2". That is
the correct trade for a portal where the whole stream is on one screen.

### 3.3 `features/files` — Vercel Blob, and the bytes never touch the server

```
browser ──1. ask──→ server (auth + validate + issue token)
   │                   ▲
   2. PUT bytes        │ 4. onUploadCompleted (signed callback) → write record
   ▼                   │
Vercel Blob ───3.──────┘
```

**The server never handles a file body.** `@vercel/blob`'s client-upload flow issues a
short-lived, scoped token; the browser PUTs directly to Blob storage; Blob calls back to the
server, which is where the `File` record is written. This is the presigned-URL pattern the
research names as standard, in the Vercel-native form the owner's constraint requires.

Three properties this buys, each of which matters:

1. **No multipart parser in Express.** The CSRF guard's second defence is "a JSON content type an
   HTML form cannot produce" (`middleware/csrf.ts`). Accepting `multipart/form-data` on the API
   would weaken that argument. Direct upload means the API stays JSON-only.
2. **No function payload limit.** Vercel's serverless request body cap would otherwise put a hard
   ceiling on a photo from a phone camera.
3. **The record and the blob cannot disagree.** The record is written by the callback, which fires
   only after the bytes have landed.

**Access control.** Blob URLs are unguessable but public-by-URL. A customer's photographs are not
a secret in the way a session token is, but they are not ours to publish either — so file URLs are
**never** put in a public HTML page, are served only through an authorised API response, and the
record carries `projectId` + `userId` so `authorizeOwnership` applies exactly as it does to every
other resource.

---

## 4. Phase 0 — Production unblock

> **Nothing in phases 1–6 can be verified end to end until this phase is done.** That is the
> owner's chosen sequencing and it is right: a notification system built on an undeliverable
> from-address is a system whose tests pass and whose product does not exist.

Most of this phase is configuration the owner performs. The **code** in it is the part that makes
the configuration checkable, which is the part that stops this happening again.

### 4.0 The preflight script — build this first

**`scripts/preflight.ts`, run as `npm run preflight`.**

Every failure in §2.1 has the same shape: a variable that is unset or wrong, producing a system
that starts cleanly, answers 200, logs success and delivers nothing. `loadServerConfig` already
refuses to boot production without four variables — this extends that idea from _boot_ to
_readiness_, and it reports rather than throws so it can be run against any environment.

What it checks:

| Check                  | Fails when                                                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| From-address domain    | `RESEND_FROM_EMAIL` is on `resend.dev`, `gmail.com`, or any free provider                                                 |
| Support address domain | `CONTACT_NOTIFICATION_EMAIL` is on a free provider (warn, not fail — DECISION 013)                                        |
| Stripe reachable       | Secret key present **and** `stripe.getPriceAmount` succeeds for all four Prices                                           |
| Stripe amounts         | Each Price matches `EXPECTED_AMOUNT_CENTS` — the same check `requireVerifiedPrice` makes, run _before_ a customer hits it |
| Webhook secret         | Present when the secret key is                                                                                            |
| Blob token             | `BLOB_READ_WRITE_TOKEN` present                                                                                           |
| Admin exists           | At least one `role: 'admin'` user in the database                                                                         |
| CORS                   | `CLIENT_ORIGIN` set in production, and every entry parses as an origin                                                    |
| Google                 | Client id present, or explicitly acknowledged absent                                                                      |
| Deployments            | Vercel webhook secret present, or explicitly acknowledged absent                                                          |

Output is a table with ✅ / ⚠️ / ❌ and, for each failure, **the exact thing to do**. This is the
artefact that makes "public launch ready" a question with an answer instead of a feeling.

### 4.1 Sending domain and the business mailbox

- [ ] **0.1.1** Owner: add a sending domain in Resend, publish SPF, DKIM and a DMARC record
- [ ] **0.1.2** Owner: create a business mailbox (`hello@`, `support@`) and forward it
- [ ] **0.1.3** Set `RESEND_FROM_EMAIL` to `JobForge <hello@thedomain>`, `CONTACT_NOTIFICATION_EMAIL` to the business address
- [ ] **0.1.4** Update `supportEmail` in `content/site.ts` and every legal/contractual reference; `content.test.ts` should assert no free-provider address appears in published copy
- [ ] **0.1.5** Send one real email down each of the five dead paths in §2.1 and confirm arrival at a non-owner address
- [ ] **0.1.6** Record DECISION 013 as answered

### 4.2 Stripe

- [ ] **0.2.1** Owner: run `npm run stripe:setup --workspace @jobforge/server`, or create four Prices by hand
- [ ] **0.2.2** Map all four `STRIPE_PRICE_*` variables + secret key + webhook secret
- [ ] **0.2.3** Register the webhook endpoint at `/api/billing/webhook`; subscribe to the events `billing.webhooks.ts` interprets
- [ ] **0.2.4** Generate `BILLING_ADMIN_TOKEN` (32+ bytes) and store it in a password manager
- [ ] **0.2.5** Run one full test-mode purchase per product; confirm project creation, task seeding and activity
- [ ] **0.2.6** Confirm `requireVerifiedPrice` passes — a mismatched Price must 503 loudly, and that behaviour must be _seen_ once

### 4.3 Google sign-in and deployment tracking

- [ ] **0.3.1** Owner: create the OAuth Web client; authorised origins for dev and production
- [ ] **0.3.2** Set `GOOGLE_CLIENT_ID`; confirm the button appears and a Google account produces a session
- [ ] **0.3.3** Owner: create the Vercel webhook integration; set `VERCEL_WEBHOOK_SECRET`
- [ ] **0.3.4** Confirm a deployment carrying `jobforgeProjectId` updates a project's `previewUrl`

### 4.4 Admin, origins and the cookie trap

- [ ] **0.4.1** Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in production, run `npm run admin:create`, **remove both**
- [ ] **0.4.2** Set `CLIENT_ORIGIN` explicitly to both production origins
- [ ] **0.4.3** Confirm the console is a **subdomain of the API's registrable domain** — DECISION 027.4. Two `*.vercel.app` names are two sites and the session cookie is never sent; the symptom is a sign-in that succeeds and loops back to the form with nothing in any log
- [ ] **0.4.4** Add the admin-exists and origin checks to preflight (§4.0)
- [ ] **0.4.5** Record DECISION 020 as answered (option C — preflight _is_ the health check it recommends)

### 4.5 Analytics

The seam is built and correct — `lib/analytics.ts` declares 30+ named events with a controlled
`CtaLocation` vocabulary and pushes to `window.dataLayer`. Three things turn it on, and **the
second is not optional**:

- [ ] **0.5.1** Add the tag-manager snippet to `apps/client/index.html`
- [ ] **0.5.2** 🔴 **Correct `content/legal.ts`.** The privacy page currently states this site does no analytics tracking. It is true today. Publishing a tag without changing that sentence makes the privacy policy false — which is a legal exposure, not a copy defect
- [ ] **0.5.3** Add the required `script-src` / `connect-src` entries to `vercel.json`, **and re-run `npm run check:csp`** — the inline theme script's `sha256-` is recomputed from built HTML and any edit to `index.html` can move it
- [ ] **0.5.4** Confirm events arrive for the account-first funnel: `assessment_signup_viewed` → `assessment_account_created` → `website_review_requested`
- [ ] **0.5.5** Decide cookie-consent posture and record it

### 4.6 Phase 0 exit criteria

- [ ] `npm run preflight` reports zero ❌ against production
- [ ] A real email arrives at a real non-owner address
- [ ] A test-mode deposit creates a project with seeded tasks
- [ ] The console holds a session on the production origin
- [ ] `npm run verify` passes

---

## 5. Phase 1 — The notification spine

**The gap:** `feedback`, `tasks`, `projects` and `deployments` import no email service. Four of
the five moments a customer needs to hear about happen in those services. The client is told
nothing after signup.

### 5.1 The port

- [ ] **1.1.1** `features/notifications/notification.types.ts` — the event union, mirroring the `ActivityType` names it pairs with
- [ ] **1.1.2** `notification.service.ts` — `Notifier`, one method per event, never throws, logs on failure
- [ ] **1.1.3** `notification.email.ts` — templates via the existing `lib/emailTheme.ts` and `lib/html.ts`
- [ ] **1.1.4** `noopNotifier` for tests, matching `noopBillingFulfillment`
- [ ] **1.1.5** Wire into `app/app.ts`; inject into the five services as an optional dependency
- [ ] **1.1.6** Every template is plain-spoken, states what happened and the one next step, and carries a deep link into `/app` — research is unambiguous that transactional mail is skimmed for exactly those two facts

### 5.2 The customer emails

| Event           | Fired from                                                               | Says                                                    |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Preview ready   | `ProjectService.setMilestone` → `review`, or `deployments` preview-ready | Your preview is ready — look and tell us what to change |
| Approval needed | `approval` → `ready_for_review`                                          | Your changes are done; approve and we put it live       |
| Task added      | `TaskService.addTask`                                                    | We need something from you: _title_                     |
| Reply received  | `FeedbackService.addComment` where author is team                        | _Name_ replied about your website                       |
| Website live    | production deployment / `setUrls`                                        | It is live at _url_                                     |
| Payment         | already in `billing` — extend to the customer, not just the owner        | Receipt, failure, final payment due                     |

- [ ] **1.2.1** – **1.2.6** One item per row above
- [ ] **1.2.7** **Suppress self-notification.** A customer completing their own task must not be emailed about it. The author is on every call already; assert it in tests
- [ ] **1.2.8** **Coalesce task seeding.** `seedOnboarding` creates five tasks in a loop. Five emails on deposit day is the single most likely way this feature becomes something people mute. One email naming the set
- [ ] **1.2.9** Unsubscribe/preference posture — transactional mail is exempt from CAN-SPAM's unsubscribe requirement but the digest in §5.3 is not. Decide and record

### 5.3 Owner: immediate versus digest

- [ ] **1.3.1** Classify every owner notification. **Immediate:** payment succeeded/failed, new lead, changes requested, all tasks completed, approval given. **Digest:** account created, task completed individually, assessment submitted, general activity
- [ ] **1.3.2** Move `account.created` off immediate — DECISION 028.1 chose immediate _at this volume_ and explicitly said "if that stops being true the answer is a digest, not a flag". This is that moment; supersede it in the register
- [ ] **1.3.3** `notification.digest.ts` — compose one day of digestible events
- [ ] **1.3.4** `api/cron/digest.ts` + a `crons` entry in `vercel.json`; secured by Vercel's cron header, not a public route
- [ ] **1.3.5** Send nothing when the day was empty. A daily email that says "nothing happened" trains its own dismissal

### 5.4 In-app unread, both apps

- [x] **1.4.1** `activityReadAt` on the user model. **`consoleReadAt` was not built — see 1.4.4.**
- [x] **1.4.2** `GET /api/app/activity/unread` → `{ count, since, capped }`
- [x] **1.4.3** `POST /api/app/activity/read` → stamps the marker with the _server's_ clock
- [x] **1.4.4** **Not built, deliberately.** See §5.4a
- [x] **1.4.5** Customer UI: count on the Dashboard nav item in `AppLayout`, "N things have happened since you were last here" plus a per-entry `New` marker on the dashboard's activity section
- [x] **1.4.6** **Not built** — same entry
- [x] **1.4.7** `DashboardData.unread` added and pinned in `contract.sync.test.ts`, both directions

#### 5.4a Three places the build differed from this section

**The path is `/api/app/activity`, not `/api/app/notifications`.** A `/notifications` mount promises
a collection behind it and there is not one — §3.2 is the argument that a notification here is an
outbound act with no record to read back, and what a customer catches up on is the activity stream
that already exists. Naming the mount after a table that does not exist is how somebody later
creates the table.

**There is no `consoleReadAt` and no console badge.** Three things already tell the owner that
something arrived: a lead sends an immediate owner email at intake, a comment produces a digest
line, and the console's _default screen is the Inbox itself_. A badge would be a fourth telling of
the same fact, and it would point at a console-wide activity feed that has no screen — a count
whose only affordance is a number. Rule 6: build the response to a signal that exists. If the
console ever grows an activity screen this becomes worth revisiting, and the customer half already
proves the shape.

**`useUnread` is imported by path, not through `session/index.ts`.** Re-exporting it from the
barrel put it in the eager bundle — every marketing page imports that barrel for `useAuth` — and
cost **0.1 kB gzipped of the 0.2 kB headroom**, measured, for a hook only the lazy workspace shell
uses. `ReauthDialog` sits beside it for the same reason. Phase 1d's final eager cost is **zero**.

### 5.5 Phase 1 exit criteria

- [ ] Each of the six customer emails observed arriving from a real state change _(needs a
      verified sending domain — Phase 0)_
- [x] Self-notification suppressed; task seeding sends one email
- [ ] Digest fires on schedule and stays silent on an empty day _(needs `CRON_SECRET` — Phase 0)_
- [x] Unread count correct and clears on read
- [x] `npm run verify` passes; eager bundle unchanged at 163.8 kB gz

---

## 6. Phase 2 — Files

**The gap:** two seeded onboarding tasks ask for files. There is no upload in five workspaces.

### 6.1 Server

- [x] **2.1.1** `@vercel/blob` added to `apps/server` (and to both frontends for `put`). **The fourth runtime server dependency** — recorded as a deliberate spend in `providers/blob.provider.ts`, justified by the alternative being a client-token signing scheme plus a multipart uploader with retry plus an upload protocol whose wire format is Vercel's to change
- [x] **2.1.2** `features/files/file.model.ts` — `projectId`, `userId?`, `taskId?`, `url`, `pathname`, `filename`, `contentType`, `size`, `source`, `note?`, `createdAt`. **A unique index on `pathname`**, which is what makes recording idempotent
- [x] **2.1.3** `file.repository.ts`, `file.service.ts`, `file.types.ts`, `file.schema.ts`, `file.storage.ts`, `providers/blob.provider.ts`, `index.ts`
- [x] **2.1.4** `POST /api/app/projects/:id/files/token` — authorises, validates the type, chooses the path, mints a token scoped to one file / one type / one size / one minute
- [x] **2.1.5** **Replaced by a verified confirmation — see §6.5**
- [x] **2.1.6** `GET /api/app/projects/:id/files`, `DELETE …/files/:fileId` — both under `createProjectAccess`, so ownership is resolved before any of them runs
- [x] **2.1.7** The same router mounted under `/api/admin/projects/:id/files` with `source: 'team'`
- [x] **2.1.8** Content type and size are in the **token**, so Vercel Blob applies them; both re-checked against the store at confirmation
- [x] **2.1.9** `file.uploaded` / `file.delivered` activity; `notifier.fileDelivered` on a delivery, `owner.file_received` digest line on an upload
- [x] **2.1.10** Completing an `upload-*` task requires at least one file against it — enforced in the route, skipped entirely when no store is configured, because a rule that cannot be satisfied is a locked door

### 6.2 Client

- [x] **2.2.1** **Not in `packages/ui`.** It needs the API calls and the three-step flow, which is business logic — a primitive that imported a feature would invert the dependency ESLint enforces. `FileUpload` lives in `features/private/projects/`, entirely inside the lazy chunk. Eager cost: **nil**
- [x] **2.2.2** Upload control on every `upload-*` task in `TaskList`, ahead of "Mark done" because that is the order the work happens in
- [x] **2.2.3** `FilesPanel` — both directions in one list, newest first, on the overview and tasks tabs
- [x] **2.2.4** Progress percentage, a plain-English failure, and a reset input so choosing the same file again retries
- [x] **2.2.5** Delete for their own uploads, behind `InlineConfirm`. **Replace was not built** — the flow is remove-then-send, which is two taps and no new endpoint

### 6.3 Console

- [x] **2.3.1** Files listed on the project page, above Tasks — "did the logo arrive?" answered before the bookkeeping
- [x] **2.3.2** A project-wide Files panel, both directions
- [x] **2.3.3** Delete, behind `InlineConfirm` naming the file
- [x] **2.3.4** Upload to the client with a note field, which goes in the email as well as the row

### 6.4 Phase 2 exit criteria

- [ ] Client uploads a logo from a phone; it appears in the console _(blocked: `BLOB_READ_WRITE_TOKEN` — Phase 0)_
- [ ] Owner uploads a document; the client is emailed and can download it _(blocked: the same, plus a verified sending domain)_
- [x] Oversized and wrong-type uploads refused **server-side** — in the token, and again against the store
- [x] `npm run verify`; eager bundle measured and reported: **163.9 kB gz**, unchanged from before the phase

### 6.5 Where the build differed from this section

**There is no Blob completion callback (2.1.5), and that is the one substantive change.** Vercel
Blob will POST to a `callbackUrl` when an upload finishes, and using it would have removed a
step. It was refused because **it cannot fire in local development** — the callback comes from
Vercel's network to a public URL, so exercising it needs a tunnel, which would make the single
most important path in this feature the one nobody can run.

What replaces it: the browser confirms, and the server verifies the claim rather than believing
it. Three checks, all server-side — the pathname must be under `projects/<projectId>/`, the blob
must actually exist in the store, and the size and content type on the record come from the
store rather than from the message. Repeat-safe through a unique index on `pathname` instead of
through a signature. The cost is named in `file.service.ts` rather than hidden: a browser that
uploads and then closes the tab leaves a blob with no row pointing at it. That is a storage
bill, not a correctness problem, and the fix when it matters is a sweep — not a second write
path.

**The upload rules are duplicated three ways, on purpose.** `ALLOWED_FILE_TYPES` and
`MAX_FILE_BYTES` went into `packages/shared` first and were measured out of it: that module is
eager, marketing code imports `FIELD_LIMITS` from its barrel, and a list of MIME types a
signed-in customer may attach was landing in the chunk somebody reading about roofing websites
downloads. They live in each application's own feature now, pinned three ways by
`contract.sync.test.ts` — the same trade `content/capabilities.ts` already records.

**Two guards caught real defects and one caught a comment.** `intl.test.ts` refused `toFixed(1)`
on the file size — "1.5 MB" is "1,5 MB" to half of Europe — and both panels now use a
module-scope `Intl.NumberFormat`. The console's `a11y.test.ts` refused a second live region for
the upload percentage: the console has exactly one, and a region announcing a number ten times a
second buries the sentence that matters. The third was the same guard firing on a _comment_
naming the attribute, which is the guard being blunt rather than wrong — the note was reworded.

**`DELETE` is now in the server's CORS `methods`.** It is the first verb in this application
that removes anything, and the console genuinely deletes across origins. The comment there
saying "there is no DELETE because nothing deletes" was true and is not any more.

---

## 7. Phase 3 — Console operations

**The gap:** the console can move a project along but cannot bring one into existence, cannot
attach an account, and cannot edit the record. Two screens name a fix nothing implements.

### 7.1 Create and link

- [x] **3.1.1** `POST /api/admin/projects` — creates via `ProjectService.createForOwner`, optionally attaching by email. An address with no account behind it is refused **before** the project is created, so a typo leaves nothing to clean up
- [x] **3.1.2** `PATCH /api/admin/projects/:id/owner` — attach with an address, detach with `null`. A domain operation: it claims race-safely through `claimForOwner`, seeds the onboarding tasks, writes the entry that starts the customer's history, and emails them
- [x] **3.1.3** Refuses an attach when the account already owns a project, and when the project already belongs to somebody else. Idempotent for the account that already holds it
- [x] **3.1.4** Console: "New project" form on the projects list, behind `LeaveGuard`
- [x] **3.1.5** Console: `OwnerPanel` on the project page. Attach takes an address; detach is behind `InlineConfirm`

### 7.2 Edit

- [x] **3.2.1** `PATCH /api/admin/projects/:id` — `businessName`, `contactName`, `email`, `phone`, `notes`, `status`
- [x] **3.2.2** Guarded twice, structurally and semantically. `ProjectDetailsUpdate` cannot express a milestone or a payment status at all; and `status: 'deposit-paid'` is refused on a project with no deposit recorded, because that one value is a claim about money
- [x] **3.2.3** Console: `DetailsForm`, collapsed by default, sending **only what differs** from the loaded record, behind `LeaveGuard`

### 7.3 Search

- [x] **3.3.1** `q` on `/admin/projects` and `/admin/accounts`. **Not conversations — see §7.6**
- [x] **3.3.2** `lib/search.ts` — anchored, escaped, length-bounded. An index on `project.email` serves it; an unanchored match could not have used one
- [x] **3.3.3** Console: one `SearchField`, 300 ms debounce, URL-reflected with `replace: true` so a search is linkable and the back button does not walk the letters of a word backwards
- [x] **3.3.4** The `ProjectsPage` note is superseded in place, and only half of it: search is not a scaling feature and is now built; sorting still is one and is not

### 7.4 Onboarding submissions

- [x] **3.4.1** `listUnmatched`, `findForProject`, `attachProject`; `GET /api/admin/onboarding`
- [x] **3.4.2** Matched by address **on arrival**, through a one-id closure rather than `ProjectService` — the feature has no business reading or moving a project. Wrapped, so a failed lookup cannot lose a paying client's materials
- [x] **3.4.3** Console: an `Onboarding` worklist of the unmatched ones, oldest first, with a manual match. A fourth destination in the console bar
- [x] **3.4.4** Console: `OnboardingPanel` on the project page, directly under the project. **This is the brief** and it has never been on screen
- [x] **3.4.5** `owner.onboarding_unmatched` — digest-tier, because it is a filing problem rather than somebody waiting on a reply, and it is already in a list by the time the digest goes out

### 7.5 Phase 3 exit criteria

- [x] A project created from the console, an account attached, tasks seeded — pinned in `project.owner.test.ts`
- [x] Notes and contact details editable, sending only the diff
- [x] Search returns correct results on both lists it was built for
- [x] Every onboarding submission is reachable: matched ones on their project, unmatched ones on the worklist
- [x] `npm run verify` — 1,336 → **1,348** tests; eager bundle unchanged at 163.9 kB gz

### 7.6 Where the build differed from this section

**The inbox has no search box (3.3.1).** The console's inbox is a _merged read model over unanswered
things_ — every row on it is somebody the owner owes a reply, and it empties as they are
answered. Searching it means filtering the list of people you are about to write to, which is
not a question anybody asks; the row you want is on screen because it is short by construction.
The two lists that did get search are archives — every project and every account ever — where
"which one was the roofer in Kent" is a real question with no other answer.

If the inbox ever becomes long enough to need one, the shape is already built: `SearchField`,
`useSearchTerm` and `prefixMatch` compose, and it is a `q` on one more route.

**Attaching is unconfirmed and detaching is confirmed**, which looks backwards and is not.
Attaching announces itself immediately — the client gets an email — so a mistake is visible and
recoverable. Detaching is silent: nothing is sent, and the customer finds their project gone
next time they sign in. A silent destructive act is the shape that wants a question in front of
it.

**The manual match takes a project id, not a picker.** A picker over five hundred projects is a
second search screen, and the operator arriving at the worklist almost always has the project
open in another tab with its id in the URL. If that stops being true, the answer is the search
from the projects list reused — not a bespoke dropdown.

**One test file had to grow a dependency it does not assert on.** The console's project page now
reads the matched submission, so the platform harness had to inject an onboarding service — the
comment there saying it "is not part of any assertion" was true and is not any more. Recorded
because the failure mode was a 503 on a route about project _access_, which is a long way from
where the cause was.

---

## 8. Phase 4 — Closing the payment loop

### 8.1 DECISION 019 option B

- [x] **4.1.1** Add `requireAdmin` **alongside** the bearer token on `/api/billing`. Both required
- [x] **4.1.2** Attribute every money operation to a staff account in the logs and in activity
- [x] **4.1.3** Record DECISION 019 as answered — option B, with the console links of §8.2 as the working surface

### 8.2 Checkout links from the console

- [x] **4.2.1** `POST /api/admin/projects/:id/checkout-link` → `{ product }` → hosted URL. Server-side; **no Stripe key ever reaches a browser** — the rule in `apps/admin/src/lib/endpoints.ts` is not being broken, it is being honoured by keeping the decision on the server
- [x] **4.2.2** Console: buttons to generate and copy a deposit or final link
- [x] **4.2.3** Optionally email it to the client through `Notifier`
- [x] **4.2.4** Surface `requireVerifiedPrice`'s 503 message verbatim — it is written to be read

### 8.3 Self-serve final payment

- [x] **4.3.1** Add `build-final` to `CUSTOMER_PURCHASABLE`, gated on `milestone === 'launching' && depositStatus === 'paid' && finalStatus !== 'paid'`. **The gate is the whole safety property** — the existing comment says a customer paying the second half before the first is "not a flow that means anything", and that stays true; what changes is that the flow now _has_ a first half to check for
- [x] **4.3.2** `available.final` on `CustomerBillingSummary`, built field by field like its neighbours
- [x] **4.3.3** `CURRENT_ACTION_KINDS` gains `pay-final`, ordered with the other money branches
- [x] **4.3.4** Billing page panel, quoting `deposit()` from `config/pricing.ts` — never a typed figure
- [x] **4.3.5** Notify on entering `launching`
- [x] **4.3.6** Extend `lifecycle.api.test.ts` — this is the test that caught the `finish-request` ordering defect

### 8.4 Removing Conversion Fix

- [x] **4.4.1** Delete `conversionFix`, `FixOffer`, `fixPriceLabel()` from `config/pricing.ts` and the sanctioned-figure branch
- [x] **4.4.2** Re-point `recommendedAction()`'s `fix` branch at a **human review** — the same free assessment, framed for a site that is basically sound. Not a dead end, not a product that no longer exists
- [x] **4.4.3** Remove every consumer: `ConversionFixCard`, offer/FAQ/audit copy. **`CoverageComparison` was named here in error and kept** — see §8.6
- [x] **4.4.4** Remove the `conversion-fix` value from `pricing_tier_selected` in `analytics.ts`, with a note — event vocabulary outlives the code that fires it
- [x] **4.4.5** Supersede DECISION 014 with the reason: the product is being withdrawn, not merely left unpriced
- [x] **4.4.6** Re-measure eager CSS — deleting components is the one change in this plan that should _reduce_ it

### 8.5 Phase 4 exit criteria

- [x] Billing endpoints require both a session and the token
- [x] A link generated from the console completes a payment and fulfils
- [x] A customer at `launching` pays the final instalment self-serve; the dashboard action is correct
- [x] No trace of Conversion Fix; the audit's middle band lands somewhere real
- [x] `npm run verify` — 90 files, **1,371 tests**. Eager JS **163.9 → 163.1 kB** gz, CSS **19.3 → 19.1 kB** gz

### 8.6 Where the build differed from this section

**`CoverageComparison` is not a Conversion Fix component, and 4.4.3 was wrong to name it.** It
compares what the _build_ covers against what _Growth Partner_ covers — two products that both
still exist — and `HomePage.test.tsx` says in as many words that it has to survive a refactor,
because a price block that hides what each purchase covers is the confusion the whole block was
built to remove. It appeared in the grep only because `MarketComparison`'s header explains why
the two tables are not one component. Kept, and that comment updated to stop naming a third
product.

**`available.final` uses `>=` rather than `=== 'launching'`.** The plan called for equality.
`PROJECT_STATUSES` defines `launched` as "site live; final payment received **or due**", so a
live site with an outstanding balance is a documented state — and equality would make the pay
button appear when the launch began and vanish on the day the site went up, leaving the owner
chasing an invoice the portal had just stopped offering to settle. The safety property is
unchanged: deposit cleared, balance outstanding, work delivered.

**The gate went on every product, not just the new one.** §8.3 asked for `build-final` to be
gated. The route now refuses any product the summary says is unavailable — so a hand-typed
request cannot buy a second deposit, and cannot start Growth Partner before there is a website,
which the published terms have said in five places and the endpoint did not enforce. The
dashboard's `choose-plan` action was already gated on `milestone === 'live'`; the two surfaces
disagreed until now.

**Self-serve final payment needed a domain operation nobody had planned for.** The plan assumed
adding the product to the enum was most of the work. It was not: `applyCheckoutSession` marks
`finalStatus` from a `projectId` in the Checkout metadata, and a customer paying their own
balance has no project id to send — the session is built from their session and carries a
`userId`, deliberately, because a browser must never name the project a payment settles. Without
`ProjectService.settleFinalPayment` the portal would have taken the money, written "we received
your payment" into the customer's history, and gone on rendering _Launch payment: Not paid yet_
with the button still offering to take it again. Caught by extending `lifecycle.api.test.ts`,
which is the third time that file has earned its place.

**The harness was lying about a seam, and the checkout link is what found it.**
`BillingRepository` and `ProjectRepository` read and write the same MongoDB collection in
production — the note on `ProjectRepository` says so — and the two in-memory doubles had two
private arrays. The console mints a link for a project resolved by `createProjectAccess` (the
project repository) and hands the id to `BillingService` (the billing one), so the first test of
the route answered 404, which is indistinguishable from the authorization guard working.
`createInMemoryBillingRepository` now takes the project repository's array.

**`ProjectService` takes the launch figure as a string.** Importing `amountLabel` from the
billing feature would close a projects → billing → projects module cycle, and the const holding
the formatter would be reachable in its temporal dead zone depending on which module the process
entered first — a failure that appears in production and not in a test that imports the two in
the lucky order. The value arrives from the composition root, the same shape `findProjectIdByEmail`
uses on the onboarding service.

**`paymentDue` gained a `stage` and an optional `payUrl`.** It had no production caller and was
written for the final instalment alone. The console's deposit link needed the same message with
a different sentence and a Stripe URL rather than a billing page — because that client may have
no account to sign in to yet. Two callers, two shapes, one template.

**The billing API tests grew a real account.** DECISION 019 is one line in `billing.routes.ts`
and a whole harness in `billing.api.test.ts`: a file that had never needed an identity now signs
one up over HTTP and promotes it through the repository. Worth the churn — the four new
authorization tests are the ones that prove a leaked token is no longer a whole credential.

**One guard was deleted rather than rewritten.** `content.test.ts`'s "publishes the fix figure
only when the owner has approved it" asserted the derivation rather than the value, so it kept
holding whichever way the flag went. It held all the way to the end: the flag was never
flipped, no figure ever leaked, and the product was withdrawn. Its epitaph is in the file where
it was, because the shape was right and a future unpriced product should bring it back.

---

## 9. Phase 5 — Deliverables in the portal

**The gap:** the free assessment is the primary offer and the system has no concept of the thing
being delivered. The Website Performance Report is Growth Partner's headline deliverable
(DECISION 015) and nothing knows whether one was sent.

### 9.1 The assessment report

Today `AssessmentView` holds the customer's _self-scored_ result. The **owner's review** — the
thing the CTA promises — does not exist as data.

- [ ] **5.1.1** Extend `assessment.model.ts` with a report: `summary`, `findings[]` (title, detail, severity), `recommendations[]`, `preparedBy`, `deliveredAt`
- [ ] **5.1.2** `PATCH /api/admin/assessments/:id/report` — compose and save a draft
- [ ] **5.1.3** `POST …/deliver` — publish, notify, write activity. Draft and delivered are different states; only delivered is visible
- [ ] **5.1.4** Console: an editor, prefilled from their own answers where they exist
- [ ] **5.1.5** Customer: `/app/assessment` renders the delivered report; until then it says plainly that a review is being prepared
- [ ] **5.1.6** Extend `AssessmentView` and pin it
- [ ] **5.1.7** Console: a queue of undelivered requests. **This is the operational surface for the primary offer** and there has never been one

### 9.2 The Website Performance Report

- [ ] **5.2.1** `features/reports` — `projectId`, `month`, `enquiries`, `baseline`, `changeExplanation`, `whatWeChanged[]`, `whatIsNext[]`, `publishedAt`
- [ ] **5.2.2** The launch-day baseline is a build deliverable (`buildOutcomes.measured`). Store it on the project so the first report has something to compare against
- [ ] **5.2.3** Console: compose, save draft, publish
- [ ] **5.2.4** Customer: a Reports section, newest first, permanent
- [ ] **5.2.5** Notify on publish
- [ ] **5.2.6** **Console: an overdue warning.** DECISION 015 calls this a monthly operational commitment; a commitment nothing measures is one that quietly stops
- [ ] **5.2.7** The copy must never promise the number went up — `BillingPage`'s existing wording is the reference and it is careful for a reason

### 9.3 Estimated launch date

- [ ] **5.3.1** `estimatedCompletionAt`, `estimateUpdatedAt`, `estimateUpdatedBy` on the project — exactly the fields `CUSTOMER-PLATFORM.md` §10.2 names
- [ ] **5.3.2** `ProjectService.setEstimate` — a domain operation, activity-recording
- [ ] **5.3.3** Console: set and revise, with the last change shown
- [ ] **5.3.4** Customer: on the project page and the dashboard's "what happens next"
- [ ] **5.3.5** Notify the customer when an estimate **moves**. A date that slips silently is worse than no date, and this is the item most capable of doing harm if built carelessly
- [ ] **5.3.6** Absent is a legitimate state and must read as "not set yet", never as a date

### 9.4 Phase 5 exit criteria

- [ ] A request → a composed report → delivery → the customer reads it in the portal
- [ ] A performance report published and visible; overdue warning fires
- [ ] An estimate set, revised, and the revision notified
- [ ] `npm run verify`

---

## 10. Phase 6 — Messaging and follow-up

### 10.1 Account-level messages

**The gap:** feedback threads exist only inside a project. A customer between projects, or before
one, has no way to reach the owner except the public contact form — which produces a `lead`, in a
list of prospects, for somebody who is already a client.

- [x] **6.1.1** Extend `features/conversations` with an account-scoped thread. **A read model over an extended `feedback`, not a new collection** — the feature's own rule
- [x] **6.1.2** Make `projectId` optional on a comment, or introduce an account-scoped subject. Whichever is chosen, it stays one definition of "a message"
- [x] **6.1.3** `GET`/`POST /api/app/messages`
- [x] **6.1.4** Customer: a Messages screen in `/app`
- [x] **6.1.5** These threads join the console inbox, kind `customer`, with no second definition of "awaiting reply"
- [x] **6.1.6** Notify both directions

### 10.2 Nudges

- [x] **6.2.1** `features/followup` — rules, not a campaign engine. Signed up + no request → day 1, day 4. Requested + no purchase → day 3, day 10
- [x] **6.2.2** Record every send so nobody is nudged twice. Idempotency is the whole correctness property
- [x] **6.2.3** Stop on any progress — a request, an assessment, a payment, a reply
- [x] **6.2.4** `api/cron/followup.ts` + `vercel.json`
- [x] **6.2.5** **Marketing mail, not transactional.** A one-click unsubscribe and a stored suppression, honoured by the digest too
- [x] **6.2.6** Cap the total. Two emails and then a human, or it is spam with a schedule

### 10.3 The worklist

- [x] **6.3.1** `GET /api/admin/worklist` — quiet accounts, undelivered assessments, overdue reports, unattached submissions, projects with no movement in N days
- [x] **6.3.2** Console: a Today screen. The console's front page is the inbox, which answers "who is waiting"; this answers "what is going stale", and they are different questions
- [x] **6.3.3** Reuse the `hasRequested` composition from `/admin/accounts` — do not write a second one

### 10.4 Phase 6 exit criteria

- [x] A client sends a message with no project open; it reaches the inbox and is answerable
- [x] A quiet lead receives exactly one nudge, and none after they act
- [x] Unsubscribe works and is honoured everywhere
- [x] The worklist names real work
- [x] `npm run verify`

---

## 11. Phase 7 — Production Demo Mode

**The gap:** the product cannot be shown to anybody. A prospective partner, a friend, or a
customer being sold to has three options today — watch somebody else's screen, be given a real
account on the production database, or be shown the marketing site and asked to imagine the rest.
The first does not scale, the second is a data-protection decision nobody made, and the third is
what every competitor does.

What this phase builds is a **private entry at `/promo`, a server-checked passcode, and an
isolated demo customer whose account exercises the real application**. Not a second frontend, not
a screenshot tour, not a mocked API.

### 11.0 What the brief asked for, mapped onto what this repository is

The brief that commissioned this phase describes a recurring home-services product — members,
properties, memberships, scheduled visits. **This is not that product**, and building a demo of a
product we do not sell would be worse than having no demo. The mapping, stated once so nothing
downstream has to guess:

| The brief's noun                       | What it is here                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| Member · Property · Membership         | One **account** and one **project** — a single website build                         |
| Services                               | The build's **outcomes**, and the **tasks** we ask the client for during onboarding  |
| Upcoming / scheduled / completed visit | **Milestones**, **tasks**, and **deployments** — the preview and the production site |
| Messages                               | **Feedback threads** on a project, plus §10.1's account-level thread                 |
| Billing records / status               | `depositStatus`, `finalStatus`, `subscriptionStatus` on the project                  |
| Activity history                       | The **activity stream**. Already built, already customer/internal split              |

Everything else in the brief — the access model, the isolation, the reset, the simulation
boundary, the indicator, the feedback capture — transfers unchanged.

### 11.1 The concept: a demo customer is a customer

The single decision this phase turns on, and everything else follows from it.

- [ ] **7.1.1** `StoredUser` gains `demo?: boolean` — **on the account, never on the session**. "Which
      data belongs to the demo" is a property of the identity, and every route already holds
      `request.auth.user`. A flag on the session would have to be re-derived by anything that
      loads a user from storage
- [ ] **7.1.2** The demo account's `role` stays **`customer`**. `capabilitiesFor('customer')` is
      then the whole authorisation answer, and the brief's §16 — no admin access, no owner
      functionality, no administrative APIs — is true **by construction** rather than by a check
      somebody has to remember. `requireAdmin` already answers NOT_FOUND to every customer
- [ ] **7.1.3** `AuthMeView` and the `/api/auth/me` payload carry `demo`, so the browser can render
      the indicator from the same source of truth the server authorises against
- [ ] **7.1.4** A guard in `admin.api.test.ts`'s style: **no route may set `demo`**, exactly as no
      route may set a role. The seeder is its only writer

**Why not a `demo: true` column on every collection, filtered in every repository.** Eleven
repositories, and one forgotten filter is a leak in _either_ direction — a real customer's project
appearing in the demo, or demo rows in the owner's console lists and digest. The ownership checks
that already exist (`authorizeOwnership`, `createProjectAccess`, the 404-never-403 rule) are
tested, swept, and were written for exactly this: a customer sees their own records and nothing
else. A demo customer reuses that whole apparatus and adds nothing to it.

**Why not a separate database.** Mongoose models bind to a connection at module scope. Per-request
`useDb()` means resolving every model per request — a change to every repository in the
application — to buy isolation the ownership boundary already provides.

**What the reverse direction still costs.** Demo rows are real rows, so they _would_ appear in the
owner's own surfaces. That is a small, enumerable list and it is where the work is:

- [ ] **7.1.5** `GET /api/admin/projects` and `/accounts` exclude demo-owned records unless
      `?includeDemo=true`. The console is the owner's picture of the business, and a demo project
      in the middle of it is a wrong answer to "how many builds are running"
- [ ] **7.1.6** The digest and `notifier.owner(…)` skip demo-originated events. Nobody wants an
      email every time a prospect clicks Approve
- [ ] **7.1.7** `features/conversations` excludes demo threads from the inbox. Its whole promise is
      "everybody waiting on a reply", and a demo user is not waiting

### 11.2 Access: `/promo`, a passcode, and an ordinary session

- [ ] **7.2.1** `DEMO_PASSCODE` in `config/env.ts`, alongside `BILLING_ADMIN_TOKEN` and
      `CRON_SECRET` and read the same way. **Unset leaves the routes unmounted**, which is the
      `/api/cron` pattern: an unconfigured deployment has a genuine 404 rather than an open door
- [ ] **7.2.2** `POST /api/demo/enter` — `timingSafeEqual` against the configured passcode, then
      `authService` mints an ordinary session for the demo account. Same cookie, same middleware,
      same `attachUser`. **No second authentication system**
- [ ] **7.2.3** Behind `authRateLimiter`. Its budget was written for exactly this — "every endpoint
      it covers is an attempt to guess a secret"
- [ ] **7.2.4** A **short** session: `DEMO_SESSION_TTL_MS`, hours rather than the standard span. A
      demo session must not become an indefinite credential. `createSession` already takes an
      `expiresAt`; this is a parameter, not a mechanism
- [ ] **7.2.5** Exit is `POST /api/auth/signout`. There is no demo-specific logout, because there
      is no demo-specific session
- [ ] **7.2.6** The passcode never reaches a bundle. `.env.example` documents it; `preflight.ts`
      reports whether it is set and — like every other check there — **never prints it**

### 11.3 Seed and reset

- [ ] **7.3.1** `features/demo` on the server: `demo.seed.ts` (the dataset), `demo.service.ts`
      (enter, reset, simulate), `demo.routes.ts`. Named `demo` on the server and **`promo` on the
      client**, because `apps/client/src/features/public/demo` is already the five marketing
      demonstration sites and two things called demo is how a reader learns to check both
- [ ] **7.3.2** The dataset: one account, one project at `review` with a preview URL, five
      onboarding tasks (three done), a feedback thread with a reply, two delivered files, a
      completed assessment with a score, a deposit paid and a final outstanding, and ten activity
      entries. Rich enough that the first screen explains the product
- [ ] **7.3.3** **Deterministic content, relative dates.** "Approved yesterday" has to still be
      yesterday next month, so the seed takes a clock and every date is an offset. The fixed part
      is the prose, the ids and the ordering
- [ ] **7.3.4** Clearly synthetic throughout — `Cascade Heating & Air`, `dana@example.test`. No
      real business, no real address, no real photograph
- [ ] **7.3.5** `POST /api/demo/reset` — delete every row owned by the demo account across
      projects, tasks, feedback, files, activity, assessments and leads, then re-seed. Scoped by
      `ownerUserId`/`userId`, which is the same scoping the ownership checks use, so a reset
      cannot reach a record it could not have read
- [ ] **7.3.6** Reset is also how the demo account is **created**: entering when no demo account
      exists seeds one. There is no separate provisioning script to forget to run

### 11.4 Demo-safe money, and the invariant it must not break

**This is the sharpest constraint in the phase.** The strongest rule in this codebase is that
payment state is advanced by verified webhooks and by nothing else — a browser reaching a success
page proves a browser reached a success page. A demo that "simulates a payment" by writing
`depositStatus: 'paid'` from a request would put a second door on that, and the second door is the
one that gets used by accident.

The resolution is that the demo does not go near the webhook path at all:

- [ ] **7.4.1** `createCustomerCheckoutSession` **refuses a demo customer**, in the service and not
      in the route. The brief's §9 is explicit that a frontend check is not a control, and so is
      `CLAUDE.md` rule 2
- [ ] **7.4.2** `DemoService.simulatePayment({ product })` applies the same state change the
      fulfilment port applies, on a demo-owned project only. It never calls `requireVerifiedPrice`,
      never mints a Stripe session, and never touches a key. **Stripe is contacted zero times on
      the demo path** — which is the only version where "no live charge is possible" is provable
      rather than configured
- [ ] **7.4.3** The invariant is restated rather than weakened, in `billing.service.ts` and in
      `CUSTOMER-PLATFORM.md`: _payment state moves on a verified webhook, or on an explicitly
      demo-scoped simulation against a demo-owned project._ One extra door, named, and unreachable
      without a demo session
- [ ] **7.4.4** The customer billing panel says **"Simulated — no card is charged"** on the button
      in demo. The reader has to know before pressing, not after
- [ ] **7.4.5** Every other irreversible operation gets the same treatment at the same boundary:
      file deletion, project approval and change requests are all reversible by reset, so they run
      for real. Nothing else is
- [ ] **7.4.6** **No Stripe test mode in production.** Production holds live keys; a test-mode path
      in the same process means a second client and a second set of Price ids, and getting that
      wrong charges somebody. Documented in §11.9 as a deliberate refusal

### 11.5 `/promo` — the entry page

- [ ] **7.5.1** `features/public/promo`, a lazy route like every other marketing page, `noindex`,
      absent from the sitemap, linked from nowhere
- [ ] **7.5.2** It says what it is: a private demonstration; what the visitor will see; that the
      data is invented; that no real customer information is present; that payments are simulated;
      and what to do if something breaks. The passcode is **not** on the page
- [ ] **7.5.3** One `Field` and one `Button`, posting to `/api/demo/enter`. The same
      `CredentialForm` grammar the auth boundary already uses — this is a password prompt and it
      should look like one
- [ ] **7.5.4** One failure message for a wrong passcode, an unmounted route and a rate-limit
      rejection. Three distinguishable answers is an oracle

### 11.6 The demo layer inside the application

- [ ] **7.6.1** `DemoBanner` — persistent, in `AppLayout`, from `@jobforge/ui` primitives only.
      It must be impossible to mistake the account for a real one, and it must not move the layout
      out from under the product it exists to show
- [ ] **7.6.2** **Loaded lazily on `user.demo`.** `AppLayout` is on the eager path and the budget
      has 0.1 kB of JS headroom; a `lazy()` inside the flag check costs a normal customer nothing.
      Measured at the exit criterion, not assumed
- [ ] **7.6.3** `DemoControls` — Exit, Reset, Give feedback. Three controls in the banner, not a
      panel. The brief's own framing: normal product UX plus a small safety layer, never a demo UI
      pretending to be the product
- [ ] **7.6.4** Reset behind `InlineConfirm`, which is what that pattern is for
- [ ] **7.6.5** **No `if (isDemo)` anywhere else.** The flag has four readers: the banner, the
      tour, the billing panel's simulated-payment wording, and the server. Anything else that
      wants to branch on it is a sign the demo is diverging from the product

#### 11.6a The banner names the people it is for — added 2026-08-16

The banner as specified above says _what_ the account is. The owner asked for it to also say
**who it is for**: `For testers — John, Mason and Lukas`.

That is a smaller change than it looks and a better one than the generic version. A named
banner does two things the anonymous one cannot. It tells the reader the session is theirs
rather than a public sandbox, which is the difference between "poke at this" and "this was set
up for you". And it dates itself — a name that stops being current is a banner somebody
notices and changes, where `DEMO MODE` is furniture that survives forever.

- [ ] **7.6.6** `DEMO_TESTERS` — a constant, one place, formatted with an Oxford-free
      `A, B and C` join. **Not** an environment variable: it is not a secret, it is read by a
      browser, and a `VITE_`-prefixed one would be inlined into the bundle anyway. Changing who
      is named is a one-line edit and a deploy, which is the right cost for a fact this soft
- [ ] **7.6.7** The names are **presentational only**. Nothing authorises against them, nothing
      stores them, and the passcode is one shared secret — there is no per-tester identity, and
      inventing one would be a second authentication system to buy attribution nobody asked for

#### 11.6b The guided tour — added 2026-08-16

The second half of the same request: a button in the banner that **walks the tester through the
customer experience** rather than leaving them to find it.

This is the item most capable of being built wrong, so the shape is decided here.

**What it is not.** Not a spotlight overlay, not a coach-mark library, not a modal sequence that
covers the product. Every one of those replaces the thing being demonstrated with a tutorial
about it, and the whole premise of this phase is that the demo _is_ the real application.

**What it is.** An ordered list of the stops on the customer journey, each one a route and a
sentence saying what to look at when you get there. Pressing `Start the tour` navigates to the
first stop and the banner grows one line: the sentence, a `2 of 6` position, and Back / Next.
The product underneath is untouched and fully usable — a tester can ignore the tour, click
something else, and the tour is still on the step they left it on.

- [ ] **7.6.8** `DEMO_TOUR` — an ordered array of `{ path, title, body }`, in the same module as
      the tester names. Six stops: the dashboard, the project overview, the preview to approve,
      the things we need, the assessment review, and billing. **Data, not components** — a stop
      is a route and two strings, and anything more would be a second description of a screen
      that already describes itself
- [ ] **7.6.9** Position lives in `sessionStorage`, not in the URL. A query parameter would make
      every screenshot a tester sends back carry `?tour=3`, and would put tour state into a link
      they might share with somebody who has no session
- [ ] **7.6.10** The tour is **navigation, not interception**. Next is a `navigate()`; nothing
      blocks a click, disables a control, or waits for the tester to do the "right" thing
- [ ] **7.6.11** A stop whose route does not exist for this dataset is skipped rather than
      shown broken. The seed guarantees all six, so this is a guard against the seed changing
      and nobody noticing — which is exactly the kind of drift the reset makes easy
- [ ] **7.6.12** `End the tour` on every step, and the last step ends it rather than looping
- [ ] **7.6.13** It ships in the **same lazy chunk as the banner**. The tour is only ever
      reachable from a control inside the banner, so a second boundary would buy nothing and
      cost a request

#### 11.6c What the tour costs a normal customer

- [ ] **7.6.14** Zero. Same measurement as 7.6.2, and for the same reason: the whole layer is
      behind one `lazy()` inside `user.demo`. Verified against the budget at the exit criterion

### 11.7 Feedback

- [ ] **7.7.1** `DemoFeedback`: text, category, the route it was sent from, the demo session, a
      timestamp. Six categories — bug, confusing, missing, UX, question, general
- [ ] **7.7.2** `POST /api/demo/feedback`, rate-limited on the lead budget, stored through a
      repository like everything else
- [ ] **7.7.3** Surfaced through the **digest**, not an immediate email. It is not somebody waiting
      on a reply, which is the rule §5.3 already set
- [ ] **7.7.4** A console list. Small — this is not a support-ticket system and the brief says so

### 11.8 Observability

- [ ] **7.8.1** Client events on the existing `analytics.ts` vocabulary: `demo_started`,
      `demo_auth_failure`, `demo_action`, `demo_reset`, `demo_feedback_submitted`, `demo_exit`
- [ ] **7.8.2** Server logs on the existing `logger`: `demo.entered`, `demo.rejected`,
      `demo.reset`, `demo.payment_simulated`. No new dependency
- [ ] **7.8.3** `demo_page_view` is **not** built. The analytics provider already records page
      views; a second one scoped to demo would be a second definition of the same event

### 11.9 Security, and the tests that hold it

Every one of these is a test, and every one of them is about what an attacker or an accident gets:

- [ ] **7.9.1** A wrong passcode answers the same thing an unconfigured deployment does
- [ ] **7.9.2** Repeated attempts are throttled
- [ ] **7.9.3** The passcode appears in no bundle — a source sweep, like `check-csp.ts`
- [ ] **7.9.4** The demo session expires, and expiry ends access
- [ ] **7.9.5** The demo user is answered NOT_FOUND by every `/api/admin` route
- [ ] **7.9.6** The demo user cannot read a real customer's project, task, file or thread
- [ ] **7.9.7** A real customer cannot read the demo account's records either — the boundary is
      symmetric or it is not a boundary
- [ ] **7.9.8** Reset deletes demo rows and **no others** — asserted with a real customer's records
      present in the same store
- [ ] **7.9.9** The seed is deterministic given a fixed clock
- [ ] **7.9.10** `createCustomerCheckoutSession` refuses a demo customer, and the fake Stripe client
      records **zero** calls on every demo path
- [ ] **7.9.11** No route can set `demo`, swept from source
- [ ] **7.9.12** Demo records are absent from the console lists, the inbox and the digest
- [ ] **7.9.13** The full existing suite passes unchanged — normal customer and console behaviour
      is what regression means here
- [ ] **7.9.14** The banner, the tester names and the tour are absent for a normal customer —
      asserted from a rendered layout, not from a bundle grep, because the failure worth
      catching is a flag read the wrong way round rather than a chunk that shipped

### 11.10 Phase 7 exit criteria

- [ ] The twenty steps of the brief's definition of done run end to end against a deployment
- [ ] A normal customer's bundle, screens and behaviour are byte-for-byte unchanged where the
      demo is off — measured, including the eager budget
- [ ] `npm run verify`

### 11.11 Known limitation, recorded before it is discovered

**One demo account, shared.** Two people demonstrating at the same time share one dataset, and one
of them pressing Reset is visible to the other. A per-session account was refused because creating
accounts from a public endpoint is an abuse vector and the isolation it buys is isolation from
_other demo users_, which is the least important kind here. A small leased pool is the upgrade if
this ever actually bites; it is not MVP.

---

## 12. Phase 8 — Documentation and close

- [ ] **8.1** `docs/owner-decisions-required.md`: answer 013, 019, 020; supersede 014, 028.1; add **DECISION 032 — the portal delivers, it does not only display** and **DECISION 033 — Demo Mode is a customer, not a mode**
- [ ] **8.2** `docs/CUSTOMER-PLATFORM.md`: §10.2's gap table is now mostly built — rewrite it as what exists; restate the payment invariant with its one demo-scoped exception
- [ ] **8.3** `CLAUDE.md`: notifications, files, reports, demo mode; the Blob dependency; the new "things that will bite you" entries (the `@resend.dev` trap above all, and the two features called demo)
- [ ] **8.4** `.env.example`: every new variable with the same prose density as the existing ones, `DEMO_PASSCODE` included — how to set it, how to rotate it, and that unsetting it removes the route
- [ ] **8.5** `docs/design-system.md` if any primitive was added
- [ ] **8.6** `docs/DEMO-MODE.md` — purpose, the route, the access model, the session, the dataset, reset, what is simulated and why, the security boundaries, and how the owner turns it off
- [ ] **8.7** This plan gains a closing-state section with measured numbers and an execution-notes section for every place the measurement contradicted the plan — the house style, and the most useful part of all three predecessors
- [ ] **8.8** Full `npm run verify` + `npm run preflight`

---

## 13. Sequencing

```
Phase 0  Production unblock      ← nothing below is verifiable without it
   ↓
Phase 1  Notification spine      ← phases 2–6 all notify; the port must exist first
   ↓
Phase 2  Files                   ← phase 5's deliverables can ship as files before they are screens
   ↓
Phase 3  Console operations      ← independent; could run parallel to 2
   ↓
Phase 4  Payment loop            ← needs phase 0's Stripe config and phase 1's notifier
   ↓
Phase 5  Portal deliverables     ← needs 1 (notify), 2 (attachments), 3 (console patterns)
   ↓
Phase 6  Messaging + follow-up   ← needs 1; the least load-bearing, so it is last
   ↓
Phase 7  Demo Mode               ← needs 4, 5 and 6: the seed is a picture of the finished product
   ↓
Phase 8  Documentation
```

**The dependency that decides the order is the notifier.** Every phase after 1 needs to tell
somebody something, and building them first would mean either five direct email calls to unpick
or five features shipped mute.

**The dependency that decides where Demo Mode goes is the seed.** It is a rendering of every
customer-facing feature at once, so every feature added after it is a feature the dataset does not
show and a seed that has to be rewritten. Built last, it is written once. Built after Phase 4, it
would be rewritten twice — and it would demonstrate a product with no reports in it, which is the
headline deliverable of the thing being sold.

**What Demo Mode changes about the phases before it.** Phase 0's Stripe configuration stops
blocking _demonstration_ — a demo takes no money and needs no key. It still blocks taking money.
That is the only consolidation; nothing else in this plan becomes unnecessary, and nothing already
built has to be undone. §11.1's decision is what buys that: a demo customer is a customer, so
every feature already built works in the demo the day it is built.

---

## 14. What this plan deliberately does not build

| Not building                          | Why                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbound email threading               | Needs an inbound provider — conflicts with Vercel-native. DECISION 027 already deferred it with this reasoning                              |
| Realtime (SSE/WebSocket)              | DECISION 027: the transport choice should follow a working request/response path. Polling on navigation is enough at this volume            |
| Per-notification read state           | §3.2. Buys per-item dismissal nobody asked for, costs a collection and a retention question                                                 |
| A second admin role                   | `requireCapability` is already in place for the day it exists. Building the role now is surface with no consumer — rule 6                   |
| Client-side annotation on previews    | Research's top agency-portal feature, and a large build. The feedback thread carries the same information in words. Revisit with real usage |
| Multi-project customers               | The domain supports it; no UI assumes more than one. Not blocking a public launch                                                           |
| A message catalogue / i18n            | `deferred_work_plan.md` §3.1c settled this and nothing has changed                                                                          |
| Automated performance data collection | The monthly report's numbers are entered by hand. Automating them means integrating each client's analytics — a product, not a phase        |

---

## 15. Risks

| Risk                                     | Mitigation                                                                                                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Notification fatigue at launch           | Coalesce seeding (1.2.8), suppress self-notification (1.2.7), digest the low-value (5.3)                                                                                     |
| Blob storage cost from photo uploads     | Server-side size caps (2.1.8); the record carries `size` so it is measurable                                                                                                 |
| Eager bundle breach                      | Every screen is inside an already-lazy boundary; measured at each exit criterion, not assumed                                                                                |
| A slipped estimate damaging trust        | Notify on movement (5.3.5); absent is a valid state (5.3.6)                                                                                                                  |
| Nudges reading as spam                   | Two-email cap, stop on any progress, real unsubscribe (6.2.3, 6.2.5, 6.2.6)                                                                                                  |
| Analytics contradicting the privacy page | 0.5.2 is marked blocking for exactly this reason                                                                                                                             |
| A demo leaking real customer data        | The demo is a customer; the ownership boundary that already stops customer A reading customer B is the whole mechanism (7.1.1–7.1.2). 7.9.6/7.9.7 test it in both directions |
| A demo triggering a live charge          | Stripe is contacted zero times on the demo path, enforced in the service (7.4.1–7.4.2) and asserted against a fake client that records calls (7.9.10)                        |
| The demo diverging into a second product | The flag has three readers and a test that says so (7.6.5). Anything wanting a fourth is the signal, not the cost                                                            |
| Scope drift across eight phases          | Exit criteria per phase; `npm run verify` at every boundary; nothing starts before the previous phase's criteria are met                                                     |

---

## 16. Ledger

Updated as work completes.

| Phase                     | Items   | Status                                          |
| ------------------------- | ------- | ----------------------------------------------- |
| 0 — Production unblock    | 27      | **Code done.** Configuration outstanding        |
| 1 — Notification spine    | 23      | **Done.** See §5.4a for two items not built     |
| 2 — Files                 | 19      | **Code done.** Needs the Blob token to exercise |
| 3 — Console operations    | 17      | **Done.** See §7.6 for one item not built       |
| 4 — Payment loop          | 18      | **Done.** See §8.6 for six places it differed   |
| 5 — Portal deliverables   | 20      | Not started                                     |
| 6 — Messaging + follow-up | 15      | Not started                                     |
| 7 — Demo Mode             | 47      | Not started                                     |
| 8 — Documentation         | 8       | Not started                                     |
| **Total**                 | **194** |                                                 |

### 16.1 Done so far (2026-08-16)

| Item        | What landed                                                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **0.0**     | `apps/server/scripts/preflight.ts` + `npm run preflight`. Eleven readiness checks, exit 1 on any failure, never prints a secret                                                                                                                                                                  |
| **1.1.1**   | `notification.types.ts` — 15 kinds, and `IMMEDIATE_KINDS` as the one readable table of what interrupts the owner's day                                                                                                                                                                           |
| **1.1.2**   | `notification.service.ts` — the `Notifier` port. Never throws, defaults to no-op, one `deliver` helper that owns the swallow so no method can forget                                                                                                                                             |
| **1.1.3**   | `notification.email.ts` — nine builders on `emailTheme`, HTML and text, everything escaped                                                                                                                                                                                                       |
| **1.1.4**   | `noopNotifier`, matching `noopActivityRecorder` and `noopBillingFulfillment`                                                                                                                                                                                                                     |
| **1.2.8**   | Task coalescing built into the port: `tasksAssigned` takes the set, and an empty set sends nothing — which is the normal result of a retried webhook                                                                                                                                             |
| **1.1.5**   | Wired into `projects`, `feedback`, `deployments` and `billing.fulfillment` from one place in `app.ts`, beside the activity recorder                                                                                                                                                              |
| **1.2.1–6** | Six customer emails firing from real state changes — preview ready, approval requested, tasks assigned, feedback replied, launched, payment failed                                                                                                                                               |
| **1.2.7**   | Self-notification suppression, structural rather than conditional: the stored author role decides the direction, so neither branch can reach the person who pressed the button                                                                                                                   |
| **1.3.1–5** | The immediate/digest split, the `pending_digest_entries` queue with a seven-day TTL, and `POST /api/cron/digest` behind Vercel Cron's bearer secret                                                                                                                                              |
| **Tests**   | `notification.test.ts` — 16 assertions pinning never-throws, coalescing, the split, escaping, and that every declared kind is classified. **1,292 → 1,308**                                                                                                                                      |
| **1.4.1–7** | `activityReadAt` on the account, `/api/app/activity/unread` and `/read`, a count on the Dashboard nav item, "N things have happened since you were last here" and a per-entry marker on the dashboard. `DashboardData.unread` pinned **both ways** in `contract.sync.test.ts`. **1,308 → 1,320** |
| **2.1–2.3** | `features/files` — a `BlobStore` port, a Vercel adapter, three-step upload with a server-verified confirmation, one router mounted in both directions, and the rule that an `upload-*` task is not done without a file. **1,320 → 1,336**                                                        |
| **3.1–3.4** | Create a project, attach or detach an account, edit six fields, search two lists, and the client brief on screen for the first time. Four new console surfaces and a fourth destination in its bar. **1,336 → 1,348**                                                                            |
| **4.1**     | DECISION 019 answered: `/api/billing` requires a staff session **and** the token, `requireAdmin` first so the configuration 503 is behind it, and a `billing.admin_operation` line on every state change. Four new authorization tests                                                           |
| **4.2**     | `POST /api/admin/projects/:id/checkout-link` — a link an operator can copy or have emailed, the price verified against the published figure first, the refusal rendered verbatim, and an internal activity entry naming who asked                                                                |
| **4.3**     | The portal takes the launch instalment: `available.final`, a `pay-final` dashboard action above `choose-plan`, a billing panel, an email when the build reaches `launching`, and `settleFinalPayment` for a payment that names an account rather than a project                                  |
| **4.4**     | Conversion Fix withdrawn — three exports, one card, one stylesheet block, one analytics value and every mention of it. The audit's middle band and the homepage's middle path both point at the free assessment. Eager JS **163.9 → 163.1 kB** gz, CSS **19.3 → 19.1 kB** gz. **1,348 → 1,371**  |

### 16.1a What was deliberately cut while building it

| Cut                                  | Why                                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payment.received`                   | Declared, then removed before anything called it. Stripe already sends the receipt — it has the amount, the card and the legal footer — and on the one payment that changes anything, `tasksAssigned` fires in the same webhook saying what happens next. Rule 6, applied to a surface that lived four hours |
| A preview email per rebuild          | A build during revisions can deploy several times in an afternoon. Only the deployment that actually moves the milestone sends; the activity entry still records every one                                                                                                                                   |
| A customer email on approval         | They pressed the button. The owner gets it instead                                                                                                                                                                                                                                                           |
| An email on a manual preview-URL set | Only the milestone move carries "this is worth looking at now" — a URL corrected twice is not news twice                                                                                                                                                                                                     |

### 16.2 Execution notes

#### The preflight script found exactly what it was written to find

Run against the working environment it reported **3 failures and 4 warnings**, and every one
matched §2.1 without adjustment: the `@resend.dev` sender, the absent Stripe key, the absent Blob
token, the Gmail notification address, no `CLIENT_ORIGIN`, no Google client, no Vercel webhook.
The database and the admin account passed.

That is worth recording as more than a green tick. §2.1 was assembled by reading `.env` by hand
against the code paths that consume it — a slow, careful process that does not repeat itself.
The script does it in four seconds, against any environment, including production, which nobody
has ever inspected this way.

#### 🔴 The eager budget has almost no headroom left, and Phase 2 needs some

Measured on the build at the end of Phase 1c:

| Measure   | Now                  | Ceiling       | Headroom               |
| --------- | -------------------- | ------------- | ---------------------- |
| Eager JS  | 540.1 kB / **163.8** | 545.0 / 164.0 | 4.9 kB / **0.2 kB gz** |
| Eager CSS | 119.0 kB / **19.3**  | 120.0 / 20.0  | 1.0 kB / **0.7 kB gz** |

**None of this is Phase 1.** Every line written so far is server-side and cannot reach a browser;
§2.2's baseline of 534.9 / 162.4 was read from `deferred_work_plan.md` §2, which was measured
before that plan's own uncommitted work. This is where the tree actually sits.

**0.2 kB of gzipped JS is not enough to build Phase 2 into.** The file-upload UI needs a control
in the customer workspace, and `@vercel/blob`'s client half is not free. Three options, in the
order they should be tried:

1. **Keep it out of the eager bundle entirely.** `features/private` is already lazy; the upload
   control must not be re-exported through anything the marketing site imports, and must never be
   reached through `@jobforge/ui`, whose exports are eager by definition (§6.2.1 already says the
   primitive lives with its consumer if it costs eager CSS — this makes that the default rather
   than the fallback).
2. **Import the Blob client dynamically**, inside the upload handler, so it lands in a chunk that
   only downloads when somebody actually attaches a file.
3. **Argue for a raise**, in prose, with what it bought — as DECISION 029 did. What is not
   available is spending it quietly.

Recorded here rather than left to be discovered by a failing build, because the guard fires
_after_ the work is written and the cheapest time to know is now.

##### What happened: option 1 worked, and Phase 2 cost the eager bundle nothing

| Measure   | Before Phase 1d      | After Phase 2        | Ceiling       |
| --------- | -------------------- | -------------------- | ------------- |
| Eager JS  | 540.1 kB / **163.8** | 540.3 kB / **163.9** | 545.0 / 164.0 |
| Eager CSS | 119.0 kB / **19.3**  | 119.0 kB / **19.3**  | 120.0 / 20.0  |

Neither option 2 nor option 3 was needed. `@vercel/blob/client` is imported only by
`features/private/services/uploadFile.ts` and the console's `FilesPanel`, both of which are
behind `lazy()` boundaries, so no marketing visitor downloads a byte of it. What did leak into
the eager graph was smaller and less obvious: **the upload rules in `packages/shared`.** Every
marketing component imports that barrel for `FIELD_LIMITS`, so seven MIME types and a size
constant were riding into the homepage chunk. Moving them into each application's own feature
gave 0.1 kB back — the same lesson `content/capabilities.ts` already taught, learned again in a
different package.

Phase 1d cost nothing for the same reason, after one correction: `useUnread` was re-exported
from `session/index.ts`, which _is_ eager, and that alone was 0.1 kB. It is imported by path
now, exactly as `ReauthDialog` beside it already was.

**The headroom is still 0.1 kB of gzipped JS**, and that is now the standing constraint rather
than a Phase 2 problem. Phases 3–7 add screens to the console and the portal — both lazy — so
none of them should touch it. The first one that does needs option 3, in prose, with what it
bought.

#### The task notification could not live where the tasks do

§5.2 assumed `TaskService` would notify. It cannot, and the reason is a dependency edge rather
than a preference: a task carries a `projectId` and a `userId`, neither of which is an address or
a business name, so sending the email needs the project — and `ProjectService` already depends on
`TaskService`, which makes the reverse import a cycle.

The operation moved to `ProjectService.addTask`, which delegates to the task service for the
record and then notifies. `TaskService` stays what it was: storage and status for a to-do list.
The admin route calls the domain operation instead of the primitive, and the seeding path already
lived in `activateForCustomer`, which is where the coalescing had to be anyway.

Worth recording because the plan named the wrong file with confidence, and the code said so
immediately.

#### Two tests failed on their first run and both were findings, not bad assertions

The escaping test asserted that a business name appears escaped in the HTML. It does not — that
builder puts the business name in the **subject**, which is a header field and must not be
escaped, or the reader gets a literal `&lt;` in their inbox. The test now states both rules
rather than one, because the two halves genuinely differ and the next person will assume they
do not.

The estimate test asserted the text half says "moved back". It did not. `message()` built the
plain-text alternative from the builder's lines only, and the **direction of the change existed
solely in the heading** — so a reader on a text-only client got two dates and no indication which
way the news went, on the one message in the set where that is the whole content. `message()` now
prepends the heading to both halves, which fixes it for every builder rather than for the one
that exposed it.

#### A guard caught the new code on its first run, on a rule that did not exist for this case

`formatDate` in the notifier was written as `Intl.DateTimeFormat('en-US', { timeZone:
'America/Los_Angeles' })` — both halves defensible in isolation, and `packages/ui/src/intl.test.ts`
failed the build on the locale tag immediately.

The guard was right and the fix was not the obvious one. Its rule is "pass `undefined` so the
browser answers with its own", and `apps/admin/src/utils/formatDate.ts` additionally rejects
pinning the business's timezone. **Both arguments assume a reader whose environment can be
asked, and email has none** — the string is baked on a server into a message opened days later
on a device the process will never see.

So the requirement here is a third thing neither file needed: not the reader's format, which is
unavailable, but a format **no reader can get wrong**. `month: 'long'` is what does that work;
`08/09/2026` is two different days and `9 August 2026` is one everywhere. The locale argument is
`undefined` so the guard's rule holds unchanged, and the reasoning is written above the function
because the next person will otherwise re-pin the locale for the same good reason.

---

## 17. Closing state — 2026-08-16

Measured, not estimated. `npm run verify` green end to end.

| Metric         | Start of Phase 5 | Now                                     |
| -------------- | ---------------- | --------------------------------------- |
| Test files     | 90               | **92**                                  |
| Tests          | 1,371            | **1,411**                               |
| Eager JS (gz)  | 163.1 kB         | **163.5 kB** — 0.5 kB under the ceiling |
| Eager CSS (gz) | 19.1 kB          | **19.1 kB** — unchanged                 |

**Phases 5, 7 and 8 are done. Phase 6 is not**, and §17.3 says exactly what is left in it.

### 17.1 What shipped

**Phase 5 — the portal delivers.** The assessment review (model, console queue, editor,
delivery, customer view), the Website Performance Report as a new `features/reports`, and the
estimated launch date with its notify-on-movement rule. DECISION 032.

**Phase 7 — Demo Mode.** `/promo`, a server-checked passcode, an isolated demo customer, a seed,
a reset, demo-safe money, the tester banner, the guided tour, and nineteen security tests.
DECISION 033 and `docs/DEMO-MODE.md`.

**One production defect, found mid-phase and fixed.** See §17.2.

### 17.2 Where the build differed from the plan

**The harness could not see a single customer notification, and had never been able to.**
`createPlatformHarness` wired no `Notifier` at all. Every service takes the port optionally and
defaults to a no-op, so the rig was one where **nobody is ever told anything** — and every test
asserting domain state passed exactly as before. "We emailed them" was the largest untested
claim in the application. Wiring it broke exactly one test, which is the next item.

**A test was asserting the harness gap rather than the behaviour.** `conversation.api.test.ts`
held "does not email a customer whose reply is already in their portal", and it had been green
since it was written — not because the code agreed. `ConversationService.reply` loads the
project _specifically_ so the customer is emailed, and says so in a comment written when it was
added. Production has sent that email ever since. The test now asserts the opposite, with the
history recorded above it.

**`available.final` could not be reached from the checkout route in the demo.** Phase 4 widened
the route's availability gate to every product, and the seeded demonstration has its deposit
paid and its build at `review` — so every purchasable product is already unavailable to it and
the request is refused before the service is called. Two correct guards, in the right order; the
demo refusal is therefore tested at the service level and through the portal route, which has no
such gate.

**The CSRF guard was incomplete, and it took production to show it.** The allowlist is built
from `PUBLIC_SITE_URL` and `CLIENT_ORIGIN`. A deployment served from a URL those do not name
answers **403 to every state-changing request from a signed-in browser** while every read works
— sign-in works, then nothing does. A request whose `Origin` equals its own `Host` is
same-origin by definition and cannot be forged cross-site, so the guard now accepts it and needs
no configuration to be correct. The rejection log names both origins, which is the half that
would have made this ten minutes rather than an evening.

**Two divergences from §9 worth recording.** The launch-day baseline is stored on the _report_
rather than on the project — the first report establishes it, which is one fewer field to forget
to set and equally truthful. And `Reports` became a sixth item in a navigation whose own comment
says it is short on purpose; it earned that by being a purchase rather than a feature, and the
count is pinned by a test that now carries the argument.

**One `Suspense fallback={null}` was allowed, by name.** `a11y.test.ts` forbids them because a
null fallback is a blank _content area_. The demo banner is not content — it is furniture around
a page that renders fully without it, and a "Loading" bar there would draw the eye to the frame
at the one moment somebody is meant to be looking at what is inside it. The exception list is
checked in both directions.

### 17.3 Phase 6 — done, 2026-08-17

All fifteen items in §10. `npm run verify` green: 95 files, 1,440 tests, eager JS 163.6 kB
gzipped against a 164.0 kB budget, CSS 19.1 against 20.0.

**Every part of it was built by owning no new definitions**, which was not the plan's
instruction so much as its constraint, and it held three times:

- **6.1 Account messages** widened a comment's scope rather than adding a collection. Account
  threads reached the console inbox **without a line changing in it** — `listAwaitingTeamReply`
  names `parentId`, `resolvedAt` and `authorRole` and has never named a scope. The one
  invariant added is "exactly one of `projectId` and `accountUserId`", and it is safe because
  `scopeOf` and `scopeFields` are the only reader and the only writer.
- **6.2 Follow-up** put its rules in a table in one file and its correctness in a unique index.
  The claim is written **before** the send, because a check-then-write is correct until two runs
  overlap — which happens on the busiest morning rather than the quietest.
- **6.3 The worklist** calls five methods that already existed for five other screens and owns
  exactly one constant, `STALE_AFTER_DAYS`.

**Where the build contradicted the plan.**

§10.2 said follow-up should measure the second track from the assessment request. It anchors
on the **signup date** instead, both tracks, because two clocks means two answers to "how long
had this person been waiting" on the day a rule misfires. The tracks stay honest because the
rule is chosen from the account's _current_ state at evaluation time: somebody who requests on
day two is in the second track by day three.

§10.2 also implied one `api/cron/followup.ts` file. There is no such file — the route is a
router in the feature, mounted at the existing `/cron` behind a guard that moved to
`middleware/cronSecret.ts`. `notification.routes.ts` had predicted exactly this ("a file that
somebody will copy the next time a shared secret is needed") and the prediction came true
within the same phase.

§10.1's `6.1.2` offered "make `projectId` optional, **or** introduce an account-scoped
subject". Both, in effect: `projectId` became optional and a second column carries the other
scope. The alternative — one qualified `project:`/`account:` string, matching the
`ConversationId` idiom — was refused because it needs a migration of live rows to buy a
tidier shape, and the two-column version is invisible above `scopeOf`.

**One thing 6.2.5 asked for turned out to be about the owner.** "Honoured by the digest too"
reads as though the digest goes to customers; it goes to the owner. It was wired anyway, and
straight to the repository rather than through the service, so an address that unsubscribed
while follow-up was on stays suppressed on a deployment where it is off.
