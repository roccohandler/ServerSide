import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Table, TextAreaField, TextField } from '@jobforge/ui';
import type { ApiFailure } from '@jobforge/shared';
import { projectPath } from '../../config/routes';
import { Empty, Failure, Loading } from '../../components/State';
import { LeaveGuard } from '../../components/LeaveGuard';
import { SearchField } from '../../components/SearchField';
import { useAnnounce } from '../../components/useAnnounce';
import { useSearchTerm } from '../../hooks/useSearchTerm';
import { useTitle } from '../../hooks/useTitle';
import { createProject, fetchProjects } from '../../lib/endpoints';
import { usePagedResource } from '../../hooks/usePagedResource';
import { ShowMore } from '../../components/ShowMore';
import styles from './Projects.module.css';

/*
 * Every project, newest first — the surface an operator starts their day on.
 *
 * ## The columns are chosen from what actually blocks work
 *
 * Not "all the fields we have". Each one answers a question that otherwise costs a database
 * query or a guess:
 *
 *   - **Waiting on** — whose move it is. The single most useful column, and the same question
 *     the customer dashboard is built around.
 *   - **Account** — whether a customer account is attached. This is not trivia: adding a task
 *     to a project with no `ownerUserId` is refused by the server with "a task would have
 *     nobody to appear for", and before this column there was no way to see that coming.
 *   - **Paid** — deposit and final, because "can I start" and "can I launch" are both
 *     payment questions.
 *
 * ## Searchable, and still not sortable
 *
 * This used to say the table was neither, on the grounds of one operator and a handful of
 * projects — "a sort control is a feature to build, maintain and test in exchange for solving
 * a problem that arrives at a few hundred rows". Half of that is superseded and half of it
 * stands, and the halves are different problems.
 *
 * **Search is not a scaling feature.** It is how somebody answers "what did I agree with the
 * roofer in Kent" at *any* number of rows, and the answer at fifty rows was to read fifty
 * rows. It narrows the same bounded, newest-first query, so "Show more" keeps working and
 * nothing about the ordering changed.
 *
 * **Sorting still is a scaling feature**, and the original argument is untouched: newest-first
 * is the order that matters, and a column-header sort is machinery in exchange for a problem
 * that has not arrived.
 */
