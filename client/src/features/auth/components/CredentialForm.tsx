import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { routes } from '../../../config/routes';
import { Button } from '../../../components/ui/Button';
import { PasswordField, TextField } from '../../../components/ui/Field';
import { Icon } from '../../../components/ui/Icon';
import type { ApiFailure } from '../../../types/api';
import {
  PASSWORD_HINT,
  stepsFor,
  validateField,
  validateStep,
  type CredentialErrors,
  type CredentialField,
  type CredentialMode,
  type CredentialValues,
} from './credentialSteps';
import styles from './CredentialForm.module.css';

/*
 * The email-and-password half of both credential pages.
 *
 * One component with a `mode`, rather than two forms, because sign-in and sign-up differ
 * by which steps they run and a button label. The alternative drifts: the sign-up page
 * grows an autocomplete hint that the sign-in page never gets, and the two stop behaving
 * the same for a password manager.
 *
 * What each mode asks, in what order, and what counts as a valid answer all live in
 * `credentialSteps.ts` — this file is the rendering, the focus handling and the wiring to
 * the server's reply.
 *
 * ## Errors, in three kinds
 *
 *   1. **A field the visitor can fix.** Shown against that field. Produced on blur, so it
 *      arrives when they have finished typing rather than while they are still doing it,
 *      and again on submit so nothing gets past by never being blurred.
 *   2. **A field the *server* disputes.** Same treatment, except that the field is
 *      rendered wherever the visitor currently is even if an earlier step owns it — a
 *      message attached to an input that is not on screen is not a message. See `shows`.
 *   3. **Everything else** — a wrong password, a rate limit, a dead network. One summary
 *      at the top, focusable and announced, because there is nothing to point at.
 *
 * ## One phrase for creating an account
 *
 * Four verb phrases were in use for one action: "Create your account", "Create an
 * account", "Create my account", "Create a free account". The rule, written down here
 * because it has to hold across four files: the phrase is *create an account*, and only
 * the person changes, with whoever is speaking. A button is the visitor acting, so it is
 * "Create **my** account" — the same voice as "Get my free website assessment" everywhere
 * else on the site. A heading, a link or a page title is the site addressing them, so it
 * is "Create **an** account". A progress label is the site too: "Creating your account…".
 */

export type { CredentialMode } from './credentialSteps';

const EMPTY: CredentialValues = {
  email: '',
  name: '',
  businessName: '',
  password: '',
  confirmPassword: '',
};

export interface CredentialFormProps {
  readonly mode: CredentialMode;
  /** True while the submission is in flight. Also disables the Google option. */
  readonly busy: boolean;
  readonly failure: ApiFailure | null;
  onSubmit(values: {
    readonly email: string;
    readonly name: string;
    readonly password: string;
    readonly businessName?: string;
  }): void | Promise<void>;
  /**
   * Reports whatever is in the email field.
   *
   * The page needs it to build the cross-link to the other credential page, and the page
   * is where that link lives — under the Google option, in the shell's footer. The value
   * is reported upward rather than owned upward: this component is the field's only
   * writer, and a page holding the value would be storing a field it does not render.
   */
  onEmailChange(email: string): void;
}

