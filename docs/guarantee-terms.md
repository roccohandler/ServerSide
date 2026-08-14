# Guarantee terms — internal boundaries

**Internal.** The public wording lives in `client/src/content/offer.ts` (`guarantee`,
`launchStandard`) and `content/growth.ts` (`responseGuarantee`). This file defines where
each promise starts and stops, so none of them quietly becomes an unlimited warranty.
**The written client agreement must say the same things — see the legal flag at the end.**

Last reviewed: 2026-08-13.

---

## 1. Built to what we agreed

**Promise:** if the website is not delivered according to the requirements agreed in
writing, work continues until it is.

**Boundary:** measured against the written scope only. New pages, new functionality, a
changed brief after sign-off, or "I've changed my mind about the direction" are new scope
and are quoted — the two included revision rounds are the mechanism for adjustments
within scope.

## 2. The Launch Standard

**Promise:** the site does not launch until it passes the eight published checks
(`docs/launch-standard-checklist.md` is the working version).

**Boundary:** it is a pass/fail bar on the work at launch, not a perpetual performance
warranty. Post-launch changes by others, third-party degradation, or content added later
are not Launch Standard failures.

## 3. If I break it, I fix it

**Promise:** if a change I make stops the website working properly, I fix it at no
additional charge.

**Qualifies:** regressions caused by my own edits, updates I applied, configuration I
changed — discovered at any reasonable time, fixed at no charge, priority over new work.

**Does not qualify (communicated, not litigated):**

- Changes made by the client or anybody else with access
- Third-party outages or changes: hosting provider, registrar, DNS, email delivery,
  browser or platform changes, an embedded service shutting down
- Content the client supplied (a wrong phone number is corrected as a normal edit, not
  claimed under a guarantee)
- Security incidents originating outside anything I control
- Sites not under Growth Partner that have been modified since handover — I will still
  help, but as quoted work, because the state I left is no longer the state it is in

## 4. The 24-business-hour response guarantee (Growth Partner only)

**Promise:** a qualifying response within 24 business hours, or that month's $299 fee is
waived in full, applied automatically.

**Definitions (already published on the site, pinned by tests):**

- **Business hours:** Monday–Friday, 8am–6pm Pacific. Weekends and **US federal
  holidays** pause the clock.
- **Qualifying channels:** the website support form; the designated business email
  (`site.contact.supportEmail`). Nothing else starts the clock — calls and texts are
  welcome but unmeasurable.
- **Qualifying response:** a human acknowledgement plus an answer, a next step, or a
  statement of what is needed to proceed. An auto-reply does not count. A _resolution_
  is not the promise.
- **Qualifying request:** anything within the active management scope
  (`docs/business-growth-partner-scope.md`).

**Does not count:** requests through other channels; duplicates/automation about an
already-raised issue; time waiting on the client; work outside the agreed scope;
third-party outages; security incidents where a third party must act first; events
outside either party's control.

**Remedy mechanics:** the waiver is the whole month's fee, applied by the business
without the client asking. In Stripe: apply a one-time credit/coupon to the next
invoice, or refund the paid invoice for that month — **[OWNER DECISION REQUIRED:
pick the mechanism and use it consistently]**.

---

## Legal flag

These boundaries are written in plain English by the business and **have not been
reviewed by a lawyer**. Before real payment volume: have the written client agreement,
these guarantee boundaries, and the refund/cancellation terms reviewed professionally.
Tracked in `docs/offer-configuration-checklist.md` → LEGAL.
