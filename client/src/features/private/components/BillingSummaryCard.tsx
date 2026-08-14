import { Link } from 'react-router-dom';
import { growthPartner } from '../../../config/pricing';
import { routes } from '../../../config/routes';
import type { BillingSummary } from '../../../types/api';
import styles from './Cards.module.css';

/**
 * The billing state, in plain language.
 *
 * Every label on this card comes from the server. That is not indirection for its own
 * sake — "a payment did not go through" is a sentence with commercial consequences, and
 * having one place that decides how a `past_due` subscription is described to a customer
 * is worth more than the convenience of a lookup table here.
 *
 * The row *names* are the exception, and one of them is why the product name is
 * interpolated rather than typed. This card said "Care plan" while every other surface
 * said Growth Partner — so a customer signed up to one thing and was shown a line item
 * for something with a different name, which is the cheapest possible way to make a bill
 * look wrong. `growthPartner.name` means the next rename reaches this row on its own.
 *
 * Nothing on this card is a Stripe identifier, a card number or a session id. The
 * server's summary is an allow-list; see `billing.summary.ts`.
 */
export function BillingSummaryCard({ billing }: { readonly billing: BillingSummary }) {
  const attention = billing.subscription.status === 'past_due';

  return (
    <article className={[styles['card'], attention ? styles['cardAttention'] : ''].join(' ')}>
      <dl className={styles['definitions']}>
        <div>
          <dt>Build deposit</dt>
          <dd>{billing.build.deposit.label}</dd>
        </div>
        <div>
          <dt>Launch payment</dt>
          <dd>{billing.build.final.label}</dd>
        </div>
        <div>
          <dt>{growthPartner.name}</dt>
          <dd>{billing.subscription.label}</dd>
        </div>
      </dl>

      <ul className={styles['links']}>
        <li>
          <Link to={routes.appBilling}>
            {attention ? 'Update your payment details' : 'See billing'}
          </Link>
        </li>
      </ul>
    </article>
  );
}
