import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { routes, sections } from '../../../config/routes';
import { Icon } from '../../../components/ui/Icon';
import type { DemoFormField } from '../../../content/demos/types';
import styles from './Demo.module.css';

/*
 * ============================================================================
 * THE QUOTE FORM — REAL ENOUGH TO JUDGE, INERT BY CONSTRUCTION
 * ============================================================================
 *
 * The form is the thing a demo is really demonstrating. A prospect deciding whether to buy
 * a website is deciding whether *this* is what their customers will meet, so it has to
 * validate, it has to show its errors the way a good form does, and it has to be short.
 *
 * What it must never do is submit.
 *
 * ## Why it does not import `lib/api`
 *
 * Not "does not call it" — does not import it. A demonstration form that posts to the real
 * lead endpoint would put fictional enquiries into a real inbox and a real database, and a
 * demonstration form that posts anywhere at all is one refactor away from doing that. The
 * absence of the import is the guarantee, and `demos.test.ts` reads this file's source to
 * assert it stays absent. That is a stronger promise than a comment.
 *
 * ## Why it does not fake success
 *
 * Because the visitor typed their real name into it. A confirmation screen reading "thanks,
 * we'll be in touch" on a site that has already said it is not a real business is a small
 * lie told to somebody who is in the middle of deciding whether to trust the seller. The
 * result panel says exactly what happened — nothing was sent, nothing was stored — and
 * offers the one action that is real.
 * ============================================================================
 */

export interface DemoQuoteFormProps {
  readonly fields: readonly DemoFormField[];
  readonly submitLabel: string;
  readonly businessName: string;
}

export function DemoQuoteForm({ fields, submitLabel, businessName }: DemoQuoteFormProps) {
  const formId = useId();
  const [missing, setMissing] = useState<readonly string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    /*
     * Prevented unconditionally, and first.
     *
     * Before any validation, before any state, before anything that could throw. A default
     * form submission on a static host is a page navigation that loses everything the
     * visitor typed — and the one behaviour this component may never have is leaving.
     */
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const blank = fields
      .filter((field) => field.required)
      .filter((field) => String(data.get(field.id) ?? '').trim() === '')
      .map((field) => field.id);

    setMissing(blank);
    setSubmitted(blank.length === 0);
  }

  if (submitted) {
    return (
      <div className={styles['formResult']} role="status">
        <p className={styles['formResultHeading']}>
          <Icon name="alert" size={20} />
          Nothing was sent.
        </p>
        <p className={styles['formResultBody']}>
          This is a demonstration of {businessName}, which is not a real business. Your details were
          not submitted, not emailed and not stored — they never left this page.
        </p>
        <p className={styles['formResultBody']}>
          If you want a quote form like this one on your own website, that is the part JobForge can
          actually help with.
        </p>
        <Link to={`${routes.contact}#${sections.request}`} className={styles['formResultLink']}>
          Get my free website assessment
          <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }

  return (
    <form className={styles['form']} onSubmit={handleSubmit} noValidate>
      {fields.map((field) => {
        const id = `${formId}-${field.id}`;
        const hintId = field.hint ? `${id}-hint` : undefined;
        const errorId = missing.includes(field.id) ? `${id}-error` : undefined;
        const described = [hintId, errorId].filter(Boolean).join(' ') || undefined;

        return (
          <div key={field.id} className={styles['field']}>
            <label htmlFor={id} className={styles['label']}>
              {field.label}
              {!field.required ? <span className={styles['optional']}> (optional)</span> : null}
            </label>

            {field.hint ? (
              <p id={hintId} className={styles['hint']}>
                {field.hint}
              </p>
            ) : null}

            {field.type === 'textarea' ? (
              <textarea
                id={id}
                name={field.id}
                rows={4}
                className={styles['input']}
                aria-describedby={described}
                aria-invalid={errorId ? true : undefined}
              />
            ) : field.type === 'select' ? (
              <select
                id={id}
                name={field.id}
                className={styles['input']}
                aria-describedby={described}
                aria-invalid={errorId ? true : undefined}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose one
                </option>
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={id}
                name={field.id}
                type={field.type}
                className={styles['input']}
                aria-describedby={described}
                aria-invalid={errorId ? true : undefined}
              />
            )}

            {errorId ? (
              <p id={errorId} className={styles['error']}>
                {field.label} is needed to price the job.
              </p>
            ) : null}
          </div>
        );
      })}

      <button type="submit" className={styles['submit']}>
        {submitLabel}
      </button>

      {/* Said before they type, as well as after. */}
      <p className={styles['formNote']}>
        This form is part of a demonstration. Nothing you enter is sent or stored.
      </p>
    </form>
  );
}
