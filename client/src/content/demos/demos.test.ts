import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_PAGES, DEMO_SLUGS, DEMO_TOKENS, demoPath, type DemoSlug } from '../../config/demos';
import manifest from '../../../scripts/media.manifest.json';
import { pages } from '../pages';
import { demoBusinessNames, demoMeta } from './demoMeta';
import { demo as hvac } from './hvac';
import { demo as plumbing } from './plumbing';
import { demo as roofing } from './roofing';
import { demo as landscaping } from './landscaping';
import { demo as electrical } from './electrical';
import type { DemoImage, DemoSite } from './types';

/*
 * ============================================================================
 * THE DEMONSTRATION SITES — INVENT THE BUSINESS, NEVER THE EVIDENCE
 * ============================================================================
 *
 * Five fictional businesses on the domain of a real one whose entire positioning is that
 * it fabricates nothing. That is a defensible thing to publish and a very easy thing to
 * get wrong, and the line between them is exactly one distinction:
 *
 *   **Set dressing is fine. Proof is not.**
 *
 * A name, a phone number, opening hours, a service list and a set of neighbourhoods are
 * all things a reader understands as "this is what a website of this kind contains". A
 * review, a star rating, a licence number, an award, a years-in-business figure or a
 * guarantee is a *claim a reader would weigh* — and manufacturing one of those, even
 * clearly labelled, is the site doing the thing it tells its customers never to do.
 *
 * These demos will therefore look thinner than a real trade site in exactly one respect,
 * and that is the correct trade rather than a limitation to fix later.
 * ============================================================================
 */

const demos: Readonly<Record<DemoSlug, DemoSite>> = {
  hvac,
  plumbing,
  roofing,
  landscaping,
  electrical,
};

/** Every string in a demo, however deeply nested. The sweeps below read this. */
function collectStrings(value: unknown, found: string[] = []): string[] {
  if (typeof value === 'string') {
    found.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, found);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) collectStrings(item, found);
  }
  return found;
}

const everyString = collectStrings(demos);

