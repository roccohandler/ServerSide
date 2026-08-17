# The header account entry — a way to create an account from the top bar

**Status:** specified 2026-08-16. Recorded as DECISION 031. Extends DECISION 028; supersedes one
note in `content/content.test.ts` and narrows it rather than reversing it.

The site has a `Sign in` link in the top bar and nothing beside it. This plan puts the other half
of that pair where every site puts it, makes the flow behind it one click shorter, and gives a
signed-in customer a way out that does not require finding the workspace first.

---

## §0 Provenance

The brief was fifteen decisions taken by the owner on 2026-08-16, after a review of
`Header.tsx`, both credential pages, the shared `CredentialForm`, `docs/ACCOUNT-FIRST-CAPTURE.md`,
`lib/analytics.ts` and `scripts/check-budget.ts`. They are reproduced in full in §4 rather than
summarised, because every one of them closed off an alternative and the alternatives are the
part a reader six months from now will want back.

---

## §1 What is there now, measured

```
┌──────────────────────────────────────────────────────────────────────┐
│ Monday to Friday, 8am–6pm Pacific      📞 206-973-6798      Sign in   │  ← utility strip
├──────────────────────────────────────────────────────────────────────┤     (≥64rem only)
│ [F] JOBFORGE   Services  Score your site  Examples  About            │
│                                          [ Get my assessment ]      │  ← the one ember
└──────────────────────────────────────────────────────────────────────┘
```

| Fact                                                              | Where                              |
| ----------------------------------------------------------------- | ---------------------------------- |
| The strip carries hours, phone and one account link               | `Header.tsx:95-106`                |
| The link is `Sign in` / `Dashboard`, switched on session status   | `Header.tsx:99-104`                |
| The strip is `display: none` below `64rem`                        | `Header.module.css:28-32, 306-319` |
| The mobile menu carries the CTA, `Sign in`/`Dashboard`, the phone | `Header.tsx:201-216`               |
| Nothing in the header creates an account                          | —                                  |
| Nothing on the marketing site signs anybody **out**               | — (only `AppLayout.tsx:91-94`)     |
| `?email=` prefills the credential form but does not skip step 1   | `CredentialForm.tsx:119-122`       |
| Only the ember CTA may use the accent                             | `Header.test.tsx:165-171`          |

Baseline payload, from the last green `npm run verify`:

```
eager JS  539.0 kB raw / 163.7 kB gzipped   (ceiling 545.0 / 164.0)
eager CSS 118.3 kB raw /  19.2 kB gzipped   (ceiling 120.0 /  20.0)
```

**0.3 kB of gzipped JS headroom.** That number decides more of this plan than any design
argument in it — see §7.

---

## §2 The problem, stated exactly

Three separate gaps, which look like one gap until they are written down.

### 2.1 The pair is half a pair

`Sign in` is the returning-customer door. There is no new-customer door beside it. A visitor
who wants an account — because they were told to make one, because they want to keep an audit
result, because they are the kind of person who makes an account before they buy — has to
either guess that the orange offer button is also a sign-up, or click `Sign in` and find the
cross-link at the bottom of that page.

`content.test.ts:335-336` already asserts the fix as though it were done:

> `[routes.signup, 'linked from the header and from the sign-in page']`

The second half is true. The first half has never been true. A test's own justification claiming
a link that does not exist is the quietest kind of documentation rot, and it is the reason this
change is a correction rather than an addition.

### 2.2 The one door there is has an offer painted on it

DECISION 028 pointed every primary call to action at `/get-my-assessment`, and that was right:
the account **is** the lead capture, and a first commitment of one field beats one of seven.

But it means the site's only visible account-creation path is framed entirely as an offer. The
button says `Get my free website assessment`. Someone who does not want an assessment — a
current customer setting up access, a person comparing vendors who wants somewhere to keep
notes — reads that button as "not for me", correctly, and then has nowhere else to go.

Two doors, two intents, and neither is the wrong one:

| Intent                               | Door                        | Frame                                                   |
| ------------------------------------ | --------------------------- | ------------------------------------------------------- |
| "Tell me what is wrong with my site" | `Get my assessment` (ember) | The offer. Free, two minutes, four questions.           |
| "I want an account"                  | `Create an account` (text)  | The account. What it holds and what it costs (nothing). |

### 2.3 There is no way out

A signed-in customer on the marketing site sees `Dashboard`, and that is all. The only
`Sign out` in the application is inside `/app` (`AppLayout.tsx:91-94`). Somebody on a shared
machine who lands on the homepage has to navigate _into_ their private workspace in order to
leave it.

