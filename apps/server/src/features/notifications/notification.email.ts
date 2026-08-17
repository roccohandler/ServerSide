import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import { escapeHtml } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';

/*
 * ============================================================================
 * THE LIFECYCLE EMAILS
 * ============================================================================
 *
 * Built by hand against `emailTheme`, exactly as `auth.email.ts`, `lead.email.ts` and the rest
 * are: a mail client strips `<style>` and knows nothing about custom properties, so the
 * deduplication has to happen in TypeScript before the string exists.
 *
 * ## What every one of these has to do, in the order a reader does it
 *
 * A transactional email is skimmed, not read. It is opened on a phone, in a list, by somebody
 * who wants two facts and then wants to leave: **what happened**, and **what they should do
 * about it**. So each of these is a heading that states the event, one or two sentences of
 * context, one button, and nothing else. There is no marketing, no cross-sell and no
 * "while you're here".
 *
 * The subject line carries the business name where there is one, because a customer with a
 * website being built is a person who will get several of these and needs to sort them.
 *
 * ## Everything interpolated is escaped
 *
 * Business names, task titles, personal names and comment bodies all arrive from a form
 * somebody typed into. None of it is trusted markup, and `escapeHtml` is applied at the helper
 * rather than at each call site so that adding a builder cannot forget it.
 */

interface Recipient {
  readonly email: string;
  readonly name: string;
}

/* ------------------------------------------------------------------ helpers */

function button(href: string, label: string): string {
  return `<p style="margin:0 0 20px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:${t.accentFill};color:${t.onAccent};text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

function layout(heading: string, body: readonly string[]): string {
  return [
    `<div style="font-family:${t.font};line-height:1.6;color:${t.ink}">`,
    `<h2 style="margin:0 0 16px;font-size:20px;letter-spacing:-0.02em">${escapeHtml(heading)}</h2>`,
    ...body,
    '</div>',
  ].join('');
}

function paragraph(text: string, muted = false): string {
  return `<p style="margin:0 0 16px${muted ? `;color:${t.inkMuted}` : ''}">${escapeHtml(text)}</p>`;
}

/**
 * A quoted passage — somebody else's words, set apart from ours.
 *
 * Used for a reply and for a task description. The rule is that anything written by a person
 * is visually distinct from anything written by the system, because the alternative is a
 * customer reading our sentence in their supplier's voice.
 */
function quote(text: string): string {
  return `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid ${t.accent};background:${t.page};color:${t.ink}">${escapeHtml(text)}</blockquote>`;
}

/**
 * Assembles the two halves once.
 *
 * Every builder below returns HTML and text saying the same thing, and the text half is not
 * decoration: a meaningful share of readers are on a client that shows it, and a message whose
 * plain-text alternative is empty is one that scores as spam.
 *
 * ## The heading goes into both, and it did not used to
 *
 * The HTML wrapper renders the heading as an `<h2>` and the text half began at whatever the
 * builder passed — usually "Hello <name>,". For most of these that made no difference, because
 * the first sentence restates the event anyway.
 *
 * `buildEstimateChangedEmail` is where it did. Its heading is the only place the *direction*
 * appears — "moved back" versus "moved forward" — so a reader on a text-only client got the two
 * dates and no indication which way the news went. That is precisely the message where getting
 * it wrong matters most.
 *
 * Prepending it here rather than in each builder means the next one cannot reintroduce the gap.
 */
function message(params: {
  readonly to: string;
  readonly subject: string;
  readonly heading: string;
  readonly html: readonly string[];
  readonly text: readonly string[];
  readonly replyTo?: string;
}): EmailMessage {
  return {
    to: params.to,
    subject: params.subject,
    html: layout(params.heading, params.html),
    text: [params.heading, '', ...params.text].join('\n'),
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  };
}

/* ------------------------------------------------------------------ customer */

export function buildPreviewReadyEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly projectUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `Your website preview is ready — ${params.businessName}`,
    heading: 'Your website preview is ready',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(
        'Your website is ready to look at. Have a look through it and tell us anything you would like changed — nothing goes live until you say so.',
      ),
      button(params.projectUrl, 'Open the preview'),
      paragraph('Leave your notes on the Feedback tab and we will work through them.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      'Your website is ready to look at. Have a look through it and tell us anything you',
      'would like changed — nothing goes live until you say so.',
      '',
      params.projectUrl,
      '',
      'Leave your notes on the Feedback tab and we will work through them.',
    ],
  });
}

