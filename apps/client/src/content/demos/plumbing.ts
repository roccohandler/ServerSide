import { demoImage, demoPoster, demoVideoSrc } from './media';
import type { DemoSite } from './types';

/*
 * ============================================================================
 * EMERALD LINE PLUMBING — A FICTIONAL BUSINESS
 * ============================================================================
 *
 * There is no such company. See `hvac.ts` for the rules every demo follows; the short
 * version is that the business is invented and the evidence never is.
 *
 * ## What makes this one different from the HVAC demo
 *
 * `trades.ts`: **something is leaking, blocked or not producing hot water, and the
 * customer is looking for whoever can come out soonest.** That is the same urgency as
 * HVAC, with one extra problem — a plumber's work splits cleanly into "this is running
 * down my wall right now" and "we are redoing the bathroom in spring", and those two
 * customers want completely different pages.
 *
 * So this demo separates them before anything else, which is the note
 * `content/portfolio.ts` has always made about the plumbing example: *a burst pipe and a
 * bathroom remodel do not compete for the same button.*
 * ============================================================================
 */

/* Licensed stock photography and one ambient clip — provenance in `docs/MEDIA-CREDITS.md`. */
const files = import.meta.glob<string>('../../assets/demos/plumbing/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const demo: DemoSite = {
  slug: 'plumbing',
  isFictional: true,

  business: {
    name: 'Emerald Line Plumbing',
    trade: 'Residential plumbing',
    mark: 'EL',
    phone: '(206) 555-0178',
    email: 'office@emeraldlineplumbing.example',
    serviceAreas: ['West Seattle', 'Delridge', 'White Center', 'Burien', 'Georgetown', 'SoDo'],
    hours: [
      { days: 'Monday to Friday', time: '7am – 6pm' },
      { days: 'Saturday', time: '8am – 2pm' },
      { days: 'Out of hours', time: 'Emergency line, seven days' },
    ],
  },

  palette: {
    '--demo-brand': '#123a53',
    '--demo-brand-strong': '#0b2739',
    '--demo-accent': '#b26a3c',
    '--demo-ink': '#161f26',
    '--demo-ink-muted': '#516069',
    '--demo-surface': '#ffffff',
    '--demo-surface-alt': '#eef3f6',
    '--demo-on-brand': '#ffffff',
  },

  media: {
    hero: demoImage(
      files,
      'hero',
      'heroSplit',
      'Water streaming from a dark kitchen faucet into a sink, fine droplets caught against a softly blurred background.',
    ),
    gallery: [
      demoImage(
        files,
        'gallery-1',
        'gallery',
        'Round white vessel sink with a wall-mounted chrome faucet on a walnut countertop, rolled towels beside it.',
      ),
      demoImage(
        files,
        'gallery-2',
        'gallery',
        'Matte black bathroom faucet on a marble countertop beneath a round mirror.',
      ),
      demoImage(
        files,
        'gallery-3',
        'gallery',
        'Brass fittings, valves and hand tools laid out on a wooden workbench.',
      ),
      demoImage(
        files,
        'gallery-4',
        'gallery',
        'Plumber in a red shirt working on white drain pipes inside a cabinet beneath a sink.',
      ),
    ],
    closing: demoImage(
      files,
      'closing',
      'closing',
      'Tidy bathroom vanity with a brass faucet, round mirror, amber soap bottle and a potted snake plant.',
    ),
    ambient: {
      src: demoVideoSrc(files),
      poster: demoPoster(files),
      width: 1280,
      height: 720,
      heading: 'The drip is the early warning',
      body: 'A faucet that drips is telling you a washer or a cartridge is on its way out. Caught at this stage it is a small visit — left alone it becomes the stain on the ceiling below.',
    },
  },

  home: {
    eyebrow: 'West Seattle plumbing',
    heading: 'Leaking now, or planned for spring — both are what we do.',
    subheading:
      'Emergency repairs, water heaters and bathroom work across West Seattle and Burien. If it is running down a wall, call. If it is a project, we will come and price it properly.',
    heroLayout: 'split',
    primaryAction: 'Leaking now? Call',
    secondaryAction: 'Book a quote visit',
    points: [
      'Emergency line answered seven days',
      'Fixed price agreed before we start',
      'We clear up after ourselves',
    ],
    servicesHeading: 'What we do',
    servicesLede:
      'Split into what cannot wait and what can be planned, because they are two different jobs and two different conversations.',
    galleryHeading: 'Finished properly, left tidy',
    galleryLede:
      'Plumbing you notice for the right reasons: fittings that sit straight, pipework that runs clean, and a bathroom that looks finished because it is.',
    areaHeading: 'Where we work',
    areaLede:
      'West Seattle, Burien and the neighbourhoods between them. Outside that we will usually say no rather than turn up late.',
    closingHeading: 'Not sure how urgent it is?',
    closingBody:
      'Describe what you can see and we will tell you whether it needs somebody today or whether it can wait until Tuesday. That answer is free either way.',
  },

  services: {
    heading: 'Plumbing services',
    lede: 'Same-day work first, planned work below it. Named the way you would describe it on the phone.',
    note: 'Gas work, septic and commercial jobs are outside what we take on. Ask and we will point you at somebody who does them.',
    items: [
      {
        id: 'leak',
        name: 'Leaks and burst pipes',
        summary: 'Water where water should not be. This is the call to make immediately.',
        detail:
          'Find the stop tap first, then call. We locate the leak, stop it, and tell you what the repair involves before starting — including when the honest answer is that a section of pipe needs replacing rather than patching.',
        includes: [
          'Talked through shutting off the water',
          'Leak located rather than guessed at',
          'Repair priced before it starts',
          'Advice on what your insurer will want',
        ],
        icon: 'alert',
        urgent: true,
      },
      {
        id: 'blockage',
        name: 'Blocked drains and toilets',
        summary: 'Slow, gurgling, backing up, or stopped completely.',
        detail:
          'Cleared mechanically first, camera-inspected if it comes back. A drain that blocks twice in a year has a reason, and clearing it a third time without looking is charging you for the same job repeatedly.',
        includes: [
          'Cleared on the first visit where possible',
          'Camera inspection if it recurs',
          'The actual cause, explained',
          /*
           * This read "No charge for a return within thirty days" — a promise, and a
           * fictional business cannot keep one. The rule for these demos is that they may
           * invent a business and never invent anything a reader would rely on, and a
           * return policy is squarely the second. It describes the work instead.
           */
          'Told plainly whether it will happen again',
        ],
        icon: 'wrench',
        image: demoImage(
          files,
          'service-2',
          'service',
          'Plumber reaching into a sink cabinet to tighten the white drain assembly.',
        ),
        urgent: true,
      },
      {
        id: 'hot-water',
        name: 'No hot water',
        summary: 'Tank or tankless, repaired the same day where the part allows.',
        detail:
          'Most no-hot-water calls are a thermostat, an element or an ignition fault, and those are same-day. If the tank itself has gone we will say so, and we will not sell you a bigger one than the house needs.',
        includes: [
          'Same-day repair on common faults',
          'Tank and tankless both covered',
          'Replacement sized for the house',
          'Old unit removed',
        ],
        icon: 'bolt',
        image: demoImage(
          files,
          'service-1',
          'service',
          'Hand using slip-joint pliers to adjust a pipe fitting above a residential water heater tank.',
        ),
        urgent: true,
      },
      {
        id: 'bathroom',
        name: 'Bathroom and kitchen fitting',
        summary: 'Planned work, quoted from a visit rather than from a phone call.',
        detail:
          'We come and look, because a bathroom quoted over the phone is a bathroom that changes price halfway through. You get a fixed price, a start date and a finish date, and we tell you which days the water is off.',
        includes: [
          'Quoted from a visit, in writing',
          'Fixed price and fixed dates',
          'You are told when the water is off',
          'Tiling and making good coordinated',
        ],
        icon: 'layout',
        image: demoImage(
          files,
          'service-3',
          'service',
          'Hand adjusting a chrome kitchen faucet as water splashes into a stainless steel sink.',
        ),
        urgent: false,
      },
      {
        id: 'repipe',
        name: 'Repiping',
        summary: 'For older houses on galvanised pipe with pressure and colour problems.',
        detail:
          'Common in houses of a certain age around here. We survey what is actually there, price the work room by room, and phase it if doing it all at once is not practical.',
        includes: [
          'Survey of what is actually installed',
          'Priced room by room',
          'Phased over visits if you prefer',
          'Walls made good afterwards',
        ],
        icon: 'target',
        image: demoImage(
          files,
          'service-4',
          'service',
          'Grey water-supply pipes with shut-off valves and a meter assembly mounted across a brick wall.',
        ),
        urgent: false,
      },
      {
        id: 'maintenance',
        name: 'Annual check',
        summary: 'The visit that finds the leak before the ceiling does.',
        detail:
          'Shut-offs tested, pressure checked, visible pipework and connections inspected, water heater serviced. A written note of anything worth watching, so nothing is a surprise.',
        includes: [
          'Every shut-off tested',
          'Water pressure measured',
          'Water heater serviced',
          'Written report of what to watch',
        ],
        icon: 'shield',
        image: demoImage(
          files,
          'service-5',
          'service',
          'Utility-room wall of insulated pipes, red valves and pressure gauges connected to a boiler.',
        ),
        urgent: false,
      },
    ],
  },

  contact: {
    heading: 'Get in touch',
    lede: 'Call for anything leaking or blocked. The form is for quotes and planned work.',
    callHeading: 'Emergency? Call',
    callLede:
      'If water is coming out where it should not be, do not use the form. Call, and shut the water off while you wait.',
    formHeading: 'Book a quote visit',
    formLede: 'Four questions, so we arrive with the right van and the right parts.',
    submitLabel: 'Request a visit',
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        id: 'service',
        label: 'What do you need?',
        type: 'select',
        required: true,
        options: [
          'Leak or burst pipe',
          'Blocked drain or toilet',
          'No hot water',
          'Bathroom or kitchen work',
          'Repiping',
          'Something else',
        ],
      },
      {
        id: 'detail',
        label: 'What is happening?',
        type: 'textarea',
        required: false,
        hint: 'Where it is, how long it has been going on, and whether the water is off.',
      },
    ],
  },
};
