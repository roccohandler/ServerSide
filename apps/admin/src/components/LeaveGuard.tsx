import { Button, Modal, useUnsavedChanges } from '@jobforge/ui';
import styles from './LeaveGuard.module.css';

/*
 * ============================================================================
 * "YOU HAVE NOT FINISHED THIS"
 * ============================================================================
 *
 * A component rather than a bare hook, because the in-app half of `useUnsavedChanges` has
 * something to render and the `beforeunload` half does not. Four call sites would otherwise
 * each be writing the same dialog, and four copies of a confirmation is how three of them end
 * up saying something slightly different about the same risk.
 *
 * The customer application has its own copy — DECISION 026's arrangement again: the
 * behaviour is one hook in `@jobforge/ui`, the dialog belongs to whichever bar it appears
 * in. The words differ because what is at stake differs: a customer loses a change request,
 * an owner loses a reply somebody has been waiting for.
 *
 * ## Staying is the safe choice, so staying is the default action
 *
 * "Stay on this page" is the primary button and the one focus lands on. The reader clicked a
 * link, so leaving is what they *said* they wanted — but they said it without knowing it
 * would cost them the form, and the whole reason this dialog exists is that the cost was
 * invisible. Making the destructive option the emphasised one would turn a safeguard into a
 * speed bump on the way to the same loss.
 *
 * ## What it covers
 *
 * See the header of `useUnsavedChanges` in `@jobforge/ui` — including what it deliberately
 * does not cover, which is the back button, and why.
 * ============================================================================
 */

export function LeaveGuard({ dirty }: { readonly dirty: boolean }) {
  const { pending, proceed, cancel } = useUnsavedChanges(dirty);

  if (!pending) return null;

  return (
    <Modal
      open
      title="You have not sent this"
      onClose={cancel}
      footer={
        <div className={styles['actions']}>
          <Button type="button" onClick={cancel}>
            Stay on this page
          </Button>
          <Button type="button" variant="ghost" onClick={proceed}>
            Leave and lose it
          </Button>
        </div>
      }
    >
      <p className={styles['body']}>
        This reply has not been sent. If you leave now it is not kept, and the person waiting for it
        is still waiting.
      </p>
    </Modal>
  );
}
