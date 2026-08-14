import { createPublicKey, createVerify } from 'node:crypto';
import {
  IdentityVerificationError,
  type IdentityVerifier,
  type VerifiedIdentity,
} from './identity.js';

/*
 * ============================================================================
 * GOOGLE ID TOKEN VERIFICATION
 * ============================================================================
 *
 * The browser gets an ID token from Google Identity Services and POSTs it here. This
 * file is the only thing in the application that decides whether that token is real.
 *
 * ## Why this is hand-rolled rather than `google-auth-library`
 *
 * The verification an ID token needs is: RS256 over the signing input, against a key
 * from Google's published JWKS, then five claim checks. Node 22 imports a JWK directly
 * into `createPublicKey`, so the whole thing is the code below — against a dependency
 * that pulls in gaxios, gcp-metadata, google-logging-utils and a transitive tree
 * measured in megabytes, in a repository that has three runtime dependencies on
 * purpose. There is no third option where the library does something this does not.
 *
 * ## What is checked, and why each one matters
 *
 *   - **alg is RS256, taken from our key set rather than from the token.** A verifier
 *     that trusts the header's `alg` accepts `none`, and accepts HS256 signed with the
 *     public key it was about to verify against. Both are the classic JWT forgery.
 *   - **Signature against the `kid` in Google's live JWKS.** Keys rotate; the set is
 *     cached for as long as Google's own `Cache-Control` says and no longer.
 *   - **`aud` equals our client id.** Without this, an ID token minted for *any other
 *     Google application* signs somebody in here. It is the single most important claim
 *     in the token and the one most often skipped.
 *   - **`iss` is Google.** Cheap, and closes the door on a token from a look-alike.
 *   - **`exp` / `iat`.** A replayed token has to be fresh. Sixty seconds of skew,
 *     because clocks on serverless hosts are good but not perfect.
 *
 * `email_verified` is read but deliberately not enforced here — it is carried up to the
 * service, which is where the account-linking policy lives and where refusing it has to
 * produce an explanation a person can act on.
 * ============================================================================
 */

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/** Google publishes both spellings in `iss`, historically and currently. */
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

const CLOCK_SKEW_SECONDS = 60;

/** Used only when Google's response carries no usable `Cache-Control: max-age`. */
const FALLBACK_JWKS_TTL_MS = 60 * 60 * 1000;

/** A key set that failed to refresh is not served past this — stale keys reject real users. */
const MAX_JWKS_TTL_MS = 24 * 60 * 60 * 1000;

const JWKS_TIMEOUT_MS = 5_000;

/**
 * One RSA key from Google's JWKS.
 *
 * Declared here rather than imported: `JsonWebKey` is a DOM lib type, and this package
 * does not pull in the DOM. `createPublicKey({ format: 'jwk' })` reads the fields it
 * needs off a plain object, so the structural shape is all that is required.
 */
interface GoogleJwk {
  readonly kty?: string;
  readonly n?: string;
  readonly e?: string;
  readonly kid?: string;
  readonly alg?: string;
  readonly use?: string;
}

interface CachedKeys {
  readonly keys: readonly GoogleJwk[];
  readonly expiresAt: number;
}

export interface GoogleVerifierOptions {
  /** The OAuth 2.0 Web client id. Undefined means Google sign-in is not configured. */
  readonly clientId: string | undefined;
  /** Injected by tests. Defaults to global `fetch`. */
  readonly fetchImpl?: typeof fetch;
  /** Injected by tests, so expiry can be exercised without waiting. */
  readonly now?: () => number;
}

function decodeSegment(segment: string): unknown {
  const json = Buffer.from(segment, 'base64url').toString('utf8');
  return JSON.parse(json);
}

