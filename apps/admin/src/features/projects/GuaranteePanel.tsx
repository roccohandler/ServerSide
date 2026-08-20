import { useState } from 'react';
import { Button, TextField } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { applyGuaranteeCredit } from '../../lib/endpoints';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * THE PROMISE THAT HAD NO BUTTON
 * ============================================================================
 *
 * The published terms say a Growth Partner client who does not get a substantive reply within
 * 24 business hours has that month's fee "waived in full and applied **without you having to
 * request it**".
 *
 * The first half was true — the promise is published and the service that applies it exists.
 * The second half was true only if the owner remembered, from a terminal, using
 * `BILLING_ADMIN_TOKEN` and curl. A remedy that costs the person who owes it a shell session
 * is a remedy that gets applied when somebody complains, which is precisely the arrangement
 * the words "without you having to request it" rule out.
 *
 * ## Why there is no automatic version, and why that is not a cop-out
 *
 * Whether a reply was *substantive* inside the window is a judgement no timestamp can make —
 * the terms define a qualifying response as "acknowledgement plus an answer, a next step, or a
 * statement of what is needed to proceed", and they exclude delays waiting on the client,
 * third-party outages and out-of-scope work. A rule that awarded credits from message
 * timestamps would be wrong in both directions on a promise about fairness.
 *
 * So the judgement stays with a person and the *administration* stops being the obstacle. The
 * console flags the risk elsewhere — a message awaiting a team reply past the window is what
 * the inbox is already sorted by — and this is the button.
 *
 * ## A credit, never a refund
 *
 * The server hard-codes the remedy. DECISION 019 keeps anything that moves money *out* —
 * refunds, cancellations, payment statuses — on the token surface, because those are
 * irreversible and a mis-click on a page holding several customers' projects is a different
 * kind of accident from a mis-typed curl command. A credit sits on the customer's Stripe
 * balance and is absorbed by the next invoice.
 *
 * Idempotent per project-month, which is what lets this be one press rather than a
 * confirmation dialog — and a confirmation in front of a remedy is a reason not to apply it.
 * ============================================================================
 */

export interface GuaranteePanelProps {
  readonly project: AdminProjectView;
  /** Refetch the page. Same contract as the other panels here. */
  readonly onApplied: () => void;
}

/**
 * The current month as `YYYY-MM`, which is the shape the server takes and the same key the
 * monthly report uses.
 *
 * Built from local parts rather than from `toISOString().slice(0, 7)`: an ISO string is UTC,
 * so on the first evening of a month in Seattle that would return the month that has just
 * ended — crediting the wrong one, on the operation whose entire subject is which month.
 */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function GuaranteePanel({ project, onApplied }: GuaranteePanelProps) {
  const [month, setMonth] = useState(currentMonth);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [applied, setApplied] = useState<string | null>(null);

  /*
   * Offered only while there is a subscription to credit. The remedy is a month's Growth
   * Partner fee, so on a project with no plan there is nothing to waive — and a button that
   * produces a server error is worse than a button that is not there.
   */
  if (project.subscriptionStatus === 'none') return null;

  async function apply() {
    setPending(true);
    setProblem(null);
    setApplied(null);

    const result = await applyGuaranteeCredit(project.id, month);

    setPending(false);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    onApplied();
    setApplied(
      `Credited ${result.data.credit.month}. It is on their billing page and comes off their next invoice — they were not asked to request it.`,
    );
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Response guarantee</h2>
      <p className={styles['muted']}>
        If a qualifying request did not get a qualifying response inside 24 business hours, the
        terms waive that month&rsquo;s fee — and say it is applied without the client asking. This
        is that. It credits their next invoice; applying the same month twice does nothing.
      </p>

      <div className={styles['inlineForm']}>
        <TextField
          id="guarantee-month"
          label="Which month"
          hint="YYYY-MM. The month the guarantee was missed in, not the month you are crediting."
          value={month}
          disabled={pending}
          onChange={(event) => setMonth(event.target.value)}
        />

        <div className={styles['formActions']}>
          <Button loading={pending} disabled={pending} onClick={() => void apply()}>
            Waive that month
          </Button>
        </div>
      </div>

      {problem ? <Notice tone="problem">{problem}</Notice> : null}
      {applied ? <Notice tone="success">{applied}</Notice> : null}
    </div>
  );
}
