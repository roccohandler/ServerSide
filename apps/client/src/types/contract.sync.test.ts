import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_FILE_TYPES, MAX_FILE_BYTES } from '../features/private/services/fileRules';
import {
  FIELD_LIMITS,
  FILE_SOURCES,
  APPROVAL_STATES,
  PAYMENT_STATUSES,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
  TASK_KINDS,
  ASSESSMENT_CATEGORIES,
  AUTH_PROVIDERS,
  CONVERSATION_KINDS,
  CURRENT_ACTION_KINDS,
  CUSTOMER_PRODUCTS,
  PROJECT_MILESTONES,
  USER_ROLES,
} from '@jobforge/shared';

/*
 * ============================================================================
 * THE CONTRACT, PINNED FROM BOTH ENDS
 * ============================================================================
 *
 * `types/api.ts` says the two halves of the platform contract are duplicated rather than
 * shared through a third workspace, and that the duplication is safe *because a test
 * enforces it*. This is that test.
 *
 * Without it the note is a promise, and the failure it is protecting against is the
 * quietest kind there is: the server adds a milestone, the client's union does not have
 * it, TypeScript is perfectly happy on both sides because neither imports the other, and
 * a customer's dashboard renders a blank status for a state that exists.
 *
 * ## Why it reads the server's source rather than importing it
 *
 * Because importing it would defeat the purpose. The client bundle must not depend on
 * the server package — that is the whole reason the contract is duplicated — so the one
 * place allowed to cross the line is a test, and it crosses it by reading text.
 *
 * A regex over source is ugly and it is the right ugly: it fails loudly when a constant
 * is renamed or restructured, which is exactly when somebody should look at both halves.
 * ============================================================================
 */

const SERVER = join(import.meta.dirname, '..', '..', '..', 'server', 'src');

function read(relative: string): string {
  return readFileSync(join(SERVER, relative), 'utf8');
}

/**
 * Pulls the members out of an `export const NAME = [...] as const;` declaration.
 *
 * Throws rather than returning empty when it matches nothing: a silently empty list
 * would make every assertion below pass against nothing at all, which is the failure
 * mode this whole file exists to prevent one level up.
 */
function readConstArray(source: string, name: string): readonly string[] {
  return parseArrayBody(
    new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`).exec(source)?.[1],
    `export const ${name} = [...] as const`,
    name,
  );
}

/**
 * The same, for a module-private array that is not `as const`.
 *
 * One caller: `CUSTOMER_PURCHASABLE` in `billing.customer.routes.ts`, which is a plain
 * `const` narrowed by a `.filter()` type guard rather than by `as const`, and which is
 * deliberately not exported — it is that router's own rule about what may be named.
 * Reading it from source is the only way to pin it without widening its visibility for a
 * test's benefit, which is the trade this whole file is built on.
 */
function readConstArrayFrom(source: string, name: string): readonly string[] {
  return parseArrayBody(
    new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\]`).exec(source)?.[1],
    `const ${name} = [...]`,
    name,
  );
}

function parseArrayBody(body: string | undefined, shape: string, name: string): readonly string[] {
  if (!body) {
    throw new Error(
      `Could not find "${shape}" on the server. It was renamed or restructured — ` +
        'update this test and check the client union beside it.',
    );
  }

  /*
   * Comments come out before the members go in.
   *
   * These lists are documented per entry, and an English apostrophe — "the customer's
   * materials" — is a single quote to a regex. Without this the first parse picked up
   * fragments of prose as milestones and the failure read as a genuine contract drift,
   * which is a worse way to waste somebody's afternoon than no test at all.
   */
  const members = [
    ...body
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .matchAll(/'([^']+)'/g),
  ].map((entry) => entry[1] as string);

  if (members.length === 0) {
    throw new Error(`Found ${name} on the server but parsed no members out of it.`);
  }

  return members;
}

/**
 * Pulls the property names out of an `export interface Name { … }` declaration.
 *
 * Stops at the first line that is a lone `}` in column zero, which is what prettier produces
 * for the end of a top-level interface and what keeps a nested object literal inside one from
 * closing it early. Throws on no match, for the reason `readConstArray` does: a silently empty
 * list makes every assertion below pass against nothing.
 */
function readInterfaceKeys(source: string, name: string): readonly string[] {
  const block = new RegExp(`export interface ${name} \\{\\n([\\s\\S]*?)\\n\\}`).exec(source)?.[1];

  if (!block) {
    throw new Error(
      `Could not find "export interface ${name} { … }". It was renamed or restructured — ` +
        'update this test and check what reads it.',
    );
  }

  const keys = [...block.matchAll(/^ {2}readonly (\w+)\??:/gm)].map((entry) => entry[1] as string);

  if (keys.length === 0) {
    throw new Error(`Found interface ${name} but parsed no properties out of it.`);
  }

  return keys;
}

