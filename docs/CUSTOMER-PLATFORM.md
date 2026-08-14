# The customer platform

The lifecycle from anonymous visitor to recurring client, and where each part of it
lives in the repository.

---

## 1. The lifecycle

```
PUBLIC SITE  →  ASSESSMENT  →  ACCOUNT  →  PAYMENT  →  PROJECT  →  ONBOARDING
                                                                        ↓
                                    LIVE  ←  PRODUCTION  ←  APPROVAL  ←  PREVIEW
                                      ↓                          ↑         ↓
                              RECURRING SERVICE            REVISION  ←  FEEDBACK
```

Every arrow is a state change on the server. None of them depends on a browser staying
open, and none is triggered by a redirect landing on a success page.

---

## 2. Where things are

```
server/src/
  features/
    auth/            sessions, passwords, Google, capabilities, the ownership helper
      providers/     google.verifier.ts — the only file that trusts a Google token
    assessments/     the scored assessment, owned by an account
    projects/        the project domain: milestones, approval, URLs, access guard
    tasks/           what the build is waiting on the customer for
    feedback/        one project's change list, and its conversation
    deployments/     where the site is, as data
      providers/     vercel.provider.ts — the only file that knows Vercel's payload
    billing/         Stripe: checkout, webhooks, and payment → project activation
    activity/        the event spine every other feature writes to
    dashboard/       the composed private landing page, and the current-action rule
    admin/           the staff surface — its own boundary, not a flag
    leads/           ─┐
    subscribers/      ├─ the public marketing endpoints, unchanged
    onboarding/      ─┘
  infrastructure/    database, email
  middleware/        request context, rate limits, CSRF, errors
  app/               composition root and the route table

client/src/
  app/
    router/          RequireAuth — the one route guard
    App.tsx          the whole route table, public and private
  components/
    layout/          SiteLayout (public) · AppLayout (private) · WorkspaceBar (the bridge)
    ui/              the design-system primitives, shared by both surfaces
  features/
    auth/            context, credential pages, the Google button
    assessment/      the draft, and the audit → assessment mapping
    public/          the marketing site — one folder per page
    private/         the customer workspace — one folder per capability
```

### The three surfaces

| Surface | Route                      | Layout       | Guard                                       |
| ------- | -------------------------- | ------------ | ------------------------------------------- |
| Public  | `/`, `/audit`, `/login`, … | `SiteLayout` | none                                        |
| Private | `/app/**`                  | `AppLayout`  | `RequireAuth` + `requireAuth` on `/api/app` |
| Admin   | `/api/admin/**`            | —            | `requireAdmin`                              |

The admin surface is server-side only today. It is a separate router behind its own
middleware rather than the customer API with a role check, because the two are opposite
things: the customer routes _cannot_ return anybody else's data, and the admin routes
exist precisely to cross that line.

---

## 3. The public/private boundary

Two surfaces, one design system, and a deliberate crossing in each direction.

**Leaving** the workspace is an explicit control in `AppLayout` — "View the public
site" — sitting beside Sign out but styled more quietly, because looking at the
marketing site is not the same act as ending a session.

**Returning** is `WorkspaceBar`: a slim charcoal strip above the marketing header, shown
only to somebody signed in, saying who they are and offering one tap back to the
dashboard. Anonymous visitors see nothing.

**Nothing crosses by accident.** No link inside `features/private` may point at a public
route. `app/boundary.test.tsx` enforces that by reading the source, with a short
allow-list — the public site, the reset flow, and the two legal notices — each carrying
its reason. The same test checks the server's `currentAction`, because the dashboard's
one call to action is chosen there.

That rule exists because it was broken: "start the assessment" pointed at `/audit`, and
pressing it on the dashboard replaced the workspace with a page selling a website the
customer had already bought. The fix was a private copy of the assessment at
`/app/assessment/start`, sharing the questions and the scoring with the public page —
`AuditScorecard` and `useAudit` — and differing only in what surrounds them.

---

## 4. Authentication

|           |                                                                             |
| --------- | --------------------------------------------------------------------------- |
| Session   | Opaque 256-bit token, stored as a SHA-256 digest, delivered HttpOnly        |
| Cookie    | `jobforge_session`; `SameSite=Lax`, `Secure` in production, `Path=/`        |
| Lifetime  | 30 days of inactivity, rolling; written back at most hourly                 |
| Passwords | scrypt (N=2^16, r=8, p=1) from `node:crypto`, parameters stored in the hash |
| Providers | Email + password, Google — both produce the same session                    |

Not a JWT, and the reason is revocation: a signed token stays valid however wrong things
have gone, whereas a row can be deleted the moment a password changes.

### Authorization

```
role  →  capabilities  →  route (middleware)  →  resource (service)
```

Capabilities are derived from the role on every request rather than stored, so revoking
one takes effect immediately. Two roles: `customer` and `admin`.

**Three layers, and all three are required.** `attachUser` resolves the cookie;
`requireCapability` asks whether this _kind_ of person may do this _kind_ of thing; and
ownership — which middleware cannot see, because it does not know which record was
asked for — is checked in the service by `authorizeOwnership`.

