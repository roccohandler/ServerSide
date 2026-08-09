import type { PortfolioProject } from '../types/content';

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
 * `demoUrl` is intentionally absent until a demo is actually published, so the site
 * never links somewhere that is not live.
 * ============================================================================
 */

export const portfolioProjects: readonly PortfolioProject[] = [
  {
    id: 'hvac',
    industry: 'HVAC',
    title: 'Heating and cooling company',
    description:
      'Built around emergency calls: the phone number stays on screen, and the service area is answered before anything else.',
    image: '/portfolio/hvac.svg',
    imageAlt:
      'Mock-up of a heating and cooling website on a phone, showing a call button above a list of services.',
    highlights: [
      'Tap-to-call in the header',
      'Service area stated on the first screen',
      'Short quote form',
    ],
    isDemo: true,
  },
  {
    id: 'plumbing',
    industry: 'Plumbing',
    title: 'Residential plumbing company',
    description:
      'Separates the urgent job from the planned one, so a burst pipe and a bathroom remodel do not compete for the same button.',
    image: '/portfolio/plumbing.svg',
    imageAlt:
      'Mock-up of a plumbing website on a phone, with an emergency call button and a separate quote request.',
    highlights: [
      'Emergency and scheduled paths',
      'Plain pricing explanation',
      'Photos of finished work',
    ],
    isDemo: true,
  },
  {
    id: 'landscaping',
    industry: 'Landscaping',
    title: 'Landscaping and yard care',
    description:
      'Leads with photographs, because this is a decision people make with their eyes before they read anything.',
    image: '/portfolio/landscaping.svg',
    imageAlt:
      'Mock-up of a landscaping website on a phone, showing a grid of project photographs above a contact form.',
    highlights: [
      'Image-led layout',
      'Seasonal service list',
      'Quote request with property details',
    ],
    isDemo: true,
  },
  {
    id: 'roofing',
    industry: 'Roofing',
    title: 'Roofing contractor',
    description:
      'Built for a large, infrequent purchase: licensing, process and inspection requests come before the sales copy.',
    image: '/portfolio/roofing.svg',
    imageAlt:
      'Mock-up of a roofing website on a phone, showing licence details and an inspection request form.',
    highlights: [
      'Licence and insurance details up front',
      'Step-by-step process',
      'Free inspection request',
    ],
    isDemo: true,
  },
  {
    id: 'electrical',
    industry: 'Electrical',
    title: 'Electrical contractor',
    description:
      'Splits residential from commercial in the first click, so neither audience has to read the other one first.',
    image: '/portfolio/electrical.svg',
    imageAlt:
      'Mock-up of an electrical contractor website on a phone, with separate residential and commercial sections.',
    highlights: ['Two clear audiences', 'Panel and EV charger services', 'Callback request form'],
    isDemo: true,
  },
];
