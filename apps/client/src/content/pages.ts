import { routes } from '../config/routes';
import { site } from './site';
import { demoMeta } from './demos/demoMeta';
import { industryMeta } from './industryMeta';
import type { PageMeta } from '../types/content';

/*
 * Per-page SEO metadata.
 *
 * Consumed twice: by `useDocumentMeta` when the visitor navigates within the app, and
 * by `scripts/build-seo.ts` at build time, which writes a real HTML file per route with
 * these tags already in the markup. That second pass matters because social-media
 * crawlers do not execute JavaScript — without it, every shared link would preview with
 * the same generic title.
 *
 * Titles are written for a human reading a search result, not stuffed with keywords.
 */
export const pages: readonly PageMeta[] = [
  {
    path: routes.home,
    title: site.seo.defaultTitle,
    description: site.seo.defaultDescription,
    sitemapPriority: 1,
  },
  {
    path: routes.services,
    title: 'Services',
    description:
      'What is included: build, launch, capture, track, maintain and improve — the whole JobForge growth system for local service businesses in Greater Seattle.',
    sitemapPriority: 0.8,
  },
  /*
   * High priority, and indexed. "How much does a website cost" is one of the few searches
   * this business can be genuinely relevant to without competing on the commodity term, and
   * a page that answers it with two real figures is unusual enough in this category to be
   * worth ranking for — zero of the five national competitors publish any price at all.
   *
   * The description leads with both numbers on purpose. A search result that states the price
   * pre-qualifies the click, which is the opposite of what a page about pricing usually does.
   */
  {
    path: routes.pricing,
    title: 'Pricing',
    description:
      'What a website build costs and what the monthly service costs, with the terms that go with them: the payment schedule, the refund policy, and what "finished" actually means. No form in the way.',
    sitemapPriority: 0.9,
  },
  {
    path: routes.portfolio,
    title: 'Examples',
    description:
      'Demonstration websites for HVAC, plumbing, landscaping, roofing and electrical businesses, showing how each one is built to bring in enquiries.',
    sitemapPriority: 0.8,
  },
  {
    path: routes.audit,
    title: 'Website Score',
    description:
      'Score your own website against twenty checks and get the five things most likely costing you calls and quote requests — free, in about five minutes, with no email address required.',
    sitemapPriority: 0.9,
  },
  /*
   * Indexed, and high. "What should my website have on it" is a question people genuinely
   * search, and a page that answers it with a personalised plan rather than a listicle is
   * unusual enough to be worth ranking for. It is also the one tool on this site that works
   * for somebody who has no website yet — the population every other page here assumes away.
   */
  {
    path: routes.blueprint,
    title: 'Website Blueprint',
    description:
      'Twelve questions about your business — none technical — and a plan for what a website for a business like yours actually has to do. Free, about five minutes, and nothing to sign up for.',
    sitemapPriority: 0.9,
  },
  {
    path: routes.capabilities,
    title: 'What your website can do for your business',
    description:
      'Every capability a local service website can have — lead generation, booking, reviews, payments, reporting and automation — with each one labelled as included, extra scope, or not offered.',
    sitemapPriority: 0.7,
  },
  /*
   * The five industry pages, from `content/industryMeta.ts` — a leaf holding five titles,
   * five descriptions and five paths, and nothing else.
   *
   * This mapped over `content/industries.ts` instead, which read better and put the entire
   * copy of all five industry pages into the eager bundle: `pages.ts` is reached from
   * `useDocumentMeta`, which every page component imports. The component code was
   * code-split correctly, so the split looked like it was working while the copy rode
   * along in the main chunk. See the note at the top of `industryMeta.ts`.
   *
   * High sitemap priority: these are the pages built to be found for "hvac website" style
   * searches, which is the only kind of search this site can realistically expect to be
   * relevant to.
   */
  ...industryMeta.map((industry): PageMeta => ({
    path: industry.path,
    title: industry.metaTitle,
    description: industry.metaDescription,
    sitemapPriority: 0.8,
  })),
  {
    path: routes.teardown,
    title: 'Website teardown',
    description:
      'Six findings on the first screen of a composite service-business website, ordered by what they cost — plus what a free website assessment actually looks like when it arrives.',
    sitemapPriority: 0.7,
  },
  {
    path: routes.playbook,
    title: 'The Service Business Website PlayBook',
    description:
      'A free, practical guide to service-business website conversion: speed, mobile, clarity, trust, calls to action, forms, service pages, message match and measurement.',
    sitemapPriority: 0.7,
  },
  /*
   * The workbook is a production tool, not a page anybody should land on from a search
   * result — the public PlayBook is the thing worth ranking. `noIndex` keeps it out of
   * the sitemap and puts a robots meta tag in the built HTML.
   */
  {
    path: routes.workbook,
    title: 'PlayBook workbook',
    description:
      'The printable workbook: audit sheets, worksheets and checklists for the Service Business Website PlayBook. Print this page or save it as a PDF.',
    noIndex: true,
  },
  {
    path: routes.about,
    title: 'About',
    description: `About ${site.name} — who is behind it, the value-per-second standard the work is held to, and why it focuses on service businesses in ${site.serviceArea.label}.`,
    sitemapPriority: 0.6,
  },
  {
    path: routes.contact,
    title: 'Contact',
    description:
      'Get a free website assessment, or ask a question about the build or the ongoing service. Call, email, or send a short message and get a direct reply.',
    sitemapPriority: 0.9,
  },
  /*
   * The post-deposit page. `noIndex`: it is for new clients arriving from Stripe's
   * checkout redirect, not for search results — but it still needs a built HTML file,
   * because `vercel.json` has no SPA fallback and a hard refresh would otherwise 404.
   */
  {
    path: routes.welcome,
    title: 'Welcome — what happens next',
    description:
      'You are on the build schedule. What happens between now and launch, and the onboarding form that starts the clock.',
    noIndex: true,
  },
  /*
   * ==========================================================================
   * THE ACCOUNT PAGES
   * ==========================================================================
   *
   * All `noIndex`. A sign-in form in a search result helps nobody, and a password-reset
   * page in one is actively bad — but every entry here still needs a built HTML file,
   * because `vercel.json` only has an SPA fallback for `/app` and a hard refresh on
   * `/login` would otherwise 404.
   *
   * Descriptions are still written properly. They never reach a search result, and they
   * do reach a link preview when somebody pastes a URL into a message.
   * ==========================================================================
   */
  /*
   * The assessment funnel's front door — the destination of every primary button on the
   * site, and the one account page that is **not** `noIndex`.
   *
   * It is indexed because it is the page somebody who searched for a website assessment
   * should be allowed to land on, and because the sentence in this description is the offer
   * rather than a form. The other five below are `noIndex` for the opposite reason: nobody
   * benefits from finding a sign-in form in a search result.
   */
  {
    path: routes.getAssessment,
    title: 'Get your free website assessment',
    description:
      'We look at your website the way one of your customers does and tell you what is costing you calls — in plain English, free. Start with your email address; the findings live in your account.',
    sitemapPriority: 0.9,
  },
  {
    path: routes.login,
    title: 'Sign in',
    description:
      'Sign in to see your website project, your assessment results and your billing, all in one place.',
    noIndex: true,
  },
  /*
   * "Create an account", in the site's own voice, in both the title and the description.
   * The button in the form says "Create my account" because that one is the visitor
   * acting; the phrase is the same either way, and the rule behind the difference is
   * written out in `features/auth/components/CredentialForm.tsx`. What used to be here was
   * a fourth wording — "Create a free account" — which is the same offer described as a
   * different product.
   */
  {
    path: routes.signup,
    title: 'Create an account',
    description:
      'Create an account to keep your assessment results and follow your website build from start to launch. It is free, and nothing is charged until you choose to go ahead.',
    noIndex: true,
  },
  {
    path: routes.forgotPassword,
    title: 'Reset your password',
    description:
      'Forgotten your password? Enter the address you signed up with and we will email you a link to choose a new one.',
    noIndex: true,
  },
  {
    path: routes.resetPassword,
    title: 'Choose a new password',
    description:
      'Choose a new password for your account. The link that brought you here works once and expires after an hour.',
    noIndex: true,
  },
  {
    path: routes.verifyEmail,
    title: 'Confirm your email address',
    description:
      'Confirming your email address means you get updates about your website project as they happen. This page finishes that off.',
    noIndex: true,
  },
  /*
   * ==========================================================================
   * THE PRIVATE APPLICATION
   * ==========================================================================
   *
   * Five entries for a section with an unbounded number of URLs, because
   * `/app/projects/:projectId` cannot be prerendered. The rewrite in `vercel.json`
   * sends everything under `/app` to the `/app` document, so these five exist to
   * produce that document and to give `useDocumentMeta` something to set a title from
   * on the four fixed pages.
   *
   * Every one is `noIndex`, and the deeper pages set their own titles at runtime.
   * ==========================================================================
   */
  {
    path: routes.appDashboard,
    title: 'Your dashboard',
    description:
      'Your website project, your assessment and your billing — and the one thing that needs you next, if anything does.',
    noIndex: true,
  },
  {
    path: routes.appAssessment,
    title: 'Your assessment',
    description:
      'Your website score, what it means, and the things most likely costing you calls and quote requests.',
    noIndex: true,
  },
  {
    path: routes.appAssessmentStart,
    title: 'Score your website',
    description:
      'Twenty questions about your website, scored as you go, and saved straight to your account when you are done.',
    noIndex: true,
  },
  /*
   * The request step. `noIndex` and rewritten by `vercel.json` like every other `/app`
   * path, but it still needs an entry here because `content.test.ts` walks the route table
   * and `useDocumentMeta` needs a title for the tab.
   */
  {
    path: routes.appAssessmentRequest,
    title: 'Request your assessment',
    description:
      'The last four questions before we look at your website: a number to reach you on, the address, and what you want looking at.',
    noIndex: true,
  },
  {
    path: routes.appProjects,
    title: 'Your website project',
    description:
      'Where your website build has got to: progress, your preview link, the things we need from you, and your approval.',
    noIndex: true,
  },
  /*
   * The private demonstration door. `noIndex`, and it still needs a built HTML file for the
   * same reason `/welcome` does: `vercel.json` has no SPA fallback outside `/app`, so a hard
   * refresh on the one page somebody was told to type in would otherwise 404.
   *
   * The description is deliberately incurious. It appears in a browser tab and in a link
   * preview if somebody pastes the URL into a chat, and neither is a place to explain what is
   * behind the passcode.
   */
  {
    path: routes.promo,
    title: 'Private demonstration',
    description:
      'A private demonstration of the customer portal. A passcode is needed, and it is sent separately by whoever shared this link.',
    noIndex: true,
  },
  {
    path: routes.appReports,
    title: 'Your reports',
    description:
      'What your website produced each month, what we changed, and what we are doing next.',
    noIndex: true,
  },
  {
    path: routes.appMessages,
    title: 'Messages',
    description:
      'Ask us anything, whether or not a website is being built right now. It reaches the person who builds them.',
    noIndex: true,
  },
  {
    path: routes.appBilling,
    title: 'Your billing',
    description:
      'What you have paid, what is recurring, and how to manage your payment details through Stripe.',
    noIndex: true,
  },
  {
    path: routes.appAccount,
    title: 'Your account',
    description:
      'Your name, your business name, how you sign in, and your password. Change any of it here.',
    noIndex: true,
  },
  {
    path: routes.privacy,
    title: 'Privacy',
    description:
      'What happens to the information you send through the contact form, why it is collected, and how to ask for a copy or a deletion.',
    sitemapPriority: 0.2,
  },
  {
    path: routes.terms,
    title: 'Terms',
    description:
      'Terms of use for this website, including how demonstration examples are labelled and how project work is agreed in writing beforehand.',
    sitemapPriority: 0.2,
  },
  /*
   * The fifteen demonstration routes, from `content/demos/demoMeta.ts` — a leaf holding
   * fifteen titles, fifteen descriptions and fifteen paths, and nothing else.
   *
   * Spread from a leaf for exactly the reason `industryMeta` is: this file is imported by
   * `useDocumentMeta`, which every page component imports, so mapping over the actual demo
   * sites would put five fictional businesses into the eager bundle. See the note at the
   * top of `demoMeta.ts`.
   *
   * Every entry is `noIndex`, so none of them reaches `sitemap.xml`. They are still in
   * `pages` because `build-seo.ts` writes one HTML file per entry and `vercel.json` has no
   * SPA fallback — without a file, a hard refresh on `/demo/hvac/services` is a 404.
   */
  ...demoMeta,
];

/** Metadata for the not-found page. Excluded from the sitemap and marked noindex. */
export const notFoundPage: PageMeta = {
  path: '/404',
  title: 'Page not found',
  description: 'That page does not exist.',
  noIndex: true,
};

export function findPageMeta(path: string): PageMeta | undefined {
  return pages.find((page) => page.path === path);
}

/**
 * Builds the document title. The suffix is skipped when it would simply repeat the
 * page title, so a result never reads "[BUSINESS_NAME] | [BUSINESS_NAME]".
 */
export function buildDocumentTitle(page: PageMeta): string {
  const suffix = site.seo.titleSuffix;
  if (!suffix || page.title === suffix) return page.title;
  return `${page.title} | ${suffix}`;
}
