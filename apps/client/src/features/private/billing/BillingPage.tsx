import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, useResource } from '@jobforge/ui';
import { growthPartner } from '../../../config/pricing';
import { routes } from '../../../config/routes';
import { carePricing, prices, pricing, websiteReport } from '../../../content';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import type { ApiFailure, ApiResult, CustomerProduct } from '@jobforge/shared';
import { fetchBilling, openBillingPortal, startCheckout } from '../services/appApi';
import { AppError, AppLoading } from '../../../components/patterns/AppState';
import { Notice, NoticeAction } from '../../../components/patterns/Notice';
import styles from './Billing.module.css';

/*
 * ============================================================================
 * `/app/billing`
 * ============================================================================
 *
 * What was paid, what is recurring, and two buttons.
 *
 * ## Stripe owns the rest, on purpose
 *
 * Invoices, receipts, card details, changing a card, cancelling a subscription — all of
 * it lives in Stripe's hosted portal, which this page links to. Rebuilding any of it
 * here would mean rebuilding something that is already correct, already accessible,
 * already localised and already PCI-compliant, and getting one of those four wrong.
 *
 * ## The redirect proves nothing
 *
 * Stripe returns somebody here with `?paid=…` after a successful checkout. That is a
 * *navigation*, not a payment: the banner it produces says the payment is being
 * confirmed, and the state on the page comes from the server, which only moves when the
 * webhook arrives. A customer who closes the tab mid-redirect ends up in exactly the
 * same place.
 * ============================================================================
 */

