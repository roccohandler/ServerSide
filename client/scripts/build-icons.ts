import { readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

/*
 * ============================================================================
 * THE RASTER FAVICON
 * ============================================================================
 *
 * Rasterises `public/favicon.svg` into `public/favicon.ico`.
 *
 * ## Why an ICO exists at all in 2026
 *
 * `<link rel="icon" type="image/svg+xml">` is the better tag and every Chromium and
 * Firefox reader takes it. Two audiences never see it:
 *
 *   - **Safari.** It has never implemented SVG favicons through `rel="icon"`. Given only
 *     an SVG it draws its own placeholder, so the tab shows a generic page glyph next to
 *     a title that says JobForge.
 *   - **Everything that asks for `/favicon.ico` directly** without reading the HTML —
 *     search result listings, feed readers, link unfurlers, a pinned Windows shortcut.
 *     That request is unconditional; before this file existed it 404'd.
 *
 * So the mark was correct and simply not reaching part of the audience. The ICO is the
 * fallback that closes that, and the SVG stays first in the list for everyone who can
 * use it — it is a quarter of the size and stays sharp at any zoom.
 *
 * ## Why it is generated rather than drawn
 *
 * `docs/design-system.md` counts three hand-maintained copies of the Forge Stamp
 * geometry, and each one is a place the mark can silently drift. This script adds no
 * fourth: it reads `favicon.svg` — the copy that is already the fixed-fill, full-bleed
 * one — and only changes its encoding. Re-running after a change to that file is
 * therefore always correct.
 *
 * ## Why dev-time rather than part of `npm run build`
 *
 * Same reason as `capture-previews.ts`: sharp is a native devDependency, the output
 * changes only when the mark does, and a committed binary is one less thing the deploy
 * has to get right. Run it when the mark changes and commit the result:
 *
 *     npm run icons --workspace @jobforge/client
 * ============================================================================
 */

const CLIENT = resolve(import.meta.dirname, '..');
const PUBLIC = join(CLIENT, 'public');

/*
 * The three sizes a browser actually asks an ICO for: 16 for the tab, 32 for a retina
 * tab and the bookmark list, 48 for a Windows shortcut. Bigger entries in a favicon are
 * dead weight — anything that wants a large mark has the SVG or the 180px touch icon.
 */
const SIZES = [16, 32, 48] as const;

/*
 * Renders well above the target and lets sharp downsample.
 *
 * `favicon.svg` declares a viewBox and no width, so at sharp's default 72 dpi it
 * rasterises at its 88-unit natural size — and 88 → 16 is a downscale of less than 6x
 * from an already-aliased source, which visibly furs the J's stroke. Rendering at 600
 * dpi gives a ~730px master, and every size below is a clean Lanczos reduction of it.
 */
const DENSITY = 600;

interface Frame {
  readonly size: number;
  readonly png: Buffer;
}

/**
 * Packs PNG frames into an ICO container.
 *
 * The format is a 6-byte header, one 16-byte directory entry per frame, then the frame
 * payloads. Each payload here is a whole PNG file rather than the headerless BMP the
 * original format specified — legal since Windows Vista and read by every browser that
 * is still shipping, and it keeps a 48px frame at a few hundred bytes instead of 9 kB.
 */
function icoContainer(frames: readonly Frame[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon (2 would be a cursor)
  header.writeUInt16LE(frames.length, 4);

  const directory = Buffer.alloc(16 * frames.length);
  let offset = header.length + directory.length;

  frames.forEach((frame, index) => {
    const at = index * 16;
    // A dimension byte is the size itself, except 256, which is written as 0. The sizes
    // above are all well under that, but the encoding is worth stating rather than
    // implying by omission.
    const dimension = frame.size >= 256 ? 0 : frame.size;
    directory.writeUInt8(dimension, at);
    directory.writeUInt8(dimension, at + 1);
    directory.writeUInt8(0, at + 2); // palette size; 0 = truecolour
    directory.writeUInt8(0, at + 3); // reserved
    directory.writeUInt16LE(1, at + 4); // colour planes
    directory.writeUInt16LE(32, at + 6); // bits per pixel — RGBA
    directory.writeUInt32LE(frame.png.length, at + 8);
    directory.writeUInt32LE(offset, at + 12);
    offset += frame.png.length;
  });

  return Buffer.concat([header, directory, ...frames.map((frame) => frame.png)]);
}

async function main(): Promise<void> {
  const source = await readFile(join(PUBLIC, 'favicon.svg'));

  const frames: Frame[] = await Promise.all(
    SIZES.map(async (size) => ({
      size,
      png: await sharp(source, { density: DENSITY })
        .resize(size, size)
        .png({ compressionLevel: 9 })
        .toBuffer(),
    })),
  );

  const out = join(PUBLIC, 'favicon.ico');
  const ico = icoContainer(frames);
  await writeFile(out, ico);

  console.log(`[icons] favicon.ico — ${SIZES.join('/')} px, ${(ico.byteLength / 1000).toFixed(1)} kB`);
}

await main();
