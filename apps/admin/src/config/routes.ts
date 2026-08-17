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
  /** The submissions that matched no project. A worklist — empty when all is well. */
  onboarding: '/onboarding',
  signIn: '/sign-in',
} as const;

/** Route patterns, relative to the console layout. Kept beside `routes` so both change together. */
export const routePatterns = {
  projects: 'projects',
  project: 'projects/:projectId',
  accounts: 'accounts',
  onboarding: 'onboarding',
} as const;

export function projectPath(projectId: string): string {
  return `${routes.projects}/${encodeURIComponent(projectId)}`;
}
