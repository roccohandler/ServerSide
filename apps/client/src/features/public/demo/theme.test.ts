import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/*
 * The demonstrations are five other businesses' brands, and a JobForge visitor's operating
 * system does not get to repaint them.
 *
 * `tokens.test.ts` already proves the harder half: it computes AA over both palettes for
 * every stated pair in this stylesheet, so the disclosure bar cannot silently become cream
 * on cream in dark mode again. What it cannot see is `color-scheme`, which paints nothing
 * and decides everything about native controls — and the demo quote form is full of them.
 */

const stylesheet = readFileSync(join(import.meta.dirname, 'Demo.module.css'), 'utf8');

describe('the demo sites and the theme', () => {
  it('renders its native controls in the light palette whatever the reader chose', () => {
    const shell = stylesheet.slice(
      stylesheet.indexOf('.shell {'),
      stylesheet.indexOf('}', stylesheet.indexOf('.shell {')),
    );

    expect(shell).toContain('color-scheme: light');
  });

  it('paints the depictions from their own tokens rather than JobForge’s', () => {
    /*
     * The count is the point. Seven JobForge tokens, all of them in the disclosure bar —
     * which is JobForge speaking and *should* follow the theme — against a stylesheet with
     * hundreds of `--demo-*` references below it. If this number climbs, a JobForge colour
     * has reached into somebody else's website.
     */
    const jobforge = stylesheet.match(/var\(--color-/g)?.length ?? 0;
    const demo = stylesheet.match(/var\(--demo-/g)?.length ?? 0;

    expect(jobforge).toBeLessThanOrEqual(8);
    expect(demo).toBeGreaterThan(50);
  });
});
