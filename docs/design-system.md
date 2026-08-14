# The JobForge design system

One palette, one type scale, one set of primitives, and five tests that stop all of it
drifting. This document is the map; `client/src/styles/tokens.css` is the source of truth.

---

## 1. Where it lives

This repository is a two-workspace npm project (`client`, `server`), not a monorepo with a
`packages/ui`. The design system is therefore a set of directories inside the client rather
than a published package, and the layering is enforced by dependency direction rather than
by a package boundary:

```
client/src/styles/tokens.css        FOUNDATION + SEMANTIC TOKENS
client/src/styles/global.css        the reset, base type, links, focus
        ↓
client/src/components/ui/           PRIMITIVES   Button, Field, Layout, Icon, Reveal
client/src/components/brand/        the logo lockup
        ↓
client/src/components/patterns/     PATTERNS     ScoreScale
client/src/components/marketing/    composed marketing blocks
        ↓
client/src/features/public/*        FEATURE COMPONENTS
        ↓
client/src/features/public/*/​*Page  PAGES
```

The rule that matters is the one that runs in the other direction: **nothing below
redefines anything above.** A feature stylesheet may compose tokens; it may not invent a
colour, a breakpoint or a stacking order. That is not a convention here — see §6.

There is deliberately no `packages/ui`, no `apps/admin`, and no `Modal`, `Tooltip`,
`Switch` or `Avatar` primitive. See §7.

---

## 2. Tokens

**Foundation** — the four brand literals:

```
Forge Charcoal  #17191E      Ember Orange  #E85C24
Cast Cream      #F3EEE4      Pure White    #FFFFFF
```

These are documented in the comment at the top of `tokens.css` rather than declared as
`--brand-*` custom properties, which is a considered trade. A foundation layer earns its
keep when the semantic tokens _reference_ it, so that changing one literal changes twenty
values. Here every semantic token is a single value chosen for a measured contrast ratio
against a measured ground — `--color-accent-text` is not "ember, darker", it is the one
ember that clears 4.5:1 on cream — so the indirection would resolve to nothing a re-skin
could safely turn. Four unreferenced properties in the first stylesheet every visitor
downloads is a real cost; a comment is stripped at build time.

**Semantic** — what the application actually consumes, and the layer to reach for. Named
for the job, never for the value: `--color-ink-muted`, `--color-surface-dark`,
`--color-border-strong`.

**Component** — the few places a primitive needs its own mapping. Kept to a minimum,
because a component token used once is a rename, not an abstraction.

### The accent is three values, and they are not interchangeable

This is the single thing to understand before touching a colour. Ember Orange is a _light_
colour, which is what makes it read as heat and also why it cannot do every job:

| Token                   | Value     | Use it for                                          |
| ----------------------- | --------- | --------------------------------------------------- |
| `--color-accent`        | `#E85C24` | Rules, bars, icons, marks, and text **on charcoal** |
| `--color-accent-strong` | `#C4471A` | Fills carrying white text — the primary button      |
| `--color-accent-deep`   | `#A2360F` | The hover/pressed state of such a fill              |
| `--color-accent-text`   | `#B03E14` | Links and inline emphasis on cream or white         |

`--color-accent` is **3.0:1 on cream**. It is never body text on a light ground. Reaching
for the wrong one of these is the easiest way to fail an audit here, which is why §6 has a
test that measures rather than trusts.

### Surfaces

The page ground is **Cast Cream**, not white. That one line in `global.css` is what makes
white a _raised_ value, so every card lifts off the page instead of dissolving into it.

```
#FFFFFF  --color-surface        cards, forms — raised
#F3EEE4  --color-page           the page ground
#EAE4D8  --color-surface-muted  alternating bands, wells
#DFD8C9  --color-surface-sunken deeper wells
#17191E  --color-surface-dark   header, footer, anchor bands
```

On a charcoal band, text is `--color-ink-inverse` (cream, 15.2:1) and secondary text is
`--color-ink-inverse-muted` (8.5:1). Never `--color-tint-brand` — that is a _background_
value, and as text on dark it lands within a shade of the primary and flattens the
hierarchy.

### The other scales

- **Type** — `--text-xs` … `--text-4xl`, fluid `clamp()` in rem so they respond to the
  reader's browser font size. Weights `--weight-regular` … `--weight-extrabold`. Archivo at
  800 is the display weight; `h1`/`h2` take it, `h3` down does not.
