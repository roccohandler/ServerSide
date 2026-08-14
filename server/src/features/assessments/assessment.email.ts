import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import { escapeHtml } from '../../lib/html.js';
import type { StoredUser } from '../auth/index.js';
import type { StoredAssessment } from './assessment.types.js';

/**
 * The owner's notification that somebody completed an assessment.
 *
 * This is the highest-intent signal the site produces: a business owner has answered
 * twenty questions about their own website and created an account to keep the result.
 * The email is built to be actionable in one glance — who, what score, which areas —
 * and to be replied to directly.
 *
 * Every interpolated value came from a form, so all of it is escaped.
 */
export function buildAssessmentNotificationEmail(params: {
  readonly assessment: StoredAssessment;
  readonly user: StoredUser;
  readonly recipient: string;
}): EmailMessage {
  const { assessment, user, recipient } = params;

  const rows: readonly (readonly [string, string])[] = [
    ['Business', assessment.businessName],
    ['Contact', `${user.name} <${user.email}>`],
    ['Website', assessment.websiteUrl ?? 'not given'],
    ['Trade', assessment.trade ?? 'not given'],
    ['Score', `${assessment.score} / 100 (${assessment.band})`],
    [
      'Weakest',
      assessment.weakestCategories.length > 0
        ? assessment.weakestCategories.join(', ')
        : 'nothing stood out',
    ],
    ['Answered', `${assessment.answers.length} questions`],
  ];

  const htmlRows = rows
    .map(
      ([label, value]) =>
        `<tr><th align="left" style="padding:6px 16px 6px 0;color:${t.inkMuted};font-weight:600;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</th><td style="padding:6px 0;color:${t.ink}">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return {
    to: recipient,
    subject: `Assessment: ${assessment.businessName} scored ${assessment.score}`,
    text: [
      'Somebody completed a website assessment and created an account.',
      '',
      ...rows.map(([label, value]) => `${label}: ${value}`),
      ...(assessment.note ? ['', `They added: ${assessment.note}`] : []),
    ].join('\n'),
    html: [
      `<div style="font-family:${t.font};line-height:1.5;color:${t.ink}">`,
      `<h2 style="margin:0 0 16px;font-size:18px;letter-spacing:-0.02em">Assessment completed</h2>`,
      `<table cellpadding="0" cellspacing="0" style="font-size:14px">${htmlRows}</table>`,
      assessment.note
        ? `<p style="margin:20px 0 0;font-size:14px;color:${t.ink}">They added: ${escapeHtml(assessment.note)}</p>`
        : '',
      '</div>',
    ].join(''),
    replyTo: user.email,
  };
}
