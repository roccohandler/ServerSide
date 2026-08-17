import { Button } from '@jobforge/ui';
import { Icon } from '@jobforge/ui';
import type { FileView, TaskView } from '@jobforge/shared';
import { FileUpload } from './FileUpload';
import styles from './Project.module.css';

/*
 * What the build is waiting on.
 *
 * Open tasks first and completed ones underneath, because the list exists to answer
 * "what is left" rather than to be a record. Completed ones stay visible so somebody
 * can see they were done rather than wondering whether they submitted anything.
 *
 * There is no due date rendered even though the model carries one: inventing urgency
 * for a business owner who is on a roof is how a helpful list becomes a nagging one.
 */
export interface TaskListProps {
  readonly projectId: string;
  readonly tasks: readonly TaskView[];
  /** Every file on the project. Used to say what a task already has against it. */
  readonly files: readonly FileView[];
  readonly busy: boolean;
  onComplete(taskId: string): void;
  onUploaded(): void;
}

/**
 * Tasks whose whole point is a file.
 *
 * Read from the kind rather than from the wording, because the wording is the owner's and
 * changes. The server applies the same prefix test to refuse "done" with nothing attached —
 * see `project.routes.ts` — so the control appearing here and the rule there cannot disagree
 * about which tasks need a file.
 */
function needsFile(kind: string): boolean {
  return kind.startsWith('upload-');
}

export function TaskList({ projectId, tasks, files, busy, onComplete, onUploaded }: TaskListProps) {
  const open = tasks.filter((task) => task.status === 'open');
  const done = tasks.filter((task) => task.status === 'completed');

  return (
    <section className={styles['panel']} aria-labelledby="tasks-heading">
      <h2 id="tasks-heading" className={styles['panelTitle']}>
        Things we need from you
      </h2>

      {open.length === 0 ? (
        <p className={styles['panelBody']}>
          {tasks.length === 0
            ? 'Nothing yet. When we need something from you it will appear here.'
            : 'Nothing outstanding — thank you. We will let you know if anything else comes up.'}
        </p>
      ) : (
        <ul className={styles['taskList']}>
          {open.map((task) => {
            const attached = files.filter((file) => file.taskId === task.id);
            const wantsFile = needsFile(task.kind);

            return (
              <li key={task.id} className={styles['task']}>
                <div className={styles['taskText']}>
                  <h3 className={styles['taskTitle']}>{task.title}</h3>
                  <p className={styles['taskDescription']}>{task.description}</p>

                  {/*
                   * What is already against this task, named. "1 file attached" would make
                   * somebody open the Files panel to find out whether it was the right one;
                   * the filename is the whole answer and it is one line.
                   */}
                  {attached.length > 0 ? (
                    <p className={styles['taskAttached']}>
                      {attached.map((file) => file.filename).join(', ')}
                    </p>
                  ) : null}
                </div>

                {/*
                 * The upload sits *before* "Mark done" for a task that asked for a file,
                 * because that is the order the work happens in — and because the server
                 * refuses the second without the first. An interface whose controls are in
                 * the order they can be used is an interface that does not need the error.
                 */}
                <div className={styles['taskActions']}>
                  {wantsFile ? (
                    <FileUpload
                      projectId={projectId}
                      taskId={task.id}
                      label={attached.length > 0 ? 'Add another' : 'Choose a file'}
                      multiple={task.kind === 'upload-photos'}
                      onUploaded={onUploaded}
                    />
                  ) : null}

                  <Button
                    variant="secondary"
                    onClick={() => onComplete(task.id)}
                    loading={busy}
                    /*
                     * The title is in the accessible name, so a screen reader hears "Mark
                     * done: Send us your logo" rather than five identical "Mark done"
                     * buttons with no way to tell them apart.
                     */
                    aria-label={`Mark done: ${task.title}`}
                  >
                    Mark done
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {done.length > 0 ? (
        <>
          <h3 className={styles['taskDoneHeading']}>Done</h3>
          <ul className={styles['taskList']}>
            {done.map((task) => (
              <li key={task.id} className={styles['taskDone']}>
                <Icon name="check" size={18} className={styles['taskDoneIcon']} />
                <span>{task.title}</span>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
