import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { pages } from '../../content';
import { audit } from '../../content/audit';
import { industries } from '../../content/industries';
import { playbook } from '../../content/playbook';
import { routes } from '../../config/routes';
import { trades } from '../../config/trades';
import { AuditPage } from './AuditPage';
import { renderAuditSummary } from './auditSummary';
import { MESSAGE_MAX_LENGTH } from '../contact/contactValidation';
import { HONEYPOT_FIELD } from '../../types/api';

/*
 * The audit is the site's primary conversion path, so what is pinned here is the bargain
 * it makes rather than its wording: the useful half is free and unconditional, the
 * diagnosis is withheld until it can be honest, and nothing is transmitted until somebody
 * chooses to transmit it.
 */

const submitLead = vi.fn();

vi.mock('../../lib/api', () => ({
  submitLead: (...args: unknown[]) => submitLead(...args),
}));

function renderAudit(entry = '/audit') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <AuditPage />
    </MemoryRouter>,
  );
}

/** Scores every category `value`, which is what unlocks the diagnosis. */
async function scoreEverything(user: ReturnType<typeof userEvent.setup>, value: '0' | '1' | '2') {
  for (const category of playbook.scorecard.categories) {
    const group = screen.getByRole('group', { name: new RegExp(`^${category.label}`, 'i') });
    await user.click(within(group).getByRole('radio', { name: new RegExp(`^${value}`) }));
  }
}

