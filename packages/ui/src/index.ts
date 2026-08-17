/*
 * ============================================================================
 * THE DESIGN SYSTEM'S PUBLIC API
 * ============================================================================
 *
 * Every primitive a screen is allowed to compose from. A raw `<button>`, `<input>`,
 * `.card` or `.badge` class in a screen is a defect, not a shortcut — this is the list of
 * things to reach for instead.
 *
 * ## This barrel is safe to import; a feature's is not always
 *
 * Everything here is in the eager bundle already, so a static import through this file
 * costs nothing that was not already downloaded. That is *not* true of `lazy()`: routing
 * a dynamic import through any barrel merges chunks `scripts/check-budget.ts` exists to
 * keep apart, which is why `app/routes/*.tsx` reaches concrete modules.
 *
 * ## Nothing here may import from `features/`
 *
 * Shared UI that knows a business capability cannot be used without that capability
 * coming with it. ESLint fails the build on it — see the boundaries block in
 * `eslint.config.js`, and `session/` for the worked example of the alternative.
 * ============================================================================
 */

export { Button, ButtonLink } from './Button';
export { Card } from './Card';
export type { CardProps } from './Card';
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { Container, Section, SectionHeading, Grid } from './Layout';
export type {
  ContainerProps,
  SectionProps,
  SectionTone,
  SectionHeadingProps,
  GridProps,
} from './Layout';
export { Icon } from './Icon';
export type { IconProps, IconName } from './Icon';

/*
 * ============================================================================
 * THE STATE LAYER — DECISION 029
 * ============================================================================
 *
 * Eight primitives added on 2026-08-15. Two of them — `Table` and `Tabs` — replace code that
 * already existed twice over. Six landed with no consumer at all, which is what DECISION 029
 * amended composition rule 6 to permit.
 *
 * ## The amendment turned out to be narrower than it needed to be
 *
 * The rule now reads "no speculative surface in an **eager** bundle", on the reasoning that
 * this barrel is eager so an unused export is weight every visitor downloads. **That was
 * measured after the fact and it is not true.** Rollup drops a barrel export nothing imports,
 * and the CSS module goes with it because its import lives inside the dropped file — adding
 * `Modal` and `Drawer` moved the eager bundle by exactly zero bytes, and `aria-modal` appears
 * in no chunk in `dist`.
 *
 * So the payload objection does not apply to a tree-shakeable module at all. What remains of
 * rule 6 here is the part worth keeping: an unused component is untested against real use, and
 * every one of these is a maintenance obligation that starts the day it lands. That is why the
 * six carry unusually thorough tests rather than unusually thorough arguments.
 *
 * `design-system.md` §7 lists what is still deliberately absent and the call-site count that
 * would justify each.
 * ============================================================================
 */
export { Table, TableCell } from './Table';
export type { TableProps, TableCellProps } from './Table';
export { Tabs } from './Tabs';
export type { TabsProps, TabItem } from './Tabs';
export { Modal } from './Modal';
export type { ModalProps } from './Modal';
export { Toast } from './Toast';
export type { ToastProps, ToastTone } from './Toast';
export { Drawer } from './Drawer';
export type { DrawerProps } from './Drawer';
export { Tooltip } from './Tooltip';
export type { TooltipProps } from './Tooltip';
export { Switch } from './Switch';
export type { SwitchProps } from './Switch';
export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { Reveal } from './Reveal';
export {
  TextField,
  PasswordField,
  TextAreaField,
  SelectField,
  RadioGroupField,
  Honeypot,
} from './Field';
export { cx } from './cx';

/*
 * The one hook here, and the reason it is here rather than in either app.
 *
 * `useResource` is not a primitive — it renders nothing. It is in this package because
 * both frontends load-one-thing-then-act-on-it and because it moved here the day the
 * owner console became its own bundle: two copies of a state machine that disagree about
 * what happens after a *failed* write is exactly the drift its own header describes, and
 * an app boundary is no protection against it. Nothing else non-visual belongs here
 * without the same two-consumers-today argument.
 */
export { useResource } from './useResource';
export type { Resource } from './useResource';

/*
 * The same argument, for the same reason. `useAnnouncerState` decides *when a message counts
 * as new*, which is behaviour; the region it is rendered into, and the words that go in it,
 * belong to whichever surface is speaking. Both applications need the first and neither
 * should share the second — DECISION 027 in one line.
 */
export { useAnnouncerState } from './useAnnouncerState';
export type { Announcer } from './useAnnouncerState';

/*
 * And the third: the threshold below which a loading state is not worth showing. Five
 * comments across both applications argued for that threshold and none of them had a number,
 * so all five spelled it as "nothing, ever". One number, one place.
 */
export { useDelayedFlag } from './useDelayedFlag';

/*
 * And the fourth. Both shells need to know whether the browser has a network; each says so
 * in its own voice on its own ground. See the note in the file about what `navigator.onLine`
 * actually proves, which is less than its name suggests.
 */
export { useOnlineStatus } from './useOnlineStatus';

/*
 * And the fifth. What `data-theme` may say, where it is written down, and what happens when
 * two tabs disagree are one set of answers; the control that offers them is each
 * application's own. `applyTheme` is exported alongside because two places outside React
 * need it — the bootstrap in `index.html`, and the demo subtree, which pins itself.
 */
export { useTheme, applyTheme, THEME_STORAGE_KEY } from './useTheme';
export type { Theme } from './useTheme';

/*
 * And the sixth. Both applications have long forms and both had the same one-line
 * `beforeunload` hook, written twice — and neither could see an in-app navigation, which is
 * the departure a single-page application makes easy. One copy, and the `pending` half is
 * rendered by whichever application is asking. See the note in the file about why this is not
 * `useBlocker`, which is a measurement rather than a preference.
 */
export { useUnsavedChanges } from './useUnsavedChanges';
export type { UnsavedChanges } from './useUnsavedChanges';
