import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { findPageMeta } from '../../../content';
import { audit } from '../../../content/audit';
import { findIndustry } from '../../../content/industries';
import { playbook } from '../../../content/playbook';
import { routes } from '../../../config/routes';
import { isTradeSlug, trades } from '../../../config/trades';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { track } from '../../../lib/analytics';
import { Container, Section, SectionHeading } from '../../../components/ui/Layout';
import { ButtonLink } from '../../../components/ui/Button';
import { RadioGroupField } from '../../../components/ui/Field';
import { CtaBanner } from '../../../components/marketing/CtaBanner';
import { useAudit } from './useAudit';
import { AuditDiagnosis } from './sections/AuditDiagnosis';
import { AuditFunnel } from './sections/AuditFunnel';
import { AuditSend } from './sections/AuditSend';
import { AuditScorecard } from './sections/AuditScorecard';
import { AuditKeepResults } from './sections/AuditKeepResults';
import styles from './Audit.module.css';

const meta = findPageMeta(routes.audit);

const HERO_HEADING_ID = 'audit-hero-heading';
const TRADE_HEADING_ID = 'audit-trade-heading';
const SCORE_HEADING_ID = 'audit-score-heading';

/**
 * The Website Score — the self-serve diagnostic.
 *
 * ## Why this is a route and not a section of the PlayBook
 *
 * The PlayBook's self-assessment renders `scorecard.storageNote` — "your answers stay in
 * this browser and are never sent anywhere" — and a test asserts that sentence is on
 * screen. It is true, it should stay true, and an audit whose entire purpose is to be
 * sent cannot live underneath it. So this is a separate surface with its own storage key
 * and its own consent line, reusing the scoring rules rather than the page.
 *
 * It also frees the audit from three constraints the PlayBook page is pinned to: exactly
 * one textbox, exactly twenty `role="group"` elements, and no percentage anywhere in the
 * rendered text. The audit needs five text inputs, a trade radio group, and a percentage
 * field.
 *
 * ## Why it is one page rather than a wizard
 *
 * Because a stepped wizard hides how much work is left, and the honest answer — twenty
 * quick questions — is more persuasive than a progress bar. Everything is on one page, in
 * order, and the later steps explain themselves before they are reachable. It also means
 * a reader who only wants the diagnosis can stop after step three and still leave with
 * the useful half, which is the same bargain the PlayBook makes.
 */
