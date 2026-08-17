import { useCallback, useEffect, useState } from 'react';
import type { ApiFailure, ApiResult } from '@jobforge/shared';

/*
 * ============================================================================
 * ONE READ, WITH MUTATIONS THAT REFETCH
 * ============================================================================
 *
 * Every data-backed page in the customer portal and the owner console is the same shape:
 * load one thing, act on it, and see the result of acting.
 *
 * This is that shape once — and it now lives in `@jobforge/ui` because those two pages are
 * in **two different bundles**. It existed twice before, as `useAdminResource` and as
 * `useProjectOverview`, and the two had already drifted where it mattered most. Their `mutate` disagreed about what happens after a *failed* write: the
 * admin copy refetched anyway, the customer copy returned early and left whatever was on
 * screen. That is not a style difference. A rejected write can still have changed something
 * before it failed, and the version that does not refetch shows the customer a stale project
 * beside an error explaining that nothing happened.
 *
 * **Refetch-always is the resolved behaviour** (DECISION 025's sibling — recorded on the
 * consolidation, and the safer of the two: three of the four call sites already had it).
 *
 * ## Loading is derived, not stored
 *
 * The state object remembers which `key` its data describes, so "loading" is "what I have is
 * not for what is being asked about". A separate `isLoading` boolean would have to be set
 * from inside the effect, which is both a cascading render — `react-hooks` fails the build on
 * it, and that is how the first version of these pages was caught — and a second source of
 * truth that can disagree with the first.
 *
 * ## Why every mutation refetches rather than patching
 *
 * A milestone change writes activity entries and can change which task is next; approving
 * moves the milestone; completing the last task starts the build. Splicing a response into
 * local state would make this hook decide what else changed, which is the server's job done
 * again in the least reliable place. One extra round trip buys the guarantee that what
 * somebody sees after acting is what is stored.
 * ============================================================================
 */

interface ResourceState<TData> {
  /** Which `key` `data` describes. `undefined` before the first response. */
  readonly key: string | undefined;
  readonly data: TData | null;
  readonly failure: ApiFailure | null;
}

export interface Resource<TData> {
  readonly data: TData | null;
  readonly failure: ApiFailure | null;
  readonly isLoading: boolean;
  /** True while a mutation is in flight. Controls disable on this. */
  readonly isMutating: boolean;
  reload(): void;
  /**
   * Runs a mutation and refreshes from the server. Returns the failure, if any, so the
   * caller can show the server's own message — which is always written for a person to read.
   *
   * The action's success payload is deliberately ignored; the refresh is the source of truth.
   */
  mutate(action: () => Promise<ApiResult<unknown>>): Promise<ApiFailure | null>;
}

/**
 * @param key   Identifies what is being loaded. A change refetches. Pass a constant for a
 *              page that always loads the same thing, and `undefined` when there is nothing
 *              to load yet — the effect then does nothing and `isLoading` stays false.
 * @param fetch Must be stable across renders — a module-level function, or wrapped in
 *              `useCallback`. An inline arrow would refetch on every render.
 */
export function useResource<TData>(
  key: string | undefined,
  fetch: (signal?: AbortSignal) => Promise<ApiResult<TData>>,
): Resource<TData> {
  const [state, setState] = useState<ResourceState<TData>>({
    key: undefined,
    data: null,
    failure: null,
  });
  const [isMutating, setIsMutating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (key === undefined) return;

    const controller = new AbortController();

    /*
     * No `setState` before the request. Everything is set from inside the `then`, which is
     * what keeps this out of the synchronous-render path — and it is why `failure` is
     * cleared on success here rather than at the start of the load.
     */
    void fetch(controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      setState(
        result.success
          ? { key, data: result.data, failure: null }
          : { key, data: null, failure: result },
      );
    });

    return () => controller.abort();
  }, [key, fetch, reloadToken]);

  const reload = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const mutate = useCallback(async (action: () => Promise<ApiResult<unknown>>) => {
    setIsMutating(true);
    const result = await action();
    setIsMutating(false);

    /* Refetch either way — see the note at the top about a rejected write. */
    setReloadToken((token) => token + 1);

    return result.success ? null : result;
  }, []);

  return {
    data: state.key === key ? state.data : null,
    failure: state.key === key ? state.failure : null,
    isLoading: key !== undefined && state.key !== key,
    isMutating,
    reload,
    mutate,
  };
}
