import { createContext, useContext } from 'react';

/*
 * The context and the hook, apart from the component that provides them.
 *
 * The same split — and the same reason — as `AuthContext.tsx` / `useAuth.ts` in the customer
 * application: a module exporting both a component and a hook cannot be hot-reloaded
 * reliably, and `react-refresh/only-export-components` fails the build on it. A screen that
 * only needs to announce something should also not have to import the provider to do it.
 *
 * Named for the hook rather than for the context, deliberately. `announcer.ts` beside
 * `Announcer.tsx` resolves to the same specifier on a case-insensitive filesystem and the
 * `.ts` wins — which is a runtime failure with no build error, and it has already happened
 * once in this repository.
 */

export const AnnounceContext = createContext<((text: string) => void) | null>(null);

/**
 * Says something to a screen reader, through the console's one live region.
 *
 * Pass a whole sentence written for a person — "Reply sent to Dana Whitfield." — not a status
 * word and never an error code. Outside the provider this is a no-op rather than a throw:
 * failing to announce is a degradation, and taking a console screen down over it would be
 * worse than the thing being guarded against.
 */
export function useAnnounce(): (text: string) => void {
  return useContext(AnnounceContext) ?? (() => undefined);
}
