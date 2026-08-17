# Demo Mode

How to show the product to somebody, and what makes it safe to do that on production.

---

## What it is

A private entry at `/promo`, a passcode checked on the server, and an isolated demonstration
customer whose account exercises **the real application**.

Not a second frontend. Not a screenshot tour. Not a mocked API. Somebody who enters is signed
in to the customer portal a paying client uses, looking at a business whose every record was
invented for the purpose.

---

## The one decision everything follows from — DECISION 033

**A demo customer is a customer.** The demonstration account holds `role: 'customer'` and one
flag, `demo`, on its user document. That is the whole mechanism.

Everything that keeps a demo visitor away from a real customer's data is the ownership boundary
that already existed and was already tested: `authorizeOwnership`, `createProjectAccess`, and
the rule that an ownership failure answers **404, never 403**. Not one line of it needed
changing.

It also settles the hardest requirement — no admin access, no owner functionality, no
administrative APIs — **by construction**. `requireAdmin` already answers `NOT_FOUND` to every
customer, so there is no demo-specific check to remember and none to forget.

What was rejected, and why:

| Rejected                                  | Why                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| A `demo: true` column on every collection | Eleven repositories, and one forgotten filter is a leak in _either_ direction                                                 |
| A separate database                       | Mongoose binds models at module scope; per-request `useDb()` means changing every repository to buy isolation we already have |
| A second authentication system            | One session mechanism means one place expiry, rotation, `SameSite` and signout are implemented                                |
| Stripe test mode in production            | A second client and a second set of Price ids in a process holding live keys. Getting that wrong charges somebody             |

---

## Turning it on

Set `DEMO_PASSCODE` in the production environment and redeploy. Twelve characters minimum.

```
DEMO_PASSCODE=<something long>
DEMO_SESSION_HOURS=12          # optional, defaults to 12
```

**Unset leaves every `/api/demo` route unmounted.** That is the `/api/cron` pattern and it is
deliberate: an unconfigured deployment answers a genuine 404 rather than "not configured", so
the feature cannot be half-on and a prober cannot learn from a response that a demonstration
exists somewhere behind a secret they have not guessed.

`npm run preflight` reports whether it is set. It never prints it.

### Rotating it

Change the variable and redeploy. That is the whole procedure. Sessions already minted keep
working until they expire, which is correct — rotating the door does not throw out the person
already through it.

### Turning it off

Delete the variable and redeploy. The routes disappear. `/promo` still renders, and every
passcode typed into it fails in exactly the way a wrong one does.

---

## Showing it to somebody

- Send them **`/promo`**. It is `noindex`, absent from the sitemap, and linked from nowhere.
- Send the **passcode separately** — a text or a call, not the same email as the link.
- They need no account, no signup and nothing installed.

They land on a dashboard for **Cascade Heating & Air**, a made-up HVAC business mid-build, with
a banner across the top naming the testers it was set up for.

### What is in front of them

| Screen         | What the seed puts there                                                              |
| -------------- | ------------------------------------------------------------------------------------- |
| Dashboard      | A project at `review`, five onboarding tasks with three done, ten activity entries    |
| Website        | Progress, a preview URL, an estimated launch date with the day it was last changed    |
| Preview        | The approval decision, live                                                           |
| Things we need | Two open tasks                                                                        |
| Feedback       | A thread with a reply on it                                                           |
| Assessment     | A completed self-assessment scoring 42, and a **delivered** four-finding owner review |
| Reports        | One published monthly Website Performance Report                                      |
| Billing        | Deposit paid, launch instalment outstanding                                           |

### The three controls in the banner

- **Show me around** — a six-stop guided tour of the customer journey. It navigates and it
  never intercepts: nothing is blocked, nothing is disabled, and a tester who ignores it and
  clicks elsewhere finds the tour still on the step they left it on.
- **Reset** — deletes every record the demonstration account owns and writes the dataset again.
  Behind an inline confirmation.
- **Give feedback** — six categories and a text box. It records the route they were on, which
  is the part that is hard to describe afterwards.

