import type { ReactNode } from 'react';
import { cx } from './cx';
import styles from './Table.module.css';

/*
 * ============================================================================
 * A TABLE THAT STOPS BEING A TABLE WHEN THERE IS NO ROOM
 * ============================================================================
 *
 * Two consumers today, both in the owner console: every project, and every account. They
 * shared one stylesheet before this, and `AccountsPage`'s header defended that as the right
 * answer at two consumers — "a third file holding `.table` for two consumers would be an
 * abstraction extracted at two; the Rule of Three says wait".
 *
 * That argument was about a *stylesheet*. What is extracted here is not a stylesheet, it is
 * three behaviours that were about to be written twice and are each easy to get subtly wrong:
 *
 *   1. **The scroll container is focusable and named.** A table wider than its column can be
 *      scrolled with a pointer and, without `tabIndex`, not at all with a keyboard — WCAG
 *      2.1.1, and the reason `eslint.config.js` widens `no-noninteractive-tabindex` to allow
 *      `role="region"`. Both consumers had this right; a third would have had to know.
 *   2. **It stacks below the tablet step.** Ten columns on a 320px screen is three viewports
 *      of horizontal scrolling, and 400% zoom is the same problem wearing different clothes.
 *   3. **Every cell carries its own column name.** A stacked cell reading "Linked" with no
 *      indication that the column was "Account" is worse than the scrolling it replaced —
 *      so `Cell` takes `label` and it is required, not optional.
 *
 * The third is why this is a component rather than a shared class: a `data-label` somebody
 * forgets is invisible on the desktop where it is written and wrong on the phone where it is
 * read. Making it a required prop means it cannot be forgotten.
 *
 * ## What this deliberately does not do
 *
 * No sorting, no filtering, no pagination, no column configuration, no row selection. There
 * is one operator and a handful of rows; `ProjectsPage` argues that case in full and it is
 * still the right one. This renders a table well and knows nothing about what is in it.
 * ============================================================================
 */

export interface TableProps {
  /**
   * Names the scroll region. Required: a focusable region with no accessible name is a tab
   * stop that announces nothing, which is worse than the problem the tab stop solves.
   */
  readonly label: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function Table({ label, children, className }: TableProps) {
  return (
    <div className={cx(styles['scroll'], className)} tabIndex={0} role="region" aria-label={label}>
      <table className={styles['table']}>{children}</table>
    </div>
  );
}

export interface TableCellProps {
  /**
   * The column this cell is in, repeated per cell.
   *
   * Rendered as the label beside the value once the table stacks. Required rather than
   * optional because the failure is invisible where it is written: a missing label looks
   * perfect on the desktop and produces an unlabelled value on the phone.
   */
  readonly label: string;
  readonly children: ReactNode;
}

/** A data cell. Use a plain `<th scope="row">` for the cell that names the row. */
export function TableCell({ label, children }: TableCellProps) {
  return <td data-label={label}>{children}</td>;
}
