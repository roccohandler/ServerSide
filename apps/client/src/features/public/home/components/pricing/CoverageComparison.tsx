import { comparison } from '../../../../../content';
import { headingTags, type BlockLevel } from './headingTags';
import styles from './Pricing.module.css';
import offer from '../../Offer.module.css';

/**
 * What the build covers against what Growth Partner covers.
 *
 * `HomePage.test.tsx` says in as many words that this table has to survive a refactor: a
 * price block that hides what the two purchases each cover is the confusion the whole
 * block was built to remove.
 */
export function CoverageComparison({ blockLevel }: { readonly blockLevel: BlockLevel }) {
  const { Heading } = headingTags(blockLevel);

  return (
    <div className={styles['comparison']}>
      <Heading className={offer['blockHeading']}>{comparison.heading}</Heading>
      <p className={offer['blockLede']}>{comparison.lede}</p>

      {/*
       * Focusable, because it scrolls.
       *
       * `overflow-x: auto` on a div is reachable with a pointer and unreachable with a
       * keyboard: a sighted keyboard user on a narrow window can see the table is cut off
       * and has no way to move it. `tabIndex={0}` plus a name makes it a scrollable region
       * the arrow keys work in, which is the standard fix and the reason it is not just a
       * div.
       */}
      <div
        className={styles['comparisonScroll']}
        tabIndex={0}
        role="region"
        aria-label={comparison.heading}
      >
        <table className={styles['comparisonTable']}>
          <thead>
            <tr>
              <th scope="col" className={styles['comparisonHead']}>
                <span className="visually-hidden">What is covered</span>
              </th>
              <th scope="col" className={styles['comparisonHead']}>
                {comparison.columns.build}
              </th>
              <th scope="col" className={styles['comparisonHead']}>
                {comparison.columns.partner}
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={styles['comparisonLabel']}>
                  {row.label}
                </th>
                <td className={styles['comparisonCell']}>{row.build}</td>
                <td className={styles['comparisonCell']}>{row.partner}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles['comparisonNote']}>{comparison.note}</p>
    </div>
  );
}
