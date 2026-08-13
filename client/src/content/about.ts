/*
 * About page copy.
 *
 * Every sentence here is either verifiably true of this business or a statement about how
 * the work is done. There is no invented backstory, no years of experience, no client
 * count, no certification and no awards — not out of modesty but because a fabricated
 * credential is the one thing on this site that could not be defended in the first
 * conversation with a customer, and this is the page whose entire job is being believed.
 *
 * "Who I am" says what is true: this is one person, working alone, on one build at a
 * time. That is a real constraint presented as what it actually is — a trade-off with a
 * benefit attached — rather than dressed up as a team.
 */
export const aboutContent = {
  heading: 'About',
  intro:
    'I build and manage websites for local service businesses that want their website to do more than simply exist online.',

  sections: [
    {
      id: 'who',
      heading: 'Who I am',
      /*
       * Written entirely from what is already true elsewhere in this repository: one
       * person, Greater Seattle, one build at a time. Replace it with something more
       * specific whenever there is something specific to say — "I used to dispatch for an
       * HVAC company" would do more work than any of this — but never with a credential
       * that has not been earned.
       */
      body: 'One person. I do the work myself: the design, the build, the launch, and everything that happens afterwards. There is no team behind me, no account manager between us, and nobody I hand your website to once the invoice clears. That is a deliberate size rather than a stage I am hoping to grow out of — it means I take on one build at a time so it actually gets finished, and it means the person who answers when you get in touch is the person who knows why your contact form is laid out the way it is.',
    },
    {
      id: 'what',
      heading: 'What I do',
      body: 'I build and manage websites for local service businesses. That means the whole job and then the job after it: working out what the site needs to say, building it, getting it live on your own domain, making sure a quote request actually reaches your inbox — and then hosting it, maintaining it, changing it when your business changes, and improving the parts that bring in work. I take on one build at a time so it gets finished.',
    },
    {
      id: 'why',
      heading: 'Why local service businesses',
      /*
       * The argument, not a biography. If there is ever a personal reason worth telling —
       * a trade background, a family business that lost work to a bad website — it belongs
       * here and it will beat this. Until then this is the honest version.
       */
      body: 'Service businesses depend on their website to turn local searches and referrals into calls and quote requests. That makes the website part of the sales process rather than a digital brochure, and it is why the interesting question is not "does it look good" but "how many of the people who found you this month gave up before they got in touch". It is also a market where one extra customer is usually worth considerably more than what this costs — which is what makes the ongoing work worth doing at all, rather than a nice idea somebody cannot justify.',
    },
    {
      id: 'where',
      heading: 'Where I work',
      body: 'Greater Seattle. Knowing the area matters more than it sounds — a site has to be clear about which towns you cover, and that is easier to get right when the place names mean something. Most of the work happens remotely, and I am happy to meet in person when it helps.',
    },
  ],

  contactHeading: 'Get in touch directly',
  contactBody:
    'No form required. Call, or send an email and it comes straight to me — there is no one else it could go to.',
} as const;