export function ProjectsPage() {
  useTitle('Projects');

  const term = useSearchTerm();
  const [creating, setCreating] = useState(false);

  /*
   * Wrapped so the identity changes with the committed term and nothing else. `usePagedResource`
   * re-runs on a new `fetch`, which is exactly the trigger a settled search wants — and the key
   * stays `'projects'`, so the rows on screen stay on screen instead of blanking to a skeleton
   * between every search. See the note in that hook.
   */
  const load = useCallback(
    (limit: number, signal?: AbortSignal) => fetchProjects(limit, term.committed, signal),
    [term.committed],
  );

  const { data, failure, isLoading, reload, showMore, loadingMore } = usePagedResource(
    'projects',
    load,
  );

  if (failure) return <Failure failure={failure} onRetry={reload} />;
  if (isLoading || !data) return <Loading label="Loading projects" />;

  const projects = data.projects;

  return (
    <div className={styles['panel']}>
      <h1 className={styles['heading']}>Projects</h1>

      {/*
       * The one thing this console could not do. Every project in the system arrived through
       * the Stripe webhook, so a scope agreed over the phone — which is how most of them are
       * agreed — had no way in at all.
       */}
      {creating ? (
        <NewProjectForm
          onCreated={() => {
            setCreating(false);
            reload();
          }}
          onCancel={() => setCreating(false)}
        />
      ) : (
        <div className={styles['formActions']}>
          <Button onClick={() => setCreating(true)}>New project</Button>
        </div>
      )}

      <SearchField id="project-search" label="Find a project" term={term} />

      {projects.length === 0 ? (
        term.committed ? (
          <Empty
            title="Nothing matches"
            body="The search matches the start of a business name, a contact name or an address — so “heating” will not find “Cascade Heating”. Try the first word."
          />
        ) : (
          <Empty
            title="No projects yet"
            body="Create one above for a scope agreed off-platform, or wait for a deposit — a paid deposit creates a project by itself."
          />
        )
      ) : (
        <>
          <p className={styles['muted']}>
            {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            {term.committed ? ' matching' : ''}, newest first.
          </p>

          <Table label="All projects">
            <thead>
              <tr>
                <th scope="col">Business</th>
                <th scope="col">Milestone</th>
                <th scope="col">Waiting on</th>
                <th scope="col">Account</th>
                <th scope="col">Deposit</th>
                <th scope="col">Final</th>
                <th scope="col">Plan</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <th scope="row">
                    <Link to={projectPath(project.id)} className={styles['rowLink']}>
                      {project.businessName}
                    </Link>
                    <span className={styles['rowSub']}>{project.email}</span>
                  </th>
                  {/*
                   * `data-label` on every cell. Below the tablet step the table stacks and the
                   * column header moves into the cell as a `::before` from this attribute —
                   * see the media query in Projects.module.css. A stacked cell reading
                   * "Linked" with no indication that the column was "Account" is worse than
                   * the horizontal scrolling it replaced.
                   */}
                  <td data-label="Milestone">{project.milestone}</td>
                  <td data-label="Waiting on">
                    {/*
                     * The raw approval state, not a re-derived "waiting on" verdict.
                     *
                     * The customer-facing `waitingOnCustomer` flag is computed on the server from
                     * the milestone, and it lives on `ProjectView` — which this surface
                     * deliberately does not use, because staff need the stored record. Mapping it
                     * again here would be a second copy of that rule in the least authoritative
                     * place, and the first version of this cell got the enum wrong while doing
                     * it: it tested for `changes-requested` when the value is `changes_requested`,
                     * so the branch was dead. Showing the stored value is both honest and correct.
                     */}
                    {project.approval}
                  </td>
                  <td data-label="Account">
                    {project.ownerUserId ? (
                      'Linked'
                    ) : (
                      <span className={styles['warn']}>None — tasks will fail</span>
                    )}
                  </td>
                  <td data-label="Deposit">{project.depositStatus}</td>
                  <td data-label="Final">{project.finalStatus}</td>
                  <td data-label="Plan">{project.subscriptionStatus}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <ShowMore
            showing={projects.length}
            hasMore={data.hasMore}
            busy={loadingMore}
            onShowMore={showMore}
            noun="projects"
          />
        </>
      )}
    </div>
  );
}

/**
 * A project for a scope agreed off-platform.
 *
 * ## The account is optional, and both answers are real
 *
 * With an address, the server attaches the account — which seeds their onboarding tasks,
 * starts their history and emails them. Without one, the project exists and nobody can see it,
 * which is the right state for a scope agreed before the client has signed up. The field says
 * so rather than leaving somebody to guess whether blank is allowed.
 *
 * An address with no account behind it is refused **before** the project is created, so a typo
 * leaves nothing to clean up. That check is on the server, where it can actually be made.
 */
function NewProjectForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const announce = useAnnounce();

  const complete =
    businessName.trim().length > 0 && contactName.trim().length > 0 && email.trim().length > 0;

  /* Half a typed scope is annoying to lose and easy to lose — a stray back gesture does it. */
  const dirty = complete || phone.trim().length > 0 || notes.trim().length > 0;

  async function submit() {
    setBusy(true);
    const result = await createProject({
      businessName: businessName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(ownerEmail.trim() ? { ownerEmail: ownerEmail.trim() } : {}),
    });
    setBusy(false);

    if (!result.success) {
      setFailure(result);
      return;
    }

    announce(`${result.data.project.businessName} created.`);
    onCreated();
  }

  return (
    <div className={styles['inlineForm']}>
      <LeaveGuard dirty={dirty} />

      <h2 className={styles['formHeading']}>New project</h2>

      <TextField
        id="new-business"
        label="Business name"
        value={businessName}
        onChange={(event) => setBusinessName(event.target.value)}
      />
      <TextField
        id="new-contact"
        label="Contact name"
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
      />
      <TextField
        id="new-email"
        type="email"
        label="Contact email"
        hint="Where we correspond about this project. It appears on their invoices."
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextField
        id="new-phone"
        type="tel"
        label="Phone"
        optionalLabel="optional"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
      />
      <TextAreaField
        id="new-notes"
        label="Internal notes"
        optionalLabel="optional"
        hint="Never shown to the client."
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />
      <TextField
        id="new-owner"
        type="email"
        label="Customer account"
        optionalLabel="optional"
        hint="An existing account’s address. Attaching one starts their onboarding and emails them. Leave blank if they have not signed up yet."
        value={ownerEmail}
        onChange={(event) => setOwnerEmail(event.target.value)}
      />

      {failure ? <Failure failure={failure} /> : null}

      <div className={styles['formActions']}>
        <Button loading={busy} disabled={!complete} onClick={() => void submit()}>
          Create project
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