export function buildApprovalRequestedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly projectUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `Ready for your approval — ${params.businessName}`,
    heading: 'Ready for your approval',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(
        'The changes you asked for are done. Have a last look, and when you are happy, approve it and we will put it live.',
      ),
      button(params.projectUrl, 'Review and approve'),
      /*
       * Stated plainly, because it is the one irreversible action in the customer's portal and
       * the page itself says so. An email that hides that is an email that gets a phone call.
       */
      paragraph('Approving is what starts the launch, so take your time over it.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      'The changes you asked for are done. Have a last look, and when you are happy,',
      'approve it and we will put it live.',
      '',
      params.projectUrl,
      '',
      'Approving is what starts the launch, so take your time over it.',
    ],
  });
}

/**
 * One email for however many tasks arrived.
 *
 * ============================================================================
 * WHY THIS IS COALESCED AND NOTHING ELSE IS
 * ============================================================================
 *
 * `seedOnboarding` creates five tasks in a loop the instant a deposit clears. Five emails in
 * the same second, on the happiest day of the relationship, is the single most likely way this
 * whole feature becomes something people filter — and it would arrive on the day a customer has
 * just paid several thousand dollars, which is the worst possible first impression of the
 * system they have bought.
 *
 * So the caller passes the set and this sends one message. The first title is named because a
 * list of five things is a list nobody starts; one named thing plus a count is a list somebody
 * opens.
 * ============================================================================
 */
export function buildTasksAssignedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly titles: readonly string[];
  readonly firstDescription: string | undefined;
  readonly tasksUrl: string;
}): EmailMessage {
  const count = params.titles.length;
  const first = params.titles[0] ?? 'a few details';
  const more = count - 1;

  const heading = count === 1 ? 'One thing we need from you' : `${String(count)} things we need`;

  const opening =
    count === 1
      ? `To carry on with your website we need one thing from you: ${first}.`
      : `To carry on with your website we need ${String(count)} things from you. The first is: ${first}.`;

  return message({
    to: params.to.email,
    subject:
      count === 1
        ? `We need one thing from you — ${params.businessName}`
        : `We need ${String(count)} things from you — ${params.businessName}`,
    heading,
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(opening),
      ...(params.firstDescription ? [quote(params.firstDescription)] : []),
      button(params.tasksUrl, count === 1 ? 'Send us what we need' : 'See everything we need'),
      ...(more > 0 ? [paragraph(`The other ${String(more)} are on the same page.`, true)] : []),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      opening,
      ...(params.firstDescription ? ['', params.firstDescription] : []),
      '',
      params.tasksUrl,
      ...(more > 0 ? ['', `The other ${String(more)} are on the same page.`] : []),
    ],
  });
}

export function buildFeedbackRepliedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly authorName: string;
  readonly body: string;
  readonly feedbackUrl: string;
}): EmailMessage {
  /* Enough to know whether it needs answering now, not the whole thing. */
  const preview = params.body.length > 240 ? `${params.body.slice(0, 240)}…` : params.body;

  return message({
    to: params.to.email,
    subject: `${params.authorName} replied about your website — ${params.businessName}`,
    heading: `${params.authorName} replied`,
    html: [
      paragraph(`Hello ${params.to.name},`),
      quote(preview),
      button(params.feedbackUrl, 'Open the conversation'),
      paragraph('Replying here keeps everything about your website in one place.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      `${params.authorName} replied:`,
      '',
      preview,
      '',
      params.feedbackUrl,
    ],
  });
}

export function buildProjectLaunchedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly productionUrl: string | undefined;
  readonly dashboardUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `Your website is live — ${params.businessName}`,
    heading: 'Your website is live',
    html: [
      paragraph(`Hello ${params.to.name},`),
      ...(params.productionUrl
        ? [paragraph(`It is up at ${params.productionUrl}.`)]
        : [paragraph('It is up and being looked after.')]),
      /*
       * The baseline, named here because launch day is when it is recorded and this is the only
       * message that lands on launch day. A customer who is told the number exists is a customer
       * who can ask about it later, which is what makes the monthly report worth anything.
       */
      paragraph(
        'Your enquiry baseline — how many calls and quote requests the site is producing today — is recorded now, so anything that changes from here has something honest to be measured against.',
      ),
      button(params.productionUrl ?? params.dashboardUrl, 'Open my website'),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      params.productionUrl
        ? `Your website is live at ${params.productionUrl}.`
        : 'Your website is live.',
      '',
      'Your enquiry baseline — how many calls and quote requests the site is producing today —',
      'is recorded now, so anything that changes from here has something honest to be measured',
      'against.',
      '',
      params.productionUrl ?? params.dashboardUrl,
    ],
  });
}

