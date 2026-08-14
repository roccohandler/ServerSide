import {
  management,
  managementCategories,
  monthlyLifecycle,
  notJustMaintenance,
  whyMonthly,
} from '../../../../content';
import { sections } from '../../../../config/routes';
import { Card, Container, Grid, Section, SectionHeading } from '../../../../components/ui/Layout';
import { Icon } from '../../../../components/ui/Icon';
import { Reveal } from '../../../../components/ui/Reveal';
import styles from '../Offer.module.css';

const HEADING_ID = 'management-heading';
const WHY_HEADING_ID = 'why-monthly-heading';
const MONTH_HEADING_ID = 'monthly-lifecycle-heading';
const COMPARE_HEADING_ID = 'not-just-maintenance-heading';

/**
 * The recurring service, which is the product this business actually sells.
 *
 * Four things have to land here, in this order, because they answer the objections in
 * the order an owner raises them: what it covers, why it repeats, what a month looks
 * like, and why it is not the maintenance plan their hosting company already sells them.
 *
 * The month is drawn as a loop rather than a list on purpose — the lede says out loud
 * that not all of it happens every month, because a page that implies six work streams
 * every thirty days is writing a cheque somebody has to cash.
 */
export function ManagementSection() {
  return (
    <Section id={sections.management} tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={management.eyebrow}
          title={management.heading}
          lede={management.lede}
        />

        <Grid as="ul" columns={3}>
          {managementCategories.map((category) => (
            <Reveal as="li" key={category.id} className={styles['careItem']}>
              <Card className={styles['careCard']}>
                <span className={styles['careIcon']}>
                  <Icon name={category.icon} size={22} />
                </span>
                <h3 className={styles['careTitle']}>{category.title}</h3>
                <p className={styles['careSummary']}>{category.summary}</p>

                <ul className={styles['careList']}>
                  {category.items.map((item) => (
                    <li key={item} className={styles['careListItem']}>
                      <Icon name="check" size={16} className={styles['careMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </Reveal>
          ))}
        </Grid>

        <p className={styles['careNote']}>{management.note}</p>

        {/* ------------------------------------------------------------ why monthly */}

        <div className={styles['block']}>
          <h3 id={WHY_HEADING_ID} className={styles['blockHeading']}>
            {whyMonthly.heading}
          </h3>

          {whyMonthly.body.map((paragraph) => (
            <p key={paragraph} className={styles['blockBody']}>
              {paragraph}
            </p>
          ))}

          <p className={styles['whyClosing']}>{whyMonthly.closing}</p>
        </div>

        {/* ------------------------------------------------------------ the month */}

        <div className={styles['block']}>
          <h3 id={MONTH_HEADING_ID} className={styles['blockHeading']}>
            {monthlyLifecycle.heading}
          </h3>
          <p className={styles['blockLede']}>{monthlyLifecycle.lede}</p>

          <ol className={styles['loop']}>
            {monthlyLifecycle.steps.map((step, index) => (
              <Reveal as="li" key={step.id} sequence={index} className={styles['loopItem']}>
                <div className={styles['loopCard']}>
                  <span className={styles['loopIndex']} aria-hidden="true">
                    {index + 1}
                  </span>
                  <h4 className={styles['loopTitle']}>{step.title}</h4>
                  <p className={styles['loopBody']}>{step.description}</p>
                </div>

                <span className={styles['loopArrow']} aria-hidden="true">
                  <Icon name="arrow-right" size={18} />
                </span>
              </Reveal>
            ))}
          </ol>

          <p className={styles['loopBack']}>
            <Icon name="arrow-right" size={18} className={styles['loopBackIcon']} />
            <span>{monthlyLifecycle.loopLabel}</span>
          </p>
        </div>

        {/* --------------------------------------------------- not a maintenance plan */}

        <div className={styles['block']}>
          <h3 id={COMPARE_HEADING_ID} className={styles['blockHeading']}>
            {notJustMaintenance.heading}
          </h3>
          <p className={styles['blockLede']}>{notJustMaintenance.lede}</p>

          <div className={styles['compare']}>
            {[notJustMaintenance.maintenance, notJustMaintenance.managed].map((column, index) => (
              <div
                key={column.label}
                className={
                  index === 0
                    ? styles['compareColumn']
                    : `${styles['compareColumn']} ${styles['compareStrong']}`
                }
              >
                <h4 className={styles['compareLabel']}>{column.label}</h4>
                <ul className={styles['compareList']}>
                  {column.items.map((item) => (
                    <li key={item} className={styles['compareItem']}>
                      <Icon
                        name={index === 0 ? 'close' : 'check'}
                        size={16}
                        className={index === 0 ? styles['compareMuted'] : styles['compareMarker']}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
