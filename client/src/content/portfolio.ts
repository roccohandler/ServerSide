import { demoPath } from '../config/demos';
import type { PortfolioProject } from '../types/content';
import electricalShot from '../assets/portfolio/electrical.webp';
import electricalMobileShot from '../assets/portfolio/electrical-mobile.webp';
import hvacShot from '../assets/portfolio/hvac.webp';
import hvacMobileShot from '../assets/portfolio/hvac-mobile.webp';
import landscapingShot from '../assets/portfolio/landscaping.webp';
import landscapingMobileShot from '../assets/portfolio/landscaping-mobile.webp';
import plumbingShot from '../assets/portfolio/plumbing.webp';
import plumbingMobileShot from '../assets/portfolio/plumbing-mobile.webp';
import roofingShot from '../assets/portfolio/roofing.webp';
import roofingMobileShot from '../assets/portfolio/roofing-mobile.webp';

/*
 * ============================================================================
 * DEMONSTRATION SITES — NOT CLIENT WORK
 * ============================================================================
 *
 * Every entry below has `isDemo: true`, and the UI renders a visible "Demonstration"
 * label from that flag. These are examples built to show an approach; none of them
 * represents a paying customer, and none of them may be described as one.
 *
 * When real client work exists, add it with `isDemo: false` and the label disappears
 * for that entry. Do not reuse a demo entry for a client project — write a new one.
 *
 * ## `demoUrl` is filled now, and what that changed
 *
 * It was deliberately absent for months, and `PortfolioGrid` rendered "Live demo not
 * published yet" five times as a result — the honest behaviour while nothing was live, and
 * a dead end on the page whose entire job is to show work.
 *
 * The five demos exist now, at `/demo/<trade>`, and these point at them. They are running
 * inside this application rather than at five deployments: same repository, same test
 * suite, lazy chunks, and one place where the disclosure is enforced. See
 * `docs/DEMO-SITES-PLAN.md`.
 *
 * The URL comes from `demoPath()` rather than a literal, so a project cannot end up
 * pointing at a route that does not exist — and `content.test.ts` asserts every `demoUrl`
 * here resolves to a real one.
 *
 * ## The card images are screenshots of the demos themselves
 *
 * Not illustrations of them: `scripts/capture-previews.ts` loads each demo homepage from
 * this repository's own build and photographs it, disclosure bar included. A card that
 * shows the real page can never drift from what clicking it reveals — the hand-drawn SVG
 * mock-ups these replaced could, and the disclosure travelling inside every screenshot
 * is a feature, not an accident. After changing a demo: build, `npm run capture`, and
 * commit the diff.
 *
 * `mobileImage` is the same homepage captured at phone width, from the same script. It
 * exists because the trades' customers decide on phones, and the things these cards
 * claim about that — tap-to-call in the header, the call bar that stays on screen —
 * are invisible in a desktop screenshot. Each mobile alt describes what that capture
 * actually proves.
 * ============================================================================
 */

export const portfolioProjects: readonly PortfolioProject[] = [
  {
    id: 'hvac',
    industry: 'HVAC',
    title: 'Heating and cooling company',
    description:
      'Built around emergency calls: the phone number stays on screen, and the service area is answered before anything else.',
    image: hvacShot,
    imageAlt:
      'Screenshot of the heating and cooling demonstration homepage: a call button beside the headline, with the demonstration disclosure bar across the top.',
    mobileImage: hvacMobileShot,
    mobileImageAlt:
      'The heating and cooling demonstration homepage at phone width: the phone number as a call button in the header and a call bar fixed at the bottom of the screen.',
    highlights: [
      'Tap-to-call in the header',
      'Service area stated on the first screen',
      'Short quote form',
    ],
    demoUrl: demoPath('hvac'),
    isDemo: true,
  },
  {
    id: 'plumbing',
    industry: 'Plumbing',
    title: 'Residential plumbing company',
    description:
      'Separates the urgent job from the planned one, so a burst pipe and a bathroom remodel do not compete for the same button.',
    image: plumbingShot,
    imageAlt:
      'Screenshot of the plumbing demonstration homepage: an emergency call button and a separate quote link, under the demonstration disclosure bar.',
    mobileImage: plumbingMobileShot,
    mobileImageAlt:
      'The plumbing demonstration homepage at phone width: a headline separating urgent from planned work, with an emergency call bar fixed at the bottom of the screen.',
    highlights: [
      'Emergency and scheduled paths',
      'Plain pricing explanation',
      'Photos of finished work',
    ],
    demoUrl: demoPath('plumbing'),
    isDemo: true,
  },
  {
    id: 'landscaping',
    industry: 'Landscaping',
    title: 'Landscaping and yard care',
    description:
      'Leads with photographs, because this is a decision people make with their eyes before they read anything.',
    image: landscapingShot,
    imageAlt:
      'Screenshot of the landscaping demonstration homepage: a full-width garden photograph behind the headline, with the demonstration disclosure bar across the top.',
    mobileImage: landscapingMobileShot,
    mobileImageAlt:
      'The landscaping demonstration homepage at phone width: the garden photograph behind the headline, with call and quote actions fixed at the bottom.',
    highlights: [
      'Image-led layout',
      'Seasonal service list',
      'Quote request with property details',
    ],
    demoUrl: demoPath('landscaping'),
    isDemo: true,
  },
  {
    id: 'roofing',
    industry: 'Roofing',
    title: 'Roofing contractor',
    /*
     * This used to say "licensing ... comes before the sales copy", which is what a real
     * roofing site should do — and exactly what a fictional one may not fake. The demo
     * leads with process and the inspection report instead, so the card says that.
     */
    description:
      'Built for a large, infrequent purchase: process, photographs and inspection requests come before the sales copy.',
    image: roofingShot,
    imageAlt:
      'Screenshot of the roofing demonstration homepage: a shingle roof photograph behind the headline and an inspection button, under the demonstration disclosure bar.',
    mobileImage: roofingMobileShot,
    mobileImageAlt:
      'The roofing demonstration homepage at phone width: the roof photograph behind a headline about process, with call and inspection actions fixed at the bottom.',
    /*
     * "Step-by-step process" used to be here, and the page does not render one — the
     * demo leads with process in its headline and subheading, which is what this now
     * says. "Free inspection request" was here too, and the demo never says "free":
     * what it actually promises is that having them look commits you to nothing. A
     * bullet the demo cannot back up is the card teaching a visitor to discount the
     * other two.
     */
    highlights: [
      'Inspection report you keep either way',
      'Process explained before the pitch',
      'Inspection request, no commitment attached',
    ],
    demoUrl: demoPath('roofing'),
    isDemo: true,
  },
  {
    id: 'electrical',
    industry: 'Electrical',
    title: 'Electrical contractor',
    /*
     * This used to claim the split happened "in the first click", which the demo does
     * not render — it separates the two audiences in its headline and page structure,
     * not behind a chooser. The card now claims what the screenshot shows.
     */
    description:
      'Speaks to homes and commercial premises separately, so neither audience has to read the other one first.',
    image: electricalShot,
    imageAlt:
      'Screenshot of the electrical demonstration homepage: an electrician photograph beside the headline and call button, under the demonstration disclosure bar.',
    mobileImage: electricalMobileShot,
    mobileImageAlt:
      'The electrical demonstration homepage at phone width: a headline addressing homes and commercial premises, with call and callback actions fixed at the bottom.',
    highlights: ['Two clear audiences', 'Panel and EV charger services', 'Callback request form'],
    demoUrl: demoPath('electrical'),
    isDemo: true,
  },
];
