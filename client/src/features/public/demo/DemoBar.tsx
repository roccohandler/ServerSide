import { Link } from 'react-router-dom';
import { routes, sections } from '../../../config/routes';
import { primaryCta } from '../../../content';
import { track } from '../../../lib/analytics';
import type { DemoSlug } from '../../../config/demos';
import styles from './Demo.module.css';

export interface DemoBarProps {
  readonly slug: DemoSlug;
  /** The fictional business the bar is disclosing. Named, so the disclosure is specific. */
  readonly businessName: string;
}

/**
 * The disclosure, pinned above every demonstration route.
 *
 * ## Why it is persistent rather than dismissible
 *
 * Because the page underneath it is a fabricated business, on the domain of a business
 * whose entire positioning is that it fabricates nothing. A disclosure somebody can close
 * is a disclosure that is absent from every screenshot taken after they closed it, and a
 * screenshot is how a page like this actually travels.
 *
 * It is also the only way out. A visitor who lands on `/demo/hvac` from a pasted link is
 * inside a website with a nav that never leaves it — without this bar their only exit is
 * the browser's back button, which on a first landing goes nowhere.
 *
 * ## Why the second link is the assessment rather than the pricing
 *
 * Somebody who has just clicked through a demo they like is at the highest intent this
 * site ever sees, and the site's primary action is a free assessment rather than a
 * purchase — see `site.cta.primary`. Sending them to a price from inside a demo would be
 * asking for the decision two steps early.
 *
 * The event carries the demo it was clicked from, because "which trade's demo produces
 * enquiries" is the only question five demos exist to answer.
 */
export function DemoBar({ slug, businessName }: DemoBarProps) {
  return (
    <div className={styles['bar']}>
      <div className={styles['barInner']}>
        <p className={styles['barText']}>
          <span className={styles['barTag']}>Demonstration</span>
          <span>
            <strong>{businessName}</strong> is not a real business. This is an example site built to
            show an approach — nothing on it is a customer, a review or a credential.
          </span>
        </p>

        <div className={styles['barActions']}>
          <Link
            to={routes.portfolio}
            className={styles['barLink']}
            onClick={() => track('cta_clicked', { location: `demo-${slug}-back` })}
          >
            Back to examples
          </Link>

          <Link
            to={`${routes.contact}#${sections.request}`}
            className={styles['barCta']}
            onClick={() => track('cta_clicked', { location: `demo-${slug}-cta` })}
          >
            {primaryCta.label}
          </Link>
        </div>
      </div>
    </div>
  );
}
