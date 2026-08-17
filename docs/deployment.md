# Deployment

Vercel, from `vercel.json` at the repository root. Every rule in that file is here with the
reasoning behind it.

**There are two Vercel projects.** This file covers the first one — the marketing site, the
customer portal and `/api`. The owner console is a second project with its own `vercel.json`
and its own origin; it is documented in [`apps/admin/DEPLOY.md`](../apps/admin/DEPLOY.md) and
nothing about it is configured here.

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

The console project is the opposite case and is set to `apps/admin`; see
[`apps/admin/DEPLOY.md`](../apps/admin/DEPLOY.md).

## Build

| Setting           | Value              | Why                                                                                         |
| ----------------- | ------------------ | ------------------------------------------------------------------------------------------- |
| Root Directory    | _(empty)_          | The repository root. A dashboard setting, not in this file. See above.                      |
| `framework`       | `null`             | Auto-detection picked the wrong preset and overrode the build command. Explicitly disabled. |
| `buildCommand`    | see below          | Server build, then client build. **Not** the root `npm run build`.                          |
| `outputDirectory` | `apps/client/dist` | Vite's output. The API is a serverless function under `api/`, not part of this directory.   |
| `cleanUrls`       | `true`             | `/about` rather than `/about.html`, matching the routes the app generates.                  |
| `trailingSlash`   | `false`            | One canonical URL per page. The prerendered pages and the sitemap agree with this.          |

### Why the build command names two workspaces instead of running `npm run build`

The root `npm run build` builds all three workspaces, including the console — and the console
is not deployed by this project. Running it here would mean **a broken console blocks a
marketing-site deploy**, which is a coupling between two things that were separated precisely
so they could fail independently.

So each project builds exactly what it uploads: this one runs `build:server` (the API function
imports `@jobforge/server`'s compiled output) then `build:client`; the console project runs
`build:admin` and nothing else. `packages/ui` and `packages/shared` are consumed as TypeScript
source and have no build step, which is why neither list mentions them.

The root `npm run build` keeps building all three — it is what `npm run verify` runs, and what
`apps/admin/src/app/bundle.test.ts` needs a `dist/` from.

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

### There is no `/admin` rewrite, and its absence is the design

This project used to carry `/admin/(.*)` → `/admin` alongside the rule above, for the same
prerendering reason. DECISION 027 moved the console into `apps/admin`, so **this deployment no
longer serves an admin document at all** — a hard refresh on `/admin` is a genuine 404 with the
404 page, which is the correct answer here.

Do not add the rule back to make a URL work. If `/admin` is being requested against this
origin, the console is being looked for in the wrong place; its own project answers `/(.*)`
with its own document.

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

The console needs the same directive for a stronger reason — it holds every customer's data
rather than one customer's — and gets it from its own project, where the rule is applied to
`/(.*)` because every page there is privileged. That is one of the things the separate
`vercel.json` buys: the header does not have to be scoped correctly, because there is nothing
public on that origin to scope it away from.

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
