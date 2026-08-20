import { demoPath } from './demos';
import { industryPath } from './trades';

/**
 * Every URL in the application, in one place.
 *
 * Components and content reference these constants rather than string literals, so a
 * path can be renamed without hunting through JSX for a stale link.
 */
export const routes = {
  home: '/',
  about: '/about',
  services: '/services',
  /**
   * What it costs, and what happens to your money — the page a price-shopper types.
   *
   * Its own route rather than a section of `/services`, and the reason is the reader rather
   * than the length. Somebody on `/services` is asking *what is the work*; somebody who went
   * looking for a price has already answered that and is asking *what does it cost me, and
   * what am I risking*. Those are different questions and the second one has answers the
   * services page has no business carrying: the refund policy, what "finished" means, the
   * deemed-acceptance window, what happens if they go quiet, and the sales-tax line.
   *
   * It is also a URL people expect to be able to guess, and one already promised in writing:
   * a follow-up email sent to every prospect who goes quiet has been telling them "the
   * pricing page says what it costs" since before there was one.
   *
   * `/pricing` rather than `/what-it-costs`, breaking the pattern `/what-your-website-can-do`
   * set. That pattern exists because nobody types "capabilities" — but everybody types
   * "pricing", so here the convention and the reader's own word are the same word.
   */
  pricing: '/pricing',
  portfolio: '/portfolio',
  /**
   * The Website Score — the self-serve diagnostic at /audit.
   *
   * Its own route rather than a section of `/playbook`, because the PlayBook's
   * self-assessment promises in rendered copy that its answers never leave the browser —
   * and an audit whose purpose is to be sent cannot live underneath that sentence. The
   * two share their scoring rules and nothing else.
   */
  audit: '/audit',
  /**
   * The Website Blueprint — twelve questions about a *business*, and a plan for what a website
   * for a business like theirs has to do. DECISION 042.
   *
   * Its own route rather than a longer `/audit`, and the distinction is the reader rather than
   * the length. `/audit` scores a site that exists, for somebody who suspects theirs is
   * underperforming. This plans a site for a business — and it works for somebody who has no
   * website at all, which is a population `/audit` cannot serve and a large share of this
   * market.
   *
   * **Not called an assessment**, and that is deliberate rather than fussy: five things in this
   * repository are already called one. See DECISION 042.
   */
  blueprint: '/blueprint',
  /**
   * The capability library — what a website can do for a local service business.
   *
   * Its own route rather than a section of `/services`, for two reasons that pull the same
   * way. It is long: forty capabilities, twelve integrations and an eight-stage lifecycle.
   * And it is the only surface on the site that describes things this business does **not**
   * sell — a section of the services page could not do that without arguing against the page
   * it sits on.
   *
   * The path names the reader's question rather than the artefact, matching
   * `/website-teardown` rather than `/capabilities`: nobody types "capabilities" and the
   * word tells a search result nothing.
   */
  capabilities: '/what-your-website-can-do',
  /*
   * The five industry pages.
   *
   * Written out rather than generated, because `content.test.ts` walks
   * `Object.values(routes)` to assert every route has page metadata, and a nested object
   * or a computed key would put these outside that sweep. The paths still come from
   * `industryPath()` so they cannot drift from the trade slug they are named for, and a
   * test asserts each one matches.
   */
  hvac: industryPath('hvac'),
  plumbing: industryPath('plumbing'),
  roofing: industryPath('roofing'),
  landscaping: industryPath('landscaping'),
  electrical: industryPath('electrical'),
  /**
   * The teardown of a composite service-business website, plus a sample of what the free
   * review actually looks like when it lands.
   *
   * Its own route rather than a homepage section: it is long, it is the proof asset a
   * sceptical reader goes looking for, and it is the page worth linking to from anywhere
   * the phrase "free website assessment" appears.
   */
  teardown: '/website-teardown',
  playbook: '/playbook',
  /*
   * The printable workbook.
   *
   * A production tool rather than a page: `noindex`, absent from the sitemap, and linked
   * from nowhere on the site. Open it, print to PDF, send the PDF. That is the whole
   * delivery mechanism, and it is why there is no PDF-generation dependency in a
   * repository with three runtime dependencies.
   */
  workbook: '/playbook/workbook',
  /*
   * There was a `/playbook/get` here: a second page carrying the same email form as
   * `/playbook`, bound to the same hook and the same endpoint, so that a salesperson had
   * a short URL to read out on a call.
   *
   * It was removed because it failed its own justification. `/playbook` is shorter to say
   * than `/playbook/get`, the form is already on it, nothing on the site linked to the
   * second page, and it asked a visitor for an email address in exchange for something
   * the page one level up gives away free. The capture itself is untouched — see
   * `PlayBookPdfOffer`, which is where it always really lived.
   */
  /*
   * The five demonstration sites, three routes each.
   *
   * Written out rather than spread, for the same reason the industry pages are:
   * `content.test.ts` walks `Object.values(routes)` to assert every route has page
   * metadata and is either linked or deliberately unlinked, and a nested object or a
   * computed key would put these outside that sweep. The paths still come from
   * `demoPath()` so they cannot drift from the slug, and a test asserts each one matches.
   *
   * All fifteen need a `PageMeta` entry and therefore a built HTML file: **`vercel.json`
   * has no SPA fallback**, so a route without one 404s on a hard refresh. They are
   * `noIndex`, which keeps them out of `sitemap.xml` but not out of `pages`.
   */
  demoHvac: demoPath('hvac'),
  demoHvacServices: demoPath('hvac', 'services'),
  demoHvacContact: demoPath('hvac', 'contact'),
  demoPlumbing: demoPath('plumbing'),
  demoPlumbingServices: demoPath('plumbing', 'services'),
  demoPlumbingContact: demoPath('plumbing', 'contact'),
  demoRoofing: demoPath('roofing'),
  demoRoofingServices: demoPath('roofing', 'services'),
  demoRoofingContact: demoPath('roofing', 'contact'),
  demoLandscaping: demoPath('landscaping'),
  demoLandscapingServices: demoPath('landscaping', 'services'),
  demoLandscapingContact: demoPath('landscaping', 'contact'),
  demoElectrical: demoPath('electrical'),
  demoElectricalServices: demoPath('electrical', 'services'),
  demoElectricalContact: demoPath('electrical', 'contact'),
  contact: '/contact',
  /**
   * The private demonstration door.
   *
   * `noindex`, absent from the sitemap, and linked from nowhere on the site — it is given out
   * by hand with the passcode sent separately. It still needs a built HTML file, because
   * `vercel.json` has no SPA fallback outside `/app` and a hard refresh here would otherwise
   * 404 on the one page somebody was told to type in.
   *
   * "Nobody knows the URL" is not a security mechanism and nothing here relies on it: the
   * passcode is compared on the server, behind the credential rate limiter, and the routes it
   * opens are not mounted at all when `DEMO_PASSCODE` is unset. See `docs/DEMO-MODE.md`.
   */
  promo: '/promo',
  /*
   * ==========================================================================
   * THE ACCOUNT PAGES
   * ==========================================================================
   *
   * Public, because these are the pages somebody uses when they have no session.
   * `noindex` — a sign-in form in a search result is a result nobody wanted — but they
   * still need built HTML files, because `vercel.json` has no SPA fallback outside
   * `/app` and a hard refresh on `/login` would otherwise 404.
   *
   * The last three are reached only by clicking a link in an email.
   * ==========================================================================
   */
  /**
   * The front door of the assessment funnel, and where every primary call to action on the
   * site now lands.
   *
   * It is a credential page with a different frame: the same `AuthShell` and the same
   * `CredentialForm` as `/signup`, wrapped in copy about the assessment rather than about
   * having an account. That distinction is the whole reason it is a route rather than
   * `/signup?intent=assessment` — a button reading "Get my free website assessment" that
   * lands on a page headed "Create an account" has changed the subject, and the page has to
   * keep the promise the button made.
   *
   * The account it creates *is* the capture. Somebody who stops here has still left a name
   * and an address, which is what the seven-field contact form this replaced could not do.
   * See DECISION 028 and `docs/ACCOUNT-FIRST-CAPTURE.md`.
   */
  getAssessment: '/get-my-assessment',
  login: '/login',
  signup: '/signup',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  verifyEmail: '/verify-email',
  /*
   * ==========================================================================
   * THE AUTHENTICATED CUSTOMER APPLICATION
   * ==========================================================================
   *
   * Everything under `/app`. One route boundary, one layout, one guard — see
   * `app/router/RequireAuth.tsx`, and the matching `requireAuth` on the server's
   * `/api/app` mount, which is the check that actually matters.
   *
   * Only the five *fixed* paths are listed here. The per-project pages are built by
   * `appProjectPath()` below rather than being entries in this object, because
   * `content.test.ts` walks `Object.values(routes)` expecting page metadata for each
   * one, and there is no such thing as metadata for `/app/projects/:projectId`.
   *
   * These five are the only routes in the application served by a **rewrite** rather
   * than by a file of their own: `vercel.json` sends everything under `/app` to the
   * `/app` document, because a project id cannot be prerendered.
   * ==========================================================================
   */
  appDashboard: '/app',
  appAssessment: '/app/assessment',
  /**
   * The assessment itself, inside the workspace.
   *
   * A signed-in customer must never be sent to `/audit` for this. That is the public
   * marketing page: it sells a website to somebody who has already bought one, and it
   * replaces the workspace navigation with the marketing header, so the way back to
   * their own project disappears. Same questions, same scoring — see
   * `features/private/assessment/StartAssessmentPage.tsx`.
   */
  appAssessmentStart: '/app/assessment/start',
  /**
   * The second half of the account-first funnel: the four questions the account does not
   * already answer, asked once there is somewhere to attach them.
   *
   * Not to be confused with `appAssessmentStart`, which is the twenty-question scorecard
   * somebody fills in *about themselves*. This is the request for a review by a person —
   * what "Get my free website assessment" has always meant on the marketing site.
   */
  appAssessmentRequest: '/app/assessment/request',
  appProjects: '/app/projects',
  /**
   * The monthly Website Performance Reports — what Growth Partner actually buys.
   *
   * Account-scoped rather than nested under a project, deliberately: a customer on their
   * second build wants one list of every report they have ever been sent, not two lists
   * behind two projects, one of which they have to remember exists.
   */
  appReports: '/app/reports',
  /**
   * How somebody reaches a human when no website is being built.
   *
   * Account-scoped for a stronger reason than the reports above are: a message *about* a
   * project belongs on that project's feedback tab, and this exists for everybody who has no
   * project open. Before it, their only route to the owner was the public contact form, which
   * files an existing client in a list of prospects.
   */
  appMessages: '/app/messages',
  appBilling: '/app/billing',
  appAccount: '/app/account',
  /*
   * ==========================================================================
   * THERE IS NO `/admin` HERE ANY MORE
   * ==========================================================================
   *
   * The owner console was `/admin`, `/admin/accounts` and `/admin/projects/:id` in this table
   * until DECISION 027 moved it to `apps/admin` on its own origin. Its paths are in
   * `apps/admin/src/config/routes.ts` and this application does not know them.
   *
   * The note is here rather than deleted because "why is there no admin route?" is a question
   * somebody will ask of this file, and because the reasoning matters: the console was always
   * safe as a set of public paths — `requireAdmin` on the server's `/api/admin` mount answers
   * NOT_FOUND to anybody who is not staff, so the pages were an empty shell to everyone else.
   * Moving it was not a security fix. It was so that a customer's browser never downloads the
   * console at all.
   * ==========================================================================
   */
  /**
   * The post-deposit page: Stripe's checkout redirects here. It tells a new client
   * exactly what happens next and collects their onboarding materials. `noindex`,
   * absent from navigation — nobody browses to the start of a project they have not
   * bought.
   */
  welcome: '/welcome',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

/*
 * ============================================================================
 * THE PER-PROJECT PATHS
 * ============================================================================
 *
 * Functions rather than entries in `routes`, for the same reason `industryPath` and
 * `demoPath` are functions: an id is not a route, it is a route *shape*. Putting one in
 * the table would put a value into `Object.values(routes)` that `content.test.ts` would
 * then demand page metadata for, and no metadata exists for a URL that is different for
 * every customer.
 *
 * The ids are encoded here rather than at each call site so no component has to
 * remember to — a project id is a database identifier that has never contained anything
 * needing escaping, which is exactly the assumption that stops being true quietly.
 * ============================================================================
 */

export const appProjectPath = (projectId: string): string =>
  `${routes.appProjects}/${encodeURIComponent(projectId)}`;

export const appProjectPreviewPath = (projectId: string): string =>
  `${appProjectPath(projectId)}/preview`;

export const appProjectFeedbackPath = (projectId: string): string =>
  `${appProjectPath(projectId)}/feedback`;

export const appProjectTasksPath = (projectId: string): string =>
  `${appProjectPath(projectId)}/tasks`;

/**
 * The route patterns React Router registers for the per-project pages. Kept beside the
 * builders above so a rename cannot move one without the other.
 */
export const appProjectRoutePatterns = {
  overview: ':projectId',
  preview: ':projectId/preview',
  feedback: ':projectId/feedback',
  tasks: ':projectId/tasks',
} as const;

/**
 * Fragment identifiers for in-page links and for deep links somebody sends by hand.
 *
 * Every entry here must be rendered as an `id` on a section — `content.test.ts` asserts
 * it. There was a `contact: 'contact'` in this list that nothing rendered and nothing
 * linked to: a constant describing an anchor that did not exist, which is the same
 * failure as the dead `management.categories` the conversion plan opened by deleting. The
 * contact *page* is `routes.contact`; there is no fragment on it worth naming, because
 * the only thing anybody wants on that page is the form, and that is `request`.
 *
 * Not every one of these is linked from the site, and that is fine — an `id` is also a
 * URL somebody can paste into an email. What is not fine is naming one that goes nowhere.
 */
export const sections = {
  /** The ten components of the offer. The hero's secondary button points here. */
  system: 'system',
  management: 'management',
  /**
   * Rendered by `LaunchSection`. The id stayed `process` when the section was renamed,
   * because a fragment is a published URL and renaming it breaks every link already sent.
   */
  process: 'process',
  offer: 'offer',
  examples: 'examples',
  faq: 'faq',
  /** The lead form on the contact page. Every primary call to action lands here. */
  request: 'request',
  /** The twenty improvements, on the PlayBook page. */
  plays: 'plays',
  /** The 40-point self-assessment. The PlayBook hero's secondary button points here. */
  assessment: 'assessment',
} as const;
