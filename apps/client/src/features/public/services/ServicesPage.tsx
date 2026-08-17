import { routes, sections } from '../../../config/routes';
import {
  findPageMeta,
  offerName,
  offerStack,
  pricing,
  site,
  system,
  trust,
} from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { ButtonLink } from '@jobforge/ui';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { PortfolioGrid } from '../portfolio/PortfolioGrid';
import { useInViewOnce } from '../../../hooks/useInViewOnce';
import { track } from '../../../lib/analytics';
import { ServiceList } from './ServiceList';
import { QualificationSection } from './QualificationSection';
import { ValueSection } from '../home/components/ValueSection';
import { LocalSearchSection } from '../home/components/LocalSearchSection';
import { GrowthSection } from '../home/components/GrowthSection';
import { ManagementSection } from '../home/components/ManagementSection';
import { WhatYoureBuyingSection } from '../home/components/WhatYoureBuyingSection';
import { DifferentiatorSection } from '../home/components/DifferentiatorSection';
import { EntrySection } from '../home/components/EntrySection';
import { OfferStack } from '../home/components/OfferStack';
import { PricingBlock } from '../home/components/PricingBlock';
import { FaqList } from '../faq/FaqList';
import styles from './Services.module.css';

const meta = findPageMeta(routes.services);

/**
 * The services page is the offer in depth: the same ten components the homepage
 * summarises, with the supporting detail underneath each one.
 *
 * It renders `content/offer.ts` directly, so there is no second description of the
 * service anywhere in the repository that could drift out of step with the first.
 *
 * ## The three sections that moved here from the homepage
 *
 * `ValueSection` (the eight-stage business case), `LocalSearchSection` and
 * `GrowthSection` (campaign alignment, seasonal work and testing) all used to render on
 * the homepage, where between them they restated the funnel, the ongoing service and the
 * no-rankings caveat that four other sections were already making. None of it was wrong;
 * it was depth arriving before the reader had asked for any. This is the page somebody
 * lands on once they have decided to look properly, which is where depth belongs.
 *
 * They live in `features/home/components/` still, because that is where their styles are
 * and moving the files would be churn for no benefit. Each is surface-agnostic — borders
 * and self-contained muted panels rather than white cards — so they can sit consecutively
 * on the default band without a card disappearing into it.
 *
 * ## And the three the value-per-second pass moved here
 *
 * `WhatYoureBuyingSection`, `DifferentiatorSection` and `EntrySection`, plus the other
 * twenty-three FAQ answers. `docs/VALUE-PER-SECOND.md` §5 records why each failed the
 * test on the homepage: an equation restating a list that was already on the page, a
 * competitor comparison duplicating the management argument, and three "ways to start"
 * cards sitting directly above three pricing tiers.
 *
 * None of them is *wrong* — they are all depth, and this is where depth belongs. That
 * distinction is the whole reason this page absorbs rather than the homepage deleting.
 *
 * These three are not surface-agnostic: two paint the brand band and one paints white
 * cards on muted. They are interleaved with the default-band sections above rather than
 * appended, so no two neighbouring bands share a colour.
 */
