import { NavLink } from 'react-router-dom';
import { cx } from './cx';
import styles from './Tabs.module.css';

/*
 * ============================================================================
 * TABS THAT ARE ROUTES, AND WHY THEY MUST STAY THAT WAY
 * ============================================================================
 *
 * One consumer today — the customer's project page, four views over one response.
 *
 * ## This is deliberately not an ARIA tablist
 *
 * The obvious implementation is `role="tablist"` with `role="tab"`, `aria-selected` and
 * `aria-controls`, and it would be wrong here. That pattern describes panels swapped by
 * JavaScript inside one document: arrow keys move between tabs, only one panel exists at a
 * time, and there is no URL for any of them.
 *
 * These are navigation. `ProjectPage`'s own comment says why and it is a product decision,
 * not a technical one: "the four project views are routes rather than local state, so a
 * customer can send somebody a link to their preview and the back button moves between tabs
 * the way it should." Dressing links as tabs would take both of those away and announce a
 * keyboard model — arrow keys — that the links do not implement.
 *
 * So it is a `<nav>` of links that *look* like tabs, and `aria-current="page"` marks the one
 * you are on. That is what `NavLink` gives for free, and it is the truthful description.
 *
 * ## The count belongs in the label
 *
 * "Things we need (3)" rather than a number in a badge beside it, so a screen reader hears
 * the count as part of the destination rather than as a loose number after it.
 * ============================================================================
 */

export interface TabsProps {
  /** Names the navigation. "This project", not "Tabs" — it says what is being navigated. */
  readonly label: string;
  readonly items: readonly TabItem[];
  readonly className?: string;
}

export interface TabItem {
  readonly to: string;
  readonly label: string;
  /**
   * Matches the path exactly rather than by prefix.
   *
   * Needed by the first tab in a set, whose path is the parent of all the others: without it
   * "Overview" stays marked current while somebody is on Preview.
   */
  readonly end?: boolean;
}

export function Tabs({ label, items, className }: TabsProps) {
  return (
    <nav className={cx(styles['tabs'], className)} aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          className={({ isActive }) => cx(styles['tab'], isActive && styles['tabActive'])}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
