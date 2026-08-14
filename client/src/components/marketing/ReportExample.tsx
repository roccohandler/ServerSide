import { websiteReport } from '../../content';
import { Icon } from '../ui/Icon';
import styles from './ReportExample.module.css';

/**
 * ============================================================================
 * THE MONTHLY REPORT, DRAWN
 * ============================================================================
 *
 * "Measurement in plain English" is a sentence. This is the artefact, and the difference
 * between the two is the difference between a recurring charge a customer tolerates and one
 * they can picture arriving.
 *
 * ## Why it must not look like a real client's data
 *
 * It is a made-up month for a made-up business, and the repository has a five-signal
 * convention for that which this follows exactly:
 *
 *   1. The word **"Illustrative example"** as a visible tag beside the caption, using the
 *      same `demos.disclaimer` string every other fake panel on the site uses.
 *   2. The whole panel is one `role="img"` with a written-out `aria-label` that opens with
 *      the word "Illustrative" — copied from `SiteMock`, and for its reason: a screen-reader
 *      user should hear one sentence saying what this is, not a fake data table read cell by
 *      cell as though it were their own numbers.
 *   3. A closing note that says out loud there is no business, no client and no result.
 *   4. No currency figure anywhere. Counts only — the currency sweep in `content.test.ts`
 *      fails the build on any figure the pricing config did not produce, and a dollar amount
 *      here would be a revenue claim in a panel about performance.
 *   5. No percentage. A percentage in an illustrative panel is read as a statistic.
 *
 * ## Why the example month goes the wrong way
 *
 * Because a sample report whose line always rises is an advertisement with a disclaimer on
 * it, and every reader has seen one. The number falls, the reason is given, the reason is
 * outside the website, and two of the three changes are marked too new to judge. That is
 * the month a buyer actually wants to know how a provider behaves in — and demonstrating it
 * costs nothing, because the promise being sold is measurement rather than improvement.
 *
 * Do not "fix" the numbers. See rule 2 in `content/offer.ts` → `websiteReport`.
 * ============================================================================
 */
export function ReportExample() {
  const { example } = websiteReport;

  /*
   * The whole panel, as one sentence, for assistive technology.
   *
   * Built here rather than in the content layer because it is a description of the
   * *rendering*, not copy — the same reason `SiteMock.describe()` lives in its component.
   *
   * ## It reads the lists out, and the first version did not
   *
   * `role="img"` replaces everything inside with this string, so anything the string omits is
   * simply not available to a screen-reader user. The first version ended "it lists three
   * changes made that month and three things being looked at next" — a *count* of content the
   * listener could then never reach, which is worse than not mentioning it: it tells them
   * something is there and withholds it.
   *
   * The items are read in full now. That makes the label long, and long is the correct trade
   * here: the panel's entire persuasive content is those two lists plus the paragraph that
   * explains the number, and a sighted reader gets all of it.
   */
  const label = [
    `Illustrative example of a ${websiteReport.name}.`,
    `${example.metricLabel}: ${example.metricValue} in ${example.monthLabel.toLowerCase()},`,
    `against ${example.previousValue} ${example.previousLabel.toLowerCase()}`,
    `and ${example.baselineValue} ${example.baselineLabel.toLowerCase()}.`,
    `${example.readingLabel}: ${example.reading}`,
    `${example.changedLabel}: ${example.changed.join('; ')}.`,
    `${example.nextLabel}: ${example.next.join('; ')}.`,
  ].join(' ');

  return (
    <figure className={styles['figure']}>
      <div className={styles['card']} role="img" aria-label={label}>
        {/* The tag pattern every illustrative panel on this site uses. */}
        <p className={styles['head']}>
          <span className={styles['month']}>{example.monthLabel}</span>
          <span className={styles['tag']}>{example.label}</span>
        </p>

        {/*
         * The figure, and the two it is read against.
         *
         * `--text-2xl` bold ink rather than a display size in the accent colour, matching
         * every other figure on the site. The rule is stated in `Evidence.tsx`: a statistic
         * set like a billboard is how a page signals that it is selling.
         */}
        <p className={styles['metricLabel']}>{example.metricLabel}</p>
        <p className={styles['metric']}>{example.metricValue}</p>

        <dl className={styles['against']}>
          <div className={styles['againstItem']}>
            <dt className={styles['againstLabel']}>{example.previousLabel}</dt>
            <dd className={styles['againstValue']}>{example.previousValue}</dd>
          </div>
          <div className={styles['againstItem']}>
            <dt className={styles['againstLabel']}>{example.baselineLabel}</dt>
            <dd className={styles['againstValue']}>{example.baselineValue}</dd>
          </div>
        </dl>

        {/* The paragraph that makes it a report rather than a dashboard. */}
        <p className={styles['readingLabel']}>{example.readingLabel}</p>
        <p className={styles['reading']}>{example.reading}</p>

        <div className={styles['lists']}>
          <div>
            <p className={styles['listLabel']}>{example.changedLabel}</p>
            <ul className={styles['list']}>
              {example.changed.map((item) => (
                <li key={item} className={styles['listItem']}>
                  <Icon name="check" size={15} className={styles['listMarker']} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className={styles['listLabel']}>{example.nextLabel}</p>
            <ul className={styles['list']}>
              {example.next.map((item) => (
                <li key={item} className={styles['listItem']}>
                  <Icon name="arrow-right" size={15} className={styles['listMarkerNext']} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <figcaption className={styles['caption']}>
        <strong className={styles['captionLead']}>{example.caption}.</strong> {example.note}
      </figcaption>
    </figure>
  );
}
