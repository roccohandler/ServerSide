import { prefixMatch } from '../../lib/search.js';
import {
  AuthTokenModel,
  SessionModel,
  UserModel,
  toStoredAuthToken,
  toStoredSession,
  toStoredUser,
} from './user.model.js';
import type {
  NewUserRecord,
  ProviderIdentity,
  StoredAuthToken,
  StoredSession,
  StoredUser,
  TokenPurpose,
  UserRole,
  UserUpdate,
} from './auth.types.js';

/**
 * Everything the auth feature needs from storage.
 *
 * Same shape as the other repositories, and for the same reason: the rules — account
 * linking, session expiry, single-use tokens — are tested against this interface, so
 * the suite needs no MongoDB.
 */
export interface AuthRepository {
  /**
   * Rejects with a duplicate-key error when the address is already taken. The unique
   * index is what makes that race-safe; a read-then-write check would not be.
   */
  createUser(record: NewUserRecord): Promise<StoredUser>;
  findUserById(id: string): Promise<StoredUser | null>;
  /** Case-insensitive: addresses are stored lowercased and looked up lowercased. */
  findUserByEmail(email: string): Promise<StoredUser | null>;
  /** The provider's subject id, which is the only stable handle on a Google account. */
  findUserByIdentity(provider: 'google', subject: string): Promise<StoredUser | null>;
  findUserByStripeCustomerId(stripeCustomerId: string): Promise<StoredUser | null>;
  updateUser(id: string, update: UserUpdate): Promise<StoredUser | null>;
  /**
   * Changes a user's role. **The only write in the application that can grant privilege.**
   *
   * Its own method rather than a `role` field on `UserUpdate`, and that is a security
   * decision rather than a stylistic one. `updateUser` is called by ordinary flows — a name
   * change, a password reset, recording a Stripe customer id, touching `lastLoginAt` — and
   * every one of those passes an object through. A `role` key on that object would make each
   * of them a place where a mass-assignment mistake, or a spread of unvalidated input, is a
   * privilege escalation.
   *
   * Kept separate, the grant is greppable: `setRole` appears in exactly one caller, and that
   * caller is a script an operator runs deliberately. `auth.api.test.ts` asserts no HTTP route
   * can reach it.
   */
  setRole(id: string, role: UserRole): Promise<StoredUser | null>;
  /**
   * Every account, newest first, for the admin surface. Bounded by the caller.
   *
   * The only read in the repository with no filter on it, which is why it is named for what
   * it does rather than being a `findUsers(query)` that could be called with anything. The
   * capability that guards it is `customer:read:any`, and the route is behind `requireAdmin`.
   */
  listUsers(limit: number, search?: string | undefined): Promise<readonly StoredUser[]>;
  /** Adds a provider identity. No-op when that provider is already linked. */
  linkIdentity(id: string, identity: ProviderIdentity): Promise<StoredUser | null>;

  createSession(record: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly expiresAt: Date;
  }): Promise<StoredSession>;
  findSessionByTokenHash(tokenHash: string): Promise<StoredSession | null>;
  /** Extends a rolling session. Called at most once an hour per session. */
  touchSession(tokenHash: string, expiresAt: Date): Promise<void>;
  deleteSession(tokenHash: string): Promise<void>;
  /** Signs every device out. Used on password change and on defensive account linking. */
  deleteSessionsForUser(userId: string): Promise<void>;

  createAuthToken(record: {
    readonly tokenHash: string;
    readonly userId: string;
    readonly purpose: TokenPurpose;
    readonly expiresAt: Date;
  }): Promise<void>;
  /**
   * Reads and deletes in one atomic operation, which is what makes these links
   * single-use even if two requests arrive at once.
   */
  consumeAuthToken(tokenHash: string, purpose: TokenPurpose): Promise<StoredAuthToken | null>;
  /** Invalidates outstanding links of one kind, e.g. after a successful reset. */
  deleteAuthTokens(userId: string, purpose: TokenPurpose): Promise<void>;
}

export interface MongoAuthRepositoryDependencies {
  readonly connect: () => Promise<void>;
}

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** Loaded explicitly wherever a password check is about to happen — see the model. */
const WITH_PASSWORD = '+passwordHash';

