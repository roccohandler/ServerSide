import { prices } from './offer';

/*
 * ============================================================================
 * LEGAL PAGES — PLAIN ENGLISH, NOT REVIEWED BY A LAWYER
 * ============================================================================
 *
 * These describe what this application actually does and what the business has actually
 * agreed to. They are written in plain English on purpose: a page nobody reads protects
 * nobody.
 *
 * What they are NOT: legal advice, or a claim that any particular law has been complied
 * with. Have both reviewed properly before the site handles significant volumes of real
 * enquiries. The retention periods below are operational defaults chosen by the business,
 * not periods any regulator has been consulted about.
 *
 * Three things must stay true here or the page becomes a lie:
 *
 *   1. The privacy page says this site runs no analytics or advertising tracking. That is
 *      true today — `lib/analytics.ts` fires events into nothing. The moment a provider is
 *      wired into `index.html`, this file has to change in the same commit.
 *   2. **It has to enumerate everything, including the things that never leave the
 *      browser.** The PlayBook assessment and the Website Score both persist to
 *      `localStorage`, and the audit transmits a generated summary of somebody's scores
 *      and their own business figures rather than a message they wrote. A page that lists
 *      "any message you write" and stops there is describing a smaller site than this one.
 *      `content.test.ts` asserts both are named.
 *   3. The commercial terms below must match `commercialTerms` in `content/offer.ts` and
 *      the written client agreement. Three copies of the same facts is two too many
 *      places for them to drift, so figures are interpolated rather than retyped.
 * ============================================================================
 */

export const legalNotice =
  'Written in plain English by the business rather than by a lawyer. These pages describe how this website and this service actually work; they are not legal advice.';

