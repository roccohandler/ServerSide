import { useEffect, useRef } from 'react';
import { useOnlineStatus } from '@jobforge/ui';
import { Notice } from './Notice';
import { useAnnounce } from './useAnnounce';

/*
 * The console's version, and the wording is the difference.
 *
 * The customer application says "anything you have typed is still here", which is reassurance
 * about a form. An operator's worry is sharper and more specific: they may be part-way
 * through a reply that has not been sent, and the one thing they need to know is that
 * pressing Send now will fail rather than half-succeed.
 *
 * Duplicated rather than shared for the reason `State.tsx` gives at length and DECISION 027
 * settles — the behaviour is one hook in `@jobforge/ui`, the words and the ground are two.
 */
export function OfflineNotice() {
  const online = useOnlineStatus();
  const announce = useAnnounce();

  const wasOnline = useRef(online);
  useEffect(() => {
    if (wasOnline.current === online) return;
    wasOnline.current = online;
    announce(online ? 'You are back online.' : 'You are offline. Nothing will save.');
  }, [online, announce]);

  if (online) return null;

  return (
    <Notice tone="problem">
      <strong>You are offline.</strong> Nothing will save until the connection is back — including a
      reply you are part-way through writing.
    </Notice>
  );
}
