import { Router } from 'express';
import { z } from 'zod';
import { AppError } from '../../lib/appError.js';
import { success } from '../../lib/apiResponse.js';
import { parseBody, parseQuery, pathParam } from '../../lib/requestSchema.js';
import { toActivityView, type ActivityService } from '../activity/index.js';
import {
  parseSaveAssessmentReport,
  toAdminAssessmentView,
  type AssessmentService,
} from '../assessments/index.js';
import {
  requireAdmin,
  requireCapability,
  requireRequestAuth,
  toAdminAccountView,
  type AuthRepository,
} from '../auth/index.js';
import { parseCreateCheckoutLink, type BillingService } from '../billing/index.js';
import { createConversationRouter, type ConversationService } from '../conversations/index.js';
import { toDeploymentView, type DeploymentService } from '../deployments/index.js';
import { toThreadViews, type FeedbackService } from '../feedback/index.js';
import { createProjectFileRoutes, toFileView, type FileService } from '../files/index.js';
import type { LeadService } from '../leads/index.js';
import { toOnboardingView, type OnboardingService } from '../onboarding/index.js';
import { createProjectAccess, requireProject, type ProjectService } from '../projects/index.js';
import { DEMO_EMAIL } from '../demo/index.js';
import { parseSaveReport, toAdminReportView, type ReportService } from '../reports/index.js';
import {
  parseAddTask,
  parseCreateProject,
  parseSetDeploymentUrl,
  parseSendScope,
  parseSetEstimate,
  parseSetMilestone,
  parseSetProjectOwner,
  parseUndoMilestone,
  parseUpdateProjectDetails,
} from '../projects/index.js';
import { toTaskView, type TaskService } from '../tasks/index.js';
import { buildWorklist } from './worklist.js';

export interface AdminRoutesDependencies {
  readonly projectService: ProjectService;
  /**
   * One method of it is reached from here: `createCheckoutSession`.
   *
   * The console does not become a second billing surface, and the shape of the dependency is
   * what says so — this router can mint a link for a project it has already resolved, and it
   * cannot list projects by Stripe id, set a payment status or award a guarantee credit,
   * because those are the *token* surface's and DECISION 019 kept them there deliberately.
   *
   * No Stripe key reaches a browser by this route. The console asks the server for a URL and
   * gets a URL; the decision, the price verification and the secret all stay here. See the note
   * in `apps/admin/src/lib/endpoints.ts`.
   */
  readonly billingService: BillingService;
  readonly assessmentService: AssessmentService;
  /** Growth Partner's monthly deliverable, composed and published from the project page. */
  readonly reportService: ReportService;
  readonly taskService: TaskService;
  readonly feedbackService: FeedbackService;
  readonly deploymentService: DeploymentService;
  readonly activityService: ActivityService;
  readonly conversationService: ConversationService;
  /** Undefined when no blob store is configured; the file routes then answer 503. */
  readonly fileService?: FileService | undefined;
  /**
   * Read from, and matched by, but never submitted through.
   *
   * The public `POST /api/onboarding` is the submission path — honeypot, notification, the
   * automatic match — and nothing on this surface should be one typo away from filing a
   * submission as though a client had. The two methods reached here read and re-file.
   */
  readonly onboardingService: OnboardingService;
  /**
   * The repository rather than the auth service, and deliberately.
   *
   * `AuthService` is the credential surface: it signs people in, mints sessions, resets
   * passwords and links identities. The admin surface needs exactly one thing from storage —
   * a bounded list of accounts — and handing it the service would put every one of those
   * operations one typo away from an admin route.
   */
  readonly authRepository: AuthRepository;
  /**
   * Read from for exactly one column on the accounts table: has this person ever asked for
   * anything. The service rather than the repository is safe here in a way it is not for
   * `AuthService` — a lead service cannot mint a session, and its two write methods each
   * need a whole validated submission this surface never builds.
   */
  readonly leadService: LeadService;
}

/*
 * The bound on a list page, and the ceiling the console can climb to.
 *
 * 500 rather than the 200 it was. The console's "Show more" control raises its own limit by
 * fifty at a time, so the maximum here is the point at which that control runs out of rope —
 * and a control that stops working after three presses, with no way to see the rest, is the
 * dead end the control was added to remove.
 *
 * It is not unbounded, and it should not become unbounded. Five hundred rows is already past
 * the point where a list is the right way to find something; whoever needs the six hundredth
 * account needs a search field, and that is a different piece of work with a different shape.
 */
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  /**
   * The search box, and the answer to the sentence above it.
   *
   * That comment said the six-hundredth account "needs a search field, and that is a different
   * piece of work with a different shape". This is that work, and the shape turned out to be
   * one query parameter: an anchored, escaped prefix match built in `lib/search.ts`, applied
   * by the repository, bounded here so a paste accident cannot reach the driver.
   *
   * The list is still bounded and "Show more" still works, because search narrows the same
   * query rather than replacing it — a search that returned everything matching would have
   * the unbounded problem this limit exists to prevent.
   */
  q: z.string().trim().max(80).optional(),
  /**
   * Puts the demonstration account's records back into a list.
   *
   * Off by default, because the console is the owner's picture of the *business* and a demo
   * project in the middle of it is a wrong answer to "how many builds are running". On when
   * somebody is actually debugging the demo, which is the only time it is the right answer.
   */
  includeDemo: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

