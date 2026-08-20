import { routes, sections } from '../config/routes';
import { serviceArea } from '../config/market';
import type { SiteConfig } from '../types/content';

/*
 * ============================================================================
 * BUSINESS IDENTITY — EDIT THIS FILE FIRST
 * ============================================================================
 *
 * Anything written as [LIKE_THIS] is a placeholder for a fact that has not been
 * decided yet. Nothing in this repository invents a business name, a price, a
 * guarantee, a client, a testimonial or a statistic.
 *
 * In development the site shows a banner listing every placeholder that is still
 * in place, and telephone and email links stay inert until they hold real values,
 * so an unreplaced placeholder can never become a broken `tel:` link in public.
 *
 * What is *sold* is described in `content/offer.ts`, not here. This file is identity,
 * contact details, navigation and the calls to action.
 *
 * Search the repository for `[` to find them all, or read the checklist in README.md.
 * ============================================================================
 */

/**
 * The name of the free assessment, hoisted so two places can use it.
 *
 * `site.offer.freeReview.name` is still the authority every component reads. This constant
 * exists because the footer link is *inside* the `site` literal and cannot reference the
 * object being defined — and two hand-typed copies of a product's name is how a product ends
 * up with two names.
 */
const FREE_REVIEW_NAME = 'Free website assessment';

