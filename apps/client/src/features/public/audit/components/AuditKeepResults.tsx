import { useId, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@jobforge/ui';
import { TextField } from '@jobforge/ui';
import { Container, Section } from '@jobforge/ui';
import { routes } from '../../../../config/routes';
import type { ScorecardCategory } from '../../../../types/content';
import { track } from '../../../../lib/analytics';
import { useAuth } from '../../../../session';
import { submitAssessment } from '../../../assessment';
import { saveAssessmentDraft } from '../../../assessment';
import { assessmentFromAudit } from '../../../assessment';
import type { ScoreMap } from '../../playbook/useWebsiteScore';
import styles from '../Audit.module.css';

/*
 * ============================================================================
 * KEEP MY RESULTS
 * ============================================================================
 *
 * The point in the funnel where a free thing becomes an account, and the whole reason
 * the assessment asks for one at the end rather than the beginning.
 *
 * A visitor has just answered twenty questions about their own website and been shown a
 * score. They have had the value. *Now* is when asking for an account is an exchange
 * rather than a toll — and the copy says what the account is for rather than pretending
 * it is a formality.
 *
 * ## The answers never leave the tab until somebody has an account
 *
 * `saveAssessmentDraft` writes to `sessionStorage`; the sign-up flow reads it back and
 * submits it once a session exists. Nothing anonymous is ever written to the database,
 * so there is no orphan record and no question about who may later claim it. See
 * `features/assessment/draft.ts`.
 *
 * ## Somebody already signed in skips the detour entirely
 *
 * They press the button and the assessment is filed. Sending a signed-in customer to a
 * sign-up page would be the funnel forgetting who it is talking to.
 * ============================================================================
 */

export interface AuditKeepResultsProps {
  readonly scores: ScoreMap;
  readonly categories: readonly ScorecardCategory[];
  readonly trade: string | null;
  /** Prefilled from the send step when the visitor has already typed them. */
  readonly businessName?: string;
  readonly websiteUrl?: string;
}

const HEADING_ID = 'audit-keep-heading';

export function AuditKeepResults({
  scores,
  categories,
  trade,
  businessName: initialBusinessName = '',
  websiteUrl: initialWebsiteUrl = '',
}: AuditKeepResultsProps) {
  const prefix = useId();
  const navigate = useNavigate();
  const { status } = useAuth();

  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [websiteUrl, setWebsiteUrl] = useState(initialWebsiteUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const trimmed = businessName.trim();
    if (trimmed.length === 0) {
      setError('Please tell us the name of your business so we know whose results these are.');
      return;
    }

    const submission = assessmentFromAudit({
      businessName: trimmed,
      categories,
      scores,
      ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
      ...(trade ? { trade } : {}),
    });

    if (!submission) {
      setError('Answer at least one of the questions above first.');
      return;
    }

    setError(null);

    // Signed in already: file it now, no detour.
    if (status === 'authenticated') {
      setBusy(true);
      const result = await submitAssessment(submission);
      setBusy(false);

      if (result.success) {
        setSaved(true);
        navigate(routes.appAssessment);
        return;
      }

      setError(result.error.message);
      return;
    }

    /*
     * Anonymous. The answers go into the tab and the visitor goes to sign up; the
     * credential pages submit the draft the moment a session exists — see
     * `useCredentialPage`. Saving *before* navigating matters: the two pages read the
     * draft during their first render to decide whether to show the reassurance notice.
     *
     * ======================================================================
     * WHY THIS STILL GOES TO `/signup` AND NOT TO `/get-my-assessment`
     * ======================================================================
     *
     * The conversion audit flagged this as a defect: `/get-my-assessment` is where every
     * primary call to action lands (DECISION 028), it is where the funnel events fire, and
     * an audit-sourced account was invisible to all of them.
     *
     * The second half of that is real and is fixed below. The first half is not, and
     * changing the route would have been the wrong repair. This button says "Create my
     * account and keep these" — it is an account offered to hold results the visitor has
     * *already been given*, not an offer of a free assessment. Landing it on a page headed
     * about a free assessment changes the subject, which is precisely the bait-and-switch
     * DECISION 031 refused when it put a plain "Create an account" door in the header
     * rather than pointing that one at the offer either.
     *
     * So the destination keeps the promise the words made, and the *path* becomes countable
     * instead. `audit-signup` is its own location, which is a better number than the one the
     * report asked for: it separates "scored their own site, then made an account" from
     * "arrived on the offer page", and those are two different people.
     * ======================================================================
     */
    saveAssessmentDraft(submission);
    track('cta_clicked', { location: 'audit-signup' });
    navigate(routes.signup);
  }

  if (saved) {
    return (
      <Section labelledBy={HEADING_ID}>
        <Container narrow>
          <div className={styles['sent']} role="status">
            <h2 id={HEADING_ID} className={styles['sentHeading']}>
              Saved to your account
            </h2>
            <p className={styles['sentBody']}>Your results are on your dashboard.</p>
          </div>
        </Container>
      </Section>
    );
  }

  return (
    <Section labelledBy={HEADING_ID}>
      <Container narrow>
        <h2 id={HEADING_ID} className={styles['sentHeading']}>
          Keep these results
        </h2>

        <p className={styles['freeNote']}>
          {status === 'authenticated'
            ? 'Save this assessment to your account and it will be waiting on your dashboard, with the recommendations in full.'
            : 'Create an account and your score, your weakest areas and what to do about them are kept for you. Nothing is charged, and you can come back to them whenever you like.'}
        </p>

        {error ? (
          <div className={styles['alert']} role="alert">
            <p>{error}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} noValidate className={styles['sendForm']}>
          <TextField
            id={`${prefix}-business`}
            label="Which business is this for?"
            autoComplete="organization"
            required
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
          />
          <TextField
            id={`${prefix}-website`}
            label="Web address"
            optionalLabel="optional"
            placeholder="cascadeheating.example"
            autoComplete="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
          />

          <Button type="submit" size="lg" loading={busy}>
            {busy
              ? 'Saving…'
              : status === 'authenticated'
                ? 'Save to my dashboard'
                : 'Create my account and keep these'}
          </Button>
        </form>

        <p className={styles['consent']}>
          {status === 'authenticated'
            ? 'Your answers are stored against your account and nowhere else.'
            : 'Your answers stay in this browser until you create an account. If you close this tab first, nothing is stored anywhere.'}
        </p>
      </Container>
    </Section>
  );
}
