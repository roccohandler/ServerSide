import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useAuth } from '../../features/auth/useAuth';
import styles from './WorkspaceBar.module.css';

/*
 * ============================================================================
 * THE WAY BACK IN
 * ============================================================================
 *
 * A slim bar above the marketing header, shown only to somebody who is signed in.
 *
 * ## Why it exists
 *
 * Because "you are on the public site and your workspace is over there" is a fact that
 * has to be visible, not inferred. The marketing header does carry a "Dashboard" link,
 * and it is one item among six — a customer who arrived on the homepage by following a
 * link, or by typing the domain out of habit, should not have to hunt through
 * navigation for the way back to their own project.
 *
 * ## Why a bar rather than something louder
 *
 * The marketing site still has a job to do, including for a signed-in customer reading
 * about Growth Partner. This is a persistent reminder and a one-tap return, not a
 * takeover — it does not use ember, which is rationed to the page's primary action.
 *
 * ## Why it renders nothing inside the workspace
 *
 * `/app` has its own shell; a bar saying "go to your dashboard" on the dashboard would
 * be noise. The path check is what keeps the two surfaces from bleeding into each other.
 * ============================================================================
 */

export function WorkspaceBar() {
  const { status, user } = useAuth();
  const { pathname } = useLocation();

  // Anonymous visitors — most of them — get nothing at all.
  if (status !== 'authenticated' || !user) return null;

  // Already inside the workspace, which has its own header.
  if (pathname === routes.appDashboard || pathname.startsWith(`${routes.appDashboard}/`)) {
    return null;
  }

  const firstName = user.name.split(' ')[0] ?? user.name;

  return (
    <div className={styles['bar']}>
      <div className={styles['inner']}>
        <p className={styles['text']}>
          Signed in as <strong>{firstName}</strong> — you are viewing the public site.
        </p>
        <Link className={styles['action']} to={routes.appDashboard}>
          Back to my dashboard
        </Link>
      </div>
    </div>
  );
}
