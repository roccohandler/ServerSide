import { routes, sections } from '../../../config/routes';
import { faqItems, findPageMeta } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { ButtonLink } from '../../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { FaqList } from '../faq/FaqList';
import { PortfolioGrid } from '../portfolio/PortfolioGrid';
import { AfterLaunchSection } from './sections/AfterLaunchSection';
import { CancellationSection } from './sections/CancellationSection';
import { ConversionSection } from './sections/ConversionSection';
import { DemoSection } from './sections/DemoSection';
import { EntrySection } from './sections/EntrySection';
import { EvidenceSection } from './sections/EvidenceSection';
import { GuaranteeSection } from './sections/GuaranteeSection';
import { Hero } from './sections/Hero';
import { LaunchSection } from './sections/LaunchSection';
import { OfferSection } from './sections/OfferSection';
import { OpportunitySection } from './sections/OpportunitySection';
import { ReframeSection } from './sections/ReframeSection';
import { ReviewOfferSection } from './sections/ReviewOfferSection';
import { SystemSection } from './sections/SystemSection';
import { TestimonialsSection } from './sections/TestimonialsSection';
import { TrustSection } from './sections/TrustSection';
import pageStyles from './Home.module.css';

const meta = findPageMeta(routes.home);

/**
 * How many of the thirty-one questions the homepage carries.
 *
 * The rest are on `/services`, and the link under the list says so. The section's own
 * lede promises "the things people ask first" and the page was rendering all thirty-one
 * of them — around nine hundred lines of collapsed detail below a call to action that
 * was also on the first screen. Eight is the number a reader will actually scan before
 * deciding they have seen enough.
 */
const HOMEPAGE_FAQ_LIMIT = 8;

/**
 * The homepage is one long argument, in the order a sceptical business owner makes it.
 *
 * ## The twelve beats
 *
 *   1.  what outcome, for whom, at what price -> Hero
 *   2.  why should I care                     -> Reframe
 *   3.  what is that worth                    -> Opportunity
 *   4.  where am I losing it                  -> Conversion
 *   5.  what gets built, and in how long      -> System, Launch
 *   6.  **how will I know it worked**         -> AfterLaunch
 *   7.  can you show me anything              -> Demo, Evidence, Trust, Examples
 *   8.  what if it goes wrong                 -> Guarantee, Cancellation
 *   9.  which of these am I, and what is it   -> Entry, Offer (price + Growth Partner)
 *   10. what else do people ask               -> Review offer, FAQ
 *   11. what is the next step                 -> closing call to action
 *
 * ## The four ordering decisions, and why each one
 *
 * **Risk reversal comes before the price.** The guarantee, the exit terms and the list of
 * what nobody controls used to sit after the number. A reader who decided $299 was too much
 * never reached the material written to answer that exact objection. They answer "what
 * happens if this goes wrong", which is a question asked while looking at a price.
 *
 * **"How will I know" is its own beat, and it is new.** Every part of the answer already
 * existed and none of it was findable: the baseline was a technical bullet in a deliverable
 * list, the day-30 report was the fifth beat of a prose block inside the process section,
 * and the monthly measurement was the last line of the plan's scope. A reader assembling
 * "when do I first find out anything" had to visit three places and infer the sequence.
 * Drawn once, it also collapses the perceived delay: the first real answer is about a month
 * after launch, not a year.
 *
 * **The demonstrations come before the research.** `EvidenceSection`'s three citations are
 * deliberately about parts of the journey this business does not touch, so as an opening
 * move they argue the website may not be the problem. That lands better after the reader
 * has seen what a good one looks like.
 *
 * **The three situations come immediately before the price.** `EntrySection` was removed
 * once, correctly: three "ways to start" cards sat directly above three pricing tiers and
 * the reader was choosing twice. There is one build price now, and the three cards route to
 * three genuinely different pieces of work — so choosing once, here, is the point.
 *
 * ## What moved off this page
 *
 * The eight-stage business case, the local-search foundation, the campaign/seasonal/testing
 * detail, `WhatYoureBuyingSection` and `DifferentiatorSection` all live on `/services`.
 * Nothing was deleted; `ServicesPage` renders the same exports. See
 * `docs/VALUE-PER-SECOND.md` §5 for the audit that decided each one.
 *
 * **`ManagementSection` joined them in this pass**, and it is the one removal this redesign
 * caused rather than inherited: once `CarePlans` grew to carry the monthly report, its
 * example, the full scope by cadence and its own call to action, the two were saying the
 * same thing twice on one page. The recurring service is answered where the money is; the
 * depth is on the page written for depth.
 *
 * ## What was deliberately *not* merged
 *
 * `OpportunitySection` and `ConversionSection` — "what is a customer worth" and "where do
 * you lose them" are two questions, not one asked twice. `GuaranteeSection` and
 * `CancellationSection` likewise: two headings a reader can skip between is faster than one
 * long block they have to read into, and scannability is the metric.
 *
 * Each step is a section component, and every word in them comes from `src/content` —
 * `content/offer.ts` and `content/value.ts` in particular.
 */