- **Space** — a 4px scale, `--space-1` … `--space-11`, plus `--space-hair` (2px) for
  insets where the base step reads as a gap.
- **Radius** — `--radius-xs` (2px, small controls), `sm` (8px), `md` (12px), `lg` (20px),
  `full`.
- **Shadow** — `--shadow-sm/md/lg`, plus `--shadow-card` for white-on-cream lift. All warm:
  a neutral-grey shadow reads as dirt on a cream ground.
- **Motion** — `--transition-fast` and `--transition-base` carry their own easing because
  they are used in the `transition` shorthand; `--ease-emphasised` is separate, because a
  keyframe animation sets easing apart from duration.
- **Layering** — `--z-raised` (10), `--z-sticky` (20), `--z-overlay` (40). Only the layers
  the application has. The numbering leaves the gaps for the ones it does not — a dropdown
  at 30, a modal at 50, a toast at 60 — to be declared in the same commit as the component
  that needs one.
- **Breakpoints** — six steps: `26 / 30 / 48 / 60 / 64 / 80rem`. Mobile-first; the three
  `max-width` rules are all "undo this below the step that introduced it" and use the step
  minus `0.001rem`.

Breakpoints cannot be custom properties (a media query cannot read one), so the scale is
held by a test instead.

---

## 3. Primitives

In `components/ui/`. Each has controlled variants and sizes, and none exposes a style prop
that would let a caller bypass the system.

| Primitive                                 | What it is                                                 |
| ----------------------------------------- | ---------------------------------------------------------- |
| `Button` / `ButtonLink`                   | `primary`, `secondary`, `inverse`, `ghost` × `md`, `lg`    |
| `TextField` `TextAreaField` `SelectField` | labelled controls with hint, error and `aria-describedby`  |
| `RadioGroupField`                         | a single-choice question as a list of full-width rows      |
| `Honeypot`                                | the off-screen spam decoy                                  |
| `Container` `Section` `SectionHeading`    | width, rhythm and section tone (`default`/`muted`/`brand`) |
| `Card` `Badge` `Grid`                     | surface, label and column primitives                       |
| `Icon`                                    | the only inline SVG in the application                     |
| `Reveal`                                  | the one entrance animation, reduced-motion aware           |

**`Button` versus `ButtonLink` is not a style choice.** Something that _does_ a thing is a
`<button>`; something that _goes_ somewhere is an `<a>`. Swapping them breaks keyboard
behaviour, screen-reader announcements and the browser's own "open in new tab" — silently.
`ButtonLink` renders a router `Link` for internal paths and a plain anchor otherwise, and
only adds `target="_blank"` for `http(s)` URLs, never for `tel:` or `mailto:`.

---

## 4. Patterns

In `components/patterns/`. A pattern combines primitives into a recurring _solution_ and
holds no business logic.

**`ScoreScale`** — a question, a row of numbered tiles, one of them chosen. Both
self-scoring tools compose it: `/audit` (twenty categories, five points) and the PlayBook
assessment (forty points across three). It knows nothing about categories, scores or
storage; `onSelect` hands back a number.

It is not `Field`'s radio group, and that is deliberate: `RadioGroupField` is a vertical
list of rows with a _visible_ native radio and a sentence of text. `ScoreScale` is a
horizontal scale of tiles with the radio hidden, where the number carries the meaning.
Merging them would make one component with a prop switching between two unrelated layouts.

---

## 5. The brand mark

`components/brand/Logo.tsx` — Direction B from the brand board, the "Forge Stamp": a solid
struck tile with the J and F cut out of it and one ember bar.

It is inline SVG driven by three custom properties rather than an `<img>`, because it has
to invert: on a charcoal band the tile takes the cream and the letterforms cut back to
charcoal. `LogoMark` is `aria-hidden` when the wordmark is beside it.

The geometry exists in **three** places, and they must be changed together:

1. `components/brand/Logo.tsx` — the application
2. `public/favicon.svg` — requested before any application code exists
3. `scripts/capture-previews.ts` — the `apple-touch-icon.png` source, full-bleed because
   iOS applies its own squircle mask and would otherwise double-round it

`public/og-image.svg` carries a fourth copy inside a full social card; `npm run capture`
rasterises it.

