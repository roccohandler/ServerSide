import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '../../../lib/appError.js';
import type { Logger } from '../../../lib/logger.js';
import type {
  DeploymentEnvironment,
  DeploymentProvider,
  DeploymentState,
} from '../deployment.types.js';

/*
 * ============================================================================
 * VERCEL
 * ============================================================================
 *
 * The only file in the application that knows what Vercel's webhook looks like.
 *
 * ## Signature verification is not optional
 *
 * This endpoint sets the URL a customer is told is their website. An unauthenticated
 * version of it lets anybody on the internet point a client's dashboard at a page of
 * their choosing — which is a phishing primitive with our branding around it, not a
 * cosmetic bug. Vercel signs every delivery with HMAC-SHA1 over the raw body using the
 * integration's client secret, and `x-vercel-signature` carries the digest.
 *
 * SHA-1 is Vercel's choice, not one made here. It is an HMAC rather than a bare hash,
 * which is what makes it sound at this: HMAC-SHA1 has no practical forgery attack, and
 * the collision weaknesses that retired SHA-1 for certificates do not apply.
 *
 * ## Which project a deployment belongs to
 *
 * Vercel does not know about JobForge projects, so the link has to be carried in
 * something Vercel does know about. The deployment's `meta` is where it goes: the build
 * that produces a client site sets `jobforgeProjectId` in its metadata. A payload
 * without one is ignored rather than guessed at — an unattributed deployment is not a
 * reason to update a project chosen by some heuristic.
 * ============================================================================
 */

const SIGNATURE_HEADER = 'x-vercel-signature';

/** Vercel's deployment event names, and what each one means for a project. */
const STATE_BY_EVENT: Readonly<Record<string, DeploymentState>> = {
  'deployment.created': 'queued',
  'deployment.building': 'building',
  'deployment.succeeded': 'ready',
  'deployment.ready': 'ready',
  'deployment.error': 'failed',
  'deployment.canceled': 'cancelled',
};

export interface VercelProviderOptions {
  /**
   * The integration's client secret, used to verify signatures. Undefined means the
   * deployment webhook is switched off — it answers 503 rather than trusting anything.
   */
  readonly webhookSecret: string | undefined;
  readonly logger: Logger;
}

function headerValue(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  name: string,
): string | undefined {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function stringField(object: Record<string, unknown>, key: string): string | undefined {
  const value = object[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function objectField(object: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = object[key];
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

/** Vercel's `target`: `production`, or null/`preview` for everything else. */
function environmentOf(target: string | undefined): DeploymentEnvironment {
  return target === 'production' ? 'production' : 'preview';
}

/** A deployment `url` from Vercel has no scheme. A customer needs one they can click. */
function absolute(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function createVercelProvider(options: VercelProviderOptions): DeploymentProvider {
  const { webhookSecret, logger } = options;

  return {
    parseWebhook({ rawBody, headers }) {
      if (!webhookSecret) {
        throw new AppError(
          'SERVICE_UNAVAILABLE',
          'Deployment tracking is not configured on this deployment. Set VERCEL_WEBHOOK_SECRET.',
        );
      }

      const provided = headerValue(headers, SIGNATURE_HEADER);
      if (!provided) {
        throw new AppError('FORBIDDEN', 'Unsigned request.');
      }

      const expected = createHmac('sha1', webhookSecret).update(rawBody).digest('hex');
      const providedBuffer = Buffer.from(provided);
      const expectedBuffer = Buffer.from(expected);

      if (
        providedBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(providedBuffer, expectedBuffer)
      ) {
        logger.warn('deployment.vercel_signature_rejected');
        throw new AppError('FORBIDDEN', 'Signature verification failed.');
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
      } catch {
        throw new AppError('MALFORMED_REQUEST', 'The request could not be read.');
      }

      const type = stringField(payload, 'type');
      const state = type ? STATE_BY_EVENT[type] : undefined;

      // An event type this does not track. Not an error — Vercel sends many.
      if (!state) {
        logger.info('deployment.vercel_event_ignored', { type: type ?? 'unknown' });
        return null;
      }

      const deployment = objectField(objectField(payload, 'payload'), 'deployment');
      const meta = objectField(deployment, 'meta');

      const projectId = stringField(meta, 'jobforgeProjectId');
      if (!projectId) {
        logger.warn('deployment.vercel_event_unattributed', { type });
        return null;
      }

      const externalId =
        stringField(deployment, 'id') ?? stringField(objectField(payload, 'payload'), 'id');
      if (!externalId) {
        logger.warn('deployment.vercel_event_without_id', { type });
        return null;
      }

      // Vercel sends epoch milliseconds. Falling back to "now" keeps a malformed
      // timestamp from discarding an otherwise valid deployment.
      const createdAt = payload['createdAt'];

      return {
        provider: 'vercel',
        externalId,
        projectId,
        environment: environmentOf(stringField(deployment, 'target')),
        state,
        url: absolute(stringField(deployment, 'url')),
        commitSha: stringField(meta, 'githubCommitSha'),
        commitMessage: stringField(meta, 'githubCommitMessage'),
        occurredAt:
          typeof createdAt === 'number' && Number.isFinite(createdAt)
            ? new Date(createdAt)
            : new Date(),
      };
    },
  };
}
