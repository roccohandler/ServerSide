/**
 * Barrel for the content layer.
 *
 * Components import from here so that a copy change is always a change to one file in
 * `src/content`, never a change to a component.
 */
export { site, primaryCta } from './site';
export { services } from './services';
export { portfolioProjects } from './portfolio';
export { faqItems } from './faq';
export { trust, type TrustCommitment } from './trust';
export { aboutContent } from './about';
export { contactContent, inquiryOptions } from './contact';
export { privacyContent, termsContent, legalNotice } from './legal';
export { pages, notFoundPage, findPageMeta, buildDocumentTitle } from './pages';
export { hero, audience, problem, outcomes, processSteps, finalCta } from './home';
