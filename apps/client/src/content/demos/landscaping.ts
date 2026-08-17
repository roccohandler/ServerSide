import { demoImage, demoPoster, demoVideoSrc } from './media';
import type { DemoSite } from './types';

/*
 * ============================================================================
 * ALDER & FERN LANDSCAPING — A FICTIONAL BUSINESS
 * ============================================================================
 *
 * There is no such company. See `hvac.ts` for the rules.
 *
 * ## The demo with no emergencies
 *
 * `trades.ts`: **a decision made largely with the eyes, and often about recurring work
 * rather than a single job.** Every `urgent` flag below is `false`, which is not an
 * oversight — it is the whole point. The homepage template renders its "need someone
 * today?" strip only when a trade has urgent work, so this demo simply does not have one,
 * and the page is a different shape as a consequence.
 *
 * That is the thing five demos demonstrate that one template could not: the same code
 * produces an emergency-first HVAC site and a considered, visual landscaping site, because
 * the content says which trade this is.
 *
 * ## The recurring-revenue difference
 *
 * This is also the only trade here where the main sale is a *contract* rather than a job,
 * so the services page leads with maintenance rather than with the largest project — the
 * opposite of the roofing demo, and correct for both.
 * ============================================================================
 */

/*
 * Licensed stock photography and one ambient clip — provenance in `docs/MEDIA-CREDITS.md`.
 * This is the demo the portfolio card describes as image-led, so it carries the largest
 * gallery in the set and the immersive photo hero.
 */
