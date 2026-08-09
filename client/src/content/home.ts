import type { ProcessStep, ValueProposition } from '../types/content';

/*
 * Homepage copy.
 *
 * Nothing here claims a result, a statistic, a customer or a length of experience.
 * The problem section is framed as a checklist the reader can run against their own
 * site, which is honest, more useful, and leads naturally to the review offer.
 */

export const hero = {
  eyebrow: 'Websites for local service businesses',
  heading: 'A website that makes it easy for local customers to hire you',
  subheading:
    'I design and build fast, mobile-first websites for HVAC, plumbing, electrical, roofing, landscaping and other service businesses around Greater Seattle — so the people already searching for your trade can find you, trust you, and get in touch.',
  phonePrompt: 'Prefer to talk it through?',
} as const;

export const audience = {
  heading: 'Built for the trades',
  body: 'The work is the same shape whatever the trade: make it obvious what you do, where you work, and how to reach you — then get out of the way.',
  industries: [
    'HVAC',
    'Plumbing',
    'Electrical',
    'Roofing',
    'Landscaping',
    'Painting',
    'Cleaning',
    'General contracting',
  ],
  note: 'Not on the list? If customers find you locally and call you to book, the approach still applies.',
} as const;

export const problem = {
  heading: 'Worth checking on your own site',
  intro:
    'Most service-business websites do not fail because they look bad. They fail on small, fixable things. Open yours on your phone and see how many of these you can answer:',
  checks: [
    {
      id: 'phone-speed',
      question: 'How long does it take to load on a phone?',
      detail: 'If someone with a leak has to wait, they go back and tap the next result.',
    },
    {
      id: 'calling',
      question: 'How many taps does it take to call you?',
      detail:
        'A phone number that is not a link, or is buried in a footer, is friction at the worst moment.',
    },
    {
      id: 'service-area',
      question: 'Can a stranger tell whether you cover their town?',
      detail: 'If they cannot tell, some of them will not bother asking.',
    },
    {
      id: 'form',
      question: 'Does your contact form actually reach you?',
      detail:
        'Forms quietly break. Send yourself a test message and see how long it takes to arrive.',
    },
    {
      id: 'proof',
      question: 'Is there any sign of your actual work?',
      detail: 'Photos of finished jobs do more for a stranger than a paragraph about quality.',
    },
    {
      id: 'current',
      question: 'Does it still describe the business you run today?',
      detail: 'Old services, old prices and an old phone number all cost you calls.',
    },
  ],
  closing:
    'If a few of those made you wince, that is exactly what the free review covers — and it is free because it takes me half an hour and tells you something useful either way.',
} as const;

export const outcomes: readonly ValueProposition[] = [
  {
    id: 'call',
    title: 'Effortless to call',
    description:
      'Your number is in the header on every page and dials with one tap. No hunting, no typing it out.',
    icon: 'phone',
  },
  {
    id: 'answers',
    title: 'Answers the deciding questions',
    description:
      'What you do, which towns you cover, how you charge, and what happens after they get in touch.',
    icon: 'check',
  },
  {
    id: 'fast',
    title: 'Fast on a phone',
    description:
      'Built light so it opens quickly on a phone in a driveway, not just on office wi-fi.',
    icon: 'bolt',
  },
  {
    id: 'inquiries',
    title: 'Turns interest into a request',
    description:
      'A short form that asks only what you need to quote, and that lands in your inbox straight away.',
    icon: 'inbox',
  },
  {
    id: 'trust',
    title: 'Looks like a business worth calling',
    description:
      'Consistent, current and professional, so a stranger has a reason to pick you over the next result.',
    icon: 'shield',
  },
  {
    id: 'maintainable',
    title: 'Easy to keep current',
    description:
      'Adding a service or changing a number is a small change, not a rebuild and not a new invoice for a redesign.',
    icon: 'wrench',
  },
];

export const processSteps: readonly ProcessStep[] = [
  {
    id: 'review',
    title: 'Free website review',
    description:
      'You send me your site, or your Google listing if you do not have one. I send back a short, plain-English list of what is likely costing you calls. No charge, no obligation, no pitch deck.',
  },
  {
    id: 'plan',
    title: 'A plan and a price',
    description:
      'If it makes sense to work together, we agree exactly what is being built and what it costs before anything starts. [PRICING_APPROACH]',
  },
  {
    id: 'build',
    title: 'Build and review',
    description:
      'I build it and send you a link. You look at it on your own phone, tell me what is wrong, and I fix it. That loop repeats until you are happy.',
  },
  {
    id: 'launch',
    title: 'Launch and hand over',
    description:
      'It goes live on your domain and your hosting account, in your name. I show you how it works and what to do if you need something changed.',
  },
];

export const finalCta = {
  heading: 'Find out what your website is costing you',
  body: 'Send a short message and I will get back to you directly. If it turns out a website is not your problem, I will tell you that instead.',
} as const;
