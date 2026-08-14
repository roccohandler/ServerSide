/*
 * ============================================================================
 * IDENTITY, SESSIONS AND WHAT A SIGNED-IN PERSON MAY DO
 * ============================================================================
 *
 * Three ideas that are deliberately kept apart, because collapsing any two of them is
 * how authorization bugs get written:
 *
 *   1. **Authentication** — proving who is making the request. Email and password, or
 *      Google. Both produce the same `StoredUser`; nothing downstream can tell which
 *      was used, and nothing downstream is allowed to care.
 *   2. **Authorization** — what that person may do, derived from their role. A
 *      capability is never stored on a user document, so a role change takes effect
 *      immediately rather than on whatever a stale document happens to say.
 *   3. **Ownership** — whether this particular record belongs to them. Capabilities
 *      answer "may a customer read projects"; ownership answers "may *this* customer
 *      read *this* project". Both are required, always, and the second is the one that
 *      an ID typed into a URL bar tests.
 *
 * Google is an authentication provider here and nothing more. There is no Google role,
 * no Google capability and no branch anywhere that reads "if the user signed in with
 * Google". See `google/README` in the docs for the account-linking rules.
 * ============================================================================
 */

/**
 * Who somebody is to the business.
 *
 * Two roles, because there are two kinds of person: the client whose website is being
 * built, and the person building it. A third would need a reason that exists.
 */
export const USER_ROLES = ['customer', 'admin'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/**
 * The complete set of things any request may be permitted to do.
 *
 * Named as `resource:action:scope` so a reader can tell at the call site whether the
 * check is scoped to the caller (`own`) or to everything (`any`). `:any` capabilities
 * belong to staff; a customer never holds one, which is what makes the ownership check
 * on every `own` route the only thing standing between two customers.
 */
export const CAPABILITIES = [
  'assessment:read:own',
  'assessment:write:own',
  'project:read:own',
  'project:write:own',
  'task:write:own',
  'feedback:write:own',
  'billing:read:own',
  'billing:checkout:own',
  /* Staff. Every one of these crosses customer boundaries by design. */
  'customer:read:any',
  'assessment:read:any',
  'project:read:any',
  'project:write:any',
  'task:write:any',
  'feedback:write:any',
  'billing:read:any',
  'billing:write:any',
  'deployment:write:any',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const CUSTOMER_CAPABILITIES: readonly Capability[] = [
  'assessment:read:own',
  'assessment:write:own',
  'project:read:own',
  'project:write:own',
  'task:write:own',
  'feedback:write:own',
  'billing:read:own',
  'billing:checkout:own',
];

/**
 * Staff hold every capability, including the customer-scoped ones — an admin looking at
 * their own account is still a person with an account.
 */
const ADMIN_CAPABILITIES: readonly Capability[] = CAPABILITIES;

const CAPABILITIES_BY_ROLE: Readonly<Record<UserRole, readonly Capability[]>> = {
  customer: CUSTOMER_CAPABILITIES,
  admin: ADMIN_CAPABILITIES,
};

export function capabilitiesFor(role: UserRole): readonly Capability[] {
  return CAPABILITIES_BY_ROLE[role];
}

export function roleHasCapability(role: UserRole, capability: Capability): boolean {
  return CAPABILITIES_BY_ROLE[role].includes(capability);
}

/**
 * How an identity was proven.
 *
 * A user may hold both: signing up with a password and later continuing with Google
 * leaves one account with two ways into it, which is the point.
 */
export const AUTH_PROVIDERS = ['password', 'google'] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/** One external identity, as issued by its provider. */
export interface ProviderIdentity {
  readonly provider: Exclude<AuthProvider, 'password'>;
  /** The provider's stable, non-reassignable subject id. Never the email address. */
  readonly subject: string;
  /** What the provider said the email was at link time. Kept for support, not for auth. */
  readonly email: string;
  readonly linkedAt: Date;
}

export const USER_FIELD_LIMITS = {
  name: 120,
  email: 254,
  businessName: 200,
  /** Long enough for a passphrase; bounded so a megabyte cannot be fed to scrypt. */
  password: 200,
} as const;

/** Below this, a password is guessable enough that rate limiting is the only defence. */
export const MIN_PASSWORD_LENGTH = 12;

export interface StoredUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly businessName?: string | undefined;
  readonly role: UserRole;
  /**
   * True once the address has been proven — by clicking a verification link, or by
   * Google asserting `email_verified` for it. Account linking depends on this.
   */
  readonly emailVerified: boolean;
  /**
   * Absent for an account that has only ever used Google. Its absence is what makes
   * "continue with Google" the only way in, rather than a password nobody set.
   */
  readonly passwordHash?: string | undefined;
  readonly identities: readonly ProviderIdentity[];
  /** Set once any payment completes, so one person maps to one Stripe customer. */
  readonly stripeCustomerId?: string | undefined;
  readonly lastLoginAt?: Date | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/** What the browser is told about itself. Never carries the hash or the identities. */
export interface PublicUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly businessName?: string | undefined;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly capabilities: readonly Capability[];
  /** Which sign-in methods this account has, so the account page can say so. */
  readonly authProviders: readonly AuthProvider[];
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    businessName: user.businessName,
    role: user.role,
    emailVerified: user.emailVerified,
    capabilities: capabilitiesFor(user.role),
    authProviders: [
      ...(user.passwordHash ? (['password'] as const) : []),
      ...user.identities.map((identity) => identity.provider),
    ],
  };
}

