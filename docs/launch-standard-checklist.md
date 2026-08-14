# The Launch Standard — internal working checklist

**Internal.** The public version is `launchStandard` in `client/src/content/offer.ts` —
eight customer-verifiable checks. This is the working checklist behind it: what actually
gets done before a site is called finished, one copy per project. **The public page may
only ever promise checks that appear here.** If an item is dropped from practice, it must
be dropped from the public list in the same change.

Copy this file into the project folder for each build and check items off for real.

---

## 1. Mobile (public check: "It works on a phone first")

- [ ] Real device pass on a small phone (~360 px class) and a large one
- [ ] Tap targets reachable one-handed; nothing overflowing horizontally
- [ ] Menus, forms and galleries usable with a thumb
- [ ] Text legible outdoors (contrast, size) on the primary pages

## 2. Speed (public check: "It loads fast on a bad connection")

- [ ] Lighthouse / PageSpeed run on the live URL, mobile profile
- [ ] LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1 targets reviewed on throttled mobile
- [ ] Images sized and compressed; no render-blocking third-party scripts

## 3. Forms (public check: "Every form actually arrives")

- [ ] Every form submitted for real on the live site
- [ ] Delivery confirmed in the receiving inbox (not just a success message)
- [ ] Error states and validation messages checked
- [ ] Honeypot/anti-spam working without blocking real submissions

## 4. Tracking (public check: "Calls and enquiries are counted")

- [ ] Analytics receiving events from the live domain
- [ ] Tap-to-call fires its conversion event
- [ ] Form submission fires its conversion event
- [ ] Events verified in the analytics tool with a real test action

## 5. Search (public check: "Search engines can read it")

- [ ] Titles and meta descriptions on every page
- [ ] Sitemap generated and submitted; robots.txt correct
- [ ] Search Console verified and indexing requested
- [ ] Redirects from every old URL mapped and tested (no 404s from prior listings)
- [ ] Local-business structured data valid

## 6. Accessibility (public check: "It is usable by everyone")

- [ ] Full keyboard pass: every action reachable and visible-focus
- [ ] Heading outline sensible (no skipped levels)
- [ ] Contrast checked on text and controls
- [ ] Images carry meaningful alt text; forms carry real labels

## 7. Browsers (public check: "It works in the browsers your customers use")

- [ ] Current Chrome, Safari, Edge and Firefox — desktop
- [ ] Current iOS Safari and Android Chrome — mobile

## 8. Contact paths (public check: "Every path to contacting you works")

- [ ] Tap-to-call dials the right number from a real phone
- [ ] Every button and link on the primary paths walked end to end, live
- [ ] Email links open with the right address
- [ ] The quote funnel completed as a customer would, start to finish

## Launch mechanics (internal only — not a public promise)

- [ ] Domain connected; SSL valid; www/apex both resolve
- [ ] Hosting, domain and analytics accounts in the client's name
- [ ] Client walkthrough delivered; logins handed over
- [ ] Launch-day payment link sent (second half of the project)