export function AuditPage() {
  useDocumentMeta(meta ?? { path: routes.audit, title: 'Audit', description: '' });

  /*
   * `/audit?trade=roofing`, linked from the industry pages. Validated against the closed
   * union rather than trusted: the value arrives from a URL, which anybody can edit, and
   * an unrecognised one is simply ignored so step one is asked normally.
   */
  const [searchParams] = useSearchParams();
  const requestedTrade = searchParams.get('trade');

  const state = useAudit(isTradeSlug(requestedTrade) ? requestedTrade : null);

  const selectedTrade = trades.find((trade) => trade.slug === state.trade);
  // `undefined` for "something else", which has no page by design — see config/trades.ts.
  const selectedIndustry = state.trade ? findIndustry(state.trade) : undefined;

  /*
   * Three latches. Each of these transitions false → true exactly once per visit unless
   * the visitor resets, which is the behaviour worth counting anyway.
   */
  const startedRef = useRef(false);
  const scoredRef = useRef(false);
  const diagnosisRef = useRef(false);

  useEffect(() => {
    if (state.hasStarted && !startedRef.current) {
      startedRef.current = true;
      track('audit_started');
    }
  }, [state.hasStarted]);

  useEffect(() => {
    if (state.isComplete && !scoredRef.current) {
      scoredRef.current = true;
      track('audit_scored', { score: state.total });
    }
  }, [state.isComplete, state.total]);

  useEffect(() => {
    if (state.isComplete && state.weakest.length > 0 && !diagnosisRef.current) {
      diagnosisRef.current = true;
      track('audit_diagnosis_viewed');
    }
  }, [state.isComplete, state.weakest.length]);

  return (
    <>
      <Section labelledBy={HERO_HEADING_ID}>
        <Container narrow>
          <SectionHeading
            id={HERO_HEADING_ID}
            level={1}
            eyebrow={audit.hero.eyebrow}
            title={audit.hero.heading}
            lede={audit.hero.lede}
          />
          <p className={styles['heroSupporting']}>{audit.hero.supporting}</p>
        </Container>
      </Section>

      {/* ------------------------------------------------------------ step 1: trade */}

      <Section tone="muted" labelledBy={TRADE_HEADING_ID}>
        <Container narrow>
          <p className={styles['stepLabel']}>{audit.trade.stepLabel}</p>
          <SectionHeading
            id={TRADE_HEADING_ID}
            title={audit.trade.heading}
            lede={audit.trade.lede}
          />

          <RadioGroupField
            id="audit-trade"
            name="audit-trade"
            label={audit.trade.fieldLabel}
            hint={audit.trade.hint}
            options={trades.map((trade) => ({ value: trade.slug, label: trade.label }))}
            value={state.trade ?? ''}
            onChange={(value) => {
              // The union is closed and the options are generated from it, so anything
              // arriving here is one of them.
              state.setTrade(value as (typeof trades)[number]['slug']);
              track('audit_trade_selected', { trade: value });
            }}
          />

          {selectedTrade ? (
            <p className={styles['tradeContext']}>{selectedTrade.buyingContext}</p>
          ) : null}

          {/*
           * A link out of a form, which normally costs conversions — and is right here.
           * The reader has just told the page which of the five arguments was written for
           * them, everything they enter is kept in this browser, and coming back to a
           * half-finished audit costs them nothing.
           */}
          {selectedIndustry ? (
            <p className={styles['tradeLink']}>
              {audit.trade.pageLinkIntro}{' '}
              <Link to={selectedIndustry.path}>{selectedIndustry.heading}</Link>
            </p>
          ) : null}
        </Container>
      </Section>

      {/* -------------------------------------------------------- step 2: assessment */}

      <Section labelledBy={SCORE_HEADING_ID}>
        <Container>
          {/*
           * The questions themselves live in `AuditScorecard`, shared with the private
           * application's copy of this step. What differs between the two surfaces is
           * the frame around it — see the note in that file.
           */}
          <AuditScorecard
            state={state}
            headingId={SCORE_HEADING_ID}
            intro={
              <>
                <p className={styles['stepLabel']}>{audit.assessment.stepLabel}</p>
                <SectionHeading
                  id={SCORE_HEADING_ID}
                  title={audit.assessment.heading}
                  lede={audit.assessment.lede}
                />
              </>
            }
          />
        </Container>
      </Section>

      {/* ----------------------------------------- steps 3 to 6, each gated on the last */}

      <AuditDiagnosis
        isComplete={state.isComplete}
        band={state.band}
        weakest={state.weakest}
        trade={state.trade}
        total={state.total}
        /*
         * Two points per category, derived from the scorecard rather than typed as 40, so
         * the recommendation's thresholds survive the audit growing a twenty-first check.
         */
        outOf={playbook.scorecard.categories.length * 2}
      />

      <AuditFunnel
        funnel={state.funnel}
        lever={state.lever}
        scenario={state.scenario}
        setFunnelField={state.setFunnelField}
        setLever={state.setLever}
      />

      <AuditSend
        trade={state.trade}
        total={state.total}
        maxTotal={state.maxTotal}
        /*
         * Without these two the summary reported a running total as a final score, so
         * five categories answered at full marks was emailed as "10/40" — the same figure
         * as twenty answered badly. See `auditSummary.ts`.
         */
        answered={state.answered}
        categoryCount={state.categoryCount}
        band={state.band}
        weakest={state.weakest}
        funnel={state.funnel}
        lever={state.lever}
      />

      {/*
       * The account, asked for after the value has been given and not before.
       *
       * Only once something has actually been answered: offering to "keep these results"
       * to somebody who has answered nothing is offering to keep nothing, and it is the
       * kind of empty prompt that teaches a reader to ignore the next one. See
       * `AuditKeepResults` for why the answers stay in the tab until an account exists.
       */}
      {state.hasStarted ? (
        <AuditKeepResults scores={state.scores} categories={state.categories} trade={state.trade} />
      ) : null}

      <Section tone="muted" labelledBy="audit-closing-heading">
        <Container narrow>
          <SectionHeading id="audit-closing-heading" title={audit.closing.heading} />
          <p className={styles['closingBody']}>{audit.closing.body}</p>
          <ButtonLink to={routes.playbook} variant="secondary">
            Read the PlayBook
          </ButtonLink>
        </Container>
      </Section>

      <CtaBanner headingId="audit-cta-heading" />
    </>
  );
}
