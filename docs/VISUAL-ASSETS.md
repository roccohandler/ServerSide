# The visual asset system

What the marketing site uses to _show_ the product, the transformation and the customer —
where each asset comes from, where it appears, and how to regenerate or extend the set.
This is the companion to `docs/MEDIA-CREDITS.md` (licensing of the underlying photography)
and `client/scripts/capture-previews.ts` (the pipeline that produces the screenshots).

The one-sentence policy: **every product visual is a screenshot of this repository's own
build, and everything that is not client work says so next to the pixels.** Illustrations
are allowed only where a screenshot would be dishonest (the "before" mocks) or illegible
(wording-level comparisons). Nothing is ever a screenshot of a real business that is not
a client.

## The asset inventory

### Captured product screenshots — `client/src/assets/portfolio/`

Produced by `npm run capture` (after a build) from the five demonstration sites this
repository serves at `/demo/<trade>`. The demonstration disclosure bar travels inside
every capture on purpose: a preview that carries its own label cannot be quoted out of
context. All are imported as hashed modules, so they cache immutably and cost the eager
bundle only a URL string.

| Asset                                         | What it shows                                                                                      | Rendered at                                                                                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `<trade>.webp` (1200×800, five trades)        | Demo homepage, desktop, top of page                                                                | Homepage hero (hvac, in `BrowserFrame`), homepage examples grid, `/portfolio` showcase, industry pages, teardown third beat          |
| `<trade>-mobile.webp` (640×1280, five trades) | The same page at true phone width (390 CSS px): tap-to-call header and the fixed call bar in frame | Homepage hero (hvac, in `PhoneFrame`), `DemoSection` bridge (plumbing), `/portfolio` showcase, industry heroes, audit recommendation |

The mobile captures exist because the trades' customers decide on phones, and every claim
the site makes about that — the number one tap away, the call bar that stays on screen —
is invisible in a desktop screenshot. They are captured through an iframe harness inside
`capture-previews.ts` (headless Chrome will not open a window narrower than ~500 CSS px;
a 390 px iframe imposes the real phone layout viewport, and the shot is cropped to it).

**One source width per capture, sized for its largest placement.** The phone captures are
640 px wide because the largest phone frame on the site — the `DemoSection` bridge, at
13 rem — is 208 CSS px, which a 3× display renders at 624. The smaller placements (the
hero's overlapping phone, the audit aside) are therefore over-supplied by roughly 2×.
That is a deliberate trade: each file is 61–102 kB, every one is `loading="lazy"`, and no
page fetches more than three of them, so a `srcset` ladder would add a second variant set
and four call sites' worth of markup to save bytes nobody waits on. Revisit it if a
capture ever lands above the fold or a page starts rendering all five eagerly.

**Regeneration ritual** (after any demo change):

```
npm run build --workspace @jobforge/client
npm run capture --workspace @jobforge/client   # requires local Chrome/Edge
# look at the diff, commit the images
```

A stale screenshot is a preview that lies about what clicking it reveals — recapture in
the same commit as the demo change.

### Social preview — `client/public/og-image.png`

Rasterised from `og-image.svg` by the same capture run. Stays in `public/` at a stable
URL because social scrapers cache the address, not the content hash.

### Demo-site photography — `client/src/assets/demos/<trade>/`

The licensed Unsplash/Pexels photography (and three ambient clips) the demonstration
sites themselves render. Provenance: every file has a row in
`client/scripts/media.manifest.json` **and** `docs/MEDIA-CREDITS.md`, enforced
bidirectionally by `demos.test.ts`. These ride only the lazy demo chunks; the marketing
pages show this photography indirectly, inside the captures above — which keeps the
marketing bundle photography-free and the licensing story one layer deep.

To add or replace demo photography: edit the manifest, run `npm run media`, add the
credits row. Never commit a loose image file.

### CSS-built illustrations (no image bytes)

| Component                              | What it is                                                              | Why not a screenshot                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `features/public/home/SiteMock.tsx`    | The before/after wireframe miniatures in `DemoSection` and the teardown | The differences shown are _wording_, unreadable in a thumbnail screenshot — and a "before" screenshot of a real business would be someone's actual website used as a bad example |
| `components/marketing/DeviceFrame.tsx` | `BrowserFrame` / `PhoneFrame` chrome around captures                    | Presentation, not content: the address pill shows the capture's real route on this site, so a framed preview documents where it can be verified                                  |

## Rules for adding a visual

1. **Product = capture.** New previews of the demos extend `capture-previews.ts`
   (another page, another viewport), never a hand-drawn mock of a page that exists.
2. **Every demo rendering carries the label.** A visible `Demonstration` badge
   (`Badge tone="accent"`) adjacent to the pixels, plus `trust.disclosure` where the
   surface shows several at once. `content.test.ts` and the portfolio/industry tests
   enforce the pattern.
3. **Images always ship intrinsic `width`/`height`, `loading="lazy"`,
   `decoding="async"`** — one `fetchpriority="high"` image per page at most, and today no
   marketing page needs one (the hero shot is desktop-only and lazy by design).
4. **Alt text describes what is visible**, disclosure bar included, in more than 25
   characters. The capture proves a claim; the alt states what it proves.
5. **Eager pages pay for bytes.** JS/CSS for visuals on home, services, portfolio and
   contact ride the `check-budget.ts` ceilings. Image bytes do not, but keep sources at
   the sizes above — nothing larger than the 1200-wide desktop captures.
6. **No external anything.** CSP is `self`-only: no hotlinked images, no CDNs, no
   embeds. An asset exists in this repository or it does not exist.

## Assets that still need a human

- **A founder photograph** for `/about`. The page's whole argument is founder-run
  accountability, and the no-fabrication rule means only a real photo can fill it.
  A plain portrait beside the "Who is behind it" section is the proportionate move.
- **Real client before/after material** — deliberately absent until it exists. The
  collection process, permissions and publishing rules are already written in
  `docs/proof-collection.md`; the portfolio's `isDemo: false` path is the slot it will
  drop into. Nothing may fill that slot early.
