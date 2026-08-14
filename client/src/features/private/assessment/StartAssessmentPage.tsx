import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { TextField } from '../../../components/ui/Field';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure } from '../../../types/api';
import { submitAssessment } from '../../assessment/api/assessmentApi';
import { assessmentFromAudit } from '../../assessment/fromAudit';
import { useAudit } from '../../public/audit/useAudit';
import { AuditScorecard } from '../../public/audit/sections/AuditScorecard';
import { useAuth } from '../../auth/useAuth';
import styles from './StartAssessment.module.css';

/*
 * ============================================================================
 * `/app/assessment/start` — THE ASSESSMENT, INSIDE THE WORKSPACE
 * ============================================================================
 *
 * This page exists because of a specific failure. The dashboard's "start the
 * assessment" action used to point at `/audit`, the public marketing page — so a
 * signed-in customer pressed a button on their own dashboard and landed on a page
 * selling them a website they had already bought, with the workspace navigation gone
 * and no obvious way back.
 *
 * The questions are identical: `AuditScorecard` and `useAudit` are shared with the
 * public page, so the two surfaces cannot drift into scoring the same website
 * differently. What is different is everything around them — no hero, no pricing, no
 * call to action, and the workspace header still on screen.
 *
 * The answers are also stored differently, and that is the second reason this is not a
 * redirect. Anonymously the answers go into `sessionStorage` and wait for an account;
 * here there already is one, so pressing save files them against it immediately. No
 * draft, no hand-off, no detour.
 * ============================================================================
 */

const HEADING_ID = 'start-assessment-heading';

export function StartAssessmentPage() {
  useDocumentMeta({
    path: routes.appAssessmentStart,
    title: 'Score your website',
    description:
      'Twenty questions about your website, and the things most likely costing you work.',
  });

  const navigate = useNavigate();
  const { user } = useAuth();
  const state = useAudit();

  const [businessName, setBusinessName] = useState(user?.businessName ?? '');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [validation, setValidation] = useState<string | null>(null);

  async function save() {
    if (busy) return;

    const trimmed = businessName.trim();
    if (trimmed.length === 0) {
      setValidation('Please tell us the name of your business.');
      return;
    }

    const submission = assessmentFromAudit({
      businessName: trimmed,
      categories: state.categories,
      scores: state.scores,
      ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
      ...(state.trade ? { trade: state.trade } : {}),
    });

    if (!submission) {
      setValidation('Answer at least one of the questions before saving.');
      return;
    }

    setValidation(null);
    setFailure(null);
    setBusy(true);

    const result = await submitAssessment(submission);
    setBusy(false);

    if (result.success) {
      /*
       * The answers are on the account now, so the local copy would only ever be a
       * stale second version of them. `replace`, so the back button does not return
       * somebody to a form they have already submitted.
       */
      state.reset();
      navigate(routes.appAssessment, { replace: true });
      return;
    }

    setFailure(result);
  }

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        <h1 id={HEADING_ID} className={styles['title']}>
          Score your website
        </h1>
        <p className={styles['lede']}>
          Twenty quick questions. Your answers are saved as you go and stay in this browser until
          you press save, so you can leave this page and come back to it.
        </p>
      </header>

      <section className={styles['panel']}>
        <AuditScorecard state={state} headingId={HEADING_ID} />
      </section>

      <section className={styles['panel']} aria-labelledby="save-assessment">
        <h2 id="save-assessment" className={styles['panelTitle']}>
          Save this to your account
        </h2>

        {validation ? (
          <p className={styles['error']} role="alert">
            {validation}
          </p>
        ) : null}

        {failure ? (
          <p className={styles['error']} role="alert">
            {failure.error.message}
          </p>
        ) : null}

        <TextField
          id="start-assessment-business"
          label="Which business is this for?"
          autoComplete="organization"
          required
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
        />

        <TextField
          id="start-assessment-website"
          label="Web address"
          optionalLabel="optional"
          placeholder="cascadeheating.example"
          autoComplete="url"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
        />

        <div className={styles['actions']}>
          <Button size="lg" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save my results'}
          </Button>
        </div>
      </section>
    </div>
  );
}