export const site: SiteConfig = {
  /*
   * "ServiceSide" became "JobForge" at the owner's direction (2026-08-13), alongside the
   * repositioning from "a managed website service" to a digital growth company: the name
   * should carry the outcome (jobs won) rather than the mechanism (a website), because
   * the mechanism list will grow and the outcome will not change.
   *
   * **This is a brand decision, not an implementation detail.** It is one line here and
   * one line in `seo.titleSuffix` to change again or to revert; nothing else in the
   * repository holds the name as a rendered literal.
   */
  name: 'JobForge',
  ownerName: 'Maxwell Cuenca',

  /*
   * ==========================================================================
   * THE TAGLINE — AND WHY THE CATEGORY NOUN LEADS AGAIN
   * ==========================================================================
   *
   * Rendered in exactly one place: under the wordmark in the **footer**, on every page.
   *
   * ## It was rendered nowhere at all until 2026-08-19, and that is worth knowing
   *
   * This comment used to say "under the name in the header". That stopped being true when the
   * header dropped it — it needed 427px in a slot offering 141px, so it truncated at every
   * width above 1280px and was hidden below — and nothing picked it up afterwards. The string
   * survived; its consumer did not. So a field describing what this business is had been
   * dead for months while the comment above it asserted otherwise, which is the exact failure
   * composition rule 6 exists to prevent and the reason a stale comment is worse than none.
   *
   * The footer is where it lives now. The header's width constraint has not changed and this
   * slot has no such constraint.
   *
   * ## The category noun leads, and the fact that made it lead
   *
   * **`getjobforge.com` sells field-service-management software to "electricians, plumbers,
   * HVAC technicians, and contractors"** — the same trades, the same buyer, a different
   * product — and three other JobForge products exist besides. So the misread this site has
   * to survive is not the one it was originally written against.
   *
   *   - *Job board* was the feared misread. It is close to harmless: implausible to a
   *     tradesperson reading a page about websites, and it corrects itself within a sentence.
   *   - *Job-management software* is the dangerous one, precisely because it is **plausible**.
   *     A plausible misread never self-corrects. The reader does not discover they were
   *     wrong — they conclude the site is not for them, and leave.
   *
   * Against a name collision the cheapest defence is naming the category in the first word,
   * in the one string that appears on every page directly under the business name.
   *
   * ## "Websites that ask for the job." was here for a day, and it was wrong
   *
   * DECISION 043 replaced it, and the reason is worth keeping because it is the kind of
   * mistake that looks like a good line.
   *
   * It put **the single most contested word in this brand's landscape into the tagline.**
   * "Job" appears in the business name, in the competitor's name, in the competitor's whole
   * category — and, with that line, in the promise as well. Four uses of one ambiguous word
   * in one lockup is the opposite of disambiguation: it makes the misfiling *easier*.
   *
   * Worse, "ask for the job" is borrowed from sales ("ask for the close") and does not
   * survive the transfer. Read cold, next to a name like JobForge, a website that *asks for
   * the job* sounds like a website applying for work — which is the job-board reading the
   * line existed to prevent.
   *
   * ## Why "calls" and not "customers" or "jobs"
   *
   * Both of those sit on the far side of a boundary this site spends an entire section
   * drawing. `conversion` runs the funnel through to the invoice and marks "Books the work"
   * as `owner: 'business'`; `conversion.handoff` says outright that what you charge, whether
   * you have capacity and whether somebody picks up are the client's.
   *
   * A **call** is the last thing on the website's side of that line. It is what the work can
   * honestly claim to affect, it is the word this market actually uses, and it is already the
   * outcome named everywhere else on the site. Promising customers or jobs from the header of
   * every page would contradict the rest of the site — which is worse than a weak tagline,
   * because it is the sentence a sceptical reader checks everything else against.
   *
   * Quote requests are the other half and they live in the supporting copy. A tagline is a
   * compression, and 38 characters that a roofer reads correctly at a glance beats 60 that
   * are complete.
   * ==========================================================================
   */
  tagline: 'Websites that turn visitors into calls.',

  description:
    'JobForge helps local service businesses in the Greater Seattle area turn more of the people already finding them into calls and quote requests — by building the website and the paths that lead to the phone, measuring what they produce, and improving them from there. Built for HVAC, plumbing, electrical, roofing, landscaping and other trades that get hired locally.',

  /*
   * `hours` is the covered business week, and it is load-bearing rather than decorative:
   * the response guarantee in `content/growth.ts` promises a reply within 24 *business*
   * hours, and its copy is generated from these values. Widen the window here and you
   * have widened a commercial commitment — the terms page will say so on the next build.
   *
   * `supportEmail` is separate from `email` so the public address can change without
   * silently moving a contractual channel.
   */
  contact: {
    phone: '206-973-6798',
    email: 'maxwellacuenca@gmail.com',
    supportEmail: 'maxwellacuenca@gmail.com',
    availability: 'Monday to Friday, 8am–6pm Pacific',
    hours: {
      days: 'Monday to Friday',
      opens: '8am',
      closes: '6pm',
      timezone: 'Pacific',
      label: 'Monday to Friday, 8am–6pm Pacific',
      excludes: 'Weekends and US federal holidays',
    },
    outOfHours:
      'If your website is down or its forms have stopped delivering, get in touch whenever it happens and we will do what we can. That is best effort rather than a promise — the response commitment covers the business week.',
  },

  /*
   * The service area is defined once, in `config/market.ts`, alongside the description of
   * who the service is built for. Both are facts about the market rather than about the
   * website, and both were previously spread across several files — which is how a site
   * ends up claiming a town nobody serves.
   */
  serviceArea,

  offer: {
    freeReview: {
      /*
       * Set to false if a free assessment is not part of the final offer. Doing so removes
       * every mention of it from the site and swaps the primary button for the fallback
       * below — nothing anywhere else needs to change.
       */
      enabled: true,
      /*
       * "Review" became "assessment" when the primary call to action did, because a
       * button reading "Get my free website assessment" that lands on a section headed
       * "Free website review" is two offers as far as the reader is concerned — and the
       * one thing a sceptical buyer notices fastest is a site that cannot keep its own
       * names straight. The thing itself is unchanged.
       */
      name: FREE_REVIEW_NAME,
      summary:
        'Send us your website — or your Google listing if you do not have one — and we will send back a short, plain-English list of what is likely costing you calls, and what we would do about it.',
      includes: [
        'How the site behaves on a phone',
        'How easy you are to call, and how quickly',
        'Whether it is clear what you do and where you work',
        'Whether a quote request actually reaches you',
        'The two or three changes we would make first',
      ],
      caveat: 'No charge and no obligation. If a new website is not what you need, we will say so.',
      /*
       * The link to the sample, shown wherever the assessment is offered.
       *
       * It lives here rather than in `content/teardown.ts` for a bundling reason: the
       * homepage and the contact page render it, and importing the teardown for two
       * strings pulled that whole lazy route's copy into the eager bundle. It also sits
       * more honestly beside the offer it qualifies than beside the page it points at.
       */
      sampleLede: 'Not sure what a free assessment actually gets you?',
      sampleLabel: 'See the six sections it comes back with',
    },
  },

  /*
   * `cta` is the hero the site ships with: headline, illustration and a button that takes
   * the visitor to the form on the contact page.
   *
   * `form` is the other build — the two-step lead form inline on the first screen. It is
   * finished and tested (`features/contact/HeroLeadForm.tsx`), switched off by choice
   * rather than abandoned, so comparing the two is a one-word change here.
   */
  hero: { variant: 'cta' },

  /*
   * One primary action for the whole site. Every button that matters uses `primary`, so
   * testing different wording is a one-line change here rather than a search through JSX.
   *
   * The label is in the visitor's voice — "Get my", not "Get your" — because the button
   * is the thing they are saying, not the thing they are being told.
   *
   * `secondary` is a same-page anchor rather than a route: it drops the reader into the
   * section that explains the system, which is the question a first-time visitor actually
   * has. `ButtonLink` renders anything that is not a `/` path as a plain anchor, so the
   * browser handles the scroll — no router involvement and no scroll-restoration fight.
   */
  cta: {
    /*
     * "Review" became "assessment", and the destination stayed.
     *
     * The word is the change. A *review* is something I do to your site and send back —
     * useful, and it still costs the reader an email and a wait. An *assessment* is what
     * the site already offers on `/audit`: twenty checks they score themselves in about
     * five minutes, with no email address, and a result that is about their business
     * rather than about mine. Both are on offer and this button names the lower-friction
     * one, because the first conversion should never be "decide whether to spend $4,900".
     *
     * ======================================================================
     * THE DESTINATION CHANGED, AND THIS IS THE ONE-LINE EDIT IT PREDICTED
     * ======================================================================
     *
     * It used to read: "The `to` still points at the contact form… Changing the
     * destination is a one-line edit here if that turns out to be wrong." It turned out to
     * be wrong for one specific reason, and the reason is not about the copy.
     *
     * `/contact#request` is a seven-field form that **stores nothing until it is
     * finished**. Somebody who typed their name and their email address and then stopped
     * left no row, no address and no way to know they were ever here — and seven fields is
     * the length at which most people do stop. The evidence and the alternative are in
     * `docs/ACCOUNT-FIRST-CAPTURE.md`; the short version is that the first commitment on
     * this path is now one field instead of seven, and that first commitment produces a
     * durable record, because an account is a record that owns itself.
     *
     * `/contact` is untouched and still in the footer, still linked from the new page, and
     * still where `secondary` sends somebody who has already decided to buy. Nobody who
     * would rather just send a message is trapped in an account flow.
     * ======================================================================
     */
    /*
     * ======================================================================
     * THE PRIMARY ACTION IS THE BLUEPRINT NOW — DECISION 043
     * ======================================================================
     *
     * **Modifies DECISION 028's destination, not its principle.** That decision moved every
     * primary call to action to `/get-my-assessment` on the argument that a first commitment
     * of one field beats one of seven, and that the account *is* the capture. Both halves of
     * that reasoning are intact and `/get-my-assessment` is untouched — it is the offer page,
     * it is indexed, and it is where a reader who wants a person to look at their site goes.
     *
     * What changed is that there is now something with a **lower** first commitment than an
     * email address and a considerably better claim to being the product demonstration.
     *
     * ## The arithmetic
     *
     * Interactive tools convert at 6.2–8.3% against 3.8% for gated static offers, and
     * assessment/maturity tools in professional services land at 7–10%. They produce *fewer*
     * raw leads than a gated download at the same spend and convert them to qualified
     * opportunities at a materially higher rate — which is exactly the trade this business
     * wants, because it takes one build at a time.
     *
     * ## The argument that is not about arithmetic
     *
     * DECISION 028's own words: "the first conversion should never be 'decide whether to
     * spend $4,900'". The Blueprint is a smaller first step than the one that decision
     * settled on — it costs nothing at all, not even an address — and it ends by *showing the
     * reader the thing being sold*, worked through against their own business. An account
     * offered at the end of that is offered to somebody who has already had the value, which
     * is the exchange `/audit` has always made and the one this funnel was reaching for.
     *
     * The capture is not lost. It moves to the moment it is worth most.
     * ======================================================================
     */
    primary: {
      label: 'Get my Website Blueprint',
      to: routes.blueprint,
    },
    primaryFallback: { label: 'Start a conversation', to: `${routes.contact}#${sections.request}` },
    /*
     * The secondary action, for the reader who is already convinced.
     *
     * It used to be "See exactly what you get", scrolling to the offer block — a useful
     * action for a researcher and a dead end for somebody who arrived from a referral
     * already intending to buy. That reader had exactly one button, and it offered them a
     * diagnosis they did not need.
     *
     * So the two actions now serve the two visitors the first screen actually gets: the
     * primary is the low-friction diagnosis for somebody deciding, and this is the direct
     * route to a conversation for somebody who has decided. It carries `?intent=build` so
     * the contact form already knows why they came.
     */
    secondary: {
      label: 'Start my project',
      to: `${routes.contact}?intent=build#${sections.request}`,
    },
    /*
     * The header's version of the primary action.
     *
     * Same destination, fewer words. The full label is right on a page section where it
     * has a line to itself; in a sticky bar already carrying a name, a tagline, five nav
     * items and a phone number it was wrapping onto two lines and making the button the
     * largest object on the screen. Shortening the button rather than dropping a nav item
     * keeps every route one click away.
     */
    navLabel: 'Get my Blueprint',
  },

  /*
   * Four destinations and one action, and the four are the four questions a visitor
   * arrives with: what do you do, can you look at mine, is your work any good, who are
   * you. Everything else is reachable from the page that answers one of them.
   *
   * "Contact" used to sit here, pointing at exactly where the call-to-action button
   * already goes — two links to one destination, one of them styled to look ordinary.
   * The footer still carries a Contact link for anyone hunting for one.
   *
   * **"PlayBook" was removed from this bar.** It is the highest-*total*-value page on the
   * site and one of the lowest value-*per-second* for somebody arriving cold: twenty
   * improvements is a reading commitment, offered to a visitor who has not yet decided
   * whether this business is worth two minutes. It stays in the footer, it is linked from
   * the audit result — which is exactly the reader it is written for — and the bar it
   * left is a bar with room in it. See `docs/VALUE-PER-SECOND.md` §4.
   */
  nav: [
    { label: 'Services', to: routes.services },
    /*
     * Pricing, immediately after Services, and it is the fifth item on a bar that was
     * deliberately kept to four.
     *
     * The note above says four destinations answer the four questions a visitor arrives with.
     * That was true and it was missing one, because the fourth question a visitor arrives with
     * — often the *first* — is what it costs, and this site's answer to it was buried below the
     * fold of two long pages. A price published in a category where nobody publishes one is
     * worth very little if the reader has to scroll to find it.
     *
     * It earns the slot the PlayBook lost rather than adding to a full bar. And it is the
     * cheapest item here to click: nothing on `/pricing` asks for anything, which is what makes
     * it safe to put in front of somebody who has not decided.
     */
    { label: 'Pricing', to: routes.pricing },
    /*
     * The audit sits in the navigation because it is the site's lowest-friction offer:
     * it asks for nothing, it returns a diagnosis of the reader's own site, and somebody
     * who completes it is the most qualified visitor this site will ever get.
     *
     * "Free audit" became "Score your site": with a "free website assessment" as the
     * primary button on every page, two nav items both starting "Free…" read as two
     * competing offers. This label says what the page actually is — the do-it-yourself
     * version — and leaves "free" to the one primary offer. See PART 20 of the offer
     * redesign brief and `docs/business-offer.md` §14.
     */
    { label: 'Score your site', to: routes.audit },
    { label: 'Examples', to: routes.portfolio },
    { label: 'About', to: routes.about },
  ],

  footerNav: [
    { label: 'Home', to: routes.home },
    { label: 'Services', to: routes.services },
    { label: 'Pricing', to: routes.pricing },
    { label: 'Score your site', to: routes.audit },
    /*
     * The Blueprint, in the footer rather than the header. It is the second diagnostic on the
     * site and a second one in the bar would read as two competing offers — the same reason
     * the PlayBook left it. Its readers arrive from the audit's result, from search, or from a
     * link somebody sent, all of which reach a footer perfectly well.
     */
    { label: 'Website Blueprint', to: routes.blueprint },
    /*
     * The free assessment, which stopped being the primary destination in DECISION 043 and
     * did not stop mattering.
     *
     * It is the offer for somebody who wants a person to look at their *real* site, and the
     * Blueprint's own result hands off to it — but a page reachable only from the far end of
     * a twelve-question flow is a page most people never see. The footer is what makes it a
     * destination rather than a consequence.
     */
    { label: FREE_REVIEW_NAME, to: routes.getAssessment },
    { label: 'PlayBook', to: routes.playbook },
    /*
     * The capability library, in the footer rather than the header for the same reason the
     * PlayBook is: it is depth somebody goes looking for after they have decided the business
     * is worth reading, not a thing to browse to cold. It is also the page most likely to be
     * linked in a reply to "can it do X?", which is a URL somebody sends rather than finds.
     */
    { label: 'What a website can do', to: routes.capabilities },
    { label: 'Examples', to: routes.portfolio },
    /*
     * The teardown is in the footer rather than the header for the same reason the
     * industry pages are: it is proof somebody goes looking for once they are already
     * interested, not a thing to browse to first.
     */
    { label: 'Teardown', to: routes.teardown },
    { label: 'About', to: routes.about },
    { label: 'Contact', to: routes.contact },
    { label: 'Privacy', to: routes.privacy },
    { label: 'Terms', to: routes.terms },
  ],

  /*
   * Add profiles here once they exist. An empty list simply hides the section — the
   * site does not link to accounts that have not been created.
   */
  social: [],

  seo: {
    // Must stay in step with `name` above — a search result reading "JobForge |
    // SomeOldName" is two businesses as far as the reader is concerned.
    titleSuffix: 'JobForge',
    /*
     * The title competes on the outcome term rather than the commodity term.
     *
     * "Websites built to win work…" put the site in the same result set as every web
     * designer in the metro, which is a fight decided on price. The phrase a business owner
     * actually types when they know something is wrong but not what is closer to this: they
     * are getting visitors and not getting calls.
     *
     * "Website" stays in the description, one line down, where it says what the mechanism is.
     */
    defaultTitle: 'Turn website visitors into calls — Seattle service businesses',
    /*
     * Under 200 characters, which a test enforces because search engines truncate around
     * 160 and a description that gets cut mid-clause is worse than a shorter one.
     */
    defaultDescription:
      'Conversion-focused websites for HVAC, plumbing, electrical, roofing and landscaping businesses around Greater Seattle — built to turn the visitors you already have into calls, then measured.',
    /*
     * A raster, because most social platforms will not render an SVG preview. Generated
     * from `og-image.svg` by `npm run capture` — edit the SVG, recapture, commit both.
     */
    ogImage: '/og-image.png',
    ogImageType: 'image/png',
    locale: 'en_US',
  },
};

/** Resolves the primary call to action, honouring the free-review switch above. */
export const primaryCta = site.offer.freeReview.enabled
  ? site.cta.primary
  : site.cta.primaryFallback;
