import { buildScope, growthPartner, salesTax } from '../config/pricing';
import { routes } from '../config/routes';
import { prices } from './offer';

/*
 * ============================================================================
 * THE PRICING PAGE
 * ============================================================================
 *
 * The copy that exists only on `/pricing`. Everything about *what is being sold* comes from
 * `content/offer.ts` through the shared `PricingBlock`, which the homepage and `/services`
 * also render — so the figures, the deliverables, the founding condition, the comparison and
 * the plan cannot disagree across the three surfaces. What is here is the half those surfaces
 * have no business carrying: **what happens to your money.**
 *
 * ## Deliberately absent from `content/index.ts`
 *
 * Same rule as `app.ts`, `capabilities.ts` and — since 2026-08-19 — `legal.ts`. Every
 * marketing component imports the barrel, so a module re-exported from it lands in the chunk
 * every visitor to the homepage downloads. This route is `lazy()`; its content has to be too,
 * or the split is decorative.
 *
 * It is imported explicitly by `content.test.ts` and added to the sweep corpus there, so the
 * currency sweep, the forbidden-claim sweep and the placeholder sweep all still see it. A
 * module outside the barrel and outside the corpus is a module with no guards at all, which
 * is the worst possible place for the page that talks about money.
 *
 * ## The rule this file follows
 *
 * **Nothing here states a figure.** Every number is interpolated from `prices`, which is
 * derived from `config/pricing.ts`. `content.test.ts` fails the build on a currency figure it
 * did not sanction, and that guard is the only reason this page can carry prices in eight
 * places without becoming the ninth version of them.
 * ============================================================================
 */