export const privacyContent = {
  heading: 'Privacy',
  intro:
    'What happens to the information you send through this website. Written in plain English, and describing how the site actually works today rather than how a template says it should.',
  sections: [
    /*
     * ========================================================================
     * THIS SECTION HAD STOPPED BEING TRUE, AND THAT IS THE FAILURE THIS PAGE
     * EXISTS TO NOT COMMIT
     * ========================================================================
     *
     * It listed four things "all of which you enter yourself" and closed: "Nothing else is
     * collected, and nothing is gathered about you in the background."
     *
     * By then the application had grown accounts, sessions, Stripe customers, Google sign-in
     * and a per-user activity log. Three of those record things the visitor does *not* type:
     * `lastLoginAt` on the user, `lastUsedAt` on the session, and every entry in the activity
     * collection. So the closing sentence was a checkably false statement of fact, on the one
     * page whose entire job is being accurate about data — and the page the signup form links
     * to as the notice being agreed to.
     *
     * The test block for this page passed throughout, because it asserts that certain words
     * *appear* and cannot notice a whole subsystem missing. Its own preamble names this exact
     * failure mode: "a surface is added that stores or transmits something, and the privacy
     * page — written before it existed — carries on describing a smaller site." It did.
     *
     * The rule that follows: **a surface that stores or transmits anything changes this
     * section in the same commit.** Not the next one.
     * ========================================================================
     */
    {
      id: 'what',
      heading: 'What is collected',
      body: 'Five things. The first four you enter yourself. From the contact form: your name, your business name, your email address, your phone number, your website address if you give one, what you need help with, and any message you write. From the Website Score, if you choose to send it: the same contact details, plus a written summary of the answers you gave — your score, the five categories that came out weakest, and whichever of the traffic, enquiry, close-rate and job-value figures you filled in. From the PlayBook form: your email address, and the fact that you asked for the workbook. From the project onboarding form, if you become a client: the business details, services, service areas and account information you supply so your website can be built. And if you create an account: your email address, your name, your business name, and either a password — stored only as a hash, never the password itself — or the fact that you signed in with Google, together with the Google account id and address that identifies you there. Two things about an account are recorded by the site rather than typed by you: when you last signed in, and a log of what has happened on your project — payments taken, tasks completed, an assessment saved, a preview delivered — so that you and we are reading the same history. If you pay, Stripe holds the card details and we keep only the customer reference it gives us. Beyond that nothing else is collected, and nothing watches which pages you look at.',
    },
    {
      id: 'tracking',
      heading: 'Analytics and tracking',
      body: 'There is none. No analytics product, no advertising pixels, no third-party scripts, no cookies set for tracking. The site does not know who you are, where you came from, or which pages you looked at. If that ever changes this page changes with it, because the alternative is a privacy policy that quietly stops being true.',
    },
    /*
     * The section this page did not have and needed. Two surfaces write to browser
     * storage — the PlayBook's self-assessment and the audit — and a privacy page that
     * enumerates transmitted data while staying silent about stored data is describing a
     * smaller site than this one. It is also the section that makes the audit's own
     * consent line credible rather than reassuring.
     */
    {
      id: 'browser',
      heading: 'What stays in your browser',
      body: 'The PlayBook self-assessment and the Website Score both keep your answers in your own browser’s local storage while you work, so a refresh or a phone call does not cost you twenty questions. That is storage on your device, not a copy held anywhere else: the PlayBook assessment is never transmitted at all, and the audit is transmitted only if you fill in your details and press send. Both pages have a button that clears everything, and clearing your browser data removes it just as effectively.',
    },
    {
      id: 'why',
      heading: 'Why it is collected',
      body: 'Contact form: to reply to your enquiry, and if we end up working together, to carry out that work. Website Score: to reply about the specific things it flagged, which is not possible without seeing what it flagged. PlayBook form: to send you the workbook. Onboarding form: to build the website you have commissioned. Account: to let you sign in, see your own project and pay for it — and the activity log so you can see what has happened without having to ask. That is the whole list.',
    },
    {
      id: 'where',
      heading: 'Where it goes',
      body: 'Your submission is stored in a database and emailed to the business owner so it cannot be lost to a bounced email. Four services are involved: MongoDB stores it, Resend delivers the notifications, Stripe takes the payments and holds the card details we never see, and Google verifies who you are if you choose to sign in that way. None of them is given permission to use any of it for anything else. It is not sold, rented, shared or added to anybody else’s list.',
    },
    {
      id: 'playbook',
      heading: 'The PlayBook email',
      body: 'Asking for the workbook gets you the workbook. There is no follow-up sequence, no newsletter and no drip campaign — if that ever changes, you will be asked to opt in to it separately rather than discovering it in your inbox. Your address is stored with the date you gave it and the fact that you consented, so there is a record of what you actually agreed to.',
    },
    {
      id: 'how-long',
      heading: 'How long it is kept',
      body: 'Enquiries and sent scores are kept for 24 months after the last meaningful contact, then deleted — unless a longer period is genuinely needed for accounting, a live project, or a dispute. PlayBook subscriptions are kept until you ask for them to be removed, or until they are no longer needed for the reason you gave the address. Account records, and the project history attached to them, are kept while the account exists and for 24 months after it is closed; sign-in sessions expire on their own within thirty days, and password-reset and confirmation links within the hour. Anything still sitting in your own browser is yours and is not on any schedule. These are operational choices made by the business, not periods imposed by anybody.',
    },
    {
      id: 'rights',
      heading: 'Asking for a copy or a deletion',
      body: 'Email or call using the details on the contact page and ask. You will get a copy of what is held, or it will be deleted, and you do not have to give a reason or quote a regulation to get either.',
    },
  ],
} as const;

