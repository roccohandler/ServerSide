# Account-first capture — the assessment funnel

**Status:** specified and built, 2026-08-14. Recorded as DECISION 028.
**Extended 2026-08-16 by DECISION 031** — see §7. Nothing below §6 changed; the funnel this
document specifies is untouched, and what was added is a _second_ door beside it for people who
want an account rather than an assessment.

This is the specification for moving the site's primary call to action from a seven-field
form that captures nothing until it is finished, to a two-stage flow that captures a real
record at the first field.

---

## 1. The problem, stated exactly

`Get my free website assessment` is the primary action on every page — the header button,
the hero, the pricing cards, the CTA banner at the foot of every marketing page. It points
at `/contact#request`.

That form asks for seven things: name, business name, email, phone, website, what you need
help with, and a message. Two are optional. **Nothing is written anywhere until all five
required fields are valid and the submit succeeds.** A visitor who types their name and
their email address and then stops is not a partial lead. They are nothing at all — no row,
no address, no follow-up, and no way to know they were ever there.

The repository already knew this. `features/public/contact/useHeroLeadForm.ts` says so in
its own header:

> What it does not do is rescue somebody who abandons on step two; catching those would
> need an endpoint that accepts a partial lead, and inventing one that quietly drops
> half-leads into a collection nobody reads would be worse than not having it. **If the
> funnel events ever show real drop-off between `hero_form_step_completed` and
> `lead_form_submitted`, that is the moment to build it.**

This is that moment, and the answer is not the endpoint that comment was worried about.

## 2. What the outside evidence says

Three findings decide the shape, and they pull in the same direction.

