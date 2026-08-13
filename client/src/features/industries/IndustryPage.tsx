import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { evidence, findPageMeta, portfolioProjects, trust } from '../../content';
import { findIndustry, industryShared } from '../../content/industries';
import { routes } from '../../config/routes';
import { findTrade, type TradeSlug } from '../../config/trades';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { track } from '../../lib/analytics';
import { Badge, Card, Container, Section, SectionHeading } from '../../components/ui/Layout';
import { ButtonLink } from '../../components/ui/Button';
import { EvidenceList } from '../../components/marketing/Evidence';
import { CtaBanner } from '../../components/marketing/CtaBanner';
import { NotFoundPage } from '../notFound/NotFoundPage';
import styles from './Industry.module.css';

export interface IndustryPageProps {
  readonly slug: TradeSlug;
}

/**
 * One industry page, for one trade.
 *
 * ## One component, five pages — and why that is not a template
 *
 * The objection the brief raises about industry pages is real: most of them are one page
 * with the trade name substituted, which readers detect immediately and which search
 * engines have been discounting for years. The defence is not to write five components.
 * It is that everything a reader sees comes from `content/industries.ts`, where the five
 * entries genuinely differ — different journeys of different lengths, different friction,
 * different page architecture, a different published benchmark, a different demonstration
 * and a different next step. A shared renderer for genuinely different content is not a
 * template; it is the absence of five copies of the same JSX to keep in step.
 *
 * What is deliberately shared and *not* varied: the offer, the prices, the guarantee and
 * the terms. Those are the same for every trade, so each page links to the one canonical
 * page rather than restating them — five near-copies of a price is how a business ends up
 * publishing two.
 *
 * ## The audit link carries the trade
 *
 * Every call to action here points at `/audit?trade=<slug>`, and the audit reads that
 * parameter to preselect step one. A reader who arrived on the roofing page has already
 * answered the audit's first question by being here, and asking it again is the kind of
 * small, avoidable friction the rest of this page is about.
 */