const files = import.meta.glob<string>('../../assets/demos/landscaping/*', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const demo: DemoSite = {
  slug: 'landscaping',
  isFictional: true,

  business: {
    name: 'Alder & Fern Landscaping',
    trade: 'Garden design and care',
    mark: 'AF',
    phone: '(425) 555-0163',
    email: 'hello@alderandfern.example',
    serviceAreas: ['Kirkland', 'Redmond', 'Bothell', 'Woodinville', 'Juanita', 'Totem Lake'],
    hours: [
      { days: 'Monday to Friday', time: '8am – 5pm' },
      { days: 'Saturday', time: '9am – 1pm, March to October' },
      { days: 'Sunday', time: 'Closed' },
    ],
  },

  palette: {
    '--demo-brand': '#2c4a34',
    '--demo-brand-strong': '#1e3524',
    '--demo-accent': '#a8763a',
    '--demo-ink': '#1f2620',
    '--demo-ink-muted': '#57635a',
    '--demo-surface': '#ffffff',
    '--demo-surface-alt': '#f1f4ee',
    '--demo-on-brand': '#ffffff',
  },

  media: {
    hero: demoImage(
      files,
      'hero',
      'heroImmersive',
      'Gravel path between low clipped hedges lined with pink camellias, blurring toward a shaded seating area.',
    ),
    gallery: [
      demoImage(
        files,
        'gallery-1',
        'gallery',
        'Sunken formal garden with curved beds of red and yellow flowers, sculpted shrubs and mown lawn paths.',
      ),
      demoImage(
        files,
        'gallery-2',
        'gallery',
        'Shaded woodland garden with a brick paver path, ferns, large-leafed perennials and a wooden bench.',
      ),
      demoImage(
        files,
        'gallery-3',
        'gallery',
        'White outdoor dining set on a lawn framed by peonies, catmint and hostas, stone steps behind.',
      ),
      demoImage(
        files,
        'gallery-4',
        'gallery',
        'Timber raised bed planted with lettuces, chives and herbs in a leafy backyard.',
      ),
    ],
    closing: demoImage(
      files,
      'closing',
      'closing',
      'White farmhouse behind cottage borders of alliums and hydrangeas, a stone urn on a circular paver court.',
    ),
    ambient: {
      src: demoVideoSrc(files),
      poster: demoPoster(files),
      width: 960,
      height: 540,
      heading: 'The work between the photographs',
      body: 'A garden looks like the pictures above for about a week unless somebody does this part. Regular visits are the difference between a garden and a photo of one.',
    },
  },

  home: {
    eyebrow: 'Gardens on the Eastside',
    heading: 'A garden that looks after itself, because somebody is looking after it.',
    subheading:
      'Design, planting and year-round care in Kirkland, Redmond and Bothell. We plant for this climate, and we come back — a garden is a relationship, not a delivery.',
    heroLayout: 'immersive',
    primaryAction: 'Call',
    secondaryAction: 'Ask about your garden',
    points: [
      'Planted for the Pacific Northwest, not a catalogue',
      'Regular visits, same team each time',
      'Quotes from a visit, never from a photograph',
    ],
    servicesHeading: 'What we do',
    servicesLede:
      'Most people start with the regular care and add a project later. Both are below, in that order.',
    galleryHeading: 'Gardens like the ones we keep',
    galleryLede:
      'This is a decision made with the eyes, so look first: borders in flower, shade planting that thrives here, and lawns with their edges held.',
    areaHeading: 'Where we work',
    areaLede:
      'The Eastside, close enough that a maintenance round makes sense. Being local is not a slogan here — it is what makes fortnightly visits possible.',
    closingHeading: 'Tell us about your garden',
    closingBody:
      'Describe what you have and what is bothering you about it. We will tell you what we would do first, and what it costs — and if the answer is "nothing this year", we will say that.',
  },

  services: {
    heading: 'Garden services',
    lede: 'Regular care first, because that is what most gardens actually need. Projects below it.',
    note: 'Tree surgery above about fifteen feet, hardscaping and irrigation systems are subcontracted or referred. We will tell you which before we quote.',
    items: [
      {
        id: 'maintenance',
        name: 'Regular garden care',
        summary: 'Fortnightly or monthly visits, the same team each time.',
        detail:
          'Mowing, edging, beds, pruning in season, and the small corrections that stop a garden slipping. The same crew each visit, so somebody notices when a plant is struggling rather than mowing past it for a year.',
        includes: [
          'Fortnightly or monthly, your choice',
          'Same team every visit',
          'Seasonal pruning included in the round',
          'Green waste taken away',
        ],
        icon: 'check',
        image: demoImage(
          files,
          'service-2',
          'service',
          'Worker wearing ear protection edging a small front lawn with a string trimmer beside a brick path.',
        ),
        urgent: false,
      },
      {
        id: 'design',
        name: 'Garden design',
        summary: 'For a garden that has never worked, or a new house with bare ground.',
        detail:
          'We measure, look at the light and the drainage, and draw something you can actually see before anybody digs. Planting plans use species that thrive here — a garden that needs constant intervention was designed wrong.',
        includes: [
          'Measured survey, light and drainage',
          'A drawing before anything is dug',
          'Planting chosen for this climate',
          'Phased over seasons if you prefer',
        ],
        icon: 'layout',
        image: demoImage(
          files,
          'service-5',
          'service',
          'Mixed border of ornamental grasses and pink coneflowers planted beneath two windows of a pale wall.',
        ),
        urgent: false,
      },
      {
        id: 'planting',
        name: 'Planting and borders',
        summary: 'New beds, replanting, or filling in what did not survive.',
        detail:
          'Soil first — most planting failures around here are drainage rather than the plant. We improve what is there, plant properly, and tell you what each thing needs for its first two summers.',
        includes: [
          'Soil assessed and improved first',
          'Plants suited to the aspect',
          'Written care notes for the first two years',
          'We come back and check',
        ],
        icon: 'rocket',
        image: demoImage(
          files,
          'service-3',
          'service',
          'Two hands firming soil around a young seedling in a garden bed.',
        ),
        urgent: false,
      },
      {
        id: 'lawns',
        name: 'Lawns',
        summary: 'Renovation, reseeding, or replacing a lawn that will never work.',
        detail:
          'Moss, compaction and shade are the three reasons lawns fail here, and each has a different answer. Sometimes the honest answer is that the spot will not grow grass and should be planted instead.',
        includes: [
          'Aeration, scarifying and overseeding',
          'Moss and compaction treated properly',
          'Turf laid where reseeding will not work',
          'Told when a lawn is the wrong answer',
        ],
        icon: 'target',
        image: demoImage(
          files,
          'service-1',
          'service',
          'Green push mower seen from above, cutting a lush lawn.',
        ),
        urgent: false,
      },
      {
        id: 'cleanup',
        name: 'Seasonal clean-up',
        summary: 'Spring and autumn, the two visits that carry the year.',
        detail:
          'Autumn is leaves, cutting back and protecting what needs it. Spring is the reset: beds turned, mulched, edges cut back in. Either can be a one-off if you handle the rest yourself.',
        includes: [
          'Available as a one-off',
          'Beds cleared, cut back and mulched',
          'Edges reinstated',
          'Everything taken away',
        ],
        icon: 'wrench',
        image: demoImage(
          files,
          'service-4',
          'service',
          'Person leaning over timber raised planters to tend the plants against a grey slatted wall.',
        ),
        urgent: false,
      },
      {
        id: 'irrigation',
        name: 'Watering and drainage advice',
        summary: 'Two problems people usually discover in opposite seasons.',
        detail:
          'A garden that drowns in February and burns in August has a drainage problem in both cases. We look at where water goes before recommending anything that costs money.',
        includes: [
          'Where water actually goes, mapped',
          'Drainage corrections before equipment',
          'Watering advice by bed, not blanket',
          'Referral for full irrigation systems',
        ],
        icon: 'shield',
        urgent: false,
      },
    ],
  },

  contact: {
    heading: 'Ask about your garden',
    lede: 'Tell us what you have and what is bothering you. We answer questions before we quote.',
    callHeading: 'Call us',
    callLede:
      'Easiest for quick questions about whether something is worth doing, or when to do it.',
    formHeading: 'Ask a question or request a visit',
    formLede:
      'Four questions. We quote from a visit rather than a photograph, so this arranges one.',
    submitLabel: 'Send',
    fields: [
      { id: 'name', label: 'Your name', type: 'text', required: true },
      { id: 'phone', label: 'Phone', type: 'tel', required: true },
      {
        id: 'service',
        label: 'What are you thinking about?',
        type: 'select',
        required: true,
        options: [
          'Regular garden care',
          'Garden design',
          'Planting or borders',
          'The lawn',
          'A seasonal clean-up',
          'Not sure yet',
        ],
      },
      {
        id: 'detail',
        label: 'Tell us about the garden',
        type: 'textarea',
        required: false,
        hint: 'Roughly how big, how much sun it gets, and what is bothering you about it.',
      },
    ],
  },
};
