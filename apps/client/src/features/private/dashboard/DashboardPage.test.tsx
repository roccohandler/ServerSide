import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flagship, growthPartner } from '../../../config/pricing';
import { responsibilities } from '../../../content';
import type { DashboardData } from '@jobforge/shared';
import { DashboardPage } from './DashboardPage';

/*
 * The private landing page.
 *
 * What is pinned here is the information architecture rather than the wording: the product
 * and the stage first, then one current action, then what is outstanding on the customer's
 * side, then what happens next, then what they have paid and who is responsible for what.
 * Almost every string on the page comes from the server or from the content layer — the
 * client's job is to put them in that order and to say whose move it is.
 */

const fetchDashboard = vi.fn();
const markActivityRead = vi.fn();

vi.mock('../services/appApi', () => ({
  fetchDashboard: (...args: unknown[]) => fetchDashboard(...args),
  markActivityRead: (...args: unknown[]) => markActivityRead(...args),
}));

function buildData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    user: {
      id: 'user-1',
      email: 'dana@cascadeheating.example',
      name: 'Dana Reyes',
      role: 'customer',
      emailVerified: true,
      capabilities: [],
      authProviders: ['password'],
    },
    currentAction: {
      kind: 'complete-tasks',
      heading: 'One thing left for you to do',
      body: 'Next: Send us your logo.',
      cta: { label: 'See what we need', href: '/app/projects/p1/tasks' },
      waitingOnCustomer: true,
    },
    project: {
      id: 'p1',
      businessName: 'Cascade Heating & Air',
      milestone: 'building',
      milestoneLabel: 'Your website is being built',
      milestoneDetail: 'We will send you a preview link as soon as there is something to see.',
      waitingOnCustomer: false,
      progress: { step: 3, total: 8 },
      approval: 'not_ready',
      revisions: { used: 0, included: 2 },
      createdAt: '2026-08-01T00:00:00.000Z',
      updatedAt: '2026-08-10T00:00:00.000Z',
    },
    projects: [],
    assessment: {
      id: 'a1',
      businessName: 'Cascade Heating & Air',
      score: 42,
      band: 'costing-you',
      weakestCategories: ['speed'],
      recommendations: ['Your website is slow enough to be losing visitors.'],
      submittedAt: '2026-08-01T00:00:00.000Z',
    },
    /*
     * One open task, because the server sends them and the page renders them. The fixture
     * used to send none while the current action said one thing was left to do — a state
     * the server cannot produce, and the reason the missing section went unnoticed.
     */
    tasks: [
      {
        id: 'task-1',
        projectId: 'p1',
        kind: 'logo',
        title: 'Send us your logo',
        description: 'Whatever your sign-writer used is usually the right file.',
        status: 'open',
        createdAt: '2026-08-02T00:00:00.000Z',
      },
    ],
    activity: [
      {
        id: 'act-1',
        type: 'billing.payment_succeeded',
        summary: 'We received your payment. Thank you.',
        at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ],
    billing: {
      hasBillingAccount: true,
      build: {
        deposit: { status: 'paid', label: 'Paid' },
        final: { status: 'pending', label: 'Not paid yet' },
      },
      /*
       * Verbatim from `SUBSCRIPTION_LABELS.none` in the server's `billing.summary.ts`, now
       * that the recurring product is named Growth Partner everywhere. It is free text the
       * server owns; what this file pins is that nothing on the page calls the product
       * anything else.
       */
      // Verbatim from the server's `SUBSCRIPTION_LABELS.none`, so the fixture mirrors reality
      // rather than a guess. It renders as the value of a `<dt>Growth Partner</dt>`.
      subscription: { status: 'none', label: 'Not started', manageable: true },
      available: { deposit: false, final: false, plan: false },
    },
    /*
     * Caught up by default, so no test that is about something else has to reason about a
     * badge. The two that are about it override this.
     */
    unread: { count: 0, since: '2026-08-01T00:00:00.000Z', capped: false },
    ...overrides,
  };
}

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  fetchDashboard.mockReset();
  markActivityRead.mockReset();
  markActivityRead.mockResolvedValue({ success: true, data: {} });
  fetchDashboard.mockResolvedValue({ success: true, data: buildData() });
});