export function IndustryPage({ slug }: IndustryPageProps) {
  const industry = findIndustry(slug);
  const trade = findTrade(slug);
  const meta = findPageMeta(industry?.path ?? '');

  useDocumentMeta(
    meta ?? { path: industry?.path ?? '/', title: industry?.metaTitle ?? '', description: '' },
  );

  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    track('industry_page_viewed', { trade: slug });
  }, [slug]);

  /*
   * Unreachable through the router — the routes are generated from the same list this
   * resolves against. It exists because `findIndustry` returns `undefined` rather than
   * guessing, and rendering the not-found page is a better answer to an impossible state
   * than a crash or a page of empty sections.
   */
  if (!industry || !trade) return <NotFoundPage />;

  const demo = portfolioProjects.find((project) => project.id === industry.demoId);
  const citations = evidence.citations.filter((citation) =>
    industry.evidenceIds.includes(citation.id),
  );
  const auditHref = `${routes.audit}?trade=${industry.slug}`;

  return (
    <>
      {/* ------------------------------------------------------------------- hero */}

      <Section labelledBy="industry-heading">
        <Container>
          <SectionHeading
            id="industry-heading"
            level={1}
            eyebrow={industry.eyebrow}
            title={industry.heading}
            lede={industry.lede}
          />

          <p className={styles['decision']}>
            <span className={styles['decisionLabel']}>{industryShared.decisionLabel}</span>
            {industry.decisionWindow}
          </p>

          <div className={styles['heroActions']}>
            <ButtonLink
              to={auditHref}
              onClick={() => track('cta_clicked', { location: `industry-${industry.slug}-hero` })}
            >
              {industry.cta.auditLabel}
            </ButtonLink>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------------- journey */}

      <Section tone="muted" labelledBy="industry-journey-heading">
        <Container>
          <SectionHeading
            id="industry-journey-heading"
            title={industry.journey.heading}
            lede={industry.journey.lede}
          />

          <ol className={styles['journey']}>
            {industry.journey.steps.map((step, index) => (
              <li key={step.id} className={styles['journeyStep']}>
                <span className={styles['journeyIndex']} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={styles['journeyMoment']}>{step.moment}</h3>
                <p className={styles['journeyDetail']}>{step.detail}</p>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- friction */}

      <Section labelledBy="industry-friction-heading">
        <Container>
          <SectionHeading
            id="industry-friction-heading"
            title={industry.friction.heading}
            lede={industry.friction.lede}
          />

          <ul className={styles['frictionList']}>
            {industry.friction.items.map((item) => (
              <li key={item.id} className={styles['friction']}>
                <h3 className={styles['frictionTitle']}>{item.title}</h3>

                <dl className={styles['frictionDetail']}>
                  <div>
                    <dt className={styles['frictionLabel']}>
                      {industryShared.frictionLabels.whatHappens}
                    </dt>
                    <dd className={styles['frictionValue']}>{item.whatHappens}</dd>
                  </div>
                  <div>
                    <dt className={styles['frictionLabel']}>
                      {industryShared.frictionLabels.whatItCosts}
                    </dt>
                    <dd className={styles['frictionValue']}>{item.whatItCosts}</dd>
                  </div>
                  <div>
                    <dt className={styles['frictionLabel']}>
                      {industryShared.frictionLabels.whatIdChange}
                    </dt>
                    <dd className={styles['frictionValue']}>{item.whatIdChange}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ page architecture */}

      <Section tone="muted" labelledBy="industry-pages-heading">
        <Container>
          <SectionHeading
            id="industry-pages-heading"
            title={industry.pages.heading}
            lede={industry.pages.lede}
          />

          <dl className={styles['needs']}>
            {industry.pages.items.map((need) => (
              <div key={need.name} className={styles['need']}>
                <dt className={styles['needName']}>{need.name}</dt>
                <dd className={styles['needWhy']}>{need.why}</dd>
              </div>
            ))}
          </dl>

          <p className={styles['needsNote']}>{industry.pages.note}</p>
        </Container>
      </Section>

      {/* --------------------------------------------------------------- benchmark */}

      <Section labelledBy="industry-benchmark-heading">
        <Container>
          <SectionHeading
            id="industry-benchmark-heading"
            title={industryShared.benchmark.heading}
            lede={industryShared.benchmark.lede}
          />

          {/*
           * The label is rendered above the figure rather than under it, and it is not a
           * footnote. A reader who sees the number and stops reading has still been told
           * what kind of number it is, which is the entire point of the sentence.
           */}
          <div className={styles['benchmark']}>
            <p className={styles['benchmarkLabel']}>{industry.benchmark.label}</p>

            <p className={styles['benchmarkFigure']}>
              <span className={styles['benchmarkRate']}>{industry.benchmark.conversionRate}</span>
              <span className={styles['benchmarkCategory']}>
                {industryShared.benchmark.rateLabel} — {industry.benchmark.category}
              </span>
            </p>

            <p className={styles['benchmarkWhy']}>{industry.benchmark.whyItMatters}</p>

            <p className={styles['benchmarkLimitation']}>
              <span className={styles['benchmarkLimitationLabel']}>
                {industryShared.benchmark.limitationLabel}
              </span>
              {industry.benchmark.limitation}
            </p>

            <p className={styles['benchmarkSource']}>
              <span className={styles['benchmarkSourceLabel']}>
                {industryShared.benchmark.sourceLabel}:{' '}
              </span>
              {/* The new-tab announcement matches `EvidenceList` — see the note there. */}
              <a href={industry.benchmark.sourceUrl} target="_blank" rel="noopener noreferrer">
                {industry.benchmark.source}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className={styles['benchmarkDataset']}>{industry.benchmark.dataset}</span>
            </p>
          </div>

          {citations.length > 0 ? (
            <div className={styles['evidence']}>
              <h3 className={styles['evidenceHeading']}>{industryShared.evidence.heading}</h3>
              <EvidenceList citations={citations} />
            </div>
          ) : null}
        </Container>
      </Section>

      {/* -------------------------------------------------------------------- demo */}

      {demo ? (
        <Section tone="muted" labelledBy="industry-demo-heading">
          <Container>
            <SectionHeading
              id="industry-demo-heading"
              title={industryShared.demo.heading}
              lede={industryShared.demo.lede}
            />

            <Card className={styles['demo']} flush>
              <img
                className={styles['demoImage']}
                src={demo.image}
                alt={demo.imageAlt}
                width={600}
                height={400}
                loading="lazy"
                decoding="async"
              />

              <div className={styles['demoBody']}>
                <div className={styles['demoMeta']}>
                  <Badge tone="brand">{demo.industry}</Badge>
                  {demo.isDemo ? <Badge tone="accent">Demonstration</Badge> : null}
                </div>

                <h3 className={styles['demoTitle']}>{demo.title}</h3>
                <p className={styles['demoDescription']}>{demo.description}</p>

                <ul className={styles['demoHighlights']}>
                  {demo.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>

                {/*
                 * The published-demo rule, applied here as it is on the examples page: a
                 * link only when there is something live at the other end of it.
                 */}
                {demo.demoUrl ? (
                  <ButtonLink to={demo.demoUrl} variant="secondary">
                    Open the {demo.industry} demonstration
                  </ButtonLink>
                ) : (
                  <p className={styles['demoUnpublished']}>Live demo not published yet.</p>
                )}
              </div>
            </Card>

            <p className={styles['demoDisclosure']}>{trust.disclosure}</p>

            <p className={styles['demoLink']}>
              <Link to={routes.portfolio}>{industryShared.demo.linkLabel}</Link>
            </p>
          </Container>
        </Section>
      ) : null}

      {/* --------------------------------------------------------- the offer, once */}

      <Section labelledBy="industry-offer-heading">
        <Container narrow>
          <SectionHeading
            id="industry-offer-heading"
            title={industryShared.offerLink.heading}
            lede={industryShared.offerLink.body}
          />

          {/*
           * The audit first, the offer second, and that order is the argument the whole
           * site makes: find out what is wrong before deciding what to buy. The trade
           * travels with the link, so step one of the audit is already answered.
           */}
          <div className={styles['offerActions']}>
            <ButtonLink
              to={auditHref}
              onClick={() => track('cta_clicked', { location: `industry-${industry.slug}-close` })}
            >
              {industry.cta.auditLabel}
            </ButtonLink>
            <ButtonLink
              to={routes.services}
              variant="secondary"
              onClick={() => track('cta_clicked', { location: `industry-${industry.slug}-offer` })}
            >
              {industryShared.offerLink.label}
            </ButtonLink>
          </div>
        </Container>
      </Section>

      <CtaBanner
        headingId="industry-cta-heading"
        heading={industry.cta.heading}
        body={industry.cta.body}
      />
    </>
  );
}
