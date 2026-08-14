import { Link } from 'react-router-dom';
import type { CurrentAction } from '../../../types/api';
import styles from './Cards.module.css';

/*
 * The one thing to do next.
 *
 * The `kind` is not used to choose the copy — the server already wrote it. That is what
 * keeps this page, an email and anything that later nudges a quiet customer saying the
 * same sentence. What the client decides is presentation: whose move it is.
 *
 * `waitingOnCustomer` drives the whole visual treatment, because "are they working or
 * is this sitting on me?" is the question every client of every agency actually has.
 */
export function CurrentActionCard({ action }: { readonly action: CurrentAction }) {
  const isExternal = action.cta ? /^https?:\/\//i.test(action.cta.href) : false;

  return (
    <section
      className={[
        styles['action'],
        action.waitingOnCustomer ? styles['actionWaiting'] : styles['actionWorking'],
      ].join(' ')}
      aria-labelledby="current-action-heading"
    >
      <p className={styles['actionEyebrow']}>
        {action.waitingOnCustomer ? 'Over to you' : 'We are on it'}
      </p>

      <h2 id="current-action-heading" className={styles['actionHeading']}>
        {action.heading}
      </h2>

      <p className={styles['actionBody']}>{action.body}</p>

      {action.cta ? (
        isExternal ? (
          <a
            className={styles['actionCta']}
            href={action.cta.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {action.cta.label}
          </a>
        ) : (
          <Link className={styles['actionCta']} to={action.cta.href}>
            {action.cta.label}
          </Link>
        )
      ) : null}
    </section>
  );
}
