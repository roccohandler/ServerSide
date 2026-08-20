import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useResource } from '@jobforge/ui';
import { flagship, growthPartner } from '../../../config/pricing';
import { appProjectTasksPath, routes } from '../../../config/routes';
import { responsibilities } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { CurrentAction, ProjectView, TaskView } from '@jobforge/shared';
import { fetchDashboard, markActivityRead } from '../services/appApi';
import { AppError, AppLoading } from '../../../components/patterns/AppState';
import { Notice } from '../../../components/patterns/Notice';
import { ActivityList } from '../components/ActivityList';
import { CurrentActionCard } from '../components/CurrentActionCard';
import { ProjectSummaryCard } from '../components/ProjectSummaryCard';
import { AssessmentSummaryCard } from '../components/AssessmentSummaryCard';
import { BillingSummaryCard } from '../components/BillingSummaryCard';
import { Card } from '@jobforge/ui';
import cards from '../components/Cards.module.css';
import styles from './Dashboard.module.css';

/*
 * ============================================================================
 * `/app` — SIX QUESTIONS, IN THE ORDER SOMEBODY ASKS THEM
 * ============================================================================
 *
 * This page used to be five cards in a sensible order. The order was defensible and the
 * page still failed the first question a customer has, because a card called "Your
 * website" showing a progress bar does not say *which product they bought* or *what stage
 * of it they are at* — the two facts somebody signing in after a fortnight away needs
 * before anything else on the screen means anything.
 *
 * So the page is an ordered set of answers now, and each one is a section with its own
 * heading:
 *
 *   1. **Where am I?** The product, by name from `config/pricing.ts`, and the stage, in
 *      the server's words. A customer with no project gets a straight answer rather than
 *      an empty column.
 *   2. **What is happening now?** The current action, chosen by the server — see
 *      `server/src/features/dashboard/dashboard.currentAction.ts`. One thing, never three competing
 *      calls to action and never none.
 *   3. **What do you need from me?** The open tasks. The server was already sending them
 *      and this page rendered none of them, so the only place a customer could see what
 *      was blocking their own build was the first line of the action panel.
 *   4. **What is next?** The stage after this one.
 *   5. **What have I paid?** Billing, and it stays low: a customer who is not being asked
 *      for money should not have to look at it.
 *   6. **Who is responsible for what?** The split from `content/offer.ts`, short.
 *
 * Then the assessment and the recent activity, which are context rather than answers —
 * activity is here so that silence is not mistaken for nothing happening.
 *
 * ## Every sentence about the project still comes from the server
 *
 * The client's job on this page is ordering the answers and saying whose move it is. The
 * one thing it computes is arithmetic on numbers the server sent (`progress`), and the
 * one thing it names from the config is the product, because the product name is a
 * commercial fact and `config/pricing.ts` owns it.
 *
 * What this deliberately is not: a metrics dashboard. No charts, no counters, no
 * sparklines. A local service business does not need a graph of their own website's
 * progress — they need to know whether anybody is waiting on them.
 *
 * ## No `checkout_started` event here
 *
 * The two Growth Partner buttons on `/app/billing` look like they want a browser-side
 * analytics event, and they must not get one from this feature. The authoritative record
 * is the server's `billing.checkout_started` activity entry, written where the session is
 * actually created; a browser-side duplicate of a server truth disagrees with the
 * database the first time an ad blocker or a closed tab drops one of them.
 *
 * ## One request
 *
 * Everything above comes from `/api/app/dashboard`. Five endpoints would be five round
 * trips on a phone and five chances to paint a half-drawn page, on a site whose pitch is
 * that a slow page loses customers.
 * ============================================================================
 */

const meta = {
  path: routes.appDashboard,
  title: 'Dashboard',
  description: 'Where your build is, what is needed from you, and what you have paid.',
};

/**
 * How many open tasks and responsibilities the summary lists before it stops.
 *
 * A dashboard summary that is as long as the page it summarises is not a summary. The
 * counts are stated next to the truncation in both places, because "three things" when
 * there are seven is the sort of quiet inaccuracy that costs a client a week.
 */
const TASKS_SHOWN = 3;
const SPLIT_ITEMS_SHOWN = 3;

