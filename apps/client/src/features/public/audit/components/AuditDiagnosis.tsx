import { Link } from 'react-router-dom';
import { audit, behaviourFor } from '../../../../content/audit';
import { playbook } from '../../../../content/playbook';
import { portfolioProjects } from '../../../../content/portfolio';
import { demoForTrade } from '../../../../config/demos';
import { flagship, recommendedAction } from '../../../../config/pricing';
import { primaryCta } from '../../../../content/site';
import { routes, sections } from '../../../../config/routes';
import type { TradeSlug } from '../../../../config/trades';
import type { ScorecardBand } from '../../../../types/content';
import { ButtonLink } from '@jobforge/ui';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Badge } from '@jobforge/ui';
import { PhoneFrame } from '../../../../components/patterns/DeviceFrame';
import { track } from '../../../../lib/analytics';
import type { WeakCategory } from '../../playbook/useWebsiteScore';
import styles from '../Audit.module.css';

const HEADING_ID = 'audit-diagnosis-heading';

const principlesById = new Map(playbook.principles.map((principle) => [principle.id, principle]));

export interface AuditDiagnosisProps {
  readonly isComplete: boolean;
  readonly band: ScorecardBand | null;
  readonly weakest: readonly WeakCategory[];
  readonly trade: TradeSlug | null;
  /** Points scored. Only meaningful once `isComplete`. */
  readonly total: number;
  /** Points available, so the recommendation survives the audit growing past twenty. */
  readonly outOf: number;
}

/**
 * The diagnosis — the part of the audit that is the product demonstration.
 *
 * ## The four beats, and where each comes from
 *
 * Every finding is: what you scored → what a customer does → what that costs → what I
 * would change. Three of those already existed per principle in `content/playbook.ts`
 * and are reused rather than rewritten, so the audit and the PlayBook can never give
 * contradictory advice about the same category:
 *
 *   - what a customer does  → `behaviourFor()`, the one genuinely new field, and the only
 *                             one that is trade-aware
 *   - what that costs       → `principle.consequence`
 *   - what I would change   → `principle.principle`, then the first three `practices`
 *
 * ## Why the language changes but the substance does not
 *
 * The scorecard labels are UX terms — "Calls to action", "Visual hierarchy" — because
 * that is what they are. A business owner reading their own diagnosis does not need the
 * category name, they need the sentence about somebody standing in their driveway. So the
 * category label is demoted to a caption and the behaviour line leads.
 *
 * ## Why only the weakest five
 *
 * Twenty findings is a burden and nobody acts on it. Five is a week's work. This is the
 * same `WEAKEST_COUNT` cap the PlayBook uses, for the same reason.
 */