/**
 * One page of a list, plus whether there is anything behind it.
 *
 * Fetches one row past the limit and drops it. That extra row is the entire mechanism, and
 * it answers exactly rather than approximately: a count of rows equal to the limit is
 * ambiguous — it means "possibly complete, possibly cut" — and the console used to guess,
 * rendering "there are more waiting" at a complete inbox. See the same trick, and a longer
 * account of what it costs, in `conversation.service.ts`.
 */
async function page<T>(
  limit: number,
  load: (bound: number) => Promise<readonly T[]>,
): Promise<{ rows: readonly T[]; hasMore: boolean }> {
  const rows = await load(limit + 1);
  return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
}

const addReplySchema = z.strictObject({
  body: z.string().trim().min(1).max(4000),
  parentId: z.string().trim().min(1).max(64).optional(),
});

/** Which project a stray onboarding submission belongs to. */
const attachOnboardingSchema = z.strictObject({
  projectId: z.string().trim().min(1).max(64),
});

const parseAttachOnboarding = (body: unknown) => parseBody(attachOnboardingSchema, body);

/**
 * Which month the response guarantee was missed in. DECISION 009.
 *
 * `YYYY-MM`, matching the monthly report's key, because the two are about the same calendar
 * month and two spellings of a month is how a credit ends up on a different one from the
 * report that explains it. No amount: the service derives it from the plan's price, so nothing
 * a request could send decides how much money moves.
 */
const guaranteeCreditSchema = z.strictObject({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Use YYYY-MM.' }),
});

/*
 * ============================================================================
 * THE ADMIN SURFACE
 * ============================================================================
 *
 * `/api/admin`. Its own boundary, behind `requireAdmin`, and deliberately not the
 * customer API with a role check bolted on.
 *
 * ## What makes this different from the customer routes
 *
 * The customer routes are scoped: they answer only about the caller's own records and
 * cannot be made to answer about anybody else's. These are the opposite — they exist
 * precisely to cross customer boundaries, and every one of them is a query with no
 * owner filter. That is exactly why they live behind their own mount, their own
 * middleware and their own file: the difference between the two is not a flag, it is
 * which router the request reached.
 *
 * `requireAdmin` answers NOT_FOUND rather than FORBIDDEN, matching the owner-only
 * billing endpoints. A customer probing `/api/admin` should not learn there is an admin.
 *
 * ## What is deliberately not here
 *
 * A second customer portal. Admin operates the domain — statuses, tasks, URLs, replies —
 * through the same services the customer routes use, so there is one set of rules about
 * what a milestone change does and one place it is written.
 * ============================================================================
 */
