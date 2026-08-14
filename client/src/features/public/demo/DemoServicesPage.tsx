import { Link, useOutletContext } from 'react-router-dom';
import { demoPath } from '../../../config/demos';
import { Icon } from '../../../components/ui/Icon';
import type { DemoOutletContext } from './DemoLayout';
import { DemoPicture } from './DemoMedia';
import styles from './Demo.module.css';

/**
 * The services page.
 *
 * This is the page the offer's `offerStack` calls "service pages written the way customers
 * describe the job", and it is the single most valuable page on most trade websites — the
 * one a search for "furnace not igniting" should land on. So the demo writes each service
 * the way a customer would say it rather than the way a technician would bill it, and each
 * one states what is actually done rather than adjectives about doing it.
 *
 * Every entry is a heading, so a screen-reader user can skip between services the way a
 * sighted reader skims the list — which is most of how this page is read by anybody.
 */
export function DemoServicesPage() {
  const { site, slug } = useOutletContext<DemoOutletContext>();
  const { services } = site;

  return (
    <>
      <section className={styles['pageHead']}>
        <div className={styles['sectionInner']}>
          <h1 className={styles['pageHeading']}>{services.heading}</h1>
          <p className={styles['pageLede']}>{services.lede}</p>
        </div>
      </section>

      <section className={styles['section']}>
        <div className={styles['sectionInner']}>
          <ul className={styles['serviceList']}>
            {services.items.map((service) => (
              <li key={service.id} className={styles['service']}>
                {/*
                 * A photograph of this kind of work, where one exists that genuinely
                 * depicts it. Optional by design: a service with no honest image gets
                 * its icon, not a stretch — the two dropped manifest entries are why
                 * (`docs/DEMO-QUALITY-UPGRADE.md` §7).
                 */}
                {service.image ? (
                  <div className={styles['serviceMedia']}>
                    <DemoPicture
                      image={service.image}
                      sizes="(min-width: 64rem) 36rem, calc(100vw - 4rem)"
                      className={styles['servicePhoto']}
                    />
                  </div>
                ) : null}

                <div className={styles['serviceHead']}>
                  <span className={styles['cardIcon']}>
                    <Icon name={service.icon} size={22} />
                  </span>
                  <div>
                    <h2 className={styles['serviceTitle']}>{service.name}</h2>
                    {service.urgent ? <p className={styles['serviceTag']}>Same-day work</p> : null}
                  </div>
                </div>

                <p className={styles['serviceDetail']}>{service.detail}</p>

                <ul className={styles['serviceIncludes']}>
                  {service.includes.map((item) => (
                    <li key={item} className={styles['serviceInclude']}>
                      <Icon name="check" size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          <p className={styles['sectionNote']}>{services.note}</p>
        </div>
      </section>

      <section className={styles['closing']}>
        <div className={styles['sectionInner']}>
          <h2 className={styles['closingHeading']}>Not sure which one you need?</h2>
          <p className={styles['closingBody']}>
            Describe what is happening and we will tell you what it usually turns out to be, and
            what it costs to look at.
          </p>

          <div className={styles['closingActions']}>
            <Link to={demoPath(slug, 'contact')} className={styles['closingCta']}>
              Request a quote
            </Link>
            <p className={styles['closingCall']}>or call {site.business.phone}</p>
          </div>
        </div>
      </section>
    </>
  );
}
