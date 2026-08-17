import { useState } from 'react';
import { Button, Switch, TextField } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { createCheckoutLink } from '../../lib/endpoints';
import styles from './Projects.module.css';

/*
 * ============================================================================
 * ASKING THIS CLIENT FOR MONEY
 * ============================================================================
 *
 * The last step of the sale that had no screen. A scope agreed on the phone produced a project
 * — since the console learned to create one — and turning it into a paid project meant a curl
 * command against the token surface and a link pasted into a mail client by hand.
 *
 * ## What this panel does not do
 *
 * It does not know a price, it does not know a Stripe Price id, and it does not hold a key. It
 * posts a product name and renders whatever comes back. Everything that decides how much
 * somebody is charged happens on the server, and `requireVerifiedPrice` there refuses to create
 * a link at all when the configured Stripe Price disagrees with the published figure.
 *
 * ## The 503 is rendered verbatim, and that is deliberate
 *
 * That refusal reads, in full: *The Stripe Price for "build-deposit" charges 200000 usd cents,
 * but the published price requires 245000 usd cents. Fix the Price in the Stripe dashboard (or
 * the env mapping) before sending a link.* It names the product, both amounts, and the two
 * places the fix could be. Replacing it with "Something went wrong" would throw away the only
 * thing that tells the person reading it what to do — and the person reading it is the person
 * who can fix it.
 *
 * ## Two halves, and the second one is guarded by nothing here
 *
 * The launch instalment can be sent before the deposit is paid. That is not a defect: an
 * operator sending the wrong half will see it in the copy on the button, and a *client* cannot
 * reach either link except by being sent it. The gate that matters is on the self-serve path,
 * where a customer chooses for themselves — see `available.final` in `billing.summary.ts`.
 * Refusing here as well would be a rule an operator has to argue with on the one afternoon it
 * is wrong.
 * ============================================================================
 */

export interface CheckoutLinkPanelProps {
  readonly project: AdminProjectView;
}

type Product = 'build-deposit' | 'build-final';

const LABELS: Readonly<Record<Product, string>> = {
  'build-deposit': 'deposit',
  'build-final': 'launch instalment',
};

interface Created {
  readonly product: Product;
  readonly url: string;
  readonly emailedTo: string | null;
}

export function CheckoutLinkPanel({ project }: CheckoutLinkPanelProps) {
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [pending, setPending] = useState<Product | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate(product: Product) {
    setPending(product);
    setProblem(null);
    setCreated(null);
    setCopied(false);

    const result = await createCheckoutLink(project.id, { product, notifyCustomer });

    setPending(null);

    if (!result.success) {
      /* Verbatim. See the note above. */
      setProblem(result.error.message);
      return;
    }

    setCreated({ product, url: result.data.url, emailedTo: result.data.emailedTo });
  }

  /*
   * `navigator.clipboard` can reject — a browser without permission, an insecure origin, a
   * document that is not focused. The field beside the button is the fallback and it is
   * always there, so a failed copy is a button that does not change rather than an error.
   */
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles['panel']}>
      <h2 className={styles['subheading']}>Payment links</h2>
      <p className={styles['muted']}>
        A Stripe Checkout link for one half of the build. The amount comes from the Stripe Price,
        which is checked against the published figure before anything is created — so a link is
        either right or refused.
      </p>

      <Switch
        checked={notifyCustomer}
        label={`Email it to ${project.email}`}
        hint="Sends them the link with a short message about which half it is. Leave it off to copy the link and send it yourself."
        disabled={pending !== null}
        onChange={setNotifyCustomer}
      />

      <div className={styles['formActions']}>
        <Button
          loading={pending === 'build-deposit'}
          disabled={pending !== null}
          onClick={() => void generate('build-deposit')}
        >
          Deposit link
        </Button>
        <Button
          variant="secondary"
          loading={pending === 'build-final'}
          disabled={pending !== null}
          onClick={() => void generate('build-final')}
        >
          Launch payment link
        </Button>
      </div>

      {problem ? <Notice tone="problem">{problem}</Notice> : null}

      {created ? (
        <>
          <Notice tone="success">
            {created.emailedTo
              ? `The ${LABELS[created.product]} link was sent to ${created.emailedTo}.`
              : `The ${LABELS[created.product]} link is ready.`}
          </Notice>

          <div className={styles['inlineForm']}>
            <TextField
              id="checkout-link"
              label="The link"
              hint="Stripe hosts this page. It stays valid until it is used or Stripe expires it."
              value={created.url}
              readOnly
            />

            <div className={styles['formActions']}>
              <Button variant="secondary" onClick={() => void copy(created.url)}>
                {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
