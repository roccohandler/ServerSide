import { createHmac, createSign, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGoogleVerifier } from './google.verifier.js';
import { IdentityVerificationError } from './identity.provider.js';

/*
 * ============================================================================
 * THE VERIFIER, AGAINST REAL SIGNATURES
 * ============================================================================
 *
 * This is the file that decides whether somebody is who they say they are, so it is
 * tested against actual RSA keys rather than a mock: a key pair is generated, tokens are
 * signed with it, and a JWKS containing its public half is served from a fake `fetch`.
 *
 * That matters because the interesting cases are all forgeries, and a mocked verifier
 * cannot be forged against. Every one of the attacks below produces a token that *looks*
 * completely valid to anything that does not check the specific thing being tested:
 *
 *   - signed by a different key
 *   - `alg: none`
 *   - HS256 signed with the RSA public key
 *   - issued for a different Google application
 *   - expired, or from the future
 *
 * The `aud` case is the one most often missing in the wild, and it is the most serious:
 * without it, an ID token minted for *any* Google application signs somebody in here.
 * ============================================================================
 */

const CLIENT_ID = '123456789-abcdef.apps.googleusercontent.com';
const KID = 'test-key-1';
const NOW_MS = new Date('2026-08-13T12:00:00.000Z').getTime();

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = generateKeyPairSync('rsa', { modulusLength: 2048 });

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function jwksFor(key: KeyObject, kid: string) {
  const jwk = key.export({ format: 'jwk' }) as Record<string, unknown>;
  return { keys: [{ ...jwk, kid, alg: 'RS256', use: 'sig' }] };
}

interface TokenOptions {
  readonly payload?: Record<string, unknown>;
  /** Claims to leave out entirely. Merging cannot express absence. */
  readonly omit?: readonly string[];
  readonly header?: Record<string, unknown>;
  readonly signWith?: KeyObject;
}

function basePayload(): Record<string, unknown> {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '110000000000000000001',
    email: 'dana@cascadeheating.example',
    email_verified: true,
    name: 'Dana Reyes',
    iat: Math.floor(NOW_MS / 1000) - 30,
    exp: Math.floor(NOW_MS / 1000) + 3600,
  };
}

function signToken(options: TokenOptions = {}): string {
  const header = { alg: 'RS256', kid: KID, typ: 'JWT', ...options.header };
  const payload: Record<string, unknown> = { ...basePayload(), ...options.payload };
  for (const claim of options.omit ?? []) delete payload[claim];

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(options.signWith ?? privateKey);

  return `${signingInput}.${base64url(signature)}`;
}

