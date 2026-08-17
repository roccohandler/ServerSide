import { control, guarantee, launchStandard, responseGuarantee, site } from '../../../../content';
import { Container, Section, SectionHeading } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import { Reveal } from '@jobforge/ui';
import { useInViewOnce } from '../../../../hooks/useInViewOnce';
import { track } from '../../../../lib/analytics';
import { isPlaceholder } from '../../../../lib/placeholders';
import styles from './GuaranteeSection.module.css';
import offer from '../Offer.module.css';
import valueStyles from '../Value.module.css';
import { cx } from '@jobforge/ui';

const HEADING_ID = 'guarantee-heading';
const CONTROL_HEADING_ID = 'control-heading';
const LAUNCH_STANDARD_HEADING_ID = 'launch-standard-heading';
const RESPONSE_HEADING_ID = 'response-guarantee-heading';

/**
 * Risk reversal, scoped to what is actually controllable.
 *
 * The section deliberately says out loud what is *not* guaranteed before it says what
 * is. To a business owner who has been promised rankings by somebody else, that is the
 * more persuasive half — and it is the only version that is still true in six months.
 *
 * The response guarantee is the one promise here with money attached, so it gets the
 * strongest visual treatment on the page and its own disclosure immediately underneath.
 * Putting the limits next to the promise rather than in a footnote is what makes it
 * readable as a commitment rather than as a sales line.
 */
