import { Link, useOutletContext } from 'react-router-dom';
import { demoPath } from '../../../config/demos';
import { Icon } from '@jobforge/ui';
import type { DemoOutletContext } from './DemoLayout';
import { DemoAmbient, DemoPicture } from './DemoMedia';
import styles from './Demo.module.css';

/**
 * The fictional business's homepage.
 *
 * Built to the standard this site sells rather than to a template: what they fix, where
 * they work, and one obvious action, all above the fold. The order is not decoration — it
 * is the first four steps of `conversion.journey`, which is the argument the whole site
 * makes, applied to somebody else's business so a prospect can see it rather than read
 * about it.
 *
 * ## Two heroes, chosen by the trade
 *
 * `home.heroLayout` splits the set the way the research splits the customers
 * (`docs/DEMO-QUALITY-UPGRADE.md` §3): the emergency trades keep copy-first `split`
 * heroes where the call action dominates and the photograph supports; the considered
 * purchases (roofing, landscaping) go `immersive` — the photograph full-bleed behind a
 * scrim, with the quote action first and the phone second, because that customer is
 * researching rather than reacting. Same reason the urgent strip renders only where a
 * trade has urgent work: the template follows the trade.
 *
 * The hero image is each page's LCP element, so it is the one eager,
 * `fetchpriority="high"` image on the page. Everything below the fold lazy-loads.
 */
export function DemoHomePage() {
  const { site, slug } = useOutletContext<DemoOutletContext>();
  const { home, services, media } = site;
  const urgent = services.items.filter((service) => service.urgent);

  const callPill = (
    <p className={styles['heroCall']}>
      <Icon name="phone" size={18} />
      <span>
        {home.primaryAction} {site.business.phone}
      </span>
    </p>
  );

  const points = (
    <ul className={styles['heroPoints']}>
      {home.points.map((point) => (
        <li key={point} className={styles['heroPoint']}>
          <Icon name="check" size={16} />
          <span>{point}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      {home.heroLayout === 'immersive' ? (
        <section className={styles['heroImmersive']}>
          <div className={styles['heroBackdrop']} aria-hidden="true">
            <DemoPicture image={media.hero} sizes="100vw" eager />
          </div>

          <div className={styles['heroImmersiveInner']}>
            <p className={styles['heroImmersiveEyebrow']}>{home.eyebrow}</p>
            <h1 className={styles['heroImmersiveHeading']}>{home.heading}</h1>
            <p className={styles['heroImmersiveSub']}>{home.subheading}</p>

            <div className={styles['heroActions']}>
              {/*
               * The considered-purchase weighting: the quote path is the button, the
               * phone is the companion. The reverse of the split hero, on purpose.
               */}
              <Link to={demoPath(slug, 'contact')} className={styles['heroImmersiveCta']}>
                {home.secondaryAction}
                <Icon name="arrow-right" size={16} />
              </Link>
              {callPill}
            </div>

            {points}
          </div>
        </section>
      ) : (
        <section className={styles['hero']}>
          <div className={styles['heroInner']}>
            <div className={styles['heroCopy']}>
              <p className={styles['heroEyebrow']}>{home.eyebrow}</p>
              <h1 className={styles['heroHeading']}>{home.heading}</h1>
              <p className={styles['heroSub']}>{home.subheading}</p>

              <div className={styles['heroActions']}>
                {/*
                 * The primary action is the phone, not the form, on every trade whose
                 * customers are calling rather than browsing. It is styled as a button
                 * and does nothing: a live `tel:` on a fictional number sends a misdial
                 * to whoever really holds it.
                 */}
                {callPill}

                <Link to={demoPath(slug, 'contact')} className={styles['heroSecondary']}>
                  {home.secondaryAction}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </div>

              {points}
            </div>

            <div className={styles['heroArt']}>
              <DemoPicture
                image={media.hero}
                sizes="(min-width: 64rem) 32rem, calc(100vw - 2rem)"
                eager
                className={styles['heroPhoto']}
              />
            </div>
          </div>
        </section>
      )}

      {urgent.length > 0 ? (
        <section className={styles['urgent']}>
          <div className={styles['sectionInner']}>
            <h2 className={styles['urgentHeading']}>Need someone today?</h2>
            <ul className={styles['urgentList']}>
              {urgent.map((service) => (
                <li key={service.id} className={styles['urgentItem']}>
                  <Icon name="bolt" size={16} />
                  <span>{service.name}</span>
                </li>
              ))}
            </ul>
            <p className={styles['urgentCall']}>
              Call {site.business.phone} — {site.business.hours[0]?.time ?? ''}
            </p>
          </div>
        </section>
      ) : null}

      <section className={styles['section']}>
        <div className={styles['sectionInner']}>
          <h2 className={styles['sectionHeading']}>{home.servicesHeading}</h2>
          <p className={styles['sectionLede']}>{home.servicesLede}</p>

          <ul className={styles['cards']}>
            {services.items.slice(0, 6).map((service) => (
              <li key={service.id} className={styles['card']}>
                <span className={styles['cardIcon']}>
                  <Icon name={service.icon} size={22} />
                </span>
                <h3 className={styles['cardTitle']}>{service.name}</h3>
                <p className={styles['cardBody']}>{service.summary}</p>
              </li>
            ))}
          </ul>

          <Link to={demoPath(slug, 'services')} className={styles['sectionLink']}>
            See everything we do
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>

      {/*
       * The finished-work strip. Licensed photography of the *kind* of work — the
       * heading copy never claims a job, a customer or a neighbourhood, because there
       * are none. Aspect-locked slots, so four images and three lay out without shift.
       */}
      <section className={styles['sectionAlt']}>
        <div className={styles['sectionInner']}>
          <h2 className={styles['sectionHeading']}>{home.galleryHeading}</h2>
          <p className={styles['sectionLede']}>{home.galleryLede}</p>

          <ul className={styles['gallery']}>
            {media.gallery.map((image) => (
              <li key={image.src} className={styles['galleryItem']}>
                <DemoPicture
                  image={image}
                  sizes="(min-width: 64rem) 24rem, (min-width: 48rem) 50vw, calc(100vw - 2rem)"
                  className={styles['galleryPhoto']}
                />
              </li>
            ))}
          </ul>
        </div>
      </section>

      {media.ambient ? <DemoAmbient video={media.ambient} /> : null}

      <section className={styles['section']}>
        <div className={styles['sectionInner']}>
          <h2 className={styles['sectionHeading']}>{home.areaHeading}</h2>
          <p className={styles['sectionLede']}>{home.areaLede}</p>

          <ul className={styles['areas']}>
            {site.business.serviceAreas.map((area) => (
              <li key={area} className={styles['area']}>
                <Icon name="map-pin" size={16} />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={styles['closing']}>
        <div className={styles['closingInner']}>
          <div>
            <h2 className={styles['closingHeading']}>{home.closingHeading}</h2>
            <p className={styles['closingBody']}>{home.closingBody}</p>

            <div className={styles['closingActions']}>
              <Link to={demoPath(slug, 'contact')} className={styles['closingCta']}>
                {home.secondaryAction}
              </Link>
              <p className={styles['closingCall']}>or call {site.business.phone}</p>
            </div>
          </div>

          <div className={styles['closingArt']}>
            <DemoPicture
              image={media.closing}
              sizes="(min-width: 64rem) 26rem, calc(100vw - 2rem)"
              className={styles['closingPhoto']}
            />
          </div>
        </div>
      </section>
    </>
  );
}