export function DashboardPage() {
  useDocumentMeta(meta);

  /*
   * `useResource` rather than a hand-rolled effect, and the reason is written in that hook's
   * own header: this page had its own copy of the abort-controller-plus-reload-token state
   * machine, and so did `/app/projects`, `/app/billing` and the console's inbox. Five
   * implementations of one shape is exactly the drift the hook was extracted to stop, and
   * three of the five never adopted it.
   *
   * The constant key is deliberate — this page always loads the same thing. `fetchDashboard`
   * is a module-level function and therefore already stable; an inline arrow here would
   * refetch on every render.
   */
  const { data, failure, isLoading, reload } = useResource('dashboard', fetchDashboard);

  /*
   * ==========================================================================
   * SEEING IT IS WHAT MARKS IT READ
   * ==========================================================================
   *
   * This page is the only one that marks the stream, because this page is the only one the
   * entries are actually on. A mark from the shell would claim somebody had read something
   * they never looked at, and the count would then be permanently, quietly wrong in the one
   * direction that matters — telling a customer nothing has happened.
   *
   * Once per mount, guarded by a ref rather than by an effect dependency. `useResource`
   * refetches after every mutation on this page, so a dependency on `data` would re-mark on
   * each of them — harmless, and a request per action for no reason. StrictMode's double
   * invoke is the other thing the ref absorbs.
   *
   * Nothing waits on the result and nothing renders it. A mark that fails means the same
   * entries are flagged once more, which is the harmless direction; the server logs it and
   * answers 200 for exactly the same reason — see `activity.routes.ts`.
   */
  const marked = useRef(false);

  useEffect(() => {
    if (marked.current || !data || data.unread.count === 0) return;
    marked.current = true;
    void markActivityRead();
  }, [data]);

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your dashboard" />;

  const firstName = data.user.name.split(' ')[0] ?? data.user.name;
  const { billing, currentAction, project, tasks } = data;
  const onPlan = billing.subscription.status === 'active';

  return (
    <div className={styles['page']}>
      <header className={styles['header']}>
        {/*
         * ======================================================================
         * A PROJECT WORKSPACE, NOT A DASHBOARD
         * ======================================================================
         *
         * "Hello, Dana" is warm and it is not an identity. A customer arriving here should be
         * able to tell in one line *what this place is* — and "dashboard" is what every SaaS
         * product they have ever abandoned called its landing page.
         *
         * The eyebrow above the greeting is the fix, and it costs one line: this is the place
         * their project is run from, which is a claim the rest of the page then makes good on.
         * It also closes the last gap in the site's own narrative — the marketing pages promise
         * a project managed through an account, and until now the account never said it was
         * one.
         *
         * The greeting stays. It is the reason somebody feels dealt with by a person rather
         * than by a queue, and it is the half of this heading that is not replaceable.
         * ======================================================================
         */}
        <p className={styles['eyebrow']}>Your JobForge project</p>
        <h1 className={styles['title']}>Hello, {firstName}</h1>

        {/*
         * 1. WHERE AM I?
         *
         * The product is named from the config rather than described, because "your
         * website" is what every other supplier this customer has used also called it,
         * and because the name on this line has to be the name on their invoice.
         *
         * `growthPartner.name` appears only when the subscription is genuinely active.
         * Listing a product somebody has not bought, on the first line of their own
         * dashboard, is a bill they will ring up about.
         */}
        <p className={styles['placement']}>
          {project ? (
            <>
              <span className={styles['product']}>{flagship.name}</span>
              {onPlan ? <span className={styles['product']}>{growthPartner.name}</span> : null}
              <span className={styles['stage']}>{project.milestoneLabel}</span>
            </>
          ) : (
            <span className={styles['stage']}>No {flagship.name} under way yet.</span>
          )}
        </p>
      </header>

      {/* 2. WHAT IS HAPPENING NOW? */}
      <CurrentActionCard action={currentAction} />

      <div className={styles['grid']}>
        <div className={styles['column']}>
          <section className={styles['answer']} aria-labelledby="dashboard-project">
            <h2 id="dashboard-project" className={styles['sectionTitle']}>
              Your website
            </h2>
            <ProjectSummaryCard project={project} />
          </section>

          {/* 3. WHAT DO YOU NEED FROM ME? */}
          <section className={styles['answer']} aria-labelledby="dashboard-tasks">
            <h2 id="dashboard-tasks" className={styles['sectionTitle']}>
              What we need from you
            </h2>
            <OpenTasks tasks={tasks} />
          </section>

          {/* 4. WHAT IS NEXT? */}
          {project ? (
            <section className={styles['answer']} aria-labelledby="dashboard-next">
              <h2 id="dashboard-next" className={styles['sectionTitle']}>
                What happens next
              </h2>
              <NextStage action={currentAction} project={project} />
            </section>
          ) : null}
        </div>

        <div className={styles['column']}>
          {/* 5. WHAT HAVE I PAID? */}
          <section className={styles['answer']} aria-labelledby="dashboard-billing">
            <h2 id="dashboard-billing" className={styles['sectionTitle']}>
              Billing
            </h2>
            <BillingSummaryCard billing={billing} />
          </section>

          {/* 6. WHO IS RESPONSIBLE FOR WHAT? */}
          <section className={styles['answer']} aria-labelledby="dashboard-split">
            <h2 id="dashboard-split" className={styles['sectionTitle']}>
              Who does what
            </h2>
            <ResponsibilitySplit />
          </section>

          <section className={styles['answer']} aria-labelledby="dashboard-assessment">
            <h2 id="dashboard-assessment" className={styles['sectionTitle']}>
              Your assessment
            </h2>
            <AssessmentSummaryCard assessment={data.assessment} />
          </section>

          <section className={styles['answer']} aria-labelledby="dashboard-activity">
            <h2 id="dashboard-activity" className={styles['sectionTitle']}>
              Recent activity
            </h2>
            {/*
             * "N new since you were last here" rather than a bare number, because the
             * number on its own answers a question nobody asked. What somebody signing in
             * after a fortnight wants to know is whether anything moved while they were
             * away, and that sentence is the answer — the marked entries below are where
             * it happened.
             *
             * The count and the list come from the same response, so the heading cannot
             * describe a different set of entries from the one under it.
             */}
            {data.unread.count > 0 ? (
              <p className={styles['unread']}>
                {data.unread.capped ? 'More than ' : ''}
                {data.unread.count}
                {data.unread.count === 1 && !data.unread.capped
                  ? ' thing has'
                  : ' things have'}{' '}
                happened since you were last here.
              </p>
            ) : null}
            {/*
             * `newSince` only when there is something new. The count and the marker are two
             * renderings of one fact, and passing the timestamp unconditionally let them
             * disagree — a count of zero beside entries wearing a "New" label, which is the
             * heading and the list contradicting each other on the same screen.
             */}
            <ActivityList
              activity={data.activity}
              {...(data.unread.count > 0 ? { newSince: data.unread.since } : {})}
            />
          </section>
        </div>
      </div>

      {/*
       * The verification nudge lives at the bottom, not in a banner across the top.
       * It is real and it is not worth interrupting somebody's website for — the same
       * judgement the server's action priority makes.
       */}
      {!data.user.emailVerified ? (
        <Notice tone="info">
          Your email address is not confirmed yet.{' '}
          <Link to={routes.appAccount}>Send the link again</Link> to make sure you get updates about
          your website.
        </Notice>
      ) : null}
    </div>
  );
}