export function ServicesPage() {
  useDocumentMeta(meta ?? { path: routes.services, title: 'Services', description: '' });

  const watchPricing = useInViewOnce(() => track('pricing_viewed', { page: 'services' }));

  return (
    <>
      <Section labelledBy="services-heading">
        <Container>
          {/* The page's own <h1>; component names below are h3 under it. */}
          <SectionHeading
            id="services-heading"
            level={1}
            eyebrow={offerName}
            title="What is included, and what keeps happening"
            lede={`${system.lede} Everything below is work JobForge does directly for service businesses in ${site.serviceArea.label} — no outsourcing, no account managers.`}
          />

          {/* Level 2: this list is directly under the page's own h1, with no section
              heading between them. See the note on `headingLevel`. */}
          <ServiceList headingLevel={2} />

          <p className={styles['footnote']}>
            {offerStack.summary} Not sure which parts your business actually needs? That is what the
            free website assessment is for — send us what you have now and we will tell you which
            parts are worth paying for and which are not.
          </p>
        </Container>
      </Section>

      {/*
       * The seven promises in full: why each matters, what it means, and everything it
       * includes.
       *
       * This is where the detail moved to, and it is the first time it has been reachable
       * from the page a researching reader actually opens. It used to render on the
       * homepage and nowhere else — three prose blocks and a deliverables list, seven
       * times, in a section that was 34% of that page. The homepage now shows the same
       * seven as a scannable grid and links here. See `OfferStack`.
       */}
      <Section tone="muted" labelledBy="services-stack-heading">
        <Container>
          <SectionHeading
            id="services-stack-heading"
            eyebrow={offerStack.eyebrow}
            title={offerStack.heading}
            lede={offerStack.lede}
          />
          <OfferStack variant="full" />
        </Container>
      </Section>

      {/*
       * The build, shown rather than described.
       *
       * Ten components, a value stack, pricing and thirty-one answers — and until this
       * section, not one screenshot of the thing all of it describes. The visual audit
       * put it plainly: the page described a website product in ten sections without
       * ever showing a website. So the component list is followed immediately by the
       * finished builds.
       *
       * All five, for the same reason the homepage grid shows all five: a reader
       * scanning for their own trade either finds it or concludes this is not for
       * them, and the first three in data order happened to exclude roofing and
       * electrical — the two most considered purchases. It is the same `PortfolioGrid`
       * the homepage renders, deliberately: this is an eager route with a payload
       * budget, and the grid is already in the eager bundle, so the whole section
       * costs one heading and two paragraphs. The cards carry their own
       * "Demonstration" badges; the paragraph under the grid is the same
       * `trust.disclosure` every other rendering of these examples sits beside, so
       * the strip cannot read as client work.
       *
       * Muted, because the component list above sits on the default band and the
       * summing-up below paints the brand band — this is the one tone that touches
       * neither neighbour.
       */}
      <Section tone="muted" labelledBy="services-examples-heading">
        <Container>
          <SectionHeading
            id="services-examples-heading"
            eyebrow="Examples"
            title="What the finished build looks like"
            lede="The five demonstration sites, one screen each. The layout changes because the way each trade gets hired changes — an emergency call and a planned project are not the same sale."
          />

          <PortfolioGrid />

          {/* Reuses `.footnote` — same quiet aside as the scope note above, no new CSS. */}
          <p className={styles['footnote']}>{trust.disclosure}</p>

          <p className={styles['examplesCta']}>
            <ButtonLink to={routes.portfolio} variant="secondary">
              See all five examples
            </ButtonLink>
          </p>
        </Container>
      </Section>

      {/* The ten components above, summed. Brand band, so it breaks the default run. */}
      <WhatYoureBuyingSection />

      {/*
       * The depth, in the order somebody researching actually wants it: why a website is
       * worth anything at all, how being found works, and what the ongoing half of the
       * service does month to month.
       */}
      <ValueSection />
      <LocalSearchSection />

      {/*
       * The recurring service in full, moved here from the homepage in the offer redesign.
       *
       * On the homepage it had become three-quarters redundant: `CarePlans` inside the
       * pricing block now carries the monthly report, its worked example, the whole scope by
       * cadence and a call to action, so the six management categories were restating the
       * five cadence groups and `whyMonthly` was restating an answer `PricingBlock` gives at
       * the point a reader is actually asking it.
       *
       * None of it was wrong, and none of it is gone. It is depth — the month drawn as a
       * loop, the contrast with ordinary maintenance, the six categories — and this is the
       * page written for depth. Placed before `GrowthSection` because that section is the
       * detail *underneath* these categories: campaigns, seasonal work and testing.
       */}
      <ManagementSection />
      <GrowthSection />

      {/* Which of the three situations the reader is in, and what each one costs. */}
      <EntrySection />

      {/* And why any of it is monthly rather than a project with an end date. */}
      <DifferentiatorSection />

      {/*
       * Who this is built for, and what to do if that is not you yet. It sits between the
       * description of the work and the price, which is where somebody starts asking the
       * commercial question — and it is a recommendation, never a rejection.
       *
       * It is also a muted band directly before the default-band price, which makes it
       * the visual break before the number.
       */}
      <QualificationSection />

      {/*
       * Pricing, repeated in full rather than linked back to the homepage.
       *
       * This is the page somebody lands on from a search for what a managed website
       * costs, and sending them somewhere else to find the number is the most reliable
       * way to lose them. Both the figures and the terms come from `content/offer.ts`,
       * so the two pages cannot disagree.
       */}
      {/*
       * `id={sections.offer}` because the audit links here.
       *
       * The assessment's recommendation sends the reader to `/services#offer`, and nothing
       * on this page rendered that anchor — so the most important link in the funnel landed
       * them at the top of a long page and left them to find the pricing themselves. The
       * homepage renders the same id on its offer section; anchors are per-page, so both
       * are correct and `outline.test.tsx` now checks every cross-page anchor resolves.
       */}
      <Section id={sections.offer} labelledBy="services-pricing-heading" ref={watchPricing}>
        <Container>
          <SectionHeading
            id="services-pricing-heading"
            eyebrow={pricing.eyebrow}
            title={pricing.heading}
            lede={pricing.lede}
          />

          {/*
           * The whole commercial block — the founding condition, the build card, the
           * optional plan, year-one economics, the comparison table and the grouped
           * terms — from the same component the homepage renders. One component cannot
           * disagree with itself across pages, which is exactly how this page once
           * published founding prices with the condition only on the homepage.
           */}
          <PricingBlock blockLevel={3} location="services" />
        </Container>
      </Section>

      {/*
       * All thirty-one questions, in full.
       *
       * The homepage carries eight and links here for the rest. Both lists come from the
       * same `faqItems`, so the overlap is the first eight rather than a second set of
       * answers somebody has to keep in step — and this is the page a reader is on when
       * they have stopped skimming and started checking.
       */}
      <Section tone="muted" labelledBy="services-faq-heading">
        <Container>
          <SectionHeading
            id="services-faq-heading"
            eyebrow="Questions"
            title="Everything people ask"
            lede="The whole list, including the ones that only come up once somebody is seriously considering it. If yours is not here, ask it directly."
          />
          <FaqList />
        </Container>
      </Section>

      <CtaBanner
        heading="Tell us what you are working with"
        body="Send your website address, or just describe the business. We will come back with what we would do first, what it would cost to build, and what it would cost to keep it looked after."
      />
    </>
  );
}
