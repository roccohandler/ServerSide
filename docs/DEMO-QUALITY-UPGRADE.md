# Demo quality upgrade: photography, video, and UI/UX best practices

**Status: complete.** §7 records what happened, including where reality pushed back.

The five demonstration sites shipped as typography and flat colour — deliberately, because
at the time there was no licensed imagery and no way to serve any (`img-src 'self'` and no
image host). That decision is now being revisited on purpose, not drifted past: the owner
asked for royalty-free photography and video in the demos, and for the marketing site's
preview components to show a truthful, higher-quality image of what each demo actually is.

This document records what the research found, every decision taken, and the checklist the
implementation is driven from. Companion to `docs/DEMO-SITES-PLAN.md`, which this builds on
and does not replace.

## 1. What is being upgraded, and what is not

Upgraded:

- The five demos gain licensed photography (hero, per-service, gallery) and — where a
  verified, in-budget clip exists — one ambient below-the-fold video, plus the UI/UX
  practices §3 supports: photo heroes with WCAG-safe scrims, CTA weighting flipped per
  trade, a sticky mobile call bar, aspect-locked image slots, tighter section rhythm.
- The marketing site's portfolio cards and industry-page demo cards stop showing abstract
  SVG mock-ups and start showing **real screenshots of the real demos**, captured from this
  repository's own build by `client/scripts/capture-previews.ts` (Chrome headless + sharp).
  A card that shows the real page can never drift from what clicking it reveals.
- `og-image.png` (1200×630 raster) replaces the SVG social preview — closing a limitation
  the README has carried since launch. Captured by the same script.

Not changing:

- **Invent the business, never the evidence.** Photography illustrates the work
  generically. No caption or alt text may claim a specific completed job, a location, a
  client, or an outcome. No before/after presented as this business's project. The
  `demos.test.ts` fabricated-proof sweeps stay and the new strings go through them.
- The disclosure bar, the inert form and inert call buttons, 555-01xx numbers, `.example`
  emails, no street address, `noIndex` on every demo route.
- The eager payload budget. All demo media rides in lazy-chunk imports; the eager JS/CSS
  ceilings are untouched.

## 2. Constraints the whole plan answers to

| Constraint                                                                                                 | Consequence                                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CSP `img-src 'self' data:`; `default-src 'self'` covers video                                              | Every asset is downloaded, licensed, and served from this origin. No hotlinking.                                                                                                                                                                                                                          |
| No ffmpeg on this machine; sharp added as a client devDependency                                           | Photos are fetched from the Unsplash CDN pre-sized (`?w=&q=&fm=`) and re-encoded locally by sharp where needed; videos are used exactly as the host serves them, so any clip that needs editing is a clip we don't use.                                                                                   |
| Pexels/Pixabay search pages block scripted fetches (403); Unsplash search pages and both file CDNs respond | Photo curation ran on Unsplash (every candidate viewed by a curation agent before selection); video candidates were verified by direct file-URL probes.                                                                                                                                                   |
| Vercel serves `/assets/*` with `Cache-Control: immutable`                                                  | Media are **imported from `client/src/assets/`** so Vite content-hashes them into `/assets/` — not dropped in `public/`, which is never hashed and can't be safely long-cached (also the Vite docs' own recommendation). `public/` keeps only stable-URL files: favicon, `og-image.png`, robots, sitemap. |
| Variants must exist as static files at deploy time (no image CDN possible)                                 | All responsive variants are pre-generated by `client/scripts/fetch-media.ts` and **committed**, so deploys never depend on Unsplash being up or on build-time encoding.                                                                                                                                   |
| Demo content modules are lazy chunks outside the content barrel                                            | Asset imports live in each trade's content module, so every image URL and its metadata ride the trade's own chunk. Nothing eager grows.                                                                                                                                                                   |

## 3. What the research found, and what this design does with it

Two research agents (trade-site UX; media performance) each returned 20+ sourced findings.
The load-bearing ones and their consequences here:

### Adopted

