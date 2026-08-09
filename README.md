# ServiceSide

A lead-generation website for a web development business serving local service
businesses — HVAC, plumbing, electrical, roofing, landscaping and similar trades — in
the Greater Seattle area.

One job: get a service-business owner to make contact.

- **`client/`** — React + TypeScript marketing site (Vite)
- **`server/`** — Express + TypeScript API that validates, stores and notifies on leads
- **`api/`** — a nine-line Vercel adapter around the Express app

---

## Contents

1. [Requirements](#requirements)
2. [Local installation](#local-installation)
3. [Replacing the placeholders](#replacing-the-placeholders)
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
git clone <your-repo-url> serviceside
cd serviceside
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

## Replacing the placeholders

The business name, phone number, pricing and personal details are not invented anywhere
in this repository. They are written as `[PLACEHOLDER]` tokens, all of which live in
`client/src/content/`.

**In development the site shows a banner at the top listing every placeholder that is
still in place.** That banner is the authoritative checklist — it disappears from the
production bundle entirely. Until a value is replaced:

- the phone number and email render as plain text rather than as dead `tel:`/`mailto:` links;
- `ProfessionalService` structured data is omitted from the built HTML rather than
  published with a fake business name.

| Placeholder                      | File                                  | What it needs                                       |
| -------------------------------- | ------------------------------------- | --------------------------------------------------- |
| `[BUSINESS_NAME]`                | `content/site.ts`                     | Trading name, used in the header, footer and titles |
| `[OWNER_NAME]`                   | `content/site.ts`                     | Your name                                           |
| `[PHONE_NUMBER]`                 | `content/site.ts`                     | e.g. `(206) 555-0134`                               |
| `[BUSINESS_EMAIL]`               | `content/site.ts`                     | Public contact address                              |
| `[CONTACT_HOURS]`                | `content/site.ts`                     | When calls are answered — or delete the line        |
| `[PRICING_APPROACH]`             | `content/home.ts`, `content/trust.ts` | One sentence on how you price                       |
| `[PRICING_ANSWER]`               | `content/faq.ts`                      | The real answer to "what does it cost?"             |
| `[TIMELINE_ANSWER]`              | `content/faq.ts`                      | Typical turnaround                                  |
| `[SERVICE_AREA_ANSWER]`          | `content/faq.ts`                      | Whether you work outside Greater Seattle            |
| `[ABOUT_INTRO]`                  | `content/about.ts`                    | One or two sentences introducing yourself           |
| `[ABOUT_WHO_I_AM]`               | `content/about.ts`                    | Background — specific beats impressive              |
| `[ABOUT_WHY_SERVICE_BUSINESSES]` | `content/about.ts`                    | Your actual reason for this focus                   |
| `[DATA_RETENTION_POLICY]`        | `content/legal.ts`                    | How long enquiries are kept                         |
| `[PROJECT_TERMS]`                | `content/legal.ts`                    | How project work is agreed                          |

Also worth doing before launch:

- **Turning the free review off.** Set `site.offer.freeReview.enabled` to `false` in
  `content/site.ts`. Every mention of a free review disappears and the primary button
  falls back to `cta.primaryFallback`. Nothing else needs editing.
- **The social preview image.** `client/public/og-image.svg` is on-brand but most social
  platforms will not render SVG. Export a 1200×630 PNG to `client/public/og-image.png`
  and update `seo.ogImage` / `seo.ogImageType` in `content/site.ts`.
- **The legal pages.** `content/legal.ts` describes what the application actually does.
  It is not a reviewed privacy policy, and the pages say so on screen. Replace them.
- **The examples.** Everything in `content/portfolio.ts` is flagged `isDemo: true` and
  renders a visible "Demonstration" badge. Real client work goes in with `isDemo: false`.

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
| `CLIENT_ORIGIN`                  | no                              | –                 | Comma-separated CORS allow list. Leave unset for same-origin         |
| `LOG_LEVEL`                      | no                              | `info`            | `debug` \| `info` \| `warn` \| `error` \| `silent`                   |
| `LEAD_RATE_LIMIT_WINDOW_MINUTES` | no                              | `15`              | Rate-limit window                                                    |
| `LEAD_RATE_LIMIT_MAX`            | no                              | `5`               | Submissions per IP per window                                        |
| `TRUST_PROXY_HOPS`               | no                              | `1` in production | Proxies in front of the app                                          |

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
   MONGODB_URI=mongodb+srv://user:pass@cluster0.abc.mongodb.net/serviceside?retryWrites=true&w=majority
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

| Symptom                                                           | Cause and fix                                                                                                                                                                |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel build fails within seconds, during `npm install`           | `NODE_ENV=production` is set in Vercel's environment variables. Delete it and redeploy — npm omits devDependencies when it sees it, so `tsc` and `vite` are never installed. |
| Build succeeds, then `No Output Directory named "dist" found`     | Vercel's Root Directory is set to `client/` instead of the repository root, so `vercel.json` is never read. Fix it in **Settings → General → Root Directory**.               |
| Only the client builds — no `@serviceside/server` line in the log | Same cause as above: Vercel auto-detected the Vite app and ignored `vercel.json`.                                                                                            |
| Server exits with "Invalid environment configuration"             | A required production variable is missing. The message lists all of them.                                                                                                    |
| Form returns 503 "we could not save your request"                 | `MONGODB_URI` is unset or unreachable. This is deliberate — the form never claims success it cannot back up.                                                                 |
| Lead is in MongoDB but no email arrived                           | Resend failed. Look for `lead.notification_failed` in the logs, and for `notificationStatus: "failed"` on the lead. Persisting first is intentional; see below.              |
| Resend returns "domain not verified"                              | The domain in `RESEND_FROM_EMAIL` is not verified, or the DNS records have not propagated.                                                                                   |
| MongoDB times out on Vercel but works locally                     | Atlas Network Access does not include `0.0.0.0/0`.                                                                                                                           |
| Form returns 429                                                  | The rate limit is doing its job. Defaults are 5 per IP per 15 minutes; tune with `LEAD_RATE_LIMIT_*`.                                                                        |
| `/about` 404s on Vercel                                           | `cleanUrls` is not applied, or the build did not run `build-seo`. Check the build log for `[build-seo] wrote 8 pages`.                                                       |
| Link previews show the wrong title                                | `VITE_SITE_URL` was not set at build time, or the build ran without step 3. Redeploy.                                                                                        |
| Browser console: blocked by CSP                                   | The CSP in `vercel.json` allows same-origin only. Adding a third-party script means adding it there deliberately.                                                            |
| Dev banner listing placeholders                                   | Working as intended. It never ships to production.                                                                                                                           |

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
    ├── infrastructure/       mongoose connection, Resend transport
    ├── middleware/           errors, 404, rate limit, request context
    ├── lib/                  AppError, logger, API envelope, HTML escaping
    └── testing/              in-memory fakes
```

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

**No Redux, no React Query, no CSS framework, no icon library.** One form and no shared
state; one POST in the site's entire lifetime; sixteen inline SVG icons; CSS Modules
over design tokens. Each of those would have been a dependency bought with nothing.

**Static HTML per route instead of a rendering framework.** A hundred-line build script
gets crawlable, previewable pages without adopting Next.js for a five-page site.

**System font stack.** Nothing to download, nothing blocking first paint, no layout
shift when a web font swaps in. Swap `--font-sans` in `styles/tokens.css` to change it.

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
- **`og-image.svg` will not render on most social platforms.** Replace it with a PNG; see
  [Replacing the placeholders](#replacing-the-placeholders).
- **The inquiry-type slugs are duplicated** between `client/src/types/api.ts` and
  `server/src/features/leads/lead.types.ts`. Both files have a test pinning the list, so
  drift fails the build rather than reaching production. A shared package would cost a
  build step on every deploy for fifteen lines.
- **The legal pages are placeholders** and say so on screen. They have not been reviewed
  by a lawyer.
- **No analytics.** There is a clean place to add it — `SiteLayout` already tracks route
  changes — but nothing is installed and nothing is tracked.
- **No admin interface.** Leads are read from MongoDB directly, or from the notification
  email. Building a dashboard before there are leads to look at would be premature.
- **ESLint is pinned to v9** because `eslint-plugin-jsx-a11y` does not yet support v10,
  and accessibility linting was worth more than being on the newest major.
- **Light theme only.** No `prefers-color-scheme` support; adding it means a second
  palette in `styles/tokens.css` and re-checking every contrast pair.