/**
 * What is outstanding on the customer's side, in the words whoever raised it used.
 *
 * The link goes to the project the tasks belong to rather than to the active project,
 * because a task carries its own `projectId` and the two can differ — a customer on their
 * second build can be blocking the first one.
 *
 * The empty state says nothing is waiting rather than saying "no tasks", because "no
 * tasks" reads as a system with nothing in it and this is a page somebody checks to find
 * out whether they have forgotten something.
 */
function OpenTasks({ tasks }: { readonly tasks: readonly TaskView[] }) {
  const first = tasks[0];

  if (!first) {
    return (
      <Card as="article">
        <p className={cards['statusDetail']}>
          Nothing is waiting on you. Anything we need from you turns up here.
        </p>
      </Card>
    );
  }

  const hidden = tasks.length - TASKS_SHOWN;

  return (
    <Card as="article">
      <ul className={styles['tasks']}>
        {tasks.slice(0, TASKS_SHOWN).map((task) => (
          <li key={task.id}>
            <p className={styles['taskTitle']}>{task.title}</p>
            <p className={styles['taskDetail']}>{task.description}</p>
          </li>
        ))}
      </ul>

      {hidden > 0 ? (
        <p className={cards['meta']}>
          And {hidden} more, {tasks.length} altogether.
        </p>
      ) : null}

      <ul className={cards['links']}>
        <li>
          <Link to={appProjectTasksPath(first.projectId)}>
            {tasks.length === 1 ? 'Send us what we need' : 'See everything we need'}
          </Link>
        </li>
      </ul>
    </Card>
  );
}

