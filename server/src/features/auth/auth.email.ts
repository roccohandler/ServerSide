import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import { escapeHtml } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { StoredUser } from './auth.types.js';

/*
 * The three transactional emails authentication sends.
 *
 * Plain, short and link-first, because every one of them exists to get somebody back to
 * a page rather than to be read. Built by hand against `emailTheme`, like the lead and
 * subscriber emails: a mail client strips `<style>` and knows nothing about custom
 * properties, so the deduplication has to happen in TypeScript before the string exists.
 *
 * Everything interpolated is escaped. A display name arrives from a signup form or from
 * Google, and neither is trusted markup.
 */

/** Where the reset and verification links land. Kept here so both halves agree. */
export const AUTH_LINK_PATHS = {
  verifyEmail: '/verify-email',
  resetPassword: '/reset-password',
  dashboard: '/app',
} as const;

function link(siteUrl: string, path: string, token: string): string {
  return `${siteUrl}${path}?token=${encodeURIComponent(token)}`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 20px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 20px;background:${t.accentFill};color:${t.onAccent};text-decoration:none;border-radius:8px;font-weight:600">${escapeHtml(label)}</a></p>`;
}

/** One wrapper so all three emails share a font stack, a colour and a heading size. */
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

export function buildVerifyEmailEmail(params: {
  readonly user: StoredUser;
  readonly token: string;
  readonly siteUrl: string;
}): EmailMessage {
  const url = link(params.siteUrl, AUTH_LINK_PATHS.verifyEmail, params.token);

  return {
    to: params.user.email,
    subject: 'Confirm your email address',
    html: layout('Confirm your email address', [
      paragraph(`Hello ${params.user.name},`),
      paragraph('Confirming your address lets us send you updates about your website project.'),
      button(url, 'Confirm my email address'),
      paragraph(
        'The link works for 24 hours. If you did not create an account, you can ignore this email.',
        true,
      ),
    ]),
    text: [
      `Hello ${params.user.name},`,
      '',
      'Confirm your email address so we can send you updates about your website project:',
      url,
      '',
      'The link works for 24 hours. If you did not create an account, ignore this email.',
    ].join('\n'),
  };
}

export function buildPasswordResetEmail(params: {
  readonly user: StoredUser;
  readonly token: string;
  readonly siteUrl: string;
}): EmailMessage {
  const url = link(params.siteUrl, AUTH_LINK_PATHS.resetPassword, params.token);

  return {
    to: params.user.email,
    subject: 'Reset your password',
    html: layout('Reset your password', [
      paragraph(`Hello ${params.user.name},`),
      paragraph('Use the link below to choose a new password.'),
      button(url, 'Choose a new password'),
      paragraph(
        'The link works for one hour and can be used once. If you did not ask for this, nothing has changed and you can ignore this email.',
        true,
      ),
    ]),
    text: [
      `Hello ${params.user.name},`,
      '',
      'Choose a new password:',
      url,
      '',
      'The link works for one hour and can be used once.',
      'If you did not ask for this, nothing has changed and you can ignore this email.',
    ].join('\n'),
  };
}

export function buildWelcomeEmail(params: {
  readonly user: StoredUser;
  readonly siteUrl: string;
}): EmailMessage {
  const url = `${params.siteUrl}${AUTH_LINK_PATHS.dashboard}`;

  return {
    to: params.user.email,
    subject: 'Your JobForge account is ready',
    html: layout('Your account is ready', [
      paragraph(`Hello ${params.user.name},`),
      paragraph(
        'Your dashboard is where your assessment, your website project and your billing all live.',
      ),
      button(url, 'Open my dashboard'),
      paragraph('Nothing is charged until you choose a plan.', true),
    ]),
    text: [
      `Hello ${params.user.name},`,
      '',
      'Your dashboard is where your assessment, your website project and your billing all live.',
      '',
      url,
      '',
      'Nothing is charged until you choose a plan.',
    ].join('\n'),
  };
}
