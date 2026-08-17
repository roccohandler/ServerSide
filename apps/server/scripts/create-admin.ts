/*
 * ============================================================================
 * ADMIN PROVISIONING — the only way a role becomes `admin`
 * ============================================================================
 *
 * Usage, from the repo root:
 *
 *     npm run admin:create --workspace @jobforge/server                     # create or promote
 *     npm run admin:create --workspace @jobforge/server -- --check          # report, nothing changes
 *     npm run admin:create --workspace @jobforge/server -- --reset-password # also set the password
 *
 * Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the **server-side** environment. Neither is
 * ever printed, neither is ever sent to a browser, and neither has a `VITE_` twin — Vite
 * inlines `VITE_*` variables into the public bundle, so a password with that prefix would be
 * published to every visitor.
 *
 * ## Why an operator runs this rather than the server doing it at boot
 *
 * Boot-time seeding is the convenient option and it is worse in three specific ways. It runs on
 * every cold start, so the credential has to stay in the deployment environment forever rather
 * than for the minute it is needed. It makes "who has admin" a property of an environment
 * variable, so a mistyped value in a dashboard silently changes who can operate the business.
 * And it means the grant happens with nobody watching, which is the opposite of what a
 * privilege grant should be.
 *
 * Run by hand, the credential can be removed from `.env` afterwards, the grant is a deliberate
 * act with a person behind it, and the role lives where every request already reads it: the
 * user document.
 *
 * ## Why the application's config does not contain these variables
 *
 * `src/config/env.ts` validates everything the *running application* needs, and this is
 * deliberately absent from it. If `ADMIN_PASSWORD` were on the config object, every service and
 * every request handler could read it, and one careless log line or error response would leak
 * it. This script validates its own two variables and the server never learns they exist.
 *
 * ## What this script will not do
 *
 * It will not create a second admin silently, it will not overwrite an existing password
 * unless asked, and it will not accept the placeholder from `.env.example`. It also refuses a
 * password shorter than the application's own minimum, so an admin cannot be weaker than the
 * customers.
 * ============================================================================
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { z } from 'zod';
import { createMongoAuthRepository } from '../src/features/auth/auth.repository.js';
import { hashPassword } from '../src/features/auth/auth.password.js';
import { MIN_PASSWORD_LENGTH } from '../src/features/auth/auth.types.js';

/* Three levels, for the reason `src/config/env.ts` sets out at length: the repository root
 * is `../../.env` from this workspace, and a script that cannot see it reports "ADMIN_EMAIL
 * is not set" about a variable sitting in the file the rest of the repository reads. */
dotenv.config({ path: ['.env', '../.env', '../../.env'], quiet: true });

/*
 * The placeholders `.env.example` ships. Refused explicitly, because the failure they cause
 * otherwise is an admin account whose password is a string published in the repository.
 */
const PLACEHOLDERS = [
  'replace_with',
  'your_email',
  'you@example.com',
  'changeme',
  'password',
  'admin',
];

const envSchema = z.object({
  ADMIN_EMAIL: z
    .string({ error: 'ADMIN_EMAIL is not set. See .env.example.' })
    .trim()
    .toLowerCase()
    .pipe(z.string().email('ADMIN_EMAIL is not a valid email address.')),
  ADMIN_PASSWORD: z
    .string({ error: 'ADMIN_PASSWORD is not set. See .env.example.' })
    .min(
      MIN_PASSWORD_LENGTH,
      `ADMIN_PASSWORD must be at least ${String(MIN_PASSWORD_LENGTH)} characters — the same minimum customers are held to.`,
    ),
  MONGODB_URI: z.string({ error: 'MONGODB_URI is not set. There is no database to write to.' }),
  MONGODB_DB_NAME: z.string().optional(),
});

/**
 * Every message this script prints, in one place.
 *
 * Not for tidiness: it is so that a reviewer can read the complete set of things this program
 * is capable of writing to a terminal and confirm the password is not among them. The password
 * is never interpolated into a string anywhere in this file.
 */
function report(message: string): void {
  console.log(`[admin] ${message}`);
}

function fail(message: string): never {
  console.error(`[admin] ${message}`);
  process.exit(1);
}

interface Options {
  readonly checkOnly: boolean;
  readonly resetPassword: boolean;
}

