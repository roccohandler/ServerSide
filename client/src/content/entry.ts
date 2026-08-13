import { growthTier, hasFoundingDiscount } from '../config/pricing';
import { prices } from './offer';
import type { EntryPath } from '../types/content';

/*
 * ============================================================================
 * THE THREE WAYS IN
 * ============================================================================
 *
 * The published price covers one of them: a new website, built from nothing. The other
 * two are real businesses with real money to spend, and both were previously invisible
 * on this site — a reader who owned a working website and wanted somebody to run it had
 * to infer that the answer was yes.
 *
 * Two rules:
 *
 *   1. Only the launch has a published number. The other two depend on what is already
 *      there, and inventing a figure for "fixing somebody else's website" would be a
 *      guess dressed as a price. `Quoted per site` is the honest answer and it is stated
 *      as one rather than hidden behind a call.
 *   2. All three end in the same place — the monthly service — because that is what is
 *      actually being sold. The entry is how you arrive, not what you buy.
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
const launchPriceNote = hasFoundingDiscount(growthTier)
  ? {
      priceNote: `Founding-client price. The standard project price is ${prices.launchStandard}.`,
    }
  : {};

/*
 * Declared with a type rather than `satisfies`, which is the pattern everywhere else in
 * this file's neighbours.
 *
 * `satisfies` keeps the literal type of each element, and only one of these three has a
 * `priceNote` — so the array's element type became a union in which the field does not
 * exist on two members, and every consumer failed to compile the moment it read one.
 * Annotating the array is what makes an optional field actually optional at the call site.
 */
const paths: readonly EntryPath[] = [
  {
    id: 'new',
    title: 'You need a website built',
    situation:
      'You have nothing, or you have something so old that starting again is cheaper than fixing it.',
    response:
      'The full launch: designed, built, set up to bring in enquiries, and live on your own domain in two to four weeks.',
    price: prices.launch,
    ...launchPriceNote,
    then: `Then ${prices.managementDisplay} to manage and keep improving it.`,
    icon: 'rocket',
  },
  {
    id: 'rescue',
    title: 'You have a website that is not working',
    situation:
      'It exists, it mostly works, and it is not bringing in the enquiries it should. A rebuild might be overkill.',
    response:
      'A fix rather than a replacement: the speed, mobile, clarity, trust and contact problems that are actually costing you calls, put right on the site you already own.',
    price: 'Quoted per site',
    then: `Then ${prices.managementDisplay}, the same as any other managed site.`,
    icon: 'wrench',
  },
  {
    id: 'takeover',
    title: 'You want somebody to run the one you have',
    situation:
      'The website is fine. Nobody is looking after it, and you would rather that was not your job.',
    response:
      'A one-time onboarding to audit it, fix what needs fixing and get it to a standard I can stand behind — then it joins the monthly service like anything I built myself.',
    price: 'Quoted per site',
    then: `Then ${prices.managementDisplay}, with the response guarantee from day one.`,
    icon: 'shield',
  },
];

export const entryPaths = {
  eyebrow: 'Where you are starting from',
  heading: 'Three ways this usually starts',
  lede: 'Most people arrive in one of these three situations. Only the first has a fixed price, because the other two depend on what is already there — and quoting a number before I have seen it would be a guess.',

  paths,

  /*
   * The line that makes the free assessment the obvious next step regardless of which of the
   * three the reader is. Nobody has to self-diagnose before making contact.
   */
  closing:
    'Not sure which one you are? That is what the free website assessment is for. You send me what you have, I tell you which of these it actually needs — including when the answer is "leave it alone and spend the money somewhere else".',
} as const;
