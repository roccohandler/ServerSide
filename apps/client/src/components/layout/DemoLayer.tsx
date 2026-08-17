import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, SelectField, TextAreaField } from '@jobforge/ui';
import { InlineConfirm } from '../patterns/InlineConfirm';
import { Notice } from '../patterns/Notice';
import { useAnnounce } from '../patterns/useAnnounce';
import { DEMO_TESTERS, DEMO_TOUR } from '../../config/demo';
import { fetchDemoProjectId, resetDemo, sendDemoFeedback } from '../../lib/demoApi';
import styles from './DemoLayer.module.css';

/*
 * ============================================================================
 * THE DEMO LAYER
 * ============================================================================
 *
 * Everything a demonstration adds to the product, in one lazily-loaded component: the banner,
 * three controls, and the guided tour.
 *
 * ## It is one chunk on purpose
 *
 * `AppLayout` renders it behind `user.demo`, through a single `lazy()`. A normal customer
 * therefore downloads none of it — not the banner, not the tour data, not the feedback form —
 * and the eager budget is unchanged. Splitting the tour out again would buy nothing (it is
 * only ever reachable from a control inside the banner) and cost a second request at the one
 * moment somebody is watching.
 *
 * ## It must not move the layout out from under the product
 *
 * The banner is `position: sticky` at the top of the document flow rather than fixed over it.
 * A fixed bar covers the thing being demonstrated and, worse, covers a different part of it at
 * every viewport width — which is exactly the sort of detail a prospect notices and a demo is
 * supposed to be showing off.
 *
 * ## No `if (isDemo)` anywhere else
 *
 * The flag has four readers in the whole client: this component, the tour inside it,
 * `AppLayout`'s decision to render it, and the billing panel's simulated-payment wording.
 * Anything else wanting to branch on it is a sign the demonstration is diverging from the
 * product it exists to demonstrate.
 * ============================================================================
 */

const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: 'Something is broken' },
  { value: 'confusing', label: 'This confused me' },
  { value: 'missing', label: 'Something is missing' },
  { value: 'ux', label: 'It works but it is awkward' },
  { value: 'question', label: 'I have a question' },
  { value: 'general', label: 'Something else' },
] as const;

/**
 * Where the tour has got to, kept for this tab only.
 *
 * `sessionStorage` rather than the URL, and rather than a React state that would reset on
 * every navigation — which is a problem, because navigating is what the tour *does*. A query
 * parameter was refused for two reasons: every screenshot a tester sends back would carry
 * `?tour=3`, and a link they might forward would carry tour state to somebody with no session.
 */
const TOUR_KEY = 'jobforge.demo.tour';

function readStep(): number | null {
  try {
    const raw = sessionStorage.getItem(TOUR_KEY);
    if (raw === null) return null;
    const step = Number(raw);
    return Number.isInteger(step) && step >= 0 && step < DEMO_TOUR.length ? step : null;
  } catch {
    /* A browser with storage blocked gets a tour that does not persist. Not an error. */
    return null;
  }
}

function writeStep(step: number | null): void {
  try {
    if (step === null) sessionStorage.removeItem(TOUR_KEY);
    else sessionStorage.setItem(TOUR_KEY, String(step));
  } catch {
    /* Ignored, deliberately. See `readStep`. */
  }
}

