import { useId, useState, type FormEvent } from 'react';
import { Button } from '@jobforge/ui';
import { TextAreaField } from '@jobforge/ui';
import { FIELD_LIMITS, type CommentThreadView } from '@jobforge/shared';
import styles from './Project.module.css';

/*
 * The change list.
 *
 * One flat list of requests, each with its own conversation. Not a chat: there is no
 * live update, no typing indicator and no read receipt, because what a customer needs
 * here is "did they see that I want the photo changed", and a timestamp answers it.
 *
 * ## The composer is at the top
 *
 * Unusual for a comment list, and deliberate. Somebody arriving on this page has just
 * looked at their preview and has a thing they want to say; making them scroll past
 * everything already said to find the box is friction at exactly the wrong moment.
 */

export interface FeedbackThreadProps {
  readonly threads: readonly CommentThreadView[];
  readonly busy: boolean;
  onSubmit(body: string, parentId?: string): void;
}

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

export function FeedbackThread({ threads, busy, onSubmit }: FeedbackThreadProps) {
  const prefix = useId();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  function submitNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || body.trim().length === 0) return;

    onSubmit(body.trim());
    setBody('');
  }

  function submitReply(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    if (busy || replyBody.trim().length === 0) return;

    onSubmit(replyBody.trim(), parentId);
    setReplyBody('');
    setReplyTo(null);
  }

  const outstanding = threads.filter((thread) => !thread.resolved);

  return (
    <section className={styles['panel']} aria-labelledby="feedback-heading">
      <h2 id="feedback-heading" className={styles['panelTitle']}>
        Feedback
      </h2>

      <p className={styles['panelBody']}>
        Tell us anything you would like changed — be as specific as you like. Everything here goes
        straight to the person building your website.
      </p>

      <form className={styles['composer']} onSubmit={submitNew}>
        <TextAreaField
          id={`${prefix}-body`}
          label="What would you like changed?"
          rows={4}
          maxLength={FIELD_LIMITS.comment.body}
          value={body}
          placeholder="Replace the photo in the services section with one of the van."
          onChange={(event) => setBody(event.target.value)}
        />
        <Button type="submit" loading={busy} disabled={body.trim().length === 0}>
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </form>

      {threads.length === 0 ? (
        /*
         * "Nothing yet." beside a compose box read as a system that had lost something. It
         * says what the absence *means* now — this is a record, everything stays, and the
         * team sees it — because the question somebody has before typing into an empty box
         * is whether anybody is at the other end of it.
         */
        <p className={styles['panelMeta']}>
          Nothing asked for yet. Anything you write here reaches us and stays on this page, so you
          and we are always looking at the same list.
        </p>
      ) : (
        <>
          <p className={styles['panelMeta']}>
            {outstanding.length === 0
              ? 'Everything you have asked for has been dealt with.'
              : `${outstanding.length} still open.`}
          </p>

          <ol className={styles['threads']}>
            {threads.map((thread) => (
              <li key={thread.id} className={styles['thread']}>
                <div className={styles['threadHead']}>
                  <span className={styles['threadAuthor']}>{thread.authorName}</span>
                  <time className={styles['threadTime']} dateTime={thread.createdAt}>
                    {formatTime(thread.createdAt)}
                  </time>
                  {thread.resolved ? <span className={styles['threadDone']}>Done</span> : null}
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

                {replyTo === thread.id ? (
                  <form
                    className={styles['composer']}
                    onSubmit={(event) => submitReply(event, thread.id)}
                  >
                    <TextAreaField
                      id={`${prefix}-reply-${thread.id}`}
                      label="Your reply"
                      rows={3}
                      maxLength={FIELD_LIMITS.comment.body}
                      value={replyBody}
                      onChange={(event) => setReplyBody(event.target.value)}
                    />
                    <div className={styles['actions']}>
                      <Button type="submit" loading={busy} disabled={replyBody.trim().length === 0}>
                        Send reply
                      </Button>
                      <Button variant="ghost" onClick={() => setReplyTo(null)} loading={busy}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setReplyTo(thread.id);
                      setReplyBody('');
                    }}
                    disabled={busy}
                    aria-label={`Reply to ${thread.authorName}`}
                  >
                    Reply
                  </Button>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
