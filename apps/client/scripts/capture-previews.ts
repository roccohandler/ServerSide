import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { DEMO_SLUGS } from '../src/config/demos';

/*
 * ============================================================================
 * PREVIEW CAPTURE
 * ============================================================================
 *
 * Produces the images the marketing site uses to *show* the demonstration sites:
 * a screenshot of each demo homepage for the portfolio cards, a phone-width
 * screenshot of the same page for the device-framed mobile previews, and the
 * 1200x630 raster social-preview image the README has warned about since the
 * SVG shipped.
 *
 * ## Why screenshots rather than illustrations
 *
 * The portfolio cards used to carry hand-drawn SVG mock-ups of websites that did not
 * exist yet. The demos exist now, so the most honest possible preview is the demo
 * itself — captured from this repository's own build, disclosure bar included. A
 * card that shows the real page can never drift from what clicking it reveals.
 *
 * ## Why this is a dev-time script rather than a build step
 *
 * It shells out to a locally installed Chrome/Edge, which the Vercel build image is
 * not guaranteed to have, and its output only changes when the demos change. Run it
 * after editing a demo, look at the diff, commit the images:
 *
 *     npm run build --workspace @jobforge/client
 *     npm run capture --workspace @jobforge/client
 * ============================================================================
 */

const CLIENT = resolve(import.meta.dirname, '..');
const DIST = join(CLIENT, 'dist');
const PUBLIC = join(CLIENT, 'public');
/*
 * Screenshots are imported by `content/portfolio.ts`, so they live in src/assets and get
 * content-hashed into the immutable cache. Only the og-image stays in public/ — social
 * scrapers need its URL to never change.
 */
const SHOTS = join(CLIENT, 'src', 'assets', 'portfolio');
const PORT = 4517;

/** Where a headless browser lives on the machines this actually runs on. */
const BROWSERS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  `${process.env['LOCALAPPDATA'] ?? ''}\\Google\\Chrome\\Application\\chrome.exe`,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

/*
 * The phone viewport, in CSS pixels.
 *
 * 390x780 is a common phone width at a 1:2 aspect that keeps the demo's sticky call bar
 * in frame — the mobile capture exists largely to show that bar and the tap-to-call
 * header, which no desktop screenshot can.
 *
 * Headless Chrome will not open a window narrower than about 500 CSS pixels, so the
 * mobile shot cannot be taken by shrinking the window: at `--window-size=390` the page
 * lays out at ~500px and the screenshot crops it, which mangles every line of text. The
 * capture instead loads `/~mobile/<slug>` — a harness page this server synthesises — and
 * lets a 390px-wide iframe impose the real layout viewport, then crops the frame out of
 * the screenshot. An iframe's content lays out at the iframe's width, so the demo's own
 * mobile breakpoints apply exactly as they would on a phone.
 */
const MOBILE = { width: 390, height: 780 } as const;

/** Marker for the synthesised mobile-harness routes. Not a real route in the app. */
const MOBILE_PREFIX = '/~mobile/';

function mobileHarness(slug: string): string {
  return (
    '<!doctype html><meta charset="utf-8"><style>html,body{margin:0}</style>' +
    `<iframe src="/demo/${slug}" style="width:${MOBILE.width}px;height:${MOBILE.height}px;border:0;display:block"></iframe>`
  );
}

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
};

const run = promisify(execFile);

function findBrowser(): string {
  const found = BROWSERS.find((path) => path && existsSync(path));
  if (!found) {
    throw new Error(
      'No Chrome or Edge found. Install one, or add its path to BROWSERS in this script.',
    );
  }
  return found;
}

/**
 * Serves `dist/` the way Vercel serves it.
 *
 * `cleanUrls` semantics: an extensionless request resolves to `<path>.html`, which is
 * exactly what `build-seo.ts` prerendered. There is deliberately no SPA fallback here
 * because production has none — a route this server 404s is a route that would 404
 * deployed, and a screenshot of that is a bug report, not a preview.
 */
