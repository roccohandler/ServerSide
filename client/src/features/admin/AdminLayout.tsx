import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { routes } from '../../config/routes';
import { useAuth } from '../auth/useAuth';
import { Button } from '../../components/ui/Button';
import styles from './Admin.module.css';

/*
 * ============================================================================
 * THE ADMIN SHELL
 * ============================================================================
 *
 * ## Why it looks nothing like the customer application
 *
 * Deliberately, and for one reason: a staff member operating five customers' projects must
 * never be in any doubt about which surface they are on. The customer workspace is cream and
 * ember; this is a dark bar with the word "Internal" in it, permanently.
 *
 * The mistake that treatment prevents is a specific one — writing a reply intended as an
 * internal note into a customer-visible thread. The activity log distinguishes internal from
 * customer-visible entries, so the *data* knows the difference; this makes sure the person does
 * too.
 *
 * ## What is not here
 *
 * **No "view as customer".** Impersonation is the single most dangerous feature an admin
 * surface can have — it produces actions in an audit log attributed to somebody who did not
 * perform them, and it makes every customer-facing bug reproducible only by someone holding the
 * keys to every account. If it is ever built it needs its own design: a separate, explicitly
 * read-only session, an entry in the activity log naming the staff member, and a banner the
 * customer's data cannot remove. Not now, and not as a shortcut.
 *
 * **No Stripe controls.** Refunds, checkout links and subscription changes live behind
 * `BILLING_ADMIN_TOKEN` and are operated with curl. Putting them here would mean shipping that
 * token to a browser, and re-implementing the decisions around them in React would put a second
 * copy of the payment rules in the least trustworthy place.
 * ============================================================================
 */

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className={styles['shell']}>
      <header className={styles['bar']}>
        <div className={styles['barInner']}>
          <div className={styles['identity']}>
            {/*
             * "Internal" rather than the business name. The name is on every other surface;
             * what this bar has to communicate is that the data below belongs to other people.
             */}
            <span className={styles['mark']}>Internal</span>
            <span className={styles['who']}>{user?.email}</span>
          </div>

          <nav className={styles['nav']} aria-label="Internal sections">
            <NavLink
              to={routes.admin}
              end
              className={({ isActive }) =>
                isActive ? `${styles['navLink']} ${styles['navLinkActive']}` : styles['navLink']
              }
            >
              Projects
            </NavLink>
            <NavLink
              to={routes.adminAccounts}
              className={({ isActive }) =>
                isActive ? `${styles['navLink']} ${styles['navLinkActive']}` : styles['navLink']
              }
            >
              Accounts
            </NavLink>
            {/*
             * A way back to the customer workspace, because an admin has an account of their
             * own and may legitimately want to look at it. This is a link, not impersonation:
             * it shows *their* dashboard, not anybody else's.
             */}
            <Link to={routes.appDashboard} className={styles['navLink']}>
              My workspace
            </Link>
          </nav>

          <Button
            type="button"
            variant="secondary"

            onClick={() => {
              void logout().then(() => {
                navigate(routes.home, { replace: true });
              });
            }}
          >
            Sign out
          </Button>
        </div>
      </header>

      <main className={styles['main']}>
        <Outlet />
      </main>
    </div>
  );
}
