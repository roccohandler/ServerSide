import { relationship } from '../../../../../content';
import { headingTags, type BlockLevel } from './headingTags';
import styles from './Pricing.module.css';
import offer from '../../Offer.module.css';

/**
 * How the two purchases relate to each other.
 *
 * Drawn before Growth Partner is described, because "why is there a monthly fee at all" is
 * answered by the relationship rather than by the plan's contents. A reader looking at two
 * priced cards constructs that relationship themselves, and almost always constructs the
 * wrong one: a website, and then a bill to keep it switched on.
 */
export function RelationshipDiagram({ blockLevel }: { readonly blockLevel: BlockLevel }) {
  const { Heading } = headingTags(blockLevel);

  return (
    <div className={styles['relationship']}>
      <Heading className={offer['blockHeading']}>{relationship.heading}</Heading>
      <p className={offer['blockLede']}>{relationship.lede}</p>

      <ol className={styles['relationshipSteps']}>
        {relationship.steps.map((step) => (
          <li key={step.id} className={styles['relationshipStep']}>
            <p className={styles['relationshipCadence']}>{step.cadence}</p>
            <p className={styles['relationshipLabel']}>{step.label}</p>
            <p className={styles['relationshipRole']}>{step.role}</p>
          </li>
        ))}
      </ol>

      <p className={styles['relationshipClosing']}>{relationship.closing}</p>
    </div>
  );
}