export function createAdminRouter(dependencies: AdminRoutesDependencies): Router {
  const {
    projectService,
    billingService,
    assessmentService,
    reportService,
    taskService,
    feedbackService,
    deploymentService,
    activityService,
    conversationService,
    fileService,
    onboardingService,
    authRepository,
    leadService,
  } = dependencies;

  const router = Router();
  router.use(requireAdmin);

  /* -------------------------------------------------------- conversations */

  /*
   * The console's front page: everybody waiting on a reply, from both directions at
   * once. Its own router because it is the one part of this surface with a feature
   * behind it rather than a handler — see `features/conversations`.
   */
  router.use('/conversations', createConversationRouter({ conversationService }));

  /* ------------------------------------------------------------- projects */

  /*
   * ==========================================================================
   * THE DEMONSTRATION ACCOUNT IS NOT PART OF THE BUSINESS
   * ==========================================================================
   *
   * DECISION 033 chose "a demo customer is a customer" over a `demo` column filtered in
   * eleven repositories, because one forgotten filter is a leak in either direction. The
   * price of that choice is paid here: demo rows are real rows, so they *would* appear in the
   * owner's own picture of the business — and a demo project in the middle of the project
   * list is a wrong answer to "how many builds are running".
   *
   * That price is a small, enumerable list rather than a filter on every read: this list, the
   * accounts list, and the inbox. It is deliberately at the *route* rather than in the
   * repository, because the underlying queries are still correct — the demo project is a
   * project — and it is only this surface that is answering a question about the business.
   *
   * `?includeDemo=true` puts them back, for the afternoon somebody is debugging the demo.
   */
  async function demoOwnerId(): Promise<string | undefined> {
    const user = await authRepository.findUserByEmail(DEMO_EMAIL);
    /* The flag, not the address. An account at that address without it is not the demo. */
    return user?.demo ? user.id : undefined;
  }

  router.get('/projects', async (request, response) => {
    const { limit, q, includeDemo } = parseQuery(listQuerySchema, request.query);
    const { rows, hasMore } = await page(limit, (bound) => projectService.listAll(bound, q));

    const demoId = includeDemo ? undefined : await demoOwnerId();
    const projects = demoId ? rows.filter((project) => project.ownerUserId !== demoId) : rows;

    /*
     * The full stored record, not the customer view. Staff legitimately need the
     * Stripe ids and the internal notes — that is what operating the business means —
     * and this response only ever reaches somebody `requireAdmin` let through.
     */
    response.json(success({ projects, hasMore }));
  });

  /*
   * ==========================================================================
   * BRINGING A PROJECT INTO EXISTENCE
   * ==========================================================================
   *
   * The console could move a project along and could not create one. Every project in the
   * system arrived through the Stripe webhook, so a scope agreed over the phone — which is
   * how most of them are agreed — had no way in at all short of a database write.
   *
   * Two operations, deliberately, rather than one form that does both: creating a record and
   * giving it to an account are different acts with different failure modes, and `attachOwner`
   * has consequences a creation does not (tasks appear, an email goes out, somebody's
   * dashboard changes). Supplying `ownerEmail` here runs the second immediately, which is the
   * common case; leaving it out creates the project unowned, which is also real — a scope can
   * be agreed before the client has signed up.
   *
   * Distinct from the token-guarded `POST /api/billing/projects`, and both go through
   * `ProjectService`. Two doors, one set of rules about what a project is.
   */
  router.post('/projects', requireCapability('project:write:any'), async (request, response) => {
    const input = parseCreateProject(request.body);

    const owner = input.ownerEmail ? await authRepository.findUserByEmail(input.ownerEmail) : null;

    /*
     * Refused *before* the project is created rather than after. Creating it and then failing
     * to attach would leave an orphan the operator has to find and delete — and they would
     * quite reasonably assume nothing had happened.
     */
    if (input.ownerEmail && !owner) {
      throw new AppError(
        'VALIDATION_ERROR',
        `No account exists for ${input.ownerEmail}. Create the project without an account and attach one later, or ask them to sign up first.`,
      );
    }

    const created = await projectService.createForOwner({
      businessName: input.businessName,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
    });

    const project = owner ? await projectService.attachOwner({ project: created, owner }) : created;

    response.status(201).json(success({ project }));
  });

  const one = Router({ mergeParams: true });
  /* Ownership is bypassed by the `project:write:any` capability, which only staff hold. */
  one.use(createProjectAccess(projectService, 'write'));

  one.get('/', async (request, response) => {
    const project = requireProject(request);

    const [tasks, comments, deployments, activity, files, onboarding] = await Promise.all([
      taskService.listForProject(project.id),
      feedbackService.listForProject(project.id),
      deploymentService.listForProject(project.id, 20),
      activityService.listForProject({
        projectId: project.id,
        limit: 50,
        /* Staff see the internal entries too — that is the point of the distinction. */
        customerVisibleOnly: false,
      }),
      fileService ? fileService.listForProject(project.id) : Promise.resolve([]),
      /*
       * The welcome-form answers, on the same screen as the project they describe.
       *
       * This is the data the website is actually made from — services, service areas, existing
       * accounts, competitors — and it has been arriving by email since the feature was
       * written, with nothing in the console pointing at it. An operator building a site had
       * the milestone, the tasks and the payment status on screen and had to go to an inbox
       * for the brief.
       */
      onboardingService.findForProject(project.id),
    ]);

    response.json(
      success({
        project,
        tasks: tasks.map(toTaskView),
        feedback: toThreadViews(comments),
        deployments: deployments.map(toDeploymentView),
        activity: activity.map(toActivityView),
        files: files.map(toFileView),
        onboarding: onboarding ? toOnboardingView(onboarding) : null,
      }),
    );
  });

  /*
   * ==========================================================================
   * WHO THIS PROJECT BELONGS TO
   * ==========================================================================
   *
   * The fix for the dead end two other messages on this surface point at. Adding a task
   * refuses with "this project has no customer account attached", and the accounts list can
   * show which accounts exist — but nothing could put the two together.
   *
   * `PATCH` with a nullable address rather than two routes, because attach and detach are the
   * same question answered two ways: *who owns this*. A `DELETE /owner` beside a `PUT /owner`
   * would be two verbs for one field.
   *
   * Everything the operation actually means — the cardinality check, the race-safe claim, the
   * seeded tasks, the activity entry, the email — is in `ProjectService`. This handler resolves
   * an address to an account and gets out of the way.
   */
  one.patch('/owner', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const { email } = parseSetProjectOwner(request.body);

    if (email === null) {
      const detached = await projectService.detachOwner(project);
      response.json(success({ project: detached }));
      return;
    }

    const owner = await authRepository.findUserByEmail(email);

    if (!owner) {
      throw new AppError(
        'VALIDATION_ERROR',
        `No account exists for ${email}. They need to sign up before a project can be attached to them.`,
      );
    }

    const attached = await projectService.attachOwner({ project, owner });
    response.json(success({ project: attached }));
  });

  /*
   * Correcting the description of a project.
   *
   * `PATCH /` rather than a field-per-route, because these six change together — an operator
   * fixing a typo in a business name is usually fixing the contact name beside it — and six
   * routes would be six places to forget the guard. What may be reached through it is decided
   * by `ProjectDetailsUpdate` and enforced by the schema; the one rule that is not structural,
   * about `status` and what was actually paid, lives in the service with its reasoning.
   */
  one.patch('/', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const changes = parseUpdateProjectDetails(request.body);

    const updated = await projectService.updateDetails({ project, changes });
    response.json(success({ project: updated }));
  });

  /*
   * ==========================================================================
   * ASKING THIS CLIENT FOR MONEY
   * ==========================================================================
   *
   * The last manual step in the sale. A scope agreed on the phone produced a project (above),
   * and the link that turns it into a paid one had to be minted with a curl command against
   * `/api/billing/checkout-sessions` and pasted into a mail client by hand.
   *
   * Two things make this route rather than the token one the working surface, and both come
   * from the project already being resolved here:
   *
   *   - **It can write activity.** The token route deliberately cannot: a project reached
   *     through it may have no account behind it. Here `createProjectAccess` has already
   *     loaded the record, so the entry has a project to hang off and, usually, an owner.
   *   - **It knows who asked.** DECISION 019's whole point. The entry names the staff member,
   *     which is the difference between "a link was created" and "Dana created a link".
   *
   * `requireVerifiedPrice` may refuse — a Stripe Price that disagrees with the published one,
   * or a product with no Price configured at all. That 503 is written to be read by whoever
   * deployed this and it travels to the console untouched; the panel there renders it verbatim
   * rather than replacing it with "something went wrong".
   */
  one.post('/checkout-link', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const { product, notifyCustomer } = parseCreateCheckoutLink(request.body);

    const session = await billingService.createCheckoutSession({
      projectId: project.id,
      product,
      notifyCustomer,
    });

    const half = product === 'build-deposit' ? 'deposit' : 'launch';

    await activityService.record({
      type: 'billing.checkout_started',
      /*
       * Internal, and named. A customer's own timeline should not gain a line every time an
       * operator generates a link — they will be told by the email, if one was sent, and by
       * Stripe when they pay. What this is for is the question a month later: who asked, and
       * did it actually go out.
       */
      summary: session.emailedTo
        ? `${auth.user.name} sent the ${half} payment link to ${session.emailedTo}.`
        : `${auth.user.name} created a ${half} payment link.`,
      audience: 'internal',
      projectId: project.id,
      userId: project.ownerUserId,
    });

    response.status(201).json(
      success({
        url: session.url,
        product: session.product,
        /*
         * The address a message was built for, never a delivery claim. The notifier swallows
         * its own failures by contract, so this says "we asked for it to be sent" and the
         * console's wording matches.
         */
        emailedTo: session.emailedTo ?? null,
      }),
    );
  });

  /*
   * ==========================================================================
   * AN INVOICE, WHICH IS WHAT THE ROUTE ABOVE SHOULD HAVE BEEN
   * ==========================================================================
   *
   * DECISION 041. A Checkout Session expires after 24 hours, so a link sent on a Friday
   * afternoon is dead before Monday and the client's only symptom is an expiry page for a
   * payment they were trying to make.
   *
   * Its own route rather than a flag on `/checkout-link`, because the two produce genuinely
   * different things: one mints a URL for the operator to send, the other raises a document
   * Stripe delivers, chases and keeps. A boolean would make "which one did I send them?"
   * unanswerable a month later, which is exactly the question an invoice exists to answer.
   *
   * The body is only the product. Every figure comes from the verified Price and the due date
   * from `INVOICE_DUE_DAYS` — nothing about an amount is accepted from a request, on this
   * surface or any other.
   * ==========================================================================
   */
  one.post('/invoice', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const { product } = parseCreateCheckoutLink(request.body);

    const invoice = await billingService.createInvoice({ projectId: project.id, product });

    const half = product === 'build-deposit' ? 'deposit' : 'launch';

    await activityService.record({
      type: 'billing.checkout_started',
      /*
       * Internal and named, exactly as the checkout-link entry above is, and for the same
       * reason: the customer finds out from Stripe. What this is for is the question a month
       * later — who asked for this, and which document did they send.
       */
      summary: `${auth.user.name} invoiced ${invoice.emailedTo} for the ${half} payment${
        invoice.number ? ` (${invoice.number})` : ''
      }.`,
      audience: 'internal',
      projectId: project.id,
      userId: project.ownerUserId,
    });

    response.status(201).json(
      success({
        url: invoice.url,
        number: invoice.number,
        product: invoice.product,
        /*
         * A delivery claim this time, unlike the checkout route's — and the difference is
         * real rather than a wording preference. Stripe sends the invoice itself and reports
         * whether it accepted it, where our own `Notifier` swallows its failures by contract.
         */
        emailedTo: invoice.emailedTo,
      }),
    );
  });

  /*
   * When we think it will be finished.
   *
   * Its own route rather than a field on `PATCH /`, for the reason the domain operation gives
   * about itself: moving an estimate sends an email and setting a first one does not, and a
   * rule like that cannot live in a six-field edit form. See `ProjectService.setEstimate`.
   */
  /*
   * ==========================================================================
   * THE RESPONSE-GUARANTEE REMEDY — DECISION 009
   * ==========================================================================
   *
   * The terms publish a 24-business-hour response guarantee and say the month's fee is
   * "waived in full and applied without you having to request it". The mechanics were
   * undefined and the operation lived behind `BILLING_ADMIN_TOKEN` and curl — so a promise
   * the customer never has to ask for was one the owner had to remember, from a terminal.
   *
   * ## The credit only. The refund stays where it is
   *
   * `recordGuaranteeCredit` has two remedies: a customer-balance credit the next invoice
   * absorbs, and a refund of the month for a client who is leaving and has no next invoice.
   * This route hard-codes `'credit'`, and the omission is the decision.
   *
   * DECISION 019 keeps anything that moves money *out* on the token surface — refunds,
   * cancellations, payment statuses — because those are irreversible and a mis-click on a page
   * holding several customers' projects is a different kind of accident from a mis-typed curl
   * command. A credit is not that: it sits on the customer's Stripe balance, Stripe applies it
   * to the next invoice, and applying one twice is caught by the idempotency below rather than
   * by anybody's care.
   *
   * ## Idempotent per project-month, which is what makes it safe to offer at all
   *
   * The service keys on `(projectId, month)`, so a second press returns the first credit. That
   * is the property that lets this be a button: without it, the honest version would have to be
   * a confirmation dialog, and a confirmation in front of a remedy is a reason not to apply it.
   * ==========================================================================
   */
  one.post(
    '/guarantee-credit',
    requireCapability('project:write:any'),
    async (request, response) => {
      const project = requireProject(request);
      const { month } = parseBody(guaranteeCreditSchema, request.body);

      const credit = await billingService.recordGuaranteeCredit({
        projectId: project.id,
        month,
        remedy: 'credit',
      });

      await activityService.record({
        type: 'billing.payment_succeeded',
        /*
         * Customer-visible, and that is the point of the whole clause. The terms say the waiver
         * is applied *without you having to request it*, which is only true if the customer can
         * see that it was — a credit nobody is told about is a credit that gets asked for.
         */
        summary: `We missed our response guarantee in ${month}, so that month's Growth Partner fee has been credited to your account. Nothing to do at your end.`,
        audience: 'customer',
        projectId: project.id,
        userId: project.ownerUserId,
      });

      response.status(201).json(success({ credit }));
    },
  );

  one.patch('/estimate', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const { estimatedCompletionAt } = parseSetEstimate(request.body);

    const updated = await projectService.setEstimate({
      project,
      estimatedCompletionAt,
      by: auth.user.name,
    });

    response.json(success({ project: updated }));
  });

  /*
   * Sending the scope and price for the customer to accept. DECISION 040.
   *
   * Its own route rather than fields on `PATCH /`, for the same reason the estimate is: the
   * six fields on that form are *descriptions* of a client, and this is a commercial
   * commitment that emails somebody, versions itself, and withdraws any acceptance it
   * replaces. A rule like that cannot live in a general-purpose edit form — and a form that
   * could set it accidentally is a form that eventually will.
   */
  one.post('/scope', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const input = parseSendScope(request.body);

    const updated = await projectService.sendScope({
      project,
      scope: { ...input, sentBy: auth.user.name },
    });

    response.json(success({ project: updated }));
  });

  one.patch('/milestone', async (request, response) => {
    const project = requireProject(request);
    const { milestone } = parseSetMilestone(request.body);

    const updated = await projectService.setMilestone({ project, milestone });
    response.json(success({ project: updated }));
  });

  /*
   * Putting a milestone back, within a short window.
   *
   * Its own route rather than a flag on the one above, for the same reason it is its own
   * domain operation: the two are different events. A change is customer-visible; an undo is
   * an internal correction, and conflating them would put "your website moved backwards" in a
   * customer's history because an operator clicked the wrong tab.
   *
   * `previous` comes from the client because the client is the only side that knows what it
   * just changed *from* — the stored record has already moved. That is safe: it is bounded to
   * the eight real milestones by the schema, the window is checked against the server's own
   * clock, and the worst a wrong value can do is set a milestone the operator could have set
   * directly through the route above.
   */
  one.patch('/milestone/undo', async (request, response) => {
    const project = requireProject(request);
    const { milestone, changedAt } = parseUndoMilestone(request.body);

    const updated = await projectService.undoMilestone({
      project,
      previous: milestone,
      changedAt,
    });
    response.json(success({ project: updated }));
  });

  /*
   * A manual URL set, for the case the provider webhook cannot cover: a site hosted
   * somewhere else, or a deployment that happened before the integration was wired up.
   * The normal path is a deployment event — see the deployments feature.
   */
  one.patch('/urls', async (request, response) => {
    const project = requireProject(request);
    const input = parseSetDeploymentUrl(request.body);

    if (input.previewUrl === undefined && input.productionUrl === undefined) {
      throw new AppError('VALIDATION_ERROR', 'Give a preview URL, a production URL, or both.');
    }

    const updated = await projectService.setUrls({
      project,
      previewUrl: input.previewUrl,
      productionUrl: input.productionUrl,
    });

    response.json(success({ project: updated }));
  });

  one.post('/tasks', async (request, response) => {
    const project = requireProject(request);
    const input = parseAddTask(request.body);

    if (!project.ownerUserId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'This project has no customer account attached, so a task would have nobody to appear for.',
      );
    }

    /*
     * `projectService.addTask`, not `taskService.addTask`.
     *
     * The task itself is still created by the task service — this delegates to it. What the
     * project service adds is the half a task alone cannot do: telling the customer they have
     * been asked for something. A task carries a `projectId` and a `userId` and neither is an
     * address or a business name, so the notification has to be sent from the side that holds
     * the project. See the note on the method.
     *
     * The check above stays even though the domain operation repeats it, because this one
     * produces the message an operator reads and the console renders verbatim.
     */
    const task = await projectService.addTask({
      project,
      kind: input.kind,
      title: input.title,
      description: input.description,
      dueAt: input.dueAt,
    });

    response.status(201).json(success({ task: toTaskView(task) }));
  });

  one.post('/feedback', async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const input = parseBody(addReplySchema, request.body);

    await feedbackService.addComment({
      scope: { kind: 'project', projectId: project.id },
      author: auth.user,
      body: input.body,
      parentId: input.parentId,
      /*
       * The project, so the customer is emailed that they have been answered.
       *
       * Without it the reply is written, attributed and activity-recorded — and invisible until
       * they next sign in, which for somebody waiting on an answer is indistinguishable from
       * being ignored. The author role decides the direction; this only supplies the address.
       */
      subject: {
        businessName: project.businessName,
        email: project.email,
        contactName: project.contactName,
      },
    });

    const comments = await feedbackService.listForProject(project.id);
    response.status(201).json(success({ feedback: toThreadViews(comments) }));
  });

  one.post('/feedback/:commentId/resolve', async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);

    const comment = await feedbackService.findById(pathParam(request.params, 'commentId'));

    // Same rule as the customer route: the comment has to be on this project.
    if (!comment || comment.projectId !== project.id) {
      throw new AppError('NOT_FOUND', 'No comment with that id.');
    }

    await feedbackService.resolve({ comment, resolvedBy: auth.user });

    const comments = await feedbackService.listForProject(project.id);
    response.json(success({ feedback: toThreadViews(comments) }));
  });

  /*
   * The same router the customer portal mounts, in the other direction.
   *
   * `source: 'team'` is the whole difference: a file confirmed through this mount is one we
   * sent, so it emails the client rather than queueing a digest line, and a customer cannot
   * delete it. Sharing the handlers rather than writing a console copy is what stops the two
   * directions growing different rules about size, type or ownership.
   */
  one.use('/files', createProjectFileRoutes({ fileService, source: 'team' }));

  /* --------------------------------------------- monthly performance reports */

  one.get('/reports', requireCapability('project:read:any'), async (request, response) => {
    const project = requireProject(request);
    const reports = await reportService.listForProject(project.id, 24);
    response.json(success({ reports: reports.map(toAdminReportView) }));
  });

  /*
   * Compose or correct a month. Saving is not publishing — `POST /reports/:id/publish` below
   * is, and the two are separate for the reason the assessment review states at length: a flag
   * on a save is a checkbox somebody ticks by accident on the eighth revision, and the thing
   * on the other side of this one is an email that cannot be recalled.
   */
  one.put('/reports', requireCapability('project:write:any'), async (request, response) => {
    const project = requireProject(request);
    const auth = requireRequestAuth(request);
    const input = parseSaveReport(request.body);

    if (!project.ownerUserId) {
      throw new AppError(
        'VALIDATION_ERROR',
        'This project has no customer account attached, so a report would have nobody to appear for.',
      );
    }

    const saved = await reportService.save({
      ...input,
      projectId: project.id,
      userId: project.ownerUserId,
      preparedBy: auth.user.name,
    });

    response.status(201).json(success({ report: toAdminReportView(saved) }));
  });

  one.post(
    '/reports/:reportId/publish',
    requireCapability('project:write:any'),
    async (request, response) => {
      const project = requireProject(request);
      const report = await reportService.findById(pathParam(request.params, 'reportId'));

      /* Same rule as the feedback routes: the record has to be on this project. */
      if (!report || report.projectId !== project.id) {
        throw new AppError('NOT_FOUND', 'No report with that id.');
      }

      const published = await reportService.publish({
        report,
        to: { email: project.email, name: project.contactName },
        businessName: project.businessName,
      });

      response.json(success({ report: toAdminReportView(published) }));
    },
  );

  router.use('/projects/:projectId', one);

  /* ------------------------------------------------------------- accounts */

  /*
   * Who has an account, which is the question the rest of this surface cannot answer.
   *
   * It is not decoration: `POST /projects/:id/tasks` above refuses a project with no
   * `ownerUserId`, telling the operator a task "would have nobody to appear for" — and until
   * now there was no way to see which accounts exist or which project is attached to one. The
   * error was actionable and the information needed to act on it was nowhere.
   *
   * `requireCapability('customer:read:any')` in addition to the mount's `requireAdmin`. Today
   * it cannot fail — an admin holds every capability, and a customer was already answered
   * NOT_FOUND by the mount — so it is documentation plus the check that starts working on its
   * own the day a narrower staff role exists. That is the only reason it is here, and the
   * "enforces every capability somewhere" guard in `admin.api.test.ts` records which
   * capabilities are and are not enforced anywhere so the gap stays visible rather than
   * becoming folklore.
   */
  router.get('/accounts', requireCapability('customer:read:any'), async (request, response) => {
    const { limit, q, includeDemo } = parseQuery(listQuerySchema, request.query);
    const { rows, hasMore } = await page(limit, (bound) => authRepository.listUsers(bound, q));

    /*
     * No extra query here, unlike the project list: `StoredUser` already carries the flag,
     * which is the whole argument for putting it on the identity rather than on every row.
     */
    const users = includeDemo ? rows : rows.filter((user) => !user.demo);

    /*
     * Who among them has ever asked for anything.
     *
     * One query for the whole page rather than one per row — `findUserIdsWithRequests` takes
     * the batch — because the alternative is fifty round trips to fill in one column, which
     * is how a list page becomes the page nobody opens.
     *
     * This is the column DECISION 028 exists to produce. An account with no request is not a
     * gap in the data: it is somebody who came for an assessment, made an account, and
     * stopped — and before the funnel changed, that person was not in any list at all
     * because nothing about them had ever been written down.
     */
    const requested = await leadService.findUserIdsWithRequests(users.map((user) => user.id));

    /*
     * Mapped through `toAdminAccountView`, never spread. The stored record carries the
     * password hash field and the raw Google subject; an admin surface is still a browser,
     * and "staff can be trusted" is not a reason to send a credential to one.
     */
    response.json(
      success({
        accounts: users.map((user) => ({
          ...toAdminAccountView(user),
          hasRequested: requested.has(user.id),
        })),
        hasMore,
      }),
    );
  });

  /* ---------------------------------------------------------- onboarding */

  /*
   * ==========================================================================
   * THE SUBMISSIONS THAT MATCHED NOTHING
   * ==========================================================================
   *
   * Only the unmatched ones, deliberately. A submission that found its project is already on
   * that project's page, which is where somebody building the site is looking — and a second
   * list containing every submission would be a list whose useful rows are hidden among rows
   * that have nowhere else to be shown.
   *
   * So this is a worklist rather than an archive: everything on it needs a person to decide
   * where it goes, and it is empty when the matching is working.
   */
  router.get('/onboarding', requireCapability('project:read:any'), async (request, response) => {
    const { limit } = parseQuery(listQuerySchema, request.query);
    const { rows, hasMore } = await page(limit, (bound) => onboardingService.listUnmatched(bound));

    response.json(success({ submissions: rows.map(toOnboardingView), hasMore }));
  });

  /*
   * The manual match, for the case automatic matching cannot cover: somebody who paid under
   * one address and onboarded under another. The project comes from the body rather than the
   * path because the submission is the subject here — the operator is standing on the
   * worklist, deciding where a row belongs.
   */
  router.post(
    '/onboarding/:onboardingId/project',
    requireCapability('project:write:any'),
    async (request, response) => {
      const { projectId } = parseAttachOnboarding(request.body);

      const project = await projectService.findById(projectId);
      if (!project) throw new AppError('NOT_FOUND', 'No project with that id.');

      const attached = await onboardingService.attachToProject({
        onboardingId: pathParam(request.params, 'onboardingId'),
        projectId: project.id,
      });

      if (!attached) throw new AppError('NOT_FOUND', 'No submission with that id.');

      response.json(success({ submission: toOnboardingView(attached) }));
    },
  );

  /* ---------------------------------------------------------- assessments */

  /*
   * ==========================================================================
   * THE QUEUE FOR THE THING THE FRONT PAGE PROMISES
   * ==========================================================================
   *
   * Every marketing page ends in "Get my free website assessment". Somebody presses it,
   * makes an account, answers twenty questions — and until now the only trace of that on this
   * side was an email, in an inbox, competing with everything else in an inbox.
   *
   * So this is the operational surface for the primary offer, and it did not exist. Oldest
   * first, because the person who has been waiting longest is the one being let down, and
   * only the ones with no delivered review, because a list that also contained finished work
   * would be an archive rather than a queue. It is empty when nobody is waiting.
   */
  /* ------------------------------------------------------------- worklist */

  /*
   * `GET /admin/worklist` — what is going stale.
   *
   * A different question from the inbox's "who is waiting on a reply", which is why it is a
   * different endpoint and a different screen. Every group in it is a call to a method that
   * already existed for another surface; see the header of `worklist.ts` for why not one of
   * them may grow an opinion of its own.
   */
  router.get('/worklist', requireCapability('customer:read:any'), async (_request, response) => {
    const groups = await buildWorklist({
      assessmentService,
      reportService,
      onboardingService,
      projectService,
      leadService,
      authRepository,
      demoOwnerId,
    });

    response.json(success({ groups }));
  });

  /* ---------------------------------------------------------- assessments */

  router.get('/assessments', requireCapability('customer:read:any'), async (request, response) => {
    const { limit } = parseQuery(listQuerySchema, request.query);
    const { rows, hasMore } = await page(limit, (bound) =>
      assessmentService.listAwaitingReport(bound),
    );

    response.json(success({ assessments: rows.map(toAdminAssessmentView), hasMore }));
  });

  router.get('/assessments/:id', async (request, response) => {
    const assessment = await assessmentService.findById(pathParam(request.params, 'id'));
    if (!assessment) throw new AppError('NOT_FOUND', 'No assessment with that id.');
    /*
     * The admin view, which carries the draft. The customer's `toAssessmentView` deliberately
     * cannot represent an unpublished review at all — see its note — so the console needs the
     * other one or it would be editing a document it cannot read back.
     */
    response.json(success({ assessment: toAdminAssessmentView(assessment) }));
  });

  /*
   * Saving is not sending.
   *
   * `PATCH` writes the draft and changes nothing a customer can see; `POST /deliver` below is
   * the publication. Two routes rather than a `deliver: true` flag on this one, because a
   * flag on a save is a checkbox somebody ticks by accident on the eighth revision — and the
   * thing on the other side of it is an email that cannot be recalled.
   *
   * `preparedBy` comes from the session rather than the body. A byline a request could choose
   * is one that can be somebody else's name.
   */
  router.patch(
    '/assessments/:id/report',
    requireCapability('customer:read:any'),
    async (request, response) => {
      const assessment = await assessmentService.findById(pathParam(request.params, 'id'));
      if (!assessment) throw new AppError('NOT_FOUND', 'No assessment with that id.');

      const auth = requireRequestAuth(request);
      const draft = parseSaveAssessmentReport(request.body);

      const saved = await assessmentService.saveReport({
        assessment,
        draft: { ...draft, preparedBy: auth.user.name },
      });

      response.json(success({ assessment: toAdminAssessmentView(saved) }));
    },
  );

  router.post(
    '/assessments/:id/deliver',
    requireCapability('customer:read:any'),
    async (request, response) => {
      const assessment = await assessmentService.findById(pathParam(request.params, 'id'));
      if (!assessment) throw new AppError('NOT_FOUND', 'No assessment with that id.');

      /*
       * The recipient is resolved here rather than inside the service, matching the rule
       * `NotificationRecipient` states about itself: callers pass the address they already
       * hold rather than giving a domain service a repository it has no other use for. An
       * assessment carries a `userId` and a business name, and neither is an address.
       */
      const owner = await authRepository.findUserById(assessment.userId);

      if (!owner) {
        throw new AppError(
          'VALIDATION_ERROR',
          'The account that submitted this assessment no longer exists, so there is nobody to send the review to.',
        );
      }

      const delivered = await assessmentService.deliverReport({
        assessment,
        to: { email: owner.email, name: owner.name },
      });

      response.json(success({ assessment: toAdminAssessmentView(delivered) }));
    },
  );

  return router;
}
