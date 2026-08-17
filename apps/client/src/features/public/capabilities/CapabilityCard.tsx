import { Badge } from '@jobforge/ui';
import {
  availabilityLabels,
  capabilityPage,
  findIntegration,
  findLifecycleStage,
  maturityLabels,
} from './content/capabilities';
import { resolveDependencies } from './utils/capabilityMatch';
import { track } from '../../../lib/analytics';
import type { Capability } from '../../../types/content';
import styles from './Capabilities.module.css';

export interface CapabilityCardProps {
  readonly capability: Capability;
  /** The whole library, for resolving this one's dependencies. */
  readonly library: readonly Capability[];
}

const { fieldLabels } = capabilityPage.explorer;

/**
 * One capability, collapsed to a line and a status until somebody asks for more.
 *
 * ## Progressive disclosure, and why it is `<details>`
 *
 * Forty capabilities fully expanded is a document nobody reads. Collapsed, it is a list
 * somebody can scan in under a minute and then open the two that matter to them.
 *
 * `<details>`/`<summary>` rather than a `useState` toggle, matching `FaqList`: it works
 * before JavaScript arrives, it is keyboard-operable and screen-reader-announced without any
 * ARIA written by hand, and the browser handles the expanded/collapsed state. A hand-rolled
 * accordion would need `aria-expanded`, `aria-controls`, an id per panel and key handling to
 * reach the same place.
 *
 * Deliberately **no** `name` attribute, unlike the FAQ. `name` makes the group exclusive, so
 * opening one closes the last — right for objections, wrong here, where the whole point is
 * comparing two capabilities side by side.
 *
 * ## What is always visible, and why it is these three things
 *
 * The name, the one-line description, and the **availability badge**. The badge is not a
 * detail to be discovered on expansion: a reader scanning the collapsed list is forming a
 * picture of what this business does, and a list that reveals "you cannot buy this" only to
 * people who click has misled everybody who did not.
 */
export function CapabilityCard({ capability, library }: CapabilityCardProps) {
  const availability = availabilityLabels[capability.availability];
  const dependencies = resolveDependencies(library, capability);

  /*
   * Integrations and stages are resolved here and filtered, rather than rendered from the
   * raw id list. An id that no longer resolves is a content bug that `capabilities.test.ts`
   * fails the build over — and if one ever ships anyway, the row disappears instead of
   * rendering an empty bullet in front of a customer. Same rule as `resolveDependencies`.
   */
  const integrations = capability.integrations
    .map((id) => findIntegration(id))
    .filter((integration) => integration !== undefined);

  const stages = capability.lifecycle
    .map((id) => findLifecycleStage(id))
    .filter((stage) => stage !== undefined);

  return (
    <details
      className={styles['capability']}
      onToggle={(event) => {
        if (!event.currentTarget.open) return;
        track('capability_opened', {
          id: capability.id,
          tier: capability.tier,
          availability: capability.availability,
        });
      }}
    >
      <summary className={styles['capabilitySummary']}>
        <span className={styles['capabilityHead']}>
          {/*
           * `<h3>` inside `<summary>` is valid and is what makes the library navigable by
           * heading, which is how a screen-reader user skims forty items. The disclosure
           * state is announced by the summary itself.
           */}
          <h3 className={styles['capabilityName']}>{capability.name}</h3>
          <span
            className={
              availability.purchasable
                ? `${styles['availability']} ${styles['availableNow']}`
                : `${styles['availability']} ${styles['availableNot']}`
            }
          >
            {availability.label}
          </span>
        </span>

        <span className={styles['capabilityShort']}>{capability.shortDescription}</span>
        <span className={styles['expandHint']}>{capabilityPage.explorer.expandLabel}</span>
      </summary>

      <div className={styles['capabilityBody']}>
        {/*
         * The availability sentence sits at the top of the expanded panel, ahead of the
         * outcome. A reader who has just opened something labelled "Intended, not built"
         * needs to know what that means before they read a paragraph about what it would do
         * for them — otherwise the paragraph does the selling and the badge does the
         * disclaiming, which is the shape of a misleading page.
         */}
        <p className={styles['availabilityMeaning']}>
          {availability.meaning} <span>{maturityLabels[capability.maturity]}.</span>
        </p>

        <dl className={styles['capabilityFields']}>
          <div className={styles['fieldPrimary']}>
            <dt>{fieldLabels.businessOutcome}</dt>
            <dd>{capability.businessOutcome}</dd>
          </div>

          <div>
            <dt>{fieldLabels.problemSolved}</dt>
            <dd>{capability.problemSolved}</dd>
          </div>

          <div>
            <dt>{fieldLabels.howItWorks}</dt>
            <dd>
              <ul className={styles['howList']}>
                {capability.howItWorks.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </dd>
          </div>

          <div className={styles['fieldPair']}>
            <dt>{fieldLabels.customerValue}</dt>
            <dd>{capability.customerValue}</dd>
          </div>

          <div className={styles['fieldPair']}>
            <dt>{fieldLabels.businessValue}</dt>
            <dd>{capability.businessValue}</dd>
          </div>

          <div>
            <dt>{fieldLabels.recommendedFor}</dt>
            <dd>{capability.recommendedFor}</dd>
          </div>

          {/*
           * The last three are conditional because most capabilities have none of them, and
           * three empty rows on every card is noise that makes the populated ones harder to
           * see. An empty `dl` row is also a screen-reader announcement of nothing.
           */}
          {dependencies.length > 0 ? (
            <div>
              <dt>{fieldLabels.dependencies}</dt>
              <dd>{dependencies.map((entry) => entry.name).join(' · ')}</dd>
            </div>
          ) : null}

          {integrations.length > 0 ? (
            <div>
              <dt>{fieldLabels.integrations}</dt>
              <dd>{integrations.map((entry) => entry.name).join(' · ')}</dd>
            </div>
          ) : null}

          {stages.length > 0 ? (
            <div>
              <dt>{fieldLabels.lifecycle}</dt>
              <dd className={styles['stageTags']}>
                {stages.map((stage) => (
                  <Badge key={stage.id}>{stage.label}</Badge>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>
    </details>
  );
}
