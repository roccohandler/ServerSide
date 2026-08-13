import { audit, behaviourFor } from '../../../content/audit';
import { playbook } from '../../../content/playbook';
import { recommendedTier } from '../../../config/pricing';
import { routes, sections } from '../../../config/routes';
import type { TradeSlug } from '../../../config/trades';
import type { ScorecardBand } from '../../../types/content';
import { ButtonLink } from '../../../components/ui/Button';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { track } from '../../../lib/analytics';
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
   * `null` is a real outcome rather than a missing value: above roughly 85% the honest
   * advice is that a rebuild is not what is holding them back. See `recommendedTier`.
   */
  const suggested = isComplete ? recommendedTier(total, outOf) : null;

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
              {suggested ? (
                <>
                  <h3 className={styles['recommendationHeading']}>
                    {diagnosis.recommendation.heading}
                  </h3>
                  <p className={styles['recommendationLead']}>
                    {diagnosis.recommendation.lead}{' '}
                    <strong className={styles['recommendationTier']}>{suggested.name}</strong>.
                  </p>
                  <p className={styles['recommendationBestFor']}>{suggested.bestFor}</p>
                  <p className={styles['recommendationNote']}>{diagnosis.recommendation.note}</p>

                  <ButtonLink
                    to={`${routes.services}#${sections.offer}`}
                    variant="secondary"
                    onClick={() =>
                      track('pricing_tier_selected', { tier: suggested.id, from: 'audit' })
                    }
                  >
                    {diagnosis.recommendation.seePricing}
                  </ButtonLink>
                </>
              ) : (
                <>
                  <h3 className={styles['recommendationHeading']}>
                    {diagnosis.recommendation.none.heading}
                  </h3>
                  <p className={styles['recommendationBestFor']}>
                    {diagnosis.recommendation.none.body}
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </Container>
    </Section>
  );
}
