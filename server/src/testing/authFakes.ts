import type { AuthRepository } from '../features/auth/auth.repository.js';
import type {
  NewUserRecord,
  ProviderIdentity,
  StoredAuthToken,
  StoredSession,
  StoredUser,
  TokenPurpose,
  UserRole,
  UserUpdate,
} from '../features/auth/auth.types.js';
import type { AssessmentRepository } from '../features/assessments/assessment.repository.js';
import type {
  NewAssessmentRecord,
  StoredAssessment,
} from '../features/assessments/assessment.types.js';
import type { ProjectRepository } from '../features/projects/project.repository.js';
import type {
  NewProjectRecord,
  ProjectUpdate,
  StoredProject,
} from '../features/projects/project.types.js';
import type { TaskRepository } from '../features/tasks/task.repository.js';
import type { NewTaskRecord, StoredTask } from '../features/tasks/task.types.js';
import type { FeedbackRepository } from '../features/feedback/feedback.repository.js';
import type { NewCommentRecord, StoredComment } from '../features/feedback/feedback.types.js';
import type { DeploymentRepository } from '../features/deployments/deployment.repository.js';
import type {
  DeploymentEvent,
  StoredDeployment,
} from '../features/deployments/deployment.types.js';
import type { ActivityRepository } from '../features/activity/activity.repository.js';
import type { NewActivityRecord, StoredActivity } from '../features/activity/activity.types.js';
import type { IdentityVerifier, VerifiedIdentity } from '../features/auth/providers/identity.js';
import { IdentityVerificationError } from '../features/auth/providers/identity.js';

/*
 * In-memory doubles for the platform features, matching the style of `fakes.ts`.
 *
 * Every one of these implements the same interface the Mongo version does, including
 * the bits that look like implementation detail and are not: the duplicate-key throw on
 * a second user with one address, the null return from a second `complete` on the same
 * task, the "only if unowned" filter on `claimForOwner`. Those are the properties the
 * services rely on for idempotency, so a fake that is merely convenient would let a
 * double-submission bug pass its own test.
 */

/** What a Mongo duplicate-key error looks like to the code that catches one. */
export function duplicateKeyError(): Error & { code: number } {
  const error = new Error('E11000 duplicate key error') as Error & { code: number };
  error.code = 11000;
  return error;
}

export interface InMemoryAuthRepository extends AuthRepository {
  readonly users: StoredUser[];
  readonly sessions: Map<string, StoredSession>;
  readonly tokens: Map<string, StoredAuthToken>;
}

