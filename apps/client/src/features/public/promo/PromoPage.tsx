import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, TextField } from '@jobforge/ui';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { Notice } from '../../../components/patterns/Notice';
import { useAuth } from '../../../session';
import { enterDemo } from '../../../lib/demoApi';
import { DEMO_TESTERS } from '../../../config/demo';
import styles from './Promo.module.css';

/*
 * ============================================================================
 * `/promo` — THE PRIVATE DEMONSTRATION DOOR
 * ============================================================================
 *
 * `noindex`, absent from the sitemap, and linked from nowhere on the site. It is given out
 * by hand, with the passcode sent separately.
 *
 * ## "Nobody knows the URL" is not a security mechanism, and this page does not rely on it
 *
 * Everything that actually protects the demonstration is on the server: a passcode compared
 * in constant time, the credential rate limiter in front of it, an account whose role is
 * `customer`, and routes that are not mounted at all when `DEMO_PASSCODE` is unset. The
 * obscurity of the path is a courtesy to the owner, not a control.
 *
 * ## What this page has to say before it asks for anything
 *
 * A stranger arriving here is about to be shown a business's project portal. They need to
 * know, before they type: that this is a private demonstration, that the business and every
 * record in it are invented, that no real customer's information is present, and that
 * payments are simulated. Saying it afterwards is saying it too late.
 *
 * **The passcode is not on this page.** It is not in the markup, not in a comment, not in a
 * placeholder, and not in the bundle — the server is the only thing that has ever seen it.
 *
 * ## One failure message
 *
 * A wrong passcode, an unconfigured deployment and a rate-limit rejection all read the same.
 * Three distinguishable answers would be an oracle: the first tells somebody the passcode is
 * wrong but the demo exists, the second tells them it does not, and the difference between
 * those two is most of what somebody probing wants to know.
 * ============================================================================
 */

const COULD_NOT_ENTER = 'That passcode did not work. Check it and try again.';

export function PromoPage() {
  useDocumentMeta({
    path: routes.promo,
    title: 'Private demonstration',
    description: 'A private demonstration of the JobForge customer portal.',
  });

  const navigate = useNavigate();
  const { refresh } = useAuth();

  const [passcode, setPasscode] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;

    setBusy(true);
    setFailed(false);

    const result = await enterDemo(passcode);

    if (!result.success) {
      setBusy(false);
      /*
       * The server's message is deliberately discarded. It is already uniform, but a page
       * that renders whatever came back would start distinguishing failures again the first
       * time somebody made one of them more helpful.
       */
      setFailed(true);
      return;
    }

    /*
     * Re-read the session before navigating. The cookie is set, but `SessionProvider` is
     * holding "anonymous" from its own first load — and `RequireAuth` would bounce straight
     * back here. Same order the credential pages use, for the same reason.
     */
    await refresh();
    navigate(routes.appDashboard, { replace: true });
  }

  return (
    <main className={styles['page']}>
      <div className={styles['card']}>
        <h1 className={styles['title']}>A private demonstration</h1>

        <p className={styles['lede']}>
          This is the customer portal a JobForge client signs into — the real application, not a
          slideshow. It has been set up for {DEMO_TESTERS} to look through.
        </p>

        <ul className={styles['facts']}>
          <li>
            Everything in it is <strong>invented</strong>. The business, the project, the messages
            and the numbers are all made up for this demonstration.
          </li>
          <li>
            <strong>No real customer&rsquo;s information is here.</strong> The demonstration account
            cannot see anybody else&rsquo;s records, and nobody else can see it.
          </li>
          <li>
            <strong>Payments are simulated.</strong> Nothing you press can charge a card. There is
            no live payment path in the demonstration at all.
          </li>
          <li>
            Change anything you like. There is a <strong>Reset</strong> button inside that puts it
            all back.
          </li>
        </ul>

        <form className={styles['form']} onSubmit={submit} noValidate>
          <TextField
            id="demo-passcode"
            type="password"
            label="Passcode"
            hint="Sent to you separately. If you do not have one, ask whoever sent you this link."
            autoComplete="off"
            value={passcode}
            disabled={busy}
            onChange={(event) => setPasscode(event.target.value)}
          />

          {failed ? <Notice tone="problem">{COULD_NOT_ENTER}</Notice> : null}

          <Button type="submit" loading={busy} disabled={busy || passcode.trim() === ''}>
            {busy ? 'Opening…' : 'Open the demonstration'}
          </Button>
        </form>

        <p className={styles['footnote']}>
          If something looks broken, use the <strong>Give feedback</strong> button inside — it
          records which screen you were on, which is the part that is hard to describe afterwards.
        </p>
      </div>
    </main>
  );
}
