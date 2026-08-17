/**
 * The pattern layer's public API.
 *
 * A pattern composes primitives into a recurring *solution* — "this page is loading",
 * "score this thing", "show this inside a device". It holds no business logic; a pattern
 * that knows what a project is belongs in the feature that owns projects.
 *
 * The bar for adding one is two or more features actually using it today. `AppState` has
 * eleven call sites across two boundaries, `ScoreScale` two, `DeviceFrame` six, and `Notice`
 * replaced ten hand-written treatments across five stylesheets.
 */

export { AppLoading, AppError, AppEmpty } from './AppState';
export type { AppErrorProps, AppEmptyProps } from './AppState';

/*
 * `Notice` is about an *operation*; `AppState` is about the page's own data. `AppError`
 * replaces the content when a load failed, a `Notice` sits beside content that is fine.
 * Keeping them separate is what stops one of them growing a prop meaning "actually, be the
 * other one".
 */
export { Notice, NoticeAction } from './Notice';
export type { NoticeProps, NoticeTone, NoticeActionProps } from './Notice';

export { ScoreScale } from './ScoreScale';
export type { ScoreScaleProps, ScorePoint } from './ScoreScale';

export { BrowserFrame, PhoneFrame } from './DeviceFrame';
