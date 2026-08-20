/*
 * About page copy.
 *
 * Every sentence here is either verifiably true of this business or a statement about how
 * the work is done. There is no invented backstory, no years of experience, no client
 * count, no certification and no awards — not out of modesty but because a fabricated
 * credential is the one thing on this site that could not be defended in the first
 * conversation with a customer, and this is the page whose entire job is being believed.
 *
 * JobForge speaks as a company, and this is the page that says plainly what size the
 * company is: founder-run, one build at a time. That is a real constraint presented as
 * what it actually is — a trade-off with a benefit attached — rather than dressed up as
 * a team that does not exist.
 */
export const aboutContent = {
  heading: 'About',
  /*
   * ==========================================================================
   * "DIGITAL GROWTH SYSTEMS" AND "SOFTWARE COMPANY" ARE BOTH GONE — DECISION 038
   * ==========================================================================
   *
   * This page opened with *"JobForge builds digital growth systems"* and its first section
   * said *"A software and digital growth company for local service businesses."*
   *
   * That was the single most damaging pair of sentences left on the site. `getjobforge.com`
   * sells field-service-management **software** to electricians, plumbers, HVAC technicians
   * and contractors — the same trades, the same buyer — and a reader who arrives here trying
   * to work out which JobForge this is was being told, on the page whose entire job is being
   * believed, that it is a software company.
   *
   * DECISION 038 records why that misread is the dangerous one: *job board* is implausible and
   * self-corrects, and *job-management software* is entirely plausible, so it never does. The
   * reader does not discover they were wrong — they conclude the site is not for them.
   *
   * "Growth systems" went with it, and that is a separate improvement recorded in
   * `content/site.ts`: it means nothing to somebody who fixes furnaces for a living, which is
   * the one register this site cannot afford.
   * ==========================================================================
   */
  intro:
    'JobForge builds websites for local service businesses — the kind whose job is to produce calls and quote requests, not just to exist.',

  sections: [
    {
      id: 'what',
      heading: 'What JobForge is',
      body: 'A website practice for local service businesses, and nothing else. We build one thing: a website designed around how your customers decide, launched on your own domain, measured from the day it goes live, and — if you choose the ongoing service — maintained and improved for as long as that is worth doing. We do not sell scheduling software, dispatch tools or a platform you log into. The website is the mechanism; the point of it is a business that more of the right people find, trust and call.',
    },
    {
      id: 'who',
      heading: 'Who is behind it',
      /*
       * Written entirely from what is already true elsewhere in this repository:
       * founder-run, Greater Seattle, one build at a time. Replace it with something more
       * specific whenever there is something specific to say — "we used to dispatch for
       * an HVAC company" would do more work than any of this — but never with a
       * credential that has not been earned.
       */
      body: 'JobForge is run by its founder, Maxwell Cuenca, and it is deliberately small: one build at a time, taken on so it actually gets finished. There is no account manager between you and the work, and nobody your website gets handed to once the invoice clears. The person who builds your system is the person who answers about it afterwards — and who knows why your contact form is laid out the way it is.',
    },
    {
      id: 'why',
      heading: 'Why service businesses',
      /*
       * The argument, not a biography. If there is ever a personal reason worth telling —
       * a trade background, a family business that lost work to a bad website — it belongs
       * here and it will beat this. Until then this is the honest version.
       */
      body: 'Service businesses depend on their digital presence to turn local searches and referrals into calls and quote requests. That makes the website part of the sales process rather than a digital brochure, and it is why the interesting question is not "does it look good" but "how many of the people who found you this month gave up before they got in touch". It is also a market where one extra customer is usually worth considerably more than what this costs — which is what makes the ongoing work worth doing at all, rather than a nice idea nobody can justify.',
    },
    {
      id: 'philosophy',
      heading: 'Value per second',
      /*
       * The company philosophy, named. One section, not a manifesto: the internal
       * value-per-second doc is explicit that the philosophy is demonstrated rather than
       * narrated, and this paragraph exists because a buyer deserves to know the standard
       * the work is held to — not because the site wants to talk about itself.
       */
      body: 'Every second a visitor spends on a website should earn its place. Every page, section, sentence and button either helps a customer decide — answers a question, removes a doubt, makes the next step obvious — or it is friction wearing a design award. A beautiful website that does not help the customer decide is still a bad website. That standard is called value per second, it shapes everything JobForge builds, and this site is built to it too: if a section does not help you decide, it is not here.',
    },
    /*
     * ========================================================================
     * THE SECTION THAT SAYS WHEN NOT TO BUY
     * ========================================================================
     *
     * The strongest trust asset available to a business with no case studies is a
     * demonstrated willingness to lose the sale, and this page had every other founder-led
     * signal — the name, the size, the philosophy — without that one.
     *
     * Every claim in it is checkable against something else on this site rather than being a
     * posture: the audit's third branch genuinely recommends leaving a working site alone,
     * `localSearch.caveat` genuinely says a Google listing matters more than the website, and
     * `conversion.handoff` genuinely marks the last three steps of the funnel as the client's.
     * A page claiming this without those would be a claim; here it is a summary.
     * ========================================================================
     */
    {
      id: 'honest',
      heading: 'What we will tell you not to buy',
      body: 'If your website is basically working, we will say so — the free score on this site has a branch that recommends leaving it alone, and it is there because most honest diagnoses of a decent site end that way. If the thing costing you work is your Google listing rather than your website, we will tell you that instead of selling you around it. And if the phone is not being answered, no website we build will fix it, so we say that before you buy rather than in month three. None of that is modesty. A business with no case studies yet has exactly one thing to trade on, and it is being right about the things that are easy to be wrong about profitably.',
    },
    {
      id: 'where',
      heading: 'Where we work',
      body: 'Greater Seattle. Knowing the area matters more than it sounds — a site has to be clear about which towns you cover, and that is easier to get right when the place names mean something. Most of the work happens remotely, and meeting in person is always an option when it helps.',
    },
  ],

  contactHeading: 'Get in touch directly',
  contactBody:
    'No form required. Call, or send an email — it goes straight to the person who does the work, because there is no one else it could go to.',
} as const;