`public/favicon.ico` is **not** a fifth copy — `npm run icons` rasterises it out of
`public/favicon.svg` at 16/32/48px, so it cannot drift on its own. It exists because
Safari has never supported an SVG favicon and because `/favicon.ico` is requested by
consumers that never read the HTML. Re-run `npm run icons` after changing the mark.

---

## 6. What is enforced, and how

Five tests in `client/src/styles/tokens.test.ts`. Each one failed against the codebase when
it was written, was fixed, and now cannot come back. Each was also verified to _fail_ on an
injected violation — a guardrail that cannot fail is decoration.

| Rule                         | What fails                                                             |
| ---------------------------- | ---------------------------------------------------------------------- |
| No raw UI colour             | a literal in `color`, `background`, `border-*-color`, `fill`, `stroke` |
| One layering scale           | any `z-index` that is not a `--z-*` token                              |
| One breakpoint scale         | a `min-width` off the six steps, or a `max-width` not step − 0.001rem  |
| **AA on every stated pair**  | a `color` + `background-color` in one rule measuring under 4.5:1       |
| Type and radius from a scale | a `font-size` or `border-radius` outside `--text-*` / `--radius-*`     |

The fourth is the one worth understanding. Tokenising a colour does not stop somebody using
the _wrong_ token, so that test computes real WCAG contrast from the real hex values for
every rule that states both a foreground and a background. It also asserts its own palette
table still matches `tokens.css`, so it can never quietly measure colours the site no
longer uses.

Three further rules live in `content/content.test.ts`: no class defined twice at the top
level of a module, no class that nothing renders, and no narrow `min-width` rule that a
later wider one always beats.

### Deliberately not banned

`box-shadow` colour literals (there is no useful token for "black at 18% going upward"),
and the five demo sites, which are five _other businesses'_ brands driven by `--demo-*`
properties and are meant to look nothing like this one. A rule that fires on legitimate CSS
is a rule somebody deletes.

One consequence of that split is worth stating rather than leaving to be discovered.
`--demo-*` covers colour but not type, so the demos inherit `--font-sans` and all five now
render in Archivo alongside the marketing site. That is defensible — they are one firm's
work product, and a neutral grotesk does not read as a logo — but it is a brand decision
made by omission rather than on purpose. If the demos should look like five unrelated
businesses down to the typeface, the fix is a `--demo-font` per trade, not an exception
here.

### Exceptions

`EXCEPTIONS` in `tokens.test.ts` is checked in both directions: an entry excuses a file, and
an entry that no longer matches anything **fails the test**. An exception cannot outlive the
thing it was granted for.

Two exist:

- **`Value.module.css`** — `.mockCramped` is 11px, off the type scale. It depicts a
  badly-built website; rounding it onto the scale would make the "before" legible and
  delete the argument the section exists to make.
- **`DeviceFrame.module.css`** — the phone bezel radius (22px) and its screen (16px) depict
  hardware, not the brand. A shell radius larger than the screen radius is what makes the
  frame read as a phone.

---

## 7. What this system does not have, on purpose

No `Modal`, `Dialog`, `Tooltip`, `Popover`, `Switch` or `Avatar` primitive — **the
application contains no modal, dialog, tooltip, popover, switch or avatar.** Adding them
would ship dead CSS on every visit, and this repository has a test that fails the build for
exactly that (`defines no class that nothing renders`) plus a payload budget that measures
what the first screen costs. A primitive is added when the second usage appears, not before.

No CSS framework, no icon library, no `packages/ui`, no Storybook. The component surface is
ten primitives and one pattern across a fifteen-route marketing site; a documentation
dependency would be larger than the thing it documents. The tests in §6 and the examples in
the codebase are the documentation.

---

## 8. Adding to it

1. **A colour** → add a semantic token to `tokens.css` with its measured contrast in the
   comment. If it is a new brand value, add the foundation literal too.
2. **A component** → is it a primitive (a building block), a pattern (a recurring solution
   built from primitives), or feature composition? Business logic never crosses into
   `components/`.
3. **A breakpoint** → add it to `BREAKPOINTS` in `tokens.test.ts` _and_ to the note in
   `tokens.css`, and say what it is for. Six is not a target.
4. **An exception** → add it to `EXCEPTIONS` with a sentence explaining why the rule is
   genuinely wrong for that file. "It was already like that" is not one.
