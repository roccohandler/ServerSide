import type { OnboardingView } from '@jobforge/shared';
import { formatDate } from '../../utils/formatDate';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * THE BRIEF
 * ============================================================================
 *
 * Every other panel on this page is *state* — where the project is, what has been paid, what
 * is outstanding. This one is **material**: the answers a client gave immediately after paying,
 * which are what the website is actually made from.
 *
 * It has existed since the onboarding feature was written and appeared on no screen. The
 * submission was stored, an email went to the owner, and from then on the only copy anybody
 * worked from was in an inbox — so building a site meant having this page open for the
 * milestone and a mail client open for the brief.
 *
 * ## Rendered in full, and in the order it was asked
 *
 * No truncation and no "show more". Every field here is a question somebody chose to ask
 * because a build stalls without the answer, and the same order as the form means an operator
 * reading this and a client who filled it in are looking at the same document.
 *
 * ## Empty is a real state and says which one
 *
 * A project created from the console before its client has onboarded has no submission, and a
 * submission whose address did not match is sitting on the unmatched worklist. Those are
 * different problems with different fixes, and a single "nothing here" would hide the second
 * one — which is the one that needs a person.
 */

/** Only the answers that were given. An empty optional field is not a row worth printing. */
const OPTIONAL_FIELDS = [
  ['website', 'Existing website'],
  ['googleBusinessProfile', 'Google Business Profile'],
  ['domainAndHosting', 'Domain and hosting'],
  ['photosNote', 'Photographs'],
  ['competitors', 'Competitors'],
  ['callsToAction', 'What they want visitors to do'],
  ['accessNotes', 'Access and logins'],
  ['anythingElse', 'Anything else'],
] as const;

export function OnboardingPanel({ onboarding }: { readonly onboarding: OnboardingView | null }) {
  if (!onboarding) {
    return (
      <div className={styles['panel']}>
        <h2 className={styles['subheading']}>Client brief</h2>
        <p className={styles['muted']}>
          Nothing has been submitted for this project. A client fills this in at{' '}
          <code>/welcome</code> after paying, and it is matched to the project by email address — so
          if they have onboarded under a different address it is on the <strong>Onboarding</strong>{' '}
          worklist waiting to be matched.
        </p>
      </div>
    );
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Client brief</h2>
      <p className={styles['muted']}>
        Submitted {formatDate(onboarding.at)}. This is what the build is made from.
      </p>

      <dl className={styles['brief']}>
        <div>
          <dt>Services</dt>
          <dd>{onboarding.services}</dd>
        </div>
        <div>
          <dt>Service areas</dt>
          <dd>{onboarding.serviceAreas}</dd>
        </div>
        <div>
          <dt>Contact given</dt>
          <dd>
            {onboarding.contactName} — {onboarding.email} — {onboarding.phone}
          </dd>
        </div>

        {OPTIONAL_FIELDS.map(([key, label]) => {
          const value = onboarding[key];
          if (!value) return null;

          return (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
