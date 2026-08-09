import type { Service } from '../types/content';

/*
 * The service list. Add, remove or reword entries freely — the services page and the
 * homepage section both render whatever is in this array.
 *
 * Descriptions state what is done, not what it will achieve. No outcome is promised
 * here that cannot be pointed at in the finished work.
 */
export const services: readonly Service[] = [
  {
    id: 'website-design',
    name: 'Website design',
    summary:
      'A clear, professional layout built around the questions a customer asks before they call.',
    details: [
      'A structure that puts services, service area and contact details where people look for them',
      'Type and colour chosen for legibility, not decoration',
      'Designed on a phone screen first, then widened for desktop',
    ],
    icon: 'layout',
  },
  {
    id: 'website-development',
    name: 'Website development',
    summary: 'The site itself, built to load quickly and keep working without babysitting.',
    details: [
      'Hand-built pages rather than a heavy page-builder template',
      'Sensible page titles, descriptions and headings so search engines can read it',
      'Tested on real phone screen sizes, not just a desktop browser window',
    ],
    icon: 'code',
  },
  {
    id: 'mobile-first',
    name: 'Mobile-first optimisation',
    summary:
      'Making an existing site usable for someone standing in a driveway on one bar of signal.',
    details: [
      'Tap targets big enough to hit without zooming',
      'Text large enough to read in daylight',
      'Images sized so pages do not stall on a slow connection',
    ],
    icon: 'phone',
  },
  {
    id: 'conversion-design',
    name: 'Conversion-focused layout',
    summary: 'Arranging a page so the next step is obvious on every screen.',
    details: [
      'One primary action per page, repeated where it makes sense',
      'Phone number visible without scrolling',
      'Proof of the work close to the point of decision',
    ],
    icon: 'target',
  },
  {
    id: 'contact-forms',
    name: 'Contact and quote forms',
    summary: 'Forms that ask only what you need to quote, and that reliably reach your inbox.',
    details: [
      'Short forms with clear labels and readable error messages',
      'Submissions emailed to you and stored so nothing is lost if an email bounces',
      'Basic spam protection so the inbox stays useful',
    ],
    icon: 'inbox',
  },
  {
    id: 'launch',
    name: 'Launch and setup',
    summary: 'Getting the site live on your own domain and hosting, in your name.',
    details: [
      'Domain and hosting set up under accounts you own',
      'Certificates, redirects and analytics wired up before launch',
      'A walkthrough of how everything works once it is live',
    ],
    icon: 'rocket',
  },
  {
    id: 'maintenance',
    name: 'Ongoing maintenance',
    summary: 'Optional. Keeping the site current once it is running.',
    details: [
      'Content and photo updates as your business changes',
      'Software and security updates',
      'Checks that forms are still arriving',
    ],
    icon: 'wrench',
  },
];
