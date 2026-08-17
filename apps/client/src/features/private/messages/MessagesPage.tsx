import { useId, useState, type FormEvent } from 'react';
import { Button, TextAreaField, useResource } from '@jobforge/ui';
import { FIELD_LIMITS, type CommentThreadView } from '@jobforge/shared';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { AppError, AppLoading } from '../../../components/patterns/AppState';
import { fetchMessages, sendMessage } from './messagesApi';
import styles from './Messages.module.css';

/*
 * ============================================================================
 * `/app/messages` — HOW A CLIENT REACHES A HUMAN
 * ============================================================================
 *
 * Feedback threads live on a project, which answers every question a customer has *while a
 * website is being built* and none of the ones they have before or after. Somebody who has
 * signed up and not yet bought, or whose site went live eight months ago and who now wants a
 * second one, had exactly one route to the owner: the public contact form — which files them
 * as a **prospect**, in a list of strangers, alongside people who have never paid anybody
 * anything. That is the wrong list, and it is the list somebody works through by cold-calling.
 *
 * ## There is no empty state, and that is the design
 *
 * Every other screen in the portal shows `AppEmpty` when it has nothing, because on those
 * screens nothing is a *condition* — no reports yet, no project yet — and the useful thing to
 * say is what will fill it and when.
 *
 * Here, nothing is the **starting position**, and it is the position most people will be in
 * the first time they arrive. A card saying "No messages yet" above a box for writing one is
 * a screen reporting on itself. So the composer is the page, permanently, with the sentence
 * that answers the question somebody actually has before typing into an empty box: does a
 * person read this, and how long will they take.
 *
 * ## The composer is at the top
 *
 * Same reasoning as `FeedbackThread`: somebody arriving here has a thing they want to say,
 * and making them scroll past the history to find the box is friction at the wrong moment.
 * ============================================================================
 */

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Thread({
  thread,
  busy,
  onReply,
}: {
  readonly thread: CommentThreadView;
  readonly busy: boolean;
  onReply(body: string, parentId: string): void;
}) {
  const prefix = useId();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || body.trim().length === 0) return;

    onReply(body.trim(), thread.id);
    setBody('');
    setOpen(false);
  }

  return (
    <li className={styles['thread']}>
      <div className={styles['threadHead']}>
        <span className={styles['threadAuthor']}>{thread.authorName}</span>
        <time className={styles['threadTime']} dateTime={thread.createdAt}>
          {formatTime(thread.createdAt)}
        </time>
      </div>

      <p className={styles['threadBody']}>{thread.body}</p>

      {thread.replies.length > 0 ? (
        <ol className={styles['replies']}>
          {thread.replies.map((reply) => (
            <li key={reply.id} className={styles['reply']}>
              <div className={styles['threadHead']}>
                <span className={styles['threadAuthor']}>
                  {reply.authorName}
                  {reply.authorRole === 'team' ? ' (JobForge)' : ''}
                </span>
                <time className={styles['threadTime']} dateTime={reply.createdAt}>
                  {formatTime(reply.createdAt)}
                </time>
              </div>
              <p className={styles['threadBody']}>{reply.body}</p>
            </li>
          ))}
        </ol>
      ) : null}

      {open ? (
        <form className={styles['composer']} onSubmit={submit}>
          <TextAreaField
            id={`${prefix}-reply`}
            label="Your reply"
            rows={3}
            maxLength={FIELD_LIMITS.comment.body}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
          <div className={styles['actions']}>
            <Button type="submit" loading={busy} disabled={body.trim().length === 0}>
              Send reply
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} loading={busy}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            setOpen(true);
            setBody('');
          }}
          disabled={busy}
          aria-label={`Add to the conversation with ${thread.authorName}`}
        >
          Add to this
        </Button>
      )}
    </li>
  );
}

export function MessagesPage() {
  useDocumentMeta({
    path: routes.appMessages,
    title: 'Messages',
    description: 'Ask us anything, whether or not a website is being built right now.',
  });

  const prefix = useId();
  const { data, failure, isLoading, isMutating, reload, mutate } = useResource(
    'messages',
    fetchMessages,
  );
  const [body, setBody] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isMutating || body.trim().length === 0) return;

    /*
     * `mutate` resolves to the failure, or null when it worked, and refetches either way —
     * so nothing here reconciles a list. The one thing this call site owns is clearing the
     * box, and it does that only once the send has been accepted: a box emptied
     * optimistically is a message somebody has to retype.
     */
    void mutate(() => sendMessage(body.trim())).then((problem) => {
      if (!problem) setBody('');
    });
  }

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your messages" />;

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Messages</h1>

      <p className={styles['intro']}>
        Anything at all — a question about your plan, a second business you want a website for, or
        something that is not working. This reaches the person who builds the sites, not a support
        queue, and you will hear back within one working day.
      </p>

      <section className={styles['panel']} aria-labelledby={`${prefix}-compose`}>
        <h2 className="visually-hidden" id={`${prefix}-compose`}>
          Write to us
        </h2>

        <form className={styles['composer']} onSubmit={submit}>
          <TextAreaField
            id={`${prefix}-body`}
            label="What would you like to ask?"
            rows={4}
            maxLength={FIELD_LIMITS.comment.body}
            value={body}
            placeholder="I run a second business and I am wondering what a site for it would cost."
            onChange={(event) => setBody(event.target.value)}
          />
          <Button type="submit" loading={isMutating} disabled={body.trim().length === 0}>
            {isMutating ? 'Sending…' : 'Send'}
          </Button>
        </form>

        {data.messages.length > 0 ? (
          <ol className={styles['threads']}>
            {data.messages.map((thread) => (
              <Thread
                key={thread.id}
                thread={thread}
                busy={isMutating}
                onReply={(replyBody, parentId) => {
                  void mutate(() => sendMessage(replyBody, parentId));
                }}
              />
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
