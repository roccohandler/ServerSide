import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, SelectField, TextAreaField, TextField, useResource } from '@jobforge/ui';
import {
  PROJECT_MILESTONES,
  TASK_KINDS,
  type ApiResult,
  type ProjectMilestone,
  type TaskKind,
  FIELD_LIMITS,
} from '@jobforge/shared';
import { routes } from '../../config/routes';
import { Failure, Loading } from '../../components/State';
import { Notice } from '../../components/Notice';
import { InlineConfirm } from '../../components/InlineConfirm';
import { useAnnounce } from '../../components/useAnnounce';
import { useTitle } from '../../hooks/useTitle';
import { LeaveGuard } from '../../components/LeaveGuard';
import { CheckoutLinkPanel } from './CheckoutLinkPanel';
import { EstimatePanel } from './EstimatePanel';
import { ScopePanel } from './ScopePanel';
import { GuaranteePanel } from './GuaranteePanel';
import { ReportsPanel } from './ReportsPanel';
import { DetailsForm } from './DetailsForm';
import { FilesPanel } from './FilesPanel';
import { OnboardingPanel } from './OnboardingPanel';
import { OwnerPanel } from './OwnerPanel';
import { formatDateTime } from '../../utils/formatDate';
import {
  addReply,
  addTask,
  fetchProject,
  resolveComment,
  setMilestone,
  setProjectOwner,
  undoMilestone,
  updateProject,
  setUrls,
} from '../../lib/endpoints';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * ONE PROJECT, AND THE FOUR THINGS AN OPERATOR DOES TO IT
 * ============================================================================
 *
 * Move the milestone, set a URL, add a task, reply to feedback. Those are the four operations
 * `/api/admin/projects/:id` exposes, and this page is those four with the project's state
 * around them.
 *
 * ## Every mutation re-reads the project rather than patching local state
 *
 * A milestone change can write activity entries, change what the customer's dashboard says and
 * alter which task is next. Merging the response into local state would mean this component
 * deciding what else changed — which is the server's job, done again in the least reliable
 * place. So each operation is followed by a reload.
 *
 * It costs a round trip and buys the guarantee that what an operator sees after acting is what
 * is actually stored. On an internal surface used by one person, that is not a trade worth
 * agonising over.
 *
 * ## Nothing here validates on the client's behalf
 *
 * The milestone select offers the eight real values because a free-text field for an enum is
 * hostile, and the task-kind select is the same. But no operation is *prevented* here: the
 * server owns whether a transition is legal and whether a project can take a task, and it
 * answers with a message written to be read. A client-side rule would be a second copy of
 * those rules, and the copy in the browser is the one nobody should trust.
 *
 * ## The feedback thread here and the inbox are the same rows
 *
 * Replying from either lands in the same place, because both go through the same server
 * feature. The inbox is the "who is waiting" view; this is the "everything about one project"
 * view. Neither is a copy of the other's logic.
 * ============================================================================
 */