/**
 * Money is owed, and here is where to pay it.
 *
 * ============================================================================
 * ONE MESSAGE, TWO HALVES OF A BUILD, TWO KINDS OF LINK
 * ============================================================================
 *
 * `stage` picks the sentence and `payUrl` decides where the button goes, and the two vary
 * independently — which is why neither is derived from the other.
 *
 * The **deposit** is what starts a build, and it is normally asked for by an owner who has just
 * agreed a scope over the phone. The client may not have an account at all at that point, so
 * the link is a Stripe Checkout URL: the one address that works for somebody with nothing to
 * sign in to.
 *
 * The **final** instalment is owed by somebody who has been in the portal for weeks. It is
 * asked for automatically when the site goes to launch, and the link is their billing page,
 * which is the surface they already know and which cannot go stale the way a minted session can.
 *
 * The two are still one message because they are one event to the reader — *you owe us this,
 * press here* — and splitting them would be two templates whose Stripe disclaimer drifts.
 * ============================================================================
 */
export function buildPaymentDueEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly stage: 'deposit' | 'final';
  readonly amountLabel: string;
  readonly payUrl: string;
}): EmailMessage {
  const deposit = params.stage === 'deposit';

  const subject = deposit
    ? `Your deposit — ${params.businessName}`
    : `Launch payment — ${params.businessName}`;

  const heading = deposit ? 'Ready to start your website' : 'The launch payment is ready';

  const body = deposit
    ? `The first half of the build — ${params.amountLabel} — is what puts you on the schedule. As soon as it clears we will ask you for your logo, photos and services, and the build starts.`
    : `Your website is approved and being put live. The second half of the build — ${params.amountLabel} — is what settles it.`;

  const cta = deposit ? 'Pay the deposit' : 'Pay the launch instalment';

  return message({
    to: params.to.email,
    subject,
    heading,
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(body),
      button(params.payUrl, cta),
      paragraph('Payment is handled by Stripe. We never see or store your card details.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      body,
      '',
      params.payUrl,
      '',
      'Payment is handled by Stripe. We never see or store your card details.',
    ],
  });
}

/**
 * A Growth Partner payment did not collect.
 *
 * The one money email this system sends that Stripe's own does not replace. Stripe's dunning
 * mail is about an invoice; this is about their website, and it says the thing the customer
 * actually wants to know before they will act on it — **nothing has been switched off** — which
 * is also the sentence `chooseCurrentAction` puts on the dashboard for the same state. The two
 * agreeing is not decoration: somebody who reads one and then sees the other should not have to
 * work out whether they describe the same problem.
 */
export function buildPaymentFailedEmail(params: {
  readonly to: Recipient;
  readonly billingUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: 'A payment did not go through',
    heading: 'A payment did not go through',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(
        'Your Growth Partner payment could not be collected. Updating your card is all it takes, and everything carries on as normal — nothing has been switched off.',
      ),
      button(params.billingUrl, 'Update my payment details'),
      paragraph('This opens Stripe’s secure page. We never see or store your card details.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      'Your Growth Partner payment could not be collected. Updating your card is all it takes,',
      'and everything carries on as normal — nothing has been switched off.',
      '',
      params.billingUrl,
      '',
      'This opens Stripe’s secure page. We never see or store your card details.',
    ],
  });
}

/**
 * The target launch date moved.
 *
 * Sent **only on movement**, never when an estimate is first set. A first estimate is good news
 * arriving with the project; a change is the thing a customer needs to hear from us rather than
 * discover. An estimate that slips silently is worse than no estimate at all, which is the whole
 * risk of publishing one.
 */
export function buildEstimateChangedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly previous: string;
  readonly next: string;
  readonly later: boolean;
  readonly projectUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `Launch date update — ${params.businessName}`,
    heading: params.later
      ? 'Your launch date has moved back'
      : 'Your launch date has moved forward',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(
        params.later
          ? `We had your website down to launch on ${params.previous}. It is now ${params.next}, and we wanted you to hear that from us rather than notice it.`
          : `Good news — your website was down to launch on ${params.previous} and is now on track for ${params.next}.`,
      ),
      button(params.projectUrl, 'See your project'),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      params.later
        ? `We had your website down to launch on ${params.previous}. It is now ${params.next}, and we wanted you to hear that from us rather than notice it.`
        : `Good news — your website was down to launch on ${params.previous} and is now on track for ${params.next}.`,
      '',
      params.projectUrl,
    ],
  });
}

