/*
 * About page copy.
 *
 * The [BRACKETED] blocks are personal facts that only the owner can supply. They are
 * left as placeholders on purpose: a fabricated backstory is the fastest way to lose
 * the trust this page exists to build. The surrounding structure is real and can stay.
 */
export const aboutContent = {
  heading: 'About',
  intro: '[ABOUT_INTRO]',

  sections: [
    {
      id: 'who',
      heading: 'Who I am',
      /*
       * Replace with a short, specific paragraph: your name, where you are based, and
       * what you did before this. Two or three sentences is plenty. Specific beats
       * impressive — "I live in Ballard and I used to dispatch for an HVAC company"
       * does more work than a paragraph about passion for design.
       */
      body: '[ABOUT_WHO_I_AM]',
    },
    {
      id: 'what',
      heading: 'What I do',
      body: 'I design and build websites for local service businesses. That means the whole job: working out what the site needs to say, building it, getting it live on your own domain, and making sure a quote request actually reaches your inbox. I work on one project at a time so it gets finished.',
    },
    {
      id: 'why',
      heading: 'Why local service businesses',
      /*
       * Replace with your actual reason. If you worked in the trades, say so. If you
       * watched a family business lose work to a bad website, say that.
       */
      body: '[ABOUT_WHY_SERVICE_BUSINESSES]',
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