export const pricingPage = {
  eyebrow: 'What it costs',
  heading: 'The price, the schedule, and what happens to your money.',
  /*
   * The lede names the unusual thing rather than the price, because the price is already two
   * inches below it and the unusual thing is what makes the page worth reading. Publishing a
   * figure at all is rare in this category; publishing the refund policy beside it is rarer.
   */
  lede: 'Two prices, both on this page, with the terms that go with them. What you pay, when you pay it, what happens if you change your mind, and what "finished" actually means — all of it before you talk to anybody.',

  /**
   * The tax line, rendered directly under the lede rather than in a footnote.
   *
   * A tax that appears for the first time at checkout is the classic surprise cost, and the
   * research on abandonment is unambiguous about what an unexpected line does at the moment of
   * payment. Stating it beside the price costs a sentence and removes the surprise entirely.
   * The rate is deliberately not here — see DECISION 037.
   */
  tax: {
    label: 'Sales tax',
    note: salesTax.note,
    detail: salesTax.explanation,
  },

  /*
   * ==========================================================================
   * OWNERSHIP — THE BLOCK THIS SITE HAD AS A BULLET POINT
   * ==========================================================================
   *
   * "The domain, hosting and content are in your name from day one" was the second item in a
   * five-item reassurance list, which is where a fact goes when nobody has decided how much it
   * is worth.
   *
   * It is worth a great deal here. The most common bad experience this market has actually had
   * with a web developer is not a bad website — it is discovering, when they wanted to leave,
   * that the developer held the domain, or the hosting login, or the only copy of the content.
   * That fear is specific, it is well-founded, and almost nothing on a typical agency site
   * addresses it, because addressing it means describing the exit.
   *
   * So the block names the individual assets and then says what happens if they leave, which is
   * the sentence the bullet point never got to. It is placed **before** the payment terms
   * rather than after, because "what do I end up owning" is the question that decides whether
   * the price is worth weighing at all.
   * ==========================================================================
   */
  ownership: {
    heading: 'You own all of it, from the first day',
    lede: 'Not a licence, not a platform account, not something that stops working if you stop paying. The website and everything it runs on are yours, registered in your name, from before it goes live.',
    items: [
      {
        id: 'domain',
        title: 'Your domain',
        detail:
          'Registered to your business, in an account you control. If you already own it, it stays where it is.',
      },
      {
        id: 'hosting',
        title: 'Your hosting',
        detail:
          'Set up in your name. While you are on Growth Partner we administer it and the cost is included; if you stop, the account is already yours and the billing simply reverts to you.',
      },
      {
        id: 'content',
        title: 'Your content',
        detail:
          'The words, the photographs, the structure — including the parts we drafted. Nothing here is licensed to you.',
      },
      {
        id: 'accounts',
        title: 'Your analytics and search accounts',
        detail:
          'Your own Google properties, connected to your own website. The measurement does not live in a dashboard you lose access to.',
      },
    ],
    /*
     * The closing sentence is the one doing the work, and it is deliberately about *leaving*.
     * A promise of ownership that never mentions the exit is a promise nobody has tested.
     */
    closing:
      'If you ever want to take it elsewhere, or run it yourself, you take the whole thing with you and there is nothing to ask us for. That is what owning it means, and it is the reason it is set up this way rather than the more convenient way.',
  },

  /*
   * ==========================================================================
   * HOW PAYING WORKS — FIVE ANSWERS, EACH LINKING TO THE CLAUSE ITSELF
   * ==========================================================================
   *
   * These are the questions a buyer has *after* they accept the price and before they commit,
   * and until 2026-08-19 this site answered none of them anywhere. It collected a deposit
   * against an undefined refund policy, published "two revision rounds" without saying what a
   * round was, called work "finished" with no bar attached, and had no answer at all for a
   * project that went quiet in either direction.
   *
   * Every one now links to the clause it summarises. That is not decoration: a summary of a
   * term is not the term, and a page that summarises without linking is asking to be trusted
   * on the summary. The reader who wants the full sentence should be one click from it.
   *
   * The order is the order of the risk as the buyer experiences it: money first, then scope,
   * then delivery, then the two ways a project can stall.
   * ==========================================================================
   */
  howPayingWorks: {
    eyebrow: 'Before you commit',
    heading: 'What happens to your money',
    lede: 'The five questions worth asking any web developer, answered here rather than in a contract you see afterwards. Each one links to the term it comes from.',
    items: [
      {
        id: 'schedule',
        question: 'When do I pay?',
        answer: `Half to begin, half on the day it goes live. ${prices.deposit} starts the project at founding-client pricing, and the same again when the website is finished and you have approved it. Nothing is taken between those two, and nothing recurring starts unless you choose Growth Partner after launch.`,
        termsAnchor: 'launch',
      },
      {
        id: 'refunds',
        question: 'What if I change my mind?',
        answer:
          'Before work starts, the deposit comes back in full and you do not have to give a reason. After that, what comes back is the deposit less the fair value of the work already done — and never less than nothing, so cancelling cannot cost you more than you have paid. If we are the reason it cannot go ahead, you get all of it back at any stage.',
        termsAnchor: 'refunds',
      },
      {
        id: 'revisions',
        question: `What counts as one of the ${buildScope.revisionRoundsWord} revision rounds?`,
        answer:
          'One consolidated list of changes. Fifteen items in one message is a round; fifteen separate messages over a fortnight is still a round. The count is about how the work is batched, not about how many times you are allowed to write to us — and small corrections during the build are not rounds at all.',
        termsAnchor: 'launch',
      },
      {
        id: 'finished',
        question: 'How do I know when it is finished?',
        answer:
          'It passes eight published checks — mobile, speed, forms actually arriving, tracking, search, accessibility, browsers, and every path to contacting you. They are on this site, they are the same eight every time, and each one is something you could verify yourself. If it does not pass, it is not launched.',
        termsAnchor: 'completion',
      },
      {
        id: 'stalls',
        question: 'What if one of us goes quiet?',
        answer:
          'If we ask you to approve a finished website and hear nothing for ten business days, the balance becomes due — the work is done and you have seen it. Nothing goes live without the payment either way. If the silence is earlier, while we are waiting on your photos and service list, thirty days pauses the project and releases the build slot; your deposit and your work are untouched and restarting is a scheduling conversation.',
        termsAnchor: 'delays',
      },
    ],
    footnote:
      'Every one of these is on the terms page in full, and it was written before you asked.',
  },

  /*
   * ==========================================================================
   * THE OBJECTIONS, ANSWERED WITHOUT NAMING ANYBODY
   * ==========================================================================
   *
   * The four things a reader is actually thinking at the moment they see the figure. Three of
   * them are comparisons and none names a competitor — the same rule `marketComparison` follows
   * and for the same reason: a named comparison is a factual claim about somebody else's
   * product that this business has not measured.
   *
   * The fourth is the one most pricing pages leave out, because answering it honestly means
   * telling some readers not to buy. It stays in for exactly that reason — it is what makes the
   * other three worth reading.
   * ==========================================================================
   */
  objections: {
    heading: 'What you are probably thinking',
    items: [
      {
        id: 'cheaper',
        objection: 'I have seen websites for a fraction of this.',
        answer:
          'You have, and some of them are fine. What a template subscription sells is the artefact — a site that exists. What this price buys is the research into how your customers decide, the pages built around that, the tracking that proves what happened, and one person answerable for all of it. If a site that merely exists is what you need, that is a real answer and a cheaper one, and we would rather you spent the money there than here.',
      },
      {
        id: 'monthly',
        objection: `Why isn't it just ${prices.managementDisplay} a month?`,
        answer:
          'Because the build is a one-time piece of work and the monthly service is a different thing that happens afterwards. Bundling them would hide the real cost of the project inside a subscription you could never leave without losing the website — which is precisely the arrangement everything on this page is arranged to avoid.',
      },
      {
        id: 'results',
        objection: 'How do I know it will work?',
        answer:
          'You do not, and neither do we — how many people call depends on your market, your prices, your season and whether the phone gets answered, and none of that is ours. What is promised is the work: eight published checks before launch, your enquiry rate written down on the day so there is something honest to judge it against, and a written account of the first month whether or not you carry on with us.',
      },
      {
        id: 'existing',
        objection: 'I already have a website.',
        answer:
          'Then the question is whether it is worth rebuilding, and that is answerable for free before either of us commits to anything. Score it yourself in about five minutes, or send it to us and we will tell you what is likely costing you calls. If the answer is that yours is basically fine, that is what we will say.',
      },
    ],
  },

  /*
   * Two actions, and they are for two different readers rather than being a repeat.
   *
   * `primary` is the low-friction diagnosis for somebody still deciding. `secondary` carries
   * `?intent=build` into the contact form for somebody who has read a price page end to end
   * and wants to start — a reader this page produces more of than any other on the site, and
   * one who should not be handed a free assessment they have already moved past.
   */
  close: {
    heading: 'Two ways to start, and neither of them costs anything',
    lede: 'Nothing on this page requires a form, and nothing below commits you to a build.',
    primary: {
      label: 'Get my free website assessment',
      to: routes.getAssessment,
      note: 'We look at your site the way one of your customers does and tell you what is costing you calls.',
    },
    secondary: {
      label: 'Discuss my project',
      to: `${routes.contact}?intent=build`,
      note: `Scope, price and timeline in writing before anything starts. ${growthPartner.name} is a separate decision, after launch.`,
    },
  },
} as const;