describe('the customer dashboard', () => {
  it('greets somebody by their first name', async () => {
    renderDashboard();
    expect(await screen.findByRole('heading', { name: /hello, dana/i })).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * WHERE AM I?
   * ==========================================================================
   *
   * The first question, and the one the previous version of this page never answered: a
   * progress bar in a card headed "Your website" says nothing about which product was
   * bought. The name comes from `config/pricing.ts` rather than from a string here, so a
   * rename of the build reaches the dashboard on its own — it is also the name on the
   * customer's invoice, and those two disagreeing is a support call.
   */
  it('names the product and the stage before anything else', async () => {
    renderDashboard();

    expect(await screen.findByText(flagship.name)).toBeInTheDocument();
    expect(screen.getByText('Your website is being built')).toBeInTheDocument();
  });

  /*
   * A product nobody has bought must not appear on their own dashboard. Growth Partner is
   * on the billing summary either way — that row reports whether it is running — so the
   * count is what distinguishes "reported" from "claimed as yours".
   */
  it('names Growth Partner at the top only while it is actually running', async () => {
    renderDashboard();

    await screen.findByText(flagship.name);
    expect(screen.getAllByText(growthPartner.name)).toHaveLength(1);
  });

  it('names it twice once the subscription is live', async () => {
    const base = buildData();
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        billing: {
          ...base.billing,
          subscription: { status: 'active', label: 'Active', manageable: true },
        },
      }),
    });

    renderDashboard();

    await screen.findByText(flagship.name);
    expect(screen.getAllByText(growthPartner.name)).toHaveLength(2);
  });

  it('answers the same question honestly when there is nothing under way', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({ project: null, tasks: [] }),
    });

    renderDashboard();

    expect(
      await screen.findByText(new RegExp(`no ${flagship.name} under way yet`, 'i')),
    ).toBeInTheDocument();
  });

  /*
   * The single most important element on the page, and there is exactly one of it. The
   * server chooses which — see `dashboard.currentAction.ts` — so the page cannot end up showing
   * three competing calls to action, or, on the day it matters, none.
   */
  it('leads with one current action, written by the server', async () => {
    renderDashboard();

    const action = await screen.findByRole('heading', { name: 'One thing left for you to do' });
    expect(action).toBeInTheDocument();
    expect(screen.getByText(/next: send us your logo/i)).toBeInTheDocument();
  });

  /*
   * "Are they working, or is this sitting on me?" is the question every client of every
   * agency actually has, and it is the one thing the page answers before anything else.
   */
  it('says whose move it is', async () => {
    renderDashboard();
    expect(await screen.findByText(/over to you/i)).toBeInTheDocument();
  });

  it('says so the other way round when nothing is outstanding', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        currentAction: {
          kind: 'waiting-on-us',
          heading: 'Your website is being built',
          body: 'We will send you a preview link as soon as there is something to look at.',
          cta: null,
          waitingOnCustomer: false,
        },
      }),
    });

    renderDashboard();
    expect(await screen.findByText(/we are on it/i)).toBeInTheDocument();
    expect(screen.queryByText(/over to you/i)).toBeNull();
  });

  /*
   * The technical state is never rendered. "building" is a word a plumber does not owe
   * anybody; `milestoneLabel` is the sentence.
   */
  it('renders the plain-language status rather than the internal one', async () => {
    renderDashboard();

    expect(await screen.findByText('Your website is being built')).toBeInTheDocument();
    // The raw milestone value appears nowhere a customer can read it.
    expect(screen.queryByText('building')).toBeNull();
  });

  it('reports progress in a way a screen reader can hear', async () => {
    renderDashboard();

    const progress = await screen.findByRole('progressbar');
    expect(progress).toHaveAttribute('aria-valuenow', '3');
    expect(progress).toHaveAttribute('aria-valuemax', '8');
    expect(progress).toHaveAccessibleName(/step 3 of 8/i);
  });

  /*
   * ==========================================================================
   * WHAT DO YOU NEED FROM ME?
   * ==========================================================================
   *
   * The server has always sent `tasks` and this page rendered none of them, so the only
   * place a customer could see what was blocking their own build was the first line of the
   * action panel — one task, truncated into a sentence. Both fields of each task are the
   * server's words.
   */
  it('lists what is outstanding on the customer’s side, and where to deal with it', async () => {
    renderDashboard();

    expect(await screen.findByText('Send us your logo')).toBeInTheDocument();
    expect(screen.getByText(/your sign-writer used/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /send us what we need/i })).toHaveAttribute(
      'href',
      '/app/projects/p1/tasks',
    );
  });

  it('says nothing is waiting rather than reporting an absence', async () => {
    fetchDashboard.mockResolvedValue({ success: true, data: buildData({ tasks: [] }) });

    renderDashboard();
    expect(await screen.findByText(/nothing is waiting on you/i)).toBeInTheDocument();
  });

  /*
   * A summary that shows three of seven and does not say so is how somebody concludes
   * they owe us three things. The count is stated next to the truncation.
   */
  it('says how many tasks it is not showing', async () => {
    const base = buildData();
    const first = base.tasks[0];
    if (!first) throw new Error('the fixture has no task to clone');

    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        tasks: [1, 2, 3, 4, 5].map((index) => ({ ...first, id: `task-${index}` })),
      }),
    });

    renderDashboard();

    expect(await screen.findByText(/and 2 more, 5 altogether/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see everything we need/i })).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * WHAT IS NEXT?
   * ==========================================================================
   *
   * Counted rather than named, because the next milestone's customer-facing label never
   * leaves the server — see the note on `NextStage`. What is asserted is that the count is
   * the server's arithmetic and that no internal milestone value leaks in the process.
   */
  it('says how much of the build is left without naming an internal milestone', async () => {
    renderDashboard();

    expect(await screen.findByText(/5 more steps after this one/i)).toBeInTheDocument();
    expect(screen.queryByText('review')).toBeNull();
  });

  /*
   * `chooseCurrentAction` writes its `waiting-on-us` body out of the same milestone
   * sentence this section would print. Printing it twice makes a summary read as padding,
   * so the section drops it when the action already carries it.
   */
  it('never prints the same milestone sentence twice', async () => {
    const detail = buildData().project?.milestoneDetail;
    if (!detail) throw new Error('the fixture has no project detail');

    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        currentAction: {
          kind: 'waiting-on-us',
          heading: 'Your website is being built',
          body: detail,
          cta: null,
          waitingOnCustomer: false,
        },
      }),
    });

    renderDashboard();

    await screen.findByText(/we are on it/i);
    expect(screen.getAllByText(detail)).toHaveLength(1);
    // And the section still answers the question it exists for.
    expect(screen.getByText(/5 more steps after this one/i)).toBeInTheDocument();
  });

  it('shows the assessment score and the first recommendation', async () => {
    renderDashboard();

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText(/likely costing you work/i)).toBeInTheDocument();
    expect(screen.getByText(/slow enough to be losing visitors/i)).toBeInTheDocument();
  });

  it('shows recent activity in the customer’s own words', async () => {
    renderDashboard();
    expect(await screen.findByText(/we received your payment/i)).toBeInTheDocument();
  });

  /*
   * ==========================================================================
   * WHAT HAPPENED WHILE I WAS AWAY?
   * ==========================================================================
   *
   * The gap this closed: somebody signing in after a fortnight had no way to tell which of
   * the twelve entries in their timeline were new to them, so the whole list read as
   * history. What is pinned here is the sentence, the per-entry marker, and — the part that
   * is easy to get wrong — that looking is what marks it read.
   */
  it('says how much has happened since the customer last looked', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        unread: { count: 3, since: '2026-08-01T00:00:00.000Z', capped: false },
      }),
    });

    renderDashboard();

    expect(
      await screen.findByText(/3 things have happened since you were last here/i),
    ).toBeInTheDocument();
    /* The fixture's one entry is an hour old, so it is on the new side of the marker. */
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('marks the stream read once, because looking is what reads it', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        unread: { count: 3, since: '2026-08-01T00:00:00.000Z', capped: false },
      }),
    });

    renderDashboard();

    await screen.findByText(/3 things have happened/i);

    /*
     * ======================================================================
     * `waitFor` RATHER THAN A BARE ASSERTION, AND IT IS NOT BELT AND BRACES
     * ======================================================================
     *
     * This read `expect(markActivityRead).toHaveBeenCalledTimes(1)` immediately after the
     * `findByText` above, and it flaked — twice in one afternoon, under the load of the full
     * suite, while passing every time the file was run on its own.
     *
     * The cause is a real ordering rather than a slow machine. `findByText` resolves the
     * moment the text is in the document; the mark happens in an effect, which React flushes
     * *after* that commit. On an idle machine the two land in the same tick and the assertion
     * is accidentally right. Under load they do not, and the test fails on a component that is
     * behaving perfectly.
     *
     * The `toHaveBeenCalledTimes(1)` is the assertion that matters and it survives: `waitFor`
     * retries until it holds, so a second call — which is what the `marked` ref exists to
     * prevent — still fails this, immediately and for the right reason.
     * ======================================================================
     */
    await waitFor(() => {
      expect(markActivityRead).toHaveBeenCalledTimes(1);
    });
  });

  /*
   * Nothing new means nothing said. A permanent "0 things have happened since you were last
   * here" is a line that trains its own dismissal, and it would be sitting immediately above
   * the list it is failing to describe.
   */
  it('says nothing at all when the customer is caught up', async () => {
    renderDashboard();

    await screen.findByText(/we received your payment/i);
    expect(screen.queryByText(/since you were last here/i)).toBeNull();
    expect(screen.queryByText('New')).toBeNull();
    expect(markActivityRead).not.toHaveBeenCalled();
  });

  it('summarises billing without exposing anything internal', async () => {
    renderDashboard();

    await screen.findByRole('heading', { name: /hello, dana/i });

    const rendered = document.body.textContent ?? '';
    expect(rendered).not.toMatch(/cus_/);
    expect(rendered).not.toMatch(/sub_/);
    expect(rendered).not.toMatch(/pi_/);
  });

  /*
   * The recurring product has one name. "Care plan" was on this page, on the billing page
   * and nowhere else in the business — a customer who agreed to Growth Partner and was
   * shown a line item for a care plan has been given two products to worry about.
   */
  it('calls the recurring product Growth Partner and nothing else', async () => {
    renderDashboard();

    await screen.findByRole('heading', { name: /hello, dana/i });

    expect(screen.getAllByText(growthPartner.name).length).toBeGreaterThan(0);
    expect(document.body.textContent ?? '').not.toMatch(/care plan/i);
  });

  /*
   * ==========================================================================
   * WHO IS RESPONSIBLE FOR WHAT?
   * ==========================================================================
   *
   * The wording is the content layer's, imported rather than restated: this is the
   * division of labour the customer agreed to, and an app that paraphrases it has quietly
   * published a second version of the agreement. The list is cut short for a dashboard,
   * and every line that survives the cut has to be one of the canonical ones.
   */
  it('summarises who does what in the site’s own words', async () => {
    renderDashboard();

    const region = await screen.findByRole('region', { name: /who does what/i });

    expect(screen.getByText(responsibilities.weHandle.label)).toBeInTheDocument();
    expect(screen.getByText(responsibilities.youProvide.label)).toBeInTheDocument();

    const canonical = new Set<string>([
      ...responsibilities.weHandle.items,
      ...responsibilities.youProvide.items,
    ]);

    const rendered = [...region.querySelectorAll('li')].map(
      (item) => item.textContent?.trim() ?? '',
    );

    expect(rendered.length).toBeGreaterThan(0);
    for (const item of rendered) {
      expect(canonical.has(item), `"${item}" is not one of the published responsibilities`).toBe(
        true,
      );
    }
  });

  it('says how much of the split it is not showing', async () => {
    renderDashboard();

    await screen.findByRole('region', { name: /who does what/i });

    const { weHandle, youProvide } = responsibilities;
    expect(
      screen.getByText(
        new RegExp(`${weHandle.items.length} on our side and ${youProvide.items.length} on yours`),
      ),
    ).toBeInTheDocument();
  });

  /*
   * The sections a first-time visitor has none of. Each says what to do next rather
   * than reporting an absence, which is the difference between an empty state and a
   * page that looks broken.
   */
  it('offers a way forward when there is no project and no assessment', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({ project: null, assessment: null, tasks: [] }),
    });

    renderDashboard();

    expect(await screen.findByText(/no website project yet/i)).toBeInTheDocument();
    expect(screen.getByText(/you have not done the assessment yet/i)).toBeInTheDocument();
    // Inside the workspace. A dashboard that throws somebody onto the marketing site
    // takes their navigation away at the moment they were trying to make progress.
    expect(screen.getByRole('link', { name: /start the assessment/i })).toHaveAttribute(
      'href',
      '/app/assessment/start',
    );
  });

  it('nudges an unconfirmed address quietly, at the bottom', async () => {
    fetchDashboard.mockResolvedValue({
      success: true,
      data: buildData({
        user: { ...buildData().user, emailVerified: false },
      }),
    });

    renderDashboard();
    expect(await screen.findByText(/not confirmed yet/i)).toBeInTheDocument();
  });

  it('says nothing about verification once the address is confirmed', async () => {
    renderDashboard();

    await screen.findByRole('heading', { name: /hello, dana/i });
    expect(screen.queryByText(/not confirmed yet/i)).toBeNull();
  });

  /*
   * Six answers is six headings, and a screen-reader user navigates them by level. A jump
   * from h1 to h3 announces that a level is missing with no way to find out what was in
   * it — the standard `outline.test.tsx` holds every public page to, applied here because
   * this page just grew four sections.
   */
  it('keeps the heading outline navigable', async () => {
    const { container } = renderDashboard();
    await screen.findByRole('heading', { name: /hello, dana/i });

    const levels = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) =>
      Number(node.tagName.slice(1)),
    );

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);

    const skipped: string[] = [];
    levels.reduce((previous, level) => {
      if (level > previous + 1) skipped.push(`h${previous} → h${level}`);
      return level;
    }, 1);

    expect(skipped).toEqual([]);
  });

  /* ------------------------------------------------------------- failure */

  it('shows the server’s message and offers a retry when loading fails', async () => {
    const user = userEvent.setup();
    fetchDashboard.mockResolvedValue({
      success: false,
      error: { code: 'NETWORK_ERROR', message: 'We could not reach the server.' },
    });

    renderDashboard();

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the server/i);

    fetchDashboard.mockResolvedValue({ success: true, data: buildData() });
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByRole('heading', { name: /hello, dana/i })).toBeInTheDocument();
  });

  it('never shows a stack trace or an internal error', async () => {
    fetchDashboard.mockResolvedValue({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end.' },
    });

    renderDashboard();

    await screen.findByRole('alert');
    const rendered = document.body.textContent ?? '';
    expect(rendered).not.toMatch(/\.ts:\d+/);
    expect(rendered).not.toMatch(/MongoError|ECONNREFUSED|at Object\./);
  });
});