export const termsContent = {
  heading: 'Terms',
  intro:
    'How this website may be used, and the business terms for project and management work. The written agreement you sign is what governs the work; this is the same thing in plain English so you can read it before you get in touch rather than after.',
  sections: [
    {
      id: 'site',
      heading: 'Using this website',
      body: 'The information on this site describes the services offered. It is not a quote, an offer, or a contract. Prices shown are the current published prices for the standard scope — where a founding-client price is shown, its condition is stated beside it. What your project actually costs is confirmed in writing before any work starts.',
    },
    {
      id: 'examples',
      heading: 'The examples shown',
      body: 'Anything on this site labelled as a demonstration was built to show an approach. Demonstrations are not client work and are not presented as such. There are no testimonials on this site because there are no clients to quote yet — when there are, they will be real people who agreed to be quoted.',
    },
    {
      id: 'launch',
      heading: 'The project fee',
      body: `The build is a one-time project at the published price of ${prices.launch} under founding-client pricing (standard project price ${prices.launchStandard}). The scope and the fee are agreed in writing before any work begins. Payment is half to begin and half on the day the site goes live, and nothing else is owed on the build. The project includes two revision rounds; a revision round is a consolidated set of requested changes submitted together. New pages, new functionality, new services or a materially changed brief after sign-off are additional scope and are quoted separately before that work begins. Typical launch is two to four weeks from receiving the materials required from you; timing depends on how quickly content, approvals, access and feedback come back.`,
    },
    {
      /*
       * The founding-client price is a commercial term with a condition attached, so it
       * belongs in the terms rather than only in the marketing copy. Somebody who takes
       * the offer is agreeing to the case-study permission, and they should be able to
       * read that here rather than discover it in an email.
       */
      id: 'founding',
      heading: 'Founding-client pricing',
      body: `A limited number of projects are offered below the standard price in exchange for permission to publish the work as a case study — including the state of the site beforehand, the reasoning behind the changes, and what changed after launch. Nothing is published without written approval of the specific material first, and any figures shared are only those you agree to share. The standard price is the price the work is offered at outside this arrangement; it is not a former price and no claim is made that anyone previously paid it. There is no deadline: the offer is limited by the number of projects, and when those are taken the standard price applies.`,
    },
    {
      id: 'management',
      heading: 'Growth Partner, the ongoing plan',
      body: `Growth Partner is optional, separate from the project, and never a condition of it. If chosen, it is ${prices.managementDisplay}, beginning on the launch date, with a three-month minimum. After the minimum it continues month-to-month and either of us can end it with 30 days' written notice. An annual prepayment option is available at ${prices.annual}; if the plan ends part-way through a prepaid year, unused whole months are refunded at the ${prices.management} monthly rate. Hosting and domain renewal costs are included in the monthly fee while the plan is active; without the plan, those accounts are in your name and you pay the providers directly.`,
    },
    {
      id: 'scope',
      heading: 'What management includes',
      body: 'Hosting, certificates, backups, security and software updates, uptime and form monitoring, bug fixes, and content, service and photo changes. Ongoing conversion and user-experience improvements. Four seasonal refreshes per year. Up to one campaign landing page and up to two campaign copy alignments per calendar month, which do not accumulate if unused. A/B testing where site traffic supports a statistically meaningful result. It does not include managing advertising accounts, budgets, bidding or media buying.',
    },
    {
      id: 'response',
      heading: 'The response guarantee',
      body: 'While management is active, a request raised through the website support form or the designated business email receives a substantive reply within 24 business hours. Business hours are Monday to Friday, 8am to 6pm Pacific; weekends and US federal holidays are excluded and pause the clock. A qualifying response is acknowledgement plus an answer, a next step, or a statement of what is needed to proceed — it is a response, not a resolution, and does not commit to completing any work within that period. If a qualifying request does not receive a qualifying response in time, that calendar month’s management fee is waived in full and applied without you having to request it. Excluded: requests sent through other channels; duplicate or automated messages; delays waiting on information, approval or access from you; outages at hosting providers, registrars or other third parties; work outside the agreed scope; security incidents requiring third-party action first; and events outside either party’s reasonable control.',
    },
    {
      id: 'ownership',
      heading: 'Ownership',
      body: 'The domain, the hosting account, the content and the website belong to you. Accounts are registered in your name wherever it is technically practical, and we administer them on your behalf while management is active. If management ends, those accounts stay with you and billing reverts to you. Campaign landing pages built as part of your website remain part of your website. Any active A/B test is ended and the designated version left live.',
    },
    {
      id: 'client',
      heading: 'What is needed from you',
      body: 'The information and materials required to do the work: your service list, business details, service area, and photographs of your own completed jobs, plus access to any systems we need and reasonably prompt decisions. Timelines are measured from when those are received.',
    },
    {
      id: 'contact',
      heading: 'Questions',
      body: 'Use the contact details on this site. Ask to see the written agreement before you commit to anything — that is what it is for.',
    },
  ],
} as const;