export function createInMemoryAuthRepository(
  options: { now?: () => Date } = {},
): InMemoryAuthRepository {
  const now = options.now ?? (() => new Date());
  const users: StoredUser[] = [];
  const sessions = new Map<string, StoredSession>();
  const tokens = new Map<string, StoredAuthToken>();
  let nextId = 1;

  function replace(id: string, next: StoredUser): StoredUser {
    const index = users.findIndex((user) => user.id === id);
    if (index >= 0) users[index] = next;
    return next;
  }

  return {
    users,
    sessions,
    tokens,

    async createUser(record: NewUserRecord) {
      const email = record.email.trim().toLowerCase();

      // The unique index, in memory. Without it the service's duplicate handling —
      // and the account-linking race it protects — would never be exercised.
      if (users.some((user) => user.email === email)) throw duplicateKeyError();

      const subject = record.identities[0]?.subject;
      if (
        subject &&
        users.some((user) => user.identities.some((identity) => identity.subject === subject))
      ) {
        throw duplicateKeyError();
      }

      const timestamp = now();
      const user: StoredUser = {
        ...record,
        email,
        identities: [...record.identities],
        id: `user-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      users.push(user);
      return user;
    },

    async findUserById(id: string) {
      return users.find((user) => user.id === id) ?? null;
    },

    async findUserByEmail(email: string) {
      const normalised = email.trim().toLowerCase();
      return users.find((user) => user.email === normalised) ?? null;
    },

    async findUserByIdentity(provider: 'google', subject: string) {
      return (
        users.find((user) =>
          user.identities.some(
            (identity) => identity.provider === provider && identity.subject === subject,
          ),
        ) ?? null
      );
    },

    async findUserByStripeCustomerId(stripeCustomerId: string) {
      return users.find((user) => user.stripeCustomerId === stripeCustomerId) ?? null;
    },

    async updateUser(id: string, update: UserUpdate) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) return null;

      const { passwordHash, ...rest } = update;

      return replace(id, {
        ...user,
        ...rest,
        // `null` removes the password, matching the repository's `$unset`.
        ...(passwordHash === null
          ? { passwordHash: undefined }
          : typeof passwordHash === 'string'
            ? { passwordHash }
            : {}),
        updatedAt: now(),
      });
    },

    async setRole(id: string, role: UserRole) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) return null;
      return replace(id, { ...user, role, updatedAt: now() });
    },

    async listUsers(limit: number) {
      /* Newest first, matching the Mongo sort, so a test asserting order is asserting the
         real behaviour rather than insertion order. */
      return [...users]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async linkIdentity(id: string, identity: ProviderIdentity) {
      const user = users.find((candidate) => candidate.id === id);
      if (!user) return null;

      // No-op when that provider is already linked — same as the `$ne` filter.
      if (user.identities.some((existing) => existing.provider === identity.provider)) return user;

      return replace(id, {
        ...user,
        identities: [...user.identities, identity],
        updatedAt: now(),
      });
    },

    async createSession(record) {
      const session: StoredSession = {
        id: `session-${sessions.size + 1}`,
        userId: record.userId,
        expiresAt: record.expiresAt,
        createdAt: now(),
        lastUsedAt: now(),
      };
      sessions.set(record.tokenHash, session);
      return session;
    },

    async findSessionByTokenHash(tokenHash: string) {
      return sessions.get(tokenHash) ?? null;
    },

    async touchSession(tokenHash: string, expiresAt: Date) {
      const session = sessions.get(tokenHash);
      if (session) sessions.set(tokenHash, { ...session, expiresAt, lastUsedAt: now() });
    },

    async deleteSession(tokenHash: string) {
      sessions.delete(tokenHash);
    },

    async deleteSessionsForUser(userId: string) {
      for (const [hash, session] of sessions) {
        if (session.userId === userId) sessions.delete(hash);
      }
    },

    async createAuthToken(record) {
      tokens.set(record.tokenHash, {
        userId: record.userId,
        purpose: record.purpose,
        expiresAt: record.expiresAt,
        createdAt: now(),
      });
    },

    async consumeAuthToken(tokenHash: string, purpose: TokenPurpose) {
      const token = tokens.get(tokenHash);
      if (!token || token.purpose !== purpose) return null;
      // Atomic read-and-delete, which is what makes these links single-use.
      tokens.delete(tokenHash);
      return token;
    },

    async deleteAuthTokens(userId: string, purpose: TokenPurpose) {
      for (const [hash, token] of tokens) {
        if (token.userId === userId && token.purpose === purpose) tokens.delete(hash);
      }
    },
  };
}

/* ------------------------------------------------------------------ identity */

export interface StubIdentityVerifier extends IdentityVerifier {
  /** What the next `verify` returns. */
  setIdentity(identity: VerifiedIdentity): void;
  /** What the next `verify` throws instead. */
  setFailure(reason: IdentityVerificationError['reason']): void;
}

/**
 * Stands in for Google.
 *
 * It is a stub of the *verifier*, not of the transport, which is the important line:
 * the real verifier's own tests feed it real signed and unsigned tokens. Everything
 * above it is entitled to assume a `VerifiedIdentity` has already been proven, and this
 * is what lets the account-linking rules be tested without minting RSA keys.
 */
export function createStubIdentityVerifier(): StubIdentityVerifier {
  let identity: VerifiedIdentity | null = null;
  let failure: IdentityVerificationError['reason'] | null = null;

  return {
    setIdentity(next) {
      identity = next;
      failure = null;
    },
    setFailure(reason) {
      failure = reason;
      identity = null;
    },
    async verify() {
      if (failure) throw new IdentityVerificationError(failure, 'stubbed failure');
      if (!identity) throw new IdentityVerificationError('malformed', 'no identity queued');
      return identity;
    },
  };
}

export function buildGoogleIdentity(overrides: Partial<VerifiedIdentity> = {}): VerifiedIdentity {
  return {
    provider: 'google',
    subject: 'google-subject-1',
    email: 'dana@cascadeheating.example',
    emailVerified: true,
    name: 'Dana Reyes',
    ...overrides,
  };
}

/* ---------------------------------------------------------------- assessments */

export function createInMemoryAssessmentRepository(
  options: { now?: () => Date } = {},
): AssessmentRepository & { readonly assessments: StoredAssessment[] } {
  const now = options.now ?? (() => new Date());
  const assessments: StoredAssessment[] = [];
  let nextId = 1;

  return {
    assessments,

    async create(record: NewAssessmentRecord) {
      const timestamp = now();
      const assessment: StoredAssessment = {
        ...record,
        id: `assessment-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      assessments.push(assessment);
      return assessment;
    },

    async findById(id: string) {
      return assessments.find((assessment) => assessment.id === id) ?? null;
    },

    async listForUser(userId: string, limit: number) {
      return assessments
        .filter((assessment) => assessment.userId === userId)
        .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        .slice(0, limit);
    },

    async findLatestForUser(userId: string) {
      return (
        assessments
          .filter((assessment) => assessment.userId === userId)
          .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0] ?? null
      );
    },

    async findRecentForUser(userId: string, since: Date) {
      return (
        assessments
          .filter(
            (assessment) =>
              assessment.userId === userId && assessment.submittedAt.getTime() >= since.getTime(),
          )
          .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())[0] ?? null
      );
    },
  };
}

