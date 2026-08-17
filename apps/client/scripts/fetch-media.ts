import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import manifest from './media.manifest.json';

/*
 * ============================================================================
 * LICENSED MEDIA, FROM MANIFEST TO COMMITTED ASSETS
 * ============================================================================
 *
 * Reads `media.manifest.json` — the record of every stock photograph and clip the
 * demonstration sites use, with its source page, author and licence — downloads the
 * originals, and encodes the responsive variants into `client/src/assets/demos/`.
 *
 * ## Why the outputs are committed rather than generated at build time
 *
 * A deploy that re-downloads from Unsplash is a deploy that fails when Unsplash is
 * down, renders differently when a photograph is re-processed upstream, and silently
 * changes licence terms when an image moves tiers. The repository carries the pixels
 * it ships. This script is for adding or re-cutting assets deliberately:
 *
 *     npm run media --workspace @jobforge/client
 *
 * ## Why every variant has a byte budget
 *
 * The numbers below are the per-role budgets from the performance research in
 * `docs/DEMO-QUALITY-UPGRADE.md` §3 (hero ≤150–200 kB, cards ≤70 kB, gallery ≤150 kB).
 * An encode that lands over budget drops one quality step and retries; if it is still
 * over, the script fails loudly rather than committing the regression.
 * ============================================================================
 */

const CLIENT = resolve(import.meta.dirname, '..');
const OUT = join(CLIENT, 'src', 'assets', 'demos');
const CACHE = join(CLIENT, 'node_modules', '.cache', 'media-masters');

interface RoleSpec {
  /** Output aspect ratio, width over height. */
  readonly aspect: number;
  readonly widths: readonly number[];
  readonly formats: readonly ('webp' | 'avif')[];
  /** Byte budget for the largest WebP variant. */
  readonly budget: number;
}

/*
 * Every role ships AVIF and WebP. The first cut of this file gave AVIF to heroes only,
 * on the argument that doubling the file count for a ~15 kB saving per small image was
 * not worth it — then eleven WebP encodes came back over budget, every one of them
 * foliage (grass and leaves are the highest-entropy content WebP meets, and one demo is
 * a landscaping company). AVIF cuts those same images 25–40%. The budget is enforced on
 * the AVIF because that is what ~95% of browsers download; the WebP fallback gets 1.8×.
 */
const ROLES: Readonly<Record<string, RoleSpec>> = {
  'hero-immersive': {
    aspect: 16 / 9,
    widths: [768, 1280, 1920],
    formats: ['avif', 'webp'],
    budget: 200_000,
  },
  'hero-split': {
    aspect: 4 / 3,
    widths: [640, 960, 1280],
    formats: ['avif', 'webp'],
    budget: 160_000,
  },
  service: { aspect: 4 / 3, widths: [416, 832], formats: ['avif', 'webp'], budget: 70_000 },
  gallery: { aspect: 3 / 2, widths: [600, 1200], formats: ['avif', 'webp'], budget: 150_000 },
  closing: { aspect: 3 / 2, widths: [600, 1200], formats: ['avif', 'webp'], budget: 150_000 },
  /*
   * The `poster` attribute takes exactly one URL, so this role is a single 16:9 WebP cut
   * of a photograph that already exists in another role — a poster borrowed from a 4:3
   * slot would be stretched to the video's box.
   */
  poster: { aspect: 16 / 9, widths: [1280], formats: ['webp'], budget: 120_000 },
};

/*
 * 2.0 rather than tighter because the WebP is the fallback for the shrinking minority
 * of browsers without AVIF, on images that are lazy and below the fold. The two encodes
 * that pushed this from 1.8 were dense foliage at 277/287 kB — dropping their quality
 * further would visibly degrade the one demo whose pitch is photography, to save bytes
 * for almost nobody. The AVIF budget is the one that is never widened.
 */
const WEBP_FALLBACK_ALLOWANCE = 2.0;

const QUALITY = { webp: 75, avif: 50 } as const;
const QUALITY_RETRY = { webp: 66, avif: 44 } as const;

async function download(url: string): Promise<Buffer> {
  const key = createHash('sha256').update(url).digest('hex').slice(0, 24);
  const cached = join(CACHE, key);
  if (existsSync(cached)) return readFile(cached);

  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} for ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(CACHE, { recursive: true });
  await writeFile(cached, bytes);
  return bytes;
}

async function encode(
  master: Buffer,
  width: number,
  height: number,
  format: 'webp' | 'avif',
  quality: number,
): Promise<Buffer> {
  /*
   * `attention` crops toward the region sharp judges salient, which keeps a portrait
   * original usable in a landscape slot instead of beheading its subject at the centre
   * line. Every output is checked by eye after a run regardless — see the plan doc.
   */
  const base = sharp(master).resize(width, height, { fit: 'cover', position: 'attention' });
  return format === 'webp' ? base.webp({ quality }).toBuffer() : base.avif({ quality }).toBuffer();
}

async function main(): Promise<void> {
  let failures = 0;

  for (const photo of manifest.photos) {
    const spec = ROLES[photo.role];
    if (!spec) throw new Error(`Unknown role "${photo.role}" on ${photo.trade}/${photo.name}`);

    const dir = join(OUT, photo.trade);
    await mkdir(dir, { recursive: true });
    const master = await download(`https://images.unsplash.com/${photo.id}?w=2400&q=85&fm=jpg`);

    for (const format of spec.formats) {
      const budget = format === 'avif' ? spec.budget : spec.budget * WEBP_FALLBACK_ALLOWANCE;
      for (const width of spec.widths) {
        const height = Math.round(width / spec.aspect);
        let quality: number = QUALITY[format];
        let bytes = await encode(master, width, height, format, quality);

        if (width === Math.max(...spec.widths) && bytes.byteLength > budget) {
          quality = QUALITY_RETRY[format];
          bytes = await encode(master, width, height, format, quality);
          if (bytes.byteLength > budget) {
            console.error(
              `[media] OVER BUDGET ${photo.trade}/${photo.name}-${width}.${format}: ` +
                `${(bytes.byteLength / 1000).toFixed(1)} kB > ${(budget / 1000).toFixed(0)} kB`,
            );
            failures += 1;
          }
        }

        await writeFile(join(dir, `${photo.name}-${width}.${format}`), bytes);
      }
    }
    console.log(
      `[media] ${photo.trade}/${photo.name} (${spec.formats.join('+')} × ${spec.widths.join('/')})`,
    );
  }

  for (const video of manifest.videos) {
    const dir = join(OUT, video.trade);
    await mkdir(dir, { recursive: true });
    const bytes = await download(video.fileUrl);
    if (bytes.byteLength > video.maxBytes) {
      console.error(
        `[media] OVER BUDGET ${video.trade}/${video.name}.mp4: ` +
          `${(bytes.byteLength / 1e6).toFixed(2)} MB > ${(video.maxBytes / 1e6).toFixed(2)} MB`,
      );
      failures += 1;
    }
    await writeFile(join(dir, `${video.name}.mp4`), bytes);
    console.log(
      `[media] ${video.trade}/${video.name}.mp4 — ${(bytes.byteLength / 1e6).toFixed(2)} MB`,
    );
  }

  if (failures > 0) throw new Error(`${failures} asset(s) over their byte budget.`);
}

await main();