That is not a small awkwardness on a site whose audience runs businesses from a shared office
computer.

---

## §3 What the outside evidence says

`docs/ACCOUNT-FIRST-CAPTURE.md` §2 already collected the evidence for account-first capture and
it is not repeated here. What is new is the evidence about the **header** specifically.

| Finding                                                                                                                                      | Bearing on this plan                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| The overwhelming convention on B2B SaaS is a quiet `Sign in` and a distinct sign-up affordance in the top-right, in that region of the page. | Put the pair where people already look. Do not invent a location.        |
| `Sign in` and `Sign up` differ by one letter and are among the most misclicked pairs in interface copy.                                      | The label is `Create an account`, not `Sign up`. §4.3.                   |
| Every field removed from a registration form is worth roughly 4.1% of completion (Brixon, cited in ACCOUNT-FIRST-CAPTURE §2).                | The cheapest win available here is removing a _step_, not a field: §5.4. |
| Progressive disclosure across steps beats a single page by 20–35% on completion (Reform, ibid).                                              | Keep the three steps. Do not collapse them to buy speed. §4.4.           |

The last two pull against each other and the resolution is the whole of §5.4: **skip a step
that has already been answered, rather than removing a step that has not.**

---

## §4 The fifteen decisions

Each row is a closed question. The alternatives are recorded because the reasons they lost are
the useful part.