export function DemoLayer() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const announce = useAnnounce();

  /*
   * The seeded project's id, so the three project stops land on the project rather than on
   * the list.
   *
   * Fetched here rather than threaded down from `AppLayout`, because a layout that had to
   * know about a project in order to render a banner would be a layout that knows a feature.
   * One request, once, on a screen only a demo session ever reaches — and every stop has a
   * working fallback while it is in flight, so nothing waits on it.
   */
  const [projectId, setProjectId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void fetchDemoProjectId().then((id) => {
      if (live) setProjectId(id);
    });
    return () => {
      live = false;
    };
  }, []);

  const [step, setStep] = useState<number | null>(readStep);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackBody, setFeedbackBody] = useState('');
  const [feedbackCategory, setFeedbackCategory] = useState<string>('confusing');

  const stop = step === null ? null : DEMO_TOUR[step];

  function goTo(next: number | null) {
    setStep(next);
    writeStep(next);

    if (next === null) return;

    const target = DEMO_TOUR[next];
    if (target) navigate(target.path(projectId));
  }

  async function reset() {
    setBusy(true);
    setNote(null);

    const result = await resetDemo();

    setBusy(false);
    setConfirmingReset(false);

    if (!result.success) {
      setNote(result.error.message);
      return;
    }

    announce('The demonstration has been reset.');
    /*
     * A full reload rather than a router navigation. Every screen in the workspace is holding
     * a `useResource` cache of records that no longer exist — the project has a new id, the
     * tasks are new rows — and re-fetching them one by one as somebody clicks around is a
     * sequence of confusing half-states. Reset is rare, deliberate and confirmed; a reload is
     * the honest way to make it total.
     */
    window.location.assign('/app');
  }

  async function submitFeedback() {
    if (feedbackBody.trim() === '') return;

    setBusy(true);
    const result = await sendDemoFeedback({
      body: feedbackBody,
      category: feedbackCategory,
      /* The screen they were on. The single most useful field on the record. */
      route: pathname,
    });
    setBusy(false);

    if (!result.success) {
      setNote(result.error.message);
      return;
    }

    setFeedbackBody('');
    setFeedbackOpen(false);
    setNote('Thank you — that went straight to the owner.');
    announce('Feedback sent.');
  }

  return (
    <div className={styles['banner']}>
      <div className={styles['bar']}>
        <p className={styles['label']}>
          <span className={styles['tag']}>Demo</span>
          <span>
            For testers — {DEMO_TESTERS}. Everything here is invented and no card can be charged.
          </span>
        </p>

        <div className={styles['controls']}>
          {step === null ? (
            <Button variant="secondary" onClick={() => goTo(0)}>
              Show me around
            </Button>
          ) : null}

          {confirmingReset ? (
            <InlineConfirm
              question="Put everything back the way it started?"
              confirmLabel={busy ? 'Resetting…' : 'Reset it'}
              onConfirm={() => void reset()}
              onCancel={() => setConfirmingReset(false)}
            />
          ) : (
            <Button variant="secondary" onClick={() => setConfirmingReset(true)}>
              Reset
            </Button>
          )}

          <Button variant="secondary" onClick={() => setFeedbackOpen((open) => !open)}>
            Give feedback
          </Button>
        </div>
      </div>

      {/*
       * The tour, as one extra line rather than an overlay. The product underneath is
       * untouched and fully usable while it is open — see the header.
       */}
      {stop ? (
        <div className={styles['tour']}>
          <p className={styles['tourPosition']}>
            {(step ?? 0) + 1} of {DEMO_TOUR.length}
          </p>
          <div>
            <p className={styles['tourTitle']}>{stop.title}</p>
            <p className={styles['tourBody']}>{stop.body}</p>
          </div>
          <div className={styles['controls']}>
            <Button
              variant="secondary"
              disabled={step === 0}
              onClick={() => goTo(Math.max(0, (step ?? 0) - 1))}
            >
              Back
            </Button>
            {(step ?? 0) < DEMO_TOUR.length - 1 ? (
              <Button onClick={() => goTo((step ?? 0) + 1)}>Next</Button>
            ) : (
              <Button onClick={() => goTo(null)}>Finish</Button>
            )}
            <Button variant="secondary" onClick={() => goTo(null)}>
              End the tour
            </Button>
          </div>
        </div>
      ) : null}

      {feedbackOpen ? (
        <div className={styles['feedback']}>
          {/*
           * Primitives, not a raw `<select>` and `<textarea>`. Composition rule 4 applies to
           * the demonstration exactly as it applies to everything else — and it applies here
           * with a little more force than usual, because a demo layer whose controls do not
           * look like the product's controls is a demo layer somebody mistakes for a bug.
           */}
          <SelectField
            id="demo-feedback-category"
            label="What kind of thing is it?"
            value={feedbackCategory}
            options={FEEDBACK_CATEGORIES.map((category) => ({
              value: category.value,
              label: category.label,
            }))}
            onChange={(event) => setFeedbackCategory(event.target.value)}
          />

          <TextAreaField
            id="demo-feedback-body"
            label="What happened?"
            rows={3}
            value={feedbackBody}
            onChange={(event) => setFeedbackBody(event.target.value)}
          />

          <div className={styles['controls']}>
            <Button
              loading={busy}
              disabled={busy || feedbackBody.trim() === ''}
              onClick={() => void submitFeedback()}
            >
              Send it
            </Button>
            <Button variant="secondary" onClick={() => setFeedbackOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {note ? (
        <div className={styles['note']}>
          <Notice tone="info">{note}</Notice>
        </div>
      ) : null}
    </div>
  );
}
