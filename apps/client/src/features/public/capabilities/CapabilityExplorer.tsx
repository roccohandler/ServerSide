import { useMemo, useState } from 'react';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Button, ButtonLink } from '@jobforge/ui';
import { RadioGroupField, SelectField } from '@jobforge/ui';
import { routes, sections } from '../../../config/routes';
import { findTrade, trades, type TradeSlug } from '../../../config/trades';
import {
  capabilities,
  capabilityCategories,
  capabilityPage,
  capabilityTiers,
} from './content/capabilities';
import {
  emptyFilter,
  filterCapabilities,
  recommendFor,
  type CapabilityFilter,
} from './utils/capabilityMatch';
import { track } from '../../../lib/analytics';
import type { Capability, CapabilityCategory, CapabilityTier } from '../../../types/content';
import { CapabilityCard } from './CapabilityCard';
import styles from './Capabilities.module.css';

const HEADING_ID = 'explorer-heading';
const CHOOSER_HEADING_ID = 'explorer-chooser-heading';

export interface CapabilityExplorerProps {
  /**
   * A trade carried in from elsewhere — in practice `?trade=roofing`, linked from the
   * industry pages. Already validated by the page; `null` when nobody has chosen.
   */
  readonly initialTrade: TradeSlug | null;
}

/**
 * The library, grouped into three tiers, with the middle one chosen for the reader's trade.
 *
 * ## Where the rules are, and where they are not
 *
 * Every decision about *which* capabilities belong in which group is in
 * `lib/capabilityMatch.ts`. This component decides how they look. That split is the point:
 * the ranking, the industry match, the service-model weighting and the fallback all have
 * tests that never render a single element, and this file cannot quietly disagree with them
 * because it does not contain a copy of them.
 *
 * The one thing this file does own is which grouping is *shown* — recommendations when a
 * trade has been chosen, the flat library when one has not — and that is a presentation
 * decision rather than a rule.
 *
 * ## The foundation is filtered like everything else
 *
 * An earlier version exempted it, to protect the invariant that a reader is never shown less
 * than what they are already paying for. The invariant is right; the exemption was the wrong way
 * to hold it. Every foundation capability is `included-*`, so the availability filter cannot
 * remove one whatever the component does — the data guarantees it and a test asserts it — while
 * the exemption made the *category* filter silently not apply to a third of the library. See the
 * notes in the body.
 */
