/**
 * Barrel for the content layer.
 *
 * Components import from here so that a copy change is always a change to one file in
 * `src/content`, never a change to a component. Everything describing what is sold comes
 * from `./offer` — that file is the single source of truth for the offer.
 */
export { site, primaryCta } from './site';
export {
  offerName,
  positioning,
  reframe,
  systemComponents,
  systemPhases,
  system,
  differentiator,
  management,
  conversion,
  localSearch,
  launch,
  afterLaunch,
  relationship,
  responsibilities,
  offerStack,
  included,
  prices,
  pricing,
  comparison,
  marketComparison,
  websiteReport,
  carePricing,
  commercialTerms,
  commercialTermItems,
  cancellation,
  guarantee,
  launchStandard,
} from './offer';
export { entryPaths } from './entry';
export {
  valueEducation,
  demos,
  designDecisions,
  whatYoureBuying,
  control,
  alreadyHaveAWebsite,
} from './value';
export {
  whyMonthly,
  notJustMaintenance,
  monthlyLifecycle,
  abTesting,
  seasonal,
  campaignAlignment,
  managementCategories,
  responseGuarantee,
} from './growth';
export { qualification } from './qualification';
export { portfolioProjects } from './portfolio';
export { faqItems } from './faq';
export { trust, type TrustCommitment } from './trust';
export { testimonials, testimonialsSection } from './testimonials';
export { aboutContent } from './about';
export { contactContent, heroForm, inquiryOptions } from './contact';
/*
 * `legal` is **not** re-exported here, and it used to be. See the note below on what is
 * deliberately absent — this is the same rule, applied to a module that had been breaking it
 * since before the rule was written.
 *
 * The privacy and terms pages are the definition of a page somebody arrives at deliberately.
 * They were eager routes reading barrel-exported content, so 25 kB of prose that almost no
 * first-time visitor renders sat in the chunk every page modulepreloads. Nothing was
 * obviously wrong: the pages worked, the tests passed, and the weight was invisible because
 * it had always been there.
 *
 * It surfaced when five commercial clauses were added to the terms on 2026-08-19 and the
 * budget guard failed by 0.8 kB — the guard doing exactly its job, on prose that had to be
 * published rather than on prose that could be cut. Splitting the route paid for the clauses
 * several times over.
 */
export { pages, notFoundPage, findPageMeta, buildDocumentTitle } from './pages';
export { hero, audience, outcomes, finalCta } from './home';
export { opportunity } from './opportunity';
export { evidence } from './evidence';
export { industryMeta, findIndustryMeta } from './industryMeta';

/*
 * ============================================================================
 * WHAT IS DELIBERATELY *NOT* EXPORTED HERE
 * ============================================================================
 *
 * `industries`, `teardown`, `playbook` and `audit` are the content of four lazy routes,
 * and they are imported directly by the pages that render them — never through this file.
 *
 * The reason is measurable rather than stylistic. Every component imports this barrel, so
 * Rollup places it in a chunk that `index.html` modulepreloads on **every** page. A barrel
 * re-export puts the re-exported module in that chunk too, which meant the twenty PlayBook
 * improvements, all five industry pages and the teardown were downloaded and parsed by
 * every visitor to the homepage — none of whom render any of it. The component code was
 * code-split correctly, so the split looked like it was working.
 *
 * ## The consequence for the guards, and how it is handled
 *
 * This barrel used to be the sole discovery mechanism for the global sweeps in
 * `content.test.ts` — the currency sweep, the forbidden-claim sweep, the placeholder
 * sweep — so a module missing from it was silently exempt from all three. That property
 * mattered and has not been given up: `content.test.ts` now imports those four modules
 * explicitly and sweeps `{ ...barrel, industries, teardown, playbook, audit }`, and a test
 * asserts the corpus contains a known string from each of them. Dropping one fails the
 * build rather than quietly narrowing what is checked.
 *
 * **The rule for anything new:** if it renders on an eager surface, export it here. If it
 * is a lazy route's content, import it directly *and* add it to the sweep corpus in
 * `content.test.ts`.
 * ============================================================================
 */