export function BillingPage() {
  useDocumentMeta({
    path: routes.appBilling,
    title: 'Billing',
    description: 'What you have paid, what is recurring, and how to manage it.',
  });

  const [params] = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [actionFailure, setActionFailure] = useState<ApiFailure | null>(null);

  const justPaid = params.get('paid');
  const cancelled = params.get('checkout') === 'cancelled';

  /*
   * The read goes through `useResource` like every other data-backed screen. The two Stripe
   * buttons keep their own `busy` and their own failure, and that is not an oversight: they
   * do not mutate anything here. They create a session on Stripe and hand the browser over
   * to another origin, so there is nothing to refetch afterwards — `mutate`'s refresh would
   * be a request fired into a page that is already navigating away.
   */
  const { data, failure, isLoading, reload } = useResource('billing', fetchBilling);
  const billing = data?.billing ?? null;

  /**
   * Hands the visitor over to Stripe.
   *
   * `window.location.assign` rather than a router navigation, because the destination
   * is another origin — and deliberately without clearing `busy` on the success path,
   * so the button stays disabled during the moment between the request resolving and
   * the browser leaving. Re-enabling it would offer a second checkout to somebody whose
   * first one is already on its way.
   */
  async function goToStripe(create: () => Promise<ApiResult<{ readonly url: string }>>) {
    setBusy(true);
    setActionFailure(null);

    const result = await create();

    if (result.success) {
      window.location.assign(result.data.url);
      return;
    }

    setActionFailure(result);
    setBusy(false);
  }

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !billing) return <AppLoading label="Loading your billing" />;

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Billing</h1>

      {justPaid ? (
        <Notice tone="info">
          <strong>Thank you — your payment is with Stripe.</strong> We confirm every payment with
          Stripe directly rather than taking the browser&rsquo;s word for it, so this page may take
          a moment to catch up. <NoticeAction onClick={reload}>Check again</NoticeAction>
        </Notice>
      ) : null}

      {cancelled ? (
        <Notice tone="info">
          Checkout was cancelled and nothing has been charged. You can pick it up again whenever you
          are ready.
        </Notice>
      ) : null}

      {actionFailure ? <Notice tone="problem">{actionFailure.error.message}</Notice> : null}

      <section className={styles['panel']} aria-labelledby="billing-state">
        <h2 id="billing-state" className={styles['panelTitle']}>
          Where things stand
        </h2>

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
            {/* Named from the config, for the reason in `BillingSummaryCard`. */}
            <dt>{growthPartner.name}</dt>
            <dd>{billing.subscription.label}</dd>
          </div>
        </dl>
      </section>

      {billing.available.deposit ? (
        <section className={styles['panel']} aria-labelledby="billing-deposit">
          <h2 id="billing-deposit" className={styles['panelTitle']}>
            Start your website
          </h2>
          {/*
           * The published price carries its condition, here as everywhere else.
           * `pricing.build.price` is the founding-client figure; printed on its own it
           * reads as *the* price, which is a former-price claim approached from the
           * other side. `content.test.ts` fails the build for any component that
           * renders one without the other — see the note above that assertion.
           */}
          <p className={styles['panelBody']}>
            The build is {pricing.build.price} in total, paid half now and half on launch day. The
            deposit is what puts you on the schedule. {pricing.build.terms}
          </p>

          {pricing.founding.enabled ? (
            <p className={styles['panelMeta']}>
              {pricing.founding.standardLabel} {pricing.build.standardPrice}.{' '}
              {pricing.founding.body}
            </p>
          ) : null}
          <Button
            size="lg"
            loading={busy}
            onClick={() => goToStripe(() => startCheckout('build-deposit' as CustomerProduct))}
          >
            {busy ? 'Opening Stripe…' : 'Pay the deposit'}
          </Button>
          <p className={styles['panelMeta']}>
            Payment is handled by Stripe. We never see or store your card details.
          </p>
        </section>
      ) : null}

      {billing.available.final ? (
        <section className={styles['panel']} aria-labelledby="billing-final">
          <h2 id="billing-final" className={styles['panelTitle']}>
            The launch payment
          </h2>
          {/*
           * ============================================================================
           * THE SECOND HALF, SELF-SERVE, AND WHY THE FIGURE IS NOT THE BUILD PRICE
           * ============================================================================
           *
           * Until this panel existed, settling the balance meant waiting for the owner to send
           * a link. That is the one remaining step of the sale a customer could not take on
           * their own initiative — and it is the step where they are most motivated, because
           * the site is going live and they have just approved it.
           *
           * `prices.deposit` and not `pricing.build.price`, and the difference matters. Both
           * halves are the same amount, so the figure owed here is the deposit figure; printing
           * the *total* beside a "pay now" button would read as the whole build being charged
           * again. It comes from the content layer, which derives it from `deposit()` in
           * `config/pricing.ts` — nothing here is typed, for the reason the plan panel below
           * spends a paragraph on.
           *
           * There is deliberately no founding-price condition on this panel, unlike the deposit
           * one above it. That condition exists because a discounted price rendered alone reads
           * as *the* price, which is a former-price claim from the other side — and it belongs
           * where somebody is deciding whether to buy. This reader decided weeks ago and is
           * settling an agreed balance; restating the terms of the offer at the point of the
           * second payment would read as the price being re-negotiated.
           * ============================================================================
           */}
          <p className={styles['panelBody']}>
            Your website is approved and going live. The second half of the build — {prices.deposit}{' '}
            — settles it, and nothing else is owed on the build.
          </p>
          <Button
            size="lg"
            loading={busy}
            onClick={() => goToStripe(() => startCheckout('build-final' as CustomerProduct))}
          >
            {busy ? 'Opening Stripe…' : 'Pay the launch instalment'}
          </Button>
          <p className={styles['panelMeta']}>
            Payment is handled by Stripe. We never see or store your card details.
          </p>
        </section>
      ) : null}

      {billing.available.plan ? (
        <section className={styles['panel']} aria-labelledby="billing-plan">
          <h2 id="billing-plan" className={styles['panelTitle']}>
            {growthPartner.name}
          </h2>
          {/*
           * ============================================================================
           * MEASUREMENT FIRST, UPKEEP LAST, AND THE PRICE ON THE PAGE
           * ============================================================================
           *
           * This panel used to read "Hosting, updates, monitoring and the changes you ask
           * for", and it printed no figure at all. Both halves of that were defects, and
           * both of them were expensive in different ways.
           *
           * Leading on upkeep describes a commodity. Every reader of this page has been
           * quoted a fraction of this fee for keeping a website online, so a panel that
           * opens with hosting invites them to price it against hosting and decline. The
           * headline deliverable is the Website Performance Report — what the site
           * produced, whether that moved, what was changed and why, and what is being
           * looked at next — and then the work that comes out of it. The running of the
           * site is the floor underneath that, which is why it is named last rather than
           * first, and named as the floor.
           *
           * The missing price was worse. "Start monthly" beside no figure asked somebody
           * to open a Stripe checkout in order to find out what they were agreeing to.
           * The figures below come from the content layer, which derives them from
           * `config/pricing.ts`; nothing here is typed, because a fee typed into a
           * component is how a site ends up quoting two prices for one product. The
           * published terms come from the same place for the same reason — the minimum
           * term and the notice period are commercial commitments, and the app must say
           * exactly what the site says.
           *
           * What is never promised, here or anywhere: that the number goes up. Demand,
           * pricing, the season and whether the phone gets answered move it more than a
           * website can. What is promised is that it gets measured, that it gets
           * explained, and that the work carries on either way.
           * ============================================================================
           */}
          {/*
           * Interpolated rather than typed. The artefact's name is `websiteReport.name` in
           * the content layer, and a product whose name is typed in two places is a product
           * that ends up with two names — which is the whole defect the "care plan" rename
           * fixed on this page.
           */}
          <p className={styles['panelBody']}>
            Every month you get the {websiteReport.name}: how many calls and quote requests the
            website produced, whether that moved against the figure recorded on launch day, what was
            changed and why, and what is being looked at next. The improvement work follows from
            what it shows — the pages, the wording and the paths to contacting you.
          </p>
          <p className={styles['panelBody']}>
            Hosting, updates, monitoring and the changes you ask for are included underneath all of
            that. They are the floor rather than the point. Nobody can honestly promise the enquiry
            number goes up, so that is not what is promised: it is measured, it is explained, and
            you are told what was done about it — including in the months when it falls.
          </p>

          <dl className={[styles['definitions'], styles['planPrices']].join(' ')}>
            <div>
              <dt>Monthly</dt>
              <dd>{carePricing.plan.price}</dd>
            </div>
            <div>
              <dt>{pricing.annual.label}</dt>
              <dd>
                {pricing.annual.price} {pricing.annual.cadence}
              </dd>
            </div>
          </dl>

          <div className={styles['actions']}>
            <Button
              loading={busy}
              onClick={() =>
                goToStripe(() => startCheckout('growth-partner-monthly' as CustomerProduct))
              }
            >
              Start monthly
            </Button>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() =>
                goToStripe(() => startCheckout('growth-partner-annual' as CustomerProduct))
              }
            >
              Pay for a year
            </Button>
          </div>
          <p className={styles['panelMeta']}>
            {carePricing.terms} {pricing.annual.saving}
          </p>
        </section>
      ) : null}

      {billing.subscription.manageable ? (
        <section className={styles['panel']} aria-labelledby="billing-manage">
          <h2 id="billing-manage" className={styles['panelTitle']}>
            Manage your billing
          </h2>
          <p className={styles['panelBody']}>
            Your invoices, receipts, payment method and cancellation all live with Stripe. This
            opens their secure page.
          </p>
          <Button variant="secondary" loading={busy} onClick={() => goToStripe(openBillingPortal)}>
            {busy ? 'Opening Stripe…' : 'Open billing portal'}
          </Button>
        </section>
      ) : null}
    </div>
  );
}
