import { useResource } from '@jobforge/ui';
import type { ReportView } from '@jobforge/shared';
import { routes } from '../../../config/routes';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { AppEmpty, AppError, AppLoading } from '../../../components/patterns/AppState';
import { fetchReports } from './reportsApi';
import styles from '../billing/Billing.module.css';

/*
 * ============================================================================
 * `/app/reports` — WHAT GROWTH PARTNER ACTUALLY BUYS
 * ============================================================================
 *
 * DECISION 015 makes the Website Performance Report the headline deliverable of the monthly
 * plan, and this is the only screen that proves it was ever sent. A subscription whose
 * deliverable has no home in the product is one the customer cancels the first quiet month,
 * because there is nothing on screen to remind them what they are paying for.
 *
 * ## Two numbers, side by side, and no verdict
 *
 * The page shows this month's enquiries and the baseline, and it does not compute a
 * percentage, an arrow or a direction between them. That is the same discipline `BillingPage`
 * applies to its own wording and it is deliberate: some months the number goes down, and the
 * month it goes down is exactly the month the customer most needs to read what a person wrote
 * rather than be shown a red triangle. `changeExplanation` is where the meaning lives.
 *
 * A missing baseline renders as "not measured" rather than as zero. Businesses that had no
 * website, or no way of counting before we arrived, genuinely have no number — and printing a
 * `0` would turn "we do not know" into "you had none", which is a different and much better
 * sounding claim than the truth.
 * ============================================================================
 */

function ReportPanel({ report }: { readonly report: ReportView }) {
  const published = new Date(report.publishedAt);

  return (
    <section className={styles['panel']} aria-labelledby={`report-${report.id}`}>
      <h2 id={`report-${report.id}`} className={styles['panelTitle']}>
        {report.monthLabel}
      </h2>
      <p className={styles['panelMeta']}>
        Written by {report.preparedBy}
        {Number.isNaN(published.getTime())
          ? ''
          : ` on ${published.toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}`}
        .
      </p>

      <dl className={styles['definitions']}>
        <div>
          <dt>Enquiries this month</dt>
          <dd>{report.enquiries}</dd>
        </div>
        <div>
          <dt>Before your new website</dt>
          <dd>{report.baseline === undefined ? 'Not measured' : report.baseline}</dd>
        </div>
      </dl>

      <p className={styles['panelBody']}>{report.changeExplanation}</p>

      {report.whatWeChanged.length > 0 ? (
        <>
          <h3 className={styles['findingTitle']}>What we changed</h3>
          <ul className={styles['recommendations']}>
            {report.whatWeChanged.map((line) => (
              <li key={line} className={styles['recommendation']}>
                {line}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {report.whatIsNext.length > 0 ? (
        <>
          <h3 className={styles['findingTitle']}>What is next</h3>
          <ul className={styles['recommendations']}>
            {report.whatIsNext.map((line) => (
              <li key={line} className={styles['recommendation']}>
                {line}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

export function ReportsPage() {
  useDocumentMeta({
    path: routes.appReports,
    title: 'Your reports',
    description: 'What your website produced each month, and what we did about it.',
  });

  const { data, failure, isLoading, reload } = useResource('reports', fetchReports);

  if (failure) return <AppError failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <AppLoading label="Loading your reports" />;

  return (
    <div className={styles['page']}>
      <h1 className={styles['title']}>Your reports</h1>

      {data.reports.length === 0 ? (
        /*
         * Not a dead end. Somebody arriving here with nothing is either between months or not
         * on the monthly plan, and the empty state has to answer both without guessing which —
         * so it says what a report is and where the plan lives, rather than "nothing here yet".
         */
        <AppEmpty
          title="No reports yet"
          body="Every month on Growth Partner you get a short report: how many enquiries your website produced, what we changed, and what we are doing next. The first one arrives after your first full month."
          action={{ label: 'See what Growth Partner includes', to: routes.appBilling }}
        />
      ) : (
        data.reports.map((report) => <ReportPanel key={report.id} report={report} />)
      )}
    </div>
  );
}
