import type { DemoImage } from './types';

/*
 * ============================================================================
 * ASSET WIRING FOR THE DEMO CONTENT MODULES
 * ============================================================================
 *
 * Each trade's content module collects its own assets with one eager
 * `import.meta.glob` over its own directory:
 *
 *     const files = import.meta.glob<string>('../../assets/demos/hvac/*', {
 *       eager: true, query: '?url', import: 'default',
 *     });
 *
 * and builds `DemoImage`s from it with `demoImage()` below. The glob is static, so
 * Vite hashes every file and inlines the URL map into the trade's own lazy chunk —
 * thirty imports' worth of wiring without thirty import statements, and nothing eager.
 *
 * **This module must never be re-exported from `content/index.ts`.** It is code, not
 * content, but the barrel rule protects the demos wholesale — see `demos/index.ts`.
 *
 * ## Why lookups throw
 *
 * A `DemoImage` whose file is missing would render as a broken image on a page whose
 * whole job is to look like production quality. `scripts/fetch-media.ts` generates the
 * files from the same names, `demos.test.ts` instantiates every demo, so a typo'd name
 * or an un-run fetch fails the suite instead of shipping a grey rectangle.
 * ============================================================================
 */

/** The widths `scripts/fetch-media.ts` cuts for each role. Keep in step with `ROLES`. */
export const MEDIA_WIDTHS = {
  heroImmersive: [768, 1280, 1920],
  heroSplit: [640, 960, 1280],
  service: [416, 832],
  gallery: [600, 1200],
  closing: [600, 1200],
} as const;

/** The aspect each role is cut to, width over height. Keep in step with `ROLES`. */
export const MEDIA_ASPECTS = {
  heroImmersive: 16 / 9,
  heroSplit: 4 / 3,
  service: 4 / 3,
  gallery: 3 / 2,
  closing: 3 / 2,
} as const;

export type MediaRole = keyof typeof MEDIA_WIDTHS;

function urlFor(files: Readonly<Record<string, string>>, suffix: string): string {
  for (const [path, url] of Object.entries(files)) {
    if (path.endsWith(`/${suffix}`)) return url;
  }
  throw new Error(
    `Demo asset "${suffix}" is missing from the glob. Run \`npm run media\` or fix the name.`,
  );
}

/** Builds one image from a trade's asset glob: `demoImage(files, 'hero', 'heroSplit', alt)`. */
export function demoImage(
  files: Readonly<Record<string, string>>,
  name: string,
  role: MediaRole,
  alt: string,
): DemoImage {
  const widths = MEDIA_WIDTHS[role];
  const largest = widths[widths.length - 1] ?? 0;

  const set = (ext: 'webp' | 'avif') =>
    widths.map((w) => `${urlFor(files, `${name}-${w}.${ext}`)} ${w}w`).join(', ');

  return {
    src: urlFor(files, `${name}-${largest}.webp`),
    srcset: set('webp'),
    avifSrcset: set('avif'),
    alt,
    width: largest,
    height: Math.round(largest / MEDIA_ASPECTS[role]),
  };
}

/** The one non-image lookup: a trade's ambient clip. */
export function demoVideoSrc(files: Readonly<Record<string, string>>): string {
  return urlFor(files, 'ambient.mp4');
}

/** The ambient clip's 16:9 poster — a single URL, because that is all `poster` takes. */
export function demoPoster(files: Readonly<Record<string, string>>): string {
  return urlFor(files, 'poster-1280.webp');
}
