import type { EvidenceCitation } from '../types/content';

/*
 * ============================================================================
 * PUBLISHED RESEARCH — THREE CITATIONS, AND THE LIMITS OF EACH
 * ============================================================================
 *
 * This site had no third-party evidence at all before this file, which was defensible:
 * a page dense with statistics reads like every provider that overpromises, and a
 * borrowed number is not proof that this business can do anything. What was missing was
 * the narrower thing — evidence that the *problem* is real, from somebody with no stake
 * in whether the reader buys a website.
 *
 * ## Why exactly three, and why these three
 *
 * Two of them are about parts of the customer journey I do not touch, and that is the
 * point of including them. The argument the section makes is that generating demand and
 * converting it are different problems, and the honest corollary is that the website is
 * only one of the places demand leaks. A reader who has been told by three providers
 * that their website is the whole answer recognises the difference immediately.
 *
 * The third is about the website itself, and it is the only one with a threshold that
 * can be checked on the reader's own site this afternoon.
 *
 * ## The rules
 *
 *   1. **Every citation carries its limitation, and the type makes that mandatory.** An
 *      advertising conversion rate is not a website conversion rate. A call-handling
 *      benchmark is not a prediction about a redesign. A consumer survey about what
 *      people say they expect is not a measurement of what they do. Each of those
 *      confusions is one sentence away, and each one is stated.
 *   2. **Nothing here is presented as a result this business produces.** These are
 *      findings about the market, published by named organisations, linked so anybody can
 *      check them.
 *   3. **No currency figures.** LocaliQ publishes cost-per-lead alongside its conversion
 *      rates and none of those figures appear anywhere on this site — partly because
 *      `content.test.ts` fails the build on any currency figure outside the published
 *      prices, and partly because inviting a reader to compare a monthly fee against a
 *      cost per lead nobody controls is an argument that helps nobody.
 *   4. **Trade-specific advertising benchmarks belong on the industry pages**, next to
 *      the trade they describe, labelled as advertising data. They are not on the
 *      homepage, where a wall of benchmarks would turn the first read into a report.
 * ============================================================================
 */

export const evidence = {
  eyebrow: 'What the research says',
  heading: 'Getting found is not the same as getting hired.',
  lede: 'Three findings from people with nothing to sell you. Two of them are about parts of the job that are not the website.',

  citations: [
    {
      id: 'invoca-answer-rate',
      claim:
        'Just over half of calls to home-services businesses — 52% — were answered by a person.',
      source: 'Invoca, 2026 Home Services Lead Conversion Benchmarks',
      sourceUrl:
        'https://www.invoca.com/reports/the-invoca-home-services-lead-conversion-benchmarks-report-2026',
      dataset:
        'More than 70 million calls across ten industries, including HVAC, plumbing, lawn and tree, restoration and pest control.',
      whyItMatters:
        'Marketing creates demand. What happens after the phone rings decides how much of it becomes work.',
      limitation:
        'This measures call handling, not websites. If your phone is where the work is being lost, a better website will not fix it — and we would rather tell you that than sell you around it.',
    },
    {
      id: 'servicetitan-booking',
      claim:
        'ServiceTitan reports that 70% of consumers expect to be able to book home services online.',
      source: 'ServiceTitan',
      sourceUrl: 'https://www.servicetitan.com/blog/pantheon-recap-online-booking',
      dataset: 'Consumer research on booking expectations for home-services businesses.',
      whyItMatters:
        'The expectation is about effort rather than software: people want to start the job without having to phone you to do it.',
      limitation:
        'A survey of what consumers say they expect, not what they did — and online booking is not part of the published launch. What it argues for here is narrower: getting in touch should never depend on somebody being willing to phone you.',
    },
    {
      id: 'google-web-vitals',
      claim:
        'Google publishes thresholds for real-user experience: main content visible within 2.5 seconds, response to a tap under 200 milliseconds, almost no layout shift.',
      source: 'Google, Core Web Vitals',
      sourceUrl: 'https://web.dev/articles/vitals',
      dataset:
        'Field measurements collected from real Chrome users, published as the Core Web Vitals thresholds.',
      whyItMatters:
        'The one link in the chain that is unambiguously the website’s job — and the only one you can check yourself this afternoon.',
      limitation:
        'Google is explicit that meeting these thresholds does not buy a ranking. They describe an experience — and a visitor who is still waiting has not started deciding about you yet.',
    },
  ] satisfies readonly EvidenceCitation[],

  /*
   * The line that turns three borrowed numbers into an argument for the free assessment
   * rather than into a claim about this business. Without it the section is three
   * statistics; with it, it is the reason the first step is a diagnosis.
   */
  closing:
    'None of this is a promise about what a website does for your business. It is the reason the first step is finding out which of the three is actually costing you the work.',

  sourceLabel: 'Source',
  limitationLabel: 'What it does not show',
} as const;
