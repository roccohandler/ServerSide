import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConversationSummary } from '@jobforge/shared';
import { InboxPage } from './InboxPage';

/*
 * ============================================================================
 * THE INBOX, FROM THE OWNER'S SIDE
 * ============================================================================
 *
 * `fetch` is stubbed rather than the api module, so every assertion here goes through the
 * real request layer — including the 204 branch, which is the whole reason the reply tests
 * exist. Stubbing `post` would have made the page pass against a client that reports a
 * successful send as a failure, which is precisely the bug that was here.
 *
 * What is deliberately not asserted: which route a reply travels by. The page hands back an
 * opaque id and the server decides between an email and a portal comment — see
 * `conversation.api.test.ts` on the server, which owns that.
 * ============================================================================
 */

const PROSPECT: ConversationSummary = {
  id: 'lead:1',
  personName: 'Dana Reyes',
  businessName: 'Cascade Heating & Air',
  kind: 'prospect',
  lastMessage: 'The phone has stopped ringing.',
  receivedAt: '2026-08-11T09:00:00.000Z',
  awaitingReply: true,
};

const CUSTOMER: ConversationSummary = {
  id: 'comment:9',
  personName: 'Ray Okonkwo',
  businessName: 'Ray Okonkwo Plumbing',
  kind: 'customer',
  lastMessage: 'Can the callout number go at the top?',
  receivedAt: '2026-08-12T09:00:00.000Z',
  awaitingReply: true,
};