/**
 * The step after this one.
 *
 * ## Why this counts the steps instead of naming the next one
 *
 * Because the client is not told the next one's name. `MILESTONE_PRESENTATION` on the
 * server turns a milestone into the sentence a customer reads, and
 * `toCustomerProjectView` sends the *current* milestone's label and detail only. Keeping a
 * second copy of those sentences in the browser so this card could name the next stage
 * would be the exact drift the server-side table exists to prevent: two places deciding
 * what "revisions" is called, one of which nobody updates.
 *
 * So this says what it can say truthfully from what arrived — how many steps are left, and
 * whose move the current one is — and the server's own forward-looking sentence for this
 * stage where that sentence is not already on the screen. Giving the view a
 * `nextMilestoneLabel` is a one-field change on the server and a one-line change here.
 *
 * ## The duplication check
 *
 * `chooseCurrentAction` builds its `waiting-on-us` body out of the same
 * `MILESTONE_PRESENTATION.detail` this card would print, and two of its other branches
 * open with it verbatim. `includes` rather than a comparison against `kind`, because it is
 * the sentence being on the screen twice that matters, not which branch put it there.
 */
function NextStage({
  action,
  project,
}: {
  readonly action: CurrentAction;
  readonly project: ProjectView;
}) {
  const toGo = Math.max(project.progress.total - project.progress.step, 0);
  const detailAlreadyOnScreen = action.body.includes(project.milestoneDetail);

  return (
    <Card as="article">
      {/*
       * "Step", not "stage", because the progress bar above says "Step 3 of 8" and two
       * words for one scale makes the reader work out whether they are the same thing.
       */}
      <p className={cards['status']}>
        {toGo === 0
          ? 'This is the last step of the build.'
          : `${toGo} more ${toGo === 1 ? 'step' : 'steps'} after this one.`}
      </p>

      {detailAlreadyOnScreen ? null : (
        <p className={cards['statusDetail']}>{project.milestoneDetail}</p>
      )}

      <p className={cards['meta']}>
        {action.waitingOnCustomer
          ? 'It moves as soon as your part is done — that is the panel at the top of this page.'
          : 'It is ours to move. When it does, this page and your activity both change.'}
      </p>
    </Card>
  );
}

/**
 * Who is responsible for what, short.
 *
 * The wording is `responsibilities` in `content/offer.ts` — the same strings the public
 * site publishes, imported rather than restated, because this is the division of labour a
 * customer agreed to and an app that paraphrases it has published a second version of the
 * agreement. The full split is a section on a sales page and far too long for a dashboard,
 * so it is cut to the first few of each side and both totals are printed next to the cut.
 * A truncated list that does not say it is truncated is how somebody concludes they owe us
 * three things when they owe us five.
 */
function ResponsibilitySplit() {
  const { weHandle, youProvide } = responsibilities;

  return (
    <Card as="article">
      <div className={styles['split']}>
        {[weHandle, youProvide].map((side) => (
          <div key={side.label}>
            <p className={styles['splitLabel']}>{side.label}</p>
            <ul className={styles['splitList']}>
              {side.items.slice(0, SPLIT_ITEMS_SHOWN).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className={cards['meta']}>
        The main ones: {weHandle.items.length} on our side and {youProvide.items.length} on yours in
        total. {responsibilities.note}
      </p>
    </Card>
  );
}
