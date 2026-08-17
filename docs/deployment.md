# Deployment

Vercel, from `vercel.json` at the repository root. Every rule in that file is here with the
reasoning behind it.

**There is one Vercel project, and it serves both applications.** The marketing site, the
customer portal, `/api`, and — since DECISION 034 — the owner console at `/admin`. Two
bundles, one origin. The console's half is documented in
[`apps/admin/DEPLOY.md`](../apps/admin/DEPLOY.md); the rules that make it work are here,
because they are rules in this file.

## Why the reasoning is in this file and not in `vercel.json`

It used to be in `vercel.json`, as `"//"` keys sitting beside the rules they explained. That
is a common JSON-comment convention and Vercel rejects it:

```
The `vercel.json` schema validation failed with the following message:
`headers[0].headers[0]` should NOT have additional property `//`
```

Vercel validates `vercel.json` against a published schema, and the objects inside `rewrites[]`,
`headers[]` and `headers[].headers[]` are all closed — a header entry may carry `key` and
`value` and nothing else. The build fails before it starts, so this is not a warning that can
be lived with.

Note that the error names only the _first_ offending property. There were five `"//"` keys and
removing the one Vercel printed would simply have produced the same failure on the next. If you
are tempted to annotate a rule in `vercel.json`, annotate it here instead.

## The Root Directory is the repository root, and it is a dashboard setting

**Set Root Directory to the repository root — leave it empty.** Not `client`, not `apps/client`.

This is the one deployment setting that lives only in Vercel's project settings and cannot be
expressed in `vercel.json`, which is exactly why it is the one that goes stale. Everything in
that file assumes the repository root: `outputDirectory` is `apps/client/dist`, the serverless
function is `api/index.ts`, and the build command reaches two workspaces. Point the root
anywhere below the top of the repository and none of those paths resolve.

It bit once, on 2026-08-17, and the failure is worth recognising because it is not a code error:

```
The specified Root Directory "client" does not exist. Please update your Project Settings.
```

`client/` was the root before DECISION 026 moved the codebase into `apps/*`. A directory move
is a commit; a Vercel project setting is not, so the setting kept pointing at a path that had
stopped existing and every build failed in under two seconds, before a single file was
compiled. Nothing in the repository could have caught it — which is why it is written down here
rather than guarded by a script.

There is no second project to set this on any more — see the console section below.

## Build

| Setting           | Value              | Why                                                                                         |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| Root Directory    | _(empty)_          | The repository root. A dashboard setting, not in this file. See above.                      |
| `framework`       | `null`             | Auto-detection picked the wrong preset and overrode the build command. Explicitly disabled. |
| `buildCommand`    | see below          | Server build, then both frontends. **Not** the root `npm run build`.                        |
| `outputDirectory` | `apps/client/dist` | Vite's output. The API is a serverless function under `api/`, not part of this directory.   |
| `cleanUrls`       | `true`             | `/about` rather than `/about.html`, matching the routes the app generates.                  |
| `trailingSlash`   | `false`            | One canonical URL per page. The prerendered pages and the sitemap agree with this.          |

### Why the build command is `build:server && build:web` rather than `npm run build`

It is now almost the same thing, and the difference is worth keeping anyway.

`build:web` builds the customer application, then the console, then runs
`scripts/place-console.ts` — which copies `apps/admin/dist` into `apps/client/dist/admin` so
one `outputDirectory` contains both. **The order is load-bearing**: `build:client` empties
`apps/client/dist`, so a console placed before it is deleted by the build that follows,
silently, leaving a `/admin` that 404s on a deploy whose log is entirely green.

`build:server` is separate because the API function imports `@jobforge/server`'s compiled
output, and naming it here rather than inheriting the root script keeps the deployed command
readable in the dashboard. `packages/ui` and `packages/shared` are consumed as TypeScript
source and have no build step, which is why neither is mentioned.

The root `npm run build` is `build:server && build:web` — the same thing — so `npm run verify`
exercises exactly what Vercel runs, including the copy. That was not true before DECISION 034,
and it is the reason to keep the two spellings in step.

## Rewrites

### `/api/(.*)` → `/api/index`

Everything under `/api` is handled by the single serverless entry point, which mounts the
Express app.

### `/app/(.*)` → `/app`

The private application is the one part of the site with URLs that cannot be prerendered:
`/app/projects/:projectId` is different for every customer. Everything under `/app` is served
the `/app` document and React Router takes over.

Deliberately scoped to `/app` rather than a site-wide fallback, so a typo on the marketing site
is still a real 404 with the 404 page rather than a homepage that quietly pretends the URL
exists.

### `/admin/(.*)` → `/admin`

The owner console, and it is a **different document from `/app`** rather than another route
inside it. `apps/client/dist/admin/index.html` is `apps/admin`'s own build: its own JavaScript,
its own CSS, its own `<title>`. Nothing about it is in the customer bundle, and a visitor to
the homepage downloads none of it.

The rewrite is here for the reason the `/app` one is: `/admin/projects/:id` is a client-side
route with no file behind it. Static files win over rewrites on Vercel, so `/admin/assets/…`
is still served from disk and only the routes fall through.

**This rule was deleted by DECISION 027 and restored by DECISION 034.** The console had its own
Vercel project and its own origin for exactly as long as it took to discover that
`SameSite=Lax` is evaluated on the registrable domain, `vercel.app` is on the Public Suffix
List, and two `*.vercel.app` names therefore exchange no cookies at all — so the console signed
in and bounced straight back to its form, on a healthy server, with nothing in any log. The
documented fix was to buy a domain.

What DECISION 027 was actually for was **two bundles**, and that survived: this is one origin
serving two applications, not one application with an admin section. The cost is that `/admin`
is guessable here again, which is obscurity rather than security — `requireAdmin` answers
`NOT_FOUND` to every non-admin and the server is the only boundary. See
[`apps/admin/DEPLOY.md`](../apps/admin/DEPLOY.md) for how to split it apart again once a real
domain exists.

## Headers

### `/(.*)` — the site-wide security headers

**`Content-Security-Policy`.** Google Identity Services is the one external origin the site
loads anything from, and each directive is the minimum that flow needs: the script itself
(`script-src`), the iframe its button renders in (`frame-src`), the stylesheet it injects
(`style-src`), and the endpoint that iframe talks to (`connect-src`).

`accounts.google.com` is not permitted to do anything else — no `img-src`, no `font-src`, no
wildcard. The ID token it produces is verified server-side against Google's published keys, so
nothing here is trusted on the strength of having come from that origin.

`style-src` carries `'unsafe-inline'` because the Google button injects inline styles. That is
the one concession in the policy and it is scoped to styles, which cannot execute.

The rest — `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
`Permissions-Policy`, `Strict-Transport-Security` — are the standard set, and
`frame-ancestors 'none'` in the CSP is what actually enforces the framing rule in modern
browsers. `X-Frame-Options` is kept for older ones.

### `/app/(.*)` — `Cache-Control: private, no-store`

The private application must never be cached by a shared proxy: a dashboard is one customer's
data behind a cookie, and a CDN that stored it could hand it to the next person through. The
documents themselves are cheap; the hashed assets are what actually needs caching.

### `/admin(/.*)?` — `private, no-store`, `noindex`, and no referrer

The same directive for a stronger reason: the console holds **every** customer's data rather
than one customer's. It also carries `X-Robots-Tag: noindex, nofollow`, which the customer
application does not need and the console does now that it lives on an indexable origin, and
`Referrer-Policy: no-referrer`, which overrides the site-wide `strict-origin-when-cross-origin`
so a console URL never leaves in a header.

The pattern is `(/.*)?` rather than `/(.*)` so it matches the bare `/admin` as well as
everything under it. `/admin/(.*)` would have left the console's own front page — the one URL
somebody actually types — with the marketing site's cache header on it.

`/admin/assets/(.*)` is then given the year-long immutable cache back, because those files are
content-hashed exactly as the customer application's are, and a `no-store` on fingerprinted
assets would re-download the whole console on every full page load.

**This is the first place in the file where two rules set the same header key**, and it relies
on the later one winning. Everywhere else the site-wide block and the specific block set
disjoint keys, so the question never came up. If it turns out to resolve the other way, the
symptom is a console that reloads 130 kB it already had — slow, not broken — and the fix is to
narrow the rule above rather than to widen this one. Worth checking once against a deployed
response; it is not worth guessing about twice.

### `/assets/(.*)` — `Cache-Control: public, max-age=31536000, immutable`

Vite fingerprints everything in this directory with a content hash, so a given URL's bytes
never change. A year and `immutable` is the correct answer for content-addressed files, and it
is what makes the `no-store` rule above cheap — the documents are small because the expensive
parts are cached here forever.

## Environment variables

Set in the Vercel dashboard, not in this repository. `.env` is gitignored; `.env.example`
lists the names without values.

`VITE_SITE_URL` in particular must be set in the Vercel project. Without it the build prints:

```
[build-seo] WARNING: VITE_SITE_URL is not set, so canonical URLs point at localhost.
```

and every canonical URL and sitemap entry in the deployed output is wrong.
