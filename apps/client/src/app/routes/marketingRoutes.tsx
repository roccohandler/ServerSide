import { lazy } from 'react';
import { Route } from 'react-router-dom';
import { routes } from '../../config/routes';
import { industryPath, tradesWithPages } from '../../config/trades';
import { SiteLayout } from '../../components/layout/SiteLayout';
import { HomePage } from '../../features/public/home';
import { AboutPage } from '../../features/public/about';
import { ServicesPage } from '../../features/public/services';
import { PortfolioPage } from '../../features/public/portfolio';
import { ContactPage } from '../../features/public/contact';
import { NotFoundPage } from '../../features/public/notFound';

/*
 * ============================================================================
 * THE PUBLIC MARKETING SITE
 * ============================================================================
 *
 * Every page a visitor can reach without an account, under the JobForge shell.
 *
 * ## Most routes are eager, the expensive ones are not
 *
 * The pages imported at the top of this file are eager: they are small, they share almost
 * all of their components, and splitting them would add a network round trip on
 * navigation to save a few kilobytes.
 *
 * Everything declared with `lazy()` below is an exception, and each one is arithmetic
 * rather than taste. `scripts/check-budget.ts` measures the eager payload on every
 * production build and fails it if these move back — which is what keeps the reasoning
 * below true rather than aspirational.
 *
 * ## Why each `lazy()` reaches a concrete module and not a feature index
 *
 * This is the one sanctioned exception to the entry-point rule, and it is load-bearing.
 * Routing a dynamic import through a feature's `index.ts` pulls that barrel's whole
 * export graph into the chunk, which merges chunks this file exists to keep apart. The
 * static imports above go through the index; the dynamic ones must not.
 * ============================================================================
 */

/*
 * The audit: twenty scored categories, a trade taxonomy, twenty trade-aware diagnosis
 * strings and a scenario calculator — a large chunk to hand to every visitor to the
 * homepage, most of whom will never open it.
 */
const AuditPage = lazy(() =>
  import('../../features/public/audit/AuditPage').then((module) => ({
    default: module.AuditPage,
  })),
);

/*
 * The five industry pages share one lazy chunk rather than getting one each.
 *
 * They are a single component over five content entries, so five chunks would be five
 * copies of the same JSX plus five network round trips, and a visitor who reads two of
 * them is a visitor who was interested — not one who should pay for a second download.
 */
const IndustryPage = lazy(() =>
  import('../../features/public/industries/IndustryPage').then((module) => ({
    default: module.IndustryPage,
  })),
);

/*
 * The teardown carries two `SiteMock` renderings and the whole sample review, and it is a
 * page somebody arrives at deliberately rather than on the way to somewhere else.
 */
const TeardownPage = lazy(() =>
  import('../../features/public/teardown/TeardownPage').then((module) => ({
    default: module.TeardownPage,
  })),
);

/*
 * Twenty improvements written out in full, a forty-point assessment, and a workbook that
 * renders all of it again for print came to roughly a third of the entire bundle. On a
 * page whose own improvement 07 tells owners to be honest about whether every script is
 * earning its place, shipping that to everybody would have been hard to defend.
 */
const PlayBookPage = lazy(() =>
  import('../../features/public/playbook/PlayBookPage').then((module) => ({
    default: module.PlayBookPage,
  })),
);

/* A production tool nobody but the owner ever opens. Unlinked and noindex. */
const WorkbookPage = lazy(() =>
  import('../../features/public/playbook/WorkbookPage').then((module) => ({
    default: module.WorkbookPage,
  })),
);

/*
 * The capability library. Lazy for the same reason the industry pages are, and with a
 * sharper edge: `content/capabilities.ts` is the largest single content module in the
 * repository, it is deliberately absent from `content/index.ts`, and only this route reads
 * it. Importing it eagerly would put forty capabilities into the chunk every visitor to the
 * homepage downloads — the exact failure `scripts/check-budget.ts` exists to fail over.
 */
const CapabilitiesPage = lazy(() =>
  import('../../features/public/capabilities/CapabilitiesPage').then((module) => ({
    default: module.CapabilitiesPage,
  })),
);

/*
 * The post-deposit page. An onboarding form only a paying client ever opens has no
 * business in the bundle every visitor to the homepage downloads.
 */
