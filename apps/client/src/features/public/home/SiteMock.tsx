import type { SiteMockSpec } from '../../../types/content';
import styles from './Value.module.css';
import { cx } from '@jobforge/ui';

/*
 * A miniature website, built from markup rather than drawn as an image.
 *
 * Two reasons it is not a screenshot. The differences being demonstrated are mostly
 * *wording* — "Quality Service You Can Trust" against "Heating and cooling repair in
 * Greater Seattle" — and a screenshot of a sentence is unreadable at this size. And a
 * screenshot of a real business's homepage would be somebody's actual website being used
 * as a bad example on a stranger's sales page.
 *
 * Nothing here is a customer. Every spec lives in `content/value.ts` and every panel is
 * labelled as an illustration.
 */

/**
 * A one-sentence summary for assistive technology.
 *
 * The alternative is a screen reader reading out two fake navigations, two fake service
 * lists and two fake footers per example, twelve times down the page. The difference the
 * mock exists to show is already written out in full in the problem/change/why text
 * beside it, so this only has to carry the gist.
 */
function describe(spec: SiteMockSpec): string {
  if (spec.loading) {
    return 'Illustrative website, still loading: the page is blank apart from unresolved blocks.';
  }

  const parts = [`Illustrative website with the headline “${spec.headline}”`];

  if (spec.callLabel) parts.push('a call button in the header');
  if (spec.ctaLabel) parts.push(`a “${spec.ctaLabel}” button`);
  if (spec.buriedPhone) parts.push('and a phone number only in the footer');

  return `${parts.join(', ')}.`;
}

export interface SiteMockProps {
  readonly spec: SiteMockSpec;
}

export function SiteMock({ spec }: SiteMockProps) {
  const className = cx(styles['mock'], spec.cramped && styles['mockCramped']);

  return (
    <div className={className} role="img" aria-label={describe(spec)}>
      <div className={styles['mockBar']}>
        <span className={styles['mockBrand']} />

        <ul className={styles['mockNav']}>
          {spec.nav.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {spec.callLabel ? <span className={styles['mockCall']}>{spec.callLabel}</span> : null}
      </div>

      <div className={styles['mockBody']}>
        {spec.loading ? (
          <div className={styles['mockSkeleton']}>
            <span className={styles['mockBlock']} />
            <span className={styles['mockBlock']} />
            <span className={styles['mockBlockShort']} />
            <span className={styles['mockBlockWide']} />
          </div>
        ) : (
          <>
            <p className={styles['mockHeadline']}>{spec.headline}</p>
            {spec.subline ? <p className={styles['mockSubline']}>{spec.subline}</p> : null}

            {spec.ctaLabel ? <span className={styles['mockCta']}>{spec.ctaLabel}</span> : null}

            {spec.cards ? (
              <ul className={styles['mockCards']}>
                {spec.cards.map((card) => (
                  <li key={card} className={styles['mockCard']}>
                    {card}
                  </li>
                ))}
              </ul>
            ) : null}

            {spec.trust ? (
              <ul className={styles['mockTrust']}>
                {spec.trust.map((item) => (
                  <li key={item} className={styles['mockBadge']}>
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {spec.buriedPhone ? <p className={styles['mockFooter']}>{spec.buriedPhone}</p> : null}
    </div>
  );
}