beforeEach(() => {
  submitLead.mockReset();
  submitLead.mockResolvedValue({
    success: true,
    data: { submittedAt: '2026-08-10T00:00:00.000Z' },
  });
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe('the website revenue audit', () => {
  it('is registered as a real, indexable page', () => {
    const meta = pages.find((page) => page.path === routes.audit);

    expect(meta).toBeDefined();
    expect(meta?.noIndex).toBeUndefined();
  });

  it('offers every trade a way to describe itself, including one that is none of them', () => {
    renderAudit();

    const group = screen.getByRole('group', { name: new RegExp(audit.trade.fieldLabel, 'i') });
    for (const trade of trades) {
      expect(within(group).getByRole('radio', { name: trade.label })).toBeInTheDocument();
    }

    // "Something else" is not a lesser answer — see config/trades.ts.
    expect(within(group).getByRole('radio', { name: /something else/i })).toBeInTheDocument();
  });

  /*
   * The industry pages link here as `/audit?trade=<slug>`. A reader who arrived from the
   * roofing page has already answered step one by being there, and asking again is the
   * kind of small avoidable friction those pages exist to complain about.
   */
  it('accepts a trade carried in from an industry page', () => {
    renderAudit('/audit?trade=roofing');

    expect(screen.getByRole('radio', { name: /^roofing$/i })).toBeChecked();
  });

  it('ignores a trade in the URL that is not one of the trades', () => {
    renderAudit('/audit?trade=not-a-real-trade');

    for (const trade of trades) {
      expect(screen.getByRole('radio', { name: trade.label })).not.toBeChecked();
    }
  });

  /*
   * The other half of that loop. Choosing a trade with a page of its own offers it —
   * a link out of a form, which is the right call here because everything entered stays
   * in this browser and coming back to a half-finished audit costs nothing.
   */
  it('offers the trade’s own page once a trade with one is chosen', async () => {
    const user = userEvent.setup();
    renderAudit();

    const hvac = industries.find((industry) => industry.slug === 'hvac');
    expect(screen.queryByRole('link', { name: hvac?.heading ?? '' })).toBeNull();

    await user.click(screen.getByRole('radio', { name: /heating and cooling/i }));

    expect(screen.getByRole('link', { name: hvac?.heading ?? '' })).toHaveAttribute(
      'href',
      hvac?.path,
    );
  });

  it('offers no page for the trade that deliberately has none', async () => {
    const user = userEvent.setup();
    renderAudit();

    await user.click(screen.getByRole('radio', { name: /something else/i }));

    // "Something else" is a first-class answer with no page — see config/trades.ts.
    expect(screen.queryByText(audit.trade.pageLinkIntro)).toBeNull();
  });

  it('scores all twenty categories from the playbook, three options each', () => {
    renderAudit();

    const groups = screen.getAllByRole('group');
    // Twenty categories plus the trade question.
    expect(groups).toHaveLength(playbook.scorecard.categories.length + 1);
  });

  /*
   * A partial score would rank whichever categories somebody answered first, which looks
   * like an answer while being worse than none.
   */
  it('withholds the diagnosis until every category is scored', async () => {
    const user = userEvent.setup();
    renderAudit();

    expect(screen.getByText(audit.diagnosis.incompleteBody)).toBeInTheDocument();

    const first = playbook.scorecard.categories[0];
    const group = screen.getByRole('group', { name: new RegExp(`^${first?.label}`, 'i') });
    await user.click(within(group).getByRole('radio', { name: /^1/ }));

    expect(screen.getByText(audit.diagnosis.incompleteBody)).toBeInTheDocument();
  });

  /*
   * The bands rendered here are the PlayBook's own band objects, and the PlayBook has
   * always shown them under a line saying nobody has calibrated them against anybody's
   * revenue. Here they appeared under "What that is costing you" with nothing attached —
   * the one place on this site an uncalibrated verdict could read as a measurement.
   */
  it('says the band is an uncalibrated self-assessment, beside the band', async () => {
    const user = userEvent.setup();
    renderAudit();

    await scoreEverything(user, '1');

    const region = screen.getByRole('region', { name: new RegExp(audit.diagnosis.heading, 'i') });

    expect(within(region).getByText(audit.diagnosis.bandDisclaimer)).toBeInTheDocument();
    const disclaimer = audit.diagnosis.bandDisclaimer.toLowerCase();

    // The two things it has to deny, however it is worded.
    expect(disclaimer).toContain('self-assessment');
    expect(disclaimer).toContain('validated benchmark');
    expect(disclaimer).toContain('calibrated');
  });

  it('diagnoses the five weakest categories in customer terms once complete', async () => {
    const user = userEvent.setup();
    renderAudit();

    await scoreEverything(user, '0');

    const region = screen.getByRole('region', { name: new RegExp(audit.diagnosis.heading, 'i') });
    const findings = within(region).getAllByRole('listitem');

    // Five findings, each carrying the two labelled beats that make it actionable.
    expect(within(region).getAllByText(audit.diagnosis.labels.consequence)).toHaveLength(5);
    expect(within(region).getAllByText(audit.diagnosis.labels.improvement)).toHaveLength(5);
    expect(findings.length).toBeGreaterThanOrEqual(5);
  });

  it('says so plainly when nothing scored badly, instead of inventing a problem', async () => {
    const user = userEvent.setup();
    renderAudit();

    await scoreEverything(user, '2');

    expect(screen.getByText(audit.diagnosis.perfectBody)).toBeInTheDocument();
  });

  /*
   * The scenario is arithmetic on the visitor's own figures. With none entered there is
   * nothing to compute, and computing anyway would mean inventing their business.
   */
  it('shows no scenario until real numbers are entered', () => {
    renderAudit();

    expect(screen.getByText(audit.scenario.emptyBody)).toBeInTheDocument();
  });

  it('computes the scenario from what was entered and labels it illustrative', async () => {
    const user = userEvent.setup();
    renderAudit();

    await user.type(screen.getByLabelText(/calls and quote requests/i), '20');
    await user.type(screen.getByLabelText(/how many become customers/i), '50');
    await user.type(screen.getByLabelText(/average job is worth/i), '1000');

    // 20 enquiries x 50% = 10 customers, x 1000 = 10,000.
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('10,000')).toBeInTheDocument();

    // The word has to be on screen next to the numbers, not in a page footer.
    expect(screen.getByText(audit.scenario.disclaimer)).toBeInTheDocument();
    expect(audit.scenario.disclaimer.toLowerCase()).toContain('illustrative');
    expect(audit.scenario.disclaimer.toLowerCase()).toContain('not a forecast');
  });

  /*
   * The scenario's whole defence is that the arithmetic is sober. Nothing was stopping a
   * close rate above 100%, which produced more customers than enquiries — an impossible
   * number on the one page that cannot afford one, and exactly what a sceptical owner
   * testing the calculator would type.
   */
  it('cannot be made to show more customers than enquiries', async () => {
    const user = userEvent.setup();
    renderAudit();

    await user.type(screen.getByLabelText(/calls and quote requests/i), '20');
    await user.type(screen.getByLabelText(/how many become customers/i), '500');
    await user.type(screen.getByLabelText(/average job is worth/i), '1000');

    // Clamped to 100%, so 20 enquiries is at most 20 customers — never 100.
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.queryByText('100')).toBeNull();
    expect(screen.getByText('20,000')).toBeInTheDocument();
  });

  /*
   * The same defect, through the UI rather than through the renderer — because the way it
   * shipped was that nothing gated the send step on completeness, and a unit test on the
   * summary alone would not have caught that.
   */
  it('tells the owner an audit was unfinished when it was sent unfinished', async () => {
    const user = userEvent.setup();
    renderAudit();

    // Full marks on the first five categories, then stop. The other fifteen are unscored.
    for (const category of playbook.scorecard.categories.slice(0, 5)) {
      const group = screen.getByRole('group', { name: new RegExp(`^${category.label}`, 'i') });
      await user.click(within(group).getByRole('radio', { name: /^2/ }));
    }

    await user.type(screen.getByLabelText(/your name/i), 'Dana Reed');
    await user.type(screen.getByLabelText(/business name/i), 'Cascade Roofing');
    await user.type(screen.getByLabelText(/^email/i), 'dana@cascade.example');
    await user.type(screen.getByLabelText(/^phone/i), '206-555-0134');
    await user.click(screen.getByRole('button', { name: audit.send.submit.idle }));

    const message = (submitLead.mock.calls[0]?.[0] as Record<string, string>)['message'] ?? '';

    // "10/40" would read in the inbox exactly like twenty categories answered badly.
    expect(message).not.toContain('10/40');
    expect(message).toContain(audit.summary.partial(5, playbook.scorecard.categories.length));
  });

  /*
   * Every other lead path on the site drops bot submissions on an off-screen field. The
   * audit is linked from the main navigation and from all five industry pages, so it is
   * the most worth spamming and was the only one unguarded.
   */
  it('carries the same honeypot as every other form on the site', () => {
    const { container } = renderAudit();

    const honeypot = container.querySelector(`input[name="${HONEYPOT_FIELD}"]`);

    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  /*
   * The consent line has to name what actually leaves the browser, because it is more
   * than an email address.
   */
  it('tells the visitor exactly what sending the audit transmits', () => {
    renderAudit();

    expect(screen.getByText(audit.send.consent)).toBeInTheDocument();
    expect(audit.send.consent).toMatch(/answers/i);
    expect(audit.send.consent).toMatch(/contact details/i);
  });

  it('sends nothing until the visitor submits', async () => {
    const user = userEvent.setup();
    renderAudit();

    await scoreEverything(user, '1');

    expect(submitLead).not.toHaveBeenCalled();
  });

  it('submits the audit through the existing lead contract', async () => {
    const user = userEvent.setup();
    renderAudit();

    await user.click(screen.getByRole('radio', { name: /heating and cooling/i }));
    await scoreEverything(user, '0');

    await user.type(screen.getByLabelText(/your name/i), 'Dana Reed');
    await user.type(screen.getByLabelText(/business name/i), 'Cascade Heating');
    await user.type(screen.getByLabelText(/^email/i), 'dana@cascade.example');
    await user.type(screen.getByLabelText(/^phone/i), '206-555-0134');

    await user.click(screen.getByRole('button', { name: audit.send.submit.idle }));

    expect(submitLead).toHaveBeenCalledTimes(1);

    const payload = submitLead.mock.calls[0]?.[0] as Record<string, string>;
    expect(payload['name']).toBe('Dana Reed');
    expect(payload['businessName']).toBe('Cascade Heating');

    // The audit itself travels in the message field — see auditSummary.ts.
    expect(payload['message']).toContain(audit.summary.title);
    expect(payload['message']).toContain('0/40');
    expect(payload['message']?.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);

    expect(await screen.findByText(audit.send.success.body)).toBeInTheDocument();
  });
});

/*
 * The audit is the longest page on the site and almost every section of it renders
 * conditionally — the diagnosis has three states, the scenario two, the send step three.
 * That makes its heading outline a property of which branch you are in, which is exactly
 * the situation where a level goes missing without anybody noticing.
 */
describe('the heading outline', () => {
  function levelsIn(container: HTMLElement): number[] {
    return [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((node) =>
      Number(node.tagName.slice(1)),
    );
  }

  it('opens with exactly one first-level heading', () => {
    const { container } = renderAudit();
    const levels = levelsIn(container);

    expect(levels.filter((level) => level === 1)).toHaveLength(1);
    expect(levels[0]).toBe(1);
  });

  it('never skips a level before anything has been answered', () => {
    const { container } = renderAudit();

    levelsIn(container).reduce((previous, level) => {
      expect(level, `skips from h${previous} to h${level}`).toBeLessThanOrEqual(previous + 1);
      return level;
    }, 1);
  });

  /*
   * The completed state, which is the one nobody sees while developing: the diagnosis
   * findings and the scenario panels are both on screen, and both add headings.
   */
  it('never skips a level once the diagnosis and the scenario are showing', async () => {
    const user = userEvent.setup();
    const { container } = renderAudit();

    await user.click(screen.getByRole('radio', { name: /heating and cooling/i }));
    await scoreEverything(user, '0');
    await user.type(screen.getByLabelText(/calls and quote requests/i), '20');
    await user.type(screen.getByLabelText(/average job is worth/i), '1000');

    levelsIn(container).reduce((previous, level) => {
      expect(level, `skips from h${previous} to h${level}`).toBeLessThanOrEqual(previous + 1);
      return level;
    }, 1);
  });
});

describe('the audit summary', () => {
  /*
   * The message field is capped at 2000 characters in three independent places and there
   * is no server-side truncation — an over-long body is a hard 400 that the visitor
   * experiences as "that did not send" after five minutes of work.
   */
  it('stays inside the message budget even at maximum length', () => {
    const weakest = playbook.scorecard.categories.slice(0, 5).map((category) => ({
      category,
      score: 0 as const,
    }));

    const rendered = renderAuditSummary({
      trade: 'landscaping',
      total: 3,
      maxTotal: 40,
      answered: 20,
      categoryCount: 20,
      band: playbook.scorecard.bands[0] ?? null,
      weakest,
      funnel: { visitors: 100000, enquiries: 100000, closeRate: 100, jobValue: 100000 },
      lever: 10,
    });

    expect(rendered.length).toBeLessThanOrEqual(MESSAGE_MAX_LENGTH);
    expect(rendered).toContain(audit.summary.title);
  });

  it('records that a figure was not provided rather than inventing a zero', () => {
    const rendered = renderAuditSummary({
      trade: null,
      total: 0,
      maxTotal: 40,
      answered: 0,
      categoryCount: 20,
      band: null,
      weakest: [],
      funnel: { visitors: null, enquiries: null, closeRate: null, jobValue: null },
      lever: 2,
    });

    expect(rendered).toContain(audit.summary.notProvided);
  });

  /*
   * `total` is the sum of what has been answered so far, and `useWebsiteScore` says in as
   * many words that it is meaningless until complete. Printing it against the full
   * maximum told the owner the opposite of the truth: somebody who scored five categories
   * at full marks and stopped was reported as "10/40" — identical to somebody who
   * answered all twenty and is failing. The owner triages on that number.
   */
  it('never reports a part-finished audit as a score out of the full total', () => {
    const rendered = renderAuditSummary({
      trade: 'roofing',
      total: 10,
      maxTotal: 40,
      answered: 5,
      categoryCount: 20,
      band: null,
      weakest: [],
      funnel: { visitors: null, enquiries: null, closeRate: null, jobValue: null },
      lever: 2,
    });

    expect(rendered).not.toContain('10/40');
    expect(rendered).toContain(audit.summary.partial(5, 20));
    expect(rendered.toLowerCase()).toContain('not finished');
  });

  it('reports a finished audit as a plain score', () => {
    const rendered = renderAuditSummary({
      trade: 'roofing',
      total: 31,
      maxTotal: 40,
      answered: 20,
      categoryCount: 20,
      band: null,
      weakest: [],
      funnel: { visitors: null, enquiries: null, closeRate: null, jobValue: null },
      lever: 2,
    });

    expect(rendered).toContain('31/40');
    expect(rendered.toLowerCase()).not.toContain('not finished');
  });
});
