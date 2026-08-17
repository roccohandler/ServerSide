import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@jobforge/ui';
import { workspace } from '../../content/app';
import { Notice } from './Notice';
import { useAnnounce } from './useAnnounce';

/*
 * The one line that answers "is it me or is it them?".
 *
 * Renders nothing at all while the browser has a network, which is almost always — so this
 * costs a listener and no markup for every visit but the ones it exists for.
 *
 * The wording is deliberately unalarming. Losing a connection is ordinary, it usually comes
 * back on its own, and nothing typed is lost when it does; the second sentence is there
 * because that last part is the thing somebody actually worries about, and no error message
 * this application shows would otherwise answer it.
 */
export function OfflineNotice() {
  const online = useOnlineStatus();
  const announce = useAnnounce();

  /*
   * Announced on the *change*, not on every render, and not on first paint if the page was
   * loaded offline — the notice itself is on screen from the start in that case, and the
   * live region should carry what happened rather than what is.
   */
  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    announce(online ? workspace.offline.restoredAnnounce : workspace.offline.announce);
  }, [online, announce]);

  if (online) return null;

  return (
    <Notice tone="problem">
      <strong>{workspace.offline.title}</strong> {workspace.offline.body}
    </Notice>
  );
}
