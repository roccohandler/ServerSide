import { useState } from 'react';
import { Button, Switch, TextAreaField, TextField, formatMoney } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { sendScope } from '../../lib/endpoints';
import { formatDate } from '../../utils/formatDate';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * WRITING THE AGREEMENT DOWN
 * ============================================================================
 *
 * DECISION 040. `docs/business-offer.md` rule #35 has always said the scope is agreed in
 * writing before any payment, and until this panel existed there was nowhere in the product
 * for that agreement to live — so it lived in an email thread, and the deposit button in the
 * customer's portal was offered against nothing at all.
 *
 * ## The warning above the button is the whole design, exactly as it is on `EstimatePanel`
 *
 * Every send is a new version, and **every send withdraws any acceptance the previous one
 * had**. That is the only safe default — from inside `sendScope` an owner fixing a typo and
 * an owner adding two thousand dollars of work are indistinguishable — but from the
 * operator's side the two clicks feel completely different, and one of them re-opens an
 * agreement somebody has already signed and closes the deposit button they were about to
 * press.
 *
 * So the button's own words change, the way the estimate panel's do: `Send the scope` when
 * there is nothing to replace, `Replace and re-ask` when there is an acceptance to withdraw.
 * The rule lives on the server; this is what makes the server's behaviour predictable to the
 * person triggering it.
 *
 * ## Why the price is typed in dollars and sent in cents
 *
 * Because an operator types "4900" and everything crossing the API is cents. The conversion
 * happens once, here, on the way in — the alternative is a form that asks for cents, which is
 * how somebody eventually quotes a build at forty-nine dollars.
 * ============================================================================
 */

export interface ScopePanelProps {
  readonly project: AdminProjectView;
  /** Refetch the page. Same contract as `EstimatePanel` — see its note on why. */
  readonly onChanged: () => void;
}

/** One deliverable per line, blanks dropped. The form a person actually types a list into. */
function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export function ScopePanel({ project, onChanged }: ScopePanelProps) {
  const current = project.scope;

  const [summary, setSummary] = useState(current?.summary ?? '');
  const [lines, setLines] = useState((current?.lines ?? []).join('\n'));
  const [price, setPrice] = useState(current ? String(current.priceCents / 100) : '');
  const [notes, setNotes] = useState(current?.notes ?? '');
  const [caseStudy, setCaseStudy] = useState(current?.caseStudy ?? false);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  /*
   * Whether sending will withdraw something. Computed from the record rather than from a
   * flag, so it cannot disagree with what the server is about to do.
   */
  const willWithdraw = Boolean(current?.acceptedAt);
  const parsedPrice = Number(price);
  const priceIsUsable = price.trim() !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0;
  const parsedLines = toLines(lines);
  const canSend = summary.trim().length > 0 && parsedLines.length > 0 && priceIsUsable;

  async function send() {
    setPending(true);
    setProblem(null);
    setSaved(null);

    const result = await sendScope(project.id, {
      summary: summary.trim(),
      lines: parsedLines,
      /* Rounded, because `4900.005` is a floating-point artefact rather than a price. */
      priceCents: Math.round(parsedPrice * 100),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(caseStudy ? { caseStudy: true } : {}),
    });

    setPending(false);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    onChanged();
    setSaved(
      willWithdraw
        ? 'Sent. The previous acceptance is withdrawn and they have been emailed the new version.'
        : 'Sent, and they have been emailed. The deposit is offered once they accept it.',
    );
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Scope and price</h2>

      <p className={styles['muted']}>
        {current
          ? current.acceptedAt
            ? `Version ${current.version}, accepted by ${current.acceptedName ?? 'the client'} on ${formatDate(current.acceptedAt)}. Sent by ${current.sentBy} on ${formatDate(current.sentAt)} — ${formatMoney(current.priceCents)}.`
            : `Version ${current.version}, sent by ${current.sentBy} on ${formatDate(current.sentAt)} — ${formatMoney(current.priceCents)}. Not accepted yet, so the deposit is not offered.`
          : 'Nothing sent yet. Until a scope is sent and accepted, the deposit is not offered anywhere in their portal — which is rule #35 doing its job rather than something being broken.'}
      </p>

      <div className={styles['inlineForm']}>
        <TextField
          id="scope-summary"
          label="What we are building"
          hint="One sentence, in their terms. This is the first line they read."
          value={summary}
          disabled={pending}
          onChange={(event) => setSummary(event.target.value)}
        />

        <TextAreaField
          id="scope-lines"
          label="Deliverables"
          rows={6}
          hint="One per line. Blank lines are dropped."
          value={lines}
          disabled={pending}
          onChange={(event) => setLines(event.target.value)}
        />

        <TextField
          id="scope-price"
          label="Total price"
          type="number"
          inputMode="decimal"
          hint="In dollars. Anything other than the published build price means the deposit cannot be paid by card — send an invoice instead."
          value={price}
          disabled={pending}
          onChange={(event) => setPrice(event.target.value)}
        />

        <TextAreaField
          id="scope-notes"
          label="Anything outside the standard scope"
          optionalLabel="optional"
          rows={3}
          hint="Conditions, exclusions, anything quoted separately."
          value={notes}
          disabled={pending}
          onChange={(event) => setNotes(event.target.value)}
        />

        {/*
         * ====================================================================
         * THE CONDITION THAT MAKES THE FOUNDING PRICE TRUTHFUL
         * ====================================================================
         *
         * `config/pricing.ts` says the founding price is honest only while three things hold,
         * and the first is that a founding client *actually agrees* to the project being
         * documented as a case study — "if the business stops asking for that, the discount
         * has no condition attached and the standard price stops being the price".
         *
         * Until now that agreement lived in published terms and in somebody's memory, which
         * made the one thing keeping a discount legal under 16 CFR 233.1 the thing least
         * likely to be provable a year later. Switching this on states the condition on the
         * customer's own screen, directly above the button, and their acceptance becomes the
         * permission record: dated, named and tied to a version.
         *
         * It is not defaulted on. A standard-price project asks for nothing, and a switch that
         * quietly attached a publication right to every scope would be worse than the problem.
         * ====================================================================
         */}
        <Switch
          checked={caseStudy}
          label="Founding-client pricing"
          hint="Adds the case-study condition to what they are agreeing to, and says so on their screen. Only switch this on when the price below is the founding one."
          disabled={pending}
          onChange={setCaseStudy}
        />

        {/*
         * The warning, above the button rather than beside the result.
         *
         * An operator has to know which of the two things they are about to do *before* they
         * press it — not from the sent-mail folder afterwards, and not from a client asking
         * why the deposit button vanished.
         */}
        {willWithdraw ? (
          <Notice tone="problem">
            They have already accepted version {current?.version}. Sending replaces it, withdraws
            that acceptance, and closes the deposit button until they accept the new one.
          </Notice>
        ) : null}

        <div className={styles['formActions']}>
          <Button loading={pending} disabled={pending || !canSend} onClick={() => void send()}>
            {willWithdraw ? 'Replace and re-ask' : 'Send the scope'}
          </Button>
        </div>
      </div>

      {problem ? <Notice tone="problem">{problem}</Notice> : null}
      {saved ? <Notice tone="success">{saved}</Notice> : null}
    </div>
  );
}
