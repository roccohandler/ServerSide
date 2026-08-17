# The JobForge design system

Two measured palettes, one type scale, one set of primitives, and eight tests that stop all of
it drifting. This document is the map; `packages/ui/src/styles/tokens.css` is the source of truth.

---

## 1. Where it lives

This repository is five npm workspaces — two frontends, a server and two shared packages. The
design system is a published package both applications depend on, and the layering is enforced
by that package boundary as well as by dependency direction:

```
packages/ui/src/styles/tokens.css        FOUNDATION + SEMANTIC TOKENS
packages/ui/src/styles/global.css        the reset, base type, links, focus
        ↓
packages/ui/src/                         PRIMITIVES   Button · Card · Badge · Field · Icon
                                                      Layout · Reveal · cx
                                                      Table · Tabs · Modal · Drawer
                                                      Toast · Tooltip · Switch · Avatar
        ↓
packages/ui/src/                         SHARED BEHAVIOUR  useResource · useAnnouncerState
                                         (renders nothing)  useDelayedFlag · useOnlineStatus
                                                            useTheme · useUnsavedChanges
        ↓
apps/client/src/components/patterns/     PATTERNS   AppState · Notice · InlineConfirm
apps/admin/src/components/                          RouteFallback · Announcer · OfflineNotice
                                                    ScoreScale · DeviceFrame
        ↓
apps/*/src/session/                      SHARED ROOTS  state two boundaries both need
        ↓
apps/*/src/features/<boundary>/*         FEATURE COMPONENTS
        ↓
apps/*/src/features/<boundary>/*/*Page   PAGES
```

**The pattern layer is duplicated between the two applications, deliberately.** DECISION 027
settles it: behaviour is worth one copy and appearance is worth two. `useResource` and the three
hooks beside it render nothing and live in the package; `AppState`/`State`, `Notice`,
`InlineConfirm` and the offline notice render words and colour, and the two surfaces must not
look alike — an operator with both open should be able to tell which one holds five other
businesses' data.

The rule that matters is the one that runs in the other direction: **nothing below
redefines anything above.** A feature stylesheet may compose tokens; it may not invent a
colour, a breakpoint or a stacking order. That is not a convention here — see §6.

**`components/` may not import `features/`.** ESLint fails the build on it. Shared UI that
knows a business capability cannot be used without that capability coming with it. When a
shared component needs something a feature knows, it takes it as a prop — or, if the thing
is genuinely session-wide state, it moves to a shared root. `apps/client/src/session/` is the
worked example: `Header`, `AppLayout` and `WorkspaceBar` all imported
`features/auth/useAuth`, which inverted the direction, so the auth context moved above the
feature layer where all three could reach it legitimately.

`packages/ui` and `apps/admin` both exist now — this section used to say neither should.
The primitives moved out of `apps/client/src/components/ui/` into `@jobforge/ui` when the
owner console became a second bundle that had to render the same buttons and fields; the
argument against a package was that there was one consumer, and there are two. `Modal`,
`Drawer`, `Toast`, `Tooltip`, `Switch` and `Avatar` were added on 2026-08-15 under
DECISION 029 — §7 is the inventory and the argument.

`@jobforge/ui` also holds six things that are not primitives, because they render nothing:

