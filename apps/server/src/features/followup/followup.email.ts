import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import { escapeHtml } from '../../lib/html.js';
import type { FollowUpRule } from './followup.types.js';

/*
 * ============================================================================
 * THE ONE KIND OF MESSAGE THIS SYSTEM SENDS THAT SOMEBODY CAN STOP
 * ============================================================================
 *
 * Every other email in the application is transactional: it reports something the recipient
 * did, bought, or is being asked for. This one is not. Nobody asked to be reminded, and the
 * whole feature exists because it is worth sending anyway — which is exactly the situation an
 * unsubscribe link is for.
 *
 * ## Why the builder lives here rather than in `notification.email.ts`
 *
 * Because the footer is not optional and must not become optional. Putting these alongside
 * the transactional builders would make the unsubscribe link a parameter some of them pass —
 * and the day somebody adds a fifth marketing message to that file, the thing they will forget
 * is the parameter. Here it is not a parameter: `buildFollowUpEmail` takes the URL and there
 * is no way to call it without one.
 *
 * The visual language is deliberately identical to the transactional mail, and that is not
 * laziness — a follow-up that looked like a different company's newsletter would be the more
 * confusing of the two options for somebody who has had one email from us.
 * ============================================================================
 */

function paragraph(text: string, muted = false): string {
  return `<p style="margin:0 0 16px${muted ? `;color:${t.inkMuted}` : ''}">${escapeHtml(text)}</p>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 20px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:${t.accentFill};color:${t.onAccent};text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

/**
 * The footer, and the only reason this file is separate from the transactional builders.
 *
 * Muted and small, because it is not the point of the message — but present on every single
 * one, and one click rather than a preference centre. A person who wants to stop hearing from
 * a supplier should not have to sign in to say so.
 */
function unsubscribeFooter(unsubscribeUrl: string): string {
  return (
    `<hr style="margin:24px 0 16px;border:0;border-top:1px solid ${t.border}">` +
    `<p style="margin:0;font-size:13px;color:${t.inkMuted}">` +
    'This is a reminder about an account you created, not a newsletter. ' +
    `<a href="${escapeHtml(unsubscribeUrl)}" style="color:${t.inkMuted}">Stop these emails</a>` +
    ' and we will not send another.' +
    '</p>'
  );
}

export function buildFollowUpEmail(params: {
  readonly to: { readonly email: string; readonly name: string };
  readonly rule: FollowUpRule;
  readonly actionUrl: string;
  readonly unsubscribeUrl: string;
  /** Where a reply lands. Undefined sends it to the transactional address, as elsewhere. */
  readonly replyTo?: string | undefined;
}): EmailMessage {
  const { to, rule, actionUrl, unsubscribeUrl } = params;

  return {
    to: to.email,
    subject: rule.subject,
    html: [
      `<div style="font-family:${t.font};line-height:1.6;color:${t.ink}">`,
      `<h2 style="margin:0 0 16px;font-size:20px;letter-spacing:-0.02em">${escapeHtml(rule.heading)}</h2>`,
      paragraph(`Hello ${to.name},`),
      ...rule.lines.map((line) => paragraph(line)),
      button(actionUrl, rule.action.label),
      unsubscribeFooter(unsubscribeUrl),
      '</div>',
    ].join(''),
    text: [
      rule.heading,
      '',
      `Hello ${to.name},`,
      '',
      ...rule.lines,
      '',
      actionUrl,
      '',
      '---',
      'This is a reminder about an account you created, not a newsletter.',
      `Stop these emails: ${unsubscribeUrl}`,
    ].join('\n'),
    ...(params.replyTo ? { replyTo: params.replyTo } : {}),
  };
}
