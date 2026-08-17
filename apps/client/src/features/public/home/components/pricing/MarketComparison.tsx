import { marketComparison } from '../../../../../content';
import { headingTags, type BlockLevel } from './headingTags';
import styles from './Pricing.module.css';
import offer from '../../Offer.module.css';

/**
 * The comparison the reader is actually making.
 *
 * Not between these two purchases — between this and whatever else they could spend the
 * money on. Nobody is named: see the note above `marketComparison` in `content/offer.ts`.
 *
 * Rendered on `/services` only. On the homepage this is a second full table immediately
 * under the first, and two tables in a row is where a scanning reader stops scanning.
 *
 * ## Why this is not the same component as `CoverageComparison`
 *
 * The two tables look alike and mean different things: one divides work between the build
 * and the monthly service, the other sets this business against the market. Merging them would need a row shape neither content module has and a props
 * object that reads as configuration. Two named blocks of forty lines are cheaper to read
 * than one configurable table, and the Rule of Three has not been met — there are two.
 */
export function MarketComparison({ blockLevel }: { readonly blockLevel: BlockLevel }) {
  const { Heading } = headingTags(blockLevel);

  return (
    <div className={styles['comparison']}>
      <Heading className={offer['blockHeading']}>{marketComparison.heading}</Heading>
      <p className={offer['blockLede']}>{marketComparison.lede}</p>

      <div
        className={styles['comparisonScroll']}
        tabIndex={0}
        role="region"
        aria-label={marketComparison.heading}
      >
        <table className={styles['comparisonTable']}>
          <thead>
            <tr>
              <th scope="col" className={styles['comparisonHead']}>
                <span className="visually-hidden">{marketComparison.columns.label}</span>
              </th>
              <th scope="col" className={styles['comparisonHead']}>
                {marketComparison.columns.typical}
              </th>
              <th scope="col" className={styles['comparisonHead']}>
                {marketComparison.columns.here}
              </th>
            </tr>
          </thead>
          <tbody>
            {marketComparison.rows.map((row) => (
              <tr key={row.id}>
                <th scope="row" className={styles['comparisonLabel']}>
                  {row.label}
                </th>
                <td className={styles['comparisonCell']}>{row.typical}</td>
                <td className={styles['comparisonCell']}>{row.here}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className={styles['comparisonNote']}>{marketComparison.note}</p>
    </div>
  );
}
