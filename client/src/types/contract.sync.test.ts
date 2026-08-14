import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  APPROVAL_STATES,
  PAYMENT_STATUSES,
  PROJECT_STATUSES,
  SUBSCRIPTION_STATUSES,
  TASK_KINDS,
  ASSESSMENT_CATEGORIES,
  AUTH_PROVIDERS,
  CURRENT_ACTION_KINDS,
  CUSTOMER_PRODUCTS,
  PROJECT_MILESTONES,
  USER_ROLES,
} from './api';

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
  const match = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`).exec(source);

  if (!match?.[1]) {
    throw new Error(
      `Could not find "export const ${name} = [...] as const" on the server. It was ` +
        'renamed or restructured — update this test and check the client union beside it.',
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
  const body = match[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');

  const members = [...body.matchAll(/'([^']+)'/g)].map((entry) => entry[1] as string);

  if (members.length === 0) {
    throw new Error(`Found ${name} on the server but parsed no members out of it.`);
  }

  return members;
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

  it('the kinds of thing a dashboard can ask somebody to do', () => {
    expect([...CURRENT_ACTION_KINDS]).toEqual(
      readConstArray(read('features/dashboard/currentAction.ts'), 'CURRENT_ACTION_KINDS'),
    );
  });

  /*
   * Not equality: the server's `BILLING_PRODUCTS` includes `build-final`, which a
   * customer may not buy directly — it is owed against an agreed project and the owner
   * sends the link. What must hold is that everything the client offers is something
   * the server actually sells.
   */
  it('the products a customer may buy for themselves', () => {
    const serverProducts = readConstArray(
      read('features/billing/billing.types.ts'),
      'BILLING_PRODUCTS',
    );

    for (const product of CUSTOMER_PRODUCTS) {
      expect(serverProducts).toContain(product);
    }

    expect([...CUSTOMER_PRODUCTS]).not.toContain('build-final');
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
});
