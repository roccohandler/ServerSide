/**
 * Every URL in the application, in one place.
 *
 * Components and content reference these constants rather than string literals, so a
 * path can be renamed without hunting through JSX for a stale link.
 */
export const routes = {
  home: '/',
  about: '/about',
  services: '/services',
  portfolio: '/portfolio',
  contact: '/contact',
  privacy: '/privacy',
  terms: '/terms',
} as const;

export type RoutePath = (typeof routes)[keyof typeof routes];

/** Fragment identifiers used for in-page links from the navigation and calls to action. */
export const sections = {
  services: 'services',
  portfolio: 'examples',
  process: 'process',
  faq: 'faq',
  contact: 'contact',
} as const;
