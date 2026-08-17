import { useRef } from 'react';
import { audit } from '../../../../content/audit';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { TextField } from '@jobforge/ui';
import { track } from '../../../../lib/analytics';
import { MAX_LEVER, type FunnelField, type FunnelInputs, type Scenario } from '../useAudit';
import styles from '../Audit.module.css';
import { cx } from '@jobforge/ui';

const HEADING_ID = 'audit-funnel-heading';
const SCENARIO_HEADING_ID = 'audit-scenario-heading';

export interface AuditFunnelProps {
  readonly funnel: FunnelInputs;
  readonly lever: number;
  readonly scenario: Scenario;
  setFunnelField(field: FunnelField, value: number | null): void;
  setLever(value: number): void;
}

/*
 * One decimal place, in the reader's own notation.
 *
 * `toFixed(1)` was the obvious spelling and it writes the decimal separator as a full stop
 * whatever the reader's locale says — so "3.9 customers" reached a German or Spanish reader
 * in a notation their own operating system does not use. `Intl` is the fix and it is not
 * preparation for anything: it is correct today, for the locale the browser is already
 * reporting, on a page that already asks the visitor for numbers in their own money.
 *
 * Constructed once. `Intl.NumberFormat` is expensive to build and free to reuse, and this
 * renders on every drag of the improvement slider.
 */
const oneDecimal = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/*
 * Rounding for display only. The stored values are whatever the visitor typed; these are
 * how they read on screen. Customers come out fractional — 40 enquiries at a 30% close
 * rate is 12, but 13 at 30% is 3.9 — and rounding that to 4 would overstate by a quarter.
 * One decimal place is honest and reads fine.
 */
function formatCount(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString() : oneDecimal.format(value);
}

/**
 * Money, grouped, with no currency symbol and no decimals.
 *
 * The symbol is omitted deliberately: `content.test.ts` fails the build on any currency
 * figure in the content layer, and while a runtime-computed number is not caught by that
 * sweep, printing one with a `$` in front of it would be the site quietly doing the exact
 * thing the guard exists to prevent — publishing a dollar figure nobody sanctioned. The
 * field asks what a job is worth in the visitor's own money and the answer is echoed in
 * the same units, unlabelled, which is also correct for anybody outside the US.
 *
 * That last sentence was true of the intent and false of the code: it passed `'en-US'`, so
 * a reader whose locale groups with full stops got American grouping on their own money.
 * No argument means the reader's locale, which is what the paragraph above always claimed.
 */
