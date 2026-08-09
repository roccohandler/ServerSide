/**
 * Shapes for everything in `src/content`.
 *
 * These exist so that editing marketing copy is guided by the compiler: a missing FAQ
 * answer or a portfolio item without an industry is a type error, not a blank space
 * discovered on the live site.
 */

export interface CallToAction {
  readonly label: string;
  /** Internal route path, e.g. `/contact`. */
  readonly to: string;
}

export interface NavItem {
  readonly label: string;
  readonly to: string;
}

export interface SocialLink {
  readonly label: string;
  readonly href: string;
}

export interface ServiceArea {
  /** Used mid-sentence, e.g. "serving the Greater Seattle area". */
  readonly label: string;
  /** Used in headings and metadata, e.g. "Greater Seattle". */
  readonly short: string;
  readonly region: string;
  readonly cities: readonly string[];
  readonly note: string;
}

export interface SiteContact {
  readonly phone: string;
  readonly email: string;
  /** Shown next to the phone number, e.g. when calls are answered. */
  readonly availability: string;
}

/**
 * The headline offer. Turning `freeReview.enabled` off removes every promise of a free
 * review from the site — the primary call to action falls back to `cta.primaryFallback`.
 */
export interface Offer {
  readonly freeReview: {
    readonly enabled: boolean;
    readonly name: string;
    readonly summary: string;
    readonly includes: readonly string[];
    readonly caveat: string;
  };
}

export interface SiteConfig {
  readonly name: string;
  readonly ownerName: string;
  readonly tagline: string;
  readonly description: string;
  readonly contact: SiteContact;
  readonly serviceArea: ServiceArea;
  readonly offer: Offer;
  readonly cta: {
    readonly primary: CallToAction;
    /** Used in place of `primary` when the free review offer is switched off. */
    readonly primaryFallback: CallToAction;
    readonly secondary: CallToAction;
  };
  readonly nav: readonly NavItem[];
  readonly footerNav: readonly NavItem[];
  readonly social: readonly SocialLink[];
  readonly seo: {
    readonly titleSuffix: string;
    readonly defaultTitle: string;
    readonly defaultDescription: string;
    /** Path within `public/`. Replace with a 1200x630 PNG before launch — see README. */
    readonly ogImage: string;
    readonly ogImageType: string;
    readonly locale: string;
  };
}

/**
 * The available icons. `components/ui/Icon.tsx` implements this union exhaustively, so
 * adding a name here without drawing it is a compile error rather than a blank space.
 */
export type IconName =
  | 'layout'
  | 'code'
  | 'phone'
  | 'target'
  | 'inbox'
  | 'rocket'
  | 'wrench'
  | 'check'
  | 'bolt'
  | 'shield'
  | 'mail'
  | 'map-pin'
  | 'arrow-right'
  | 'menu'
  | 'close'
  | 'alert';

export interface Service {
  readonly id: string;
  readonly name: string;
  readonly summary: string;
  readonly details: readonly string[];
  readonly icon: IconName;
}

export interface PortfolioProject {
  readonly id: string;
  readonly industry: string;
  readonly title: string;
  readonly description: string;
  /** Path within `public/`. */
  readonly image: string;
  readonly imageAlt: string;
  readonly highlights: readonly string[];
  /** Omitted until a demo is actually published. Never link to a page that is not live. */
  readonly demoUrl?: string;
  /**
   * True for a site built to demonstrate the approach rather than for a paying client.
   * The UI renders a visible label from this; it is never presented as client work.
   */
  readonly isDemo: boolean;
}

export interface FaqItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
}

export interface ProcessStep {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export interface ValueProposition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon: IconName;
}

export interface InquiryOption {
  /** Must match one of the slugs the API accepts — see `types/api.ts`. */
  readonly value: string;
  readonly label: string;
}

export interface PageMeta {
  readonly path: string;
  readonly title: string;
  readonly description: string;
  /** Excluded from sitemap.xml and marked noindex. */
  readonly noIndex?: boolean;
  readonly sitemapPriority?: number;
}
