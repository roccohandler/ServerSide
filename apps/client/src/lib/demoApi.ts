import { httpGet, httpPost } from './http';
import type { ApiResult, PublicUser } from '@jobforge/shared';

/*
 * ============================================================================
 * THE FOUR DEMO ENDPOINTS
 * ============================================================================
 *
 * None of them decides anything. `enter` posts a passcode the server compares; the other
 * three are refused by the server for any account without the `demo` flag, whatever this
 * bundle believes about itself.
 *
 * **There is no passcode in this file, and there must never be one.** It is not a constant
 * here, not a fallback, not a default, and not in `import.meta.env` — a `VITE_`-prefixed
 * variable is inlined into the bundle, which is the exact failure this design exists to
 * prevent. `scripts/check-demo.ts` sweeps the built output for the configured value.
 *
 * There is deliberately no `exitDemo`. Leaving is `POST /api/auth/signout`, because a demo
 * session is an ordinary session and a second logout would be a second implementation of the
 * one thing this feature most needs to get right.
 * ============================================================================
 */

export function enterDemo(passcode: string): Promise<ApiResult<{ readonly user: PublicUser }>> {
  return httpPost('/api/demo/enter', { passcode });
}

export function resetDemo(): Promise<ApiResult<unknown>> {
  return httpPost('/api/demo/reset', {});
}

/** Applies the state change a payment would, without going anywhere near Stripe. */
export function simulateDemoPayment(stage: 'deposit' | 'final'): Promise<ApiResult<unknown>> {
  return httpPost('/api/demo/payments', { stage });
}

export function sendDemoFeedback(input: {
  readonly body: string;
  readonly category: string;
  readonly route: string;
}): Promise<ApiResult<{ readonly id: string }>> {
  return httpPost('/api/demo/feedback', input);
}

/**
 * The seeded project's id, so the tour's three project stops land on the project rather than
 * on the list.
 *
 * A direct read of the customer endpoint rather than a reach into `features/private`, because
 * the demo layer is a component and `components/` may not import `features/`. One request,
 * once, on a screen only a demo session ever sees.
 */
export async function fetchDemoProjectId(): Promise<string | undefined> {
  const result = await httpGet<{ readonly projects: readonly { readonly id: string }[] }>(
    '/api/app/projects',
  );
  return result.success ? result.data.projects[0]?.id : undefined;
}
