import { Link } from 'react-router-dom';
import { demoPath } from '../../../config/demos';
import { routes } from '../../../config/routes';
import { Badge } from '@jobforge/ui';
import { BrowserFrame, PhoneFrame } from '../../../components/patterns/DeviceFrame';
import desktopShot from '../../../assets/portfolio/hvac.webp';
import mobileShot from '../../../assets/portfolio/hvac-mobile.webp';
import styles from './Home.module.css';
import { cx } from '@jobforge/ui';

/*
 * The product, on the first screen.
 *
 * This replaced an abstract grey-block wireframe (`HeroVisual`). The wireframe showed
 * the *shape* of what is sold; these are screenshots of an actual demonstration build,
 * captured from this repository's own output by `scripts/capture-previews.ts` — the same
 * honest-preview rule the portfolio cards follow, disclosure bar included. A visitor's
 * first glance should answer "what would I actually get", and a real page answers it
 * where a diagram of one cannot.
 *
 * Same trade-off as the wireframe it replaced: rendered only beside the hero copy on a
 * wide screen. On a phone every rem above the call to action costs conversions, so the
 * first product sighting there is the phone-framed capture in `DemoSection`. Both
 * images are `loading="lazy"`, which on the phone layout (display:none) means they are
 * never fetched at all.
 */
export function ProductShot({ className }: { readonly className?: string }) {
  return (
    <figure className={cx(styles['shot'], className)}>
      <div className={styles['shotFrames']}>
        <BrowserFrame url={demoPath('hvac')} className={styles['shotBrowser']}>
          <img
            src={desktopShot}
            alt="Screenshot of the Cascade Comfort Heating & Air demonstration homepage: a call button beside a quote request link under the headline, with the demonstration disclosure bar across the top."
            width={1200}
            height={800}
            loading="lazy"
            decoding="async"
          />
        </BrowserFrame>
        <PhoneFrame className={styles['shotPhone']}>
          <img
            src={mobileShot}
            alt="The same demonstration homepage at phone width: the call button remains on screen in a bar at the bottom of the viewport."
            width={640}
            height={1280}
            loading="lazy"
            decoding="async"
          />
        </PhoneFrame>
      </div>

      {/*
       * The disclosure, in the reader's line of sight rather than only inside the
       * screenshot pixels. The badge is the same treatment every demo rendering on the
       * site carries.
       */}
      <figcaption className={styles['shotCaption']}>
        <Badge tone="accent">Demonstration</Badge>
        <span>
          A build for a fictional heating company. <Link to={demoPath('hvac')}>Open the site</Link>{' '}
          or <Link to={routes.portfolio}>see all five examples</Link>.
        </span>
      </figcaption>
    </figure>
  );
}
