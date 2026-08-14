import { useCallback, useEffect, useState } from 'react';
import type { ApiFailure, ApiResult, ProjectOverviewData } from '../../../types/api';
import { fetchProjectOverview } from '../api/appApi';

/*
 * One project's data, and the mutations that change it.
 *
 * ## Every mutation refetches
 *
 * Everything the project pages do — completing a task, leaving a comment, approving,
 * requesting changes — can change more than the thing it touched: approving moves the
 * milestone, completing the last task starts the build. So a mutation replaces the whole
 * overview rather than splicing a value into local state.
 *
 * That is one extra round trip in exchange for the page never showing a stale milestone
 * beside a fresh task list. On a page somebody opens a handful of times the trade is
 * obviously worth it; the version that patches state locally is the version that shows
 * "Ready for your approval" above a button that has already been pressed.
 *
 * ## Loading is derived, not stored
 *
 * The whole result is one state object that remembers which project it describes, so
 * "loading" is just "what I have is not for the project being asked about". A separate
 * `isLoading` flag would have to be set from inside the effect — a cascading render, and
 * a second source of truth that can disagree with the first.
 */

interface OverviewState {
  /** Which project `data` describes. Undefined before the first response. */
  readonly projectId: string | undefined;
  readonly data: ProjectOverviewData | null;
  readonly failure: ApiFailure | null;
}

const EMPTY: OverviewState = { projectId: undefined, data: null, failure: null };

export interface ProjectOverviewState {
  readonly data: ProjectOverviewData | null;
  readonly failure: ApiFailure | null;
  readonly isLoading: boolean;
  /** True while a mutation is in flight. Buttons disable on this. */
  readonly isMutating: boolean;
  reload(): void;
  /**
   * Runs a mutation and refreshes from the server. Returns the failure, if any, so a
   * component can put a message next to the control that caused it.
   *
   * The action's success payload is deliberately ignored — the refresh is the source of
   * truth. See the note above.
   */
  mutate(action: () => Promise<ApiResult<unknown>>): Promise<ApiFailure | null>;
}

export function useProjectOverview(projectId: string | undefined): ProjectOverviewState {
  const [state, setState] = useState<OverviewState>(EMPTY);
  const [isMutating, setIsMutating] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    const controller = new AbortController();

    void fetchProjectOverview(projectId, controller.signal).then((result) => {
      if (controller.signal.aborted) return;

      setState(
        result.success
          ? { projectId, data: result.data, failure: null }
          : { projectId, data: null, failure: result },
      );
    });

    return () => controller.abort();
  }, [projectId, reloadToken]);

  const reload = useCallback(() => setReloadToken((token) => token + 1), []);

  const mutate = useCallback<ProjectOverviewState['mutate']>(
    async (action) => {
      if (!projectId) return null;

      setIsMutating(true);
      const result = await action();

      if (!result.success) {
        setIsMutating(false);
        return result;
      }

      const refreshed = await fetchProjectOverview(projectId);
      if (refreshed.success) setState({ projectId, data: refreshed.data, failure: null });

      setIsMutating(false);
      return null;
    },
    [projectId],
  );

  return {
    data: state.projectId === projectId ? state.data : null,
    failure: state.projectId === projectId ? state.failure : null,
    /*
     * Asking about a project we have no answer for yet. Also covers the case of moving
     * between two projects: the previous one's data is not shown under the new one's id.
     */
    isLoading: Boolean(projectId) && state.projectId !== projectId,
    isMutating,
    reload,
    mutate,
  };
}
