/*
 * ============================================================================
 * WHAT EACH CREDENTIAL PAGE ASKS, AND IN WHAT ORDER
 * ============================================================================
 *
 * The step definitions and the validation, kept out of the component so both can be
 * tested without rendering anything and so the form has one description of itself rather
 * than a set of conditionals that happen to agree.
 *
 * ## Why sign-up is three steps and sign-in is two
 *
 * Sign-up asks for four things. All four at once is what a visitor weighs before typing
 * anything, and three of them are things nobody thinks about until they have decided to go
 * ahead. Split by *kind* rather than evenly: who you are reaching (the address), who you
 * are (name, business), and how you will get back in (password, confirmation). Each step
 * is one question a person can answer without scrolling.
 *
 * Sign-in is email then password. Two fields is not a burden, so the split is not about
 * effort — it is that an address is the thing that decides *how* somebody signs in. Once
 * the routing question has an answer, the password step can become a magic-link step or an
 * SSO redirect for the accounts that need one, and no visitor has to know which they are
 * before they start. Splitting later would move the field somebody's password manager has
 * already learned; splitting now costs one click.
 *
 * ## The submission is unchanged
 *
 * One request, at the end. This is progressive *disclosure*, not progressive capture:
 * there is no endpoint that takes half an account, and inventing one to catch somebody who
 * abandons step two would be worse than not having it.
 * ============================================================================
 */

export type CredentialMode = 'login' | 'signup';

/** Every field either form can ask for. One step shows one or two of them. */
export type CredentialField = 'email' | 'name' | 'businessName' | 'password' | 'confirmPassword';

export interface CredentialStep {
  readonly id: string;
  /** Rendered beside "step 2 of 3", because a count alone does not say what the step is. */
  readonly label: string;
  readonly fields: readonly CredentialField[];
  /** Which field takes focus when the step opens. */
  readonly focus: CredentialField;
}

const SIGNUP_STEPS: readonly CredentialStep[] = [
  { id: 'email', label: 'Your email address', fields: ['email'], focus: 'email' },
  { id: 'you', label: 'Who you are', fields: ['name', 'businessName'], focus: 'name' },
  {
    id: 'password',
    label: 'Choose a password',
    fields: ['password', 'confirmPassword'],
    focus: 'password',
  },
];

const LOGIN_STEPS: readonly CredentialStep[] = [
  { id: 'email', label: 'Your email address', fields: ['email'], focus: 'email' },
  { id: 'password', label: 'Your password', fields: ['password'], focus: 'password' },
];

export function stepsFor(mode: CredentialMode): readonly CredentialStep[] {
  return mode === 'signup' ? SIGNUP_STEPS : LOGIN_STEPS;
}

/* ------------------------------------------------------------------ validation */

/**
 * The password rule, restated in the browser.
 *
 * It is the server's own sentence, copied from `server/src/features/auth/auth.schema.ts`,
 * because one rule stated two ways reads as two rules. The point is only to save a round
 * trip and a scrypt hash on a fat-fingered password — the server's check is still the one
 * that decides, and this is not a security boundary. If the two ever disagree, the server
 * wins and its message replaces this one.
 */
export const MIN_PASSWORD_LENGTH = 12;

export const SHORT_PASSWORD_MESSAGE = `Use at least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easier to remember and harder to guess than a short password.`;

/** Interpolated from the same constant, so the rule and the promise cannot drift apart. */
export const PASSWORD_HINT = `At least ${MIN_PASSWORD_LENGTH} characters. A short phrase works well and is easier to remember.`;

/**
 * Deliberately permissive: something, an @, something, a dot, something.
 *
 * This is here to catch the address with a missing @ before it costs a round trip, not to
 * decide what an address is. RFC 5322 permits things this rejects, the server and the
 * mailbox are the only real authorities, and a form that argues with somebody about their
 * own working email address is worse than one that lets it through and asks the server.
 */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CredentialValues {
  readonly email: string;
  readonly name: string;
  readonly businessName: string;
  readonly password: string;
  readonly confirmPassword: string;
}

export type CredentialErrors = Partial<Record<CredentialField, string>>;

/**
 * What is wrong with one field, or nothing.
 *
 * Called on blur and again on submit, so a field never reports a problem the visitor has
 * not finished causing — and never lets them past a step with one.
 *
 * `mode` matters for exactly one field. A sign-in password predates whatever today's
 * length rule is, so checking it here would lock somebody out of their own account with a
 * rule their password was never subject to; the server's login schema makes the same
 * distinction for the same reason.
 */
export function validateField(
  field: CredentialField,
  values: CredentialValues,
  mode: CredentialMode,
): string | undefined {
  switch (field) {
    case 'email': {
      const email = values.email.trim();
      if (!email) return 'Please enter your email address.';
      if (!EMAIL_SHAPE.test(email)) return 'That does not look like an email address.';
      return undefined;
    }

    case 'name':
      return values.name.trim() ? undefined : 'Please enter your name.';

    case 'password': {
      if (!values.password) return 'Please enter your password.';
      if (mode === 'signup' && values.password.length < MIN_PASSWORD_LENGTH) {
        return SHORT_PASSWORD_MESSAGE;
      }
      return undefined;
    }

    case 'confirmPassword': {
      if (!values.confirmPassword) return 'Please type your password again.';
      if (values.confirmPassword !== values.password) return 'Those two passwords do not match.';
      return undefined;
    }

    /* Optional, and there is no shape a business name can get wrong. */
    case 'businessName':
      return undefined;
  }
}

/** Every problem on one step. An empty object means the step may be left. */
export function validateStep(
  step: CredentialStep,
  values: CredentialValues,
  mode: CredentialMode,
): CredentialErrors {
  const errors: CredentialErrors = {};

  for (const field of step.fields) {
    const message = validateField(field, values, mode);
    if (message) errors[field] = message;
  }

  return errors;
}

/*
 * There is deliberately no `stepOwning(field)` helper here.
 *
 * The obvious way to handle a server error about a field from an earlier step is to send
 * the visitor back to that step. `CredentialForm` does not: it renders the disputed field
 * in place, wherever they are. Bouncing somebody backwards makes them press Continue twice
 * to return to the button they had only just pressed. See the note on `shows` there.
 */