Ownership failures answer **404, never 403**. An API that distinguishes "not yours" from
"does not exist" has told an attacker which ids are real.

### CSRF

Scoped to requests that carry a session cookie, which is the only place ambient
authority exists to be abused. Those must carry a recognised `Origin`. Public endpoints
— the contact form, the two provider webhooks — are untouched, because demanding an
`Origin` from curl and from Stripe would break real callers to defend against an attack
that cannot apply to them.

Behind that: `SameSite=Lax` on the cookie, and a JSON content type an HTML form cannot
produce.

---

## 5. The assessment hand-off

The funnel's whole shape: **give the value, then ask for the account.**

1. Anonymous visitor answers the twenty questions at `/audit`. Answers live in
   `localStorage` under the audit's own key.
2. "Keep these results" writes an assessment draft to `sessionStorage` and sends them to
   sign up.
3. Signing in _or_ signing up _or_ continuing with Google submits the draft against the
   new session, and clears it.
4. The score appears on the dashboard.

Nothing anonymous is ever written to the database — so there is no orphan record, no
expiry sweep, and no question about who may later claim one. A draft that fails to
submit is **kept**, and `/app/assessment` offers to send it again.

`sessionStorage` rather than `localStorage`, because a draft is meaningful for one
sitting; anything read back is re-validated and discarded whole if any part is wrong.

Scoring happens on the server. A score the browser computed is a score anybody can set
to 12 before asking for a discount.

---

## 6. Payment → project

The critical sequence, and the one place commerce meets fulfilment:

```
verified Stripe webhook
  → billing state updated
  → account linked to its Stripe customer
  → project created
  → onboarding tasks seeded
  → activity written
  → dashboard reflects all of it
```

`success_url` does nothing but navigate. The billing page it lands on says the payment is
being confirmed and reads its state from the server.

**Idempotent at three levels**, because Stripe delivers at least once:

- Event ids are claimed, processed, then marked — and _released_ on failure, so a
  transient error hands the event back to Stripe's retry rather than eating it.
- Activation is per-account: a second delivery adopts the existing project.
- Task seeding is a partial unique index on `(projectId, kind)`.

Fulfilment sits behind a port (`BillingFulfillment`) so the billing service stays
testable without accounts, projects or tasks — and it never throws, because the payment
is already durable and losing a retry over a project-creation blip would be worse than
creating one by hand.

---

## 7. Deployments

```
GitHub → Vercel → deployment webhook → project updated → dashboard updated
```

The rule: **no preview URL is ever written in frontend code.** A project has a
`previewUrl` and a `productionUrl` because a deployment event set them.

A build sets `jobforgeProjectId` in its Vercel deployment metadata; that is how a
deployment finds its customer. An unattributed one is ignored rather than guessed at.

`DeploymentProvider` is four fields wide — id, environment, state, URL. Moving to another
host means writing one new implementation of it.

A URL is only handed to a customer once the deployment is `ready`. A production
deployment is what marks a project live.

---

## 8. Environment

Everything below is optional. Without any of it the marketing site runs exactly as
before, accounts work with email and password, and each unconfigured feature says so
rather than failing.

| Variable                         | What it turns on                                           |
| -------------------------------- | ---------------------------------------------------------- |
| `GOOGLE_CLIENT_ID`               | Google sign-in. See [GOOGLE-SIGN-IN.md](GOOGLE-SIGN-IN.md) |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | Credential-endpoint throttle window (default 15)           |
| `AUTH_RATE_LIMIT_MAX`            | Attempts per window (default 20)                           |
| `VERCEL_WEBHOOK_SECRET`          | Deployment tracking                                        |

Existing variables — `MONGODB_URI`, the Resend pair, the Stripe set — are unchanged and
documented in `.env.example`.

### Deployment configuration

`vercel.json` gained three things:

- A rewrite sending `/app/**` to the `/app` document, because
  `/app/projects/:projectId` cannot be prerendered. Scoped to `/app` deliberately: a
  typo elsewhere is still a real 404 rather than a homepage pretending the URL exists.
- `Cache-Control: private, no-store` on `/app/**`. A dashboard is one customer's data
  behind a cookie, and a shared cache that stored it could hand it to the next person.
- The CSP directives Google Identity Services needs, and nothing more.

---

## 9. Automation events

Every lifecycle moment is already recorded through one interface, `ActivityRecorder`:

```
account.created          project.created            deployment.preview_ready
assessment.submitted     project.milestone_changed  deployment.production_ready
billing.payment_succeeded project.approved          deployment.failed
billing.payment_failed   project.changes_requested  feedback.created
billing.subscription_changed project.launched       feedback.replied
task.created             task.completed             feedback.resolved
```

Deliberately a table and not an event bus. There is one process, one database and no
out-of-band subscriber; what a bus would buy — decoupling between what happens and what
reacts — is bought instead by every service depending on the _interface_ rather than on
each other. Introducing a real bus later means one new implementation of it.
