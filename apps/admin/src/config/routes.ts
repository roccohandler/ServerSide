/*
 * Every path in the console, in one place.
 *
 * Short, because the console *is* the site: there is no `/admin` prefix any more. That
 * prefix existed to carve a staff surface out of the customer application's URL space, and
 * the origin does that job now — `admin.example.com/projects` cannot collide with anything
 * a customer can reach, because a customer is not on this host.
 */
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
