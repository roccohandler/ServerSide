# Deploying the owner console

**The console is served by the customer project, at `/admin`.** One Vercel project, two
bundles. DECISION 034.

That is not a merge. `apps/admin` is still its own application with its own document, its own
JavaScript and its own CSS — a visitor to the homepage downloads none of it — and the two
frontends still import nothing from each other, in either direction, enforced by ESLint. What
changed is which origin serves the files.

## What it takes to deploy: nothing

There is no second project to create and no setting to remember. The customer project's build
command runs `build:web`, which builds both apps and then copies `apps/admin/dist` into
`apps/client/dist/admin`. `scripts/place-console.ts` is that copy, and its header is the long
version of everything below.

Two things in the root `vercel.json` finish it:

| Rule                                 | Why                                                            |
| ------------------------------------ | -------------------------------------------------------------- |
| `/admin/(.*)` → `/admin`             | Deep links. `/admin/inbox` is a client-side route, not a file. |
| `/admin(/.*)?` → `private, no-store` | Every page here is one operator looking at every customer.     |

The console's documents also carry `X-Robots-Tag: noindex, nofollow` and
`Referrer-Policy: no-referrer`, which is what `apps/admin/vercel.json` gave them when this was
its own project.

## Why one origin, when separating them was the whole point of DECISION 027

Because the session cookie is `SameSite=Lax`, and `SameSite` is evaluated on the **site** — the
registrable domain — not the origin. `vercel.app` is on the Public Suffix List, so this:

```
https://jobforge-admin.vercel.app  →  https://jobforge.vercel.app/api        ❌ two sites
```

is two sites, and the browser sends no cookie at all. **Sign-in appears to succeed and the
console immediately shows the sign-in form again** — no error, no failed request, a perfectly
healthy server. The documented fix was "attach a real domain to both projects", which is
correct, and which put a domain purchase between the owner and their own console.

**What DECISION 027 actually bought was two bundles, not two origins.** That is the property
the customer's payload budget cares about, and it survives this untouched.

What is given up is that `/admin` is guessable on the public origin again. That is obscurity,
not security: `requireAdmin` answers `NOT_FOUND` to every non-admin, `apps/server` is the only
security boundary, and no bundle contains a secret. It is written down rather than hoped about.

This is reversible. The day a real domain exists, `admin.example.com` is a better home for the
console, and getting back there is: a second Vercel project rooted at `apps/admin`, `base` back
to `/`, and the `/admin` rewrite deleted. The rest of this file is what that would need.

## Locally

`npm run dev` starts all three. The console is at **`http://localhost:5174/admin/`** — the
trailing path, not the bare port, because `base` is `/admin/` in every environment. Both apps
proxy `/api` to the same Express server, so development is same-origin and always was.

## If it ever goes back to its own project

Set **Root Directory** to `apps/admin` and turn on **Include source files outside of the Root
Directory** — the build runs `npm run build:admin` from the repository root so the workspace
links resolve. `apps/admin/vercel.json` is still here and still correct for that shape.

Then three values have to agree. They are one decision — _which origin is the console on_ —
written in three places:

| Where                                     | Set to                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| `VITE_API_BASE_URL` on **this** project   | the API's origin, e.g. `https://www.jobforge.example` |
| `connect-src` in `apps/admin/vercel.json` | the same origin, added after `'self'`                 |
| `CLIENT_ORIGIN` on the **API** project    | the customer origin **and** this one, comma-separated |

`VITE_API_BASE_URL` is deliberately **unset** in the single-project shape: unset means the
empty string, which makes every request relative and therefore same-origin. That is why the
console needs no environment variable at all today.

`CLIENT_ORIGIN` is a comma-separated allowlist and **never `*`** — these requests carry the
session cookie, so a wildcard would let any page on the internet make authenticated calls on
the owner's behalf. See the long note in `apps/server/src/config/env.ts`.

### What each failure looks like

Worth knowing, because two of the three fail in the browser rather than in a build log:

- **`VITE_API_BASE_URL` unset** — the console fetches `admin.example.com/api/…`, which is
  itself. Every request 404s and the inbox shows "The server could not be reached." (In the
  single-project shape this is the _correct_ configuration, because itself is the right answer.)
- **`connect-src` not updated** — the browser blocks the request before it is sent. The console
  shows the same network error and the reason is only in the dev-tools console.
- **`CLIENT_ORIGIN` missing this origin** — the server answers, the browser discards the
  response because there are no CORS headers on it, and sign-in appears to do nothing.

All three produce "it does not work" with a perfectly healthy server, which is why they are
one table rather than three scattered notes.

## The fourth thing the CSP governs, found the same way

`index.html` loads Archivo from Google Fonts, and the policy did not allow it — so `style-src`
blocked the stylesheet and the console rendered in the system fallback, with the reason visible
only in the dev-tools console. The customer application had the same gap and the same symptom.

Both policies now carry the two entries a webfont needs, and they are two rather than one
because the CSS and the font file come from different hosts:

| Directive   | Entry                          | What it permits                             |
| ----------- | ------------------------------ | ------------------------------------------- |
| `style-src` | `https://fonts.googleapis.com` | the `@font-face` stylesheet                 |
| `font-src`  | `https://fonts.gstatic.com`    | the `woff2` files that stylesheet points at |

Adding only the first is the trap: the stylesheet loads, the browser then blocks every font
file it references, and the page still renders in the fallback with nothing obviously wrong.

In the single-project shape the console is covered by the **root** `vercel.json` policy, which
already carries both. `scripts/check-csp.ts` proves the inline theme bootstrap is allowed by
each policy on every `npm run verify`, and it asserts the two documents ship the identical
script — which is what lets one hash serve both.

## What is deliberately not deployed here

**No API.** There is no `api/` directory in this project and there must not be one. A second
copy of the server would be a second place authorisation is decided, and the two would
disagree the first time one was fixed.

**No secrets.** Everything in this bundle reaches a browser. The `VITE_` prefix is the rule
Vite enforces; the rule here is stronger — nothing that is not already public may be set on
this project at all.
