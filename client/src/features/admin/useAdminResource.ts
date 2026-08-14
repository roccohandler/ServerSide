import { useCallback, useEffect, useState } from 'react';
import type { ApiFailure, ApiResult } from '../../types/api';

/*
 * ============================================================================
 * ONE READ, WITH MUTATIONS THAT REFETCH
 * ============================================================================
 *
 * Every admin page is the same shape: load one thing, act on it, and see the result of acting.
 * This is that shape once, modelled on `useProjectOverview` in the customer application —
 * deliberately, because the two solve an identical problem and two different answers to it
 * would be two sets of loading bugs.
 *
 * ## Loading is derived, not stored
 *
 * The state object remembers which `key` its data describes, so "loading" is "what I have is
 * not for what is being asked about". A separate `isLoading` boolean would have to be set from
 * inside the effect, which is both a cascading render — `react-hooks` fails the build on it, and
 * that is how the first version of these pages was caught — and a second source of truth that
 * can disagree with the first.
 *
 * ## Every mutation refetches rather than patching
 *
 * A milestone change writes activity entries and can change which task is next. Splicing a
 * response into local state would make this hook decide what else changed, which is the
 * server's job done again in the least reliable place. One extra round trip buys the guarantee
 * that what an operator sees after acting is what is stored.
 * ============================================================================
 */

interface ResourceState<TData> {
  /** Which `key` `data` describes. `undefined` before the first response. */
  readonly key: string | undefined;
  readonly data: TData | null;
  readonly failure: ApiFailure | null;
}

export interface AdminResource<TData> {
  readonly data: TData | null;
  readonly failure: ApiFailure | null;
  readonly isLoading: boolean;
  /** True while a mutation is in flight. Controls disable on this. */
  readonly isMutating: boolean;
  reload(): void;
  /**
   * Runs a mutation and refreshes from the server. Returns the failure, if any, so the caller
   * can show the server's own message — which is always written for a person to read.
   *
   * The action's success payload is deliberately ignored; the refresh is the source of truth.
   */
  mutate(action: () => Promise<ApiResult<unknown>>): Promise<ApiFailure | null>;
}

/**
 * @param key   Identifies what is being loaded. A change refetches. Pass a constant for a
 *              page that always loads the same thing.
 * @param fetch Must be stable across renders — a module-level function, or wrapped in
 *              `useCallback`. An inline arrow would refetch on every render.
 */
export function useAdminResource<TData>(
  key: string,
  fetch: (signal?: AbortSignal) => Promise<ApiResult<TData>>,
): AdminResource<TData> {
  const [state, setState] = useState<ResourceState<TData>>({
    key: undefined,
    data: null,
    failure: null,
  });
  const [isMutating, setIsMutating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    /*
     * No `setState` before the request. Everything is set from inside the `then`, which is what
     * keeps this out of the synchronous-render path — and it is why `failure` is cleared on
     * success here rather than at the start of the load.
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

    /* Refetch either way. A rejected write can still have changed something before it failed. */
    setReloadToken((token) => token + 1);

    return result.success ? null : result;
  }, []);

  return {
    data: state.key === key ? state.data : null,
    failure: state.key === key ? state.failure : null,
    isLoading: state.key !== key,
    isMutating,
    reload,
    mutate,
  };
}
