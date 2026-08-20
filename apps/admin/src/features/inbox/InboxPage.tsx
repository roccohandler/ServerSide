import { useState } from 'react';
import { Badge, Button, Card, SectionHeading, TextAreaField } from '@jobforge/ui';
import { FIELD_LIMITS } from '@jobforge/shared';
import type { ConversationSummary } from '@jobforge/shared';
import { Empty, Failure, Loading } from '../../components/State';
import { Notice } from '../../components/Notice';
import { InlineConfirm } from '../../components/InlineConfirm';
import { ShowMore } from '../../components/ShowMore';
import { useAnnounce } from '../../components/useAnnounce';
import { usePagedResource } from '../../hooks/usePagedResource';
import { useTitle } from '../../hooks/useTitle';
import { LeaveGuard } from '../../components/LeaveGuard';
import { closeConversation, fetchConversations, sendReply } from '../../lib/endpoints';
import styles from './Inbox.module.css';

/*
 * ============================================================================
 * ONE PLACE WHERE SOMEBODY IS WAITING FOR A REPLY
 * ============================================================================
 *
 * A prospect who filled in the contact form and a customer who left feedback on their
 * preview are, from the owner's side of the desk, the same job: somebody is waiting and
 * the reply comes from here. The console shows them in one list rather than in a "Leads"
 * page and a "Feedback" page, because the question the owner is actually answering when
 * they open this is "who have I not got back to?", and that question does not care which
 * table the row came from.
 *
 * ## The reply does not go to the customer's browser
 *
 * It goes to `POST /api/admin/conversations/:id/replies`, and the server decides what
 * happens next: store it, authorise it, and notify the recipient. The customer application
 * finds out the same way it finds out about everything — by asking the server. These two
 * bundles never address each other, and there is no path by which they could.
 *
 *     owner console ──POST──→ server ──→ MongoDB
 *                               │
 *                               └─→ notify ──→ customer application
 *
 * ## Two sources, deliberately not two pages
 *
 * A row is a view over a lead or over a change request on a project, and the server sends
 * a qualified id — `lead:…` or `comment:…` — saying which. This page never reads it. It
 * hands the id straight back on the reply, because *how* a reply reaches somebody is a
 * decision about the person, and the server is the only side that knows whether they have
 * a portal to receive it in. See `features/conversations` on the server.
 * ============================================================================
 */