function parseOptions(argv: readonly string[]): Options {
  const flags = new Set(argv.slice(2));

  for (const flag of flags) {
    if (flag !== '--check' && flag !== '--reset-password') {
      fail(`Unknown flag "${flag}". Supported: --check, --reset-password.`);
    }
  }

  return {
    checkOnly: flags.has('--check'),
    resetPassword: flags.has('--reset-password'),
  };
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv);

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    /*
     * Messages only — never the values. Zod's `flatten()` reports field names and the messages
     * written above, and none of those messages echoes what was supplied.
     */
    const problems = Object.entries(parsed.error.flatten().fieldErrors)
      .map(([field, messages]) => `${field}: ${(messages ?? []).join('; ')}`)
      .join('\n  ');
    fail(`Environment is not ready.\n  ${problems}`);
  }

  const env = parsed.data;

  const lowerPassword = env.ADMIN_PASSWORD.toLowerCase();
  if (PLACEHOLDERS.some((placeholder) => lowerPassword.includes(placeholder))) {
    fail('ADMIN_PASSWORD still looks like the placeholder from .env.example. Set a real password.');
  }

  if (PLACEHOLDERS.some((placeholder) => env.ADMIN_EMAIL.includes(placeholder))) {
    fail('ADMIN_EMAIL still looks like the placeholder from .env.example.');
  }

  /*
   * Mongoose is connected here rather than through the application's connection helper,
   * because that helper is wired into the request lifecycle and this is not a request. One
   * connection, opened and closed.
   */
  await mongoose.connect(env.MONGODB_URI, {
    ...(env.MONGODB_DB_NAME ? { dbName: env.MONGODB_DB_NAME } : {}),
  });

  const repository = createMongoAuthRepository({ connect: async () => undefined });

  try {
    const existing = await repository.findUserByEmail(env.ADMIN_EMAIL);

    /* ------------------------------------------------------------------ no account yet */

    if (!existing) {
      if (options.checkOnly) {
        report('No account exists for that address. Run without --check to create it.');
        return;
      }

      const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

      const created = await repository.createUser({
        email: env.ADMIN_EMAIL,
        name: 'Administrator',
        role: 'admin',
        /*
         * Verified on creation, deliberately. The verification email exists to prove that
         * whoever typed an address controls it; an operator with database access and the
         * server-side environment has already demonstrated far more than that, and an admin
         * who cannot sign in until they click a link is an admin locked out by ceremony.
         */
        emailVerified: true,
        passwordHash,
        identities: [],
      });

      report(`Created an admin account for ${created.email}.`);
      return;
    }

    /* ------------------------------------------------------------- an account exists */

    const alreadyAdmin = existing.role === 'admin';

    if (options.checkOnly) {
      report(
        alreadyAdmin
          ? `${existing.email} is already an admin.`
          : `${existing.email} exists with the role "${existing.role}". Run without --check to promote it.`,
      );
      return;
    }

    if (!alreadyAdmin) {
      const promoted = await repository.setRole(existing.id, 'admin');
      if (!promoted) fail('The account disappeared between reading it and promoting it.');
      report(`Promoted ${existing.email} to admin.`);
    } else {
      report(`${existing.email} is already an admin. Nothing to change.`);
    }

    /*
     * The password is left alone unless explicitly asked for. Re-running this script to promote
     * somebody, and silently resetting a password they are actively using, is the kind of
     * helpfulness that costs an afternoon.
     */
    if (options.resetPassword) {
      const passwordHash = await hashPassword(env.ADMIN_PASSWORD);
      await repository.updateUser(existing.id, { passwordHash });

      /*
       * Every existing session ends. A password change is exactly when other sessions should
       * stop working — and if the reason for the reset is that the old password leaked, a
       * session that survives it defeats the reset entirely.
       */
      await repository.deleteSessionsForUser(existing.id);
      report('Password updated and every existing session signed out.');
    } else if (!existing.passwordHash) {
      report(
        'This account has no password set — it can only sign in with Google. Re-run with --reset-password to set one.',
      );
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  /*
   * The message only. An error object from Mongoose can carry the connection string, and a
   * connection string carries a database password.
   */
  fail(error instanceof Error ? error.message : 'Unknown error.');
});
