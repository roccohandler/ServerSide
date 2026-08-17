import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AnnouncerProvider } from './Announcer';
import { OfflineNotice } from './OfflineNotice';

/*
 * The notice is the answer to a question no error message here answers: "is it me or is it
 * them?". `NETWORK_ERROR` already says a request failed and already names the phone number;
 * what it cannot say is which side went away, and that is what decides whether somebody
 * waits or calls.
 */

function setNetwork(online: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  });
}

function renderNotice() {
  return render(
    <AnnouncerProvider>
      <OfflineNotice />
    </AnnouncerProvider>,
  );
}

const liveRegion = () => document.querySelector('[aria-live]');

describe('the offline notice', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing at all while there is a network', () => {
    renderNotice();

    /* Which is every visit but the ones this exists for. */
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('appears and announces when the connection drops', () => {
    renderNotice();
    setNetwork(false);

    expect(screen.getByRole('alert')).toHaveTextContent(/you are offline/i);
    expect(liveRegion()).toHaveTextContent(/you are offline/i);
  });

  it('goes away and says so when the connection returns', () => {
    renderNotice();

    setNetwork(false);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    setNetwork(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    /*
     * Announced, because the notice disappearing is not something a screen-reader user
     * observes. Coming back is the more useful of the two messages: it is the one that says
     * "try that again".
     */
    expect(liveRegion()).toHaveTextContent(/back online/i);
  });
});