export function InboxPage() {
  useTitle('Inbox');

  const [openId, setOpenId] = useState<string | null>(null);

  /*
   * The seventh hand-rolled loader in this repository, and the last one.
   *
   * This page kept its own `conversations`, `failure`, `hasMore` and reload token, with its
   * own `AbortController` and its own rule about not setting state after an abort — all of
   * which `useResource` already owned, and all of which the other two console lists had
   * already stopped writing. It is on `usePagedResource` now for the same reason they are,
   * plus one this page has and they do not: it is the list where being told about an
   * unreachable remainder is worst, because the remainder is people waiting for a reply.
   */
  const { data, failure, isLoading, reload, showMore, loadingMore } = usePagedResource(
    'conversations',
    fetchConversations,
  );

  const conversations: readonly ConversationSummary[] | null = data?.conversations ?? null;

  return (
    /*
     * No `Container` and no `Section`. `ConsoleLayout`'s `main` already sets the width and
     * the rhythm for every console page, and nesting a second frame inside it would make
     * this page narrower than Projects and Accounts for no reason a reader could name.
     */
    <div className={styles['page']}>
      <SectionHeading
        id="inbox-heading"
        level={1}
        title="Inbox"
        lede="Everyone waiting on a reply, oldest first."
      />

      {failure ? <Failure failure={failure} onRetry={reload} /> : null}

      {isLoading ? <Loading label="Loading the inbox" /> : null}

      {conversations?.length === 0 ? (
        <Empty
          title="Nobody is waiting"
          body="New enquiries from the website arrive here, alongside any change a client has asked for and nobody has answered."
        />
      ) : null}

      <ul className={styles['list']}>
        {(conversations ?? []).map((conversation) => (
          <li key={conversation.id}>
            <Card as="article" className={styles['row']}>
              <div className={styles['rowHead']}>
                <div>
                  <h2 className={styles['name']}>{conversation.personName}</h2>
                  <p className={styles['business']}>{conversation.businessName}</p>
                </div>
                <Badge tone={conversation.kind === 'customer' ? 'brand' : 'neutral'}>
                  {conversation.kind === 'customer' ? 'Client' : 'Prospect'}
                </Badge>
              </div>

              <p className={styles['message']}>{conversation.lastMessage}</p>

              {openId === conversation.id ? (
                <ReplyBox
                  conversationId={conversation.id}
                  recipient={conversation.personName}
                  onSent={reload}
                />
              ) : (
                <div className={styles['rowActions']}>
                  <Button variant="secondary" onClick={() => setOpenId(conversation.id)}>
                    Reply
                  </Button>
                  {/*
                   * Prospects only, and the omission for clients is the decision rather than
                   * an oversight: a change request leaves this list by being *resolved* on the
                   * project page, which also tells the client something happened. A silent
                   * close from here would be the console deciding a client's request was
                   * finished without saying so to the client.
                   *
                   * No confirmation. It is reversible in the only way that matters — the
                   * prospect is still in the database, the conversation still exists, and a
                   * reply is still possible — and putting a dialog in front of the button that
                   * tidies a list is how a list stops getting tidied.
                   */}
                  {conversation.kind === 'prospect' ? (
                    <CloseButton conversationId={conversation.id} onClosed={reload} />
                  ) : null}
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>

      {/*
       * The list is bounded, it says so, and now it offers the rest.
       *
       * The sentence used to read "There are more waiting — reply to some of these and the
       * rest appear", which was honest and was a dead end: it named a room behind a wall and
       * offered no door. `ux_completeness_plan.md` argued no control was warranted at one
       * operator and a handful of rows, and that was right about the scale and wrong about
       * the shape. Superseded — see the note at the top of `ShowMore`.
       *
       * `hasMore` still comes from the server rather than from the row count, which is what
       * makes both of `ShowMore`'s sentences true: exactly fifty people waiting used to read
       * as "there are more", and one source being cut while the other was not read as a
       * complete list.
       */}
      {conversations && conversations.length > 0 ? (
        <ShowMore
          showing={conversations.length}
          hasMore={data?.hasMore}
          busy={loadingMore}
          onShowMore={showMore}
          noun="conversations"
        />
      ) : null}
    </div>
  );
}

/**
 * Takes a prospect off the list without sending anything.
 *
 * ## Why this exists at all
 *
 * `LEAD_STATUSES` has held `'closed'` since the lead model was written and nothing had ever
 * set it — the only transition was `new → contacted`, written when a reply goes out from this
 * console. So an enquiry answered by phone, or from the owner's own mail app, or one that was
 * a supplier pitching, stayed on this list forever.
 *
 * That matters more than it sounds. This screen's whole claim is "these people are waiting on
 * a reply", and a list carrying people nobody is waiting on stops being read as a worklist —
 * which is how the ones who genuinely are waiting get missed.
 *
 * ## It says what it does and it does not pretend to send anything
 *
 * "Close without replying" rather than "Done" or "Dismiss". The operator has to be able to
 * tell this apart from the button beside it at a glance, because one of them emails a
 * prospect and the other quietly decides they will not hear from anybody.
 */
function CloseButton({
  conversationId,
  onClosed,
}: {
  readonly conversationId: string;
  readonly onClosed: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const announce = useAnnounce();

  async function close() {
    setBusy(true);
    setProblem(null);

    const result = await closeConversation(conversationId);

    setBusy(false);

    if (!result.success) {
      setProblem(result.error.message);
      return;
    }

    announce('Closed. They are off the list and nothing was sent to them.');
    onClosed();
  }

  return (
    <>
      <Button variant="ghost" loading={busy} disabled={busy} onClick={() => void close()}>
        Close without replying
      </Button>
      {problem ? <Notice tone="problem">{problem}</Notice> : null}
    </>
  );
}

/**
 * A reply, and the confirmation in front of it.
 *
 * This is the surface where replying to the wrong person is easiest: the inbox is a list of
 * people with a box under each, and every box looks the same. The confirmation names the
 * recipient, which is the only thing that distinguishes one from another — and the send
 * cannot be taken back, because `conversation.service.ts` delivers the email *before* it
 * marks the thread (DECISION 027.2, deliberately, so a failure to mark never eats a reply
 * that reached somebody).
 */
function ReplyBox({
  conversationId,
  recipient,
  onSent,
}: {
  readonly conversationId: string;
  readonly recipient: string;
  readonly onSent: () => void;
}) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const announce = useAnnounce();

  /* Half a reply to a prospect is the most annoying thing here to have to write twice. */
  const dirty = body.trim().length > 0;

  const trimmed = body.trim();
  const preview = trimmed.length > 90 ? `${trimmed.slice(0, 90)}…` : trimmed;

  async function send() {
    if (busy) return;
    setBusy(true);
    setConfirming(false);
    const result = await sendReply(conversationId, body);
    setBusy(false);

    if (result.success) {
      setBody('');
      announce(`Reply sent to ${recipient}.`);
      onSent();
      return;
    }
    setError(result.error.message);
  }

  return (
    <div className={styles['reply']}>
      <LeaveGuard dirty={dirty} />

      <TextAreaField
        id={`reply-${conversationId}`}
        label="Your reply"
        rows={4}
        maxLength={FIELD_LIMITS.comment.body}
        value={body}
        disabled={confirming}
        onChange={(event) => setBody(event.target.value)}
        {...(error ? { error } : {})}
      />

      {confirming ? (
        <InlineConfirm
          question={`Send this to ${recipient}?`}
          detail={<>It goes out as email and cannot be taken back. “{preview}”</>}
          confirmLabel="Yes, send it"
          busyLabel="Sending…"
          cancelLabel="Let me change it"
          busy={busy}
          onConfirm={() => void send()}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <Button loading={busy} disabled={trimmed.length === 0} onClick={() => setConfirming(true)}>
          Send reply
        </Button>
      )}
    </div>
  );
}