/* ------------------------------------------------------------------- projects */

export function createInMemoryProjectRepository(
  options: { now?: () => Date } = {},
): ProjectRepository & { readonly projects: StoredProject[] } {
  const now = options.now ?? (() => new Date());
  const projects: StoredProject[] = [];
  let nextId = 1;

  return {
    projects,

    async create(record: NewProjectRecord) {
      const timestamp = now();
      const project: StoredProject = {
        ...record,
        id: `project-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      projects.push(project);
      return project;
    },

    async findById(id: string) {
      return projects.find((project) => project.id === id) ?? null;
    },

    async listByOwner(userId: string, limit: number) {
      return projects
        .filter((project) => project.ownerUserId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async listAll(limit: number) {
      return [...projects]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async update(id: string, update: ProjectUpdate) {
      const index = projects.findIndex((project) => project.id === id);
      if (index === -1) return null;

      // `null` clears, matching the repository's `$unset`.
      const cleaned: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(update)) {
        if (value === null) cleaned[key] = undefined;
        else if (value !== undefined) cleaned[key] = value;
      }

      const updated = {
        ...(projects[index] as StoredProject),
        ...cleaned,
        updatedAt: now(),
      } as StoredProject;

      projects[index] = updated;
      return updated;
    },

    async claimForOwner(id: string, userId: string) {
      const index = projects.findIndex((project) => project.id === id);
      if (index === -1) return null;

      // Only an unowned project. A project that belongs to somebody is never reassigned.
      const project = projects[index] as StoredProject;
      if (project.ownerUserId) return null;

      const updated: StoredProject = { ...project, ownerUserId: userId, updatedAt: now() };
      projects[index] = updated;
      return updated;
    },

    async countForOwner(userId: string) {
      return projects.filter((project) => project.ownerUserId === userId).length;
    },
  };
}

/* ---------------------------------------------------------------------- tasks */

export function createInMemoryTaskRepository(
  options: { now?: () => Date } = {},
): TaskRepository & { readonly tasks: StoredTask[] } {
  const now = options.now ?? (() => new Date());
  const tasks: StoredTask[] = [];
  let nextId = 1;

  return {
    tasks,

    async create(record: NewTaskRecord) {
      /*
       * The partial unique index, in memory: one task per project per kind, except
       * `custom`. This is what makes seeding idempotent, so a fake without it would let
       * a duplicate-webhook bug pass.
       */
      if (
        record.kind !== 'custom' &&
        tasks.some((task) => task.projectId === record.projectId && task.kind === record.kind)
      ) {
        return null;
      }

      const timestamp = now();
      const task: StoredTask = {
        ...record,
        id: `task-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tasks.push(task);
      return task;
    },

    async findById(id: string) {
      return tasks.find((task) => task.id === id) ?? null;
    },

    async listForProject(projectId: string) {
      return tasks
        .filter((task) => task.projectId === projectId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    async listOpenForUser(userId: string) {
      return tasks
        .filter((task) => task.userId === userId && task.status === 'open')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    async complete(id: string, completedAt: Date) {
      const index = tasks.findIndex((task) => task.id === id);
      if (index === -1) return null;

      // Only an open task, so a second completion is a no-op rather than a second event.
      const task = tasks[index] as StoredTask;
      if (task.status !== 'open') return null;

      const updated: StoredTask = { ...task, status: 'completed', completedAt, updatedAt: now() };
      tasks[index] = updated;
      return updated;
    },

    async reopen(id: string) {
      const index = tasks.findIndex((task) => task.id === id);
      if (index === -1) return null;
      const task = tasks[index] as StoredTask;
      if (task.status !== 'completed') return null;

      const updated: StoredTask = {
        ...task,
        status: 'open',
        completedAt: undefined,
        updatedAt: now(),
      };
      tasks[index] = updated;
      return updated;
    },
  };
}

/* ------------------------------------------------------------------- feedback */

export function createInMemoryFeedbackRepository(
  options: { now?: () => Date } = {},
): FeedbackRepository & { readonly comments: StoredComment[] } {
  const now = options.now ?? (() => new Date());
  const comments: StoredComment[] = [];
  let nextId = 1;

  return {
    comments,

    async create(record: NewCommentRecord) {
      const timestamp = now();
      const comment: StoredComment = {
        ...record,
        id: `comment-${nextId++}`,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      comments.push(comment);
      return comment;
    },

    async findById(id: string) {
      return comments.find((comment) => comment.id === id) ?? null;
    },

    async listForProject(projectId: string) {
      return comments
        .filter((comment) => comment.projectId === projectId)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    },

    async resolve(id: string, resolvedByUserId: string, resolvedAt: Date) {
      const index = comments.findIndex((comment) => comment.id === id);
      if (index === -1) return null;

      const comment = comments[index] as StoredComment;
      if (comment.resolvedAt) return null;

      const updated: StoredComment = {
        ...comment,
        resolvedAt,
        resolvedByUserId,
        updatedAt: now(),
      };
      comments[index] = updated;
      return updated;
    },

    async reopen(id: string) {
      const index = comments.findIndex((comment) => comment.id === id);
      if (index === -1) return null;

      const updated: StoredComment = {
        ...(comments[index] as StoredComment),
        resolvedAt: undefined,
        resolvedByUserId: undefined,
        updatedAt: now(),
      };
      comments[index] = updated;
      return updated;
    },

    async countUnresolvedRoots(projectId: string) {
      return comments.filter(
        (comment) => comment.projectId === projectId && !comment.parentId && !comment.resolvedAt,
      ).length;
    },
  };
}

/* ---------------------------------------------------------------- deployments */

export function createInMemoryDeploymentRepository(
  options: { now?: () => Date } = {},
): DeploymentRepository & { readonly deployments: StoredDeployment[] } {
  const now = options.now ?? (() => new Date());
  const deployments: StoredDeployment[] = [];
  let nextId = 1;

  return {
    deployments,

    async upsert(event: DeploymentEvent) {
      const index = deployments.findIndex(
        (deployment) =>
          deployment.provider === event.provider && deployment.externalId === event.externalId,
      );

      if (index === -1) {
        const timestamp = now();
        const deployment: StoredDeployment = {
          ...event,
          id: `deployment-${nextId++}`,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        deployments.push(deployment);
        return { deployment, stateChanged: true };
      }

      const existing = deployments[index] as StoredDeployment;
      const updated: StoredDeployment = {
        ...existing,
        ...event,
        // A later event without a URL must not erase the one an earlier one set.
        url: event.url ?? existing.url,
        updatedAt: now(),
      };
      deployments[index] = updated;

      return { deployment: updated, stateChanged: existing.state !== event.state };
    },

    async listForProject(projectId: string, limit: number) {
      return deployments
        .filter((deployment) => deployment.projectId === projectId)
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .slice(0, limit);
    },

    async findLatestReady(projectId: string, environment: DeploymentEvent['environment']) {
      return (
        deployments
          .filter(
            (deployment) =>
              deployment.projectId === projectId &&
              deployment.environment === environment &&
              deployment.state === 'ready',
          )
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0] ?? null
      );
    },
  };
}

/* ------------------------------------------------------------------- activity */

export function createInMemoryActivityRepository(
  options: { now?: () => Date } = {},
): ActivityRepository & { readonly entries: StoredActivity[] } {
  const now = options.now ?? (() => new Date());
  const entries: StoredActivity[] = [];
  let nextId = 1;

  return {
    entries,

    async record(record: NewActivityRecord) {
      const activity: StoredActivity = {
        ...record,
        id: `activity-${nextId++}`,
        createdAt: now(),
      };
      entries.push(activity);
      return activity;
    },

    async listForUser({ userId, limit, customerVisibleOnly }) {
      return entries
        .filter(
          (entry) =>
            entry.userId === userId && (!customerVisibleOnly || entry.audience === 'customer'),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },

    async listForProject({ projectId, limit, customerVisibleOnly }) {
      return entries
        .filter(
          (entry) =>
            entry.projectId === projectId &&
            (!customerVisibleOnly || entry.audience === 'customer'),
        )
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    },
  };
}