export function createMongoAuthRepository(
  dependencies: MongoAuthRepositoryDependencies,
): AuthRepository {
  const { connect } = dependencies;

  return {
    async createUser(record) {
      await connect();
      /* Same boundary copy as the assessment repository: the domain keeps `identities`
       * readonly, Mongoose wants a mutable array. */
      const document = await UserModel.create({ ...record, identities: [...record.identities] });
      /*
       * `toObject()` on the created document includes the hash because it was just
       * written; every *read* path has to ask for it. Stripping it here would make
       * `createUser` unusable for the sign-in-immediately-after-signup flow.
       */
      return toStoredUser(document.toObject());
    },

    async findUserById(id) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;
      const document = await UserModel.findById(id).select(WITH_PASSWORD).lean().exec();
      return document ? toStoredUser(document) : null;
    },

    async findUserByEmail(email) {
      await connect();
      const document = await UserModel.findOne({ email: email.trim().toLowerCase() })
        .select(WITH_PASSWORD)
        .lean()
        .exec();
      return document ? toStoredUser(document) : null;
    },

    async findUserByIdentity(provider, subject) {
      await connect();
      const document = await UserModel.findOne({
        identities: { $elemMatch: { provider, subject } },
      })
        .select(WITH_PASSWORD)
        .lean()
        .exec();
      return document ? toStoredUser(document) : null;
    },

    async findUserByStripeCustomerId(stripeCustomerId) {
      await connect();
      const document = await UserModel.findOne({ stripeCustomerId }).lean().exec();
      return document ? toStoredUser(document) : null;
    },

    async updateUser(id, update) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*
       * `passwordHash: null` means "remove the password", which is a real operation:
       * an unverified account that Google proves belongs to somebody else loses its
       * password rather than keeping a credential the rightful owner never set.
       */
      const { passwordHash, ...rest } = update;
      const document = await UserModel.findByIdAndUpdate(
        id,
        {
          $set: { ...rest, ...(typeof passwordHash === 'string' ? { passwordHash } : {}) },
          ...(passwordHash === null ? { $unset: { passwordHash: 1 } } : {}),
        },
        { new: true, runValidators: true },
      )
        .select(WITH_PASSWORD)
        .lean()
        .exec();

      return document ? toStoredUser(document) : null;
    },

    async setRole(id, role) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*
       * A single `$set` of a single field, with the value typed as `UserRole` — so this
       * cannot be handed an object and cannot set anything else. That narrowness is the
       * whole reason it is not part of `updateUser`.
       */
      const document = await UserModel.findByIdAndUpdate(
        id,
        { $set: { role } },
        { new: true, runValidators: true },
      )
        .select(WITH_PASSWORD)
        .lean()
        .exec();

      return document ? toStoredUser(document) : null;
    },

    async listUsers(limit, search) {
      await connect();

      /*
       * Anchored and escaped — see `lib/search.ts`. The three fields are the three an operator
       * would type: the address they are looking somebody up by, the person's name, and the
       * business, which is often the only one they remember.
       */
      const term = prefixMatch(search);

      /*
       * No `WITH_PASSWORD`. Every other read selects the hash because a password check might
       * follow; nothing that lists accounts is ever about to verify one, so the hashes are not
       * loaded at all. The mapper would strip them and this means there is nothing to strip.
       */
      const documents = await UserModel.find(
        term ? { $or: [{ email: term }, { name: term }, { businessName: term }] } : {},
      )
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
        .exec();

      return documents.map(toStoredUser);
    },

    async linkIdentity(id, identity) {
      await connect();
      if (!OBJECT_ID.test(id)) return null;

      /*
       * `$addToSet` on the provider, not on the whole object: a person re-linking the
       * same Google account with a changed display email must not accumulate a second
       * identity row. The filter makes the write a no-op when it is already linked.
       */
      const document = await UserModel.findOneAndUpdate(
        { _id: id, 'identities.provider': { $ne: identity.provider } },
        { $push: { identities: identity } },
        { new: true, runValidators: true },
      )
        .select(WITH_PASSWORD)
        .lean()
        .exec();

      // Already linked: return the account as it stands rather than a null nobody expects.
      return document ? toStoredUser(document) : this.findUserById(id);
    },

    async createSession(record) {
      await connect();
      const document = await SessionModel.create({ ...record, lastUsedAt: new Date() });
      return toStoredSession(document.toObject());
    },

    async findSessionByTokenHash(tokenHash) {
      await connect();
      const document = await SessionModel.findOne({ tokenHash }).lean().exec();
      return document ? toStoredSession(document) : null;
    },

    async touchSession(tokenHash, expiresAt) {
      await connect();
      await SessionModel.updateOne(
        { tokenHash },
        { $set: { expiresAt, lastUsedAt: new Date() } },
      ).exec();
    },

    async deleteSession(tokenHash) {
      await connect();
      await SessionModel.deleteOne({ tokenHash }).exec();
    },

    async deleteSessionsForUser(userId) {
      await connect();
      await SessionModel.deleteMany({ userId }).exec();
    },

    async createAuthToken(record) {
      await connect();
      await AuthTokenModel.create(record);
    },

    async consumeAuthToken(tokenHash, purpose) {
      await connect();
      const document = await AuthTokenModel.findOneAndDelete({ tokenHash, purpose }).lean().exec();
      if (!document) return null;

      // Expiry is checked by the caller, which owns the clock — but a token whose TTL
      // sweep has not run yet is still consumed here, so it cannot be replayed.
      return toStoredAuthToken(document);
    },

    async deleteAuthTokens(userId, purpose) {
      await connect();
      await AuthTokenModel.deleteMany({ userId, purpose }).exec();
    },
  };
}