describe('the Google verifier', () => {
  let fetchCalls: number;
  let fetchImpl: typeof fetch;

  function jwksResponse(body: unknown, init: { maxAge?: number; status?: number } = {}) {
    return new Response(JSON.stringify(body), {
      status: init.status ?? 200,
      headers: { 'cache-control': `public, max-age=${init.maxAge ?? 3600}` },
    });
  }

  beforeEach(() => {
    fetchCalls = 0;
    fetchImpl = vi.fn(async () => {
      fetchCalls += 1;
      return jwksResponse(jwksFor(publicKey, KID));
    }) as unknown as typeof fetch;
  });

  function build(overrides: { clientId?: string | undefined } = {}) {
    return createGoogleVerifier({
      clientId: 'clientId' in overrides ? overrides.clientId : CLIENT_ID,
      fetchImpl,
      now: () => NOW_MS,
    });
  }

  async function reasonOf(promise: Promise<unknown>): Promise<string> {
    const error = await promise.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(IdentityVerificationError);
    return (error as IdentityVerificationError).reason;
  }

  it('accepts a properly signed token and returns the identity', async () => {
    const identity = await build().verify(signToken());

    expect(identity).toEqual({
      provider: 'google',
      subject: '110000000000000000001',
      email: 'dana@cascadeheating.example',
      emailVerified: true,
      name: 'Dana Reyes',
    });
  });

  it('lowercases and trims the address, so linking cannot be defeated by casing', async () => {
    const identity = await build().verify(
      signToken({ payload: { email: '  Dana@Cascadeheating.Example  ' } }),
    );

    expect(identity.email).toBe('dana@cascadeheating.example');
  });

  it('reports an unverified provider email rather than hiding it', async () => {
    const identity = await build().verify(signToken({ payload: { email_verified: false } }));
    expect(identity.emailVerified).toBe(false);
  });

  it('treats a missing email_verified claim as unverified', async () => {
    const identity = await build().verify(signToken({ omit: ['email_verified'] }));
    expect(identity.emailVerified).toBe(false);
  });

  /* -------------------------------------------------------------- forgeries */

  it('rejects a token signed with a key Google does not publish', async () => {
    expect(await reasonOf(build().verify(signToken({ signWith: other.privateKey })))).toBe(
      'bad-signature',
    );
  });

  /*
   * The classic. A verifier that reads `alg` from the header it is verifying accepts a
   * token that says it is not signed at all.
   */
  it('rejects alg: none', async () => {
    const header = base64url(JSON.stringify({ alg: 'none', kid: KID, typ: 'JWT' }));
    const payload = base64url(JSON.stringify(basePayload()));

    expect(await reasonOf(build().verify(`${header}.${payload}.`))).toBe('bad-signature');
  });

  /*
   * The other classic: HS256 signed with the *public* key, which is public. Any verifier
   * that picks its algorithm from the header will happily check an HMAC against it.
   */
  it('rejects an HS256 token signed with the public key', async () => {
    const header = base64url(JSON.stringify({ alg: 'HS256', kid: KID, typ: 'JWT' }));
    const payload = base64url(JSON.stringify(basePayload()));
    const secret = publicKey.export({ type: 'spki', format: 'pem' }) as string;
    const signature = createHmac('sha256', secret).update(`${header}.${payload}`).digest();

    expect(await reasonOf(build().verify(`${header}.${payload}.${base64url(signature)}`))).toBe(
      'bad-signature',
    );
  });

  it('rejects a token with a tampered payload', async () => {
    const token = signToken();
    const [header, , signature] = token.split('.') as [string, string, string];
    const forged = base64url(JSON.stringify({ ...basePayload(), sub: 'somebody-else' }));

    expect(await reasonOf(build().verify(`${header}.${forged}.${signature}`))).toBe(
      'bad-signature',
    );
  });

  /*
   * ==========================================================================
   * THE AUDIENCE CHECK
   * ==========================================================================
   *
   * This token is real. Google signed it, it has not expired, the email is verified —
   * it was simply issued for a different application. Without `aud`, anybody who runs
   * any Google-integrated site can take a token their own users hand them and sign in
   * here as that person.
   * ==========================================================================
   */
  it('rejects a genuine token issued for a different application', async () => {
    expect(
      await reasonOf(
        build().verify(signToken({ payload: { aud: 'somebody-else.apps.googleusercontent.com' } })),
      ),
    ).toBe('wrong-audience');
  });

  it('rejects a token from an issuer that is not Google', async () => {
    expect(
      await reasonOf(build().verify(signToken({ payload: { iss: 'https://evil.example' } }))),
    ).toBe('wrong-issuer');
  });

  it('accepts both spellings Google uses for its own issuer', async () => {
    const identity = await build().verify(signToken({ payload: { iss: 'accounts.google.com' } }));
    expect(identity.subject).toBe('110000000000000000001');
  });

  /* ------------------------------------------------------------------ time */

  it('rejects an expired token', async () => {
    expect(
      await reasonOf(
        build().verify(signToken({ payload: { exp: Math.floor(NOW_MS / 1000) - 120 } })),
      ),
    ).toBe('expired');
  });

  it('allows a minute of clock skew on expiry', async () => {
    const identity = await build().verify(
      signToken({ payload: { exp: Math.floor(NOW_MS / 1000) - 30 } }),
    );
    expect(identity.subject).toBe('110000000000000000001');
  });

  it('rejects a token issued in the future', async () => {
    expect(
      await reasonOf(
        build().verify(signToken({ payload: { iat: Math.floor(NOW_MS / 1000) + 600 } })),
      ),
    ).toBe('expired');
  });

  /* ------------------------------------------------------------ malformed */

  it.each([
    ['not a jwt at all', 'hello'],
    ['two segments', 'a.b'],
    ['unparseable json', `${base64url('{{{')}.${base64url('{}')}.x`],
    ['empty', ''],
  ])('rejects %s', async (_name, token) => {
    expect(await reasonOf(build().verify(token))).toBe('malformed');
  });

  it('rejects a token with no key id', async () => {
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = base64url(JSON.stringify(basePayload()));
    const signingInput = `${base64url(JSON.stringify(header))}.${payload}`;
    const signature = createSign('RSA-SHA256').update(signingInput).sign(privateKey);

    expect(await reasonOf(build().verify(`${signingInput}.${base64url(signature)}`))).toBe(
      'malformed',
    );
  });

  it('rejects a verified token that carries no subject', async () => {
    expect(await reasonOf(build().verify(signToken({ omit: ['sub'] })))).toBe('malformed');
  });

  it('rejects a verified token that carries no email', async () => {
    expect(await reasonOf(build().verify(signToken({ omit: ['email'] })))).toBe('malformed');
  });

  it('refuses a credential longer than any real token', async () => {
    expect(await reasonOf(build().verify('x'.repeat(9000)))).toBe('malformed');
  });

  /* ------------------------------------------------------- configuration */

  it('reports not-configured rather than failing obscurely', async () => {
    expect(await reasonOf(build({ clientId: undefined }).verify(signToken()))).toBe(
      'not-configured',
    );
    // And it never asked Google anything.
    expect(fetchCalls).toBe(0);
  });

  /* --------------------------------------------------------- the key set */

  it('caches the key set for as long as Google says', async () => {
    const verifier = build();
    await verifier.verify(signToken());
    await verifier.verify(signToken());

    expect(fetchCalls).toBe(1);
  });

  it('refetches once when a token names a key it has not seen', async () => {
    let served = jwksFor(other.publicKey, 'rotated-away');

    fetchImpl = vi.fn(async () => {
      fetchCalls += 1;
      const body = served;
      // Google rotated: the second fetch has the key the token was signed with.
      served = jwksFor(publicKey, KID);
      return jwksResponse(body);
    }) as unknown as typeof fetch;

    const identity = await build().verify(signToken());

    expect(identity.subject).toBe('110000000000000000001');
    expect(fetchCalls).toBe(2);
  });

  it('gives up on a key that is genuinely unknown, rather than looping', async () => {
    fetchImpl = vi.fn(async () => {
      fetchCalls += 1;
      return jwksResponse(jwksFor(other.publicKey, 'some-other-key'));
    }) as unknown as typeof fetch;

    expect(await reasonOf(build().verify(signToken()))).toBe('bad-signature');
    expect(fetchCalls).toBe(2);
  });

  it('reports unavailable when Google cannot be reached at all', async () => {
    fetchImpl = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    }) as unknown as typeof fetch;

    expect(await reasonOf(build().verify(signToken()))).toBe('unavailable');
  });

  it('reports unavailable when Google answers with an error', async () => {
    fetchImpl = vi.fn(async () => jwksResponse({}, { status: 503 })) as unknown as typeof fetch;

    expect(await reasonOf(build().verify(signToken()))).toBe('unavailable');
  });

  /*
   * A blip while a good key set is already cached must not sign everybody out. Only a
   * cold start with nothing cached is a hard failure.
   */
  it('keeps serving a cached key set through a transient failure', async () => {
    let failing = false;

    fetchImpl = vi.fn(async () => {
      fetchCalls += 1;
      if (failing) throw new Error('ECONNRESET');
      return jwksResponse(jwksFor(publicKey, KID), { maxAge: 0 });
    }) as unknown as typeof fetch;

    const verifier = build();
    await verifier.verify(signToken());

    failing = true;
    const identity = await verifier.verify(signToken());

    expect(identity.subject).toBe('110000000000000000001');
  });
});
