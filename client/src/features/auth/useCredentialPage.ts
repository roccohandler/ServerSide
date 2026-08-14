import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { track } from '../../lib/analytics';
import type { ApiFailure, ApiResult, SessionData } from '../../types/api';
import { submitAssessment } from '../assessment/api/assessmentApi';
import { clearAssessmentDraft, readAssessmentDraft, toSubmission } from '../assessment/draft';
import { useAuth } from './useAuth';

/*
 * ============================================================================
 * WHAT HAPPENS AFTER SOMEBODY PROVES WHO THEY ARE
 * ============================================================================
 *
 * Shared by the sign-in page, the sign-up page and the Google button on both, because
 * the answer has to be the same for all four routes into the application:
 *
 *   1. The session is established.
 *   2. If an assessment was in progress, it is submitted now — on their account.
 *   3. They land where they were trying to go, or on the dashboard.
 *
 * Step 2 is the one that would rot if each page did it. The whole reason the assessment
 * asks for an account at the end rather than the beginning is that the answers survive
 * the detour, and a person who signed in with Google instead of a password must not be
 * the one whose answers are quietly dropped.
 *
 * ## A failed hand-off does not fail the sign-in
 *
 * They are signed in; that succeeded. If the assessment submission fails, the draft is
 * *kept* and they arrive at a dashboard that will offer to retry — losing their session
 * over it would turn a recoverable problem into two.
 * ============================================================================
 */

/** Where an unauthenticated visitor was sent from, stashed by the route guard. */
interface RedirectState {
  readonly from?: string;
}

export const DEFAULT_LANDING = '/app';

/**
 * The route's word for the mode, translated into the funnel's word for it.
 *
 * `login` is what the path is called; `signin` is what `lib/analytics.ts` declares. Both
 * names are already load-bearing somewhere — one in `config/routes.ts`, one in a report
 * grouped by event property — so neither gets renamed to match the other and the mapping
 * is written down once, here.
 */
const ANALYTICS_MODE: Record<'login' | 'signup', 'signin' | 'signup'> = {
  login: 'signin',
  signup: 'signup',
};

/**
 * The other credential page's path, carrying an address that has already been typed.
 *
 * The route guard sends every anonymous visitor to `/login`, so somebody who does not have
 * an account yet reaches the sign-up page by switching — and switching must not cost them
 * the address they just typed. It travels in the URL rather than in web storage, for the
 * reason `features/assessment/draft.ts` sets out about the assessment draft: a value in
 * storage outlives the sitting it belongs to, on a machine that may not be the visitor's.
 *
 * The caller is also responsible for passing the router `state` along with this, or the
 * switch loses where the guard was sending them.
 */
export function credentialPagePath(path: string, email: string): string {
  const address = email.trim();
  return address ? `${path}?${new URLSearchParams({ email: address }).toString()}` : path;
}

export interface CredentialPageState {
  readonly busy: boolean;
  readonly failure: ApiFailure | null;
  /** True when there is an assessment waiting to be submitted after signing in. */
  readonly hasDraft: boolean;
  submitCredentials(values: {
    readonly email: string;
    readonly name: string;
    readonly password: string;
    readonly businessName?: string;
  }): Promise<void>;
  submitGoogleCredential(credential: string): Promise<void>;
}

export function useCredentialPage(mode: 'login' | 'signup'): CredentialPageState {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);

  // Read once, at mount: the draft is cleared during the flow and the notice on the
  // page must not disappear halfway through it.
  const [hasDraft] = useState(() => readAssessmentDraft() !== null);

  const finish = useCallback(
    async (result: ApiResult<SessionData>) => {
      if (!result.success) {
        setFailure(result);
        setBusy(false);
        return;
      }

      const draft = readAssessmentDraft();

      if (draft) {
        const submitted = await submitAssessment(toSubmission(draft));
        /*
         * Cleared only on success. A draft kept after a failure is a draft the
         * dashboard can offer to send again; a draft cleared after a failure is
         * twenty answers nobody can get back.
         */
        if (submitted.success) clearAssessmentDraft();
      }

      const state = location.state as RedirectState | null;
      const target = state?.from ?? DEFAULT_LANDING;

      /*
       * `replace`, so the browser's back button does not return somebody to a sign-in
       * page they have already used — which, with a live session, immediately bounces
       * them forward again and looks like the button is broken.
       */
      navigate(target, { replace: true });
    },
    [location.state, navigate],
  );

  const submitCredentials = useCallback<CredentialPageState['submitCredentials']>(
    async (values) => {
      setBusy(true);
      setFailure(null);

      /*
       * One event per attempt, retries included. The number worth having is how much work
       * getting in takes — an event fired once per page view could not tell you that a
       * visitor is on their third try, which is the moment the reset flow either works or
       * loses them.
       */
      track('auth_started', { mode: ANALYTICS_MODE[mode], method: 'password' });

      const result =
        mode === 'signup'
          ? await auth.signup({
              email: values.email,
              name: values.name,
              password: values.password,
              ...(values.businessName ? { businessName: values.businessName } : {}),
            })
          : await auth.login({ email: values.email, password: values.password });

      await finish(result);
    },
    [auth, finish, mode],
  );

  const submitGoogleCredential = useCallback<CredentialPageState['submitGoogleCredential']>(
    async (credential) => {
      setBusy(true);
      setFailure(null);

      /*
       * `mode` here is the page the visitor was on, not what the server did with the
       * credential: there is one `POST /api/auth/google`, it cannot tell a new account
       * from a returning one, and it does not report which happened. The page's answer is
       * the only one anybody has — which is exactly why `lib/analytics.ts` makes this a
       * property of one event rather than two separately named events.
       */
      track('auth_started', { mode: ANALYTICS_MODE[mode], method: 'google' });

      // Exactly the same continuation as a password sign-in. That is the point.
      await finish(await auth.continueWithGoogle(credential));
    },
    [auth, finish, mode],
  );

  return { busy, failure, hasDraft, submitCredentials, submitGoogleCredential };
}