export function AuditDiagnosis({
  isComplete,
  band,
  weakest,
  trade,
  total,
  outOf,
}: AuditDiagnosisProps) {
  const { diagnosis } = audit;

  /*
   * The recommendation, from the reader's own answers.
   *
   * Three real outcomes rather than a tier lookup: `rebuild` points at the flagship
   * build, `fix` recommends targeted work quoted per site, and `none` says out loud
   * that a rebuild is probably not what is holding them back. See `recommendedAction`.
   */
  const action = isComplete ? recommendedAction(total, outOf) : 'none';

  /*
   * The demonstration build for the reader's own trade, shown beside the rebuild
   * recommendation.
   *
   * The rebuild branch names a build and links to its pricing — a paragraph about a
   * website, at the one moment the reader has just been told theirs needs replacing.
   * If a demonstration exists for their trade, showing its phone capture answers the
   * question the paragraph raises: what would the replacement actually look like.
   * Phone rather than desktop, because the diagnosis they just read is about customers
   * deciding from phones.
   *
   * `demoForTrade` narrows rather than assumes — `other` has no demo by design, and a
   * project without a mobile capture or a live URL renders nothing rather than an
   * empty frame. The copy names the build as a demonstration for a fictional business,
   * and claims only shape, never results: nothing here says the demo produced anything
   * for anybody, because it has not.
   */
  const demoSlug = trade ? demoForTrade(trade) : undefined;
  const demoProject = demoSlug
    ? portfolioProjects.find((project) => project.id === demoSlug)
    : undefined;

  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <p className={styles['stepLabel']}>{diagnosis.stepLabel}</p>
        <SectionHeading id={HEADING_ID} title={diagnosis.heading} lede={diagnosis.lede} />

        {!isComplete ? (
          <div className={styles['pending']}>
            <h3 className={styles['pendingHeading']}>{diagnosis.incompleteHeading}</h3>
            <p className={styles['pendingBody']}>{diagnosis.incompleteBody}</p>
          </div>
        ) : weakest.length === 0 ? (
          <div className={styles['pending']}>
            <h3 className={styles['pendingHeading']}>{diagnosis.perfectHeading}</h3>
            <p className={styles['pendingBody']}>{diagnosis.perfectBody}</p>
          </div>
        ) : (
          <>
            {band ? (
              <div className={styles['band']}>
                <p className={styles['bandRange']}>{band.range}</p>
                <h3 className={styles['bandTitle']}>{band.title}</h3>
                <p className={styles['bandBody']}>{band.body}</p>
                {/*
                 * Attached to the band rather than to the page, for the same reason the
                 * scenario's disclaimer sits beside the numbers: a caveat somebody has to
                 * scroll to is a caveat written for the seller's comfort. These are the
                 * PlayBook's own bands, and the PlayBook has always said out loud that
                 * nobody has calibrated them.
                 */}
                <p className={styles['bandDisclaimer']}>{diagnosis.bandDisclaimer}</p>
              </div>
            ) : null}

            <ol className={styles['findings']}>
              {weakest.map(({ category, score }) => {
                const principle = principlesById.get(category.principleId);

                return (
                  <li key={category.id} className={styles['finding']}>
                    <p className={styles['findingCategory']}>
                      {category.label}
                      <span className={styles['findingScore']}>{diagnosis.scoreLabel(score)}</span>
                    </p>

                    <h3 className={styles['findingHeading']}>
                      {behaviourFor(category.id, trade ?? 'other')}
                    </h3>

                    {principle ? (
                      <dl className={styles['findingDetail']}>
                        <div>
                          <dt className={styles['findingLabel']}>{diagnosis.labels.consequence}</dt>
                          <dd className={styles['findingValue']}>{principle.consequence}</dd>
                        </div>
                        <div>
                          <dt className={styles['findingLabel']}>{diagnosis.labels.improvement}</dt>
                          <dd className={styles['findingValue']}>
                            {principle.principle}
                            {/* The list indent — `.findingActions` is a `<ul>` treatment, and
                                the recommendation's button rows below use their own class. */}
                            <ul className={styles['findingActions']}>
                              {principle.practices.slice(0, 3).map((practice) => (
                                <li key={practice}>{practice}</li>
                              ))}
                            </ul>
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                  </li>
                );
              })}
            </ol>

            {/*
             * ----------------------------------------------------------------
             * WHERE THE ASSESSMENT LEADS
             * ----------------------------------------------------------------
             *
             * The audit used to stop at the findings, so the best asset on the site
             * pointed nowhere. This connects what somebody just learned about their own
             * website to what is actually for sale — from their answers rather than from
             * a default.
             *
             * The `null` branch is not a fallback. It is the recommendation for a site
             * that scored well, and it says do not buy this. That branch is what makes
             * the other two worth reading.
             */}
            <div className={styles['recommendation']}>
              {action === 'rebuild' ? (
                <>
                  <h3 className={styles['recommendationHeading']}>
                    {diagnosis.recommendation.heading}
                  </h3>
                  <p className={styles['recommendationLead']}>
                    {diagnosis.recommendation.rebuild.lead}{' '}
                    <strong className={styles['recommendationTier']}>{flagship.name}</strong>.
                  </p>
                  <p className={styles['recommendationBestFor']}>{flagship.bestFor}</p>
                  <p className={styles['recommendationNote']}>{diagnosis.recommendation.note}</p>

                  <ButtonLink
                    to={`${routes.services}#${sections.offer}`}
                    variant="secondary"
                    onClick={() =>
                      track('pricing_tier_selected', { tier: flagship.id, from: 'audit' })
                    }
                  >
                    {diagnosis.recommendation.rebuild.seePricing}
                  </ButtonLink>

                  {demoProject?.mobileImage && demoProject.mobileImageAlt && demoProject.demoUrl ? (
                    <aside
                      className={styles['recommendationDemo']}
                      aria-label={`${demoProject.industry} demonstration build`}
                    >
                      <PhoneFrame className={styles['recommendationDemoPhone']}>
                        <img
                          src={demoProject.mobileImage}
                          alt={demoProject.mobileImageAlt}
                          width={640}
                          height={1280}
                          loading="lazy"
                          decoding="async"
                        />
                      </PhoneFrame>
                      <div className={styles['recommendationDemoBody']}>
                        <Badge tone="accent">Demonstration</Badge>
                        <p className={styles['recommendationDemoLine']}>
                          This is the {demoProject.industry} demonstration build — a site we made
                          for a fictional business in your trade, to show the shape of what we would
                          build for you.{' '}
                          <Link to={demoProject.demoUrl}>Open the {demoProject.industry} demo</Link>
                          .
                        </p>
                      </div>
                    </aside>
                  ) : null}
                </>
              ) : action === 'fix' ? (
                /*
                 * ==================================================================
                 * THE BRANCH THAT USED TO END IN NOTHING
                 * ==================================================================
                 *
                 * This is the recommendation for a site scoring roughly 65–85% — which is
                 * most established businesses with a working website, and therefore most
                 * people who finish this audit. It rendered a heading, two paragraphs and
                 * no link of any kind: the best-qualified visitor the site ever gets,
                 * handed a diagnosis and left standing.
                 *
                 * It named Conversion Fix for a while. That product is withdrawn — it never
                 * got a price — and the branch now offers the free review of the real site
                 * that any fix was always going to be scoped from, which is both the honest
                 * next step and the one that actually happened.
                 *
                 * **The `<strong>` naming a product is gone with it**, and nothing replaced
                 * it. A lead sentence ending in a bolded product name and a full stop was
                 * right when there was a product; ending it in a bolded "free review" would
                 * be dressing a step up as a purchase. The lead now finishes its own
                 * sentence — see `audit.ts`.
                 *
                 * The event stays `pricing_tier_selected`, and this branch no longer fires
                 * it: nothing here is a tier. What it fires is the ordinary `cta_clicked`
                 * every non-purchase action on the site fires, from `audit-fix`.
                 * ==================================================================
                 */
                <>
                  <h3 className={styles['recommendationHeading']}>
                    {diagnosis.recommendation.fix.heading}
                  </h3>
                  <p className={styles['recommendationLead']}>
                    {diagnosis.recommendation.fix.lead} a free website assessment on the real site.
                  </p>
                  <p className={styles['recommendationBestFor']}>
                    {diagnosis.recommendation.fix.body}
                  </p>
                  <p className={styles['recommendationNote']}>{diagnosis.recommendation.note}</p>

                  <div className={styles['recommendationActions']}>
                    <ButtonLink
                      to={`${routes.contact}?intent=fix#${sections.request}`}
                      onClick={() => track('cta_clicked', { location: 'audit-fix' })}
                    >
                      {diagnosis.recommendation.fix.cta}
                    </ButtonLink>
                    <ButtonLink to={`${routes.services}#${sections.offer}`} variant="secondary">
                      {diagnosis.recommendation.fix.seeScope}
                    </ButtonLink>
                  </div>
                </>
              ) : (
                /*
                 * The branch that recommends not buying anything, and the one that makes the
                 * other two credible. It has an action now too — not a purchase, but a way to
                 * ask for a second opinion, because "you probably do not need this" followed
                 * by silence reads as the page giving up rather than as a recommendation.
                 */
                <>
                  <h3 className={styles['recommendationHeading']}>
                    {diagnosis.recommendation.none.heading}
                  </h3>
                  <p className={styles['recommendationBestFor']}>
                    {diagnosis.recommendation.none.body}
                  </p>

                  <div className={styles['recommendationActions']}>
                    <ButtonLink
                      to={primaryCta.to}
                      variant="secondary"
                      onClick={() => track('cta_clicked', { location: 'audit-keep' })}
                    >
                      {diagnosis.recommendation.none.cta}
                    </ButtonLink>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </Container>
    </Section>
  );
}
