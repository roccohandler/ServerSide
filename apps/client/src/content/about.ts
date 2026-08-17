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
  intro:
    'JobForge builds digital growth systems for local service businesses — starting with a website whose job is to produce calls and quote requests, not just to exist.',

  sections: [
    {
      id: 'what',
      heading: 'What JobForge is',
      body: 'A software and digital growth company for local service businesses. The flagship product is a conversion-focused website: designed around how your customers decide, launched on your own domain, measured from day one, and — if you choose the ongoing service — maintained and improved for as long as it is worth improving. The website is the mechanism. The product is a business that more of the right people find, trust and call.',
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
