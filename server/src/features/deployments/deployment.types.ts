/*
 * ============================================================================
 * DEPLOYMENTS
 * ============================================================================
 *
 * Where a customer's website currently is, as data.
 *
 * The rule this feature exists to enforce: **no preview URL is ever written in frontend
 * code.** A project has a `previewUrl` and a `productionUrl` because a deployment event
 * set them, and the dashboard renders whatever is there. The alternative — a constant
 * somewhere, or a URL pattern assembled from a slug — breaks the first time a build is
 * hosted somewhere unexpected, and breaks silently, on a link a customer clicks.
 *
 * ## The provider boundary
 *
 * Vercel is what this uses. `DeploymentProvider` is what the feature depends on, and it
 * is four fields wide: an id, an environment, a state and a URL. Nothing in the domain
 * knows about Vercel's payload shape, its header names or its retry semantics — that
 * lives in `providers/vercel.provider.ts`, which is the only file that would be
 * rewritten to move to Netlify, Cloudflare or a machine in a cupboard.
 *
 * Custom preview infrastructure is deliberately not built. Vercel already produces a
 * URL per commit; the value this adds is knowing *which* URL belongs to *which*
 * customer, and that is a row in a collection rather than a platform.
 * ============================================================================
 */

export const DEPLOYMENT_ENVIRONMENTS = ['preview', 'production'] as const;

export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];

/**
 * Folded from whatever the provider calls its states. `building` and `ready` and
 * `failed` are the three a customer-facing system actually behaves differently for.
 */
export const DEPLOYMENT_STATES = ['queued', 'building', 'ready', 'failed', 'cancelled'] as const;

export type DeploymentState = (typeof DEPLOYMENT_STATES)[number];

export const DEPLOYMENT_FIELD_LIMITS = {
  url: 2048,
  externalId: 128,
  commitSha: 64,
  commitMessage: 300,
} as const;

/**
 * One deployment, as reported by a provider.
 *
 * `externalId` plus `provider` is the idempotency key: a provider that delivers the
 * same webhook twice, or delivers `building` then `ready` for one deployment, updates
 * one row rather than creating two.
 */
export interface DeploymentEvent {
  readonly provider: 'vercel';
  readonly externalId: string;
  readonly projectId: string;
  readonly environment: DeploymentEnvironment;
  readonly state: DeploymentState;
  readonly url?: string | undefined;
  readonly commitSha?: string | undefined;
  readonly commitMessage?: string | undefined;
  /** When the provider says it happened, not when we heard about it. */
  readonly occurredAt: Date;
}

export interface StoredDeployment extends DeploymentEvent {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DeploymentView {
  readonly id: string;
  readonly environment: DeploymentEnvironment;
  readonly state: DeploymentState;
  readonly url?: string | undefined;
  readonly at: string;
}

export function toDeploymentView(deployment: StoredDeployment): DeploymentView {
  return {
    id: deployment.id,
    environment: deployment.environment,
    state: deployment.state,
    /*
     * A URL is only handed out once the deployment is ready. A `building` URL 404s or
     * shows a half-built page, and a customer clicking "your preview is ready" and
     * getting either of those is worse than seeing nothing yet.
     */
    url: deployment.state === 'ready' ? deployment.url : undefined,
    at: deployment.occurredAt.toISOString(),
  };
}

/**
 * What any hosting provider has to be reduced to before this feature will look at it.
 *
 * One method. The provider owns signature verification, payload shape and state
 * vocabulary; everything above this line owns what a deployment means.
 */
export interface DeploymentProvider {
  /**
   * Verifies and normalises one provider webhook. Throws when the signature does not
   * check out; returns null when the payload is a kind of event this does not track.
   */
  parseWebhook(params: {
    readonly rawBody: Buffer;
    readonly headers: Readonly<Record<string, string | string[] | undefined>>;
  }): DeploymentEvent | null;
}
