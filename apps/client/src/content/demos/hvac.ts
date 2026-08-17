import { demoImage } from './media';
import type { DemoSite } from './types';

/*
 * Every photograph this demo shows, as hashed URLs in this module's own lazy chunk.
 * Licensed stock imagery — provenance in `scripts/media.manifest.json` and
 * `docs/MEDIA-CREDITS.md`. It illustrates kinds of work; none of it is presented as
 * this business's own job, because this business does not exist.
 */
const files = import.meta.glob<string>('../../assets/demos/hvac/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

/*
 * ============================================================================
 * CASCADE COMFORT HEATING & AIR — A FICTIONAL BUSINESS
 * ============================================================================
 *
 * There is no such company. Every word below is written to demonstrate how an HVAC
 * website should be built, and none of it is evidence about anybody.
 *
 * ## What this demo is shaped around
 *
 * `trades.ts` records the fact this whole page follows from: **heating or cooling has
 * failed and the decision is being made in the next hour, often from a phone, often in an
 * uncomfortable house.** So the phone number is the primary action rather than the form,
 * the same-day work is named before the planned work, and the service area is answered on
 * the first screen — a customer whose furnace is out will not scroll to find out whether
 * you come to Greenwood.
 *
 * ## What is deliberately absent
 *
 * No reviews, no star rating, no "licensed and insured", no licence number, no years in
 * business, no jobs-completed count, no award, no response-time guarantee. Every one of
 * those is proof, and this site does not manufacture proof — not for itself and not for a
 * business it invented. See the note at the top of `types.ts`.
 *
 * ## Two details that look like oversights and are not
 *
 *   - **The phone number is in the 555-01xx range** reserved for fiction, and it is not a
 *     `tel:` link. A dialable fictional number is a misdial pointed at a stranger.
 *   - **The email is on a `.example` domain**, which RFC 2606 reserves and nobody can ever
 *     register. A plausible-looking domain is one somebody may already own.
 * ============================================================================
 */

export const demo: DemoSite = {
  slug: 'hvac',
  isFictional: true,

  business: {
    name: 'Cascade Comfort Heating & Air',
    trade: 'Heating and cooling',
    mark: 'CC',
    phone: '(206) 555-0142',
    email: 'office@cascadecomfort.example',
    serviceAreas: ['Ballard', 'Fremont', 'Greenwood', 'Wallingford', 'Phinney Ridge', 'Green Lake'],
    hours: [
      { days: 'Monday to Friday', time: '7am – 7pm' },
      { days: 'Saturday', time: '8am – 4pm' },
      { days: 'Sunday', time: 'Emergency calls only' },
    ],
  },

  palette: {
    '--demo-brand': '#0e3a5f',
    '--demo-brand-strong': '#082a47',
    '--demo-accent': '#e8722c',
    '--demo-ink': '#16212b',
    '--demo-ink-muted': '#55636f',
    '--demo-surface': '#ffffff',
    '--demo-surface-alt': '#eef4f9',
    '--demo-on-brand': '#ffffff',
  },

  media: {
    hero: demoImage(
      files,
      'hero',
      'heroSplit',
      'Grey air-source heat pump on a gravel bed beside the entrance of a modern house, small shrubs either side.',
    ),
    gallery: [
      demoImage(
        files,
        'gallery-1',
        'gallery',
        'Worker in a hard hat and hi-vis vest crossing a flat roof between solar panels and rows of air-handling units.',
      ),
      demoImage(
        files,
        'gallery-2',
        'gallery',
        'Three condenser units mounted in a neat column on the panelled face of a modern building.',
      ),
      demoImage(
        files,
        'gallery-3',
        'gallery',
        'Compact air-conditioning unit mounted at the corner of a white building beside tinted windows.',
      ),
    ],
    closing: demoImage(
      files,
      'closing',
      'closing',
      'Frost-covered roof with soft smoke rising from a brick chimney at hazy sunrise, evergreens behind.',
    ),
  },

  home: {
    eyebrow: 'North Seattle heating and cooling',
    heading: 'Furnace out? We can usually be there today.',
    subheading:
      'Repairs, replacements and maintenance for heating and cooling systems in North Seattle. We tell you what is wrong, what it costs, and what happens if you leave it.',
    heroLayout: 'split',
    primaryAction: 'Call',
    secondaryAction: 'Request a quote',
    points: [
      'Same-day repair slots most weekdays',
      'We quote before we start, not after',
      'One technician handles your job start to finish',
    ],
    servicesHeading: 'What we do',
    servicesLede:
      'Heating and cooling, repaired or replaced. If it moves warm or cold air through your house, it is on this list.',
    galleryHeading: 'The kind of work this is',
    galleryLede:
      'Modern systems, fitted tidily and left working. This is what heating and cooling equipment looks like when it is put in properly.',
    areaHeading: 'Where we work',
    areaLede:
      'North Seattle, within about twenty minutes of Ballard. If you are just outside it, call and ask — we will tell you honestly whether we can get to you.',
    closingHeading: 'Tell us what it is doing',
    closingBody:
      'Describe the noise, the smell or the temperature and we will tell you what it usually turns out to be, and what it costs to come and look.',
  },

  services: {
    heading: 'Heating and cooling services',
    lede: 'Written the way people describe the problem, not the way it appears on an invoice.',
    note: 'If what you need is not here, call and ask. If it is not something we do, we will tell you who does it.',
    items: [
      {
        id: 'no-heat',
        name: 'No heat',
        summary: 'The furnace runs and the house stays cold, or it will not start at all.',
        detail:
          'The most common winter call. Usually an ignitor, a flame sensor, a limit switch or a thermostat — all of which are same-day parts. We diagnose it, tell you the cost before we touch it, and fit it the same visit where we can.',
        includes: [
          'Diagnosis of why it is not firing',
          'The cost of the fix before the fix',
          'Common parts carried on the van',
          'A straight answer on repair versus replace',
        ],
        icon: 'bolt',
        image: demoImage(
          files,
          'service-4',
          'service',
          'Technician in a hi-vis jacket kneeling at an open wall recess, working on the pipework of a heating system.',
        ),
        urgent: true,
      },
      {
        id: 'no-cooling',
        name: 'Air conditioning not cooling',
        summary: 'It runs, but the air coming out is not cold.',
        detail:
          'Usually airflow, a failed capacitor, or a refrigerant leak somewhere in the system. The first two are a same-visit repair. A leak we find and price properly rather than topping up and leaving you to call again in July.',
        includes: [
          'Airflow and capacitor checked first',
          'Leak search rather than a top-up',
          'Written price before any refrigerant work',
          'Honest advice when a system is past repairing',
        ],
        icon: 'bolt',
        image: demoImage(
          files,
          'service-1',
          'service',
          'Residential air-conditioning condenser standing outdoors in falling rain, green trees behind.',
        ),
        urgent: true,
      },
      {
        id: 'furnace-replacement',
        name: 'Furnace replacement',
        summary: 'A planned replacement, sized for your house rather than for the invoice.',
        detail:
          'We measure the house before recommending anything, because an oversized furnace short-cycles, wears out early and costs more to run. You get two or three options with the running costs of each, and a fixed price.',
        includes: [
          'Heat-loss measurement, not a rule of thumb',
          'Two or three options with running costs',
          'Fixed price, agreed in writing',
          'Old unit removed and disposed of',
        ],
        icon: 'wrench',
        image: demoImage(
          files,
          'service-3',
          'service',
          'Ductless mini-split condenser mounted on a dark brick wall, its line running up the siding — one of the options a replacement can mean.',
        ),
        urgent: false,
      },
      {
        id: 'heat-pump',
        name: 'Heat pump installation',
        summary: 'Heating and cooling from one system, which suits this climate well.',
        detail:
          'Seattle winters are mild enough that a heat pump does most of the work a furnace would, and it cools in August. We will tell you plainly whether your house suits one, including when the answer is no.',
        includes: [
          'Assessment of whether your house suits one',
          'Ducted and ductless options explained',
          'Rebate and incentive paperwork handled',
          'A clear answer when it is not worth it',
        ],
        icon: 'rocket',
        image: demoImage(
          files,
          'service-2',
          'service',
          'White air-source heat pump with a black coil grille, mounted on a stand against the wood-clad wall of a house.',
        ),
        urgent: false,
      },
      {
        id: 'maintenance',
        name: 'Annual maintenance',
        summary: 'The visit that stops the January call.',
        detail:
          'Once a year, before the weather turns. Clean, test, measure and report — including telling you when something is starting to fail rather than waiting for it to do so on the coldest night of the year.',
        includes: [
          'Full clean and safety check',
          'Combustion and airflow measured',
          'Written report of what we found',
          'Warning when something is on its way out',
        ],
        icon: 'shield',
        urgent: false,
      },
      {
        id: 'air-quality',
        name: 'Air quality and filtration',
        summary: 'For allergies, wildfire smoke season, or a house that never feels fresh.',
        detail:
          'Filtration, ventilation and humidity are three different problems and they need three different answers. We work out which one you actually have before selling you equipment for a different one.',
        includes: [
          'Which of the three problems you have',
          'Filter upgrades that your system can handle',
          'Ventilation and humidity options',
          'Smoke-season preparation',
        ],
        icon: 'check',
        urgent: false,
      },
    ],
  },

  contact: {
    heading: 'Get in touch',
    lede: 'Call for anything urgent. Use the form for planned work, quotes and questions.',
    callHeading: 'Call us',
    callLede:
      'If your heating or cooling has stopped, calling is faster. We answer during the hours below and return messages the same day.',
    formHeading: 'Request a quote',
    formLede:
      'Four questions. Enough to tell you what it usually is and what it costs to come and look.',
    submitLabel: 'Send request',
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        id: 'service',
        label: 'What do you need?',
        type: 'select',
        required: true,
        options: [
          'No heat',
          'Air conditioning not cooling',
          'Furnace replacement',
          'Heat pump installation',
          'Annual maintenance',
          'Something else',
        ],
      },
      {
        id: 'detail',
        label: 'What is it doing?',
        type: 'textarea',
        required: false,
        hint: 'Noises, smells, error codes, or how long it has been happening.',
      },
    ],
  },
};
