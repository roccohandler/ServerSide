# Deploying the owner console

The console is a **second Vercel project** against the same repository. It is not a second
domain pointed at the same build — it is a different bundle, and a customer's browser must
never download it.

| Project        | Root directory | Serves                                     |
| -------------- | -------------- | ------------------------------------------ |
| jobforge       | repo root      | the marketing site, the portal, and `/api` |
| jobforge-admin | `apps/admin`   | this console                               |

Create the second project in Vercel, set **Root Directory** to `apps/admin`, and turn on
**Include source files outside of the Root Directory** — the build runs `npm run build:admin`
from the repository root so the workspace links resolve. `apps/admin/vercel.json` supplies the
rest.

## The three values that have to agree

This is the whole deployment, and getting one of the three wrong is the only way it fails.
They are listed together because they are one decision — _which origin is the console on_ —
written in three places.

| Where                                     | Set to                                                |
| ----------------------------------------- | ----------------------------------------------------- |
| `VITE_API_BASE_URL` on **this** project   | the API's origin, e.g. `https://www.jobforge.example` |
| `connect-src` in `apps/admin/vercel.json` | the same origin, added after `'self'`                 |
| `CLIENT_ORIGIN` on the **API** project    | the customer origin **and** this one, comma-separated |

`CLIENT_ORIGIN` is a comma-separated allowlist and **never `*`** — these requests carry the
session cookie, so a wildcard would let any page on the internet make authenticated calls on
the owner's behalf. See the long note in `apps/server/src/config/env.ts`.

### What each failure looks like

Worth knowing, because two of the three fail in the browser rather than in a build log:

- **`VITE_API_BASE_URL` unset** — the console fetches `admin.example.com/api/…`, which is
  itself. Every request 404s and the inbox shows "The server could not be reached." It is the
  same variable name the customer application reads, holding a different value here, because
  two spellings of one question is how this gets set on the wrong project and still looks set.
- **`connect-src` not updated** — the browser blocks the request before it is sent. The console
  shows the same network error and the reason is only in the dev-tools console.
- **`CLIENT_ORIGIN` missing this origin** — the server answers, the browser discards the
  response because there are no CORS headers on it, and sign-in appears to do nothing.

All three produce "it does not work" with a perfectly healthy server, which is why they are
one table rather than three scattered notes.

### The fourth thing the CSP governs, found the same way

`index.html` loads Archivo from Google Fonts, and the policy above did not allow it — so
`style-src` blocked the stylesheet and the console rendered in the system fallback, with the
reason visible only in the dev-tools console. The customer application had the same gap and
the same symptom: the brand typeface named first in `--font-sans` never arrived in
production, on both origins, and nothing said so.

Both policies now carry the two entries a webfont needs, and they are two rather than one
because the CSS and the font file come from different hosts:

| Directive   | Entry                          | What it permits                             |
| ----------- | ------------------------------ | ------------------------------------------- |
| `style-src` | `https://fonts.googleapis.com` | the `@font-face` stylesheet                 |
| `font-src`  | `https://fonts.gstatic.com`    | the `woff2` files that stylesheet points at |

Adding only the first is the trap: the stylesheet loads, the browser then blocks every font
file it references, and the page still renders in the fallback with nothing obviously wrong.

## The console must be a subdomain of the API's domain

Not a preference — the console does not work otherwise, and it fails silently.

The session cookie is `SameSite=Lax`, and `SameSite` is evaluated on the **site** (the
registrable domain), not the origin. So this is fine:

```
https://admin.jobforge.example   →   https://www.jobforge.example/api      ✅ same site
```

and this is not:

```
https://jobforge-admin.vercel.app →  https://jobforge.vercel.app/api       ❌ two sites
```

`vercel.app` is on the Public Suffix List, so two `*.vercel.app` names are two different
sites and the browser sends no cookie at all. **Sign-in appears to succeed and the console
immediately shows the sign-in form again** — no error, no failed request, a perfectly healthy
server. Do not try to debug that as an auth bug; it is this.

Which means: attach a real domain to both projects before using the console, or test it
locally where both apps proxy `/api` to the same Express server and everything is
same-origin. The reasoning behind refusing `SameSite=None` instead is in
`apps/server/src/features/auth/auth.cookies.ts`.

Nothing in this project touches the cookie. `credentials: 'include'` in `src/lib/api.ts` is
the only thing that has to be true here, and the cookie is `HttpOnly`, so this bundle cannot
read it either way.

## What is deliberately not deployed here

**No API.** There is no `api/` directory in this project and there must not be one. A second
copy of the server would be a second place authorisation is decided, and the two would
disagree the first time one was fixed.

**No secrets.** Everything in this bundle reaches a browser. The `VITE_` prefix is the rule
Vite enforces; the rule here is stronger — nothing that is not already public may be set on
this project at all.
