import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import type { TaskView } from '../../../types/api';
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
  readonly tasks: readonly TaskView[];
  readonly busy: boolean;
  onComplete(taskId: string): void;
}

export function TaskList({ tasks, busy, onComplete }: TaskListProps) {
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
          {open.map((task) => (
            <li key={task.id} className={styles['task']}>
              <div className={styles['taskText']}>
                <h3 className={styles['taskTitle']}>{task.title}</h3>
                <p className={styles['taskDescription']}>{task.description}</p>
              </div>
              <Button
                variant="secondary"
                onClick={() => onComplete(task.id)}
                disabled={busy}
                /*
                 * The title is in the accessible name, so a screen reader hears "Mark
                 * done: Send us your logo" rather than five identical "Mark done"
                 * buttons with no way to tell them apart.
                 */
                aria-label={`Mark done: ${task.title}`}
              >
                Mark done
              </Button>
            </li>
          ))}
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
