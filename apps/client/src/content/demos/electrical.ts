import { demoImage, demoPoster, demoVideoSrc } from './media';
import type { DemoSite } from './types';

/*
 * ============================================================================
 * SOUND CURRENT ELECTRIC — A FICTIONAL BUSINESS
 * ============================================================================
 *
 * There is no such company. See `hvac.ts` for the rules.
 *
 * ## The two-audience problem
 *
 * `trades.ts`: **split between work that cannot wait and work that is planned, with
 * licensing and safety carrying more weight than in most trades.** And underneath that,
 * the split `content/portfolio.ts` has always described for this demo — *residential and
 * commercial, so neither audience has to read the other one first.*
 *
 * A homeowner with a dead outlet and a property manager with a failed three-phase panel
 * want nothing in common. This demo names both in the first two lines and then sorts the
 * service list so each can find their half without scrolling through the other's.
 *
 * ## The hardest trade to demo honestly
 *
 * Electrical is where credentials matter most to a real customer, and credentials are
 * exactly what these demos may not invent — no licence number, no bonding claim, no
 * "licensed and insured" badge. So the copy does the one thing it legitimately can: it
 * describes *what safe work looks like* — permits, inspection, testing — without claiming
 * anybody holds anything. A real business would put its licence number here, and that is
 * a sentence worth a prospect noticing.
 * ============================================================================
 */