const WelcomePage = lazy(() =>
  import('../../features/public/welcome/WelcomePage').then((module) => ({
    default: module.WelcomePage,
  })),
);

/*
 * The Website Blueprint. Twelve questions, twenty-odd rules and the whole result copy — a
 * large chunk to hand to every visitor to the homepage, most of whom will never open it. Its
 * content module is deliberately absent from `content/index.ts` for the same reason the
 * audit's is.
 */
const BlueprintPage = lazy(() =>
  import('../../features/public/blueprint/BlueprintPage').then((module) => ({
    default: module.BlueprintPage,
  })),
);

/*
 * `/pricing`. Lazy for the same arithmetic as everything else here: it renders the shared
 * `PricingBlock` (already in the eager chunk, so free) plus its own content module, which is
 * deliberately absent from `content/index.ts`. Eager, that content would ride in the chunk
 * every visitor to the homepage downloads — and the homepage already carries a price block.
 */
const PricingPage = lazy(() =>
  import('../../features/public/pricing/PricingPage').then((module) => ({
    default: module.PricingPage,
  })),
);

/*
 * ============================================================================
 * PRIVACY AND TERMS — EAGER UNTIL 2026-08-19, AND NOBODY HAD MEASURED THEM
 * ============================================================================
 *
 * These were eager, and `content/legal.ts` was re-exported from the content barrel — so
 * 25 kB of prose that a first-time visitor almost never renders was in the chunk every page
 * modulepreloads. It had always been that way, everything worked, and the weight was
 * invisible precisely because nothing had changed recently enough to blame.
 *
 * What surfaced it: five commercial clauses were added to the terms and the budget guard
 * failed by 0.8 kB. The clauses had to be published — a refund policy and a deemed-acceptance
 * window are not optional on a site collecting a $2,450 deposit — so the question became
 * which eager weight was *not* earning its place, and this was the obvious answer.
 *
 * They are the same shape of route as the teardown and the capability library: long, read
 * deliberately, and reached by somebody who has already decided to look. `LegalPage` is
 * shared by both, so the two of them are one chunk rather than two.
 * ============================================================================
 */
const PrivacyPage = lazy(() =>
  import('../../features/public/legal/PrivacyPage').then((module) => ({
    default: module.PrivacyPage,
  })),
);

const TermsPage = lazy(() =>
  import('../../features/public/legal/TermsPage').then((module) => ({
    default: module.TermsPage,
  })),
);

/*
 * The suspense boundary is inside `SiteLayout`, around the outlet, so the header and
 * footer stay on screen while a lazy chunk arrives. Putting it above this route instead
 * would unmount the whole shell for those few frames.
 */
export const marketingRoutes = (
  <Route element={<SiteLayout />}>
    <Route path={routes.home} element={<HomePage />} />
    <Route path={routes.services} element={<ServicesPage />} />
    <Route path={routes.pricing} element={<PricingPage />} />
    <Route path={routes.portfolio} element={<PortfolioPage />} />
    <Route path={routes.audit} element={<AuditPage />} />
    <Route path={routes.blueprint} element={<BlueprintPage />} />
    {/*
     * Generated from the same list the pages, the metadata and the audit's trade question
     * are generated from, so a sixth trade is one entry in `config/trades.ts` plus one
     * entry in `content/industries.ts` — never a route somebody forgot to register.
     */}
    {tradesWithPages.map((trade) => (
      <Route
        key={trade.slug}
        path={industryPath(trade.slug)}
        element={<IndustryPage slug={trade.slug} />}
      />
    ))}
    <Route path={routes.teardown} element={<TeardownPage />} />
    <Route path={routes.playbook} element={<PlayBookPage />} />
    <Route path={routes.capabilities} element={<CapabilitiesPage />} />
    {/* Unlinked and noindex. Opened to print the workbook to PDF — see the route table. */}
    <Route path={routes.workbook} element={<WorkbookPage />} />
    <Route path={routes.about} element={<AboutPage />} />
    <Route path={routes.contact} element={<ContactPage />} />
    {/* Post-deposit onboarding, reached from Stripe's checkout redirect. */}
    <Route path={routes.welcome} element={<WelcomePage />} />
    <Route path={routes.privacy} element={<PrivacyPage />} />
    <Route path={routes.terms} element={<TermsPage />} />

    <Route path="*" element={<NotFoundPage />} />
  </Route>
);