export function GuaranteeSection() {
  // How many readers reach the risk-reversal block at all. If they never get here, the
  // guarantee is not the reason they did or did not buy.
  const watchGuarantee = useInViewOnce(() => track('guarantee_viewed'));

  return (
    <Section tone="muted" labelledBy={HEADING_ID}>
      <Container>
        <SectionHeading
          id={HEADING_ID}
          eyebrow={guarantee.eyebrow}
          title={guarantee.heading}
          lede={guarantee.lede}
        />

        <ul className={styles['guaranteeList']}>
          {guarantee.items.map((item) => (
            <Reveal as="li" key={item.id} className={styles['guaranteeItem']}>
              <span className={styles['guaranteeMarker']}>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <h3 className={styles['guaranteeTitle']}>{item.title}</h3>
                <p className={styles['guaranteeBody']}>{item.description}</p>
              </div>
            </Reveal>
          ))}
        </ul>

        <p className={styles['guaranteeNote']}>{guarantee.note}</p>

        {/*
         * ------------------------------------------------------------------
         * THE LAUNCH STANDARD
         * ------------------------------------------------------------------
         *
         * Inside the risk-reversal section rather than as a band of its own, because it
         * answers the same question — "what if this goes wrong" — and a fourteenth section
         * would have to earn its place against the budget in `HomePage.test.tsx`. It sits
         * above the response guarantee because it is about the project, and the response
         * guarantee is about the plan afterwards.
         *
         * Every line is a pass/fail somebody could check on their own site. That is the
         * whole design: "satisfaction guaranteed" transfers no risk, because neither party
         * can tell whether it was met.
         */}
        <div className={styles['launchStandard']}>
          <h3 id={LAUNCH_STANDARD_HEADING_ID} className={styles['launchStandardHeading']}>
            {launchStandard.heading}
          </h3>
          <p className={styles['launchStandardLede']}>{launchStandard.lede}</p>

          <ul className={styles['launchStandardList']}>
            {launchStandard.checks.map((check) => (
              <li key={check.id} className={styles['launchStandardItem']}>
                <Icon name="check" size={18} className={styles['launchStandardMarker']} />
                <div>
                  <h4 className={styles['launchStandardTitle']}>{check.title}</h4>
                  <p className={styles['launchStandardDetail']}>{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className={styles['launchStandardPromise']}>{launchStandard.promise}</p>
          {/* The limit, next to the promise. Never a footnote. */}
          <p className={styles['launchStandardLimit']}>{launchStandard.limit}</p>
        </div>

        {/*
         * The response commitment.
         *
         * `responseGuarantee.enabled` gates the whole block: this is a term with a fee
         * waiver attached, so it renders only while the business is standing behind it.
         * Switching it off removes every trace rather than leaving an orphaned promise.
         */}
        {responseGuarantee.enabled ? (
          <div className={styles['response']} ref={watchGuarantee}>
            <p className={styles['responseEyebrow']}>{responseGuarantee.eyebrow}</p>
            <h3 id={RESPONSE_HEADING_ID} className={styles['responseHeading']}>
              {responseGuarantee.heading}
            </h3>
            <p className={styles['responseLede']}>{responseGuarantee.lede}</p>

            <p className={styles['responsePromise']}>
              <Icon name="check" size={22} className={styles['responseIcon']} />
              <span>{responseGuarantee.promise}</span>
            </p>

            {/* The money. Set apart because it is the part that makes any of it a term. */}
            <p className={styles['responseRemedy']}>{responseGuarantee.remedy}</p>

            {/* Response, never resolution. This line is the whole term. */}
            <p className={styles['responseDistinction']}>{responseGuarantee.distinction}</p>

            <div className={styles['responseGrid']}>
              <div>
                <h4 className={styles['responseColumnHeading']}>
                  {responseGuarantee.qualifyingResponse.heading}
                </h4>
                <ul className={styles['responseList']}>
                  {responseGuarantee.qualifyingResponse.items.map((item) => (
                    <li key={item} className={offer['careListItem']}>
                      <Icon name="check" size={16} className={offer['careMarker']} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p className={styles['responseColumnNote']}>
                  {responseGuarantee.qualifyingResponse.note}
                </p>
              </div>

              <div>
                <h4 className={styles['responseColumnHeading']}>
                  {responseGuarantee.channelsHeading}
                </h4>
                <ul className={styles['responseList']}>
                  {responseGuarantee.channels.map((channel) => (
                    <li key={channel} className={offer['careListItem']}>
                      <Icon name="mail" size={16} className={offer['careMarker']} />
                      <span>{channel}</span>
                    </li>
                  ))}

                  {/*
                   * The real address, not "the address on this site". Somebody raising an
                   * issue under a guarantee should not have to work out which one counts.
                   */}
                  <li className={offer['careListItem']}>
                    <Icon name="mail" size={16} className={offer['careMarker']} />
                    <span>
                      {responseGuarantee.emailChannelLabel}{' '}
                      {isPlaceholder(site.contact.supportEmail) ? (
                        'the business address on this site'
                      ) : (
                        <strong>{site.contact.supportEmail}</strong>
                      )}
                    </span>
                  </li>
                </ul>
                <p className={styles['responseColumnNote']}>{responseGuarantee.channelsNote}</p>
              </div>

              <div>
                <h4 className={styles['responseColumnHeading']}>
                  {responseGuarantee.windowHeading}
                </h4>
                {/*
                 * The covered week comes from `site.contact.hours`, not from a sentence
                 * typed twice. Widening the business hours widens this commitment, and it
                 * should be impossible for the two to disagree.
                 */}
                <p className={styles['responseWindow']}>{site.contact.hours.label}</p>
                <p className={styles['responseColumnNote']}>{responseGuarantee.windowNote}</p>
              </div>
            </div>

            {/*
             * §17's disclosure. It sits inside the guarantee block on purpose: a reader
             * who has been promised leads by three other providers finds this paragraph
             * more convincing than the promise above it.
             */}
            <div className={styles['responseDisclosure']}>
              <h4 className={styles['responseDisclosureHeading']}>
                <Icon name="alert" size={18} className={styles['responseDisclosureIcon']} />
                {responseGuarantee.notGuaranteed.heading}
              </h4>
              <p className={styles['responseDisclosureBody']}>
                {responseGuarantee.notGuaranteed.body}
              </p>
            </div>

            <details className={styles['exclusions']}>
              <summary className={styles['exclusionsSummary']}>
                {responseGuarantee.exclusionsHeading}
              </summary>
              <ul className={styles['exclusionsList']}>
                {responseGuarantee.exclusions.map((exclusion) => (
                  <li key={exclusion} className={styles['exclusionsItem']}>
                    <Icon name="close" size={16} className={styles['exclusionsMarker']} />
                    <span>{exclusion}</span>
                  </li>
                ))}
              </ul>
            </details>

            <p className={styles['guaranteeNote']}>{responseGuarantee.publicNote}</p>
          </div>
        ) : null}

        {/*
         * The limitations, printed as plainly as the promises.
         *
         * This is the most persuasive block on the page precisely because it gives
         * something up: a business owner who has been promised page one by somebody else
         * recognises the difference immediately.
         */}
        <div className={valueStyles['objection']}>
          <h3 id={CONTROL_HEADING_ID} className={valueStyles['objectionHeading']}>
            {control.heading}
          </h3>
          <p className={valueStyles['objectionLede']}>{control.lede}</p>

          <div className={valueStyles['controlGrid']}>
            <div className={valueStyles['controlColumn']}>
              <h4 className={valueStyles['controlHeading']}>
                <Icon name="check" size={20} className={valueStyles['controlYes']} />
                What we control
              </h4>
              <ul className={valueStyles['controlList']}>
                {control.canControl.map((item) => (
                  <li key={item} className={valueStyles['controlItem']}>
                    <Icon name="check" size={16} className={valueStyles['controlYes']} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={cx(valueStyles['controlColumn'], valueStyles['controlColumnMuted'])}>
              <h4 className={valueStyles['controlHeading']}>
                <Icon name="close" size={20} className={valueStyles['controlNo']} />
                What nobody controls
              </h4>
              <ul className={valueStyles['controlList']}>
                {control.cannotControl.map((item) => (
                  <li key={item} className={valueStyles['controlItem']}>
                    <Icon name="close" size={16} className={valueStyles['controlNo']} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className={valueStyles['controlClosing']}>{control.closing}</p>
        </div>
      </Container>
    </Section>
  );
}
