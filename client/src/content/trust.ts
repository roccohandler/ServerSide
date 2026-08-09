/*
 * The trust section.
 *
 * This is a new business. It has no testimonials, no case studies, no client count and
 * no years in business — so it claims none of those. What it can honestly offer is a
 * statement of how the work is done, plus an open admission of what does not exist yet.
 *
 * Saying so plainly is more persuasive to a sceptical business owner than inventing
 * social proof, and it is the only version that stays true after launch.
 */

export interface TrustCommitment {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export const trust = {
  heading: 'How I work',
  intro: 'A few things I will commit to in writing before you spend anything.',

  /**
   * Shown next to the examples. Delete this line only when it stops being true —
   * that is, when there is real client work on the page.
   */
  disclosure:
    'Straight answer: this is a new business, so there are no client testimonials or case studies here yet. The examples below are demonstration sites I built to show the approach, and they are labelled as such. When there is real client work to show, it will replace them.',

  commitments: [
    {
      id: 'ownership',
      title: 'You own everything',
      description:
        'The domain, the hosting account and the content are registered in your name. If you ever want to work with someone else, you take the site with you and I hand over the keys.',
    },
    {
      id: 'plain-english',
      title: 'Plain English',
      description:
        'No jargon, no acronyms, and no pretending a decision is more technical than it is. If I cannot explain why something matters to your business, it probably does not.',
    },
    {
      id: 'pricing',
      title: 'Scoped and priced before work starts',
      description:
        'You will know what is being built and what it costs before you commit. [PRICING_APPROACH]',
    },
    {
      id: 'direct',
      title: 'You work with me directly',
      description:
        'One person builds it and one person answers the phone. No account managers, no handing your project to someone you have never spoken to.',
    },
    {
      id: 'quality',
      title: 'Fast and accessible by default',
      description:
        'Speed and accessibility are not upgrades. A site that is slow on a phone or unusable with a screen reader is a site that loses work.',
    },
    {
      id: 'honesty',
      title: 'Honest about what will not help',
      description:
        'If your website is not what is holding the business back, I will say so — even though it means not selling you one.',
    },
  ] satisfies readonly TrustCommitment[],
} as const;
