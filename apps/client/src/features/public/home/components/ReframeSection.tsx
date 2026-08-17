import { Link } from 'react-router-dom';
import { audience, reframe } from '../../../../content';
import { industryPath } from '../../../../config/trades';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import styles from '../Home.module.css';

const HEADING_ID = 'reframe-heading';

/**
 * The problem, framed as something the reader can check against their own website.
 *
 * It is written this way on purpose: it is useful whether or not they ever buy, it needs
 * no statistics to back it up, and every line doubles as a description of what the
 * managed service takes responsibility for.
 */
export function ReframeSection() {
  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading id={HEADING_ID} title={reframe.heading} lede={reframe.intro} />

        <ul className={styles['needList']}>
          {reframe.needs.map((need) => (
            <Reveal as="li" key={need.id} className={styles['needItem']}>
              <span className={styles['needMarker']} aria-hidden="true">
                <Icon name="check" size={18} />
              </span>
              <div>
                <h3 className={styles['needTitle']}>{need.title}</h3>
                <p className={styles['needDetail']}>{need.detail}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <p className={styles['reframeClosing']}>{reframe.closing}</p>

        <div className={styles['audience']}>
          <h3 className={styles['audienceHeading']}>{audience.heading}</h3>
          <p className={styles['audienceBody']}>{audience.body}</p>

          {/*
           * The five trades with a page of their own are links; the other three are the
           * same chip without one. Deliberately not split into two lists — the reader is
           * scanning for their own trade, and finding it in the second group would read as
           * being told they are the lesser kind of customer.
           */}
          <ul className={styles['industries']}>
            {audience.industries.map((industry) => (
              <li key={industry.label} className={styles['industryChip']}>
                {industry.slug ? (
                  <Link to={industryPath(industry.slug)} className={styles['industryLink']}>
                    {industry.label}
                  </Link>
                ) : (
                  industry.label
                )}
              </li>
            ))}
          </ul>

          <p className={styles['industryNote']}>{audience.note}</p>
        </div>
      </Container>
    </Section>
  );
}