export function HomePage() {
  useDocumentMeta(meta ?? { path: routes.home, title: 'Home', description: '' });

  return (
    <>
      {/* 1. Outcome, mechanism, both prices, both actions. */}
      <Hero />

      {/* 2. The problem, in the reader's own terms. */}
      <ReframeSection />

      {/* 3. Why it is worth anything: what one more customer is worth. */}
      <OpportunitySection />

      {/* 4. Where the leak is, and which six steps of it we own. */}
      <ConversionSection />

      {/* 5. What gets built, and what the four weeks actually involve. */}
      <SystemSection />
      <LaunchSection />

      {/*
       * 6. How you will know — the answer to the question the whole page raises.
       *
       * New, and placed here on purpose: directly after the build and its timeline, because
       * "when do I find out whether it worked" is the question a reader has the moment they
       * can picture the thing being built and how long it takes. It is also where the
       * perceived delay collapses — the first real answer is a month after launch.
       */}
      <AfterLaunchSection />

      {/*
       * 7. Proof of method.
       *
       * The demonstrations come before the research, which is the reverse of the previous
       * order. `EvidenceSection`'s three citations are deliberately about parts of the
       * journey this business does not touch — call answer rates, booking expectations — so
       * as an opening move it argues that the website may not be the problem. That belongs
       * after the reader has seen what a good one looks like, not before.
       */}
      <DemoSection />
      <EvidenceSection />

      {/*
       * The trust disclosure sits immediately before the examples grid, because what it
       * discloses is what the grid is: demonstration sites rather than client work. It
       * used to sit after, where it read as an apology for something already scrolled
       * past.
       */}
      <TrustSection />

      <Section id={sections.examples} labelledBy="home-examples-heading">
        <Container>
          <SectionHeading
            id="home-examples-heading"
            eyebrow="Examples"
            title="What these websites look like"
            lede="Demonstration sites built for five different trades. Each one solves the same problem in the way that trade needs."
          />
          {/*
           * All five, not a teaser. A reader scanning for their own trade either finds it
           * here or concludes this is not for them — two cards were being withheld from
           * exactly the visitors they were built to convince. The portfolio page still
           * earns its link: it shows each build larger, desktop and phone together.
           */}
          <PortfolioGrid />
          <p className={pageStyles['industryNote']}>
            <ButtonLink to={routes.portfolio} variant="secondary">
              See each build in more detail
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <TestimonialsSection />

      {/*
       * 8. Risk reversal, immediately before the price rather than after it.
       *
       * The tone alternation through here is load-bearing rather than decorative: two
       * abutting bands of the same tone make the cards inside one of them disappear.
       * `GuaranteeSection` is muted and paints white cards; `CancellationSection` is
       * default and paints muted ones.
       *
       * `HomePage.test.tsx` asserts the alternation directly rather than leaving it to a
       * comment nobody reads before reordering — which is what makes reordering this page
       * safe to do at all.
       */}
      <GuaranteeSection />
      <CancellationSection />

      {/*
       * 9. Which situation the reader is in, then the price.
       *
       * `EntrySection` is back on the homepage, and the reason it was removed no longer
       * holds. It was cut because three "ways to start" cards sat directly above three
       * pricing tiers and the reader was being asked to choose twice. There is one build
       * price now, and these three cards are not a price ladder — they route a reader to
       * one of three genuinely different pieces of work, each with its own action. Choosing
       * once, immediately before the commercial block, is the whole point.
       */}
      <EntrySection />

      {/* 9. The price, in full. */}
      <OfferSection />

      {/*
       * 10. Growth Partner in depth is on `/services` now, not here.
       *
       * `ManagementSection` used to run at position eight — four screens above any figure,
       * so six categories of monthly work were read with no number attached. Moving it
       * *after* the price was the obvious fix and it turned out to be the wrong one, because
       * once `CarePlans` grew to carry the monthly report, its example, the full scope by
       * cadence and its own call to action, the two sections were saying the same thing
       * twice on one page. About three quarters of it overlapped: the six management
       * categories restate the five cadence groups, and `whyMonthly` restates the
       * "why isn't it just $299/mo" answer that `PricingBlock` already renders at the point
       * a reader is actually asking it.
       *
       * So the recurring service is answered here where the money is, and the depth — the
       * month drawn as a loop, the contrast with ordinary maintenance, the six categories —
       * is on the page written for depth. That is the same rule that moved six other
       * sections there, applied to a duplication this redesign created rather than one it
       * inherited. See `docs/VALUE-PER-SECOND.md` §5.
       */}
      <ReviewOfferSection />

      {/*
       * Eight questions, then the way to the other twenty-three.
       *
       * The muted band is a consequence of the section above it, not a preference:
       * `EntrySection` used to sit between the exit terms and the price and it carried
       * the alternation. With it gone, `OfferSection` took the muted surface and this run
       * shifted with it — see the note above `GuaranteeSection`, and the test in
       * `HomePage.test.tsx` that fails if two neighbours ever end up the same colour.
       */}
      <Section id={sections.faq} labelledBy="home-faq-heading">
        <Container>
          <SectionHeading
            id="home-faq-heading"
            eyebrow="Questions"
            title="Before you get in touch"
            lede="The things people ask first. If yours is not here, ask it directly."
          />
          <FaqList limit={HOMEPAGE_FAQ_LIMIT} />

          <p className={pageStyles['industryNote']}>
            <ButtonLink to={routes.services} variant="secondary">
              {`Read all ${faqItems.length} questions`}
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <CtaBanner />
    </>
  );
}
