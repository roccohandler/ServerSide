import { useState } from 'react';
import { Button, formatMoney } from '@jobforge/ui';
import type { ProjectView } from '@jobforge/shared';
import { InlineConfirm } from '../../../components/patterns/InlineConfirm';

import styles from './Project.module.css';

/*
 * ============================================================================
 * THE AGREED SCOPE — WHAT WAS AGREED, AND WHEN
 * ============================================================================
 *
 * DECISION 040. `docs/business-offer.md` rule #35 has always said the scope is agreed in
 * writing before any payment; until this panel existed there was nowhere for that agreement
 * to live, so it lived in an email thread or in nobody's memory.
 *
 * ## Three states, and the third is the one worth building for
 *
 *   - **Nothing sent.** Says so, plainly. This used to be an absent panel, which reads as
 *     something missing rather than as something not written yet.
 *   - **Sent, not accepted.** The document, and a button. This is the gate: until it is
 *     pressed the deposit is not offered anywhere, so the panel has to be unmistakable
 *     about being the next thing.
 *   - **Accepted.** The same document, plus who agreed and when — which is the half that
 *     matters three months later, and the reason this panel does not disappear once it has
 *     been used.
 *
 * ## Accepting gets a confirmation and there is no way to un-accept
 *
 * Both for the same reason `ApprovalPanel` confirms approving: this is the moment somebody
 * commits to a price, it is the one thing on the page that makes money payable, and a
 * mis-tap on a phone should not be able to do it.
 *
 * Withdrawing is deliberately not offered, and that is not a gap. An acceptance is a record
 * of something that happened; what supersedes it is a new version, which says so on its face
 * and which only the owner can send. A customer who has changed their mind writes to us —
 * the panel says so, and the message reaches the same person.
 * ============================================================================
 */

export interface ScopePanelProps {
  readonly project: ProjectView;
  readonly busy: boolean;
  onAccept(): void;
}

const HEADING_ID = 'scope-heading';

/** The same long-date shape the approval panel uses, with the same guard on an unparsable value. */
function formatDate(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
}

export function ScopePanel({ project, busy, onAccept }: ScopePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const scope = project.scope;

  if (!scope) {
    return (
      <section className={styles['panel']} aria-labelledby={HEADING_ID}>
        <h2 id={HEADING_ID} className={styles['panelTitle']}>
          What we are building
        </h2>
        <p className={styles['panelBody']}>
          We are still writing this up. When it is ready you will get an email, and it will be here:
          exactly what we are building, what it costs, and anything outside the standard scope.
        </p>
        <p className={styles['panelMeta']}>
          Nothing is charged before you have read it and agreed to it.
        </p>
      </section>
    );
  }

  const accepted = formatDate(scope.acceptedAt);

  return (
    <section className={styles['panel']} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={styles['panelTitle']}>
        {accepted ? 'What we agreed' : 'What we are building'}
      </h2>

      <p className={styles['panelBody']}>{scope.summary}</p>

      <ul className={styles['scopeList']}>
        {scope.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      {scope.notes ? <p className={styles['panelBody']}>{scope.notes}</p> : null}

      <p className={styles['scopePrice']}>
        <span className={styles['scopePriceLabel']}>Total</span>
        <span className={styles['scopePriceValue']}>{formatMoney(scope.priceCents)}</span>
      </p>
      <p className={styles['panelMeta']}>
        Half to begin, half on the day it goes live. Plus Washington sales tax, added at checkout.
      </p>

      {accepted ? (
        <>
          <p className={styles['panelMeta']}>
            {/*
             * The name as well as the date, because on a business account the person reading
             * this may not be the person who agreed to it — and "you accepted this" is the
             * sentence that has to be checkable rather than merely reassuring.
             */}
            Agreed by {scope.acceptedName ?? 'your business'} on {accepted}. This is version{' '}
            {scope.version}.
          </p>
          <p className={styles['panelMeta']}>
            Need something changed? Send us a message and we will write up a new version — nothing
            is settled by this that a conversation cannot change.
          </p>
        </>
      ) : (
        <>
          {/*
           * ==================================================================
           * THE CONDITION ON THE FOUNDING PRICE, STATED WHERE IT IS AGREED
           * ==================================================================
           *
           * `config/pricing.ts` is explicit that the founding price is truthful only while
           * the case-study permission is genuinely asked for. It was asked for in published
           * terms and in conversations somebody remembered, which made the one thing keeping
           * a discount legal under 16 CFR 233.1 the thing least likely to be provable later.
           *
           * So it is stated here, immediately above the button that agrees to it, and the
           * acceptance record *is* the permission record — dated, named and versioned.
           * Putting it in the terms and not on this screen would be asking somebody to agree
           * to something they were not shown.
           */}
          {scope.caseStudy ? (
            <p className={styles['panelCondition']}>
              This is founding-client pricing, and it comes with one condition: we may write up your
              project as a case study — the before, the reasoning, and what changed after launch.
              Nothing is published without your written approval of the specific material first, and
              any figures are only the ones you agree to share. Agreeing below agrees to that too.
            </p>
          ) : null}

          <p className={styles['panelMeta']}>
            Read it through. If anything is wrong or missing, tell us before you agree to it — it is
            far easier to change now than afterwards.
          </p>

          {confirming ? (
            <InlineConfirm
              question="Agree to this scope and price?"
              detail={
                scope.caseStudy
                  ? 'This is what we will build, what it will cost, and your permission to write it up as a case study. Agreeing puts the deposit on your billing page; nothing is charged until you pay it.'
                  : 'This is what we will build and what it will cost. Agreeing puts the deposit on your billing page; nothing is charged until you pay it.'
              }
              confirmLabel="Yes, this is right"
              busyLabel="Saving…"
              busy={busy}
              onConfirm={onAccept}
              onCancel={() => setConfirming(false)}
            />
          ) : (
            <div className={styles['actions']}>
              <Button onClick={() => setConfirming(true)} loading={busy}>
                Agree to this
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
