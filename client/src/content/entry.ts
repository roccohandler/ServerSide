import { conversionFix, fixPriceLabel, flagship, hasFoundingDiscount } from '../config/pricing';
import { prices } from './offer';
import type { EntryPath } from '../types/content';

/*
 * ============================================================================
 * THE THREE WAYS IN
 * ============================================================================
 *
 * Most people arrive in one of three situations, and the site's job is to let them find
 * theirs without reading everything. Before this section existed it answered one of them —
 * "I need a website built" — and left the other two to inference.
 *
 * ## What changed, and why it is the most valuable edit in the file
 *
 * All three paths now end in a **product with a name and a call to action of its own.**
 *
 * The middle one used to end at the phrase "Quoted per site". That is honest and it was a
 * dead end: `recommendedAction()` sends every site scoring roughly 65–85% down this path,
 * which is most established businesses with a working website, and the answer they got was
 * a diagnosis and an invitation to start a conversation from nothing. It is **Conversion
 * Fix** now — a named, scoped, bounded product. Its figure is still unpublished, because
 * that is the owner's decision (DECISION 014), but a named product with a boundary and a
 * button is not a dead end even without one.
 *
 * ## Three rules
 *
 *   1. **Only a published figure may be printed as a figure.** `fixPriceLabel()` returns the
 *      honest sentence while `conversionFix.pricePublished` is false, and the price the day
 *      it is true. Nothing here types a number.
 *   2. **Growth Partner is described as optional on every path that mentions it.** The
 *      version before last ended each path with "Then $299/mo", which read as the next
 *      instalment of one bill. The takeover path is the exception in emphasis — the monthly
 *      service is the thing that reader came for — and even there it is a choice being
 *      described, not a charge being scheduled.
 *   3. **Every path carries the intent it should arrive at the contact form with.** A reader
 *      who has just told this page which of three situations they are in should never be
 *      asked again on the next screen.
 * ============================================================================
 */

/**
 * The condition on the published launch figure — or nothing, when there is none.
 *
 * `prices.launch` is the founding-client price. Printed on its own it reads as the price,
 * which is a claim the reader has no way to check and the same defect as a former-price
 * comparison approached from the other side. Spread rather than assigned because
 * `exactOptionalPropertyTypes` treats an explicit `undefined` as different from an absent
 * key — and because when the offer is switched off, the sentence should not exist at all.
 */
const launchPriceNote = hasFoundingDiscount()
  ? {
      priceNote: `Founding-client price. The standard project price is ${prices.launchStandard}.`,
    }
  : {};

const paths: readonly EntryPath[] = [
  {
    id: 'new',
    title: 'You need a website built',
    situation:
      'You have nothing, or you have something so old that starting again is cheaper than fixing it.',
    response:
      'The full build: designed around how your customers decide, measured from launch day, live on your own domain in two to four weeks.',
    product: flagship.name,
    price: prices.launch,
    ...launchPriceNote,
    then: `Afterwards, run it yourself — or have Growth Partner measure and improve it for ${prices.managementDisplay} a month. Optional, your call.`,
    cta: { label: 'Request this build', intent: 'build' },
    icon: 'rocket',
  },
  {
    id: 'rescue',
    title: 'You have a website that is losing people',
    situation:
      'It exists, it loads, people arrive — and not enough of them get in touch. A rebuild would be overkill.',
    response:
      'Targeted corrective work on the site you own: the specific things costing you enquiries, found against the same twenty checks, fixed and measured.',
    product: conversionFix.name,
    /*
     * `fixPriceLabel()` rather than a literal. While the figure is unpublished this reads
     * "Quoted from your assessment", which satisfies the guard requiring every path to carry
     * either a figure or an honest statement that it is quoted — and the day the owner
     * publishes the price, this string becomes the price with no edit here.
     */
    price: fixPriceLabel(),
    then: `Afterwards, the same choice as everybody else: yours to run, or ${prices.managementDisplay} a month for Growth Partner to keep measuring it.`,
    cta: { label: 'Fix my website', intent: 'fix' },
    icon: 'wrench',
  },
  {
    id: 'takeover',
    title: 'You want somebody to run the one you have',
    situation:
      'The website is fine. Nobody is measuring it, nobody is improving it, and you would rather that was not your job.',
    response:
      'A one-time onboarding to audit it, fix what needs fixing and get the measurement in place. Then it joins Growth Partner with a baseline of its own.',
    product: 'Onboarding, then Growth Partner',
    price: 'Quoted per site',
    then: `Then ${prices.managementDisplay} a month for Growth Partner, with the monthly report and the response guarantee from the first full month.`,
    cta: { label: 'Ask about Growth Partner', intent: 'partner' },
    icon: 'shield',
  },
];

export const entryPaths = {
  eyebrow: 'Where you are starting from',
  heading: 'Which of these is you?',
  lede: 'Three situations, three different pieces of work. Only the first has a published figure — the other two depend on what is already there.',

  paths,

  /*
   * The line that makes the free assessment the obvious next step regardless of which of the
   * three the reader is. Nobody has to self-diagnose before making contact — which matters
   * more here than anywhere else on the page, because a reader who cannot place themselves
   * in one of three cards and is offered no fourth option simply leaves.
   */
  closing:
    'Not sure which one you are? That is exactly what the free website assessment is for — including when the answer is "leave it alone and spend the money somewhere else".',
  closingCta: 'Tell me which one I need',
} as const;
