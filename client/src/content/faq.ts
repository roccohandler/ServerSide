import type { FaqItem } from '../types/content';

/*
 * Questions a service-business owner actually asks before making contact.
 *
 * Answers that depend on a business decision that has not been made yet contain a
 * clearly marked placeholder rather than an invented figure. Answer them properly
 * before launch — an FAQ that dodges the price question does not build trust.
 */
export const faqItems: readonly FaqItem[] = [
  {
    id: 'cost',
    question: 'What does a website cost?',
    answer:
      '[PRICING_ANSWER] Whatever the number turns out to be, you will have it in writing before any work starts, and it will not change unless you ask for something different.',
  },
  {
    id: 'timeline',
    question: 'How long does it take?',
    answer:
      '[TIMELINE_ANSWER] The honest answer for most projects is that the build is rarely the slow part — waiting on photos, service lists and sign-off usually is. I will tell you what I need from you up front so it does not stall.',
  },
  {
    id: 'free-review',
    question: 'What is the free website review, exactly?',
    answer:
      'You send me your website address. I go through it the way a customer would, on a phone, and write back with a short list of what is likely costing you calls and what I would change first. It is free, it takes me about half an hour, and there is no obligation to buy anything.',
  },
  {
    id: 'existing-site',
    question: 'I already have a website. Do I need a new one?',
    answer:
      'Often not. Plenty of sites need a faster load, a visible phone number and a working contact form rather than a rebuild. If yours can be fixed, I will tell you that — fixing is cheaper than replacing and I would rather do the job that is actually needed.',
  },
  {
    id: 'ownership',
    question: 'Do I own the website?',
    answer:
      'Yes. The domain and hosting are set up in your name, and the content is yours. There is no arrangement where leaving means losing your site.',
  },
  {
    id: 'content',
    question: 'Who writes the words and provides the photos?',
    answer:
      'I will draft the structure and the wording based on what you tell me about the work, and you correct it — you know your trade and your customers better than I do. Photographs of your own finished jobs work far better than stock images, and phone photos are usually fine.',
  },
  {
    id: 'industries',
    question: 'Do you only work with one trade?',
    answer:
      'No. HVAC, plumbing, electrical, roofing, landscaping, painting, cleaning, general contracting — the pattern is the same for any business that gets hired locally. The examples cover several trades for that reason.',
  },
  {
    id: 'area',
    question: 'Do you work outside Greater Seattle?',
    answer:
      '[SERVICE_AREA_ANSWER] The focus is Greater Seattle because knowing the area helps when the site needs to talk about which towns you cover.',
  },
  {
    id: 'seo',
    question: 'Do you do SEO and Google Business Profile?',
    answer:
      'I build sites so search engines can read them properly: sensible titles and descriptions, a clear heading structure, fast pages and a sitemap. For a local service business, a well-kept Google Business Profile usually matters more than anything on the website itself, and I will point you at what needs fixing there. Ongoing SEO campaigns are not something I sell.',
  },
  {
    id: 'after-launch',
    question: 'What happens after it launches?',
    answer:
      'The site is yours and it will keep working. If you want me to keep it updated, that is an ongoing arrangement we agree separately — it is optional, and not signing up for it does not leave you stranded.',
  },
];
