import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useDocumentMeta } from '../../hooks/useDocumentMeta';
import { Button } from '../../components/ui/Button';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { AppError, AppLoading } from '../private/components/AppState';
import {
  PROJECT_MILESTONES,
  TASK_KINDS,
  type ApiResult,
  type ProjectMilestone,
  type TaskKind,
} from '../../types/api';
import {
  addAdminReply,
  addAdminTask,
  fetchAdminProject,
  resolveAdminComment,
  setAdminMilestone,
  setAdminUrls,
} from './api/adminApi';
import { useAdminResource } from './useAdminResource';
import styles from './Admin.module.css';

/*
 * ============================================================================
 * ONE PROJECT, AND THE FOUR THINGS AN OPERATOR DOES TO IT
 * ============================================================================
 *
 * Move the milestone, set a URL, add a task, reply to feedback. Those are the four operations
 * `/api/admin` exposes, and this page is those four with the project's state around them.
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
 * ============================================================================
 */

export function AdminProjectPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();

  /** The message from the last rejected operation. Cleared when the next one starts. */
  const [problem, setProblem] = useState<string | null>(null);

  useDocumentMeta({ path: '/admin', title: 'Internal — project', description: '' });

  /*
   * Wrapped in `useCallback` because `useAdminResource` has it in an effect's dependency list —
   * an inline arrow would be a new function every render and refetch forever.
   */
  const fetch = useCallback(
    (signal?: AbortSignal) => fetchAdminProject(projectId, signal),
    [projectId],
  );

  const { data, failure, isLoading, isMutating, reload, mutate } = useAdminResource(
    projectId,
    fetch,
  );

  /**
   * Runs one mutation and surfaces the server's own message if it was refused.
   *
   * The refetch is `mutate`'s job, not this one's — which is what makes "every mutation
   * re-reads" true by construction rather than by remembering.
   */
  const run = useCallback(
    async (operation: () => Promise<ApiResult<unknown>>) => {
      setProblem(null);
      const rejected = await mutate(operation);
      /*
       * The server's message, verbatim. Every `AppError` message in this codebase is written
       * for a person to read — "a task would have nobody to appear for" is more useful than
       * anything this component could invent from an error code.
       */
      if (rejected) setProblem(rejected.error.message);
    },
    [mutate],
  );

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading project" />;

  const { project, tasks, feedback, deployments, activity } = data;
  const busy = isMutating;

  return (
    <div className={styles['detail']}>
      <div className={styles['panel']}>
        <p className={styles['back']}>
          <Link to={routes.admin}>← All projects</Link>
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
      </div>

      {/*
       * One place for every rejected operation, at the top of the operations column rather than
       * beside whichever control caused it. On a surface where four forms post to four
       * endpoints, a message that appears in one of four places is a message that gets missed.
       */}
      {problem ? (
        <p className={styles['problem']} role="alert">
          {problem}
        </p>
      ) : null}

      {/* ------------------------------------------------------------ milestone */}

      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Milestone</h2>
        <p className={styles['muted']}>
          What the customer&rsquo;s dashboard says, and which step of eight it shows. The server
          decides what a change writes to their history.
        </p>

        <SelectField
          id="admin-milestone"
          label="Current milestone"
          value={project.milestone}
          disabled={busy}
          options={PROJECT_MILESTONES.map((milestone) => ({
            value: milestone,
            label: milestone,
          }))}
          onChange={(event) => {
            const next = event.target.value as ProjectMilestone;
            if (next === project.milestone) return;
            void run(() => setAdminMilestone(projectId, next));
          }}
        />
      </div>

      {/* ------------------------------------------------------------ urls */}

      <UrlForm
        busy={busy}
        previewUrl={project.previewUrl}
        productionUrl={project.productionUrl}
        onSubmit={(input) => void run(() => setAdminUrls(projectId, input))}
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
                <span className={styles['rowSub']}>
                  {deployment.at.slice(0, 16).replace('T', ' ')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

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
          onSubmit={(input) => void run(() => addAdminTask(projectId, input))}
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
                  {thread.authorName} ({thread.authorRole}) ·{' '}
                  {thread.createdAt.slice(0, 16).replace('T', ' ')}
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
                  resolved={thread.resolved}
                  onReply={(body) =>
                    void run(() => addAdminReply(projectId, { body, parentId: thread.id }))
                  }
                  onResolve={() => void run(() => resolveAdminComment(projectId, thread.id))}
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
                {entry.type} · {entry.at.slice(0, 16).replace('T', ' ')}
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
        id="admin-preview-url"
        label="Preview URL"
        type="url"
        optionalLabel="optional"
        value={preview}
        disabled={busy}
        onChange={(event) => setPreview(event.target.value)}
      />
      <TextField
        id="admin-production-url"
        label="Production URL"
        type="url"
        optionalLabel="optional"
        value={production}
        disabled={busy}
        onChange={(event) => setProduction(event.target.value)}
      />

      <Button type="submit" variant="secondary" disabled={busy}>
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
        id="admin-task-kind"
        label="Kind"
        value={kind}
        disabled={busy || disabled}
        options={TASK_KINDS.map((value) => ({ value, label: value }))}
        onChange={(event) => setKind(event.target.value as TaskKind)}
      />
      <TextField
        id="admin-task-title"
        label="Title"
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
        id="admin-task-description"
        label="Description"
        hint="The customer reads this on their dashboard as what they need to do."
        rows={2}
        value={description}
        required
        disabled={busy || disabled}
        onChange={(event) => setDescription(event.target.value)}
      />

      <Button type="submit" variant="secondary" disabled={busy || disabled}>
        Add task
      </Button>
    </form>
  );
}

/* ------------------------------------------------------------------ reply form */

interface ReplyFormProps {
  readonly busy: boolean;
  readonly threadId: string;
  readonly resolved: boolean;
  readonly onReply: (body: string) => void;
  readonly onResolve: () => void;
}

function ReplyForm({ busy, threadId, resolved, onReply, onResolve }: ReplyFormProps) {
  const [body, setBody] = useState('');

  return (
    <form
      className={styles['inlineForm']}
      onSubmit={(event) => {
        event.preventDefault();
        onReply(body.trim());
        setBody('');
      }}
    >
      <TextAreaField
        /* The thread id is in the field id, so several threads on one page do not share one. */
        id={`admin-reply-${threadId}`}
        label="Reply"
        rows={2}
        value={body}
        required
        disabled={busy}
        onChange={(event) => setBody(event.target.value)}
      />

      <div className={styles['formActions']}>
        <Button type="submit" variant="secondary" disabled={busy}>
          Reply
        </Button>
        {resolved ? null : (
          <Button type="button" variant="secondary" disabled={busy} onClick={onResolve}>
            Mark resolved
          </Button>
        )}
      </div>
    </form>
  );
}
