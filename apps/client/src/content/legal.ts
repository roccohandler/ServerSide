import { analyticsEnabled } from '../config/env';
import { salesTax } from '../config/pricing';
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
 *   1. The privacy page describes the analytics this build actually has. This used to be a
 *      promise kept by whoever remembered — "the moment a provider is wired in, this file has
 *      to change in the same commit" — and it is now kept by the code: the `tracking` section
 *      and the last clause of `what` are both chosen by `analyticsEnabled()`, the same
 *      function the script loader reads. See DECISION 039. **If a third statement about
 *      tracking is added to this page, it goes through the same condition.**
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
      body: `Five things. The first four you enter yourself. From the contact form: your name, your business name, your email address, your phone number, your website address if you give one, what you need help with, and any message you write. From the Website Score, if you choose to send it: the same contact details, plus a written summary of the answers you gave — your score, the five categories that came out weakest, and whichever of the traffic, enquiry, close-rate and job-value figures you filled in. From the PlayBook form: your email address, and the fact that you asked for the workbook. From the project onboarding form, if you become a client: the business details, services, service areas and account information you supply so your website can be built. And if you create an account: your email address, your name, your business name, and either a password — stored only as a hash, never the password itself — or the fact that you signed in with Google, together with the Google account id and address that identifies you there. Two things about an account are recorded by the site rather than typed by you: when you last signed in, and a log of what has happened on your project — payments taken, tasks completed, an assessment saved, a preview delivered — so that you and we are reading the same history. If you pay, Stripe holds the card details and we keep only the customer reference it gives us. Beyond that nothing else is collected, ${
        analyticsEnabled()
          ? 'and the only thing recorded about your visit itself is the anonymous page count described below, which is not linked to you or to any of the above'
          : 'and nothing watches which pages you look at'
      }.`,
    },
    /*
     * ========================================================================
     * THE ONE SECTION ON THIS PAGE THAT IS GENERATED
     * ========================================================================
     *
     * Every other string here is written. This one is chosen by `analyticsEnabled()`, and the
     * reason is the sentence the previous version of it ended with: *"If that ever changes
     * this page changes with it, because the alternative is a privacy policy that quietly
     * stops being true."*
     *
     * That was a promise made by a comment, kept by whoever remembered. The moment a provider
     * is configured — an environment variable, in a dashboard, possibly by somebody who has
     * never opened this file — the honest version of this section is a different paragraph.
     * Nothing in a build would notice, and the failure is not a bug: it is a false statement
     * of fact on the page a signup form links to as the notice being agreed to.
     *
     * So the choice is made from the same configuration the script loader reads. Two
     * paragraphs, one condition, and it is impossible for the page to describe a build it is
     * not part of. See DECISION 039 and `config/env.ts`.
     *
     * **The absent version is still the default**, and both are written to be true rather than
     * reassuring. The second one names what is collected, names what is not, and says plainly
     * that no cookie is involved — because "privacy-friendly analytics" is a phrase that has
     * been used to describe products that set cookies.
     * ========================================================================
     */
    {
      id: 'tracking',
      heading: 'Analytics and tracking',
      body: analyticsEnabled()
        ? 'This site counts page views and a short list of actions — a button pressed, a form submitted, a question opened — using a privacy-preserving analytics service. It sets no cookies, stores nothing on your device, and collects no personal data: there is no identifier that links one visit to another, and nothing that can be traced back to you. Your name and email address are never sent to it, even on pages where you have typed them. There are no advertising pixels, no third-party trackers and no data sold or shared with anybody. What it is for is answering one question — which parts of this site are useful to people — and it cannot answer any question about you specifically.'
        : 'There is none. No analytics product, no advertising pixels, no third-party scripts, no cookies set for tracking. The site does not know who you are, where you came from, or which pages you looked at. If that ever changes this page changes with it — and it changes automatically, because this paragraph is chosen by the same setting that would switch the analytics on.',
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
      body: `The build is a one-time project at the published price of ${prices.launch} under founding-client pricing (standard project price ${prices.launchStandard}). The scope and the fee are agreed in writing before any work begins, and that agreement is recorded in your account rather than left in an email thread — you can read what you accepted, and when, at any time. Payment is half to begin and half on the day the site goes live. Beyond those two instalments and the sales tax described below, nothing else is owed on the build. The project includes two revision rounds; a revision round is a consolidated set of requested changes submitted together, so a single list of fifteen items is one round and fifteen separate messages over a fortnight is still one round — the count is about how the work is batched, not about how many times you write to us. New pages, new functionality, new services or a materially changed brief after sign-off are additional scope and are quoted separately before that work begins, never after. Typical launch is two to four weeks from receiving the materials required from you; timing depends on how quickly content, approvals, access and feedback come back.`,
    },
    /*
     * ========================================================================
     * TAX IS ITS OWN SECTION, NOT A SENTENCE INSIDE THE FEE
     * ========================================================================
     *
     * Washington's ESSB 5814 made custom website development a taxable retail sale on
     * 1 October 2025 — see DECISION 037. Roughly a tenth of the price, on every sale.
     *
     * It is a section of its own rather than a clause appended to `launch` because a buyer
     * scanning these headings for "what will actually leave my bank account" should find it
     * without reading a paragraph about revision rounds first. A surprise at checkout is the
     * single most reliable way to lose somebody who had already decided, and the whole
     * argument of this page is that nothing here is a surprise.
     *
     * No rate is stated, deliberately. The combined rate depends on the customer's own
     * address and changes on somebody else's schedule; Stripe computes it at checkout. A
     * number here would be wrong for most addresses and stale within a year — and worse,
     * a customer could add it to the price and be charged something different.
     * ========================================================================
     */
    {
      id: 'tax',
      heading: 'Sales tax',
      body: `${salesTax.explanation} This applies to the project fee and to Growth Partner. It is not a charge made by us and none of it is kept by us — it is collected on the state's behalf and passed on. Published prices on this site are exclusive of it.`,
    },
    /*
     * ========================================================================
     * REFUNDS — DECISION 010, AND THE BOUNDARY IS WORK, NOT A DATE
     * ========================================================================
     *
     * Nothing was published here for the entire time the site has been collecting a $2,450
     * deposit, and the register's own wording for why that had to change is the right one:
     * do not let the first dispute decide it for you.
     *
     * The boundary is **the first working session**, not a cooling-off window. A window
     * protects the wrong party: its clock can expire while no work has started, so somebody
     * who paid on a Monday and heard nothing for a fortnight would have lost their refund to
     * a calendar rather than to anything being done for them. Tying it to work beginning
     * makes it a fact about the project instead — and a checkable one, because the first
     * session writes an activity entry and the project leaves `onboarding`.
     *
     * The third sentence is the one that costs money and is here anyway: if the business
     * cannot deliver, the deposit comes back in full at any stage. A refund policy that only
     * describes the client walking away is a policy written by one party for one party.
     * ========================================================================
     */
    {
      id: 'refunds',
      heading: 'Refunds on the build',
      body: 'Before work begins, the deposit is refunded in full on request, and you do not have to give a reason. Once work has begun, the refund is the deposit less the fair value of the work completed to that point — assessed against what was actually produced, and never more than the deposit, so cancelling cannot cost you anything beyond what you have already paid. If we are the reason the project cannot go ahead, the full deposit is returned whatever stage it has reached. "Work begins" means the first working session on your project, which is recorded in your account with a date on it, so neither of us is relying on memory.',
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
    /*
     * ========================================================================
     * WHAT "FINISHED" MEANS, AND WHAT HAPPENS IF NOBODY ANSWERS — DECISION 011
     * ========================================================================
     *
     * Two clauses that only make sense together, which is why they are one section.
     *
     * **Completion is the Launch Standard.** The site already publishes eight pass/fail
     * checks and already says "it does not launch until it passes". What it had never done
     * is make that the contractual definition of done — so "finished" was still, formally, an
     * opinion held by whoever was asked. Adopting a bar the client can verify themselves
     * costs nothing new and removes the most common source of a stalled final payment.
     *
     * **Deemed acceptance is the backstop, and it is the half that protects the business.**
     * Without it a finished build can be held open indefinitely by silence: the milestone
     * cannot advance, the balance cannot be invoiced, and the one-build-at-a-time capacity
     * claim — the reason the two-to-four-week timeline is keepable at all — is being spent on
     * a project nobody is progressing.
     *
     * Ten business days, not five. A fortnight of working time is long enough that a holiday
     * or a bad month does not trigger it, and short enough to resolve inside a billing cycle.
     *
     * **What it is not: a launch.** Deemed acceptance makes the balance due. It does not put
     * anything live — that still requires the payment, exactly as a real approval does. And
     * it is only reachable from a state the client was genuinely told about, because
     * requesting approval sends an email and writes an activity entry, which is the evidence
     * the clock ever started.
     * ========================================================================
     */
    {
      id: 'completion',
      heading: 'Approval, and what "finished" means',
      body: 'The website is finished when it passes the eight checks published as the Launch Standard on this site. That is the definition, not an opinion — every check is something you could verify yourself on the day, and if it does not pass, it is not launched and we keep working. When the build reaches that bar we put the preview in front of you and ask you to approve it. Approving it makes the balance payable, and the site goes live the same working day the payment clears. If you would rather have changes, say so and it goes back into revisions; that is expected and it is what the two included rounds are for. If no response of any kind reaches us within ten business days of an approval being requested, the work is treated as accepted and the balance becomes due — that does not put anything live, it only settles what is owed for work already delivered and already shown to you.',
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
    /*
     * ========================================================================
     * THE OTHER KIND OF SILENCE, AND WHY IT GETS A DIFFERENT REMEDY
     * ========================================================================
     *
     * `completion` above handles silence in front of a *finished* website: the work is done,
     * so the remedy is that the balance falls due.
     *
     * This handles silence at the other end, where there is nothing to show yet because the
     * materials never arrived. The remedy has to be different, because there is nothing owed:
     * the project pauses and the build slot is released.
     *
     * That is not a penalty and the wording should never read as one. It is the honest
     * consequence of publishing "one build at a time" as the reason the timeline is keepable
     * — a capacity claim that cannot reclaim capacity is a capacity claim being made on
     * somebody else's behalf, since the client actually paying for it is the next one, who
     * cannot start.
     *
     * The deposit is untouched by a pause, and the sentence saying so is load-bearing: a
     * clause that pauses a project without confirming the money is safe reads as a
     * forfeiture, which is the opposite of what it is.
     * ========================================================================
     */
    {
      id: 'delays',
      heading: 'If things go quiet at your end',
      body: 'Timelines are measured from when your materials and decisions arrive, so a project cannot progress while we are waiting on them. If thirty days pass with nothing needed from us and nothing received from you, the project is paused and the build slot is released to the next client — because taking on one build at a time is what makes the two-to-four-week timeline keepable, and a slot held open indefinitely is one somebody else cannot use. Nothing is forfeited by a pause: your deposit stands, your work stands, and restarting is a matter of scheduling rather than of paying again. We will always write before pausing, and once more after, so it is never something you find out by logging in.',
    },
    {
      id: 'contact',
      heading: 'Questions',
      body: 'Use the contact details on this site. Ask to see the written agreement before you commit to anything — that is what it is for.',
    },
  ],
} as const;