describe('the client and server agree about', () => {
  it('user roles', () => {
    expect([...USER_ROLES]).toEqual(
      readConstArray(read('features/auth/auth.types.ts'), 'USER_ROLES'),
    );
  });

  it('authentication providers', () => {
    expect([...AUTH_PROVIDERS]).toEqual(
      readConstArray(read('features/auth/auth.types.ts'), 'AUTH_PROVIDERS'),
    );
  });

  /*
   * The console renders these as a badge — "Client" or "Prospect" — so a third kind the
   * server starts sending would arrive as an unlabelled row. Pinned here even though the
   * console lives in a different app from this test, because there is one contract and
   * this is the file that enforces it.
   */
  it('conversation kinds', () => {
    expect([...CONVERSATION_KINDS]).toEqual(
      readConstArray(read('features/conversations/conversation.types.ts'), 'CONVERSATION_KINDS'),
    );
  });

  it('assessment categories', () => {
    expect([...ASSESSMENT_CATEGORIES]).toEqual(
      readConstArray(read('features/assessments/assessment.types.ts'), 'ASSESSMENT_CATEGORIES'),
    );
  });

  /*
   * The order matters here as well as the membership: the server derives the progress
   * bar's step number from this list's index, and the client renders "step 3 of 8"
   * against it.
   */
  it('project milestones, in order', () => {
    expect([...PROJECT_MILESTONES]).toEqual(
      readConstArray(read('features/projects/project.types.ts'), 'PROJECT_MILESTONES'),
    );
  });

  it('approval states', () => {
    expect([...APPROVAL_STATES]).toEqual(
      readConstArray(read('features/projects/project.types.ts'), 'APPROVAL_STATES'),
    );
  });

  /*
   * The admin surface renders these as a select. A kind the client offers and the server's zod
   * schema rejects is a form that looks fine and fails on submit, which is exactly the class of
   * drift this file exists to catch.
   */
  /*
   * The three the admin surface renders as-is. Hand-typing these was how the first version of
   * that surface came to expect "unpaid" for a status that is "pending", and the British
   * "cancelled" for Stripe's "canceled" — neither of which is a type error in a JSON payload,
   * and both of which would have rendered an empty cell.
   */
  it('payment statuses', () => {
    expect([...PAYMENT_STATUSES]).toEqual(
      readConstArray(read('features/projects/project.types.ts'), 'PAYMENT_STATUSES'),
    );
  });

  it('subscription statuses', () => {
    expect([...SUBSCRIPTION_STATUSES]).toEqual(
      readConstArray(read('features/projects/project.types.ts'), 'SUBSCRIPTION_STATUSES'),
    );
  });

  it('project statuses', () => {
    expect([...PROJECT_STATUSES]).toEqual(
      readConstArray(read('features/projects/project.types.ts'), 'PROJECT_STATUSES'),
    );
  });

  it('task kinds', () => {
    expect([...TASK_KINDS]).toEqual(
      readConstArray(read('features/tasks/task.types.ts'), 'TASK_KINDS'),
    );
  });

  it('the two directions a file can travel', () => {
    expect([...FILE_SOURCES]).toEqual(
      readConstArray(read('features/files/file.types.ts'), 'FILE_SOURCES'),
    );
  });

  /*
   * ==========================================================================
   * THE UPLOAD RULES, PINNED IN THREE PLACES
   * ==========================================================================
   *
   * Unlike everything else in this file these are duplicated *three* ways: the server, the
   * customer portal and the owner console each hold a copy, because `packages/shared` is
   * eager and a list of MIME types a signed-in customer may attach has no business in the
   * chunk somebody reading about roofing websites downloads. That note is at the top of
   * `packages/shared/src/api.ts` where these used to be.
   *
   * The duplication is only safe because of this test, which is the same bargain the whole
   * file makes. What it protects: a picker offering a type the token will refuse — an upload
   * that runs to completion on a phone and is then rejected with a message about content
   * types — and a size ceiling the browser thinks is larger than the store's.
   *
   * The console's copy is read from another workspace by path. That is the one thing this
   * file is allowed to do that no shipped module may: two browser bundles never see each
   * other, and a test crossing the line by reading text is what keeps them honest.
   */
  const ADMIN_RULES = join(
    import.meta.dirname,
    '..',
    '..',
    '..',
    'admin',
    'src',
    'features',
    'projects',
    'fileRules.ts',
  );

  it('the file types a browser may offer', () => {
    const server = readConstArray(read('features/files/file.types.ts'), 'ALLOWED_FILE_TYPES');

    expect([...ALLOWED_FILE_TYPES]).toEqual(server);
    expect(readConstArray(readFileSync(ADMIN_RULES, 'utf8'), 'ALLOWED_FILE_TYPES')).toEqual(server);
  });

  it('how large a file may be', () => {
    /** Both sides write it as an expression — `20 * 1024 * 1024` — so the values are compared. */
    function readBytes(source: string, where: string): number {
      const match = /export const MAX_FILE_BYTES = ([^;]+);/.exec(source)?.[1];
      expect(match, `MAX_FILE_BYTES was renamed or restructured in ${where}`).toBeTruthy();
      return Number(new Function(`return ${String(match)}`)());
    }

    const server = readBytes(read('features/files/file.types.ts'), 'the server');

    expect(MAX_FILE_BYTES).toBe(server);
    expect(readBytes(readFileSync(ADMIN_RULES, 'utf8'), 'the console')).toBe(server);
  });

  it('the kinds of thing a dashboard can ask somebody to do', () => {
    expect([...CURRENT_ACTION_KINDS]).toEqual(
      readConstArray(read('features/dashboard/dashboard.currentAction.ts'), 'CURRENT_ACTION_KINDS'),
    );
  });

  /*
   * ==========================================================================
   * EVERY PRODUCT A CUSTOMER MAY NAME HAS A GATE DECIDING WHEN
   * ==========================================================================
   *
   * This used to assert two things: that everything the client offers is something the
   * server sells, and — separately — that `build-final` was **not** among them. The second
   * was right at the time and is now wrong: the portal takes the launch instalment, so the
   * product is nameable.
   *
   * What replaced it is the invariant that actually protects the customer. Naming a product
   * and being allowed to buy it are two layers on the server: `CUSTOMER_PURCHASABLE` says
   * what may be asked for, and `AVAILABILITY` maps each one onto the `available.*` flag that
   * decides whether today is the day. A product in the first list with no entry in the second
   * would be one the route waves through with no condition at all — which for `build-final`
   * means selling the second half of a build that has not started.
   *
   * So the assertion is that the two lists are the same set, and that the client's own
   * `CUSTOMER_PRODUCTS` is that set too. Three places, one vocabulary, checked from source.
   * ==========================================================================
   */
  it('the products a customer may buy for themselves, and the gate on each', () => {
    const serverProducts = readConstArray(
      read('features/billing/billing.types.ts'),
      'BILLING_PRODUCTS',
    );

    for (const product of CUSTOMER_PRODUCTS) {
      expect(serverProducts).toContain(product);
    }

    const routes = read('features/billing/billing.customer.routes.ts');

    /** The quoted keys of an object literal assigned to `name`, in declaration order. */
    function readRecordKeys(name: string): readonly string[] {
      const match = new RegExp(`const ${name}[\\s\\S]*?= \\{([\\s\\S]*?)\\n\\};`).exec(routes);
      if (!match?.[1]) {
        throw new Error(`Could not find "const ${name} = { … }" in billing.customer.routes.ts.`);
      }
      return [...match[1].matchAll(/^\s*'([^']+)':/gm)].map((entry) => entry[1] as string);
    }

    const purchasable = [...readConstArrayFrom(routes, 'CUSTOMER_PURCHASABLE')].sort();

    expect([...CUSTOMER_PRODUCTS].sort()).toEqual(purchasable);
    expect([...readRecordKeys('AVAILABILITY')].sort()).toEqual(purchasable);
    /* And a sentence for each refusal, so no gate can reject somebody in silence. */
    expect([...readRecordKeys('UNAVAILABLE')].sort()).toEqual(purchasable);
  });

  /*
   * ==========================================================================
   * THE DASHBOARD SENDS EXACTLY WHAT THE DASHBOARD DECLARES
   * ==========================================================================
   *
   * The one endpoint in the system whose response is composed by hand from six services, and
   * therefore the one where a field can be added to the type and never sent — or sent and
   * never declared. Neither is a type error: the client's `DashboardData` and the server's
   * `response.json` do not see each other, which is the whole reason this file exists.
   *
   * The failure is quiet in both directions. A declared-but-unsent field arrives `undefined`
   * and renders as a blank where a number should be; an unsent-but-declared one is payload
   * nobody reads. `unread` is the field that prompted this: it is read by a heading that
   * counts the entries beside it, and a missing one would have printed nothing at all rather
   * than failing.
   *
   * Both sides are parsed from source at a fixed indentation, which prettier guarantees and
   * which is why the slice is bounded rather than a brace-matching regex.
   */
  it('the fields of the dashboard response', () => {
    const source = read('features/dashboard/dashboard.routes.ts');

    const start = source.indexOf('success({');
    const end = source.indexOf('\n      }),', start);

    expect(start, '`success({` was renamed or restructured in dashboard.routes.ts').toBeGreaterThan(
      -1,
    );
    expect(
      end,
      'the success literal in dashboard.routes.ts no longer closes at 6 spaces',
    ).toBeGreaterThan(start);

    /* Top-level keys only: everything nested sits at ten spaces or deeper. */
    const sent = [...source.slice(start, end).matchAll(/^ {8}(\w+)[,:]/gm)].map(
      (match) => match[1],
    );

    const declared = readInterfaceKeys(
      readFileSync(
        join(import.meta.dirname, '..', '..', '..', '..', 'packages', 'shared', 'src', 'api.ts'),
        'utf8',
      ),
      'DashboardData',
    );

    expect([...sent].sort()).toEqual([...declared].sort());
  });

  /*
   * The session cookie's name is a contract too, in the weakest possible sense: the
   * client never reads it — it is HttpOnly — but the server's CSRF guard scopes itself
   * by looking for it, and a rename that missed one of the two places would silently
   * turn the guard off for every request.
   */
  it('the session cookie name, in both places the server uses it', () => {
    const types = read('features/auth/auth.types.ts');
    const csrf = read('middleware/csrf.ts');

    const declared = /export const SESSION_COOKIE_NAME = '([^']+)'/.exec(types)?.[1];

    expect(declared, 'SESSION_COOKIE_NAME was renamed or restructured').toBeTruthy();
    // The guard imports the constant rather than repeating the literal. If that ever
    // changes back to a literal, this is where it gets caught.
    expect(csrf).toContain('SESSION_COOKIE_NAME');
  });

  /*
   * ==========================================================================
   * HOW LONG A FIELD MAY BE
   * ==========================================================================
   *
   * `FIELD_LIMITS` is what every form's `maxLength` comes from, so a `.max()` raised or
   * lowered on the server and not mirrored here produces a form that either rejects text the
   * server would have taken, or accepts text it will not — and the second one fails *after*
   * somebody has finished typing, with a message that names no field.
   *
   * Nothing about that is a type error. The numbers are read out of the server's own source
   * so a rename is a failure here rather than a silent divergence.
   */
  describe('the field length limits', () => {
    /** Reads `key: 123,` out of an `as const` object literal on the server. */
    function readNumbers(source: string, constName: string): Record<string, number> {
      const block = new RegExp(`export const ${constName} = \\{([\\s\\S]*?)\\} as const;`).exec(
        source,
      )?.[1];

      if (!block) return {};

      return Object.fromEntries(
        [...block.matchAll(/^\s*(\w+):\s*(\d+),/gm)].map(([, key, value]) => [
          key as string,
          Number(value),
        ]),
      );
    }

    it('match the lead schema', () => {
      const server = readNumbers(read('features/leads/lead.types.ts'), 'LEAD_FIELD_LIMITS');

      expect(Object.keys(server).length, 'LEAD_FIELD_LIMITS was renamed or restructured').toBe(6);
      expect(FIELD_LIMITS.lead).toEqual(server);
    });

    it('match the onboarding schema', () => {
      const server = readNumbers(
        read('features/onboarding/onboarding.types.ts'),
        'ONBOARDING_FIELD_LIMITS',
      );

      expect(Object.keys(server).length).toBe(6);
      expect(FIELD_LIMITS.onboarding).toEqual(server);
    });

    it('match the comment schema', () => {
      const server = readNumbers(
        read('features/feedback/feedback.types.ts'),
        'COMMENT_FIELD_LIMITS',
      );

      expect(server['body'], 'COMMENT_FIELD_LIMITS.body was renamed').toBeDefined();
      expect(FIELD_LIMITS.comment.body).toBe(server['body']);
    });

    /*
     * The task limits are inline in the schema rather than in a named constant, so they are
     * read from the `.max()` calls themselves. Less robust than the three above and still
     * far better than nothing — a changed number fails here.
     */
    it('match the task schema', () => {
      const schema = read('features/projects/project.schema.ts');

      const title = /title:\s*z\s*\.string\(\)[\s\S]*?\.max\((\d+)\)/.exec(schema)?.[1];
      const description = /description:\s*z\s*\.string\(\)[\s\S]*?\.max\((\d+)\)/.exec(schema)?.[1];

      expect(title, 'addTaskSchema.title was restructured').toBeTruthy();
      expect(Number(title)).toBe(FIELD_LIMITS.task.title);
      expect(Number(description)).toBe(FIELD_LIMITS.task.description);
    });
  });
});
