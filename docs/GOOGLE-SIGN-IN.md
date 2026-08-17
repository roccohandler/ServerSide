# Google Sign-In

How "Continue with Google" is set up, what it does, and what happens when it is not
configured.

No secrets appear in this document, and none are needed — see [§2](#2-there-is-no-client-secret).

---

## 1. What the button does

```
Browser                          Server                        Google
   │                                │                             │
   │  GET /api/auth/config          │                             │
   │───────────────────────────────►│                             │
   │  { googleEnabled, clientId }   │                             │
   │◄───────────────────────────────│                             │
   │                                │                             │
   │  loads accounts.google.com/gsi/client                        │
   │─────────────────────────────────────────────────────────────►│
   │  signed ID token (JWT)                                       │
   │◄─────────────────────────────────────────────────────────────│
   │                                │                             │
   │  POST /api/auth/google         │                             │
   │  { credential }                │                             │
   │───────────────────────────────►│                             │
   │                                │  GET /oauth2/v3/certs       │
   │                                │────────────────────────────►│
   │                                │  JWKS (cached)              │
   │                                │◄────────────────────────────│
   │                                │                             │
   │                                │ verify RS256, aud, iss, exp │
   │                                │ find or create the user     │
   │                                │ issue a JobForge session    │
   │  Set-Cookie: jobforge_session  │                             │
   │◄───────────────────────────────│                             │
```

The browser never decides anything. It hands over an opaque credential; the server
decides whether it is real and who it belongs to.

Verification lives in
[`apps/server/src/features/auth/providers/google.verifier.ts`](../server/src/features/auth/providers/google.verifier.ts)
and is tested against real RSA signatures — including forged ones — in the file beside
it.

---

## 2. There is no client secret

This flow does not exchange an authorization code, so there is no secret to store,
rotate or leak. What Google returns is a **signed ID token**, and the server verifies
the signature against Google's published public keys.

If you find yourself adding `GOOGLE_CLIENT_SECRET` to `.env`, something has gone wrong.

The **client id** is public by design — it ships to the browser either way. It is served
from `/api/auth/config` rather than inlined at build time, so one build can be deployed
against a development client and a production client without rebuilding.

---

## 3. Google Cloud setup

You need **two** OAuth clients, because a client's authorised origins are exact and
`localhost` is not the live domain.

### 3.1 The project

1. Open <https://console.cloud.google.com/>.
2. Create a project, or pick the existing one.

### 3.2 The consent screen

**APIs & Services → OAuth consent screen.**

| Field              | Value                                       |
| ------------------ | ------------------------------------------- |
| User type          | External                                    |
| App name           | JobForge                                    |
| User support email | your support address                        |
| App logo           | optional                                    |
| Authorised domains | your production domain, without a scheme    |
| Developer contact  | your email address                          |
| Scopes             | `openid`, `email`, `profile` — nothing else |

Only those three scopes. This integration reads a person's email address, their name and
Google's stable id for them; it does not ask for a single thing more, and adding a scope
would put the app in front of a verification review it does not need.

Publishing status can stay **Testing** while you are the only person signing in — add
your own address under _Test users_. Move it to **In production** before customers do.

### 3.3 The development client

**APIs & Services → Credentials → Create credentials → OAuth client ID.**

| Field                         | Value                   |
| ----------------------------- | ----------------------- |
| Application type              | Web application         |
| Name                          | JobForge (development)  |
| Authorised JavaScript origins | `http://localhost:5173` |
| Authorised redirect URIs      | _(leave empty)_         |

No redirect URI is required. Google Identity Services posts the credential back to the
page that asked for it; nothing navigates away.

If you run the Vite dev server on a different port, that port goes here instead — the
origin has to match exactly, scheme and port included.

### 3.4 The production client

Create a second client with the same settings and:

| Field                         | Value                     |
| ----------------------------- | ------------------------- |
| Name                          | JobForge (production)     |
| Authorised JavaScript origins | `https://www.example.com` |

HTTPS, and no trailing slash. If the site answers on both the apex and the `www`
subdomain, list both — a redirect between them happens before the script loads, so only
the one the browser ends up on matters, but listing both costs nothing.

---

## 4. Configuration

### Development

```bash
# .env at the repository root
GOOGLE_CLIENT_ID=000000000000-development.apps.googleusercontent.com
```

Restart the server; the client picks the change up on its next load.

### Production

Set `GOOGLE_CLIENT_ID` to the **production** client id in the host's environment
settings (on Vercel: _Project → Settings → Environment Variables_, scoped to
Production), and redeploy.

The two are independent. A production credential in a local `.env` will not work — the
origin will not match — and that is the point.

---

## 5. What happens when it is not configured

The button is **always rendered**. There is no `import.meta.env.PROD` anywhere in
[`GoogleSignInButton.tsx`](../apps/client/src/features/auth/components/GoogleSignInButton.tsx),
and no branch that decides whether the option exists.

| State                      | What the visitor sees                            |
| -------------------------- | ------------------------------------------------ |
| Configured, script loaded  | Google's own button; signing in works            |
| Configured, script blocked | The JobForge-styled button; pressing it explains |
| Not configured             | The JobForge-styled button; pressing it explains |

Pressing it in either of the last two states shows:

> Google sign-in is not available here yet. Use your email address and password —
> everything works exactly the same either way.

Nothing crashes, no Google user is invented, and no authentication is bypassed. The
server backs this up: `POST /api/auth/google` with no client id configured answers
**503** with the same instruction, not a 500 and not a session.

A sign-in page that hides the button locally is a page nobody develops against, and the
first person to find out it is broken is a customer.

---

## 6. Account linking

The rule when somebody signs in with Google and an account already exists for that
address. Implemented and commented in
[`auth.service.ts`](../apps/server/src/features/auth/auth.service.ts); tested in
`auth.service.test.ts`.

| Case                                            | What happens                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------- |
| Google says the address is **not** verified     | **Refused.** 403, no account created, no link made.                     |
| A returning Google user (matched on subject id) | Signed in.                                                              |
| Existing account, **email verified**            | Linked. Both ways in now work.                                          |
| Existing account, **email not verified**        | Linked — and the password is **removed** and every session **revoked**. |
| No existing account                             | Created, already verified.                                              |

### Why the fourth row does that

It is the **pre-hijack attack**. Somebody registers `victim@example.com` with a password
and never verifies it. Later the real owner arrives through Google. Linking naively
would hand the attacker a live password into the victim's account.

Google has _proven_ the address; the local account never did. So the link happens, the
credential the attacker set is removed, and every session it opened stops working. The
rightful owner keeps the account and can set a password through the reset flow, which
proves control of the mailbox first.

### Why matching is on the subject id, not the email

Email addresses get reassigned inside Google Workspace domains. Subject ids do not. A
returning user is found by `sub`; the email is only used to detect a _first_ link.

### Duplicate prevention

Two unique indexes, so it holds under concurrent signups rather than by convention:

- `email` — one account per address.
- `identities.subject` (sparse) — one account per Google account.

---

## 7. Authorization is unaffected

Google is an authentication provider. It has no effect on what anybody may do.

```
Google / email + password  →  User  →  role  →  capabilities  →  route + resource
```

- Every account created through Google gets `role: 'customer'`, the same as any other.
- There is no code path anywhere that reads "signed in with Google".
- Staff cannot be inferred from an email address. `auth.service.test.ts` asserts that
  `admin@jobforge.example` signing in through Google is still a customer.
- Making somebody an admin is a deliberate database write. No route sets a role, and the
  signup schema has no field for one — a body carrying `role` is rejected as
  unreadable rather than silently stripped.

---

## 8. Content Security Policy

Google Identity Services is the only external origin the site loads anything from.
[`vercel.json`](../vercel.json) permits exactly what the flow needs and nothing else:

```
script-src  'self' https://accounts.google.com/gsi/client
style-src   'self' 'unsafe-inline' https://accounts.google.com/gsi/style
connect-src 'self' https://accounts.google.com/gsi/
frame-src   https://accounts.google.com/gsi/
```

No `img-src` for that origin, no wildcard. The Google mark is inline SVG.

If the button renders but nothing happens when it is pressed, check the browser console
for a CSP violation first — that is what a missing directive looks like.

---

## 9. Testing it

### Automatically

```bash
npm run test:run
```

Covering, among others:

| File                                     | What it pins                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `providers/google.verifier.test.ts`      | Real RS256 verification, and forgeries: `alg: none`, HS256 signed with the public key, a token for a different `aud`, expired, tampered, wrong key |
| `auth.service.test.ts`                   | Account linking, including the pre-hijack case; that Google grants no extra privilege                                                              |
| `auth.api.test.ts`                       | The button's config endpoint, the 503 when unconfigured, and that a body cannot supply its own identity claims                                     |
| `components/GoogleSignInButton.test.tsx` | That the button renders in every state, and explains itself when it cannot work                                                                    |

### By hand, locally

1. `npm run dev`
2. Open <http://localhost:5173/login>.
3. **Without** `GOOGLE_CLIENT_ID`: the button is there. Press it — you get the message,
   and the page still works.
4. **With** `GOOGLE_CLIENT_ID` set to a development client: Google's own button renders.
   Signing in lands you on `/app`.

### Verifying production

The only way to know is to do it: sign in with Google on the live domain and confirm you
reach the dashboard. Until somebody has, the honest statement is that production is
_configured_, not _verified_.

---

## 10. Troubleshooting

| Symptom                                           | Cause                                                                           |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| Button shows the fallback in production           | `GOOGLE_CLIENT_ID` not set in the host's environment, or the deploy predates it |
| Google's button renders, nothing happens on click | Origin not in _Authorised JavaScript origins_ — check the console               |
| `origin_mismatch` in the console                  | Same, including a port or scheme mismatch                                       |
| 401 "We could not verify that Google sign-in"     | Server and browser are using different client ids, so `aud` fails               |
| 403 "Google has not verified the email address"   | Working as intended — see [§6](#6-account-linking)                              |
| 503 "not configured on this deployment yet"       | Server has no `GOOGLE_CLIENT_ID`                                                |
| CSP violation for `accounts.google.com`           | A directive is missing — see [§8](#8-content-security-policy)                   |
