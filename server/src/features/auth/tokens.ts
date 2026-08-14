import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/*
 * Session tokens and one-time links.
 *
 * Both are 32 bytes of CSPRNG output, handed out in base64url and stored only as a
 * SHA-256 digest. A stolen database therefore contains no working credentials, and a
 * lookup is still a single indexed equality match.
 *
 * SHA-256 rather than scrypt on purpose: these are 256-bit random values, not
 * human-chosen secrets, so there is nothing to brute-force and no reason to make every
 * authenticated request pay 64 MB of memory.
 */

const TOKEN_BYTES = 32;

export function createToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url');
}

/** Constant-time digest comparison, for the rare path that compares two hashes directly. */
export function tokenDigestsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
