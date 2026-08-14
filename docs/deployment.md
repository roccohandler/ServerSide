# Deployment

Vercel, from `vercel.json` at the repository root. Every rule in that file is here with the
reasoning behind it.

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

## Build

| Setting           | Value           | Why                                                                                         |
| ----------------- | --------------- | ------------------------------------------------------------------------------------------- |
| `framework`       | `null`          | Auto-detection picked the wrong preset and overrode the build command. Explicitly disabled. |
| `buildCommand`    | `npm run build` | The workspace root script: server build, then client build.                                 |
| `outputDirectory` | `client/dist`   | Vite's output. The API is a serverless function under `api/`, not part of this directory.   |
| `cleanUrls`       | `true`          | `/about` rather than `/about.html`, matching the routes the app generates.                  |
| `trailingSlash`   | `false`         | One canonical URL per page. The prerendered pages and the sitemap agree with this.          |

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

The admin surface, for the same reason: `/admin/projects/:projectId` cannot be prerendered.
Without this rewrite a hard refresh on a project page would 404, because there is no site-wide
SPA fallback.

**This is a routing rule and not a security one.** The rewrite happily serves the document to
anybody. Every request the page then makes is checked against the session by `requireAdmin` on
the server.

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

### `/admin/(.*)` — `Cache-Control: private, no-store`

The admin surface holds every customer's data rather than one customer's, so a shared cache
storing it would be strictly worse than the `/app` case. Same directive, same reason.

### `/assets/(.*)` — `Cache-Control: public, max-age=31536000, immutable`

Vite fingerprints everything in this directory with a content hash, so a given URL's bytes
never change. A year and `immutable` is the correct answer for content-addressed files, and it
is what makes the two `no-store` rules above cheap — the documents are small because the
expensive parts are cached here forever.

## Environment variables

Set in the Vercel dashboard, not in this repository. `.env` is gitignored; `.env.example`
lists the names without values.

`VITE_SITE_URL` in particular must be set in the Vercel project. Without it the build prints:

```
[build-seo] WARNING: VITE_SITE_URL is not set, so canonical URLs point at localhost.
```

and every canonical URL and sitemap entry in the deployed output is wrong.