Leaving is the ordinary **Sign out**. There is no demo-specific logout, because a demo session
is an ordinary session.

---

## What is simulated, and what is real

**Everything is real except money.** Approving the site, requesting changes, completing a task,
uploading a file, replying on a thread — all of it runs the production code path and writes to
the production database. That is the point: the demonstration is worth nothing if it is a
different application.

Payments are the exception, and the reason is the strongest rule in the codebase: **payment
state is advanced by verified webhooks and by nothing else.** A demo that simulated a payment
by posting to the webhook path, or by adding a flag to the fulfilment code, would put a second
door on that rule — and the second door is the one that gets used by accident.

So the demo does not go near it:

- `createCustomerCheckoutSession` and `createCustomerPortalSession` **refuse a demo customer in
  the service**, on the first line, before the Price is looked up and before the Stripe client
  is touched. A frontend check is not a control and neither is a route-level one.
- `DemoService.simulatePayment` applies the same state change against a demo-owned project,
  resolved from the session. There is no project id and no amount in the request body.
- **Stripe is contacted zero times on the demo path.** That is asserted rather than argued: the
  fake client records no calls, and there is nothing to record.

The invariant is restated rather than weakened: _payment state moves on a verified webhook, or
on an explicitly demo-scoped simulation against a demo-owned project._ One extra door, named,
and unreachable without the passcode.

---

## What protects it

Not the obscurity of the URL. "Nobody knows `/promo`" is not a security mechanism and nothing
here relies on it.

1. **The passcode is compared on the server**, in constant time, against a value that has never
   been in a bundle. `demo.api.test.ts` sweeps the client source for any attempt to read it
   from `import.meta.env`.
2. **The credential rate limiter** sits in front of `POST /api/demo/enter` — the same budget
   the sign-in form uses, whose own comment says every endpoint it covers is an attempt to
   guess a secret.
3. **One failure message.** A wrong passcode, an unconfigured deployment and a rate-limit
   rejection all read the same. Three distinguishable answers would be an oracle.
4. **A short session.** Hours, not the thirty days a real customer gets.
5. **The account is a `customer`**, so every `/api/admin` route answers it `NOT_FOUND`.
6. **The ownership boundary**, in both directions — a demo visitor cannot read a real
   customer's records, and a real customer cannot read the demonstration's.
7. **Nothing can set the `demo` flag over HTTP.** The seeder is its only writer, enforced by a
   source sweep in the same shape as the one guarding role grants.

Nineteen tests in `apps/server/src/features/demo/demo.api.test.ts` hold all of it.

---

## What the owner sees

Demo rows are real rows, so they _would_ appear in the owner's own picture of the business. That
is the price of DECISION 033 and it is paid in three named places rather than by a filter on
every read:

- `GET /api/admin/projects` and `/accounts` exclude them. `?includeDemo=true` puts them back,
  for the afternoon somebody is debugging the demonstration.
- The console inbox excludes demo threads. Its promise is "everybody waiting on a reply", and a
  tester is not waiting.

Demo feedback is its own small list, deliberately not `features/feedback` — a tester saying a
button was confusing is not a customer awaiting an answer, and one definition of "awaiting
reply" is a rule `features/conversations` already fought for.

---

## Known limitation, recorded before it is discovered

**One demo account, shared.** Two people demonstrating at the same time share one dataset, and
one of them pressing Reset is visible to the other.

A per-session account was refused because creating accounts from a public endpoint is an abuse
vector, and the isolation it buys is isolation from _other demo users_ — which is the least
important kind here. A small leased pool is the upgrade if this ever actually bites. It is not
MVP.

---

## Changing who the banner names

`apps/client/src/config/demo.ts`. One line, then deploy.

Deliberately not an environment variable: it is not a secret, it is read by a browser, and a
`VITE_`-prefixed one would be inlined into the bundle anyway — so the only thing that would buy
is a deployment where nobody can tell from the source who the banner names.

The names are **presentational only**. Nothing authorises against them, nothing stores them, and
the passcode is one shared secret. There is no per-tester identity, and inventing one would be a
second authentication system bought to attribute a sentence nobody replies to.
