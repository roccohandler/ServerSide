/**
 * Browser-visible configuration.
 *
 * Everything here is compiled into the public JavaScript bundle, so only values that
 * are safe to publish may live in this file. API keys and database credentials stay on
 * the server and are never given a `VITE_` prefix.
 */

function readOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

export interface ClientEnv {
  /**
   * Prefix for API calls. Empty means same-origin, which is the default: the Vite dev
   * server proxies `/api` to Express, and on Vercel both are served from one domain.
   */
  readonly apiBaseUrl: string;
  /** Canonical public origin, used for canonical links and Open Graph URLs. */
  readonly siteUrl: string;
  readonly isDevelopment: boolean;
  /**
   * ==========================================================================
   * ANALYTICS — BOTH UNSET MEANS NOTHING LOADS AT ALL
   * ==========================================================================
   *
   * DECISION 039. A cookieless, privacy-preserving counter, and the feature is **off by
   * default in every environment** — no script tag, no request to anybody, no events leaving
   * the browser.
   *
   * That is the same shape as `DEMO_PASSCODE` leaving `/api/demo` unmounted and
   * `UNSUBSCRIBE_SECRET` leaving follow-up entirely unwired, and it is deliberate rather than
   * cautious: the feature cannot be half-on. A build with `domain` set and `scriptSrc` unset
   * loads nothing, because a domain with nowhere to send it is a configuration mistake rather
   * than a smaller feature.
   *
   * **The privacy page is generated from these values.** `content/legal.ts` reads
   * `analyticsEnabled()` and says what is actually true of the build the reader is looking at,
   * which is the only way that page can keep claiming what it claims. A site whose privacy
   * policy is written by hand and whose analytics are configured by hand is a site where the
   * two disagree the first time somebody flips one.
   * ==========================================================================
   */
  readonly analytics: {
    /** The site as registered with the provider — Plausible's `data-domain`. */
    readonly domain: string | undefined;
    /** Full URL of the provider's script. The host must be in both CSP policies. */
    readonly scriptSrc: string | undefined;
  };
}

export const env: ClientEnv = {
  apiBaseUrl: (readOptional(import.meta.env.VITE_API_BASE_URL) ?? '').replace(/\/$/, ''),
  siteUrl: (readOptional(import.meta.env.VITE_SITE_URL) ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  ),
  isDevelopment: import.meta.env.DEV,
  analytics: {
    domain: readOptional(import.meta.env.VITE_ANALYTICS_DOMAIN),
    scriptSrc: readOptional(import.meta.env.VITE_ANALYTICS_SRC),
  },
};

/**
 * True only when a provider is fully configured.
 *
 * The one place that decides, read by three unrelated things: the script loader, the event
 * sink, and the privacy page's copy. Three separate `if (env.analytics.domain)` checks is
 * three chances for the page to describe a build it is not part of.
 */
export function analyticsEnabled(): boolean {
  return Boolean(env.analytics.domain && env.analytics.scriptSrc);
}