describe('the demonstration sites', () => {
  it('reads a meaningful amount of copy, so the sweeps cannot pass by walking nothing', () => {
    expect(everyString.length).toBeGreaterThan(200);
  });

  it('exists for every trade that claims one, keyed by its own slug', () => {
    expect(Object.keys(demos).sort()).toEqual([...DEMO_SLUGS].sort());

    for (const [key, demo] of Object.entries(demos)) {
      expect(demo.slug, `${key} is filed under the wrong key`).toBe(key);
    }
  });

  /*
   * The flag the disclosure bar reads. It is typed `true` rather than `boolean`, so this
   * cannot fail without somebody having deliberately widened the type first — which is the
   * point at which they would have to think about what they were doing.
   */
  it('declares itself fictional, every one', () => {
    for (const demo of Object.values(demos)) {
      expect(demo.isFictional).toBe(true);
    }
  });

  /*
   * ==========================================================================
   * NO MANUFACTURED PROOF
   * ==========================================================================
   *
   * The sweep this whole exercise depends on. Every pattern below is something a reader
   * would treat as evidence about a business, and none of it can be true of a business
   * that does not exist.
   *
   * `guarantee` is on the list even though a guarantee is a promise rather than a proof —
   * because a fictional business cannot keep one, and a demo that models "make promises
   * you cannot keep" is teaching the wrong lesson to the person reading it as an example.
   * ==========================================================================
   */
  const FABRICATED_PROOF: readonly (readonly [RegExp, string])[] = [
    [/\breview(s|ed|ing)?\b/i, 'a customer review is proof, and there are no customers'],
    [/\btestimonial/i, 'no testimonials — this business does not exist'],
    [/\b(star|five-star|rating|rated)\b/i, 'no ratings'],
    [/\blicen[sc]e/i, 'no licence claims: nobody holds a licence for a fictional company'],
    [/\b(insured|bonded|certified|certification|accredited)\b/i, 'no credentials'],
    [/\b(award|awarded|voted|#1|number one|best in)\b/i, 'no awards or superlatives'],
    [/\b(since|established|est\.)\s*(18|19|20)\d{2}\b/i, 'no founding date'],
    [/\b\d+\+?\s*(years|yrs)\b/i, 'no years in business'],
    [/\bfamily[- ](owned|run)\b/i, 'no ownership history'],
    [/\bguarantee/i, 'a fictional business cannot honour a guarantee'],
    [/\bwarrant(y|ies)\b/i, 'no warranties'],
    [
      /\b\d[\d,]*\+?\s*(jobs|customers|clients|homes|projects|installs)\b/i,
      'no counts of work done',
    ],
    [/\btrusted by\b|\bthousands of\b|\bhundreds of\b/i, 'no volume claims'],
    [/\bfully\s+(licen[sc]ed|insured|qualified)\b/i, 'no credential badges'],
  ];

  it('manufactures no proof of any kind', () => {
    for (const text of everyString) {
      for (const [pattern, reason] of FABRICATED_PROOF) {
        expect(pattern.test(text), `${reason} — found in: ${text}`).toBe(false);
      }
    }
  });

  /*
   * ==========================================================================
   * NOTHING THAT POINTS AT A REAL PERSON
   * ==========================================================================
   *
   * Two ways a fictional business can reach into somebody's actual life, and both are
   * closed by construction rather than by care.
   *
   *   - **The phone number.** `555-0100` to `555-0199` is the block reserved for fiction.
   *     Any other number is somebody's, and a demo published with one sends every misdial
   *     to them for as long as the page exists.
   *   - **The address.** There is no address field on `DemoSite` at all, and this asserts
   *     none has been smuggled into prose — because any plausible Seattle street address
   *     is a real building with real people in it.
   * ==========================================================================
   */
  it('uses only telephone numbers reserved for fiction', () => {
    const fictional = /^\(\d{3}\) 555-01\d{2}$/;

    for (const demo of Object.values(demos)) {
      expect(
        fictional.test(demo.business.phone),
        `${demo.slug} publishes ${demo.business.phone}, which is somebody's real number`,
      ).toBe(true);
    }

    // And no other number is written into the copy anywhere.
    const anyPhone = /\(\d{3}\)\s*\d{3}-\d{4}/g;
    for (const text of everyString) {
      for (const match of text.match(anyPhone) ?? []) {
        expect(fictional.test(match), `"${match}" is not in the reserved range`).toBe(true);
      }
    }
  });

  it('publishes no street address', () => {
    const street =
      /\b\d{1,5}\s+(north|south|east|west|n|s|e|w)?\s*[A-Z][a-z]+\s+(st|street|ave|avenue|rd|road|way|blvd|boulevard|dr|drive|ln|lane|pl|place|ct|court)\b/i;

    for (const text of everyString) {
      expect(street.test(text), `looks like a real address: ${text}`).toBe(false);
    }
  });

  /*
   * `.example` is reserved by RFC 2606 and can never be registered by anybody. A
   * plausible-looking domain is one somebody may already own, and mail sent to it lands in
   * a stranger's inbox.
   */
  it('uses only email addresses nobody can ever receive', () => {
    for (const demo of Object.values(demos)) {
      expect(demo.business.email).toMatch(/@[a-z0-9.-]+\.example$/);
    }
  });

  /*
   * ==========================================================================
   * THE PALETTE CONTRACT
   * ==========================================================================
   *
   * Every demo supplies every token. A missing one does not fall back to a default — it
   * inherits whatever the *previous* demo set, because `DemoLayout` writes these as inline
   * custom properties and React only updates the keys it is given. That bug appears solely
   * when somebody navigates from one demo straight to another, which is exactly the path
   * nobody clicks while developing.
   * ==========================================================================
   */
  it('supplies every palette token, in every demo', () => {
    for (const demo of Object.values(demos)) {
      for (const token of DEMO_TOKENS) {
        expect(demo.palette[token], `${demo.slug} is missing ${token}`).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  it('gives each trade a palette of its own, so five demos are not one template', () => {
    const brands = Object.values(demos).map((demo) => demo.palette['--demo-brand']);
    expect(new Set(brands).size).toBe(DEMO_SLUGS.length);
  });

  /*
   * The template renders its "need someone today?" strip only where a trade has urgent
   * work. Landscaping has none — a garden is never an emergency — and that difference is
   * the clearest evidence in the set that one template genuinely follows the trade rather
   * than painting five copies of the same page.
   */
  it('marks urgent work only where the trade actually has it', () => {
    const urgentCount = (demo: DemoSite) => demo.services.items.filter((s) => s.urgent).length;

    expect(urgentCount(landscaping)).toBe(0);
    for (const demo of [hvac, plumbing, electrical]) {
      expect(urgentCount(demo), `${demo.slug} should have same-day work`).toBeGreaterThan(0);
    }
  });

  it('describes enough services to be worth clicking into', () => {
    for (const demo of Object.values(demos)) {
      expect(demo.services.items.length).toBeGreaterThanOrEqual(5);

      for (const service of demo.services.items) {
        expect(service.detail.length).toBeGreaterThan(80);
        expect(service.includes.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('asks a short quote form, the way it tells everybody else to', () => {
    for (const demo of Object.values(demos)) {
      // Long forms are the friction this whole site sells against. Five is the ceiling.
      expect(demo.contact.fields.length).toBeLessThanOrEqual(5);
      expect(demo.contact.fields.some((field) => field.required)).toBe(true);
    }
  });
});

/*
 * ============================================================================
 * THE ROUTE, METADATA AND CONTENT LOCKSTEP
 * ============================================================================
 *
 * Fifteen routes, fifteen metadata entries, fifteen built HTML files. `vercel.json` has no
 * SPA fallback, so a route that loses its `PageMeta` loses its file and 404s on refresh —
 * silently, and only for somebody who reloads or arrives from a pasted link.
 * ============================================================================
 */
describe('the demo routes', () => {
  it('has page metadata for every demo route', () => {
    const documented = new Map(pages.map((page) => [page.path, page]));

    for (const slug of DEMO_SLUGS) {
      for (const page of DEMO_PAGES) {
        const path = demoPath(slug, page);
        const meta = documented.get(path);

        expect(meta, `${path} has no PageMeta, so no HTML file is built for it`).toBeDefined();
        expect(meta?.noIndex, `${path} would be indexed`).toBe(true);
      }
    }
  });

  it('keeps every demo out of the sitemap', () => {
    for (const meta of demoMeta) {
      expect(meta.noIndex).toBe(true);
      expect(meta.sitemapPriority).toBeUndefined();
    }
  });

  /*
   * The business name is written twice — in the demo module and in `demoMeta`, which has
   * to stay a leaf so that `pages.ts` does not drag five fictional businesses into the
   * eager bundle. The duplication cannot be removed; this stops it drifting.
   */
  it('names the same business in the metadata as in the content', () => {
    for (const slug of DEMO_SLUGS) {
      expect(demoBusinessNames[slug]).toBe(demos[slug].business.name);
    }
  });

  it('says it is a demonstration in every description', () => {
    for (const meta of demoMeta) {
      expect(meta.description.toLowerCase()).toContain('demonstration');
      expect(meta.description.length).toBeGreaterThan(50);
      expect(meta.description.length).toBeLessThanOrEqual(200);
    }
  });
});

/*
 * ============================================================================
 * THE LICENSED MEDIA CONTRACT
 * ============================================================================
 *
 * Photography changed what these demos are allowed to get wrong. Three failure modes,
 * one guard each:
 *
 *   1. **A missing or orphaned file.** Every asset on disk must be derivable from
 *      `scripts/media.manifest.json`, and everything the manifest promises must exist —
 *      exact set equality, because an orphan is an unlicensed file and a gap is a broken
 *      image on a page whose job is to look like production.
 *   2. **Lost provenance.** Every manifest entry carries its author, source page and
 *      licence, and every source page appears in `docs/MEDIA-CREDITS.md`. The licence in
 *      force is the one at download time; the record is the defence.
 *   3. **Alt text smuggling proof.** The `media` blocks are part of the demo objects, so
 *      `collectStrings` already sweeps every alt through FABRICATED_PROOF above. The
 *      checks here are for quality: real descriptions, not filler.
 * ============================================================================
 */
describe('the licensed media', () => {
  const ASSETS = join(import.meta.dirname, '..', '..', 'assets', 'demos');

  /** What `scripts/fetch-media.ts` cuts per manifest role. Kept in step deliberately. */
  const CUTS: Readonly<Record<string, { widths: readonly number[]; formats: readonly string[] }>> =
    {
      'hero-immersive': { widths: [768, 1280, 1920], formats: ['avif', 'webp'] },
      'hero-split': { widths: [640, 960, 1280], formats: ['avif', 'webp'] },
      service: { widths: [416, 832], formats: ['avif', 'webp'] },
      gallery: { widths: [600, 1200], formats: ['avif', 'webp'] },
      closing: { widths: [600, 1200], formats: ['avif', 'webp'] },
      poster: { widths: [1280], formats: ['webp'] },
    };

  it('has every file the manifest promises, and no file the manifest does not know', () => {
    const expected = new Map<string, Set<string>>(DEMO_SLUGS.map((slug) => [slug, new Set()]));

    for (const photo of manifest.photos) {
      const cut = CUTS[photo.role];
      expect(cut, `unknown manifest role "${photo.role}"`).toBeDefined();
      for (const format of cut?.formats ?? []) {
        for (const width of cut?.widths ?? []) {
          expected.get(photo.trade)?.add(`${photo.name}-${width}.${format}`);
        }
      }
    }
    for (const video of manifest.videos) {
      expected.get(video.trade)?.add(`${video.name}.mp4`);
    }

    for (const slug of DEMO_SLUGS) {
      const onDisk = existsSync(join(ASSETS, slug)) ? readdirSync(join(ASSETS, slug)) : [];
      expect(
        onDisk.sort(),
        `${slug}: assets on disk diverge from the manifest — run \`npm run media\` or fix the manifest`,
      ).toEqual([...(expected.get(slug) ?? [])].sort());
    }
  });

  it('records provenance for every asset: author, source page, licence', () => {
    for (const entry of [...manifest.photos, ...manifest.videos]) {
      const label = `${entry.trade}/${entry.name}`;
      expect(entry.author, `${label} has no author`).toBeTruthy();
      expect(entry.pageUrl, `${label} has no source page`).toMatch(
        /^https:\/\/(unsplash\.com\/photos\/|www\.pexels\.com\/)/,
      );
      expect(entry.license, `${label} has no licence`).toBeTruthy();
      expect(entry.licenseUrl, `${label} has no licence URL`).toMatch(/^https:\/\//);
    }
  });

  it('credits every asset in docs/MEDIA-CREDITS.md', () => {
    const credits = readFileSync(
      join(import.meta.dirname, '..', '..', '..', '..', 'docs', 'MEDIA-CREDITS.md'),
      'utf8',
    );

    for (const entry of [...manifest.photos, ...manifest.videos]) {
      expect(
        credits.includes(entry.pageUrl),
        `${entry.trade}/${entry.name} (${entry.pageUrl}) has no row in docs/MEDIA-CREDITS.md`,
      ).toBe(true);
    }
  });

  it('describes what is visible, in every alt text', () => {
    const images: DemoImage[] = [];
    for (const demo of Object.values(demos)) {
      images.push(demo.media.hero, ...demo.media.gallery, demo.media.closing);
      for (const service of demo.services.items) {
        if (service.image) images.push(service.image);
      }
    }

    // 30 photos render across the five demos; fewer means a media block went missing.
    expect(images.length).toBeGreaterThanOrEqual(30);

    for (const image of images) {
      expect(image.alt.length, image.src).toBeGreaterThan(25);
      expect(image.alt.toLowerCase().startsWith('image of'), image.alt).toBe(false);
      expect(image.width).toBeGreaterThan(0);
      expect(image.height).toBeGreaterThan(0);
      expect(image.srcset).toContain('w');
      expect(image.avifSrcset).toContain('avif');
    }
  });

  /*
   * Which trades carry the ambient clip is a decision, not an accident: plumbing,
   * electrical and landscaping had verified clips inside the byte budget; HVAC's
   * candidates carried readable brand marks or read as derelict equipment, and roofing's
   * were over budget or visibly the wrong region. A static image beats a compromised
   * video — if a good clip turns up later, this test is the thing to update.
   */
  it('plays ambient video only where a clip earned its bytes', () => {
    expect(plumbing.media.ambient).toBeDefined();
    expect(electrical.media.ambient).toBeDefined();
    expect(landscaping.media.ambient).toBeDefined();
    expect(hvac.media.ambient).toBeUndefined();
    expect(roofing.media.ambient).toBeUndefined();

    for (const demo of Object.values(demos)) {
      if (!demo.media.ambient) continue;
      expect(demo.media.ambient.src).toMatch(/\.mp4$/);
      expect(demo.media.ambient.poster).toMatch(/\.webp$/);
      expect(demo.media.ambient.heading.length).toBeGreaterThan(10);
    }
  });

  it('flips the hero to immersive exactly for the considered-purchase trades', () => {
    expect(roofing.home.heroLayout).toBe('immersive');
    expect(landscaping.home.heroLayout).toBe('immersive');
    for (const demo of [hvac, plumbing, electrical]) {
      expect(demo.home.heroLayout, `${demo.slug} is an emergency trade`).toBe('split');
    }
  });
});

/*
 * ============================================================================
 * THE DEMO CONTENT NEVER JOINS THE EAGER BUNDLE
 * ============================================================================
 *
 * The single most expensive mistake available in this repository, and it has been made
 * once already: re-exporting lazy-route content from `content/index.ts` put 236 kB into
 * the chunk every visitor downloads before the homepage could paint, while the *component*
 * splitting kept looking correct.
 *
 * `check-budget.ts` would eventually catch it as a number. This catches it as a sentence,
 * pointing at the file that did it.
 * ============================================================================
 */
describe('the demo content boundary', () => {
  it('is not re-exported from the content barrel', () => {
    const barrel = readFileSync(join(import.meta.dirname, '..', 'index.ts'), 'utf8');

    expect(
      /from\s+'\.\/demos/.test(barrel),
      'content/index.ts re-exports demo content. Every component imports that barrel, so ' +
        'this puts five fictional businesses in the eager bundle.',
    ).toBe(false);
  });

  /*
   * `demoMeta.ts` is the one demo module the eager bundle may reach, because `pages.ts`
   * needs it. It therefore may not import the demo content itself — that would defeat the
   * whole reason it exists as a leaf.
   */
  it('keeps the metadata leaf free of demo content imports', () => {
    const source = readFileSync(join(import.meta.dirname, 'demoMeta.ts'), 'utf8');
    const imports = [...source.matchAll(/from\s+'([^']+)'/g)].map((match) => match[1]);

    for (const specifier of imports) {
      expect(
        /^\.\/(hvac|plumbing|roofing|landscaping|electrical)$/.test(specifier ?? ''),
        `demoMeta.ts imports ${specifier}, which drags a whole demo into the eager bundle`,
      ).toBe(false);
    }
  });

  it('has one content module per demo, and no orphans', () => {
    // `media.ts` is asset wiring shared by the five modules, not a sixth demo.
    const files = readdirSync(import.meta.dirname)
      .filter((name) => name.endsWith('.ts'))
      .filter((name) => !name.includes('.test.'))
      .filter((name) => !['types.ts', 'index.ts', 'demoMeta.ts', 'media.ts'].includes(name))
      .map((name) => name.replace(/\.ts$/, ''));

    expect(files.sort()).toEqual([...DEMO_SLUGS].sort());
  });
});
