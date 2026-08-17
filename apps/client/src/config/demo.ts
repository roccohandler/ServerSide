import { routes, appProjectPath } from './routes';

/*
 * ============================================================================
 * WHO THE DEMONSTRATION IS FOR, AND WHERE IT WALKS THEM
 * ============================================================================
 *
 * Two constants and no logic. Both are read by the `/promo` page and by the demo layer inside
 * the application, which is why they live in the feature both can reach rather than in either
 * one of them.
 * ============================================================================
 */

/**
 * The people this demonstration was set up for.
 *
 * **Not an environment variable.** It is not a secret, it is read by a browser, and a
 * `VITE_`-prefixed one would be inlined into the bundle anyway — so the only thing an
 * environment variable would buy is a deployment where nobody can tell from the source who
 * the banner names. Changing it is a one-line edit and a deploy, which is the right cost for
 * a fact this soft.
 *
 * It is **presentational only**. Nothing authorises against these names, nothing stores them,
 * and the passcode is one shared secret — there is no per-tester identity, and inventing one
 * would be a second authentication system bought to attribute a sentence nobody replies to.
 */
const TESTER_NAMES = ['John', 'Mason', 'Lukas'] as const;

/** `John, Mason and Lukas`. A list a person would say out loud, not `["John","Mason"]`. */
export const DEMO_TESTERS: string =
  TESTER_NAMES.length <= 1
    ? (TESTER_NAMES[0] ?? '')
    : `${TESTER_NAMES.slice(0, -1).join(', ')} and ${TESTER_NAMES.at(-1)}`;

export interface TourStop {
  /** Built at render time, because the project stop needs the id the seed produced. */
  readonly path: (projectId: string | undefined) => string;
  readonly title: string;
  readonly body: string;
}

/**
 * The guided walk through the customer experience.
 *
 * ============================================================================
 * WHAT THIS IS AND, MORE IMPORTANTLY, WHAT IT IS NOT
 * ============================================================================
 *
 * It is **data**: six stops, each a route and two strings. A stop is where to go and what to
 * look at when you get there, and anything richer would be a second description of a screen
 * that already describes itself.
 *
 * It is **not** a spotlight overlay, a coach-mark library, or a modal sequence. Every one of
 * those replaces the thing being demonstrated with a tutorial about it, and the premise of
 * this whole feature is that the demonstration *is* the real application. The tour navigates;
 * it never intercepts. Nothing is blocked, nothing is disabled, and nothing waits for the
 * tester to do the "right" thing — they can ignore it, click somewhere else entirely, and the
 * tour is still on the step they left it on.
 *
 * The order is the order a real customer meets these screens, which is the point: a tour that
 * visited them in feature order would demonstrate the sitemap rather than the experience.
 * ============================================================================
 */
export const DEMO_TOUR: readonly TourStop[] = [
  {
    path: () => routes.appDashboard,
    title: 'Where a client lands',
    body: 'One screen that answers the only question they actually have: is somebody working on this, or is it sitting on me? Everything else is one click from here.',
  },
  {
    path: (projectId) => (projectId ? appProjectPath(projectId) : routes.appProjects),
    title: 'Their website project',
    body: 'Progress in plain English — no jargon, no build logs. The launch date is here when we have set one, and it says when we last changed it.',
  },
  {
    path: (projectId) => (projectId ? `${appProjectPath(projectId)}/preview` : routes.appProjects),
    title: 'Approving the site',
    body: 'The preview, and the decision. Approving is a deliberate act with a record of who did it and when — never inferred from somebody writing "looks good".',
  },
  {
    path: (projectId) => (projectId ? `${appProjectPath(projectId)}/tasks` : routes.appProjects),
    title: 'What we need from them',
    body: 'The half of a website build that stalls. Every item says what it is for, and completing one tells us without an email.',
  },
  {
    path: () => routes.appAssessment,
    title: 'The free review',
    body: 'What the front page actually promises: a person looks at their website and writes it up. This is the thing that earns the right to ask for the sale.',
  },
  {
    path: () => routes.appBilling,
    title: 'What they have paid',
    body: 'Half up front, half at launch, and nothing hidden. In the demonstration the payment buttons are simulated — pressing one changes the state without going near a card.',
  },
];