export function CredentialForm({
  mode,
  busy,
  failure,
  onSubmit,
  onEmailChange,
}: CredentialFormProps) {
  const prefix = useId();
  const [params] = useSearchParams();
  const steps = stepsFor(mode);

  /*
   * Seeded from `?email=`, read once at mount.
   *
   * Somebody who types their address on one of the two pages, realises they wanted the
   * other one and switches should not type it again. It travels in the URL rather than in
   * web storage, for the reason `features/assessment/draft.ts` gives about the assessment
   * draft: a value left in storage outlives the sitting it was typed in, on a machine that
   * may not be the visitor's. An email address is the part of that argument that bites
   * hardest. A query parameter dies with the link.
   */
  const [values, setValues] = useState<CredentialValues>(() => ({
    ...EMPTY,
    email: params.get('email')?.trim() ?? '',
  }));

  const [stepIndex, setStepIndex] = useState(0);
  /** What this form found wrong itself, keyed so it renders where a server error does. */
  const [localErrors, setLocalErrors] = useState<CredentialErrors>({});

  const stepLineRef = useRef<HTMLParagraphElement>(null);
  const fieldRefs = useRef<Partial<Record<CredentialField, HTMLInputElement | null>>>({});
  /* Focus moves on a step change, never on the first paint of the page. */
  const hasMoved = useRef(false);

  const step = steps[stepIndex] ?? steps[0];
  const isLastStep = stepIndex === steps.length - 1;

  const set = (field: CredentialField, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));

  /*
   * Held in a ref for the same reason `GoogleSignInButton` holds its callback in one: the
   * effect below has to run when the address changes, not every time the page re-renders
   * with a new function identity.
   */
  const reportEmailRef = useRef(onEmailChange);
  useEffect(() => {
    reportEmailRef.current = onEmailChange;
  }, [onEmailChange]);

  /*
   * Reported on every change *and* on mount. The mount case is the one that matters: a
   * visitor who arrives on `/signup?email=…`, decides they are already registered and
   * clicks straight through to sign in without touching the field would otherwise be the
   * one person whose address is dropped by the link that exists to carry it.
   */
  useEffect(() => {
    reportEmailRef.current(values.email);
  }, [values.email]);

  /*
   * Moving between steps replaces every input on screen, so focus has to go somewhere
   * deliberate — a visitor left on a button that no longer exists has lost their place,
   * and a screen reader announces nothing at all.
   *
   * It goes to the step's first field: the next thing to do is type, and putting the caret
   * there means a keyboard user never tabs and a phone keyboard opens on its own. The step
   * line above carries `aria-live`, so the change of step is still announced — which is
   * the job it used to do by taking focus itself, at the cost of one extra tab for
   * everybody.
   */
  useEffect(() => {
    if (!hasMoved.current) return;

    const target = step?.focus;
    const input = target ? fieldRefs.current[target] : null;
    if (input) input.focus();
    else stepLineRef.current?.focus();
  }, [stepIndex, step?.focus]);

  const serverFields = failure?.error.fields ?? {};

  /*
   * A field error is shown against its field, so the summary would be repeating it. A
   * VALIDATION_ERROR that named no field still needs somewhere to go, hence the length
   * check rather than a bare code test.
   */
  const summary = failure && Object.keys(serverFields).length === 0 ? failure.error.message : null;

  /*
   * …and the other half of that decision, which was missing.
   *
   * Keeping a field error out of the summary is right — it belongs against the input it is
   * about, not repeated at the top. But a field error reaches a screen reader through
   * `aria-describedby`, which is read when the field takes focus and at no other moment. So
   * on its own it announced nothing: the visitor pressed "Create my account", the server
   * rejected their address, and the only thing that happened was a red line beside an input
   * they could not see. The summary branch was announced by `role="alert"`; this branch had
   * nothing.
   *
   * Focus goes to the first disputed field, which is what `handleSubmit` already does with
   * the problems this form finds itself — so a rejection behaves the same way whoever
   * caught it. The field is guaranteed to be on screen: `shows` renders anything the server
   * disputed regardless of which step owns it.
   */
  useEffect(() => {
    const disputed = Object.keys(failure?.error.fields ?? {}) as CredentialField[];
    if (disputed.length === 0) return;

    const first = disputed.find((field) => fieldRefs.current[field]);
    if (first) fieldRefs.current[first]?.focus();
  }, [failure]);

  const errorFor = (field: CredentialField): string | undefined =>
    localErrors[field] ?? serverFields[field];

  /** Validates one field the moment its own editing is finished, and not before. */
  const blur = (field: CredentialField) => () => {
    const message = validateField(field, values, mode);
    setLocalErrors((current) => {
      const next = { ...current };
      if (message) next[field] = message;
      else delete next[field];
      return next;
    });
  };

  function goBack() {
    if (stepIndex === 0) return;
    hasMoved.current = true;
    /*
     * Errors are cleared, values are not. Going back to change an answer must never be
     * the thing that loses the answers on the steps ahead of it — a visitor who steps
     * back to fix a typo in their name still has the password they chose.
     */
    setLocalErrors({});
    setStepIndex(stepIndex - 1);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !step) return;

    const problems = validateStep(step, values, mode);
    if (Object.keys(problems).length > 0) {
      setLocalErrors(problems);
      const first = step.fields.find((field) => problems[field]);
      if (first) fieldRefs.current[first]?.focus();
      return;
    }

    setLocalErrors({});

    if (!isLastStep) {
      hasMoved.current = true;
      setStepIndex(stepIndex + 1);
      return;
    }

    void onSubmit({
      email: values.email.trim(),
      name: values.name.trim(),
      password: values.password,
      ...(values.businessName.trim() ? { businessName: values.businessName.trim() } : {}),
    });
  }

  /*
   * A field is on screen if this step asks for it — or if the server just disputed it.
   *
   * The second half is the important one. The server revalidates the whole submission, and
   * what it rejects is usually on a step the visitor has already left: the address is asked
   * for on step one and can come back "already registered" after step three. A message
   * attached to an input that is not rendered is not a message.
   *
   * Showing it in place rather than navigating back to its own step is deliberate. Bouncing
   * somebody backwards makes them press Continue twice to return to the button they had
   * only just pressed, and it throws away the sense that they were nearly finished. The
   * disputed field simply appears where they are, with its error, ready to be fixed and
   * resubmitted.
   */
  const shows = (field: CredentialField) =>
    (step?.fields.includes(field) ?? false) || Boolean(serverFields[field]);

  const submitLabel = () => {
    if (!isLastStep) return 'Continue';
    if (busy) return mode === 'signup' ? 'Creating your account…' : 'Signing you in…';
    return mode === 'signup' ? 'Create my account' : 'Sign in';
  };

  return (
    /*
     * Named by the page heading, which is what turns a `<form>` into a landmark a screen
     * reader can jump to. Unnamed, it is skipped by form navigation entirely — and on a
     * page whose only content is this form, that is the one landmark worth having.
     */
    <form
      className={styles['form']}
      onSubmit={handleSubmit}
      aria-labelledby="auth-heading"
      noValidate
    >
      {summary ? (
        <p className={styles['summary']} role="alert" tabIndex={-1}>
          <Icon name="alert" size={18} className={styles['summaryIcon']} />
          <span>{summary}</span>
        </p>
      ) : null}

      {/*
       * "Step 2 of 3" rather than a percentage: what somebody deciding whether to start
       * needs to know is that the ask is short, which a count says and a progress figure
       * does not.
       *
       * `aria-live="polite"` is what replaced taking focus here. The step change is
       * announced, and focus still goes to the field somebody is about to type in.
       */}
      <p ref={stepLineRef} tabIndex={-1} className={styles['stepLine']} aria-live="polite">
        <span className={styles['stepCount']}>
          Step {stepIndex + 1} of {steps.length}
        </span>
        <span className={styles['stepLabel']}>{step?.label}</span>
      </p>

      <div className={styles['progress']} aria-hidden="true">
        {steps.map((entry, index) => (
          <span
            key={entry.id}
            className={[
              styles['progressSegment'],
              index <= stepIndex ? styles['progressDone'] : undefined,
            ]
              .filter(Boolean)
              .join(' ')}
          />
        ))}
      </div>

      {/*
       * The address, echoed on every step after the one that asked for it, with the way
       * back to change it.
       *
       * Somebody four fields into a sign-up has no other way to check they typed it
       * correctly, and a password manager filling in the wrong saved address is exactly
       * the case where they need to. The control says what it does rather than being a
       * pencil icon — "Change" beside the address it changes.
       */}
      {!shows('email') && values.email ? (
        <p className={styles['identity']}>
          <span className={styles['identityValue']}>{values.email}</span>
          <button
            type="button"
            className={styles['identityEdit']}
            onClick={() => {
              hasMoved.current = true;
              setLocalErrors({});
              setStepIndex(0);
            }}
          >
            Change
          </button>
        </p>
      ) : null}

      {/*
       * The same address once more, this time for a password manager rather than a reader.
       *
       * A manager decides what to save, and what to offer next time, by looking for a
       * username field beside the password field. On a stepped form there is not one: the
       * email input is unmounted the moment the visitor moves past step one, so by the time
       * the password appears the manager can see a password and nothing to file it under.
       * The result is a saved entry with no username, or no offer to save at all.
       *
       * Off-screen rather than `type="hidden"` or `display: none`, because a manager skips
       * both — this is the same trick, and the same reasoning, as the honeypot in
       * `ui/Field`. `readOnly` keeps it out of the way of the real field, which stays the
       * only writer of the value; `aria-hidden` and `tabIndex={-1}` keep it out of the way
       * of everybody else, who already have the visible echo above.
       */}
      {!shows('email') && values.email ? (
        <input
          className={styles['shadowEmail']}
          type="text"
          name="email"
          autoComplete="username"
          value={values.email}
          readOnly
          tabIndex={-1}
          aria-hidden="true"
        />
      ) : null}

      {shows('email') ? (
        <TextField
          id={`${prefix}-email`}
          label="Email address"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={values.email}
          error={errorFor('email')}
          ref={(node: HTMLInputElement | null) => {
            fieldRefs.current.email = node;
          }}
          onBlur={blur('email')}
          onChange={(event) => set('email', event.target.value)}
        />
      ) : null}

      {shows('name') ? (
        <TextField
          id={`${prefix}-name`}
          label="Your name"
          name="name"
          type="text"
          autoComplete="name"
          required
          value={values.name}
          error={errorFor('name')}
          ref={(node: HTMLInputElement | null) => {
            fieldRefs.current.name = node;
          }}
          onBlur={blur('name')}
          onChange={(event) => set('name', event.target.value)}
        />
      ) : null}

      {shows('businessName') ? (
        <TextField
          id={`${prefix}-business`}
          label="Business name"
          optionalLabel="optional"
          name="businessName"
          type="text"
          autoComplete="organization"
          value={values.businessName}
          error={errorFor('businessName')}
          ref={(node: HTMLInputElement | null) => {
            fieldRefs.current.businessName = node;
          }}
          onChange={(event) => set('businessName', event.target.value)}
        />
      ) : null}

      {shows('password') ? (
        <PasswordField
          id={`${prefix}-password`}
          label={mode === 'signup' ? 'Choose a password' : 'Password'}
          name="password"
          /*
           * The distinction that stops a password manager offering to sign somebody in
           * with a password they are in the middle of choosing.
           */
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          value={values.password}
          error={errorFor('password')}
          ref={(node: HTMLInputElement | null) => {
            fieldRefs.current.password = node;
          }}
          onBlur={blur('password')}
          {...(mode === 'signup' ? { hint: PASSWORD_HINT } : {})}
          onChange={(event) => set('password', event.target.value)}
        />
      ) : null}

      {shows('confirmPassword') ? (
        <PasswordField
          id={`${prefix}-confirm`}
          label="Type it again"
          name="confirmPassword"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          error={errorFor('confirmPassword')}
          ref={(node: HTMLInputElement | null) => {
            fieldRefs.current.confirmPassword = node;
          }}
          onBlur={blur('confirmPassword')}
          onChange={(event) => set('confirmPassword', event.target.value)}
        />
      ) : null}

      {/*
       * The reset link, on the password step and only there.
       *
       * It used to sit in the page footer, under the Google option, visible from the
       * moment the page loaded — offered to somebody who had not yet tried to remember
       * their password. Here it is beside the field they are stuck on, which is the only
       * moment it is the thing they want, and it carries the address they have already
       * typed so the reset page does not ask for it twice.
       */}
      {mode === 'login' && shows('password') ? (
        <p className={styles['forgot']}>
          <Link
            to={
              values.email.trim()
                ? `${routes.forgotPassword}?email=${encodeURIComponent(values.email.trim())}`
                : routes.forgotPassword
            }
          >
            Forgot your password?
          </Link>
        </p>
      ) : null}

      <div className={styles['actions']}>
        {/*
         * `aria-disabled` rather than `disabled`, and the difference is where focus goes.
         *
         * A `disabled` button cannot hold focus, so the browser blurs it the instant the
         * request starts — and focus lands on `<body>`. The visitor who pressed the button
         * with the keyboard has lost their place mid-submission, and a screen reader loses
         * the element whose label is the only thing reporting progress: "Signing you in…"
         * is announced to nobody, and neither is the error that follows.
         *
         * `aria-disabled` says the same thing to assistive technology while leaving the
         * button focusable, so the label change *is* the progress announcement and the
         * outcome arrives where they are standing. It does not stop a second press, which
         * is why `handleSubmit` returns early on `busy` — the guard is the real protection
         * and always was; the attribute was only ever advisory.
         */}
        <Button type="submit" size="lg" block aria-disabled={busy || undefined}>
          {submitLabel()}
        </Button>

        {/*
         * "Previous step", not "Back". The shell's own control is also called Back, and on
         * every step after the first the two sat on one screen doing entirely different
         * things — one returns a step, the other leaves the flow. Two controls with the
         * same accessible name and different destinations is a coin toss for anyone
         * navigating by button.
         */}
        {stepIndex > 0 ? (
          <Button type="button" variant="ghost" className={styles['back']} onClick={goBack}>
            Previous step
          </Button>
        ) : null}
      </div>
    </form>
  );
}