/* Licensed stock photography and one ambient clip — provenance in `docs/MEDIA-CREDITS.md`. */
const files = import.meta.glob<string>('../../assets/demos/electrical/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const demo: DemoSite = {
  slug: 'electrical',
  isFictional: true,

  business: {
    name: 'Sound Current Electric',
    trade: 'Residential and commercial',
    mark: 'SC',
    phone: '(253) 555-0107',
    email: 'office@soundcurrentelectric.example',
    serviceAreas: ['Renton', 'Kent', 'Tukwila', 'SeaTac', 'Newcastle', 'Skyway'],
    hours: [
      { days: 'Monday to Friday', time: '7am – 6pm' },
      { days: 'Saturday', time: '8am – 12pm' },
      { days: 'Out of hours', time: 'Emergency callout, seven days' },
    ],
  },

  palette: {
    '--demo-brand': '#1d2026',
    '--demo-brand-strong': '#101215',
    '--demo-accent': '#c98a12',
    '--demo-ink': '#191c21',
    '--demo-ink-muted': '#585f6a',
    '--demo-surface': '#ffffff',
    '--demo-surface-alt': '#f2f3f5',
    '--demo-on-brand': '#ffffff',
  },

  media: {
    hero: demoImage(
      files,
      'hero',
      'heroSplit',
      'Electrician in a yellow hard hat and work gloves testing a wall-mounted electrical box against a plain concrete wall.',
    ),
    gallery: [
      demoImage(
        files,
        'gallery-1',
        'gallery',
        'Tidy distribution board with rows of breakers and colour-coded wiring on mounting rails.',
      ),
      demoImage(
        files,
        'gallery-2',
        'gallery',
        'Matte black pendant lamp glowing warm against a dark ceiling with exposed conduit.',
      ),
      demoImage(
        files,
        'gallery-3',
        'gallery',
        'Cluster of exposed filament bulbs hanging on black cords in front of a dark brick wall.',
      ),
    ],
    closing: demoImage(
      files,
      'closing',
      'closing',
      'Warm glass globe pendant lights hanging from a curved ceiling in a finished, softly lit interior.',
    ),
    ambient: {
      src: demoVideoSrc(files),
      poster: demoPoster(files),
      width: 960,
      height: 540,
      heading: 'Most of the job is the part you never see',
      body: 'Fixtures are the last ten minutes. The work is in the routing, the connections and the testing behind the ceiling — done carefully, so the visible part just works.',
    },
  },

  home: {
    eyebrow: 'South King County electricians',
    heading: 'Homes and commercial premises. Two different jobs, done properly.',
    subheading:
      'Panel work, rewiring, EV chargers and fault-finding in Renton, Kent and Tukwila. Permitted and inspected where it should be, and we say so before you ask.',
    heroLayout: 'split',
    primaryAction: 'Call',
    secondaryAction: 'Request a callback',
    points: [
      'Permits pulled and inspections arranged',
      'Quoted in writing before work begins',
      'We explain what we found, in plain terms',
    ],
    servicesHeading: 'What we do',
    servicesLede:
      'Homeowners first, commercial work below. Both lists are complete — neither is an afterthought.',
    galleryHeading: 'Neat is not cosmetic',
    galleryLede:
      'A tidy panel is a panel the next person can work on safely, and lighting that looks deliberate usually is. This is what careful electrical work looks like.',
    areaHeading: 'Where we work',
    areaLede:
      'South King County. Staying inside it is what lets us get to a fault the same day rather than the day after tomorrow.',
    closingHeading: 'Not sure whether it is urgent?',
    closingBody:
      'Burning smells, hot outlets, repeated breaker trips and any exposed conductor are the ones to call about immediately. Everything else can usually wait for a booked visit.',
  },

  services: {
    heading: 'Electrical services',
    lede: 'Same-day faults first, then planned home work, then commercial.',
    note: 'We do not take on new-build first fix or utility-side work. Ask and we will point you to somebody who does.',
    items: [
      {
        id: 'fault',
        name: 'Faults and power loss',
        summary: 'Breakers tripping, half the house dead, or something smells hot.',
        detail:
          'A breaker that trips repeatedly is doing its job and telling you something. We find the actual fault rather than resetting it, and we tell you what it would have cost to leave it.',
        includes: [
          'The fault located, not just reset',
          'Made safe before we leave',
          'What we found, explained plainly',
          'Priced before the repair starts',
        ],
        icon: 'alert',
        image: demoImage(
          files,
          'service-1',
          'service',
          'Electrician in safety glasses and gloves working on the wiring of a surface-mounted box on a concrete wall.',
        ),
        urgent: true,
      },
      {
        id: 'panel',
        name: 'Panel upgrades and replacement',
        summary: 'For older panels, or a house that keeps running out of capacity.',
        detail:
          'Older panels around here are often at capacity, and some models are known to be problematic. We assess what is actually installed, tell you whether it needs replacing or just needs space, and handle the permit and the inspection.',
        includes: [
          'What is installed, assessed honestly',
          'Told when it does not need replacing',
          'Permit and inspection handled',
          'Circuits labelled properly afterwards',
        ],
        icon: 'bolt',
        image: demoImage(
          files,
          'service-3',
          'service',
          'Open breaker cabinet with a row of modular circuit breakers and neatly bundled blue wiring below.',
        ),
        urgent: false,
      },
      {
        id: 'ev',
        name: 'EV charger installation',
        summary: 'Including the part most quotes skip: whether your panel can take it.',
        detail:
          'The charger is the easy half. Whether the service and panel can carry it, and what it costs if they cannot, is the half that changes the price — so we work that out first and tell you before you buy anything.',
        includes: [
          'Load calculation before you buy a charger',
          'Told upfront if the panel needs work',
          'Permitted and inspected',
          'Cable route agreed with you first',
        ],
        icon: 'rocket',
        image: demoImage(
          files,
          'service-4',
          'service',
          'New residential load centre on a workbench with breakers installed and armoured cables fed in — the half of an EV install that sets the price.',
        ),
        urgent: false,
      },
      {
        id: 'rewire',
        name: 'Rewiring and circuit work',
        summary: 'New circuits, old wiring replaced, or a room being redone.',
        detail:
          'Whole-house or one room at a time. We tell you what has to be opened up and what can be avoided, and we make good afterwards rather than leaving it to somebody else.',
        includes: [
          'Room-by-room or whole house',
          'What gets opened up, agreed first',
          'Making good included in the price',
          // "Tested and certified" was here. A fictional company certifies nothing.
          'Every circuit tested before we leave',
        ],
        icon: 'wrench',
        image: demoImage(
          files,
          'service-2',
          'service',
          'Ceiling junction plate with colour-coded cables joined by lever connectors during rough-in wiring.',
        ),
        urgent: false,
      },
      {
        id: 'lighting',
        name: 'Lighting and outlets',
        summary: 'The small jobs, batched into one visit so you pay one callout.',
        detail:
          'Outlets, switches, fixtures, outdoor lighting, extractor fans. Write a list and we will do all of it in one visit — a callout per socket is how these jobs get expensive.',
        includes: [
          'Batched into a single visit',
          'One callout, not one per item',
          'Outdoor and bathroom work included',
          'Fixtures fitted, supplied by you or us',
        ],
        icon: 'check',
        image: demoImage(
          files,
          'service-6',
          'service',
          'Worker on a stepladder reaching up to ceiling wiring in a room under renovation, bare pendant bulbs glowing.',
        ),
        urgent: false,
      },
      {
        id: 'commercial',
        name: 'Commercial and landlord work',
        summary: 'Shops, small offices, rentals and multi-unit buildings.',
        detail:
          'Scheduled outside trading hours where that matters, documented for your records, and coordinated with whoever manages the building. Reactive callouts and planned upgrades both.',
        includes: [
          'Work scheduled around trading hours',
          'Documented for your records',
          'Coordinated with building management',
          'Planned and reactive both covered',
        ],
        icon: 'layout',
        image: demoImage(
          files,
          'service-5',
          'service',
          'Gloved hands using an insulated screwdriver on terminal blocks inside a wired panel.',
        ),
        urgent: false,
      },
    ],
  },

  contact: {
    heading: 'Get in touch',
    lede: 'Call for anything hot, smelling or sparking. Everything else, the form is fine.',
    callHeading: 'Urgent? Call',
    callLede:
      'Burning smells, hot outlets, repeated trips, exposed conductors. Turn the circuit off at the panel if you can, then call.',
    formHeading: 'Request a callback',
    formLede: 'Five questions, so the right person calls you back with the right answer.',
    submitLabel: 'Request a callback',
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        id: 'property',
        label: 'Type of property',
        type: 'select',
        required: true,
        options: ['My home', 'A rental I own', 'A commercial premises', 'A building I manage'],
      },
      {
        id: 'service',
        label: 'What do you need?',
        type: 'select',
        required: true,
        options: [
          'A fault or power loss',
          'Panel upgrade',
          'EV charger',
          'Rewiring or new circuits',
          'Lighting and outlets',
          'Something else',
        ],
      },
      {
        id: 'detail',
        label: 'What is happening?',
        type: 'textarea',
        required: false,
        hint: 'What you can see or smell, and whether anything has been turned off.',
      },
    ],
  },
};
