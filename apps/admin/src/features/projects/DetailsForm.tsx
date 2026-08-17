import { useState } from 'react';
import { Button, SelectField, TextAreaField, TextField } from '@jobforge/ui';
import { PROJECT_STATUSES } from '@jobforge/shared';
import type { AdminProjectStatus, AdminProjectView } from '@jobforge/shared';
import { LeaveGuard } from '../../components/LeaveGuard';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * CORRECTING THE DESCRIPTION OF A PROJECT
 * ============================================================================
 *
 * Six fields, and what is *not* here is the point.
 *
 * **No milestone.** It has its own control on this page, with its own confirmation and its own
 * undo, because moving it rewrites what a customer's dashboard says. A milestone reachable
 * from a general-purpose edit form would be a second way to move it with none of that — and
 * the second way is the one that gets used by accident.
 *
 * **No payment statuses.** They are Stripe's, mirrored by verified webhook. A form that could
 * type "paid" into one would make this console a place where a payment can be invented.
 *
 * `status` is here and is a *commercial label* rather than a lifecycle: agreed, in build,
 * complete, cancelled. The server refuses `deposit-paid` on a project with no deposit
 * recorded, which is the one value that is a claim about money rather than a note about
 * intent — see `updateDetails` there for the reasoning, which belongs with the rule.
 *
 * ## Only what changed is sent
 *
 * A PATCH of six fields would overwrite a value another tab had just corrected. The diff is
 * computed against the record that was loaded, so a form somebody opened and left alone sends
 * nothing at all — and the server refuses an empty change rather than reporting success for a
 * write it did not make.
 * ============================================================================
 */

/*
 * The stored values, unrelabelled — the same choice the milestone select on this page makes.
 * These are short and self-explanatory, and a prettier label would be a second vocabulary for
 * a value that appears verbatim in the projects table two clicks away.
 */
const STATUS_OPTIONS = PROJECT_STATUSES.map((value) => ({ value, label: value }));

export interface DetailsFormProps {
  readonly project: AdminProjectView;
  readonly busy: boolean;
  onSave(changes: {
    readonly businessName?: string;
    readonly contactName?: string;
    readonly email?: string;
    readonly phone?: string;
    readonly notes?: string;
    readonly status?: AdminProjectStatus;
  }): void;
}

export function DetailsForm({ project, busy, onSave }: DetailsFormProps) {
  const [businessName, setBusinessName] = useState(project.businessName);
  const [contactName, setContactName] = useState(project.contactName);
  const [email, setEmail] = useState(project.email);
  const [phone, setPhone] = useState(project.phone ?? '');
  const [notes, setNotes] = useState(project.notes ?? '');
  const [status, setStatus] = useState<AdminProjectStatus>(project.status);

  /** What actually differs from what was loaded. Nothing else is sent. */
  const changes = {
    ...(businessName.trim() !== project.businessName ? { businessName: businessName.trim() } : {}),
    ...(contactName.trim() !== project.contactName ? { contactName: contactName.trim() } : {}),
    ...(email.trim() !== project.email ? { email: email.trim() } : {}),
    ...(phone.trim() !== (project.phone ?? '') ? { phone: phone.trim() } : {}),
    ...(notes.trim() !== (project.notes ?? '') ? { notes: notes.trim() } : {}),
    ...(status !== project.status ? { status } : {}),
  };

  const dirty = Object.keys(changes).length > 0;

  return (
    <div className={styles['inlineForm']}>
      {/* Typed notes are the thing on this page most annoying to lose to a stray gesture. */}
      <LeaveGuard dirty={dirty} />

      <TextField
        id="edit-business"
        label="Business name"
        value={businessName}
        disabled={busy}
        onChange={(event) => setBusinessName(event.target.value)}
      />
      <TextField
        id="edit-contact"
        label="Contact name"
        value={contactName}
        disabled={busy}
        onChange={(event) => setContactName(event.target.value)}
      />
      <TextField
        id="edit-email"
        type="email"
        label="Contact email"
        hint="Where we correspond about this project, and where its notifications go."
        value={email}
        disabled={busy}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        id="edit-phone"
        type="tel"
        label="Phone"
        optionalLabel="optional"
        value={phone}
        disabled={busy}
        onChange={(event) => setPhone(event.target.value)}
      />
      <TextAreaField
        id="edit-notes"
        label="Internal notes"
        optionalLabel="optional"
        hint="Never shown to the client."
        rows={4}
        value={notes}
        disabled={busy}
        onChange={(event) => setNotes(event.target.value)}
      />
      <SelectField
        id="edit-status"
        label="Commercial status"
        hint="The label on the deal, not the build. The milestone above is what the client sees."
        value={status}
        disabled={busy}
        options={STATUS_OPTIONS}
        onChange={(event) => setStatus(event.target.value as AdminProjectStatus)}
      />

      <div className={styles['formActions']}>
        <Button loading={busy} disabled={!dirty} onClick={() => onSave(changes)}>
          Save changes
        </Button>
      </div>
    </div>
  );
}