| Finding (source)                                                                                                                                                                       | Applied as                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Emergency trades: phone is the dominant above-fold action; considered trades (roofing, landscaping): quote/estimate is primary and phone secondary (NextLeft 2025, Skill Mammoth 2026) | New `heroLayout` per trade: `split` heroes for HVAC/plumbing/electrical keep the call button dominant; `immersive` full-bleed photo heroes for roofing/landscaping lead with the quote CTA. |
| Sticky bottom call bar on mobile, bottom-centre thumb zone (Rook Digital case study; Hoober via Smashing)                                                                              | New mobile-only sticky bottom bar on every demo: call (inert, as everywhere) + quote link. Sits under the disclosure bar in stacking order; never obscures it.                              |
| Generic staged stock is ignored; authentic on-the-job photography is read as content (NN/g eye-tracking)                                                                               | Curation rules banned staged clichés, logos, and faces-at-camera; only environmental work shots were accepted.                                                                              |
| Text over photos needs a scrim and 4.5:1 at the image's lowest-contrast point (NN/g; Smashing)                                                                                         | Immersive heroes paint a brand-tinted gradient scrim; text colour is `--demo-on-brand` on ≥82% brand-strong mix, which clears 4.5:1 regardless of the photo behind it.                      |
| One consistent aspect ratio per image slot, reserved with CSS `aspect-ratio` (web.dev CLS)                                                                                             | Every image slot is aspect-locked (heroes 3:2 split / 5:2 immersive band, service photos 4:3, gallery 3:2); all `<img>`/`<video>` carry real intrinsic `width`/`height`.                    |
| No carousels; no autoplaying **hero** video (NN/g; web.dev — autoplay hero video is a leading LCP failure)                                                                             | No carousels anywhere. Video is a single ambient, below-fold section: `preload="none"`, poster, muted loop `playsinline`, play/pause driven by an IntersectionObserver.                     |
| `prefers-reduced-motion` users should pay zero video bytes — skip attaching `src`, don't merely pause (web.dev)                                                                        | The ambient component checks `matchMedia` before ever setting a source; reduced-motion users get the poster as a static image.                                                              |
| Never lazy-load the LCP image; give it `fetchpriority="high"`, and only it (web.dev)                                                                                                   | Demo hero images are eager with `fetchpriority="high"`; every other image is `loading="lazy" decoding="async"`.                                                                             |
| Hero ≤150–200 kB (2x variant), cards 20–60 kB, gallery 80–150 kB (corewebvitals.io and peers)                                                                                          | `fetch-media.ts` enforces these as hard caps and fails loudly if an encode lands over budget.                                                                                               |
| AVIF ~25% smaller than WebP, both ~95%+ supported in 2026 (caniuse)                                                                                                                    | Heroes ship `<picture>` AVIF+WebP (biggest asset, biggest saving); service/gallery images ship WebP-only srcset — doubling the file count for ~15 kB per small image wasn't worth it.       |
| `srcset` widths from rendered slot × DPR, `sizes` describing the layout, capped at 2x (web.dev)                                                                                        | Split hero 640/960/1280; immersive 768/1280/1920; service 416/832; gallery 600/1200 — derived from the 78rem shell's actual grid.                                                           |
| Ambient loops: 720p, ≤10s, ≤2–5 MB, else use a static image (web.dev; SitePoint)                                                                                                       | Adopted at ≤3.5 MB. Roofing's only verified candidates were 7.9 MB or geographically wrong (Paris rooftops), so **roofing ships photo-only** — the rule applied, not the checkbox.          |
| Quote forms: 3–5 fields, one light qualifying question; email-only converts worse (HubSpot; CXL)                                                                                       | Already true of all five demo forms (4 questions each). No change — recorded so nobody "optimises" them down to email-only later.                                                           |

### Seen and deliberately not applied

These are real findings a **real client site** should use. On a fictional demo each one is
manufactured evidence, which this repository does not do (`content/demos/types.ts`):

- Licence numbers, certification badges (NATE, GAF), and Google ratings in the hero.
- Named testimonials with neighbourhood and job detail, placed beside the form.
- Before/after pairs presented as the business's own projects.
- Response-time promises ("30-minute callback") — a promise nobody exists to keep.