export function CapabilityExplorer({ initialTrade }: CapabilityExplorerProps) {
  const [trade, setTrade] = useState<TradeSlug | null>(initialTrade);
  const [filter, setFilter] = useState<CapabilityFilter>(emptyFilter);

  /*
   * Recomputed only when the trade changes. The library is a constant, the ranking is a sort
   * over forty items, and doing it on every keystroke of an unrelated control would be
   * pointless work — but the real reason for the memo is stability: `recommendFor` returns
   * new arrays each call, and an unmemoised call would give every `CapabilityCard` a new
   * identity on every render of this component.
   */
  const recommendation = useMemo(() => {
    const resolved = trade === null ? null : findTrade(trade);
    return resolved === undefined || resolved === null
      ? null
      : recommendFor(capabilities, resolved);
  }, [trade]);

  const groups = useMemo((): readonly { tier: CapabilityTier; items: readonly Capability[] }[] => {
    const forTier = (tier: CapabilityTier): readonly Capability[] => {
      if (recommendation === null) {
        return capabilities.filter((capability) => capability.tier === tier);
      }
      if (tier === 'foundation') return recommendation.foundation;
      return tier === 'recommended' ? recommendation.recommended : recommendation.advanced;
    };

    /*
     * The filter is applied to every tier, foundation included.
     *
     * It used to skip the foundation, to protect the invariant that a reader is never shown
     * less than what they are already paying for. The invariant is right and the mechanism was
     * wrong twice over: every foundation capability is `included-*`, so `availableOnly` cannot
     * remove one regardless — the data guarantees it and a test asserts it — while the
     * exemption made the *category* filter silently not work on a third of the library. See
     * the note on `filterCapabilities`.
     */
    return capabilityTiers.map((meta) => ({
      tier: meta.id,
      items: filterCapabilities(forTier(meta.id), filter),
    }));
  }, [recommendation, filter]);

  /*
   * There is no empty state, and that is a checked fact rather than an oversight.
   *
   * One was written — a panel saying the filters had matched nothing, with a way back. It could
   * never render: every foundation capability applies to every trade and is included in a
   * price, so no combination of these two controls can empty the library. The panel and its two
   * strings were dead code with an alibi.
   *
   * Rather than keep an unreachable branch, the impossibility is now asserted:
   * `capabilityMatch.test.ts` walks every trade against every category with the availability
   * toggle on and fails if any pair comes back empty. **If that test ever fails, this component
   * needs an empty state again** — the test says so in as many words.
   */
  const isFiltered = filter.category !== null || filter.availableOnly || trade !== null;

  return (
    <>
      {/* ------------------------------------------------------------ the chooser */}

      <Section labelledBy={CHOOSER_HEADING_ID}>
        <Container narrow>
          <SectionHeading
            id={CHOOSER_HEADING_ID}
            title={capabilityPage.chooser.heading}
            lede={capabilityPage.chooser.hint}
          />

          {/*
           * Radios rather than a dropdown, matching the audit: the options *are* the
           * question, and a reader should be able to recognise their own business without
           * opening anything. Twelve is a long list and that is the cost of the taxonomy
           * covering twelve trades — see the note in `config/trades.ts`.
           */}
          <RadioGroupField
            id="capability-trade"
            name="capability-trade"
            label={capabilityPage.chooser.fieldLabel}
            options={trades.map((entry) => ({ value: entry.slug, label: entry.label }))}
            value={trade ?? ''}
            onChange={(value) => {
              // The options are generated from the closed union, so this is one of them.
              const slug = value as TradeSlug;
              setTrade(slug);
              track('capability_filtered', { control: 'trade', value: slug });
            }}
          />

          {/*
           * The graceful-degradation path, and it is stated rather than hidden.
           *
           * `isGeneric` is true when nothing in the library names this trade. The honest move
           * is to say the recommendation is the universal set and offer the thing that would
           * actually help — a look at their real site — rather than presenting a generic list
           * as personalisation.
           */}
          {recommendation !== null && recommendation.isGeneric ? (
            <div className={styles['genericNotice']}>
              <p>{capabilityPage.chooser.genericNotice}</p>
              <ButtonLink
                to={`${routes.contact}#${sections.request}`}
                variant="secondary"
                onClick={() => track('cta_clicked', { location: 'capabilities-generic' })}
              >
                {capabilityPage.chooser.genericCtaLabel}
              </ButtonLink>
            </div>
          ) : null}
        </Container>
      </Section>

      {/* ------------------------------------------------------------ the library */}

      <Section tone="muted" labelledBy={HEADING_ID}>
        <Container>
          <SectionHeading
            id={HEADING_ID}
            eyebrow={capabilityPage.explorer.eyebrow}
            title={capabilityPage.explorer.heading}
            lede={capabilityPage.explorer.lede}
          />

          <div className={styles['filters']}>
            <h3 className={styles['filterHeading']}>{capabilityPage.explorer.filterHeading}</h3>

            {/*
             * A dropdown here, unlike the trade above, and the difference is deliberate: ten
             * categories is a filter rather than a question, the reader has already been
             * asked the question that matters, and a second twelve-tall radio column would
             * bury the library it is meant to narrow.
             */}
            <SelectField
              id="capability-category"
              label={capabilityPage.explorer.categoryFieldLabel}
              value={filter.category ?? ''}
              options={[
                { value: '', label: capabilityPage.explorer.categoryAllLabel },
                ...capabilityCategories.map((category) => ({
                  value: category.id,
                  label: category.label,
                })),
              ]}
              onChange={(event) => {
                const value = event.target.value;
                const category = value === '' ? null : (value as CapabilityCategory);
                setFilter((current) => ({ ...current, category }));
                track('capability_filtered', { control: 'category', value: value || 'all' });
              }}
            />

            <label className={styles['toggle']}>
              <input
                type="checkbox"
                checked={filter.availableOnly}
                onChange={(event) => {
                  const availableOnly = event.target.checked;
                  setFilter((current) => ({ ...current, availableOnly }));
                  track('capability_filtered', { control: 'available', value: availableOnly });
                }}
              />
              <span>{capabilityPage.explorer.availableOnlyLabel}</span>
            </label>

            {/*
             * Reset, and it exists because of a dead end rather than for tidiness.
             *
             * A radio group cannot be un-chosen. Once a reader picks a trade, the recommended
             * and advanced groups are filtered to it, and capabilities written for other trades
             * are gone with no control anywhere on the page that brings them back. This is the
             * way back to the whole library, and it clears the category and the toggle too.
             */}
            {isFiltered ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setFilter(emptyFilter);
                  setTrade(null);
                }}
              >
                {capabilityPage.explorer.clearLabel}
              </Button>
            ) : null}
          </div>

          {capabilityTiers.map((meta) => {
            const group = groups.find((entry) => entry.tier === meta.id);
            if (group === undefined || group.items.length === 0) return null;

            return (
              <div
                key={meta.id}
                /*
                 * The recommended group carries the emphasis class. It is the middle group
                 * and normally a reader weights the first — but foundation is what they
                 * already have, so the group worth *deciding* about is this one. See the
                 * note on `capabilityTiers`.
                 */
                className={
                  meta.id === 'recommended'
                    ? `${styles['tierGroup']} ${styles['tierGroupStrong']}`
                    : styles['tierGroup']
                }
              >
                <h3 className={styles['tierLabel']}>{meta.label}</h3>
                <p className={styles['tierSummary']}>{meta.summary}</p>

                <div className={styles['capabilityList']}>
                  {group.items.map((capability) => (
                    <CapabilityCard
                      key={capability.id}
                      capability={capability}
                      library={capabilities}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </Container>
      </Section>
    </>
  );
}