| Finding                                                                                                      | Source                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Forms of seven or more fields abandon at **67.8%**; each additional field costs about **4.1%** of conversion | [Brixon Group](https://brixongroup.com/en/lead-forms-in-b2b-the-perfect-balancing-act-between-data-depth-and-conversion-rate)            |
| Multi-step funnels beat single-page forms by **20–35%** on completion, because each step feels smaller       | [Reform](https://www.reform.app/blog/multi-step-form-state-persistence-guide)                                                            |
| Progressive profiling — ask little, enrich later — cuts abandonment by up to **45%**                         | [Poptin](https://www.poptin.com/blog/progressive-profiling-popups/), [Descope](https://www.descope.com/learn/post/progressive-profiling) |

And one finding that constrains it, which is the reason this change is deliberately narrow:

| Finding                                                                                                                             | Source                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gating trades **volume for qualification**. A registration step in front of a free thing reduces the number of people who reach it. | [Digital Applied](https://www.digitalapplied.com/blog/lead-magnet-conversion-benchmarks-2026-b2b-data-reference), [MailerLite](https://www.mailerlite.com/blog/content-gating) |

So this is not "put a wall in front of everything". It is: **on the one path where the
first commitment is currently seven fields, make the first commitment one field, and make
that first commitment produce a durable record.** Everything that is genuinely ungated
today stays ungated.

## 3. The decision this hangs on

An anonymous partial record is refused by this repository, twice, in writing.
`features/assessment/draft.ts`:

> an anonymous draft on the server is a record with no owner, and a record with no owner
> needs an expiry sweep, a claim mechanism, and an answer to "what stops somebody else
> claiming it".

**An account has none of those three problems.** It is a record whose owner is itself. It
cannot be claimed by the wrong person, it does not expire, and there is already a whole
feature that knows what to do with one.

So the partial record this funnel has always needed is not a new `PartialLead` collection.
It is a `User`. The account _is_ the capture.

```
        BEFORE                                   AFTER

  Get my free assessment                   Get my free assessment
          │                                          │
          ▼                                          ▼
   /contact#request                          /get-my-assessment
   ┌─────────────────┐                       ┌──────────────────┐
   │ name            │                       │ email            │  step 1 of 3
   │ business name   │                       │ name, business   │  step 2 of 3
   │ email           │   nothing             │ password         │  step 3 of 3
   │ phone           │   stored              └──────────────────┘
   │ website         │   until                        │
   │ what you need   │   all of                       ▼
   │ message         │   it is           ══════ ACCOUNT EXISTS ══════  ← the capture
   └─────────────────┘   valid                        │
          │                                           ▼
          ▼                                /app/assessment/request
        Lead                               ┌──────────────────┐
                                           │ phone            │
                                           │ website          │
                                           │ what you need    │
                                           │ anything else    │
                                           └──────────────────┘
                                                      │
                                                      ▼
                                             Lead, tied to the account
```

Abandon after the account and the owner has a name, an email address, a business name and a
timestamp — a person to call. Abandon at the same point today and the owner has nothing.

## 4. What does **not** change

Stated first, because the risk in a change like this is that it quietly spreads.

| Surface                                | Stays as it is | Why                                                                                                                                                                                                                 |
| -------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/audit` — Score your site             | Ungated        | Its own page metadata promises "no email address required". That promise is kept. It is the site's lowest-friction offer and the account is still asked for at the _end_, after the value — see `AuditKeepResults`. |
| `/contact`                             | Untouched      | Still reachable from the footer, still linked from the new page as "prefer to just send a message?". Nobody is trapped in the account flow.                                                                         |
| `Discuss my project` (`?intent=build`) | → `/contact`   | Somebody ready to spend $4,900 must never be asked to choose a password first. The secondary CTA is for a person who has already decided.                                                                           |
| `/playbook`, the workbook, the demos   | Ungated        | Not part of this path.                                                                                                                                                                                              |
| The `Lead` collection and its inbox    | Same shape     | A request submitted through the new flow is the same kind of record, with a `userId` and a different `source`. The console inbox picks it up with no change.                                                        |

## 5. What is built

### 5.1 `/get-my-assessment` — the account step

A new public route under `AuthLayout`, living in `features/auth` because the person on it
has no session and is proving who they are — which is exactly what that boundary is for.

It is **not** a second credential form. It renders the existing `AuthShell` and
`CredentialForm` with a different frame: what the assessment is, how long it takes, what
arrives, and what the account is for. The Google button is on it, which makes the whole
account step one click for anybody signed in to Google.

Why a route of its own rather than `/signup?intent=assessment`:

- The button says "Get my free website assessment". Landing on a page headed "Create an
  account" whose lede is "nothing is charged until you choose to go ahead" answers a
  question nobody asked and does not mention the assessment. The frame has to keep the
  promise the button made.
- A distinct URL is the thing a campaign, a business card or a phone call can point at, and
  the thing a funnel report can be grouped by.

### 5.2 `/app/assessment/request` — the request step

A new private page. It asks for the four things the account does not already know: phone,
website, what you need help with, and anything else. Name, business name and email come
from the session, and are never in the request body.

On submit it creates a `Lead` carrying the `userId`, with `source: 'app-assessment-request'`.
The owner is notified by the same mail path as any other lead and it appears in the console
inbox as a prospect awaiting a reply, because that is exactly what it is.

### 5.3 The server

| Change                                                    | Where                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `POST /api/app/assessment-request`                        | `features/leads/lead.customer.routes.ts`, mounted inside `/app` behind `requireAuth`     |
| `LeadService.submitForCustomer({ user, input })`          | Identity from the session. There is no route anywhere that accepts a `userId` in a body. |
| `userId?` on the lead model, indexed                      | `lead.model.ts`                                                                          |
| `LeadRepository.findUserIdsWithLeads(ids)`                | Answers "which of these accounts has asked for anything"                                 |
| An owner notification when an account is created          | `auth.email.ts` / `auth.service.ts`, best-effort, never fails a signup                   |
| `signedUpAt` and `hasRequested` on the admin account view | `auth.types.ts`, `admin.routes.ts`                                                       |
| A `finish-request` branch in `chooseCurrentAction`        | So somebody who abandons the request step lands on a dashboard that says so              |

The owner notification is the part that makes the capture real. A record nobody looks at is
not a lead — it is a row. Every other capture in this system reaches the owner by email and
this one does too.

### 5.4 The console

The accounts table gains **Signed up** and **Asked for**. Together those two columns answer
the question this whole change exists to create: _who made an account and never asked for
anything?_ That is the call list.

The inbox is deliberately not touched. Its definition — everybody waiting on a reply — is
defended in `conversation.service.ts`, and somebody who has not asked a question is not
waiting for an answer. A second definition of "unanswered" is the failure that feature
exists to avoid.

### 5.5 Measurement

Three events, in the existing vocabulary:

| Event                        | Fires when                                              |
| ---------------------------- | ------------------------------------------------------- |
| `assessment_signup_viewed`   | `/get-my-assessment` is reached — the denominator       |
| `assessment_account_created` | The account exists — **the number this change creates** |
| `website_review_requested`   | The request is submitted, `source: 'app'`               |

The third is deliberately the name the hero, the contact form and the audit already use.
Three names for one conversion produces a report nobody can add up.

## 6. What this costs, said plainly

Total requests will probably fall. Some fraction of the people who would have filled in
seven fields will not choose a password, and the gating research above says so directly.

What the change buys is that the ones who stop now stop **after** leaving a name and an
email address rather than before, and that a person who abandons is a follow-up rather than
a silence. Whether that trade is worth it is a business judgement, and it is a reversible
one: `primaryCta.to` in `content/site.ts` is a one-line edit, exactly as the comment already
sitting above it predicted.

The mitigations that are built in rather than hoped for:

1. Google sign-in makes the account step one click.
2. Three steps, one question each, with the count on screen — the multi-step finding above.
3. `/contact` is linked from the new page for anybody who would rather just send a message.
4. `/audit` remains completely free and account-free.

---

## 7. The second door (DECISION 031, 2026-08-16)

Everything above is unchanged. This section records what was added beside it and why the
addition is not a retreat from §3.

### 7.1 What this document got right, and the gap it left

The argument in §3 holds: an account is a record that owns itself, so the account _is_ the
capture, and a first commitment of one field beats one of seven. The funnel in §5 is untouched —
same route, same frame, same three events, same escape hatches.

The gap is one this document did not have to consider, because it was written about a funnel
rather than about a header. **Moving the primary call to action to `/get-my-assessment` made
that button the site's only visible way to create an account** — and it is a button that says
_Get my free website assessment_. Somebody who does not want an assessment reads it as not for
them, correctly, and there was nothing else to click. The header carried `Sign in` and no
counterpart.

### 7.2 What was added

| Surface                       | Anonymous                        | Signed in                 |
| ----------------------------- | -------------------------------- | ------------------------- |
| Header utility strip (≥64rem) | `Create an account` \| `Sign in` | `Dashboard` \| `Sign out` |
| Collapsed mobile menu         | both, above the phone number     | both                      |
| Footer, Pages column          | `Create an account`              | `Dashboard`               |

All of it lands on **`/signup`**, not on `/get-my-assessment`, and the distinction is the same
one §5.1 drew when it refused `/signup?intent=assessment`: the frame has to keep the promise the
control made. A link reading `Create an account` that opens a page about a free website
assessment has changed the subject in exactly the direction this document objected to, only
pointing the other way.

### 7.3 The row this adds to §4

`§4` lists what does not change. It gains one line, and it belongs in the "does not change"
table rather than contradicting it:

| Surface                                | Stays as it is         | Why                                                                                                                                                                           |
| -------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primaryCta` and every CTA on the site | → `/get-my-assessment` | The offer is still the primary path and still the one the ember button takes. The account door is a quiet text link, deliberately, and carries no accent anywhere it appears. |

### 7.4 What it costs, said plainly — the other half of §6

§6 was honest that gating trades volume for qualification. This one trades in the opposite
direction and should be stated with the same candour.

Some fraction of the people who would have gone through `/get-my-assessment` will now create an
account through `/signup` instead, and those accounts arrive **without a request attached**. That
is a worse record than the funnel's: no phone number, no website, no statement of what they
need — the four things §5.2 exists to collect.

Three things make it a trade worth taking rather than a leak:

1. The account is still a real record with a name, an address and a timestamp. That was the
   whole argument of §3 and it does not weaken because the person arrived by a different door.
2. The console already answers the question this creates. **Signed up** and **Asked for** are
   the two columns §5.4 added, and _who made an account and never asked for anything_ is
   precisely the call list this door fills.
3. `chooseCurrentAction` already has a `finish-request` branch (§5.3), so somebody who creates
   an account from the header lands on a dashboard that asks them for the request.

The measurement that decides whether it was worth it is `cta_clicked` with location
`nav_signup` / `nav_signup_mobile`, read against `assessment_signup_viewed`. If the second door
produces accounts the first was not producing, it earned its place. If it merely diverts them,
it is a one-line removal — the same reversibility §6 claimed for the change it describes.
