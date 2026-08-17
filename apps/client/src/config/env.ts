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
}

export const env: ClientEnv = {
  apiBaseUrl: (readOptional(import.meta.env.VITE_API_BASE_URL) ?? '').replace(/\/$/, ''),
  siteUrl: (readOptional(import.meta.env.VITE_SITE_URL) ?? 'http://localhost:5173').replace(
    /\/$/,
    '',
  ),
  isDevelopment: import.meta.env.DEV,
};