function formatValue(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Step 4 and step 5: the visitor's own numbers, and the arithmetic on them.
 *
 * ## Why the improvement is a slider the visitor moves
 *
 * This is the whole reason a revenue scenario is defensible on this site. The alternative
 * — the seller picking an improvement and showing what it would be worth — is a forecast
 * dressed as a calculator, and a business owner who has been shown one before recognises
 * it instantly. Here the visitor chooses the number, so what is on screen is arithmetic
 * on their assumption. The copy says so in as many words.
 *
 * The lever is capped at `MAX_LEVER`. Not a cap on ambition: a slider that runs to fifty
 * produces a figure large enough to read as a claim, and the honest range for "a few more
 * enquiries a month" is small.
 *
 * ## Why every field can be left unknown
 *
 * Most owners do not have these to hand, and the ones who guess badly get a worse answer
 * than the ones who leave it blank. `null` and `0` are genuinely different — no analytics
 * versus no enquiries — so a blank field suppresses the lines that depend on it rather
 * than computing with a zero.
 */
export function AuditFunnel({
  funnel,
  lever,
  scenario,
  setFunnelField,
  setLever,
}: AuditFunnelProps) {
  const entered = useRef(false);

  const handleNumber = (field: FunnelField) => (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? null : Number(trimmed);
    const value = parsed === null || !Number.isFinite(parsed) || parsed < 0 ? null : parsed;

    setFunnelField(field, value);

    if (value !== null && !entered.current) {
      entered.current = true;
      track('audit_funnel_entered');
    }
  };

  const { funnel: copy, scenario: scenarioCopy } = audit;

  return (
    <>
      <Section labelledBy={HEADING_ID}>
        <Container narrow>
          <p className={styles['stepLabel']}>{copy.stepLabel}</p>
          <SectionHeading id={HEADING_ID} title={copy.heading} lede={copy.lede} />

          <div className={styles['funnelFields']}>
            <TextField
              id="audit-visitors"
              name="visitors"
              type="number"
              inputMode="numeric"
              min={0}
              label={copy.fields.visitors.label}
              hint={copy.fields.visitors.hint}
              value={funnel.visitors === null ? '' : String(funnel.visitors)}
              onChange={(event) => handleNumber('visitors')(event.target.value)}
              placeholder={copy.unknownLabel}
            />
            <TextField
              id="audit-enquiries"
              name="enquiries"
              type="number"
              inputMode="numeric"
              min={0}
              label={copy.fields.enquiries.label}
              hint={copy.fields.enquiries.hint}
              value={funnel.enquiries === null ? '' : String(funnel.enquiries)}
              onChange={(event) => handleNumber('enquiries')(event.target.value)}
              placeholder={copy.unknownLabel}
            />
            <TextField
              id="audit-close-rate"
              name="closeRate"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              label={`${copy.fields.closeRate.label} (${copy.fields.closeRate.suffix})`}
              hint={copy.fields.closeRate.hint}
              value={funnel.closeRate === null ? '' : String(funnel.closeRate)}
              onChange={(event) => handleNumber('closeRate')(event.target.value)}
              placeholder={copy.unknownLabel}
            />
            <TextField
              id="audit-job-value"
              name="jobValue"
              type="number"
              inputMode="numeric"
              min={0}
              label={copy.fields.jobValue.label}
              hint={copy.fields.jobValue.hint}
              value={funnel.jobValue === null ? '' : String(funnel.jobValue)}
              onChange={(event) => handleNumber('jobValue')(event.target.value)}
              placeholder={copy.unknownLabel}
            />
          </div>

          {/*
           * The lever. A native range input: it is operable with a keyboard, announces
           * its value, and needs no library — which matters on a page whose own advice
           * includes being honest about whether every script earns its place.
           */}
          <div className={styles['lever']}>
            <label htmlFor="audit-lever" className={styles['leverLabel']}>
              {copy.lever.label}
            </label>
            <p className={styles['leverHint']}>{copy.lever.hint}</p>
            <div className={styles['leverRow']}>
              <input
                id="audit-lever"
                type="range"
                min={0}
                max={MAX_LEVER}
                step={1}
                value={lever}
                onChange={(event) => setLever(Number(event.target.value))}
                className={styles['leverInput']}
              />
              <output htmlFor="audit-lever" className={styles['leverValue']}>
                {lever} {copy.lever.unit}
              </output>
            </div>
          </div>
        </Container>
      </Section>

      {/* ---------------------------------------------------------- step 5: scenario */}

      <Section tone="muted" labelledBy={SCENARIO_HEADING_ID}>
        <Container narrow>
          <p className={styles['stepLabel']}>{scenarioCopy.stepLabel}</p>
          <SectionHeading
            id={SCENARIO_HEADING_ID}
            title={scenarioCopy.heading}
            lede={scenarioCopy.lede}
          />

          {!scenario.hasAnything ? (
            <div className={styles['pending']}>
              <h3 className={styles['pendingHeading']}>{scenarioCopy.emptyHeading}</h3>
              <p className={styles['pendingBody']}>{scenarioCopy.emptyBody}</p>
            </div>
          ) : (
            <div className={styles['scenarioGrid']}>
              <div className={styles['scenarioPanel']}>
                <h3 className={styles['scenarioPanelHeading']}>{scenarioCopy.currentHeading}</h3>
                <dl className={styles['scenarioList']}>
                  {scenario.enquiryRate !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.rate}</dt>
                      <dd>{oneDecimal.format(scenario.enquiryRate)}%</dd>
                    </div>
                  ) : null}
                  {scenario.customers !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.customers}</dt>
                      <dd>{formatCount(scenario.customers)}</dd>
                    </div>
                  ) : null}
                  {scenario.currentValue !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.value}</dt>
                      <dd>{formatValue(scenario.currentValue)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              <div className={cx(styles['scenarioPanel'], styles['scenarioPanelChange'])}>
                <h3 className={styles['scenarioPanelHeading']}>{scenarioCopy.changeHeading}</h3>
                <dl className={styles['scenarioList']}>
                  {scenario.additionalCustomers !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.additionalCustomers}</dt>
                      <dd>{formatCount(scenario.additionalCustomers)}</dd>
                    </div>
                  ) : null}
                  {scenario.additionalValue !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.additionalValue}</dt>
                      <dd>{formatValue(scenario.additionalValue)}</dd>
                    </div>
                  ) : null}
                  {scenario.additionalValueAnnual !== null ? (
                    <div className={styles['scenarioRow']}>
                      <dt>{scenarioCopy.labels.perYear}</dt>
                      <dd>{formatValue(scenario.additionalValueAnnual)}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </div>
          )}

          {/*
           * The disclaimer sits next to the numbers rather than at the foot of the page.
           * A caveat somebody has to scroll to find is a caveat written for the seller.
           */}
          <p className={styles['disclaimer']}>{scenarioCopy.disclaimer}</p>
          <p className={styles['disclaimerNote']}>{scenarioCopy.note}</p>

          {/*
           * The bridge into the recommendation.
           *
           * Between the reader's own economics and a suggestion to buy something there was
           * nothing at all — two related blocks with the relationship left for them to
           * construct. This states it, and states it in the one direction that is defensible:
           * the visitors above already exist and are already paid for, so the question is
           * what share of them get as far as calling. It does not claim a website produces
           * the figure; it says which link in the chain the figure is decided at.
           */}
          <div className={styles['transition']}>
            <h3 className={styles['transitionHeading']}>{scenarioCopy.transition.heading}</h3>
            <p className={styles['transitionBody']}>{scenarioCopy.transition.body}</p>
          </div>
        </Container>
      </Section>
    </>
  );
}
