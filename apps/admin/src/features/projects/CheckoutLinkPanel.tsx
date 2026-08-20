import { useState } from 'react';
import { Button, Switch, TextField } from '@jobforge/ui';
import type { AdminProjectView } from '@jobforge/shared';
import { Notice } from '../../components/Notice';
import { createCheckoutLink, sendInvoice } from '../../lib/endpoints';
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
  /**
   * True when this came from the invoice path.
   *
   * It changes two sentences: whether the URL expires, and whether "sent" is a claim about
   * delivery. Stripe sends an invoice and reports that it accepted it; our own notifier
   * swallows its failures by contract, so the checkout path can only ever say a message was
   * *built* for an address.
   */
  readonly invoiced: boolean;
  readonly number?: string | null;
}

/** Which button is spinning. Prefixed on the invoice path so the two cannot collide. */
type Pending = Product | `invoice-${Product}`;

export function CheckoutLinkPanel({ project }: CheckoutLinkPanelProps) {
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
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

    setCreated({
      product,
      url: result.data.url,
      emailedTo: result.data.emailedTo,
      invoiced: false,
    });
  }

  async function invoice(product: Product) {
    setPending(`invoice-${product}`);
    setProblem(null);
    setCreated(null);
    setCopied(false);

    const result = await sendInvoice(project.id, { product });

    setPending(null);

    if (!result.success) {
      /* Verbatim, for the same reason. The 503 names both amounts and where to fix them. */
      setProblem(result.error.message);
      return;
    }

    setCreated({
      product,
      url: result.data.url,
      emailedTo: result.data.emailedTo,
      invoiced: true,
      number: result.data.number,
    });
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
      <h2 className={styles['subheading']}>Asking for a payment</h2>

      {/*
       * ======================================================================
       * TWO WAYS TO ASK, AND THE DIFFERENCE IS SAID OUT LOUD
       * ======================================================================
       *
       * DECISION 041. An invoice is the default and a Checkout link is the exception, and the
       * copy has to say why — because from here the two buttons look identical and one of
       * them produces something that **stops working after 24 hours**.
       *
       * That expiry is the defect this panel used to have and could not describe: a link sent
       * on a Friday afternoon is dead before Monday, and the client's only symptom is an
       * expiry page for a payment they were trying to make.
       * ======================================================================
       */}
      <p className={styles['muted']}>
        An invoice is usually the right answer: it does not expire, it comes with a PDF and a due
        date, Stripe chases it, and it is the document their bookkeeper wants. Either way the amount
        comes from the Stripe Price, which is checked against the published figure before anything
        is created — so it is right or it is refused.
      </p>

      <div className={styles['formActions']}>
        <Button
          loading={pending === 'invoice-build-deposit'}
          disabled={pending !== null}
          onClick={() => void invoice('build-deposit')}
        >
          Invoice the deposit
        </Button>
        <Button
          loading={pending === 'invoice-build-final'}
          disabled={pending !== null}
          onClick={() => void invoice('build-final')}
        >
          Invoice the launch payment
        </Button>
      </div>

      <h3 className={styles['subheading']}>Or a checkout link</h3>
      <p className={styles['muted']}>
        For somebody who is going to pay in the next few minutes — on the phone, or standing in
        front of you. <strong>It expires after 24 hours</strong>, so it is the wrong thing to send
        on a Friday.
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
          variant="secondary"
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
            {created.invoiced
              ? `Stripe has invoiced ${created.emailedTo} for the ${LABELS[created.product]}${
                  created.number ? ` — ${created.number}` : ''
                }.`
              : created.emailedTo
                ? `The ${LABELS[created.product]} link was sent to ${created.emailedTo}.`
                : `The ${LABELS[created.product]} link is ready.`}
          </Notice>

          <div className={styles['inlineForm']}>
            <TextField
              id="checkout-link"
              label={created.invoiced ? 'The invoice' : 'The link'}
              /*
               * The expiry is stated on the checkout path and its absence stated on the
               * invoice one, because the whole reason both buttons exist is that difference —
               * and an operator who has just pressed one should be told which they got.
               */
              hint={
                created.invoiced
                  ? 'A permanent page, with the PDF on it. Stripe chases this until it is paid.'
                  : 'Stripe hosts this page. It expires after 24 hours, so send it now.'
              }
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
