/**
 * What any external identity provider has to produce before the application will
 * consider somebody signed in.
 *
 * Deliberately provider-agnostic and deliberately tiny. `auth.service.ts` consumes only
 * this, so adding a second provider is a new verifier and a new route — never a change
 * to how accounts are created, linked or authorized.
 *
 * Every field here has been *verified by us against the provider*, never read from a
 * request body. That distinction is the whole security property: a browser can send any
 * email address it likes, and none of them reach this type.
 */
export interface VerifiedIdentity {
  readonly provider: 'google';
  /** The provider's stable subject id. Never an email — those get reassigned. */
  readonly subject: string;
  readonly email: string;
  /**
   * Whether the provider asserts it has proven ownership of that mailbox.
   *
   * False is not a soft signal to be worked around. An unverified provider email is an
   * address the provider will not vouch for, and treating it as proof would let anybody
   * who can create an account at that provider claim any JobForge account.
   */
  readonly emailVerified: boolean;
  readonly name?: string | undefined;
}

/**
 * Raised when a credential is rejected. Carries a machine-readable reason so the route
 * can map it to one safe sentence, and so the reason can be logged without logging the
 * credential.
 */
export class IdentityVerificationError extends Error {
  readonly reason:
    | 'not-configured'
    | 'malformed'
    | 'bad-signature'
    | 'expired'
    | 'wrong-audience'
    | 'wrong-issuer'
    | 'unavailable';

  constructor(reason: IdentityVerificationError['reason'], message: string) {
    super(message);
    this.name = 'IdentityVerificationError';
    this.reason = reason;
  }
}

/** One credential in, one verified identity out — or a throw. No other outcomes. */
export interface IdentityVerifier {
  verify(credential: string): Promise<VerifiedIdentity>;
}
