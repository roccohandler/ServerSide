import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

/**
 * Promisified by hand rather than with `promisify`.
 *
 * `scrypt` has two overloads and `promisify`'s inference picks the three-argument one,
 * which makes the options bag — the whole point of calling it here — a type error.
 */
function scrypt(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

/*
 * ============================================================================
 * PASSWORD STORAGE
 * ============================================================================
 *
 * scrypt from `node:crypto`, rather than bcrypt or argon2 from npm.
 *
 * The two npm options are native modules. On Vercel that means a compiled binary in the
 * function bundle, and this repository has three runtime dependencies precisely because
 * every one of them is a thing that can break a deploy. scrypt is memory-hard, it is in
 * the standard library, and OWASP lists it as an acceptable choice at these parameters —
 * so the trade is "one fewer native dependency" against nothing at all.
 *
 * Parameters are stored *in* the hash. That is what makes them changeable: raising the
 * cost later leaves every existing hash verifiable, and `needsRehash` says which ones to
 * upgrade the next time their owner successfully signs in.
 * ============================================================================
 */

/**
 * OWASP's minimum for scrypt is N=2^17, r=8, p=1. This uses N=2^16 with r=8, which is
 * the same memory (64 MB) at half the CPU, and is chosen because a serverless function
 * has a hard request timeout that a login must not be able to approach.
 */
interface ScryptParameters {
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly keyLength: number;
}

const PARAMETERS: ScryptParameters = { N: 65_536, r: 8, p: 1, keyLength: 64 };

/** scrypt refuses to allocate by default at these parameters; ~72 MB covers N=2^16, r=8. */
const MAX_MEMORY = 96 * 1024 * 1024;

const SALT_BYTES = 16;

/** `scrypt$N$r$p$salt$hash`, both binary parts base64url. */
const SEPARATOR = '$';

async function derive(
  password: string,
  salt: Buffer,
  parameters: ScryptParameters,
): Promise<Buffer> {
  return scrypt(password.normalize('NFKC'), salt, parameters.keyLength, {
    N: parameters.N,
    r: parameters.r,
    p: parameters.p,
    maxmem: MAX_MEMORY,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, PARAMETERS);

  return [
    'scrypt',
    PARAMETERS.N,
    PARAMETERS.r,
    PARAMETERS.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join(SEPARATOR);
}

interface ParsedHash {
  readonly N: number;
  readonly r: number;
  readonly p: number;
  readonly salt: Buffer;
  readonly key: Buffer;
}

function parse(stored: string): ParsedHash | null {
  const parts = stored.split(SEPARATOR);
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null;

  const [, rawN, rawR, rawP, rawSalt, rawKey] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return null;
  // A hash claiming absurd parameters would otherwise be a denial of service against
  // our own CPU, triggered by whatever wrote it.
  if (N > PARAMETERS.N || r > 16 || p > 4) return null;

  const salt = Buffer.from(rawSalt, 'base64url');
  const key = Buffer.from(rawKey, 'base64url');
  if (salt.length === 0 || key.length === 0) return null;

  return { N, r, p, salt, key };
}

/**
 * Constant-time verification. Returns false for a malformed stored value rather than
 * throwing, so a corrupted row is a failed sign-in and not a 500 that names the column.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parse(stored);
  if (!parsed) return false;

  const candidate = await derive(password, parsed.salt, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    keyLength: parsed.key.length,
  });

  return candidate.length === parsed.key.length && timingSafeEqual(candidate, parsed.key);
}

/** True when a stored hash was made with weaker parameters than the current ones. */
export function needsRehash(stored: string): boolean {
  const parsed = parse(stored);
  if (!parsed) return true;
  return parsed.N < PARAMETERS.N || parsed.r < PARAMETERS.r || parsed.p < PARAMETERS.p;
}

/**
 * Burns roughly the same CPU as a real verification, against a throwaway hash.
 *
 * Called when no account exists for the submitted address. Without it, "no such user"
 * returns in a millisecond and "wrong password" takes a hundred, which is a working
 * account-enumeration oracle however carefully the two responses are worded.
 */
export async function simulateVerification(password: string): Promise<void> {
  await derive(password, randomBytes(SALT_BYTES), PARAMETERS);
}
