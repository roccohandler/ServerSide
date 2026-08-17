import { demoImage } from './media';
import type { DemoSite } from './types';

/*
 * ============================================================================
 * RAINSHADOW ROOFING — A FICTIONAL BUSINESS
 * ============================================================================
 *
 * There is no such company. See `hvac.ts` for the rules.
 *
 * ## Why this demo is shaped completely differently
 *
 * `trades.ts`: **a large, infrequent purchase the customer cannot easily judge, usually
 * compared across several contractors over days or weeks.** Nothing about that is an
 * emergency, so almost every decision the HVAC demo makes is wrong here.
 *
 * The customer is not in a hurry. They are frightened of being ripped off on a five-figure
 * job they will make once, by somebody they cannot supervise, on a part of the house they
 * cannot see. So this demo leads with **process** — what happens, in what order, and what
 * it costs to find out — and the primary action is an inspection rather than a call.
 *
 * ## The temptation this demo exists to refuse
 *
 * Roofing is the trade where fake proof is most tempting: certifications, manufacturer
 * badges, "GAF Master Elite", licence numbers, a review count. There is none of it here,
 * and the page has to earn trust through what it explains instead. That constraint is a
 * fair approximation of a real new roofer's problem, which makes the demo more useful
 * rather than less.
 * ============================================================================
 */

/*
 * Licensed stock photography — provenance in `docs/MEDIA-CREDITS.md`. No ambient clip:
 * the two verified candidates were over the byte budget or visibly not this region, and
 * a static photograph beats a compromised video (`docs/DEMO-QUALITY-UPGRADE.md` §3).
 */
