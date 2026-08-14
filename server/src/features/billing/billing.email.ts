import { escapeHtml } from '../../lib/html.js';
import { emailTheme as t } from '../../lib/emailTheme.js';
import type { EmailMessage } from '../../infrastructure/email/email.service.js';
import type { BillingProduct, StoredProject } from './billing.types.js';

/*
 * Owner notifications for money events. The client's own receipt comes from Stripe —
 * these exist so the owner never learns about a payment by logging into a dashboard.
 */

const PRODUCT_LABELS: Record<BillingProduct, string> = {
  'build-deposit': 'Build deposit (half of the project price)',
  'build-final': 'Launch payment (second half of the project price)',
  'growth-partner-monthly': 'Growth Partner subscription (monthly)',
  'growth-partner-annual': 'Growth Partner subscription (annual)',
};

export function describeBillingProduct(product: BillingProduct): string {
  return PRODUCT_LABELS[product];
}

function simpleEmail(params: {
  readonly to: string;
  readonly subject: string;
  readonly lines: readonly string[];
}): EmailMessage {
  const text = params.lines.join('\n');
  const html = `<div style="font-family:${t.font};line-height:1.6;color:${t.ink}">${params.lines
    .map((line) => `<p style="margin:0 0 12px">${escapeHtml(line)}</p>`)
    .join('')}</div>`;

  return { to: params.to, subject: params.subject, text, html };
}

/**
 * The owner's "money arrived" notification.
 *
 * `project` is optional because there are two ways a payment happens: against a project
 * the owner set up by hand, and from a customer's own dashboard before any project
 * exists. The second case is the one the platform funnel produces, and the project it
 * creates is created by the webhook a moment later — so the email says what is true at
 * the time it is sent rather than naming an id that did not exist yet.
 */
export function buildPaymentReceivedEmail(params: {
  readonly project: StoredProject | undefined;
  readonly product: BillingProduct;
  readonly recipient: string;
}): EmailMessage {
  const { project, product, recipient } = params;

  if (!project) {
    return simpleEmail({
      to: recipient,
      subject: 'Payment received — new customer',
      lines: [
        'Stripe has confirmed a payment made from a customer dashboard.',
        `What was paid: ${describeBillingProduct(product)}.`,
        product === 'build-deposit'
          ? 'Their project and onboarding tasks have been created automatically. Open the admin projects list to see it.'
          : 'Nothing else to do; this is the record.',
      ],
    });
  }

  return simpleEmail({
    to: recipient,
    subject: `Payment received — ${project.businessName}`,
    lines: [
      `Stripe has confirmed a payment for ${project.businessName} (${project.contactName}, ${project.email}).`,
      `What was paid: ${describeBillingProduct(product)}.`,
      `Project id: ${project.id}.`,
      product === 'build-deposit'
        ? 'They are on the build schedule — the onboarding form on /welcome collects their materials.'
        : 'Nothing else to do; this is the record.',
    ],
  });
}

export function buildPaymentFailedEmail(params: {
  readonly projectId: string | undefined;
  readonly detail: string;
  readonly recipient: string;
}): EmailMessage {
  return simpleEmail({
    to: params.recipient,
    subject: 'A payment failed',
    lines: [
      'Stripe reported a failed payment.',
      params.projectId ? `Project id: ${params.projectId}.` : 'No project id was attached.',
      `Detail: ${params.detail}`,
      'Nothing is owed to Stripe from you — this is a prompt to follow up with the client.',
    ],
  });
}

export function buildPaymentRefundedEmail(params: {
  readonly projectId: string | undefined;
  readonly detail: string;
  readonly recipient: string;
}): EmailMessage {
  return simpleEmail({
    to: params.recipient,
    subject: 'A payment was refunded',
    lines: [
      'Stripe reported a refund.',
      params.projectId
        ? `Project id: ${params.projectId}.`
        : 'The refund could not be matched to a project — check the Stripe dashboard.',
      `Detail: ${params.detail}`,
      'Refunds are only ever issued from the Stripe dashboard, so this should match something you did on purpose.',
    ],
  });
}
