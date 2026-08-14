/*
 * ============================================================================
 * THE WELCOME PAGE — AFTER THE DEPOSIT
 * ============================================================================
 *
 * Stripe's checkout redirects here after a payment. The page has two jobs, in order:
 *
 *   1. Tell the new client exactly what happens next, so the moment after paying —
 *      the highest-anxiety moment in the whole relationship — is the moment they know
 *      the most, not the least.
 *   2. Collect the materials only they know, because the published timeline starts
 *      when those arrive and this form is what stops a paid project stalling in an
 *      email thread.
 *
 * Rules:
 *   - Nothing here confirms a *payment*. The browser arriving proves navigation, not
 *     money; the owner's confirmation comes from Stripe's webhook. So the copy says
 *     "once your deposit is confirmed", never "we have received your payment".
 *   - No prices. This page is for somebody who has already agreed them in writing.
 * ============================================================================
 */

export const welcome = {
  hero: {
    eyebrow: 'Welcome aboard',
    heading: "You're officially on the build schedule.",
    lede: 'Here is exactly what happens between now and launch — and the one thing the timeline is waiting on, which is the form below.',
  },

  /** The road ahead, as the client will experience it. */
  schedule: {
    heading: 'What happens next',
    steps: [
      {
        id: 'deposit',
        title: 'Deposit confirmed',
        description:
          'Stripe emails you a receipt, and we get told the moment it clears. Nothing else is owed until launch day.',
      },
      {
        id: 'onboarding',
        title: 'You send the materials',
        description:
          'The form below: your services, your service area, your photos, your accounts. The two-to-four-week clock starts when these arrive.',
      },
      {
        id: 'kickoff',
        title: 'Kickoff',
        description:
          'We confirm scope against what you sent, ask anything that is unclear, and the build begins.',
      },
      {
        id: 'design',
        title: 'Week 1 — strategy and design',
        description:
          'Your customers, your competitors, and a structure shaped by how people actually decide to hire you.',
      },
      {
        id: 'build',
        title: 'Week 2 — build',
        description:
          'Pages, quote funnel, tap-to-call, tracking, local-search foundation. We draft the wording; you will correct the facts.',
      },
      {
        id: 'review',
        title: 'Week 3 — your review',
        description:
          'You look at it on your own phone and send everything you want changed in one go. Two revision rounds are included.',
      },
      {
        id: 'launch',
        title: 'Week 4 — launch',
        description:
          'Final QA against the Launch Standard, the domain connects, and the site goes live in your name. The second half of the payment is due on launch day.',
      },
      {
        id: 'after',
        title: 'After launch — your choice',
        description:
          'Run the site yourself with a walkthrough and the logins, or have Growth Partner keep it hosted, maintained and improving. Whichever you chose is what happens; nothing starts without you choosing it.',
      },
    ],
  },

  /** Why the form exists, stated over it. */
  form: {
    heading: 'The onboarding form',
    lede: 'Give us the information only you know — we handle the rest. Ten minutes now is what keeps the launch two to four weeks away instead of two to four months.',

    fields: {
      businessName: { label: 'Business name' },
      contactName: { label: 'Your name' },
      email: { label: 'Email' },
      phone: { label: 'Phone' },
      services: {
        label: 'The services you want to be hired for',
        hint: 'A plain list is perfect. Note the ones that matter most.',
      },
      serviceAreas: {
        label: 'The towns and areas you cover',
        hint: 'The places you genuinely take work — this goes on the site.',
      },
      website: {
        label: 'Current website',
        optionalLabel: 'optional',
        hint: 'If you have one.',
        placeholder: 'example.com',
      },
      googleBusinessProfile: {
        label: 'Google Business Profile link',
        optionalLabel: 'optional',
        hint: 'Search your business name on Google Maps and copy the link.',
      },
      domainAndHosting: {
        label: 'Domain and hosting',
        optionalLabel: 'optional',
        hint: 'Where your domain is registered and who hosts the current site, if you know. "No idea" is a fine answer — we will find it.',
      },
      photosNote: {
        label: 'Photos of your finished work',
        optionalLabel: 'optional',
        hint: 'Phone photos are usually fine. Tell us roughly what you have — we will follow up with the easiest way to send them.',
      },
      competitors: {
        label: 'Competitors you rate — or run into',
        optionalLabel: 'optional',
        hint: 'Two or three names is plenty.',
      },
      callsToAction: {
        label: 'What you most want visitors to do',
        optionalLabel: 'optional',
        hint: 'Call you, request a quote, book an inspection — whatever fits how you sell.',
      },
      accessNotes: {
        label: 'Anything we will need access to',
        optionalLabel: 'optional',
        hint: 'Domain registrar, Google Business Profile, existing hosting. Just name them — never put passwords in a form.',
      },
      anythingElse: {
        label: 'Anything else',
        optionalLabel: 'optional',
      },
    },

    submit: { idle: 'Send my onboarding details', pending: 'Sending…' },

    privacyNote:
      'Used to build your website and nothing else. Never put passwords in this form — we will arrange access securely.',

    errorSummary: { heading: 'Please check the following before sending' },

    success: {
      heading: 'Got it.',
      body: 'Your materials are in. We will read through them, come back with anything unclear, and the build clock is now running. If you remember something later, just email it over.',
    },

    failure: {
      heading: 'That did not send',
      body: 'Nothing you typed has been lost. Try again in a moment, or email us the details directly — the address is at the bottom of the page.',
    },
  },

  /** For somebody who lands here without having paid anything — a wrong turn, not an error. */
  notPaidNote:
    'Landed here without a project underway? This page is for new clients after their deposit. If you are still deciding, the homepage has the whole offer, prices included.',
} as const;