/**
 * What staff are shown about an account on the admin surface.
 *
 * Explicitly built rather than produced by deleting fields from `StoredUser`, the same rule
 * `ProjectView` follows: a field added to storage is invisible here until somebody decides it
 * should be visible. That is the difference between a view and a leak.
 *
 * What is deliberately absent: `passwordHash` — never loaded by `listUsers` in the first
 * place — and the raw provider `subject`, which is Google's stable handle on a person and is
 * of no operational use to anybody reading a list. `authProviders` says *how* they sign in,
 * which is the useful part and the part support actually needs.
 */
export interface AdminAccountView {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly businessName?: string | undefined;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly authProviders: readonly AuthProvider[];
  readonly hasStripeCustomer: boolean;
  readonly lastLoginAt?: string | undefined;
  readonly createdAt: string;
}

export function toAdminAccountView(user: StoredUser): AdminAccountView {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    businessName: user.businessName,
    role: user.role,
    emailVerified: user.emailVerified,
    authProviders: [
      ...(user.passwordHash ? (['password'] as const) : []),
      ...user.identities.map((identity) => identity.provider),
    ],
    /*
     * A boolean rather than the id. Whether this person has ever paid is the operational
     * question; the Stripe customer id is a key into another system and belongs in the Stripe
     * dashboard, not in a list rendered in a browser.
     */
    hasStripeCustomer: Boolean(user.stripeCustomerId),
    lastLoginAt: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
  };
}

/** What a signup writes. `role` is deliberately absent — see `auth.service.ts`. */
export interface NewUserRecord {
  readonly email: string;
  readonly name: string;
  readonly businessName?: string | undefined;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly passwordHash?: string | undefined;
  readonly identities: readonly ProviderIdentity[];
}

export interface UserUpdate {
  readonly name?: string;
  readonly businessName?: string;
  readonly emailVerified?: boolean;
  readonly passwordHash?: string | null;
  readonly stripeCustomerId?: string;
  readonly lastLoginAt?: Date;
}

/* ------------------------------------------------------------------ sessions */

/**
 * Sessions are opaque random tokens, stored hashed, delivered in an HttpOnly cookie.
 *
 * Not a JWT, and the reason is revocation. A signed token is valid until it expires
 * however wrong things have gone; a row in a collection can be deleted the moment a
 * password changes or a Google account is linked to a previously unverified account.
 * Both of those are exactly when every existing session should stop working.
 *
 * The token is stored as a SHA-256 digest, so a dump of the sessions collection is not
 * a set of working credentials.
 */
export interface StoredSession {
  readonly id: string;
  readonly userId: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  /** Rolling: refreshed on use, so an active person is not signed out mid-task. */
  readonly lastUsedAt: Date;
}

export const SESSION_COOKIE_NAME = 'jobforge_session';

/** Thirty days of inactivity ends a session; activity keeps extending it. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * How stale `lastUsedAt` may get before a request writes it back. Without this every
 * authenticated request would be a write; with it, at most one write per hour per
 * session, and the rolling window is still accurate to within an hour.
 */
export const SESSION_TOUCH_INTERVAL_MS = 60 * 60 * 1000;

/* ------------------------------------------------------------------ one-time tokens */

/**
 * Email verification and password reset both work the same way: a single-use random
 * token, stored hashed against a purpose and an expiry.
 */
export const TOKEN_PURPOSES = ['email-verification', 'password-reset'] as const;

export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

export const TOKEN_TTL_MS: Readonly<Record<TokenPurpose, number>> = {
  'email-verification': 24 * 60 * 60 * 1000,
  /** Deliberately short. A reset link in an inbox is a standing key to the account. */
  'password-reset': 60 * 60 * 1000,
};

export interface StoredAuthToken {
  readonly userId: string;
  readonly purpose: TokenPurpose;
  readonly expiresAt: Date;
  readonly createdAt: Date;
}
