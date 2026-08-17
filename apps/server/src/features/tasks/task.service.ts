import { AppError } from '../../lib/appError.js';
import type { Logger } from '../../lib/logger.js';
import type { ActivityRecorder } from '../activity/index.js';
import type { TaskRepository } from './task.repository.js';
import { ONBOARDING_TASKS, type StoredTask, type TaskKind } from './task.types.js';

export interface TaskService {
  /**
   * Seeds the onboarding set on a project. Idempotent: safe to call from a webhook
   * that Stripe may deliver more than once. Returns only the tasks it actually created.
   */
  seedOnboarding(params: {
    readonly projectId: string;
    readonly userId: string;
  }): Promise<readonly StoredTask[]>;
  addTask(params: {
    readonly projectId: string;
    readonly userId: string;
    readonly kind: TaskKind;
    readonly title: string;
    readonly description: string;
    readonly dueAt?: Date | undefined;
  }): Promise<StoredTask>;
  listForProject(projectId: string): Promise<readonly StoredTask[]>;
  listOpenForUser(userId: string): Promise<readonly StoredTask[]>;
  findById(id: string): Promise<StoredTask | null>;
  /**
   * Completes a task. The caller has already established that the requester owns the
   * project it belongs to — this does not re-derive that, it takes the task.
   */
  complete(task: StoredTask): Promise<StoredTask>;
  reopen(task: StoredTask): Promise<StoredTask>;
}

export interface TaskServiceDependencies {
  readonly repository: TaskRepository;
  readonly activity: ActivityRecorder;
  readonly logger: Logger;
  readonly now?: () => Date;
}

export function createTaskService(dependencies: TaskServiceDependencies): TaskService {
  const { repository, activity, logger } = dependencies;
  const now = dependencies.now ?? (() => new Date());

  return {
    async seedOnboarding({ projectId, userId }) {
      const created: StoredTask[] = [];

      for (const template of ONBOARDING_TASKS) {
        const task = await repository.create({
          projectId,
          userId,
          kind: template.kind,
          title: template.title,
          description: template.description,
          status: 'open',
        });

        // Null means the unique index refused it: this project already has that task,
        // which is the normal outcome of a retried webhook.
        if (task) created.push(task);
      }

      if (created.length > 0) {
        logger.info('tasks.onboarding_seeded', { projectId, count: created.length });
        await activity.record({
          type: 'task.created',
          summary: `We have added ${created.length} things we need from you to get started.`,
          audience: 'customer',
          projectId,
          userId,
        });
      }

      return created;
    },

    async addTask(params) {
      const task = await repository.create({
        projectId: params.projectId,
        userId: params.userId,
        kind: params.kind,
        title: params.title,
        description: params.description,
        status: 'open',
        dueAt: params.dueAt,
      });

      if (!task) {
        throw new AppError('CONFLICT', 'That task already exists on this project.');
      }

      await activity.record({
        type: 'task.created',
        summary: `New task: ${task.title}`,
        audience: 'customer',
        projectId: task.projectId,
        userId: task.userId,
      });

      return task;
    },

    listForProject: (projectId) => repository.listForProject(projectId),
    listOpenForUser: (userId) => repository.listOpenForUser(userId),
    findById: (id) => repository.findById(id),

    async complete(task) {
      const completed = await repository.complete(task.id, now());

      // Already completed. Return what is stored rather than failing a double-click.
      if (!completed) return task;

      await activity.record({
        type: 'task.completed',
        summary: `Completed: ${completed.title}`,
        audience: 'customer',
        projectId: completed.projectId,
        userId: completed.userId,
      });

      return completed;
    },

    async reopen(task) {
      const reopened = await repository.reopen(task.id);
      return reopened ?? task;
    },
  };
}