export function buildFileDeliveredEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly filename: string;
  readonly note: string | undefined;
  readonly projectUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `We have sent you a file — ${params.businessName}`,
    heading: 'There is something new for you',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(`We have added ${params.filename} to your project.`),
      ...(params.note ? [quote(params.note)] : []),
      button(params.projectUrl, 'Open my project'),
      /*
       * The link goes to the portal rather than to the file. A blob URL in an email is a URL
       * that outlives the relationship, gets forwarded, and cannot be withdrawn; the portal is
       * behind a session and can be.
       */
      paragraph('It is on your project page, where it will stay.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      `We have added ${params.filename} to your project.`,
      ...(params.note ? ['', params.note] : []),
      '',
      params.projectUrl,
    ],
  });
}

/**
 * The free review, delivered.
 *
 * ============================================================================
 * THE ONE EMAIL THAT KEEPS THE PROMISE ON THE FRONT PAGE
 * ============================================================================
 *
 * "Get my free website assessment" is the primary call to action on every marketing page,
 * and this is the message that makes it true. Everything else in this file reports on work
 * somebody has already bought.
 *
 * So it is deliberately the least salesy message here. There is no offer, no price and no
 * "book a call" — the review itself is the argument, and a reader who has just been told
 * their website has four problems does not need to be sold to in the same breath. The
 * headline count is the hook: a number in a subject line is a reason to open it, and it is
 * a number we can say honestly because a person wrote each one.
 *
 * `findingCount` of zero is a real outcome and reads as good news rather than as an empty
 * list, which is why the sentence branches rather than interpolating a `0`.
 * ============================================================================
 */
export function buildAssessmentDeliveredEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly findingCount: number;
  readonly preparedBy: string;
  readonly assessmentUrl: string;
}): EmailMessage {
  const found =
    params.findingCount === 0
      ? 'We went through it and did not find anything that needs fixing urgently — the detail is in the review.'
      : params.findingCount === 1
        ? 'We found one thing worth fixing, and the review explains what it is and why it matters.'
        : `We found ${params.findingCount} things worth fixing, and the review explains what each one is and why it matters.`;

  return message({
    to: params.to.email,
    subject: `Your website review is ready — ${params.businessName}`,
    heading: 'Your website review is ready',
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(`${params.preparedBy} has looked through your website. ${found}`),
      button(params.assessmentUrl, 'Read my review'),
      paragraph('It stays in your account, so you can come back to it whenever you like.', true),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      `${params.preparedBy} has looked through your website. ${found}`,
      '',
      params.assessmentUrl,
    ],
  });
}

/**
 * The monthly Website Performance Report.
 *
 * The subject line names the month and nothing else about the result. That is the same
 * discipline `BillingPage` applies to the enquiry figure and for the same reason: a subject
 * promising the number went up is a promise this side does not get to make, and a month where
 * it went down is exactly the month the report is most worth reading.
 */
export function buildReportPublishedEmail(params: {
  readonly to: Recipient;
  readonly businessName: string;
  readonly monthLabel: string;
  readonly reportsUrl: string;
}): EmailMessage {
  return message({
    to: params.to.email,
    subject: `Your ${params.monthLabel} website report — ${params.businessName}`,
    heading: `Your ${params.monthLabel} website report`,
    html: [
      paragraph(`Hello ${params.to.name},`),
      paragraph(
        `Your report for ${params.monthLabel} is ready. It covers how many enquiries your website produced, what we changed, and what we are doing next.`,
      ),
      button(params.reportsUrl, 'Read the report'),
    ],
    text: [
      `Hello ${params.to.name},`,
      '',
      `Your report for ${params.monthLabel} is ready. It covers how many enquiries your website produced, what we changed, and what we are doing next.`,
      '',
      params.reportsUrl,
    ],
  });
}

/* ------------------------------------------------------------------- owner */

/*
 * The owner's immediate three. Everything else about a customer's day reaches them in the
 * digest — see `IMMEDIATE_KINDS` for the rule and the argument.
 *
 * These are deliberately terser than the customer's. The owner is not being persuaded of
 * anything; they need the business name, the fact, and enough to decide whether to act now.
 * The subject line carries the whole message wherever it can, because these are triaged on a
 * phone.
 */

export function buildOwnerActionEmail(params: {
  readonly recipient: string;
  readonly subject: string;
  readonly heading: string;
  readonly lines: readonly string[];
  /** So the owner can reply straight to the client from their mail app. */
  readonly replyTo?: string;
}): EmailMessage {
  return message({
    to: params.recipient,
    subject: params.subject,
    heading: params.heading,
    html: params.lines.map((line) => paragraph(line)),
    /* Not prefixed with the heading — `message` does that for every builder now. */
    text: params.lines,
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  });
}
