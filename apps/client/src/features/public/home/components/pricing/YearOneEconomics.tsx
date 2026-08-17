import { pricing } from '../../../../../content';
import { headingTags, type BlockLevel } from './headingTags';
import own from './YearOneEconomics.module.css';
import offer from '../../Offer.module.css';

/**
 * The two year-one totals and the question they raise, in one row.
 *
 * "Why isn't the website just $299 a month?" is the question a reader asks *while* looking
 * at those two figures, so it is set beside them rather than after them.
 */
export function YearOneEconomics({ blockLevel }: { readonly blockLevel: BlockLevel }) {
  const { Heading } = headingTags(blockLevel);
  const { yearOne, whyNotMonthly } = pricing;

  return (
    <div className={own['yearOneRow']}>
      <div className={own['yearOne']}>
        <Heading className={offer['blockHeading']}>{yearOne.heading}</Heading>
        <p className={offer['blockLede']}>{yearOne.lede}</p>

        <div className={offer['yearOnePaths']}>
          <div className={own['yearOnePath']}>
            <p className={own['yearOnePathLabel']}>{yearOne.websiteOnly.label}</p>
            <p className={own['yearOneFigure']}>{yearOne.websiteOnly.figure}</p>
            <p className={own['yearOneNote']}>{yearOne.websiteOnly.note}</p>
          </div>

          <div className={own['yearOnePath']}>
            <p className={own['yearOnePathLabel']}>{yearOne.withPartner.label}</p>
            <p className={own['yearOneFigure']}>{yearOne.withPartner.figure}</p>
            <p className={own['yearOneBreakdown']}>{yearOne.withPartner.breakdown}</p>
            <p className={own['yearOneNote']}>{yearOne.withPartner.note}</p>
          </div>
        </div>
      </div>

      {/* The question under the structure, beside the figures that provoke it. */}
      <div className={own['whyNot']}>
        <Heading className={own['whyNotQuestion']}>{whyNotMonthly.question}</Heading>
        <p className={own['whyNotAnswer']}>{whyNotMonthly.answer}</p>
      </div>
    </div>
  );
}
