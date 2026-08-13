import { routes, sections } from '../../config/routes';
import { faqItems, findPageMeta } from '../../content';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { ButtonLink } from '../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../components/ui/Layout';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { FaqList } from '../faq/FaqList';
import { PortfolioGrid } from '../portfolio/PortfolioGrid';
import { CancellationSection } from './sections/CancellationSection';
import { ConversionSection } from './sections/ConversionSection';
import { DemoSection } from './sections/DemoSection';
import { EvidenceSection } from './sections/EvidenceSection';
import { GuaranteeSection } from './sections/GuaranteeSection';
import { Hero } from './sections/Hero';
import { LaunchSection } from './sections/LaunchSection';
import { ManagementSection } from './sections/ManagementSection';
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
 * ## The eight questions
 *
 *   what outcome do you create        -> Hero
 *   why should I care                 -> Reframe
 *   what is that worth                -> Conversion (the funnel, through to revenue)
 *   what does losing it look like     -> Demo
 *   what am I actually buying         -> WhatYoureBuying
 *   how does it work                  -> System, Differentiator, Management
 *   how long, and what do I have to do-> Launch
 *   can I see anything                -> Examples, Testimonials, Trust
 *   what if it goes wrong             -> Guarantee, Cancellation
 *   where do I start, what does it cost -> Entry, Offer
 *   what is the next step             -> Review offer, FAQ, closing call to action
 *
 * ## Two deliberate departures from the previous order
 *
 * **Risk reversal now comes before the price.** The guarantee, the exit terms and the
 * list of what nobody controls used to sit at positions 18, 19 and inside 18 — that is,
 * after the number. A reader who decided $299 was too much never reached the material
 * written to answer that exact objection. They are the answer to "what happens if this
 * goes wrong", and that question is asked while looking at a price, not afterwards.
 *
 * **"You're not buying a website" comes before the mechanism.** It reframes what the
 * money is for, and a reframe that arrives after ten sections of mechanism is arriving
 * to an audience that has already decided what it is looking at.
 *
 * ## What moved off this page
 *
 * The eight-stage business case, the local-search foundation and the campaign, seasonal
 * and testing detail now live on `/services`. All three are depth for somebody who has
 * decided to research rather than material that earns its place in a first read — and
 * every one of them restated an argument the homepage had already made. Nothing was
 * deleted; `ServicesPage` renders the same exports.
 *
 * The value-per-second pass moved three more, on the same principle and to the same
 * page — see `docs/VALUE-PER-SECOND.md` §5 for the audit that decided each one:
 *
 *   - **`WhatYoureBuyingSection`** restated `SystemSection` as an equation. Two notations
 *     for one list.
 *   - **`DifferentiatorSection`** argued this service against hiring a web designer.
 *     `ManagementSection` makes the same argument with the actual monthly work in it,
 *     and a competitor comparison is research material rather than a first read.
 *   - **`EntrySection`** offered three ways to start, in three cards, immediately before
 *     the three pricing tiers.
 *
 * The FAQ was capped at eight of thirty-one for the same reason. In every case the
 * material is still published — moving depth to the page written for depth is not the
 * same as throwing it away, and it is the only version of this that stays honest.
 *
 * ## What the audit deliberately did *not* cut
 *
 * `OpportunitySection` and `ConversionSection` were assessed as one merge candidate and
 * kept apart: "what is a customer worth" and "where do you lose them" are two questions,
 * not one asked twice. `GuaranteeSection` and `CancellationSection` likewise — two
 * headings a reader can skip between is faster than one long block they have to read
 * into, and scannability is the metric. Neither merge would have removed a single word.
 *
 * Each step is a section component, and every word in them comes from `src/content` —
 * `content/offer.ts` and `content/value.ts` in particular.
 */
export function HomePage() {
  useDocumentMeta(meta ?? { path: routes.home, title: 'Home', description: '' });

  return (
    <>
      <Hero />
      <ReframeSection />
      <OpportunitySection />
      <ConversionSection />
      <EvidenceSection />
      <DemoSection />
      <SystemSection />
      <ManagementSection />
      <LaunchSection />

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
          <PortfolioGrid limit={3} />
          <p className={pageStyles['industryNote']}>
            <ButtonLink to={routes.portfolio} variant="secondary">
              View all examples
            </ButtonLink>
          </p>
        </Container>
      </Section>

      <TestimonialsSection />

      {/*
       * Risk reversal, immediately before the price rather than after it.
       *
       * The tone alternation through here is load-bearing rather than decorative: two
       * abutting bands of the same tone make the cards inside one of them disappear.
       * `GuaranteeSection` is muted and paints white cards; `CancellationSection` is
       * default and paints muted ones.
       *
       * `EntrySection` used to sit after them, and its muted band was what let
       * `OfferSection` be white. Removing it would have put two white bands together, so
       * the price took the muted surface and the free-review block and the FAQ swapped
       * with it. That is why three tones changed in a commit that removed one section —
       * and why `HomePage.test.tsx` now asserts the alternation directly rather than
       * leaving it to a comment nobody reads before reordering.
       */}
      <GuaranteeSection />
      <CancellationSection />

      <OfferSection />
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
      <Section id={sections.faq} tone="muted" labelledBy="home-faq-heading">
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
