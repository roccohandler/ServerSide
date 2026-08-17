/*
 * Every path in the console, in one place.
 *
 * Short, and they stay short: these are paths *within* the console, and where the console
 * itself is mounted is `CONSOLE_BASENAME` below. DECISION 034 put it back under `/admin` on
 * the customer origin, and not one entry in this table changed — which is the point of a
 * router basename and the reason the prefix is not written into forty strings.
 */

/**
 * Where the console is mounted, with no trailing slash.
 *
 * ============================================================================
 * THE SLASH THAT MADE THE WHOLE CONSOLE RENDER NOTHING
 * ============================================================================
 *
 * Vite's `import.meta.env.BASE_URL` is `'/admin/'` — it always carries a trailing slash,
 * because its job is to be concatenated with an asset path. React Router's basename has the
 * opposite requirement, and it fails in the least helpful way possible:
 *
 *     <Router basename="/admin/"> is not able to match the URL "/admin"
 *     because it does not start with the basename, so the <Router> won't render anything.
 *
 * `stripBasename` tests `pathname.startsWith(basename)` *before* it normalises anything, and
 * `'/admin'.startsWith('/admin/')` is false. So the one URL somebody actually types — the bare
 * `/admin`, with no trailing slash — is the single URL that does not match. `/admin/` worked
 * fine, which is what made it look like a deployment problem rather than a code one: the
 * document loaded, the CSS loaded, the JavaScript ran, and the page was blank with one warning
 * in a console nobody had open.
 *
 * The comment this replaces asserted that React Router ignores a trailing slash on a basename.
 * It does not, and it shipped.
 *
 * Derived rather than hard-coded, so this and Vite's `base` cannot disagree.
 *
 * ## Why the normalisation is an exported function and not an inline `.replace`
 *
 * Because under Vitest `import.meta.env.BASE_URL` is `'/'`, not `'/admin/'` — the test run does
 * not build through the production `base`. So a test that only inspected `CONSOLE_BASENAME`
 * would assert `'/'` is fine and pass **exactly as it did on the day this shipped broken**.
 * The guard has to be able to hand in `'/admin/'` itself, which means the arithmetic has to be
 * callable. See `basename.test.tsx`.
 * ============================================================================
 */
export function normaliseBasename(base: string): string {
  return base.replace(/\/+$/, '') || '/';
}

export const CONSOLE_BASENAME = normaliseBasename(import.meta.env.BASE_URL);
export const routes = {
  inbox: '/',
  projects: '/projects',
  accounts: '/accounts',
  /**
   * The queue for the primary offer: everybody who asked for a free website assessment and
   * has not had one. Oldest first, empty when nobody is waiting.
   */
  assessments: '/assessments',
  /** The submissions that matched no project. A worklist — empty when all is well. */
  onboarding: '/onboarding',
  /**
   * What has gone quiet — a different question from the Inbox's "who is waiting on a reply".
   *
   * Its own screen rather than a panel on the Inbox, because the two answer different
   * questions and a reader who has to work out which half of a page applies to which question
   * ends up trusting neither.
   */
  today: '/today',
  signIn: '/sign-in',
} as const;

/** Route patterns, relative to the console layout. Kept beside `routes` so both change together. */
export const routePatterns = {
  projects: 'projects',
  project: 'projects/:projectId',
  accounts: 'accounts',
  assessments: 'assessments',
  onboarding: 'onboarding',
  today: 'today',
} as const;

export function projectPath(projectId: string): string {
  return `${routes.projects}/${encodeURIComponent(projectId)}`;
}