/** A JSON response in the API's envelope. */
function ok(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function failed(status: number, code: string, message: string): Response {
  return new Response(JSON.stringify({ success: false, error: { code, message } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** What the reply route actually answers: no content at all. */
function noContent(): Response {
  return new Response(null, { status: 204 });
}

describe('the inbox', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows everybody waiting, labelled by which side of the desk they are on', async () => {
    fetchMock.mockResolvedValue(ok({ conversations: [PROSPECT, CUSTOMER] }));

    render(<InboxPage />);

    expect(await screen.findByText('Dana Reyes')).toBeInTheDocument();
    expect(screen.getByText('Ray Okonkwo Plumbing')).toBeInTheDocument();
    expect(screen.getByText('Prospect')).toBeInTheDocument();
    expect(screen.getByText('Client')).toBeInTheDocument();
  });

  it('says nobody is waiting rather than showing an empty page', async () => {
    fetchMock.mockResolvedValue(ok({ conversations: [] }));

    render(<InboxPage />);

    expect(await screen.findByText(/Nobody is waiting/)).toBeInTheDocument();
  });

  it('reports a failure in the server’s own words, and offers to try again', async () => {
    fetchMock.mockResolvedValue(failed(503, 'SERVICE_UNAVAILABLE', 'The database is unreachable.'));

    render(<InboxPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('The database is unreachable.');

    /* And the retry re-asks rather than reloading the page. */
    fetchMock.mockResolvedValue(ok({ conversations: [PROSPECT] }));
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByText('Dana Reyes')).toBeInTheDocument();
  });

  it('treats the reply route’s 204 as the success it is', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT] }));

    render(<InboxPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reply' }));

    await userEvent.type(screen.getByLabelText('Your reply'), 'Happy to take a look on Thursday.');

    fetchMock.mockResolvedValueOnce(noContent());
    /* The reload that follows a successful send. */
    fetchMock.mockResolvedValueOnce(ok({ conversations: [] }));

    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    /* A reply cannot be taken back, so it asks first. See ReplyBox. */
    await userEvent.click(screen.getByRole('button', { name: 'Yes, send it' }));

    /*
     * The row is gone and no error was shown. Before the 204 branch existed this rendered
     * "The server responded with 204" against a reply that had genuinely been delivered —
     * and the owner would have written it a second time.
     */
    expect(await screen.findByText(/Nobody is waiting/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('sends the conversation id back untouched', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [CUSTOMER] }));

    render(<InboxPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reply' }));
    await userEvent.type(screen.getByLabelText('Your reply'), 'Done.');

    fetchMock.mockResolvedValueOnce(noContent());
    fetchMock.mockResolvedValueOnce(ok({ conversations: [] }));
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    /* A reply cannot be taken back, so it asks first. See ReplyBox. */
    await userEvent.click(screen.getByRole('button', { name: 'Yes, send it' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));

    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    /*
     * `comment:9`, not `9` and not a source flag this bundle invented. The qualified id is
     * the server's, and a console that parsed it would be a second place that decides how
     * somebody gets replied to.
     */
    /*
     * Percent-encoded, and that is the id untouched rather than the id changed. The page
     * went through `lib/endpoints.ts` when the three console lists were put on one paging
     * hook, and that module encodes every path segment — so `comment:9` travels as
     * `comment%3A9` and Express hands the handler `comment:9` again. Asserting the encoded
     * form rather than relaxing the assertion, because "the console does not parse the id"
     * is the property worth pinning and it still holds exactly.
     */
    expect(url).toContain('/api/admin/conversations/comment%3A9/replies');
    expect(init.body).toBe(JSON.stringify({ body: 'Done.' }));
    /* The session cookie, and nothing else — no token, no header this bundle holds. */
    expect(init.credentials).toBe('include');
  });

  it('keeps the reply on screen when it could not be sent', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT] }));

    render(<InboxPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reply' }));
    await userEvent.type(screen.getByLabelText('Your reply'), 'Happy to help.');

    fetchMock.mockResolvedValueOnce(
      failed(500, 'INTERNAL_ERROR', 'Something went wrong on our end.'),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Send reply' }));
    /* A reply cannot be taken back, so it asks first. See ReplyBox. */
    await userEvent.click(screen.getByRole('button', { name: 'Yes, send it' }));

    /*
     * The words survive. Clearing the box on failure would lose what somebody had just
     * written, which is the one thing a reply box must never do.
     */
    expect(await screen.findByText('Something went wrong on our end.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your reply')).toHaveValue('Happy to help.');
  });

  /*
   * The list is bounded by the server at fifty *per source*, and it used not to say so — a
   * truncated list nobody is told about reads as a complete one, and what is being truncated
   * here is people waiting for a reply.
   */
  it('offers the rest when the server reports more, and confirms completeness when it does not', async () => {
    /*
     * Driven by the server's `hasMore`, not by the row count. Two rows with more waiting is
     * the case the old inference missed entirely; exactly fifty rows with nothing behind them
     * is the case it got wrong the other way.
     */
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT, CUSTOMER], hasMore: true }));
    const { unmount } = render(<InboxPage />);

    expect(await screen.findByText('Showing 2 conversations.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show more' })).toBeInTheDocument();
    unmount();

    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT, CUSTOMER], hasMore: false }));
    render(<InboxPage />);

    /*
     * A sentence rather than silence. A list that simply stops offering a control leaves the
     * reader where they started — unsure whether they have seen everybody — and on this list
     * "everybody" is people waiting for a reply.
     */
    expect(await screen.findByText('That is all 2 conversations.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show more' })).not.toBeInTheDocument();
  });

  it('asks for a bigger page rather than an offset', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT, CUSTOMER], hasMore: true }));
    render(<InboxPage />);

    fetchMock.mockResolvedValueOnce(
      ok({ conversations: [PROSPECT, CUSTOMER, PROSPECT], hasMore: false }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Show more' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    /*
     * `limit=100`, and no offset anywhere. The inbox is a merged read model over two sources
     * that both keep growing, so an offset window can step over a row that arrived while
     * somebody was reading — and the row it steps over is a person waiting. A larger prefix
     * of the same query cannot skip anything. See the note in `lib/endpoints.ts`.
     */
    const [first] = fetchMock.mock.calls[0] as [string];
    const [second] = fetchMock.mock.calls[1] as [string];
    expect(first).toContain('limit=50');
    expect(second).toContain('limit=100');
    expect(second).not.toContain('offset');
  });

  it('says nothing when an older server omits the field', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT] }));

    render(<InboxPage />);

    expect(await screen.findByText('Dana Reyes')).toBeInTheDocument();
    /* Absent means "not known", which must not render as a claim in either direction. */
    expect(screen.queryByText(/Showing \d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/That is all/)).not.toBeInTheDocument();
  });

  it('asks the server for the limit it discloses', async () => {
    fetchMock.mockResolvedValue(ok({ conversations: [] }));

    render(<InboxPage />);
    await screen.findByText(/Nobody is waiting/);

    /*
     * Stated rather than defaulted. The request used to send nothing, which meant the page's
     * ceiling was a number on the server that nothing here could name — so nothing here
     * could disclose it either.
     */
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('limit=50');
  });

  it('will not send an empty reply', async () => {
    fetchMock.mockResolvedValueOnce(ok({ conversations: [PROSPECT] }));

    render(<InboxPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Reply' }));

    expect(screen.getByRole('button', { name: 'Send reply' })).toBeDisabled();
  });
});