| Hook                | Why it is shared                                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useResource`       | Both applications load-one-thing-then-act-on-it. Two copies had already drifted on what happens after a _failed_ write.                                                     |
| `useAnnouncerState` | _When a message counts as new_ is one piece of behaviour; the region it lands in and the words in it belong to each surface.                                                |
| `useDelayedFlag`    | The threshold below which a loading state is not worth showing. Five comments across both apps argued for it and none had a number, so all five spelled it "nothing, ever". |
| `useOnlineStatus`   | Both shells need to know whether the browser has a network; each says so in its own voice.                                                                                  |
| `useTheme`          | What `data-theme` may say, where it is stored, and what happens when two tabs disagree. Each application draws its own three-state control.                                 |
| `useUnsavedChanges` | `beforeunload` plus a capture-phase click listener. Both applications had the first half, written twice; neither had the second. See it before reaching for a data router.  |

Nothing else non-visual belongs there without the same two-consumers-today argument.

### The import surface

`@jobforge/ui`'s barrel is the design system's public API and is safe to import from
anywhere: everything it exports is in the eager bundle already, so a static import through
it costs nothing that was not already downloaded.

That is **not** true of `lazy()`. Routing a dynamic import through any barrel merges
chunks `scripts/check-budget.ts` exists to keep apart, which is why every `lazy()` call in
`app/routes/*.tsx` reaches a concrete module. It is the one sanctioned exception to the
entry-point rule, and it is load-bearing rather than an oversight.

The console does not split at all, and that is also deliberate: four screens behind a
sign-in, opened by one person all day, where a spinner between Inbox and Projects would
cost more than the smaller first paint buys. See `apps/admin/src/app/App.tsx`.

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

### There are two palettes, and neither is derived from the other

Since 2026-08-16 (DECISION 030). Every semantic colour is declared three times in
`tokens.css`: light on `:root`, dark under `@media (prefers-color-scheme: dark)` guarded by
`:not([data-theme='light'])`, and dark again under `[data-theme='dark']` so an explicit choice
beats the operating system in either direction.

**None of the dark values is a light value inverted.** That is not a stylistic position, it is
forced by the paragraph above: there is no foundation tier because each token is an
independently measured ratio against a specific ground, so a flipped `#B03E14` clears nothing in
particular. All twenty-three were chosen and measured again, and `tokens.test.ts` computes AA
over both sets on every build.

Three things change role rather than value, and they are the ones to understand:

| Token                                                                 | In dark                                                                                                                                              |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--color-ink`, `--color-brand`                                        | **invert.** They are "the colour text is" and they follow the ground.                                                                                |
| `--color-ink-inverse`, `--color-surface-dark`, `--color-brand-strong` | **do not.** A charcoal band is still charcoal at night; the band simply goes deeper than the page instead of darker than it.                         |
| `--color-on-accent`                                                   | **inverts from white to charcoal**, because the ember fill under it gets _brighter_ rather than deeper. A dark interface wants a lit primary button. |

`--color-accent` does not change at all: it was always the value chosen to work on charcoal
(5.0:1), and in dark the whole page is charcoal. The `--shadow-*` set is rewritten, because
charcoal at 6% alpha over charcoal is nothing at all and elevation is what separates a card from
the page once both are dark.

The reader chooses with a three-state control — **System / Light / Dark** — in the marketing
footer, the workspace footer and the console bar. `useTheme` in `@jobforge/ui` holds the
behaviour; each application draws its own control. The third state is the default and the one
most people want, which is why it is not a switch.

`@media print` redefines eighteen of these tokens to a print palette, so every rule in five
workspaces prints black on white without knowing anything about print — including rules written
later. `@media (forced-colors: active)` blocks live at the foot of each component that carried
meaning in a fill; see §6 rule 8.

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
- **Layering** — `--z-raised` (10), `--z-sticky` (20), `--z-dropdown` (30), `--z-overlay` (40),
  `--z-modal` (50), `--z-toast` (60). Only three existed until 2026-08-15, and the numbering
  left the gaps for the three that did not — "a dropdown belongs at 30, a modal at 50, a toast
  at 60", said in a comment years before anything needed one. DECISION 029 declared them, in
  the same change as the components that use them, which is the rule that comment stated.
  The one worth reading twice is `overlay` sitting _below_ `modal`: the skip link is chrome, a
  dialog is a thing the reader asked for, and a skip link painted over an open dialog would be
  the site interrupting itself.
- **Breakpoints** — six steps: `26 / 30 / 48 / 60 / 64 / 80rem`. Mobile-first; the three
  `max-width` rules are all "undo this below the step that introduced it" and use the step
  minus `0.001rem`.

Breakpoints cannot be custom properties (a media query cannot read one), so the scale is
held by a test instead.

---

## 3. Primitives

In `components/ui/`. Each has controlled variants and sizes, and none exposes a style prop
that would let a caller bypass the system.

| Primitive                                 | What it is                                                    |
| ----------------------------------------- | ------------------------------------------------------------- |
| `Button` / `ButtonLink`                   | `primary`, `secondary`, `inverse`, `ghost` × `md`, `lg`       |
| `TextField` `TextAreaField` `SelectField` | labelled controls with hint, error and `aria-describedby`     |
| `RadioGroupField`                         | a single-choice question as a list of full-width rows         |
| `Honeypot`                                | the off-screen spam decoy                                     |
| `Container` `Section` `SectionHeading`    | width, rhythm and section tone (`default`/`muted`/`brand`)    |
| `Card` `Badge` `Grid`                     | surface, label and column primitives                          |
| `Icon`                                    | the only inline SVG in the application                        |
| `Reveal`                                  | the one entrance animation, reduced-motion aware              |
| `Table` `TableCell`                       | a scrollable, keyboard-reachable table that stacks below `md` |
| `Tabs`                                    | links that look like tabs — a `<nav>`, never a tablist        |
| `Modal` `Drawer`                          | focus-trapped dialogs, centred and edge-anchored              |
| `Toast`                                   | a message that outlives a navigation                          |
| `Tooltip`                                 | a description, on focus as well as hover                      |
| `Switch`                                  | a setting that takes effect when flipped                      |
| `Avatar`                                  | initials, with an image as the exception                      |

The last seven arrived together on 2026-08-15 — DECISION 029, and §7 is the inventory of what
they are for and what is still absent.

**`Table` requires a label per cell, and that is the whole reason it is a component.** Below the
tablet step it stacks into labelled rows, and the column name moves into the cell from
`data-label`. A `data-label` somebody forgets is invisible on the desktop where it is written and
wrong on the phone where it is read; a required prop cannot be forgotten and a shared class can.

**`Tabs` renders `NavLink`s and is deliberately not an ARIA tablist.** That pattern describes
panels swapped by JavaScript inside one document — arrow-key navigation, one panel at a time, no
URL for any of them. The project page's four views are real routes so a customer can send
somebody a link to their preview and the back button works, and dressing them as tabs would
announce a keyboard model the links do not implement.

**`Modal` and `Drawer` duplicate forty lines of focus handling on purpose.** A `side` prop on one
component would be two components sharing a name — composition rule 1 — because everything a
reader can see differs and only the behaviour is common. A `useFocusTrap` hook is the extraction
if a third overlay ever lands; at two, the Rule of Three says wait.

**`Toast` carries no live-region role.** Both applications own exactly one `aria-live` region
each, and two regions announcing one outcome is worse than none — the reader hears it twice and
stops trusting either. Whatever opens a toast announces through the shell.

**`Button` versus `ButtonLink` is not a style choice.** Something that _does_ a thing is a
`<button>`; something that _goes_ somewhere is an `<a>`. Swapping them breaks keyboard
behaviour, screen-reader announcements and the browser's own "open in new tab" — silently.
`ButtonLink` renders a router `Link` for internal paths and a plain anchor otherwise, and
only adds `target="_blank"` for `http(s)` URLs, never for `tel:` or `mailto:`.

**`loading` versus `disabled` is not a style choice either.** `disabled` means _not
applicable_ — there is nothing to submit, a precondition is unmet. `loading` means
_temporarily busy_ — the thing you asked for is happening. Twenty-seven call sites spelled
the second as the first, and a native disabled button leaves the tab order the instant it
becomes disabled: a keyboard user pressing Enter on "Send request" lost focus mid-submit
and was returned to the top of the document with nothing announced. `loading` renders
`aria-disabled` and `aria-busy`, keeps the button focusable, and blocks activation itself.
Both props exist because a control can be either or both — `FeedbackThread`'s reply button
is busy _or_ has an empty box, and those want different words from a screen reader.

---

## 4. Patterns

In `components/patterns/`. A pattern combines primitives into a recurring _solution_ and
holds no business logic.

**`AppState`** — `AppLoading`, `AppError` and `AppEmpty`: the three things every
data-backed page has to be able to say. Eleven call sites across the customer portal and
the owner console. It used to live inside `features/private/components/`, where three
admin files reached across a boundary to get it — a pattern used by two boundaries living
inside one of them. Promotion was justified by that actual repeated use, not by
anticipating it. It composes `Button` and `ButtonLink` rather than styling its own retry
control; the `.retry` and `.emptyAction` rules it used to carry were deleted.

**`DeviceFrame`** — `BrowserFrame` and `PhoneFrame`, the chrome around a screenshot. Six
features compose it. It was in `components/marketing/`, which was the wrong shelf: it is
not marketing copy, it is a presentation pattern, and the admin console uses it too.

**`Notice`** — one message shape for anything said _about an operation_, as opposed to
`AppState`, which is about the page's own data. `AppError` replaces the content; a `Notice` sits
beside content that is fine. It replaced **thirteen** hand-written treatments across eleven files
and five stylesheets — `.banner`, `.bannerAction`, `.error` ×6, `.actionError`, `.note`,
`.problem` — which differed in a border, a tint, and in whether they carried an ARIA role at all.
Its `tone` decides the role: `problem` is `role="alert"` and interrupts, `success` and `info` are
`role="status"` and wait. Tying the two together is the point — the wrong answer is invisible,
because a `role="status"` that should have been `alert` renders identically and simply fails to
interrupt. Duplicated per application: one in `apps/client`, one in `apps/admin`.

**`InlineConfirm`** — a question and two buttons, rendered in place of the control that asked it.
Not a dialog: no overlay, no focus trap, no scroll lock, no stacking layer. That is right for a
confirmation, because the thing somebody most wants when asked "are you sure?" is to look again
at what they were about to do. `ApprovalPanel` invented the shape; the console's milestone change
and its two reply boxes are the second, third and fourth consumers. `role="group"` rather than
`alertdialog`, which would promise a modality that does not exist.

**`RouteFallback`** — what a lazy route looks like while it is still arriving. Nothing for the
first 400 ms, which is what five `Suspense fallback={null}` boundaries and two `return null`
guards did before and what their comments actually justified; past that, bars and a
`role="status"`. The threshold is `useDelayedFlag` in `@jobforge/ui`, so it is one number rather
than two.

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

Eight tests in `packages/ui/src/styles/tokens.test.ts`. Each one failed against the codebase when
it was written, was fixed, and now cannot come back. Each was also verified to _fail_ on an
injected violation — a guardrail that cannot fail is decoration.

| Rule                         | What fails                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| No raw UI colour             | a literal in `color`, `background`, `border-*-color`, `fill`, `stroke`                                           |
| One layering scale           | any `z-index` that is not a `--z-*` token                                                                        |
| One breakpoint scale         | a `min-width` off the six steps, or a `max-width` not step − 0.001rem                                            |
| **AA on every stated pair**  | a `color` + `background-color` in one rule measuring under 4.5:1                                                 |
| Type and radius from a scale | a `font-size` or `border-radius` outside `--text-*` / `--radius-*`                                               |
| Spacing from the rhythm      | a `margin`, `padding` or `gap` in `rem`/`px` that is not a `--space-*`                                           |
| **No side hard-coded**       | `padding-left`, `inset`-less `right:`, `text-align: left` — anything on the inline axis with a physical spelling |
| **System colours in place**  | `CanvasText`, `Highlight`, `ButtonFace` outside a `@media (forced-colors: active)` block                         |

The fourth is the one worth understanding. Tokenising a colour does not stop somebody using
the _wrong_ token, so that test computes real WCAG contrast from the real hex values for
every rule that states both a foreground and a background. It also asserts its own palette
table still matches `tokens.css`, so it can never quietly measure colours the site no
longer uses.

Since 2026-08-16 it does that **twice — once per palette** — because there are two. It also
asserts that the two blocks declaring the dark values (`@media (prefers-color-scheme: dark)` and
`[data-theme='dark']`) say exactly the same thing, which is the guard on the one duplication
`tokens.css` accepts. The first run of the two-palette version found a live defect: a homepage
chip that paired `--color-ink` with `--color-ink-inverse` and measured **1.00:1** in dark, having
worked in light only because cream is both "text on a dark band" and "the page ground" there. A
second palette is, in effect, a type system for colour roles.

The seventh and eighth were added with dark mode and forced colours. Rule 7 is a **spelling**
rule rather than a feature: `padding-inline-start` is the same length as `padding-left` and knows
which way the document reads, and there were 139 of the older spelling against 68 of the newer,
which is two habits rather than a decision. It covers the inline axis only — `margin-top` and
`border-bottom` are physical too, and nothing but a `writing-mode` change turns them. It also
cannot count its own offenders, because its job is to leave zero; it counts the _logical_
spelling instead, which is the number that would collapse if the directory walk broke.

Rule 8 is the mirror of rule 1. `CanvasText` and `Highlight` are the correct — the only —
thing to name inside `@media (forced-colors: active)`, where the browser has already discarded
every token. Outside it they are a literal whose value nobody here chose, and rule 1 cannot see
them because it looks for `#`, `rgb(` and `hsl(`. There is no exception list.

The sixth is the newest and is deliberately narrow. It checks `rem` and `px` values only.
**`em` spacing is not a violation** — it is font-relative by design, and it is what keeps an
icon optically centred beside text at every size rather than at one. Negative values are
skipped too: `margin: -1px` is the visually-hidden clip idiom, not a rhythm decision.
Writing the rule any wider would have flagged roughly forty legitimate declarations, and a
rule that fires on correct CSS is a rule somebody deletes.

Three further rules live in `content/content.test.ts`: no class defined twice at the top
level of a module, no class that nothing renders, and no narrow `min-width` rule that a
later wider one always beats.

**The dead-class rule has a second blind spot, found on 2026-08-16 and not yet closed.** It
matches a class _name_ against the source, so a component that imports two stylesheets — which
several in `features/public/home/components/pricing/` do — can have a rule in one shadowed by an
identically-named class in the other, and the sweep still counts it as live. Two such rules were
found while splitting one seam of `Pricing.module.css`: `.yearOnePaths`, deleted, and the
`terms*` set, left in place because relocating it changes what the page looks like. Checking
dead classes **per stylesheet** rather than per name is what makes the rest of E5 safe to do;
see `03_plan/deferred_work_plan.md` §9.13.

**The dead-CSS rule scans `apps/client/src` only.** `const root = join(import.meta.dirname,
'..')` resolves there, so a class in `packages/ui` or `apps/admin/src` that nothing renders
passes. That is worth knowing rather than assuming, because §7 used to lean on this test as the
reason an unused primitive could not be added — and it would not have fired. What actually holds
the line for `packages/ui` is tree-shaking, which removes an unused export before the budget ever
sees it.

Two accessibility guards were added on 2026-08-15, one per application:
`apps/client/src/app/a11y.test.ts` and `apps/admin/src/app/a11y.test.ts`. Between them they
assert that every shell has a skip link, a focusable `<main>`, a focus move on route change and
an error boundary; that every console screen sets a document title; that exactly one live region
exists per application; and that no `Suspense` boundary falls back to nothing. Each one failed
against the codebase when it was written. `features/private/states.test.ts` is the third: no
screen in the customer portal builds its own request lifecycle, and none reports a failed load
without offering a retry.

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

Eight exist, and they fall into three kinds.

**Depicting something that is not this brand:**

- **`Value.module.css`** (`font-size`) — `.mockCramped` is 11px, off the type scale. It
  depicts a badly-built website; rounding it onto the scale would make the "before" legible
  and delete the argument the section exists to make.
- **`DeviceFrame.module.css`** (`border-radius`, `spacing`) — the phone bezel radius (22px)
  and its screen (16px) depict hardware, not the brand. A shell radius larger than the
  screen radius is what makes the frame read as a phone. The 8px window dots and the 6px
  screen inset are the same argument.

**Clearance measured from another element, not from the rhythm:**

- **`Field.module.css`** — `.passwordControl` reserves 5.5rem for the show/hide toggle
  sitting inside it. The number is the toggle's width plus its insets.
- **`Offer.module.css`**, **`Welcome.module.css`**, **`Value.module.css`** — hanging-marker
  clearance for a numbered list. The value is the marker's diameter plus its gap; a rhythm
  step would either clip the marker or leave it swimming. Deliberately the same number in
  all three, because it is the same component in three places.
- **`Demo.module.css`** — `.site` reserves 4.5rem at the bottom for the fixed mobile call
  bar. That is the bar's height.

The distinction that makes this list principled rather than a list of things somebody did
not want to fix: **every one of these numbers is a measurement of a specific element**, and
would be wrong if it were rounded to the nearest rhythm step. A spacing value that is
merely _unusual_ does not qualify.

---

## 7. The inventory, and what is still absent

This section used to be titled "What this system does not have, on purpose", and it argued that
the absence of a `Modal`, `Dialog`, `Tooltip`, `Popover`, `Switch` and `Avatar` was a
correctness property: adding them "would ship dead CSS on every visit", against a test that
fails the build for a class nothing renders and a budget that measures the first screen.

**DECISION 029 built all of them on 2026-08-15**, and the honest version of what happened is
worth more than either the old text or a quiet replacement.

### What the old argument got right, and what it got wrong

Right: a component nobody uses is a maintenance obligation, and a design system that grows by
anticipation grows without limit. That half stands, and composition rule 6 still carries it.

Wrong, as measured: **a zero-consumer primitive in `@jobforge/ui` costs nothing.** Rollup drops
a barrel export nothing imports and the CSS module goes with it, so `Modal` and `Drawer` landing
together moved the eager bundle by zero bytes and `aria-modal` appears in no chunk in `dist`.
The dead-CSS test does not catch them either, for a different reason: it scans `apps/client/src`
only, so for `packages/ui` it is policy rather than machinery.

So rule 6's payload clause is now scoped to what it can actually be true of:

> **No speculative surface in an eager bundle.** A design-system primitive may precede its
> consumer; an eager one may not precede its budget.

### What exists, and what each is for

| Primitive | Consumers today               | Why it exists                                                                       |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `Table`   | 2 — the console's two tables  | Keyboard-reachable scrolling, stacking below `md`, a required label per cell        |
| `Tabs`    | 1 — the customer project page | Four views that are real routes, drawn as tabs without claiming to be one           |
| `Modal`   | 0                             | The correct dialog, for the day something needs one that cannot be done in place    |
| `Drawer`  | 0                             | The same behaviour anchored to an edge: content or controls, not one decision       |
| `Toast`   | 0                             | The one case a live region cannot cover — a message that survives a navigation      |
| `Tooltip` | 0                             | A description on focus as well as hover, never a place to put a link                |
| `Switch`  | 0                             | A setting that takes effect when flipped, as against a checkbox that waits for Save |
| `Avatar`  | 0                             | A list of several people. Initials are the default; there is no avatar upload       |

The six with no consumer carry the most thorough tests in the package, and that is deliberate:
with nothing exercising them in production, the tests are the only thing keeping them correct.

### What is still deliberately absent

| Not built    | What would justify it                                                                                                                    |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Popover`    | Interactive content anchored to a control. `Tooltip` covers descriptions; anything a person must _reach_ is this, and nothing needs one. |
| `Accordion`  | `FaqList` is the only disclosure on the site and uses `<details>`, which is better. A second one.                                        |
| `Menu`       | Nothing has a menu. `AppLayout`'s mobile toggle expands the nav in place, which is not one.                                              |
| `Combobox`   | No searchable field exists. The trade picker is a `RadioGroupField` because the options _are_ the question.                              |
| `DatePicker` | No customer-facing date input exists at all.                                                                                             |
| `Pagination` | The console bounds at fifty per source and discloses it. Revisit at a few hundred rows — see `ProjectsPage`.                             |

No CSS framework, no icon library, no Storybook. The tests in §6 and the examples in the
codebase are the documentation.

---

## 8. The composition rules

These govern everything above, and they are the reason the surface stays small.

1. **Compose, never extend.** No base components, no class hierarchies, no
   clone-and-specialise. Behaviour arrives as children, props, or a function call.

2. **Rule of Three, then the smallest thing.** Do not extract until the third real
   occurrence, and then extract the smallest _concrete_ function — never a configurable
   framework. `CoverageComparison` and `MarketComparison` are two forty-line blocks that
   render similar-looking tables and are deliberately not one component: there are two of
   them, not three, and merging them would need a row shape neither content module has.

3. **Abstraction is justified by current repeated use, never anticipated reuse.** Two or
   more real consumers today, or it stays where it is. One consumer means it lives with
   its consumer — which is why `requestPlaybook` and `submitOnboarding` moved into the
   features that call them, while `submitLead` (contact _and_ audit) stayed shared.

4. **A screen composes; it does not invent.** A raw `<button>`, `<input>`, `.card` or
   `.badge` class in a screen is a defect, not a shortcut.

5. **Top-level tells the story.** Anything over ~40 code lines should read as a sequence of
   named calls, with the mechanics one level down. `PricingBlock` is the worked example: a
   448-line return became nine named blocks and a body you can read in one screen.

6. **No speculative surface in an eager bundle.** No exported function without a production
   caller, no prop nothing passes, no token for a component that does not exist. Three
   functions were deleted from `capabilityMatch.ts` for exactly this, and their tests with
   them.

   **A design-system primitive may precede its consumer; an eager one may not precede its
   budget.** DECISION 029 narrowed the rule to that, after measuring what it had assumed: a
   zero-consumer export in `@jobforge/ui` is tree-shaken away entirely, so the payload
   objection it was written to make does not apply to one. What still applies is everything
   else in this rule, and the obligation a component creates the day it lands — which is why
   the seven primitives added under 029 carry the most thorough tests in the package.

7. **Low indirection.** A feature's entry point is one hop and it is the only sanctioned
   hop. Reaching past it fails lint.

**What extraction is _not_ for.** Four form hooks shared a submit state machine, a
double-submit guard and a honeypot; those three things became `useSubmitStatus`, and
nothing else did. It holds no values, no field list, no validators, no schema and no submit
pipeline, because those are the parts that genuinely differ between the five forms and a
configurable version of them would be harder to read than the copies it replaced.

---

## 9. Adding to it

1. **A colour** → add a semantic token to `tokens.css` with its measured contrast in the
   comment. If it is a new brand value, add the foundation literal too.
2. **A component** → is it a primitive (a building block), a pattern (a recurring solution
   built from primitives), or feature composition? Business logic never crosses into
   `components/`.
3. **A breakpoint** → add it to `BREAKPOINTS` in `tokens.test.ts` _and_ to the note in
   `tokens.css`, and say what it is for. Six is not a target.
4. **An exception** → add it to `EXCEPTIONS` with a sentence explaining why the rule is
   genuinely wrong for that file. "It was already like that" is not one.