const files = import.meta.glob<string>('../../assets/demos/roofing/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const demo: DemoSite = {
  slug: 'roofing',
  isFictional: true,

  business: {
    name: 'Rainshadow Roofing',
    trade: 'Roofing and gutters',
    mark: 'RR',
    phone: '(425) 555-0119',
    email: 'office@rainshadowroofing.example',
    serviceAreas: ['Shoreline', 'Edmonds', 'Lynnwood', 'Mountlake Terrace', 'Brier', 'Woodway'],
    hours: [
      { days: 'Monday to Friday', time: '7:30am – 5pm' },
      { days: 'Saturday', time: 'Inspections by arrangement' },
      { days: 'Sunday', time: 'Closed' },
    ],
  },

  palette: {
    '--demo-brand': '#2b2f36',
    '--demo-brand-strong': '#1b1e23',
    '--demo-accent': '#c2402f',
    '--demo-ink': '#1c2027',
    '--demo-ink-muted': '#5a6270',
    '--demo-surface': '#ffffff',
    '--demo-surface-alt': '#f1f2f4',
    '--demo-on-brand': '#ffffff',
  },

  media: {
    hero: demoImage(
      files,
      'hero',
      'heroImmersive',
      'Grey asphalt shingle roof under an overcast sky, a gable dormer trimmed in dark green and bare trees behind the ridge.',
    ),
    gallery: [
      demoImage(
        files,
        'gallery-1',
        'gallery',
        'Rooflines of a two-storey house with dark architectural asphalt shingles and tan siding under a pale sky.',
      ),
      demoImage(
        files,
        'gallery-2',
        'gallery',
        'Aerial view of suburban homes with dark shingle roofs among autumn trees.',
      ),
      demoImage(
        files,
        'gallery-3',
        'gallery',
        'Roofer seen from behind carrying materials across a rooftop, shingle bundles staged along the slope.',
      ),
    ],
    closing: demoImage(
      files,
      'closing',
      'closing',
      'Pale bungalow with a steep dark shingle roof in soft evening light, roses along the fence line.',
    ),
  },

  home: {
    eyebrow: 'Roofing in Snohomish and north King County',
    heading: 'A roof is a decision you make once. Here is exactly how ours works.',
    subheading:
      'Inspections, repairs and full replacements in Shoreline, Edmonds and Lynnwood. We photograph what we find, explain what it means, and price the work before you commit to anything.',
    heroLayout: 'immersive',
    primaryAction: 'Call',
    secondaryAction: 'Book an inspection',
    points: [
      'You see photographs of your own roof',
      'Written scope and fixed price before work starts',
      'We will tell you when a repair beats a replacement',
    ],
    servicesHeading: 'What we do',
    servicesLede:
      'Most people arrive here after finding a stain on a ceiling. That can mean four different jobs, and this is how we tell them apart.',
    galleryHeading: 'What a roof done properly looks like',
    galleryLede:
      'Straight courses, tidy flashing, and a slope that sheds water the way it was designed to. The photographs a roofer should be able to show you of any job.',
    areaHeading: 'Where we work',
    areaLede:
      'North of Seattle, roughly between Shoreline and Lynnwood. We stay in that radius so we can get back quickly if anything needs attention after the job.',
    closingHeading: 'Start with an inspection',
    closingBody:
      'We go up, photograph what is there, and send you a written assessment with the options and what each one costs. You are not committing to work by having us look.',
  },

  services: {
    heading: 'Roofing services',
    lede: 'Four jobs that all start as "there is a stain on my ceiling", and how we separate them.',
    note: 'Flat commercial roofs, cedar shake and slate are outside what we take on. We will tell you who around here does them.',
    items: [
      {
        id: 'inspection',
        name: 'Roof inspection and report',
        summary: 'Photographs, findings and options in writing. The place most jobs start.',
        detail:
          'We walk the roof where it is safe to, photograph every problem area, and send you a written report: what is wrong, how urgent it is, and what the options cost. It is yours to keep whether or not you use us.',
        includes: [
          'Photographs of your actual roof',
          'Findings ranked by urgency',
          'Options priced, not just the biggest one',
          'The report is yours either way',
        ],
        icon: 'target',
        urgent: false,
      },
      {
        id: 'leak',
        name: 'Leak repair',
        summary: 'Water is getting in and you need it stopped before the next storm.',
        detail:
          'Leaks rarely enter where the stain appears. We trace it back to the actual entry point rather than sealing the ceiling side, and we tell you honestly whether the repair buys you two years or ten.',
        includes: [
          'Traced to where water actually enters',
          'Temporary cover if a storm is coming',
          'Honest estimate of how long the repair lasts',
          'Photographs before and after',
        ],
        icon: 'alert',
        image: demoImage(
          files,
          'service-2',
          'service',
          'Roofer applying sealant to asphalt shingles with a caulking gun on a sloped roof.',
        ),
        urgent: true,
      },
      {
        id: 'replacement',
        name: 'Full roof replacement',
        summary: 'Planned properly: scope, price, dates and what happens if the weather turns.',
        detail:
          'You get a written scope listing the decking, underlayment, flashing and ventilation as well as the shingles — because that is where quotes differ and where a cheap one is cheap. Fixed price, agreed dates, and a plan for rain.',
        includes: [
          'Written scope, not a single line item',
          'Decking and flashing inspected first',
          'Fixed price and agreed dates',
          'A stated plan for bad weather',
        ],
        icon: 'layout',
        /*
         * The tear-off, not the nail gun: the nail-gun shot is from the same session as
         * the leak-repair photo above it, and two near-identical frames on adjacent
         * cards read as a paste error. Stripping the old roof is also the honest
         * emblem of a replacement.
         */
        image: demoImage(
          files,
          'service-4',
          'service',
          'Worker prying up old asphalt shingles with a tear-off bar beside a dormer window.',
        ),
        urgent: false,
      },
      {
        id: 'gutters',
        name: 'Gutters and drainage',
        summary: 'Where a surprising share of "roof" leaks actually come from.',
        detail:
          'Overflowing gutters put water behind the fascia and into the wall, and it presents as a roof leak. Cheaper to fix than a roof, so we check it first rather than after.',
        includes: [
          'Checked before anything larger is quoted',
          'Cleaning, repair or replacement',
          'Downpipes and ground drainage looked at',
          'Guards only where they actually help',
        ],
        icon: 'wrench',
        image: demoImage(
          files,
          'service-3',
          'service',
          'Two roofers in safety harnesses kneeling at the eave of a dark shingle roof, working at the drip edge.',
        ),
        urgent: false,
      },
      {
        id: 'ventilation',
        name: 'Attic ventilation',
        summary: 'The reason a roof fails early in a wet climate.',
        detail:
          'A poorly ventilated attic cooks the underside of the shingles in summer and condenses moisture in winter. It shortens a roof by years, and it is usually cheap to correct while other work is happening.',
        includes: [
          'Intake and exhaust both measured',
          'Insulation checked for blocked vents',
          'Corrected during other work where possible',
          'Explained in plain terms',
        ],
        icon: 'check',
        urgent: false,
      },
      {
        id: 'storm',
        name: 'Storm damage',
        summary: 'Documented properly, so a claim is not argued about later.',
        detail:
          'We photograph and document the damage in the form insurers actually want, make it safe, and give you a scope you can hand over. We do not tell you what your policy covers — that is between you and them.',
        includes: [
          'Temporary cover the same day where possible',
          'Documented for a claim',
          'Written scope you can hand to an adjuster',
          'No advice about your policy, ever',
        ],
        icon: 'shield',
        image: demoImage(
          files,
          'service-1',
          'service',
          'Roofer in a high-visibility shirt fastening dark asphalt shingles with a pneumatic nail gun.',
        ),
        urgent: true,
      },
    ],
  },

  contact: {
    heading: 'Book an inspection',
    lede: 'The way most jobs start. Having us look does not commit you to anything.',
    callHeading: 'Prefer to talk it through?',
    callLede:
      'Call and describe what you are seeing. We can usually tell you over the phone whether it sounds like a repair or something larger.',
    formHeading: 'Request an inspection',
    formLede: 'Five questions. Enough to arrive knowing what we are looking at.',
    submitLabel: 'Request an inspection',
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'tel', required: true },
      { id: 'email', label: 'Email', type: 'email', required: false },
      {
        id: 'service',
        label: 'What brings you here?',
        type: 'select',
        required: true,
        options: [
          'A leak or a ceiling stain',
          'The roof is old and I want it assessed',
          'Storm damage',
          'Gutters or drainage',
          'Planning a replacement',
        ],
      },
      {
        id: 'detail',
        label: 'What have you noticed?',
        type: 'textarea',
        required: false,
        hint: 'Roughly how old the roof is, and where the problem shows up inside.',
      },
    ],
  },
};