| #    | Question                       | Decided                                   | What it closed off                                                                                                                                                                                                                         |
| ---- | ------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 4.1  | The shape of the affordance    | **Two plain links** in the utility strip  | An inline email field (a form in a 30px strip, ~0.5 kB eager); an `Account ▾` menu (hides both actions behind a click); a dropdown carrying the Google button (drags `GoogleSignInButton` out of the lazy auth chunk into every page load) |
| 4.2  | Where it lands                 | **`/signup`**                             | `/get-my-assessment` (the link would promise an account and deliver an offer pitch — the exact bait-and-switch DECISION 028 built a separate route to avoid); a third `/create-account` page; a `?from=nav` variant                        |
| 4.3  | The words                      | **`Create an account`**                   | `Create account` (a fifth spelling of a phrase `CredentialForm.tsx:44-53` spent a paragraph reducing to one); `Sign up` (one letter from `Sign in`); `Get started` (says nothing, and competes with `Get my assessment` two words away)    |
| 4.4  | How fast the flow behind it is | **Auto-advance a prefilled email**        | Collapsing to two steps; dropping confirm-password. Both buy speed by removing a step nobody has answered; this buys it by skipping one they have                                                                                          |
| 4.5  | Mobile                         | **In the mobile menu, above `Sign in`**   | Desktop only (most visitors are on a phone); a third control in the 44px mobile bar                                                                                                                                                        |
| 4.6  | The signed-in state            | **`Dashboard` \| `Sign out`**             | Leaving it as `Dashboard` alone; adding the first name; deferring the missing sign-out to follow-up work                                                                                                                                   |
| 4.7  | Sign-out behaviour             | **Sign out and stay on the page**         | Navigating home (costs the reader their place on a public page they can still read); confirming first (friction on a reversible act); going to `/login`                                                                                    |
| 4.8  | Where sign-out lives           | **The utility strip, beside `Dashboard`** | `WorkspaceBar` (hidden inside `/app`, which is where a customer sits longest); both (two controls, one accessible name — the duplication `CredentialForm`'s "Previous step" note argues against)                                           |
| 4.9  | Visual separation              | **A thin vertical rule**                  | The bare gap (two 13px text links read as one label); semibold weight; a bordered pill                                                                                                                                                     |
| 4.10 | Measurement                    | **New `CtaLocation` values**              | `auth_started` alone (cannot say which door); a dedicated event name; nothing                                                                                                                                                              |
| 4.11 | Budget policy                  | **Raise it, with the rationale recorded** | Refusing any raise; raising proactively; holding JS and allowing CSS                                                                                                                                                                       |
| 4.12 | `/signup` copy                 | **Say what the account is for**           | Leaving it; adding the `/contact` escape hatch; adding a cross-link to `/get-my-assessment`                                                                                                                                                |
| 4.13 | Register                       | **DECISION 031**                          | —                                                                                                                                                                                                                                          |
| 4.14 | The footer                     | **One account entry in the footer**       | — but it contradicts a written note; see §5.6                                                                                                                                                                                              |
| 4.15 | Git                            | **Stays uncommitted**                     | —                                                                                                                                                                                                                                          |

---

## §5 The design

### 5.1 The desktop strip

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Monday to Friday, 8am–6pm Pacific   📞 206-973-6798   Create an account │ Sign in │
└──────────────────────────────────────────────────────────────────────────────┘
```

Two `NavLink`s in the existing `.utilityLink` class, with a `border-inline-start` on the
second. Nothing else changes about the strip.

`border-inline-start`, not `border-left` — rule 7 of `tokens.test.ts` fails the build on a
physical side on the inline axis, and it would be a poor showing to break a guard written six
hours ago.

**Order.** `Create an account` first, `Sign in` second, reading order left to right in `ltr`.
The new visitor is the larger audience and the one with less patience; the returning customer
is looking for a specific word and will find it wherever it is.

**No accent, no weight change.** `Header.test.tsx:165-171` asserts the primary action is the
only thing in the header wearing the accent, and that test is right — the whole reason the
phone number and the account link were moved into a strip was so the ember button has nothing
to compete with (`Header.tsx:137-142`). Two quiet text links do not break that. A bordered pill
or a semibold treatment would start to.

### 5.2 The mobile menu

The strip does not exist below `64rem`, so the pair has to be built twice — once in the strip
and once in `mobileActions`, which is the arrangement `Sign in` already has.

```
  [ Get my free website assessment ]   ← the CTA, unchanged
    Create an account                  ← new, above Sign in
    Sign in
    📞 206-973-6798
```

Above `Sign in` for the same reason it is first on desktop, and below the CTA because the CTA
is still the primary action on the page.

### 5.3 The signed-in state

```
desktop:   Dashboard │ Sign out
mobile:    Dashboard
           Sign out
```

`Sign out` is a `<button>`, not a link, because it performs an action rather than going
somewhere — and it is styled to match `.utilityLink` exactly, so the row does not visibly
contain two kinds of thing.

It calls `logout()` and does **not** navigate. The page is public and stays readable; the strip
flips back to `Create an account │ Sign in`, which is the confirmation. `AppLayout`'s sign-out
navigates to the homepage, and that is correct _there_ — a private page cannot stay on screen
once the session is gone. The two behaving differently is the difference between the two
surfaces, not drift, and both carry a comment saying so.

### 5.4 Auto-advancing a prefilled email

`CredentialForm` reads `?email=` at mount (`CredentialForm.tsx:119-122`) and puts the value in
the field — on step 1, with a `Continue` button under it. So a visitor who has already given
their address is shown their own address and asked to confirm it by pressing a button.

The change: **if the seeded address is present and passes `validateField`, open on step 2.**

Four things make this safe, and all four already exist:

1. `validateField('email', …)` is the same check `Continue` would have run.
2. The address stays visible — `CredentialForm.tsx:371-386` renders the echo and a `Change`
   control on every step after the one that asked for it.
3. The shadow `autocomplete="username"` input (`:403-414`) renders on the same condition, so a
   password manager still sees a username beside the password.
4. `hasMoved.current` stays `false` at mount, so focus is **not** stolen on first paint — the
   form opens on step 2 without grabbing the caret, exactly as the effect at `:180-187`
   already specifies.

Who this helps, today: the `/login` → `Create an account` cross-link, the `/signup` → `Sign in`
cross-link, the audit hand-off, and any URL an owner ever puts on a business card. Nobody has
to press a button to agree with themselves.

**What it is not.** It is not a shorter form. The three steps and the four fields are unchanged,
which is what keeps §3's last two findings from cancelling out.

### 5.5 `/signup`'s lede

Today: _"Free, and nothing is charged until you choose to go ahead."_

That sentence answers a pricing objection. It is true, and it was written for somebody arriving
from a page full of prices. Somebody arriving from a header link that says `Create an account`
has a different question, and it is "what is the account **for**".

New: what it holds, then what it costs — in that order, matching `/get-my-assessment`'s own
what-then-cost structure (`GetAssessmentPage.tsx:106-112`).

> Your assessment, your website project and your billing, in one place. Free, and nothing is
> charged until you choose to go ahead.

The second clause is kept verbatim. It stops being the lede and becomes the reassurance, which
is the job it was always doing.

### 5.6 The footer, and the note this supersedes

`content/content.test.ts:317-323` says, in the allowance list for routes not in the footer:

> They are listed here rather than added to `site.footerNav` because **a footer full of account
> links on a marketing page is navigation nobody asked for**, and because this list is the place
> the reason gets written down.

That note is being narrowed, and the narrowing has to be written down or the next reader will
think it was simply ignored.

**What survives:** a _column_ of account links in the footer — sign in, sign up, forgot
password, verify email — is navigation nobody asked for. That is still true and still refused.

**What changes:** one entry is not a column. And the specific reason it is worth one entry is a
fact that was not true when the note was written: **the header pair is invisible at every width
below `64rem` unless the menu is opened.** The footer is the only surface on the site that
carries the same thing at every width without a click. A visitor on a phone who has read to the
bottom of a page and decided has, today, nothing at the bottom of that page.

So: one link, in the existing bottom row beside Privacy and Terms — not a fifth column, and not
in `site.footerNav`, which drives the `Pages` column and the sitemap. The allowance-list entries
for `/login` and `/signup` get their justification strings corrected in the same edit, because
one of them has been claiming a header link that did not exist.

---

## §6 What does not change

Stated explicitly, because the risk in a header change is that it spreads into the funnel.

| Surface                         | Unchanged | Why                                                                                                                    |
| ------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------- |
| `primaryCta` / the ember button | Yes       | Still `Get my free website assessment` → `/get-my-assessment`. DECISION 028 stands entirely.                           |
| `/get-my-assessment`            | Yes       | Its frame, its lede, its three analytics events and its escape hatches are untouched.                                  |
| `/audit`                        | Yes       | Still ungated, still promising "no email address required".                                                            |
| `/contact`                      | Yes       | Still ungated, still linked from `/get-my-assessment` and the footer.                                                  |
| The three signup steps          | Yes       | Auto-advance skips a step that is answered. It does not remove one.                                                    |
| The server                      | Yes       | **Not one server file is touched.** This is entry points and copy; the endpoints they reach already exist.             |
| `site.nav` / `site.footerNav`   | Yes       | The account entries are not destinations in the sense those lists mean, and adding them would put them in the sitemap. |
| `WorkspaceBar`                  | Yes       | Decision 4.8. It stays a way back in.                                                                                  |

---

## §7 The payload

This is the constraint that shaped §4.1 and it deserves its own numbers.

**Available:** 6.0 kB raw / **0.3 kB gzipped** JS; 1.7 kB raw / 0.8 kB gzipped CSS.

**Estimated cost of what is being built:**

| Item                                    | JS               | CSS             |
| --------------------------------------- | ---------------- | --------------- |
| Two links + separator, desktop + mobile | ~0.2 kB          | ~0.15 kB        |
| The sign-out button and its handler     | ~0.15 kB         | ~0.1 kB         |
| Footer entry                            | ~0.1 kB          | ~0.05 kB        |
| `/signup` lede (lazy chunk — not eager) | 0                | 0               |
| Auto-advance (lazy chunk — not eager)   | 0                | 0               |
| Analytics location strings (types only) | 0                | 0               |
| **Eager total**                         | **~0.45 kB raw** | **~0.3 kB raw** |

Raw is fine. **Gzipped JS is the number at risk**, because 0.3 kB of gzipped headroom is not a
budget — it is a rounding error, and the raise note at `check-budget.ts:239-263` says so about a
previous 0.6 kB in almost those words.

Per decision 4.11: measure, and if it does not fit, raise the ceiling with a paragraph in
`check-budget.ts` saying what the raise bought — the same format as the eight raises already in
that file. Leave real headroom this time rather than a rounding error.

Two things worth noting about what is _not_ on that list. `Modal` is not used, so its measured
1.4 kB JS + 1.3 kB CSS first-consumer cost is not incurred; that is decision 4.1 paying for
itself. And nothing here reaches `GoogleSignInButton`, which stays in the lazy auth chunk where
it belongs.

---

## §8 The checklist

Batches are ordered so that every one of them leaves the tree green. `npm run verify` after
each of 1–3 and after 8; the full run including `build`, `check-budget` and `check:csp` at 10.

### Batch 1 — the desktop pair

- [x] 1.1 `Header.tsx`: render `Create an account` before `Sign in` in the utility strip
- [x] 1.2 `Header.module.css`: `.utilitySeparator` — `border-inline-start`, `--space-*` padding, no colour literal
- [x] 1.3 Confirm the strip still fits at `64rem` with the hours hidden (`Header.module.css:326-330`)
- [x] 1.4 `npm run lint && npm run typecheck`

### Batch 2 — mobile parity

- [x] 2.1 `Header.tsx`: `Create an account` in `mobileActions`, above `Sign in`
- [x] 2.2 Confirm the mobile menu's link count assertion in `Header.test.tsx:121` still describes what it means to

### Batch 3 — the signed-in state

- [x] 3.1 `Header.tsx`: `handleSignOut` — `await logout()`, no navigation, with the comment saying why it differs from `AppLayout`
- [x] 3.2 Desktop strip: `Dashboard │ Sign out`
- [x] 3.3 Mobile menu: `Dashboard`, then `Sign out`
- [x] 3.4 `Header.module.css`: `.utilityAction` — a button that matches `.utilityLink` exactly (font, colour, hover, focus)
- [x] 3.5 Guard the double-click: a `busy` ref or `disabled`-free equivalent, so two clicks are not two logout requests

### Batch 4 — measurement

- [x] 4.1 `lib/analytics.ts`: add `nav-signup` and `nav-signup-mobile` to `CtaLocation`, with a comment on what question they answer
- [x] 4.2 Wire both into the two new links via `track('cta_clicked', …)`

### Batch 5 — auto-advance

- [x] 5.1 `CredentialForm.tsx`: lazily initialise `stepIndex` to 1 when the seeded email validates
- [x] 5.2 Confirm `hasMoved.current` stays `false`, so focus is not stolen at mount
- [x] 5.3 Confirm the echo, the `Change` control and the shadow username input all render on the opening step
- [x] 5.4 Write the reasoning into the component header beside the `?email=` note

### Batch 6 — `/signup` copy

- [x] 6.1 `SignupPage.tsx`: the new lede, keeping the pricing clause as the second half
- [x] 6.2 Check nothing asserts the old string

### Batch 7 — the footer

- [x] 7.1 `Footer.tsx`: one account entry in the bottom row
- [x] 7.2 `Footer.module.css`: only if the bottom row needs it — prefer reusing `.legalLinks`
- [x] 7.3 `content.test.ts:317-336`: supersede the note per §5.6 and correct both justification strings

### Batch 8 — tests

- [x] 8.1 `Header.test.tsx`: the pair exists and points at `/signup` (desktop and mobile)
- [x] 8.2 `Header.test.tsx`: neither new control carries `navCta` — the accent rule, extended
- [x] 8.3 `Header.test.tsx`: signed in shows `Dashboard` + `Sign out` and no `Create an account`
- [x] 8.4 `Header.test.tsx`: `Sign out` calls `logout` and does not navigate
- [x] 8.5 `credentialPages.test.tsx`: `/signup?email=…` opens on step 2, with the address echoed
- [x] 8.6 `credentialPages.test.tsx`: `/signup?email=nonsense` opens on step 1
- [x] 8.7 `Footer` test for the account entry

### Batch 9 — documentation

- [x] 9.1 `docs/owner-decisions-required.md`: DECISION 031
- [x] 9.2 `docs/ACCOUNT-FIRST-CAPTURE.md`: §4's table gains a row; the "one door" picture is now two
- [x] 9.3 `CLAUDE.md`: the account-first bullet mentions the second door; register range → 031
- [x] 9.4 This file: tick every box, append §10

### Batch 10 — measure and verify

- [x] 10.1 `npm run build -w apps/client` and read `[budget]`
- [x] 10.2 If over: raise in `check-budget.ts` with the rationale paragraph, per 4.11
- [x] 10.3 Full `npm run verify` — format, lint, typecheck, test, build, budget, CSP
- [x] 10.4 Confirm nothing is committed

---

## §9 The guards this has to clear

| Guard                              | What it will object to                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| `tokens.test.ts` rule 1            | A colour literal in the separator or the sign-out button                     |
| `tokens.test.ts` rule 5/6          | A font size or spacing value off-scale                                       |
| `tokens.test.ts` rule 7            | `border-left` instead of `border-inline-start`                               |
| `tokens.test.ts` rule 8            | A system colour keyword outside a `forced-colors` block                      |
| `content.test.ts` dead-class sweep | A class added and not used, in either direction                              |
| `content.test.ts` route linkage    | `/signup` and `/login` justification strings that no longer describe reality |
| `Header.test.tsx` accent rule      | Anything new in the header wearing `navCta`                                  |
| `check-budget.ts`                  | The eager bundle, on 0.3 kB of gzipped JS headroom                           |
| `check-csp.ts`                     | Nothing here — no inline script changes                                      |
| ESLint boundaries                  | Nothing here — no cross-boundary import                                      |

---

## §10 Execution notes

Six things the work found that the plan did not know. Recorded rather than quietly fixed,
because the measurement is the useful part.

### 10.1 The auto-advance broke a passing test, and the test was right

`credentialPages.test.tsx` → _"carries the typed address across, and back again"_ crossed from
`/login` to `/signup` with a typed address and asserted the email **field** held it, then crossed
straight back and asserted the same thing. Neither assertion survives §5.4: the form opens on
step two, so there is no email field on screen, and `AuthShell` drops the cross-link with the
rest of the ways in.

**So the round trip now costs one click on `Change`.** §5.4 predicted the loss of the Google
option and did not predict this one. The trade stands — the visitor who crossed over to _sign
up_ saves a click and the one who crossed over to _look_ spends one, and the first group is
larger by a distance — but the test was rewritten to exercise the return path through `Change`
rather than to stop exercising it, and the reasoning is in the test rather than in this file,
where the next person to touch that behaviour will actually be reading.

A second test was added beside it for the branch that makes the auto-advance safe at all:
`?email=not-an-address` still opens on step one, with its error.

### 10.2 The footer entry went in the Pages column, not the bottom row

§5.6 said "one link, in the existing bottom row beside Privacy and Terms". It is in the **Pages**
column instead, and the reason is that the bottom row's list is called `legalLinks` — putting an
account link into a list named for legal notices is the kind of small dishonesty that teaches the
next reader to distrust every class name in the file.

The Pages column costs nothing extra: it already has `.list` and `.link`, so the entry added
**zero** new CSS. §5.6's actual requirement — outside `site.footerNav`, so it never reaches
`sitemap.xml` — is unaffected and is now pinned by a test.

### 10.3 The footer had to learn about the session, and had no test at all

Offering `Create an account` to a signed-in customer is the footer announcing it does not know
who they are, so `Footer` now calls `useAuth`. That turned out to be the first thing to render
the footer in a test: there was no `Footer.test.tsx` in the repository, and every claim about it
lived in `content.test.ts` as an assertion about _content_ rather than about _markup_. There is
one now, and it pins the two rules that break silently — not in `footerNav`, and session-aware.

### 10.4 The budget passed, and that is the least reassuring result available

Measured: eager JS **539.0 → 540.1 kB raw / 163.7 → 163.8 gzipped**; eager CSS **118.3 → 118.8
raw / 19.2 gzipped, unchanged**. Both ceilings hold, so per decision 4.11 nothing was raised.

§7 estimated ~0.45 kB of eager JS and ~0.3 kB of CSS. The real numbers are **1.1 kB and 0.5 kB**
— roughly double, which is what the prose comments cost; this repository writes them and they
are in the bundle. Gzip barely noticed either (`+0.1 kB` JS, `+0.0 kB` CSS), because comment
prose is the most compressible thing in a JavaScript file.

**Remaining gzipped JS headroom: 0.2 kB.** `check-budget.ts`'s own note from three days earlier
says of a 0.6 kB margin that "0.6 kB is not a budget". This is a third of that. The next eager
change will fail the build, and it should be raised deliberately then rather than discovered.

### 10.5 `Sign out` needed a guard the plan asked for and could not have justified

Checklist item 3.5 asked for a double-click guard on instinct. It earns its place: this is a
plain text control with no busy state, so it cannot show that it is working, which makes an
impatient second click the _expected_ behaviour rather than the unusual one. The ref is four
lines and the test that proves it needs a never-resolving mock — the only window in which the
guard does anything is while the first request is still open.

### 10.6 What the analytics values are actually called

§4.10 and the checklist both say `nav-signup`. They shipped as **`nav_signup`** and
**`nav_signup_mobile`**, matching `nav` and `nav_mobile` rather than `demo-finished`.

`CtaLocation` has both spellings and always has. There is no global convention to match, so the
tie-break is: match the neighbours you will be **summed against** in a report. These two are read
against `nav`, so they are spelled like `nav`.

---

## §11 Closing state

|                      | Before                | After                                             |
| -------------------- | --------------------- | ------------------------------------------------- |
| Eager JS             | 539.0 kB / 163.7 gzip | **540.1 / 163.8** (ceiling 545 / 164, not raised) |
| Eager CSS            | 118.3 kB / 19.2 gzip  | **118.8 / 19.2** (ceiling 120 / 20, not raised)   |
| Tests                | 1,279 across 84 files | **1,292 across 85 files**                         |
| Server files changed | —                     | **none**                                          |

Ways to create an account, before: one, wearing an offer. After: four surfaces, two frames, and
a test on each that fails when one of them disappears.
