# JobForge

The marketing site, customer platform and lead capture for JobForge — a software and
digital growth company that builds customer-acquisition websites and digital growth
systems for local service businesses — HVAC, plumbing, electrical, roofing, landscaping
and similar trades — in the Greater Seattle area.

Two jobs: get a service-business owner to make contact, and then take them from a free
assessment through payment, the build, their approval and launch without either side
losing track of whose move it is.

- **`client/`** — React + TypeScript (Vite). The public marketing site and the private
  customer workspace at `/app`, sharing one design system and nothing else
- **`server/`** — Express + TypeScript API: leads, accounts, assessments, projects,
  tasks, feedback, billing and deployments
- **`api/`** — a nine-line Vercel adapter around the Express app

The lifecycle and the architecture behind it are documented in
[docs/CUSTOMER-PLATFORM.md](docs/CUSTOMER-PLATFORM.md); Google sign-in in
[docs/GOOGLE-SIGN-IN.md](docs/GOOGLE-SIGN-IN.md).

---

## Contents

1. [Requirements](#requirements)
2. [Local installation](#local-installation)
3. [The commercial model](#the-commercial-model)
4. [Environment variables](#environment-variables)
5. [Commands](#commands)
6. [Testing](#testing)
7. [Production build](#production-build)
8. [MongoDB setup](#mongodb-setup)
9. [Resend setup](#resend-setup)
10. [Vercel deployment](#vercel-deployment)
11. [Custom domain](#custom-domain)
12. [Troubleshooting](#troubleshooting)
13. [Project structure](#project-structure)
14. [Architecture decisions](#architecture-decisions)
15. [Known limitations](#known-limitations)

---

## Requirements

| Tool    | Version   | Notes                                                 |
| ------- | --------- | ----------------------------------------------------- |
| Node.js | ≥ 20.19   | Developed on 22.x                                     |
| npm     | ≥ 10      | Workspaces are used; npm ships with Node              |
| MongoDB | any 6/7/8 | Atlas free tier is enough. Only needed to store leads |
| Resend  | free plan | Only needed to email lead notifications               |

MongoDB and Resend are optional in development. Without them the site runs, the pages
work, and the contact endpoint returns a clear "call or email instead" error rather
than pretending a submission succeeded.

---

## Local installation

```bash
git clone <your-repo-url> jobforge
cd jobforge
npm install                    # installs both workspaces

cp .env.example .env           # macOS / Linux
# Copy-Item .env.example .env  # Windows PowerShell

npm run dev
```

- Site: <http://localhost:5173>
- API: <http://localhost:5000/api/health>

The Vite dev server proxies `/api` to Express, so the browser only ever talks to one
origin — the same as in production.

---

## The commercial model

**[`docs/business-offer.md`](docs/business-offer.md) is the authoritative record** of what
is sold, for how much, and on what terms. Read it before changing anything that touches
price, scope, guarantees or terms — those are commercial commitments, not implementation
details.

The short version — **two priced products, one owner-gated, one optional plan**:

|                               |                                                                            |
| ----------------------------- | -------------------------------------------------------------------------- |
| **Customer Conversion Build** | **$7,500** standard · **$4,900** founding-client, one-time                 |
| Payment                       | Half ($2,450) to start, half on the day it goes live — via Stripe          |
| **Conversion Fix**            | Scope and boundary published; **price not published** — see DECISION 014   |
| **Growth Partner**            | **$299/month**, or $2,990/year — **optional**, a separate purchase         |
| Growth Partner delivers       | The **Website Performance Report**, monthly — see DECISION 015             |
| Year one, published           | $4,900 website only · **$8,488** with Growth Partner all twelve months     |
| Minimum term (plan)           | 3 months from launch, then month-to-month with 30 days' notice             |
| Launch timeline               | 2–4 weeks after the client's materials arrive                              |
| Scope                         | Up to 6 service pages plus home/about/contact; 2 revision rounds           |
| Measured from                 | Launch day — the enquiry baseline is written down, then reported at day 30 |
| Scarcity                      | One build at a time — the real constraint, no counters, no timers          |
| Response guarantee            | A reply within 24 business hours, or that month's fee is waived            |
| Ownership                     | Domain, hosting and content in the client's name throughout                |

**One name per product, end to end.** The recurring service is **Growth Partner** in the
marketing copy, the pricing card, the dashboard, the billing page, the subscription label and
the Stripe product description. It used to be a "care plan" in six of those, which is the
commodity framing the whole offer argues against — `content.test.ts` now sweeps both
workspaces' source and fails the build if the phrase returns to anything a customer can read.

**Every figure lives in `client/src/config/pricing.ts` as a number**, formatted on the way
out. `content/offer.ts` derives its strings from it and remains the only file in the
_content_ layer allowed to name a figure — a test sweeps every string and fails the build
on any figure the config did not produce, because "$299 on the homepage, $149 in an FAQ" is
invisible in review and obvious to a customer. Both pricing surfaces render from one
shared component (`PricingBlock`), so they cannot disagree.

The founding-client price is a real discount with a real condition (permission to publish
the work as a case study), presented as a labelled concurrent price and **never** as a
strike-through, because this business has never charged the standard rate card. **Three
things in `docs/business-offer.md` §17 need confirming before any of it goes live.**

### Stripe setup (payments)

Payments are consultative, never a public checkout: scope is agreed in writing, then the
owner sends a Stripe Checkout link for the deposit, another at launch, and — if chosen —
starts the Growth Partner subscription. Payment state is advanced only by verified Stripe
webhooks. To turn it on:

1. Set `STRIPE_SECRET_KEY` (test mode) in `.env`, then run
   `npm run stripe:setup --workspace server` — it idempotently creates or verifies the
   whole catalog (two Products: Website Build and Growth Partner; four Prices: $2,450
   deposit, $2,450 launch payment, $299/month, $2,990/year) and prints the
   `STRIPE_PRICE_*` lines to paste into `.env`. It refuses live-mode keys. When
   founding pricing ends, follow `docs/stripe-pricing-transition.md`.
2. Add a webhook endpoint for `https://<your-domain>/api/billing/webhook`, subscribed to
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `invoice.paid`, `invoice.payment_failed`,
   `customer.subscription.created/updated/deleted`, `payment_intent.payment_failed` and
   `charge.refunded`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
3. Set `STRIPE_SECRET_KEY` and a long random `BILLING_ADMIN_TOKEN`.
4. Create a project and a payment link (owner-only, Bearer `BILLING_ADMIN_TOKEN`):
   `POST /api/billing/projects` `{businessName, contactName, email, phone?}` →
   `POST /api/billing/checkout-sessions` `{projectId, product: "build-deposit"}` → send
   the returned URL to the client. Checkout's success page is `/welcome`, which explains
   what happens next and collects the client's onboarding materials.

Until these are set, the site runs exactly as before and the billing endpoints answer 503
with an instruction.

### Replacing the placeholders

Values that have not been decided are written as `[PLACEHOLDER]` tokens in
`client/src/content/`. **In development the site shows a banner listing every one still in
place**; it disappears from the production bundle entirely. Until a value is replaced the
phone number and email render as plain text rather than dead `tel:`/`mailto:` links, and
`ProfessionalService` structured data is omitted rather than published with a fake name.

**There are currently none.** Every commercial and personal placeholder has been replaced,
and `content.test.ts` fails the build if one reappears anywhere in the content layer.

### Still worth doing before launch

- **The legal pages.** `content/legal.ts` is written in plain English by the business and
  describes what the application actually does and what has actually been agreed. It has
  not been reviewed by a lawyer, and the pages say so on screen.
- **A business email address.** `site.contact.email` and `site.contact.supportEmail` are
  currently a personal Gmail. `supportEmail` is the designated channel for the response
  guarantee, and it is separate from the public address precisely so it can be moved to a
  domain mailbox later without touching the terms.
- **The examples.** Everything in `content/portfolio.ts` is flagged `isDemo: true` and
  renders a visible "Demonstration" badge. Real client work goes in with `isDemo: false`.
- **Testimonials.** `content/testimonials.ts` is empty and the section renders nothing
  while it is. Add real quotes from real people who agreed to be quoted, or leave it.
- **Turning the free assessment off**, if it stops being part of the offer. Set
  `site.offer.freeReview.enabled` to `false`; every mention disappears and the primary
  button falls back to `cta.primaryFallback`. Nothing else needs editing.

### Changing a commercial term

1. Change it in the written client agreement first.
2. Change it in `content/offer.ts` or `content/growth.ts`.
3. Update the decision register in `docs/business-offer.md`.
4. Run `npm run verify`. Several of these are pinned by tests on purpose — the response
   guarantee's response-not-resolution wording, the price consistency sweep, the
   no-unlimited-revisions guard and the no-placeholder guard among them.

---

## Environment variables

One `.env` at the repository root serves both workspaces. It is git-ignored;
`.env.example` documents every value. **Only `VITE_`-prefixed variables reach the
browser** — never give the Resend key or the Mongo URI that prefix.

### Server

| Variable                         | Required                        | Default           | Purpose                                                              |
| -------------------------------- | ------------------------------- | ----------------- | -------------------------------------------------------------------- |
| `NODE_ENV`                       | no — **never set it on Vercel** | `development`     | `development` \| `test` \| `production`. Falls back to `VERCEL_ENV`. |
| `PORT`                           | no                              | `5000`            | Local listen port (ignored on Vercel)                                |
| `MONGODB_URI`                    | **yes in production**           | –                 | Connection string                                                    |
| `MONGODB_DB_NAME`                | no                              | –                 | Overrides the database in the URI                                    |
| `RESEND_API_KEY`                 | **yes in production**           | –                 | Starts with `re_`                                                    |
| `RESEND_FROM_EMAIL`              | **yes in production**           | –                 | Must be on a domain verified in Resend                               |
| `CONTACT_NOTIFICATION_EMAIL`     | **yes in production**           | –                 | Where new leads are delivered                                        |
| `PLAYBOOK_PDF_URL`               | no                              | –                 | Hosted workbook PDF. Setting it turns on automatic PlayBook delivery |
| `CLIENT_ORIGIN`                  | no                              | –                 | Comma-separated CORS allow list. Leave unset for same-origin         |
| `LOG_LEVEL`                      | no                              | `info`            | `debug` \| `info` \| `warn` \| `error` \| `silent`                   |
| `LEAD_RATE_LIMIT_WINDOW_MINUTES` | no                              | `15`              | Rate-limit window                                                    |
| `LEAD_RATE_LIMIT_MAX`            | no                              | `5`               | Submissions per IP per window                                        |
| `TRUST_PROXY_HOPS`               | no                              | `1` in production | Proxies in front of the app                                          |

### Accounts, Google sign-in and deployment tracking

All optional. Without them, accounts still work with email and password, the "Continue
with Google" button still renders and explains that it is not set up here, and preview
URLs are set by hand. See [docs/CUSTOMER-PLATFORM.md](docs/CUSTOMER-PLATFORM.md) and
[docs/GOOGLE-SIGN-IN.md](docs/GOOGLE-SIGN-IN.md).

| Variable                         | Required | Default | Purpose                                                                              |
| -------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------ |
| `GOOGLE_CLIENT_ID`               | no       | –       | OAuth 2.0 **Web** client id. Public. Separate clients for development and production |
| `AUTH_RATE_LIMIT_WINDOW_MINUTES` | no       | `15`    | Throttle window for sign in, sign up, reset and the Google exchange                  |
| `AUTH_RATE_LIMIT_MAX`            | no       | `20`    | Attempts per IP per window. Successful sign-ins do not count                         |
| `VERCEL_WEBHOOK_SECRET`          | no       | –       | Verifies deployment webhooks. Never give this a `VITE_` prefix                       |

There is deliberately **no Google client secret**. The flow returns a signed ID token
that the server verifies against Google's published public keys; no token exchange
happens, so no secret exists to leak.

### Client

| Variable            | Required | Default                 | Purpose                                                               |
| ------------------- | -------- | ----------------------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | no       | empty                   | Leave empty for same-origin. Set only if the API is on another domain |
| `VITE_SITE_URL`     | for prod | `http://localhost:5173` | Canonical URLs, Open Graph URLs and `sitemap.xml`                     |

**The server refuses to start in production if any required variable is missing**, and
prints all of them at once rather than failing on the first request.

---

## Commands

Run from the repository root.

| Command                                     | What it does                                                  |
| ------------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                               | Express and Vite together, with reload                        |
| `npm run dev:client` / `npm run dev:server` | One side only                                                 |
| `npm run build`                             | Builds the server, then the client and its per-route SEO HTML |
| `npm start`                                 | Runs the built server (`server/dist/server.js`)               |
| `npm test`                                  | Vitest in watch mode, both workspaces                         |
| `npm run test:run`                          | Vitest once                                                   |
| `npm run typecheck`                         | `tsc --noEmit` over server, client and the Vercel adapter     |
| `npm run lint`                              | ESLint                                                        |
| `npm run format`                            | Prettier, writing changes                                     |
| `npm run verify`                            | format check → lint → typecheck → tests → production build    |

`npm run verify` is the gate. It fails on a broken frontend build or a backend type
error rather than letting either through.

---

## Testing

Vitest runs two projects from one command: the server in Node, the client in jsdom.

```bash
npm run test:run                       # everything
npx vitest run --root server           # backend only
npx vitest run --root client           # frontend only
```

**No test needs MongoDB or a Resend account.** The lead service depends on a
`LeadRepository` interface and an `EmailService` interface, and the suite injects
in-memory implementations from `server/src/testing/fakes.ts`. The HTTP tests drive the
real Express app — helmet, CORS, body limits, validation, rate limiting and the central
error handler all included — with only those two external dependencies replaced.

What is covered:

- **Backend** — valid submission; every validation rule; malformed JSON; oversized body;
  unknown keys; honeypot; duplicate suppression; persistence failure; email failure;
  notification bookkeeping failure; rate limiting; CORS allow list; security headers;
  and an explicit test that a production 500 leaks no connection string, message or stack.
- **Frontend** — form labelling; the invalid, sending, sent, server-rejected and
  offline states; focus moving to the error summary; `aria-invalid` and
  `aria-describedby` wiring; the honeypot staying out of the accessibility tree.
- **Content** — that the inquiry slugs still match the API contract, that every example
  is still marked as a demonstration, and that every route has unique metadata.

---

## Production build

```bash
npm run build
```

1. `tsc` compiles the server to `server/dist/`.
2. `vite build` bundles the client to `client/dist/`.
3. `client/scripts/build-seo.ts` writes **one real HTML file per route** — `index.html`,
   `services.html`, `about.html`, `contact.html`, `portfolio.html`, `privacy.html`,
   `terms.html`, `404.html` — each with its own `<title>`, description, canonical link
   and Open Graph tags, plus `sitemap.xml` and `robots.txt`.

Step 3 is why link previews work. Facebook, LinkedIn, Slack and iMessage do not run
JavaScript, so without it every shared URL would preview with the same generic title.

Set `VITE_SITE_URL` before building or the canonical URLs will point at localhost — the
script prints a warning if you forget.

---

## MongoDB setup

1. Create a free cluster at <https://cloud.mongodb.com> (M0 is enough).
2. **Database Access** → add a user with _Read and write to any database_. Save the password.
3. **Network Access** → add `0.0.0.0/0`. Vercel functions do not have fixed IPs, so an
   allow list is not an option; the database user's credentials are the control.
4. **Connect** → _Drivers_ → copy the `mongodb+srv://…` string.
5. Put it in `MONGODB_URI`, replacing `<password>`, and add a database name:

   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster0.abc.mongodb.net/jobforge?retryWrites=true&w=majority
   ```

6. Verify: `npm run dev`, then submit the contact form. The lead appears in the
   `leads` collection. `GET /api/health` reports `"database": "configured"` outside production.

The connection is cached across serverless invocations, and `bufferCommands` is off so a
misconfigured URI fails immediately instead of hanging for ten seconds.

---

## Resend setup

1. Sign up at <https://resend.com>.
2. **Domains** → add your domain and add the DNS records it gives you. Verification is
   usually minutes. _Without a verified domain, delivery to anyone but your own account
   address will fail._
3. **API Keys** → create a key with _Sending access_. Copy it once — it is not shown again.
4. Fill in:

   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   RESEND_FROM_EMAIL=Website Leads <leads@yourdomain.com>
   CONTACT_NOTIFICATION_EMAIL=you@yourdomain.com
   ```

5. Verify: submit the form and check the inbox, then Resend's **Logs** tab.

For a quick test before DNS is set up, `onboarding@resend.dev` works as
`RESEND_FROM_EMAIL` but can only deliver to the address that owns the Resend account.

Without a key configured, the server logs what it _would_ have sent and carries on, so
the whole flow is testable offline. Production refuses to start without one.

---

## Vercel deployment

`vercel.json` is already configured — build command, output directory, the `/api/*`
rewrite, `cleanUrls`, cache headers and a content security policy.

1. Push the repository to GitHub.
2. <https://vercel.com/new> → import it. Leave the framework preset as **Other**;
   `vercel.json` supplies everything.

   > **Root Directory must stay at the repository root.** It is the one setting
   > `vercel.json` cannot control — and Vercel reads `vercel.json` _from_ the Root
   > Directory, so pointing it at `client/` makes the whole file invisible. Vercel then
   > auto-detects the Vite app inside `client/`, builds only the frontend, looks for
   > `dist` in the wrong place, and never deploys `/api` at all. If a build succeeds but
   > ends with `No Output Directory named "dist" found`, this is why.

3. **Settings → Environment Variables**, for Production _and_ Preview:

   > **Do not add `NODE_ENV`.** npm reads it during `npm install`, and `production`
   > makes it skip devDependencies — TypeScript, Vite and tsx disappear and the build
   > fails within seconds. Vercel sets `NODE_ENV=production` for the function runtime
   > on its own, and the server also falls back to `VERCEL_ENV`, so production mode is
   > detected either way.

   ```
   MONGODB_URI=mongodb+srv://…
   RESEND_API_KEY=re_…
   RESEND_FROM_EMAIL=Website Leads <leads@yourdomain.com>
   CONTACT_NOTIFICATION_EMAIL=you@yourdomain.com
   VITE_SITE_URL=https://yourdomain.com
   ```

   Leave `CLIENT_ORIGIN` and `VITE_API_BASE_URL` unset — the site and the API share one
   origin, so no CORS configuration is needed.

4. Deploy, then check in order:
   - `https://yourdomain.com/api/health` → `{"success":true,"data":{"status":"ok"}}`
   - `https://yourdomain.com/about` → the About page with its own title in the tab
   - `view-source:https://yourdomain.com/services` → a `<title>` of "Services | …"
   - submit the contact form → the lead lands in MongoDB **and** in your inbox

`VITE_SITE_URL` is read at build time, not at runtime. Changing it requires a redeploy.

### Moving off Vercel

`api/index.ts` is the only Vercel-aware file and it contains no logic. To host on
Railway, Render, Fly or a VPS: set the same environment variables, run `npm run build`,
start `node server/dist/server.js`, serve `client/dist` as static files, and set
`CLIENT_ORIGIN` if the two end up on different domains.

---

## Custom domain

1. Vercel → project → **Settings → Domains** → add `yourdomain.com`.
2. At your registrar, add what Vercel shows:
   - apex: `A` → `76.76.21.21`
   - `www`: `CNAME` → `cname.vercel-dns.com`

   (Use the values in Vercel's UI — they are authoritative.)

3. Wait for propagation. HTTPS is issued automatically.
4. Pick one canonical host in **Domains** and redirect the other; Vercel does this for you.
5. Set `VITE_SITE_URL` to the canonical host and **redeploy**, so canonical links,
   Open Graph URLs and `sitemap.xml` all agree.
6. Submit `https://yourdomain.com/sitemap.xml` in Google Search Console.

---

## Troubleshooting

| Symptom                                                        | Cause and fix                                                                                                                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel build fails within seconds, during `npm install`        | `NODE_ENV=production` is set in Vercel's environment variables. Delete it and redeploy — npm omits devDependencies when it sees it, so `tsc` and `vite` are never installed. |
| Build succeeds, then `No Output Directory named "dist" found`  | Vercel's Root Directory is set to `client/` instead of the repository root, so `vercel.json` is never read. Fix it in **Settings → General → Root Directory**.               |
| Only the client builds — no `@jobforge/server` line in the log | Same cause as above: Vercel auto-detected the Vite app and ignored `vercel.json`.                                                                                            |
| Server exits with "Invalid environment configuration"          | A required production variable is missing. The message lists all of them.                                                                                                    |
| Form returns 503 "we could not save your request"              | `MONGODB_URI` is unset or unreachable. This is deliberate — the form never claims success it cannot back up.                                                                 |
| Lead is in MongoDB but no email arrived                        | Resend failed. Look for `lead.notification_failed` in the logs, and for `notificationStatus: "failed"` on the lead. Persisting first is intentional; see below.              |
| Resend returns "domain not verified"                           | The domain in `RESEND_FROM_EMAIL` is not verified, or the DNS records have not propagated.                                                                                   |
| MongoDB times out on Vercel but works locally                  | Atlas Network Access does not include `0.0.0.0/0`.                                                                                                                           |
| Form returns 429                                               | The rate limit is doing its job. Defaults are 5 per IP per 15 minutes; tune with `LEAD_RATE_LIMIT_*`.                                                                        |
| `/about` 404s on Vercel                                        | `cleanUrls` is not applied, or the build did not run `build-seo`. Check the build log for `[build-seo] wrote 17 pages`.                                                      |
| Link previews show the wrong title                             | `VITE_SITE_URL` was not set at build time, or the build ran without step 3. Redeploy.                                                                                        |
| Browser console: blocked by CSP                                | The CSP in `vercel.json` allows same-origin only. Adding a third-party script means adding it there deliberately.                                                            |
| Dev banner listing placeholders                                | Working as intended. It never ships to production.                                                                                                                           |

To find leads whose notification failed:

```js
db.leads.find({ notificationStatus: 'failed' }).sort({ createdAt: -1 });
```

---

## Project structure

```
.
├── api/index.ts              Vercel adapter — no business logic
├── client/
│   ├── public/               favicon, OG image, demo thumbnails
│   ├── scripts/build-seo.ts  per-route HTML, sitemap.xml, robots.txt
│   └── src/
│       ├── app/              App shell and routes
│       ├── components/
│       │   ├── layout/       header, footer, page shell
│       │   ├── marketing/    reusable CTA banner
│       │   └── ui/           button, card, field, icon, contact link
│       ├── config/           routes, browser-visible env
│       ├── content/          ← ALL COPY LIVES HERE
│       ├── features/         home, services, portfolio, faq, about, contact, legal
│       ├── hooks/            useDocumentMeta
│       ├── lib/              api client, placeholders, contact links
│       ├── styles/           design tokens, global CSS
│       └── types/            API contract, content shapes
└── server/src/
    ├── app/                  app assembly, route table
    ├── config/               validated environment
    ├── features/leads/       controller, service, repository, model, schema, email
    ├── features/subscribers/ the same shape, for PlayBook workbook requests
    ├── infrastructure/       mongoose connection, Resend transport
    ├── middleware/           errors, 404, rate limit, request context
    ├── lib/                  AppError, logger, API envelope, HTML escaping
    └── testing/              in-memory fakes
```

### API

| Endpoint                | What it does                                                           |
| ----------------------- | ---------------------------------------------------------------------- |
| `GET /api/health`       | Liveness. Reports database and email configuration outside production. |
| `POST /api/leads`       | A contact-form submission. Stored, then the owner is notified.         |
| `POST /api/subscribers` | A PlayBook workbook request. One field: an email address.              |

Both POSTs are public, rate limited on the same budget, protected by the same honeypot,
and answer every accepted outcome — stored, duplicate, or caught bot — with an identical
202, so the response never tells a script which trick worked.

### The PlayBook

Twenty improvements, a forty-point self-assessment and a printable workbook — the free
resource and the top of the funnel. **[`docs/playbook.md`](docs/playbook.md) explains how
it is built and the rules it follows.**

| Route                | What it is                                                                          |
| -------------------- | ----------------------------------------------------------------------------------- |
| `/playbook`          | The whole thing, unfolded. No email required for any of it — and the form is on it. |
| `/playbook/workbook` | `noindex`, unlinked. Print it to PDF.                                               |

There was a `/playbook/get` — a second page carrying the same email form, linked from
nowhere. It was removed; see [`docs/VALUE-PER-SECOND.md`](docs/VALUE-PER-SECOND.md) §4.
A salesperson reads out `/playbook`, which is shorter to say.

`POST /api/subscribers` stores the address with a consent record, then either emails the
subscriber the workbook or notifies the owner to send it — decided entirely by whether
`PLAYBOOK_PDF_URL` is set. The response carries which happened, and **the confirmation
copy is chosen from it**, so the page can never tell somebody to check an inbox nothing is
filling.

To turn on automatic delivery: open `/playbook/workbook`, print to PDF, host the file, set
`PLAYBOOK_PDF_URL`. That is also why there is no PDF-generation dependency in a repository
with three runtime dependencies — the browser already has an excellent PDF renderer.

The consent wording is duplicated as `PLAYBOOK_CONSENT_TEXT` on the server and pinned by a
test on both sides, so what gets stored always matches what the person was shown.

### The audit, the industry pages and the teardown

The conversion layer. **[`docs/CONVERSION-UPGRADE-PLAN.md`](docs/CONVERSION-UPGRADE-PLAN.md)
records why each of these exists and what it is not allowed to claim.**

| Route                       | What it is                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| `/audit`                    | The **Website Score**. The useful half is free and needs no email address.      |
| `/what-your-website-can-do` | The capability library — see below.                                             |
| `/hvac-websites` etc        | Five industry pages, one per trade with `hasPage` in `config/trades.ts`.        |
| `/website-teardown`         | Six findings on a composite first screen, plus a sample of the free assessment. |
| `/demo/<trade>`             | Five demonstration websites, three routes each. See below.                      |

### The capability library

`/what-your-website-can-do` publishes forty capabilities, twelve third-party systems and an
eight-stage customer lifecycle. **[`docs/business-offer.md` §18](docs/business-offer.md)
records the rules it is held to; DECISION 017 is the owner sign-off on what it now promises.**

The thing to know before editing it: **every capability carries two independent honesty
fields.** `availability` says how a business would actually get it — three of its five values
mean "not today" — and `maturity` says how settled the implementation is. Anything claiming to
be part of the build or the plan must name the offer artefact that already says so
(`offerAnchor`), and `capabilities.test.ts` resolves every pointer. If the offer changes, the
pointer breaks and the build fails, which is the mechanism that stops this becoming a second
description of what is sold.

| File                                      | What it holds                                                      |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `client/src/content/capabilities.ts`      | The library, categories, lifecycle, integrations and the page copy |
| `client/src/lib/capabilityMatch.ts`       | Every matching rule, pure, taking the library as an argument       |
| `client/src/config/trades.ts`             | The twelve trades and how each trade's work is bought              |
| `client/src/content/capabilities.test.ts` | Thirty guards, including the ones that keep the labels honest      |

`lib/capabilityMatch.ts` deliberately does **not** import the library. That is what lets its
tests use fixtures — the cases worth testing are a trade with nothing written for it, a
dependency that does not resolve, a filter that matches nothing, and none of those exist in the
real content — and it makes it structurally impossible for the library to be dragged into the
eager bundle.

### The internal admin surface

`/admin`, for staff. **[`docs/owner-decisions-required.md` DECISION 019 and 020](docs/owner-decisions-required.md)
record the two open questions about it.**

| Route                        | What it is                                                         |
| ---------------------------- | ------------------------------------------------------------------ |
| `/admin`                     | Every project: milestone, whether an account is attached, payments |
| `/admin/projects/:projectId` | One project — milestone, URLs, tasks, feedback, activity           |
| `/admin/accounts`            | Every account: role, verification, sign-in methods                 |

**Getting in.** There is no sign-up path to an admin role and no button that grants one. Run:

```bash
npm run admin:create --workspace server -- --check   # report, change nothing
npm run admin:create --workspace server              # create, or promote an existing account
```

It reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the server-side environment — see
`.env.example`. **The running application never loads either**: they are deliberately absent from
`server/src/config/env.ts`, so no service or error response can reach them. Never give either a
`VITE_` prefix; Vite inlines `VITE_*` into the public bundle.

**Where authorization actually happens**, because a route guard looks like it:

| Layer           | Where                                    | What it does                                  |
| --------------- | ---------------------------------------- | --------------------------------------------- |
| Authentication  | `createAttachUser` (session cookie)      | Resolves who is asking                        |
| Role            | `requireAdmin` on the `/api/admin` mount | **404 to everyone else, including anonymous** |
| Resource        | `createProjectAccess` per project route  | The id has to resolve                         |
| Navigation only | `client/src/app/router/RequireAdmin.tsx` | Decides which page renders. **Not security**  |

`RequireAdmin` reads a role out of a JavaScript variable and anybody can edit that. Defeating it
renders an admin layout whose every request comes back 404. That is the design; the route being
unguessable is not part of it either.

**What is deliberately absent:** no impersonation ("view as customer"), no role control in the
UI, no password reset for other accounts, no account deletion, and no Stripe controls — the
billing endpoints are behind a bearer token and would mean shipping it to a browser. Each
omission is argued at its call site.

`server/src/features/admin/admin.api.test.ts` is where unauthorized access is tested explicitly:
anonymous, customer, and a customer trying the admin verb on their own project.

### The demonstration sites

Five example websites — one per trade — running inside this application rather than at five
deployments. `/demo/hvac`, `/demo/hvac/services`, `/demo/hvac/contact`, and the same for
plumbing, roofing, landscaping and electrical.

They render **outside `SiteLayout`**, under `features/demo/DemoLayout.tsx`, so no
JobForge header or footer appears on them — a demonstration of somebody else's website
cannot be wrapped in this one's navigation. Each trade's content is its own lazy chunk;
`content/demos/` is deliberately absent from the content barrel, and a test fails the build
if it is ever added.

**The rule they follow is "invent the business, never the evidence".** A name, a phone
number, hours, a service list and a set of neighbourhoods are set dressing. A review, a
rating, a licence number, an award, a years-in-business figure or a guarantee is proof, and
none of it appears — `content/demos/demos.test.ts` sweeps every string and fails the build
on any of it. Phone numbers are in the 555-01xx block reserved for fiction, emails are on
`.example` domains nobody can register, and the quote form cannot reach the lead API
because it does not import it.

**The photography and video are licensed stock, and every asset has a provenance row.**
`client/scripts/media.manifest.json` records each photograph's source page, author and
licence; `client/scripts/fetch-media.ts` downloads and encodes the committed variants
(AVIF+WebP, per-role byte budgets); [`docs/MEDIA-CREDITS.md`](docs/MEDIA-CREDITS.md) is the
human-readable record. A test asserts the assets on disk, the manifest and the credits file
agree exactly. Imagery illustrates kinds of work — no caption or alt text claims a job, a
customer or a crew, which would be evidence. Every product image on the marketing pages —
the hero's framed shot, the portfolio cards and showcase, the industry and teardown
previews — is a real screenshot of the demos, captured from this repository's own build by
`client/scripts/capture-previews.ts` (`npm run capture`) at desktop and true phone width,
disclosure bar included; the same run renders `og-image.png`. The full inventory and the
rules for adding a visual are in [`docs/VISUAL-ASSETS.md`](docs/VISUAL-ASSETS.md).

**[`docs/DEMO-SITES-PLAN.md`](docs/DEMO-SITES-PLAN.md)** records the sixteen decisions
behind them and the three things that still need the owner;
**[`docs/DEMO-QUALITY-UPGRADE.md`](docs/DEMO-QUALITY-UPGRADE.md)** records the research and
decisions behind the photography, video and UI upgrade.

Three rules hold this together, and each is enforced by a test rather than by memory:

- **The audit submits through the existing lead contract.** No server file changed for it;
  the audit renders into the `message` field, which is already 2000 characters, already
  not whitespace-collapsed, and already rendered as multiline in the owner's email.
- **The industry routes, page metadata and content are all derived from one list.** Adding
  a sixth trade is an entry in `config/trades.ts` and an entry in `content/industries.ts`;
  `industryPath()` produces the URL and a test asserts nothing drifted.
- **No borrowed figure is published without what it does not show.** `EvidenceCitation`
  makes `limitation` a required field, and `content.test.ts` sweeps the whole content
  barrel structurally: anything carrying a `conversionRate` or a LocaliQ attribution must
  also carry the exact advertising-benchmark label, wherever it lives.

---

## Architecture decisions

**Persist the lead, then notify.** The lead is written to MongoDB before Resend is
called, and a failed notification never fails the request. The lead is the asset: if we
notified first we could email about a lead we then failed to store, and if we rolled the
lead back on a Resend outage we would throw away real work from a real customer. The
cost is that a delivery failure is invisible to the visitor, so it is recorded twice —
`notificationStatus: 'failed'` on the document, and an error log carrying the lead id.
Recovery is a query and a phone call. That is an acceptable manual step at this volume,
and it is the only reason `notificationStatus` exists on an otherwise tiny schema.

**Every accepted submission gets the same 202 and the same body.** A caught bot, a
duplicate and a stored lead are indistinguishable from outside, so the response never
tells a spammer which trick worked.

**Validation is strict about shape, forgiving about format.** Unknown keys are rejected;
`(206) 555-0134`, `206.555.0134` and `+1 206 555 0134` are all accepted, and
`acmeplumbing.com` gains a scheme rather than an error. Rejecting a real customer's
phone number costs more than accepting an odd one.

**Content is data, not JSX.** Every word lives in `client/src/content/`. Changing the
business name, the service list, the FAQ or the geography is an edit to a data file.

**The offer has one source of truth.** `client/src/content/offer.ts` holds the name of
the offer, its ten components, the ongoing service, the value stack, the prices, the
published terms and the guarantee. The homepage sections and the services page both render
that file, so the two can never describe different services, and testing a different offer
is one file to edit.

**One file may state a price.** `offer.ts` exports `prices`; everything else interpolates
it. A test walks every string in the content layer and fails on any currency figure that
is not one of the sanctioned amounts. The bug it prevents — $299 on the homepage and $149
in an FAQ answer added six months later — is invisible in a diff and obvious to the
customer who finds it.

**Commercial terms are published, not buried.** The minimum term, the notice period, the
payment schedule, the revision count and the exit terms are all on the homepage. Each one
is a question a buyer asks before they will make contact, and answering it up front costs
nothing. `docs/business-offer.md` is the authoritative record, and it exists so that a
future agent cannot change the business model by accident.

**The response guarantee is generated from the business hours.** `site.contact.hours` is
load-bearing: widening the window widens a commitment with a fee waiver attached, and the
terms page will say so on the next build. A test asserts the two cannot disagree, and
another asserts the promise stays a _response_ rather than becoming a resolution SLA on
somebody else's hosting company.

**Nothing promises a result.** Rankings, lead volume and revenue depend on the market,
the pricing and the phone being answered. What the site promises is work — what gets
built, maintained and improved. `content.test.ts` sweeps every string in the content
layer for the claims this business has decided not to make, so a hurried edit that adds
"guaranteed leads" fails the build rather than reaching a customer.

**The hero asks for three things, then three more.** `features/contact/HeroLeadForm.tsx`
splits the ask so somebody who arrived already convinced can start in the time it takes
to read the headline. It is progressive _disclosure_, not progressive capture: the API
takes a whole lead or nothing, so there is exactly one request, sent at the end of step
two. It shares the contact page's validators, honeypot and API client — there is one lead
system, not two.

**The hero has two versions, and neither is a guess dressed up as a decision.**
`site.hero.variant` switches between the inline form and the original
buttons-and-illustration hero. Both are built. Flip the value and compare
`hero_form_started` against `cta_clicked` rather than arguing about it.

**Events exist; tracking does not.** `lib/analytics.ts` names the funnel and is called
from the places it happens, but `track()` finds no sink and returns. Wire a tag manager
into `index.html` and it starts reporting — and `content/legal.ts` has to be updated at
the same time, because the privacy page currently says this site does no analytics
tracking. That is true today.

**The business case comes before the product.** `content/value.ts` explains what a
website is for in an owner's terms, and `sections/DemoSection.tsx` shows the difference
rather than describing it. The mock websites are markup built from a spec, not
screenshots: the differences being demonstrated are mostly wording, and a screenshot of
a sentence is unreadable at that size — and a screenshot of a real business's homepage
would be somebody's actual website used as a bad example on a stranger's sales page.

**Motion is an IntersectionObserver and a CSS transition.** `components/ui/Reveal.tsx`
is the whole animation system. An element starts hidden only when the browser supports
the observer _and_ the visitor has not asked for reduced motion, so no text is ever
gated on JavaScript. The hero's `<h1>` is deliberately never animated: it is the
largest-contentful-paint candidate.

**No Redux, no React Query, no CSS framework, no icon library.** One form and no shared
state; one POST in the site's entire lifetime; sixteen inline SVG icons; CSS Modules
over design tokens. Each of those would have been a dependency bought with nothing.

**The PlayBook is lazy-loaded; nothing else is.** Twenty improvements written out in full,
a forty-point assessment, and a workbook that renders all of it again for print came to
roughly a third of the bundle — carried by every homepage visitor, most of whom never open
it. On a page whose own improvement 07 tells owners to be honest about whether every
script is earning its place, shipping that to everybody was hard to defend. The marketing
pages stay eagerly imported: they are small and share almost all of their components.

**Static HTML per route instead of a rendering framework.** A hundred-line build script
gets crawlable, previewable pages without adopting Next.js for a marketing site. It scales
by content rather than by code: the five industry pages added seventeen lines to
`content/pages.ts` and nothing at all to the build.

**One web font, loaded so it cannot hurt the first paint.** Archivo is the brand typeface
and the only downloaded font — a single variable `woff2` per subset covering weight
400–900 and width 100–125%, which is what lets the wordmark use its expanded extra-bold
cut without a second file. It is served with `display=swap` behind a `preconnect`, so the
first paint uses the system stack still declared in `--font-sans` and never blocks on the
network.

This is a real change from the previous position of _no_ web fonts, and it was bought
rather than assumed: the identity is built on a grotesk with squared terminals that the
system stack cannot supply. What it costs is one connection and one file; what it must
never cost is layout shift, which is why the fallback stack is kept metric-adjacent and
nothing on the first screen is sized in a way that depends on Archivo having arrived.
Swap `--font-sans` in `styles/tokens.css` and the `<link>` in `index.html` to change it.

---

## Known limitations

Stated plainly rather than discovered later:

- **The rate limiter is in-memory.** On Vercel that means per warm function instance,
  not global. Enough to blunt a naive script; a shared store would be the next step if
  abuse ever becomes real.
- **No end-to-end test against a live MongoDB or Resend account.** Both integrations are
  covered by interface-level tests with injected fakes, and the wiring has been type
  checked and built — but the first real submission after deploying is still the
  first real submission. Do it before pointing traffic at the site.
- **The inquiry-type slugs are duplicated** between `client/src/types/api.ts` and
  `server/src/features/leads/lead.types.ts`. Both files have a test pinning the list, so
  drift fails the build rather than reaching production. A shared package would cost a
  build step on every deploy for fifteen lines.
- **The legal pages have not been reviewed by a lawyer**, and say so on screen. They are
  written in plain English by the business and describe what the application actually does
  and what has actually been agreed — which is not the same as being compliant with any
  particular law.
- **The PlayBook workbook is delivered by hand.** A request is stored and the owner is
  notified; the owner prints `/playbook/workbook` to PDF and sends it. That is deliberate
  rather than unfinished — automating a send to a file that does not exist at a stable URL
  would be faking the feature — but it does not scale past a modest volume.
- **No analytics is actually collected.** `lib/analytics.ts` names and fires the funnel
  events, but with no sink configured they go nowhere in production. Until a provider is
  wired in, every conversion question — where people drop out of the hero form, how many
  reach the price — is unanswerable.
- **A visitor who abandons the hero form on step two is lost.** The API has no endpoint
  that accepts a partial lead, and inventing one that drops half-leads into a collection
  nobody reads would be worse than not having it. If `hero_form_step_completed` ever
  turns out to be much larger than `lead_form_submitted`, that is the moment to build it.
- **No admin interface.** Leads are read from MongoDB directly, or from the notification
  email. Building a dashboard before there are leads to look at would be premature.
- **ESLint is pinned to v9** because `eslint-plugin-jsx-a11y` does not yet support v10,
  and accessibility linting was worth more than being on the newest major.
- **Light theme only.** No `prefers-color-scheme` support; adding it means a second
  palette in `styles/tokens.css` and re-checking every contrast pair.
