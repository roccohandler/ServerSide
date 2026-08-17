import { useDelayedFlag } from '@jobforge/ui';
import styles from './ConsoleFallback.module.css';

/*
 * The console, while it is still working out who is signed in.
 *
 * One state, not two: this bundle is not split, so the only thing ever waited for here is the
 * `/auth/me` round trip. That is why it takes no label — there is only one thing it can be
 * about, and a prop offering to say otherwise would be a prop nothing passes.
 *
 * Nothing at all for the first 400ms, which is what this was before and what its own comment
 * argued for. The case that comment did not cover is a cold serverless function or an API
 * that is down, where "nothing" was a blank charcoal page for as long as the request took.
 *
 * Its own component rather than the customer application's `RouteFallback`, for the reason
 * DECISION 027 gives and `State.tsx` restates: behaviour is shared — `useDelayedFlag`, the
 * one threshold — and appearance is not. This one sits on the console's sunken ground and has
 * to look like the console.
 */
export function ConsoleFallback() {
  const show = useDelayedFlag(true);

  if (!show) return null;

  return (
    <div className={styles['fallback']}>
      <p className={styles['label']} role="status">
        Signing you in…
      </p>
    </div>
  );
}