They belong in the sales conversation ("your real site gets the trust strip these demos
legally can't fake") — a line `docs/business-offer.md` §2 already supports.

## 4. Licensing and provenance

All sources verified current as of 2026-08 by fetching the licence pages themselves:

| Source                  | Licence             | Commercial | Attribution  | The trap to respect                                                                                                                   |
| ----------------------- | ------------------- | ---------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Unsplash (free tier)    | Unsplash License    | Yes        | Not required | Unsplash+ premium content is a stricter, paid licence — only free-tier `images.unsplash.com` IDs are used, never `plus.unsplash.com`. |
| Pexels (photos, videos) | Pexels License      | Yes        | Not required | No implying endorsement by pictured people; identifiable people never in a bad light.                                                 |
| Mixkit (videos)         | Mixkit Free License | Yes        | Not required | Mixkit also hosts a **Restricted** non-commercial tier — each clip's tier is verified and recorded before use.                        |

Every asset gets a row in `docs/MEDIA-CREDITS.md`: local path, title, source page URL,
author, licence + URL, download date, modifications. Attribution is legally unnecessary
for all three sources; the file exists because the licence in force is the one at download
time (Coverr added an AI clause; Unsplash added a premium tier), and a dated provenance
record is the defence against both licence drift and bogus claims. `demos.test.ts` gains a
guard: every media file under `src/assets/demos/` must have a credits row, and vice versa.

## 5. The design, concretely

- **Types** (`content/demos/types.ts`): new `DemoImage` (`src`, `srcset?`, `avifSrcset?`,
  `alt`, `width`, `height`) and per-site `media` block (hero + gallery + optional ambient
  video with poster); `DemoService` gains optional `image`. `heroLayout: 'split' |
'immersive'` on `home`. `DemoSceneName`/`scene` and `DemoScene.tsx` are **deleted** —
  the SVG scenes existed because photography wasn't possible; keeping both would be two
  competing answers to one question. The type header's "no photographs, ever" note is
  rewritten to say what is now true: photographs of generic work, never of claimed jobs.
- **Assets**: `client/src/assets/demos/<slug>/` (imported, hashed, immutable-cached) +
  `client/src/assets/portfolio/<slug>.webp` (screenshots). `client/scripts/fetch-media.ts`
  downloads from a checked-in manifest (`client/scripts/media.manifest.json`) and
  re-encodes with sharp; outputs are committed.
- **Templates**: hero branches on `heroLayout`; gallery strip on the homepage (landscaping
  gets the image-led variant its portfolio card promises); services page renders a 4:3
  photo per service when present; ambient video section (4 trades) between services and
  area sections; sticky mobile call bar in `DemoShell`.
- **Marketing site**: `portfolio.ts` swaps SVG mock-ups for screenshot imports with honest
  alt text; the old `public/portfolio/*.svg` are deleted; `site.ts` `ogImage` →
  `/og-image.png` (`image/png`).

## 6. The checklist

- [x] Research: UX, performance, licensing, video scouting, five photo curations (workflow)
- [x] Screenshot pipeline: `capture-previews.ts` + `npm run capture`, proven end-to-end
- [x] `media.manifest.json` written from curated photo IDs + chosen clips
- [x] `fetch-media.ts` downloads, re-encodes, enforces byte budgets; assets committed
- [x] `docs/MEDIA-CREDITS.md` with one verified row per asset
- [x] Types: `DemoImage`, `media`, `heroLayout`, `DemoService.image`; scenes deleted
- [x] Five content modules gain media blocks with production-quality alt text
- [x] `DemoHomePage`: split/immersive hero, gallery strip, ambient video section
- [x] `DemoServicesPage`: per-service photos
- [x] `DemoShell`: sticky mobile call bar
- [x] `Demo.module.css`: new sections, scrim, aspect-locked slots, media queries in order
- [x] Marketing site: screenshot thumbnails imported, SVG mock-ups deleted, og-image PNG
- [x] Guards: credits coverage test, media-shape tests, alt-text sweeps still green
- [x] Recapture screenshots from the upgraded build
- [x] `npm run verify` green; budget unchanged; all 32 pages still prerender

## 7. What actually happened

The plan held. Where reality pushed back, and what each push cost or taught:

- **Nine-agent research workflow, then judgment.** Four researchers (UX, performance,
  licensing, video) and five photo curators who downloaded and _looked at_ 25+ thumbnails
  per trade. Their rejection logs are the evidence the curation was real: Carrier and
  KOBALT logos, "Authorized Installer" shirts, a Mercedes van badge with a partial plate,
  palm trees, terracotta roofs, camera-facing poses — all rejected before selection.
- **The video scout's "verified" meant reachable, not right.** All ten clips had working
  URLs; frame-checking them through headless Chrome rejected four of five first choices: a
  window unit with a readable "GoldStar" brand mark, a derelict painted-over condenser,
  barefoot trimming among tropical plants, and hobby electronics in a trademarked Pokémon
  shirt. Final set: plumbing (0.96 MB), electrical (1.21 MB), landscaping (3.87 MB —
  within the research's 2–5 MB range, over the preferred 3.5 MB line, taken with eyes
  open). HVAC and roofing ship photo-only, which is the research's own decision rule
  applied, not a gap.
- **The byte-budget guard fired eleven times on its first run — all foliage.** Grass and
  leaves are the highest-entropy content WebP meets, and one demo is a landscaping
  company. The fix was format policy, not quality mush: every photo ships AVIF+WebP, the
  budget is enforced on the AVIF ~95% of browsers download, and the WebP fallback gets
  2.0× (raised from 1.8× for exactly two dense-foliage gallery fallbacks, recorded in
  `fetch-media.ts`).
- **Provenance was recoverable, then almost wrong.** Author names and photo-page URLs were
  extracted from the scouts' saved search pages — where a nearest-slug-backwards heuristic
  attributed one photo to a _premium_ neighbour. Re-anchored forwards on each photo
  object's own `links.html` and spot-verified by fetching pages and matching `og:image`
  back to the CDN id. All 54 photos have verified author + page + licence rows.
- **Three photos were dropped in curation review, and one swapped after a screenshot.**
  HVAC's commercial-rooftop shot and roofing's low-slope-commercial crew contradicted
  their own demos' copy ("flat commercial roofs are outside what we take on");
  plumbing's tub-faucet close-up duplicated the gallery. The roofing services page
  screenshot then showed the leak-repair and replacement cards wearing two frames from
  the same photo session — swapped the replacement card to the tear-off shot.
- **The old "no photographs, ever" comment was rewritten, not deleted.** Its CSP reasoning
  was solved by self-hosting; its honesty reasoning was drawn too wide and is now precise:
  photographs of kinds of work, never captions claiming jobs, customers, crews or
  neighbourhoods. The fabricated-proof sweeps run over every alt text because the media
  blocks are part of the demo objects `collectStrings` already walks.
- **The findings that were deliberately not applied are §3's second table** — licence
  numbers, ratings, named testimonials in the hero. They are what a _real_ client site
  gets, and their absence here stays a sales argument, not an oversight.
- **What the eager bundle paid for all of this: 0.4 kB** (five hashed screenshot URLs in
  `portfolio.ts`). Everything else rides the demo lazy chunks: each trade's homepage now
  costs its visitors one eager hero image (AVIF, ≤160–200 kB budget) plus lazy media as
  they scroll. Final: eager JS 461.5 kB / 465 kB budget, CSS 88.0 kB / 95 kB, 32 pages
  prerendered, 532 tests green.

Owner follow-ups (in addition to `docs/DEMO-SITES-PLAN.md` §10, which still stands):

1. Play the three ambient clips in a real browser once — frame checks sampled stills, not
   full clips.
2. The landscaping clip is 3.87 MB; if it ever feels heavy on a phone, the recorded
   fallback is to remove it and let the poster stand.
