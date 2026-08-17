import { commercialTerms } from '../../../../../content';
import { headingTags, type BlockLevel } from './headingTags';
import styles from './Pricing.module.css';
import offer from '../../Offer.module.css';

interface CommercialTermsDisclosureProps {
  readonly blockLevel: BlockLevel;
  /** `/services` renders it open. Somebody on the depth page has already asked. */
  readonly open: boolean;
}

/**
 * ============================================================================
 * EVERY COMMERCIAL TERM — PUBLISHED ON BOTH SURFACES, COLLAPSED ON ONE
 * ============================================================================
 *
 * This block was the obvious cut: two thousand pixels of definition list at the bottom of
 * the longest section on the homepage. It is deliberately *not* cut, and the reason is a
 * test — `HomePage.test.tsx` asserts every term label and value renders here, under the
 * name "publishes the terms a buyer needs before they will get in touch". That is a stated
 * commercial position, not an accident of layout: a business asking for $4,900 up front
 * publishes its terms where the price is.
 *
 * So the terms stay on the page and every one of them stays in the document. What changes
 * is that the homepage ships them closed. A disclosure is not hiding — the heading is
 * visible, it says how many groups are inside, and it is one click with no navigation.
 * `<details>` keeps the content in the DOM, so the guarantee the test encodes still holds,
 * and a reader who came to read the terms still finds them by scrolling to the word
 * "terms".
 * ============================================================================
 */
export function CommercialTermsDisclosure({ blockLevel, open }: CommercialTermsDisclosureProps) {
  const { Heading, SubHeading } = headingTags(blockLevel);

  return (
    <details className={styles['terms']} open={open}>
      <summary className={offer['termsSummary']}>
        <Heading className={offer['blockHeading']}>{commercialTerms.heading}</Heading>
        <p className={offer['blockLede']}>{commercialTerms.lede}</p>
      </summary>

      {commercialTerms.groups.map((group) => (
        <div key={group.id} className={styles['termsGroup']}>
          <SubHeading className={styles['termsGroupLabel']}>{group.label}</SubHeading>
          <dl className={offer['termsList']}>
            {group.items.map((term) => (
              <div key={term.id} className={styles['term']}>
                <dt className={styles['termLabel']}>{term.label}</dt>
                <dd className={styles['termValue']}>{term.value}</dd>
                <dd className={styles['termDetail']}>{term.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}

      <p className={styles['priceFootnote']}>{commercialTerms.note}</p>
    </details>
  );
}