function stringClaim(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberClaim(payload: Record<string, unknown>, key: string): number | undefined {
  const value = payload[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * `email_verified` arrives as a boolean from Google and as the string "true" from some
 * older tooling. Anything else is treated as unverified, which is the safe direction.
 */
function booleanClaim(payload: Record<string, unknown>, key: string): boolean {
  const value = payload[key];
  return value === true || value === 'true';
}

/** Reads `max-age` out of a Cache-Control header, clamped to something sane. */
function ttlFrom(header: string | null): number {
  const maxAge = header?.match(/max-age=(\d+)/i)?.[1];
  if (!maxAge) return FALLBACK_JWKS_TTL_MS;
  const ms = Number(maxAge) * 1000;
  if (!Number.isFinite(ms) || ms <= 0) return FALLBACK_JWKS_TTL_MS;
  return Math.min(ms, MAX_JWKS_TTL_MS);
}

export function createGoogleVerifier(options: GoogleVerifierOptions): IdentityVerifier {
  const { clientId } = options;
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;

  let cached: CachedKeys | undefined;
  /** Collapses concurrent cold-start verifications onto one network request. */
  let inFlight: Promise<readonly GoogleJwk[]> | undefined;

  async function fetchKeys(): Promise<readonly GoogleJwk[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JWKS_TIMEOUT_MS);

    try {
      const response = await fetchImpl(GOOGLE_JWKS_URL, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new IdentityVerificationError(
          'unavailable',
          `Google's key endpoint answered ${response.status}.`,
        );
      }

      const body: unknown = await response.json();
      const keys = (body as { keys?: unknown })?.keys;

      if (!Array.isArray(keys) || keys.length === 0) {
        throw new IdentityVerificationError('unavailable', 'Google returned no signing keys.');
      }

      cached = {
        keys: keys as GoogleJwk[],
        expiresAt: now() + ttlFrom(response.headers.get('cache-control')),
      };
      return cached.keys;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function keySet(forceRefresh = false): Promise<readonly GoogleJwk[]> {
    if (!forceRefresh && cached && cached.expiresAt > now()) return cached.keys;

    inFlight ??= fetchKeys().finally(() => {
      inFlight = undefined;
    });

    try {
      return await inFlight;
    } catch (error) {
      /*
       * A refresh that failed while a cached set is still held: serve the cached keys
       * rather than signing everybody out over a transient network blip. Only a cold
       * start with no keys at all is a hard failure.
       */
      if (cached) return cached.keys;
      if (error instanceof IdentityVerificationError) throw error;
      throw new IdentityVerificationError(
        'unavailable',
        "Google's signing keys could not be fetched.",
      );
    }
  }

  async function findKey(kid: string): Promise<GoogleJwk> {
    const first = (await keySet()).find((key) => key.kid === kid);
    if (first) return first;

    // Unknown `kid` usually means Google rotated between our cache being filled and
    // this token being minted, so one forced refresh is worth trying before rejecting.
    const refreshed = (await keySet(true)).find((key) => key.kid === kid);
    if (refreshed) return refreshed;

    throw new IdentityVerificationError(
      'bad-signature',
      'The credential was signed with a key Google does not publish.',
    );
  }

  return {
    async verify(credential) {
      if (!clientId) {
        throw new IdentityVerificationError(
          'not-configured',
          'Google sign-in is not configured on this deployment.',
        );
      }

      if (typeof credential !== 'string' || credential.length === 0 || credential.length > 8192) {
        throw new IdentityVerificationError('malformed', 'That is not a Google credential.');
      }

      const parts = credential.split('.');
      if (parts.length !== 3) {
        throw new IdentityVerificationError('malformed', 'That is not a Google credential.');
      }

      const [rawHeader, rawPayload, rawSignature] = parts as [string, string, string];

      let header: Record<string, unknown>;
      let payload: Record<string, unknown>;
      try {
        header = decodeSegment(rawHeader) as Record<string, unknown>;
        payload = decodeSegment(rawPayload) as Record<string, unknown>;
      } catch {
        throw new IdentityVerificationError('malformed', 'That Google credential is unreadable.');
      }

      if (
        typeof header !== 'object' ||
        header === null ||
        typeof payload !== 'object' ||
        payload === null
      ) {
        throw new IdentityVerificationError('malformed', 'That Google credential is unreadable.');
      }

      /*
       * The algorithm is pinned rather than read. `alg: none` and an HS256 token signed
       * with the RSA public key are both accepted by any verifier that believes the
       * header, and both are trivial to mint.
       */
      if (header['alg'] !== 'RS256') {
        throw new IdentityVerificationError(
          'bad-signature',
          'That credential is not signed the way Google signs its own.',
        );
      }

      const kid = stringClaim(header, 'kid');
      if (!kid) {
        throw new IdentityVerificationError('malformed', 'That Google credential names no key.');
      }

      const jwk = await findKey(kid);

      let signatureValid = false;
      try {
        const key = createPublicKey({ key: { ...jwk }, format: 'jwk' });
        signatureValid = createVerify('RSA-SHA256')
          .update(`${rawHeader}.${rawPayload}`)
          .verify(key, Buffer.from(rawSignature, 'base64url'));
      } catch {
        signatureValid = false;
      }

      if (!signatureValid) {
        throw new IdentityVerificationError(
          'bad-signature',
          'That Google credential could not be verified.',
        );
      }

      /* ---- claims. Every one of these is load-bearing; see the header comment. ---- */

      const issuer = stringClaim(payload, 'iss');
      if (!issuer || !GOOGLE_ISSUERS.has(issuer)) {
        throw new IdentityVerificationError('wrong-issuer', 'That credential is not from Google.');
      }

      if (payload['aud'] !== clientId) {
        throw new IdentityVerificationError(
          'wrong-audience',
          'That credential was issued for a different application.',
        );
      }

      const nowSeconds = Math.floor(now() / 1000);

      const expiry = numberClaim(payload, 'exp');
      if (expiry === undefined || expiry + CLOCK_SKEW_SECONDS < nowSeconds) {
        throw new IdentityVerificationError('expired', 'That Google credential has expired.');
      }

      const issuedAt = numberClaim(payload, 'iat');
      if (issuedAt === undefined || issuedAt - CLOCK_SKEW_SECONDS > nowSeconds) {
        throw new IdentityVerificationError('expired', 'That Google credential is not valid yet.');
      }

      const subject = stringClaim(payload, 'sub');
      const email = stringClaim(payload, 'email');

      if (!subject || !email) {
        throw new IdentityVerificationError(
          'malformed',
          'Google did not return an email address for that account.',
        );
      }

      const identity: VerifiedIdentity = {
        provider: 'google',
        subject,
        email: email.trim().toLowerCase(),
        emailVerified: booleanClaim(payload, 'email_verified'),
        name: stringClaim(payload, 'name'),
      };

      return identity;
    },
  };
}
