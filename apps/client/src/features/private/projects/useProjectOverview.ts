import { useCallback } from 'react';
import { useResource, type Resource } from '@jobforge/ui';
import type { ProjectOverviewData } from '@jobforge/shared';
import { fetchProjectOverview } from '../services/appApi';

/**
 * One project's data, and the mutations that change it.
 *
 * Three lines of binding over `useResource`, which owns the state machine. It used to own a
 * near-identical copy of that machine — see the note in `hooks/useResource.ts` about the two
 * versions disagreeing on what happens after a failed write.
 *
 * `projectId` may be undefined while the route params are still resolving; `useResource`
 * treats that as nothing-to-load rather than as loading.
 */
export type ProjectOverviewState = Resource<ProjectOverviewData>;

export function useProjectOverview(projectId: string | undefined): ProjectOverviewState {
  const fetch = useCallback(
    (signal?: AbortSignal) => fetchProjectOverview(projectId ?? '', signal),
    [projectId],
  );

  return useResource<ProjectOverviewData>(projectId, fetch);
}
