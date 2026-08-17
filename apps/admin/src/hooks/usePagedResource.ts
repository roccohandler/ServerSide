import { useCallback, useState } from 'react';
import { useResource, type Resource } from '@jobforge/ui';
import type { ApiResult } from '@jobforge/shared';

/*
 * ============================================================================
 * A BOUNDED LIST THAT CAN ASK FOR MORE
 * ============================================================================
 *
 * Three list screens, one shape: load fifty, show how many are on screen, offer a bigger
 * page when the server says there is one. Extracted at the third occurrence rather than the
 * first, which is the rule this repository states — and it stays in `apps/admin` rather than
 * moving to `@jobforge/ui`, because the customer application has no bounded list.
 *
 * ## The key does not change, and that is the whole trick
 *
 * `useResource` reports `isLoading` when the key it is given differs from the key its data
 * was loaded under. Putting the limit in the key would therefore blank the list on every
 * press — fifty rows would vanish, a skeleton would appear, and a hundred rows would arrive.
 * That is the correct behaviour for *navigating* to a different resource and the wrong one
 * for asking the same resource for more of itself.
 *
 * So the key stays `'accounts'`, and it is the `fetch` identity that changes. `useResource`
 * re-runs on either, the rows already on screen stay on screen, and the new ones land behind
 * them.
 *
 * ## `busy` is set here rather than derived
 *
 * There is no honest way to derive "a bigger page is in flight" from outside: `data` is the
 * old page until the new one lands, and an effect keyed on the limit fires before the request
 * does. So `showMore` sets it and the settled request clears it, which is the one place that
 * knows both.
 * ============================================================================
 */

/**
 * How many more rows a press asks for, and the initial page.
 *
 * Fifty matches the server's own default, so the first load asks for exactly what it would
 * have asked for anyway and nothing about an unpressed list changed. The server's ceiling is
 * 500 — ten presses — and that bound is argued in `admin.routes.ts` rather than here.
 */
export const PAGE_SIZE = 50;

export interface PagedResource<TData> extends Resource<TData> {
  /** The number of rows currently requested. Not the number received. */
  readonly limit: number;
  readonly showMore: () => void;
  /** True from the press until the larger page settles, success or failure. */
  readonly loadingMore: boolean;
}

export function usePagedResource<TData>(
  key: string,
  fetch: (limit: number, signal?: AbortSignal) => Promise<ApiResult<TData>>,
): PagedResource<TData> {
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    (signal?: AbortSignal) =>
      fetch(limit, signal).then((result) => {
        /*
         * Cleared on failure as well as on success. A press that fails must not leave the
         * button spinning forever — the failure is rendered by the page's own `Failure`
         * state, and the control has to be pressable again.
         */
        setLoadingMore(false);
        return result;
      }),
    [fetch, limit],
  );

  const resource = useResource(key, load);

  const showMore = useCallback(() => {
    setLoadingMore(true);
    setLimit((current) => current + PAGE_SIZE);
  }, []);

  return { ...resource, limit, showMore, loadingMore };
}