export function ProjectPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  /** The message from the last rejected operation. Cleared when the next one starts. */
  const [problem, setProblem] = useState<string | null>(null);

  /** A milestone chosen in the select but not yet confirmed. See the note beside it. */
  const [pendingMilestone, setPendingMilestone] = useState<ProjectMilestone | null>(null);

  /* The details form is collapsed by default: this page is read far more often than edited. */
  const [editing, setEditing] = useState(false);

  /**
   * The last milestone change, while it is still young enough to reverse.
   *
   * Held here rather than derived from the project record, because the record has already
   * moved and does not remember what it moved *from*. Cleared once the undo is taken; the
   * server refuses anything past its own fifteen-minute window, so a stale one costs a
   * rejected request and a readable message rather than a wrong write.
   */
  const [undoable, setUndoable] = useState<{
    readonly from: ProjectMilestone;
    readonly at: Date;
  } | null>(null);

  const announce = useAnnounce();

  /*
   * Wrapped in `useCallback` because `useResource` has it in an effect's dependency list —
   * an inline arrow would be a new function every render and refetch forever.
   */
  const fetch = useCallback((signal?: AbortSignal) => fetchProject(projectId, signal), [projectId]);

  const { data, failure, isLoading, isMutating, reload, mutate } = useResource(projectId, fetch);

  /*
   * The business name, once it arrives. This is the one title in the console worth being
   * specific: an operator with three projects open has three tabs, and "Projects" on all of
   * them is the state this hook exists to fix. Before the response lands there is nothing
   * truthful to say but "Project".
   */
  useTitle(data?.project.businessName ?? 'Project');

  /**
   * Runs one mutation and surfaces the server's own message if it was refused.
   *
   * The refetch is `mutate`'s job, not this one's — which is what makes "every mutation
   * re-reads" true by construction rather than by remembering.
   */
  const run = useCallback(
    async (operation: () => Promise<ApiResult<unknown>>, succeeded: string) => {
      setProblem(null);
      const rejected = await mutate(operation);
      /*
       * The server's message, verbatim. Every `AppError` message in this codebase is written
       * for a person to read — "a task would have nobody to appear for" is more useful than
       * anything this component could invent from an error code.
       */
      if (rejected) {
        setProblem(rejected.error.message);
        return;
      }

      /*
       * And the success, out loud. Four operations on this page changed the record and said
       * nothing — the failures were announced by the problem line's `role="alert"` and the
       * successes were conveyed by the page redrawing, which is a confirmation only to
       * somebody who can see it.
       */
      announce(succeeded);
    },
    [mutate, announce],
  );

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading project" />;

  const { project, tasks, feedback, deployments, activity, files, onboarding } = data;
  const busy = isMutating;

  return (
    <div className={styles['detail']}>
      <div className={styles['panel']}>
        <p className={styles['back']}>
          <Link to={routes.projects}>← All projects</Link>
        </p>

        <h1 className={styles['heading']}>{project.businessName}</h1>

        {/* The contact details, because the reason to open this page is often to get them. */}
        <dl className={styles['facts']}>
          <div>
            <dt>Contact</dt>
            <dd>{project.contactName}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{project.email}</dd>
          </div>
          <div>
            <dt>Phone</dt>
            <dd>{project.phone ?? '—'}</dd>
          </div>
          <div>
            <dt>Account attached</dt>
            <dd>
              {project.ownerUserId ? (
                'Yes'
              ) : (
                <span className={styles['warn']}>No — tasks cannot be added</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Deposit / final</dt>
            <dd>
              {project.depositStatus} / {project.finalStatus}
            </dd>
          </div>
          <div>
            <dt>Growth Partner</dt>
            <dd>{project.subscriptionStatus}</dd>
          </div>
        </dl>

        {project.notes ? <p className={styles['notes']}>{project.notes}</p> : null}

        <div className={styles['formActions']}>
          <Button variant="secondary" onClick={() => setEditing((open) => !open)}>
            {editing ? 'Stop editing' : 'Edit details'}
          </Button>
        </div>

        {editing ? (
          <DetailsForm
            project={project}
            busy={busy}
            onSave={(changes) =>
              void run(() => updateProject(project.id, changes), 'Details saved.').then(() =>
                setEditing(false),
              )
            }
          />
        ) : null}
      </div>

      {/* ------------------------------------------------------------ account */}

      {/*
       * The fix for the dead end the "No — tasks cannot be added" warning above points at.
       *
       * That warning has been accurate and unactionable since the console was built: it names
       * the problem, the accounts list can show which accounts exist, and nothing could put
       * the two together. Attaching is a domain operation on the server — it seeds their
       * onboarding tasks, starts their history and emails them — so this panel sends an
       * address and nothing else.
       */}
      <OwnerPanel
        project={project}
        busy={busy}
        onAttach={(email) =>
          void run(() => setProjectOwner(project.id, email), 'Account attached.')
        }
        onDetach={() => void run(() => setProjectOwner(project.id, null), 'Account detached.')}
      />

      {/* ------------------------------------------------------------ payment */}

      {/*
       * Directly under the account, because the two answer the same operator's next question in
       * sequence: who is this for, and have they paid for it.
       *
       * It owns its own success and failure rather than routing through `run` and the shared
       * `problem` notice below. The reason is the 503 from `requireVerifiedPrice`: it is a long,
       * specific instruction naming a product and two amounts, and it wants to be read beside
       * the button that produced it rather than in a general-purpose slot at the top of a
       * column. The link it returns wants the same treatment for the opposite reason — nobody
       * should have to hunt up the page for the thing they just generated.
       */}
      <CheckoutLinkPanel project={project} />

      {/* ----------------------------------------------------------- schedule */}

      {/*
       * The date the client keeps asking for. Below the money because that is the order of the
       * conversation — what is this, who is it for, is it paid, when is it done.
       *
       * It owns its own notices for the same reason `CheckoutLinkPanel` does: the message that
       * matters here is *whether saving sent an email*, and that has to be read beside the
       * button rather than in the shared slot below.
       */}
      <EstimatePanel project={project} onChanged={reload} />

      {/* ------------------------------------------------------------- scope */}

      {/*
       * The written agreement. DECISION 040.
       *
       * It owns its own notices for the same reason the two panels above do — the message that
       * matters is *what sending is about to withdraw*, and that has to be read beside the
       * button rather than in the shared slot below.
       */}
      <ScopePanel project={project} onChanged={reload} />

      {/* ------------------------------------------------------ the guarantee */}

      {/*
       * Renders nothing on a project with no plan — see the panel. The remedy is a month of
       * Growth Partner, so there is nothing to waive, and a control that can only produce an
       * error is worse than an absent one.
       */}
      <GuaranteePanel project={project} onApplied={reload} />

      {/* ------------------------------------------------------------ reports */}

      <ReportsPanel project={project} />

      {/*
       * One place for every rejected operation, at the top of the operations column rather than
       * beside whichever control caused it. On a surface where four forms post to four
       * endpoints, a message that appears in one of four places is a message that gets missed.
       */}
      {problem ? <Notice tone="problem">{problem}</Notice> : null}

      {/* ------------------------------------------------------------ milestone */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Milestone</h2>
        <p className={styles['muted']}>
          What the customer&rsquo;s dashboard says, and which step of eight it shows. The server
          decides what a change writes to their history.
        </p>

        {/*
         * The select proposes; the confirmation decides.
         *
         * `onChange` used to fire the request directly, which made a scroll wheel over a
         * focused `<select>` — an ordinary mis-input, not an exotic one — enough to rewrite
         * what a customer's dashboard says and write an activity entry saying the operator
         * did it deliberately. The select now sets a *pending* value and nothing is sent
         * until the question below is answered.
         */}
        <SelectField
          id="milestone"
          label="Current milestone"
          value={pendingMilestone ?? project.milestone}
          disabled={busy}
          options={PROJECT_MILESTONES.map((milestone) => ({ value: milestone, label: milestone }))}
          onChange={(event) => {
            const next = event.target.value as ProjectMilestone;
            setPendingMilestone(next === project.milestone ? null : next);
          }}
        />

        {pendingMilestone ? (
          <InlineConfirm
            question={`Move this to “${pendingMilestone}”?`}
            detail="The customer's dashboard changes immediately and this is recorded against you in the project's history."
            confirmLabel="Yes, move it"
            busyLabel="Moving…"
            cancelLabel="Leave it"
            busy={busy}
            onConfirm={() => {
              const next = pendingMilestone;
              const from = project.milestone;
              setPendingMilestone(null);
              void run(() => setMilestone(projectId, next), `Milestone moved to ${next}.`).then(
                () => setUndoable({ from, at: new Date() }),
              );
            }}
            onCancel={() => setPendingMilestone(null)}
          />
        ) : null}

        {/*
         * The undo, offered only after a change and only for as long as the server will
         * accept one.
         *
         * The confirmation above stops a scroll wheel; this is for the case an operator
         * confirms and *then* realises they were on the wrong project's tab, which on a
         * surface holding several customers is the mistake that actually happens. Past
         * fifteen minutes the server refuses — the customer has almost certainly seen the
         * change by then, and putting it back is a second change rather than a correction.
         */}
        {undoable ? (
          <Notice tone="info">
            Moved to {project.milestone}.{' '}
            <button
              type="button"
              className={styles['undo']}
              onClick={() => {
                const { from, at } = undoable;
                setUndoable(null);
                void run(
                  () => undoMilestone(projectId, from, at),
                  `Milestone put back to ${from}.`,
                );
              }}
            >
              Undo
            </button>
          </Notice>
        ) : null}
      </div>

      {/* ------------------------------------------------------------ urls */}

      <UrlForm
        busy={busy}
        previewUrl={project.previewUrl}
        productionUrl={project.productionUrl}
        onSubmit={(input) => void run(() => setUrls(projectId, input), 'URLs saved.')}
      />

      {/* ------------------------------------------------------------ deployments */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Deployments</h2>
        {deployments.length === 0 ? (
          <p className={styles['muted']}>
            None recorded. Either the provider webhook is not configured or nothing has deployed —
            the URL fields above are the manual path.
          </p>
        ) : (
          <ul className={styles['list']}>
            {deployments.map((deployment) => (
              <li key={deployment.id}>
                <strong>{deployment.environment}</strong> — {deployment.state}
                {deployment.url ? ` — ${deployment.url}` : ''}
                {/*
                 * Formatted, not sliced. `.slice(0, 16).replace('T', ' ')` printed the UTC
                 * clock as though it were the reader's — seven hours out in Seattle, and a
                 * deployment at 16:45 rendered as 23:45. See `utils/formatDate.ts`.
                 */}
                <span className={styles['rowSub']}>{formatDateTime(deployment.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------ brief */}

      {/*
       * The welcome-form answers, on the same screen as the project they describe.
       *
       * This is the data the website is actually made from — services, service areas, existing
       * accounts, competitors, what they want people to do — and it has been arriving by email
       * since the feature was written, appearing on no screen at all. An operator building a
       * site had the milestone, the tasks and the payment status here and went to an inbox for
       * the brief.
       *
       * Directly under the project rather than at the bottom, because it is what somebody
       * opens this page to read on the day the build starts.
       */}
      <OnboardingPanel onboarding={onboarding} />

      {/* ------------------------------------------------------------ files */}

      {/*
       * Above Tasks on purpose: two of the seeded onboarding tasks are requests for files, so
       * "did the logo arrive?" is answered here and the task list below it is then just
       * bookkeeping. Reversing them would make the operator scroll past the question to reach
       * the answer.
       */}
      <FilesPanel projectId={project.id} files={files} onChanged={reload} />

      {/* ------------------------------------------------------------ tasks */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Tasks</h2>
        <p className={styles['muted']}>
          These appear on the customer&rsquo;s dashboard as the thing they have to do next.
        </p>

        {tasks.length > 0 ? (
          <ul className={styles['list']}>
            {tasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong> — {task.status}
                <span className={styles['rowSub']}>{task.kind}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles['muted']}>No tasks.</p>
        )}

        <TaskForm
          busy={busy}
          disabled={!project.ownerUserId}
          onSubmit={(input) =>
            void run(
              () => addTask(projectId, input),
              'Task added. The customer sees it on their dashboard.',
            )
          }
        />
      </div>

      {/* ------------------------------------------------------------ feedback */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Feedback</h2>
        <p className={styles['muted']}>
          The customer sees every reply here. There is no internal-note field — if it should not
          reach them, it does not belong in this thread.
        </p>

        {feedback.length === 0 ? (
          <p className={styles['muted']}>Nothing yet.</p>
        ) : (
          <ul className={styles['threads']}>
            {feedback.map((thread) => (
              <li key={thread.id} className={styles['thread']}>
                <p className={styles['threadBody']}>{thread.body}</p>
                <p className={styles['rowSub']}>
                  {thread.authorName} ({thread.authorRole}) · {formatDateTime(thread.createdAt)}
                  {thread.resolved ? ' · resolved' : ''}
                </p>

                {thread.replies.map((reply) => (
                  <div key={reply.id} className={styles['reply']}>
                    <p>{reply.body}</p>
                    <p className={styles['rowSub']}>
                      {reply.authorName} ({reply.authorRole})
                    </p>
                  </div>
                ))}

                <ReplyForm
                  busy={busy}
                  threadId={thread.id}
                  recipient={thread.authorName}
                  resolved={thread.resolved}
                  onReply={(body) =>
                    void run(
                      () => addReply(projectId, { body, parentId: thread.id }),
                      'Reply sent.',
                    )
                  }
                  onResolve={() =>
                    void run(() => resolveComment(projectId, thread.id), 'Marked resolved.')
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------------ activity */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Activity</h2>
        <p className={styles['muted']}>
          Including the internal entries the customer never sees. This is the audit trail.
        </p>

        <ul className={styles['list']}>
          {activity.map((entry) => (
            <li key={entry.id}>
              {entry.summary}
              <span className={styles['rowSub']}>
                {entry.type} · {formatDateTime(entry.at)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ url form */

interface UrlFormProps {
  readonly busy: boolean;
  readonly previewUrl?: string;
  readonly productionUrl?: string;
  readonly onSubmit: (input: {
    readonly previewUrl?: string;
    readonly productionUrl?: string;
  }) => void;
}

/**
 * The manual URL path, for a site hosted somewhere the deployment webhook cannot see.
 *
 * Both fields are optional and the server rejects the request when both are empty, which is why
 * this sends only the ones that have a value: submitting `{ previewUrl: '' }` would ask the
 * server to store an empty string as a URL.
 */
function UrlForm({ busy, previewUrl, productionUrl, onSubmit }: UrlFormProps) {
  const [preview, setPreview] = useState(previewUrl ?? '');
  const [production, setProduction] = useState(productionUrl ?? '');

  return (
    <form
      className={styles['panel']}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          ...(preview.trim() ? { previewUrl: preview.trim() } : {}),
          ...(production.trim() ? { productionUrl: production.trim() } : {}),
        });
      }}
    >
      <h2 className={styles['subheading']}>URLs</h2>
      <p className={styles['muted']}>
        Normally set by the deployment webhook. This is the manual path for anything it cannot see.
      </p>

      <TextField
        id="preview-url"
        label="Preview URL"
        type="url"
        optionalLabel="optional"
        value={preview}
        disabled={busy}
        onChange={(event) => setPreview(event.target.value)}
      />
      <TextField
        id="production-url"
        label="Production URL"
        type="url"
        optionalLabel="optional"
        value={production}
        disabled={busy}
        onChange={(event) => setProduction(event.target.value)}
      />

      <Button type="submit" variant="secondary" loading={busy}>
        Save URLs
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ task form */

interface TaskFormProps {
  readonly busy: boolean;
  /** True when the project has no account attached, so the server would refuse. */
  readonly disabled: boolean;
  readonly onSubmit: (input: {
    readonly kind: TaskKind;
    readonly title: string;
    /** Required by the server, so required here. See the note on the field. */
    readonly description: string;
  }) => void;
}

function TaskForm({ busy, disabled, onSubmit }: TaskFormProps) {
  const [kind, setKind] = useState<TaskKind>('custom');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  /* A task typed and not yet added is worth a warning before it is walked away from. */
  const dirty = title.trim().length > 0 || description.trim().length > 0;

  return (
    <form
      className={styles['inlineForm']}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ kind, title: title.trim(), description: description.trim() });
        setTitle('');
        setDescription('');
      }}
    >
      <LeaveGuard dirty={dirty} />
      <h3 className={styles['formHeading']}>Add a task</h3>

      {/*
       * Disabled with the reason stated, rather than hidden. The operator needs to know *why*
       * they cannot add a task here — the fix is attaching an account, and a control that has
       * silently vanished does not say that.
       */}
      {disabled ? (
        <p className={styles['warn']}>
          This project has no customer account attached, so a task would have nobody to appear for.
          Attach an account first.
        </p>
      ) : null}

      <SelectField
        id="task-kind"
        label="Kind"
        value={kind}
        disabled={busy || disabled}
        options={TASK_KINDS.map((value) => ({ value, label: value }))}
        onChange={(event) => setKind(event.target.value as TaskKind)}
      />
      <TextField
        id="task-title"
        label="Title"
        maxLength={FIELD_LIMITS.task.title}
        value={title}
        required
        disabled={busy || disabled}
        onChange={(event) => setTitle(event.target.value)}
      />
      {/*
       * Required, because the server requires it — `addTaskSchema` has
       * `description: z.string().trim().min(1)`. The first version of this form labelled it
       * optional and sent it only when non-empty, so submitting without one produced "Please
       * check the highlighted fields" and no indication of which field. A form that offers a
       * field the server insists on is a form that fails for a reason nobody can see.
       *
       * And it is the right requirement: this text is what the customer reads on their
       * dashboard as the thing they have to do. A task with a title and nothing else is an
       * instruction with no instructions in it.
       */}
      <TextAreaField
        id="task-description"
        label="Description"
        hint="The customer reads this on their dashboard as what they need to do."
        rows={2}
        maxLength={FIELD_LIMITS.task.description}
        value={description}
        required
        disabled={busy || disabled}
        onChange={(event) => setDescription(event.target.value)}
      />

      <Button type="submit" variant="secondary" loading={busy} disabled={disabled}>
        Add task
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ reply form */

interface ReplyFormProps {
  readonly busy: boolean;
  readonly threadId: string;
  /** Who the reply goes to, so the confirmation can name them rather than say "the customer". */
  readonly recipient: string;
  readonly resolved: boolean;
  readonly onReply: (body: string) => void;
  readonly onResolve: () => void;
}

/**
 * A reply, and the one confirmation on this page that is not about a record.
 *
 * ## Why sending gets a confirmation when adding a task does not
 *
 * Everything else here writes to the database, and a database can be corrected. This leaves
 * the building: `conversation.service.ts` sends the email and *then* marks the thread —
 * DECISION 027.2, deliberately, so a failure to mark never eats a reply that was delivered.
 * The consequence is that there is nothing to undo and never will be.
 *
 * The confirmation names the recipient and shows the first line back, because the mistake
 * that actually happens on a surface holding five customers' projects is not a typo. It is
 * replying to the wrong thread.
 */
function ReplyForm({ busy, threadId, recipient, resolved, onReply, onResolve }: ReplyFormProps) {
  const [body, setBody] = useState('');
  const [confirming, setConfirming] = useState(false);

  /* Half a reply to a customer is the most annoying thing here to have to write twice. */
  const dirty = body.trim().length > 0;

  const trimmed = body.trim();
  /* Enough to recognise which reply this is, without reproducing the whole thing. */
  const preview = trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;

  return (
    <form
      className={styles['inlineForm']}
      onSubmit={(event) => {
        event.preventDefault();
        if (trimmed.length === 0) return;
        setConfirming(true);
      }}
    >
      <LeaveGuard dirty={dirty} />

      <TextAreaField
        /* The thread id is in the field id, so several threads on one page do not share one. */
        id={`reply-${threadId}`}
        label="Reply"
        rows={2}
        value={body}
        required
        disabled={busy || confirming}
        onChange={(event) => setBody(event.target.value)}
      />

      {confirming ? (
        <InlineConfirm
          question={`Send this to ${recipient}?`}
          detail={<>It goes out as email and cannot be taken back. “{preview}”</>}
          confirmLabel="Yes, send it"
          busyLabel="Sending…"
          cancelLabel="Let me change it"
          busy={busy}
          onConfirm={() => {
            onReply(trimmed);
            setBody('');
            setConfirming(false);
          }}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <div className={styles['formActions']}>
          <Button type="submit" variant="secondary" loading={busy}>
            Reply
          </Button>
          {resolved ? null : (
            <Button type="button" variant="secondary" loading={busy} onClick={onResolve}>
              Mark resolved
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
