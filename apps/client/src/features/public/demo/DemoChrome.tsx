import { NavLink, Link } from 'react-router-dom';
import { demoPath, type DemoSlug } from '../../../config/demos';
import { Icon } from '@jobforge/ui';
import type { DemoSite } from '../../../content/demos/types';
import styles from './Demo.module.css';
import { cx } from '@jobforge/ui';

/*
 * The fictional business's own header and footer.
 *
 * These are the components that have to *not* look like JobForge. Everything here
 * paints from the `--demo-*` custom properties `DemoLayout` sets, so the same markup is
 * five different businesses — which is the whole argument for one template rather than
 * five sites.
 *
 * They deliberately do not reuse `components/ui/Button` or `Layout`. Those carry this
 * site's design tokens and its shape; a demo built out of them would demonstrate that
 * every trade gets the same website, which is the opposite of what is being sold.
 */

export interface DemoChromeProps {
  readonly site: DemoSite;
  readonly slug: DemoSlug;
}

/**
 * The header.
 *
 * Tap-to-call sits in it on every page, at every width, because that is the single
 * recommendation this site makes to every trade — and a demo that describes the practice
 * without following it would be an argument against itself.
 *
 * The number is in the reserved 555-01xx range and the `tel:` link is deliberately absent:
 * a real `tel:` href on a fictional number sends a misdial to whoever holds it. The
 * element is styled as the button it would be and carries the number as text.
 */
export function DemoHeader({ site, slug }: DemoChromeProps) {
  const link = ({ isActive }: { isActive: boolean }) =>
    cx(styles['navLink'], isActive && styles['navLinkActive']);

  return (
    <header className={styles['header']}>
      <div className={styles['headerInner']}>
        <Link to={demoPath(slug)} className={styles['lockup']}>
          <span className={styles['mark']} aria-hidden="true">
            {site.business.mark}
          </span>
          <span className={styles['lockupText']}>
            <span className={styles['lockupName']}>{site.business.name}</span>
            <span className={styles['lockupTrade']}>{site.business.trade}</span>
          </span>
        </Link>

        <nav className={styles['nav']} aria-label={`${site.business.name} pages`}>
          <NavLink to={demoPath(slug)} end className={link}>
            Home
          </NavLink>
          <NavLink to={demoPath(slug, 'services')} className={link}>
            Services
          </NavLink>
          <NavLink to={demoPath(slug, 'contact')} className={link}>
            Contact
          </NavLink>
        </nav>

        {/*
         * Not an anchor, and not a `tel:` link.
         *
         * A real tel: href on a fictional number is a misdial pointed at whoever actually
         * holds it, sent from a page that says "not a real business" at the top. The
         * number is shown, styled the way the real thing would be, and does nothing —
         * which is also the honest behaviour for a demonstration.
         */}
        <p className={styles['call']}>
          <Icon name="phone" size={16} />
          <span>{site.business.phone}</span>
        </p>
      </div>
    </header>
  );
}

/** The footer: what a customer checks, and nothing that would be a claim. */
export function DemoFooter({ site, slug }: DemoChromeProps) {
  return (
    <footer className={styles['footer']}>
      <div className={styles['footerInner']}>
        <div>
          <p className={styles['footerName']}>{site.business.name}</p>
          <p className={styles['footerLine']}>{site.business.phone}</p>
          <p className={styles['footerLine']}>{site.business.email}</p>
        </div>

        <div>
          <h2 className={styles['footerHeading']}>Service area</h2>
          <p className={styles['footerLine']}>{site.business.serviceAreas.join(' · ')}</p>
        </div>

        <div>
          <h2 className={styles['footerHeading']}>Hours</h2>
          <ul className={styles['footerHours']}>
            {site.business.hours.map((entry) => (
              <li key={entry.days} className={styles['footerLine']}>
                <span>{entry.days}</span>
                <span>{entry.time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className={styles['footerHeading']}>Pages</h2>
          <ul className={styles['footerNav']}>
            <li>
              <Link to={demoPath(slug)} className={styles['footerLink']}>
                Home
              </Link>
            </li>
            <li>
              <Link to={demoPath(slug, 'services')} className={styles['footerLink']}>
                Services
              </Link>
            </li>
            <li>
              <Link to={demoPath(slug, 'contact')} className={styles['footerLink']}>
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/*
       * The disclosure again, at the bottom.
       *
       * Somebody who scrolled a whole page has been reading a fictional business for a
       * minute or two, and the bar is off screen by now. It costs one line.
       */}
      <p className={styles['footerNote']}>
        Demonstration site. {site.business.name} is not a real business, and nothing on this page is
        a customer, a review or a credential.
      </p>
    </footer>
  );
}