function serveDist(): Promise<Server> {
  const server = createServer((request, response) => {
    void (async () => {
      const url = new URL(request.url ?? '/', `http://127.0.0.1:${PORT}`);

      if (url.pathname.startsWith(MOBILE_PREFIX)) {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end(mobileHarness(url.pathname.slice(MOBILE_PREFIX.length)));
        return;
      }

      const clean = url.pathname.replace(/\/+$/, '') || '/index';
      const candidates = [join(DIST, clean), join(DIST, `${clean}.html`)];

      for (const candidate of candidates) {
        try {
          const body = await readFile(candidate);
          response.writeHead(200, {
            'content-type': MIME[extname(candidate)] ?? 'application/octet-stream',
          });
          response.end(body);
          return;
        } catch {
          // Try the next shape.
        }
      }

      response.writeHead(404, { 'content-type': 'text/plain' });
      response.end(`Not prerendered: ${url.pathname}`);
    })();
  });

  return new Promise((resolvePromise) => {
    server.listen(PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

/**
 * One headless capture. Virtual time lets lazy chunks and images settle first.
 *
 * `width`/`height` are CSS pixels; `scale` multiplies them into device pixels in the
 * output file. The mobile captures use 2 so text in a phone-sized frame stays sharp
 * after the downscale to its rendered size.
 */
async function screenshot(
  browser: string,
  url: string,
  outFile: string,
  width: number,
  height: number,
  scale = 1,
): Promise<void> {
  await run(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    `--force-device-scale-factor=${scale}`,
    `--window-size=${width},${height}`,
    '--virtual-time-budget=20000',
    `--screenshot=${outFile}`,
    url,
  ]);
  if (!existsSync(outFile)) throw new Error(`Chrome produced no screenshot for ${url}`);
}

async function main(): Promise<void> {
  if (!existsSync(join(DIST, 'index.html'))) {
    throw new Error('dist/ is missing or unbuilt. Run the build first.');
  }

  const browser = findBrowser();
  const server = await serveDist();
  const work = join(tmpdir(), `jobforge-captures-${process.pid}`);
  await mkdir(work, { recursive: true });
  await mkdir(SHOTS, { recursive: true });

  try {
    /*
     * The demo homepages, disclosure bar and all. Captured at 3:2 — the exact aspect
     * the portfolio cards render — then downscaled, so nothing is cropped away and
     * the card shows the same top-of-page a visitor gets.
     */
    for (const slug of DEMO_SLUGS) {
      const raw = join(work, `${slug}.png`);
      await screenshot(browser, `http://127.0.0.1:${PORT}/demo/${slug}`, raw, 1440, 960);
      const out = join(SHOTS, `${slug}.webp`);
      await sharp(raw).resize(1200, 800, { fit: 'cover' }).webp({ quality: 78 }).toFile(out);
      const bytes = (await readFile(out)).byteLength;
      console.log(`[capture] portfolio/${slug}.webp — ${(bytes / 1000).toFixed(1)} kB`);
    }

    /*
     * The same homepages at phone width, for the phone-framed previews. Captured through
     * the iframe harness (see `MOBILE` above), at 2x so the downscale to the frame's
     * rendered size stays crisp, then cropped to the iframe. The window is 500 CSS px
     * because headless Chrome will not go narrower; the iframe, not the window, is what
     * sets the page's layout viewport.
     */
    for (const slug of DEMO_SLUGS) {
      const raw = join(work, `${slug}-mobile.png`);
      await screenshot(
        browser,
        `http://127.0.0.1:${PORT}${MOBILE_PREFIX}${slug}`,
        raw,
        500,
        MOBILE.height,
        2,
      );
      const out = join(SHOTS, `${slug}-mobile.webp`);
      await sharp(raw)
        .extract({ left: 0, top: 0, width: MOBILE.width * 2, height: MOBILE.height * 2 })
        .resize(640, 1280)
        .webp({ quality: 78 })
        .toFile(out);
      const bytes = (await readFile(out)).byteLength;
      console.log(`[capture] portfolio/${slug}-mobile.webp — ${(bytes / 1000).toFixed(1)} kB`);
    }

    /*
     * The social preview. Platforms fetch this URL once and cache it; most render no
     * SVG. 1200x630 PNG is the shape every scraper accepts — see the note in
     * `content/site.ts`, which points its `ogImage` here.
     */
    const ogSource = join(PUBLIC, 'og-image.svg');
    if (existsSync(ogSource)) {
      const raw = join(work, 'og.png');
      await screenshot(browser, `file:///${ogSource.replaceAll('\\', '/')}`, raw, 1200, 630);
      const out = join(PUBLIC, 'og-image.png');
      await sharp(raw).png({ compressionLevel: 9 }).toFile(out);
      const bytes = (await readFile(out)).byteLength;
      console.log(`[capture] og-image.png — ${(bytes / 1000).toFixed(1)} kB`);
    }

    /*
     * The iOS home-screen icon.
     *
     * Rasterised by sharp rather than screenshotted, because it needs no browser and no
     * layout — it is one square and four shapes. It is deliberately *not* the favicon:
     * iOS applies its own squircle mask, and masking an already-rounded tile double-rounds
     * it into a visibly smaller blob. So the tile here is full-bleed with square corners
     * and the letterforms carry the padding instead.
     *
     * Same geometry as public/favicon.svg and src/components/brand/Logo.tsx. Three copies,
     * one shape — change one and change all three.
     */
    const touchIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 88 88" width="180" height="180">
      <rect width="88" height="88" fill="#17191E"/>
      <rect x="39" y="18.5" width="32" height="11.5" rx="5.75" transform="rotate(-14 39 24.25)" fill="#F3EEE4"/>
      <rect x="39" y="37" width="28" height="11.5" rx="5.75" transform="rotate(-14 39 42.75)" fill="#E85C24"/>
      <path d="M39 18.5 L39 56 Q39 67 28.5 67" fill="none" stroke="#F3EEE4" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const iconOut = join(PUBLIC, 'apple-touch-icon.png');
    await sharp(Buffer.from(touchIcon))
      .resize(180, 180)
      .png({ compressionLevel: 9 })
      .toFile(iconOut);
    console.log(
      `[capture] apple-touch-icon.png — ${((await readFile(iconOut)).byteLength / 1000).toFixed(1)} kB`,
    );
  } finally {
    server.close();
    await rm(work, { recursive: true, force: true });
  }
}

await main();
