# Theming plan

Working plan for making themes swappable per room. Expect this to change as we
learn — the phases are ordered by what they teach us, not just by dependency.

## Goal

A small number of **lovingly crafted, richly thematic visual identities**, each
with a real personality, selectable per room. Not a palette picker with twelve
near-identical variants. Themes are allowed to be heavy.

Constraint from MISSION.md — _Accessibility over aesthetics_: the room's theme
applies to everyone in the room, so a GM's aesthetic choice must never become a
player's accessibility problem. Themes therefore carry obligations, not just
licence. See [Accessibility escapes](#accessibility-escapes).

## Where we are

Already done:

- App base classes (`.heading`, `.room-name`, `.main-area`, `.sidebar`,
  `.dice-face`) have their structural floor in `@layer components` in
  `src/styles/global.css`, so a theme that styles none of them still renders a
  coherent app. `cyberdeck` holds only the look.
- `bevel` in `src/styles/themeUtils.css` is theme-agnostic by design.
- Colour discipline in markup is good — almost no hardcoded colour.

- `rooms.theme` (text column, migration `20260419162104_amused_natasha_romanoff`)
  is read on the room page, resolved against the registry, and rendered onto
  `<html>` server-side as `data-theme` + `data-theme-polarity`.

- Three themes are registered and shipped: `cyberdeck` and `libris` (full-fat)
  and `plainLight` (palette only). Switching between them works end to end.

- The room owner can pick a theme from the Config panel; it applies live for
  everyone in the room and persists.

- `libris` ships — the second full identity, and the answer to the open call
  above: plainLight stays the bare canary and a third theme was written instead.

- `prefers-contrast: more` **has now been seen rendered**, for libris. There is
  no devtools switch for it in the preview connector, so it was verified by
  temporarily flipping the query to `no-preference`, screenshotting, and
  reverting. Crude, but it is the difference between "the CSS says so" and
  "we looked". Worth doing the same for cyberdeck.

Still missing:

- Nothing blocking. See the debt bucket.

## The theme contract

The most important artefact here. A theme is one CSS file in
`src/styles/themes/`, registered in the registry.

A theme **may**:

- declare a daisyUI theme block (palette, radii, border widths, effects)
- override any app base class, in `@layer components`
- override daisyUI component classes (`.btn`, `.input`, `.modal-box`, …)
- import its own fonts

A theme **must**:

- be registered with a `polarity` of `light` or `dark`
- leave every app base class usable — override appearance, never remove structure
- meet WCAG AA in its base state, not just under an escape
- honour the accessibility escapes below

A theme **must not**:

- restate structure owned by an unlayered CSS module. Unlayered styles outrank
  every `@layer`, so the declaration is inert and merely misleading — this is why
  `position: relative` came out of `.sidebar`. Note `inputs.module.css` opts into
  `@layer components` and so _is_ overridable; check the top of the module file.
- put declarations in `@layer utilities` that markup utilities are meant to
  override. Theme selectors are `[data-theme=x] .foo` (0,2,0) and will beat a
  bare `text-*` utility in the same layer. This bug cost the landing-page hero
  its `text-5xl`.
- hardcode colours outside its own palette

### Which layer a component override goes in

Not a free choice, and getting it wrong fails silently.

- **`@layer utilities` directly** for daisyUI components. daisyUI emits some
  declarations outside its own `daisyui.l1.l2.l3` sublayer — `.alert`'s
  `border-width`/`border-color`, `.btn-soft`'s background — straight into
  `utilities`. A sublayer rule loses to those regardless of specificity, and
  `all: revert-layer` in global.css can't clear them either. Same for
  `.chat-bubble`, which has to outrank the `@utility chat-bubble` in global.css.
- **`@layer utilities { @layer components { … } }`** for `.btn` and friends,
  which is late enough to beat daisyUI but early enough that a markup `text-*`
  still wins.
- **`@layer components`** for the app's own base classes (`.heading`,
  `.main-area`, `.sidebar`, `.dice-face`), so markup utilities outrank them.

When you override a **nested variant**, an escape has to name that variant too:
libris's `prefers-contrast` rule for `.chat-bubble` was inert for the
mirrored `.group[data-is-mine] &` version, which sets the same property from a
(0,4,0) selector.

### Baseline contrast

Not an escape — a property every theme has in its **base state**. A theme that
only becomes legible once the user asks for more contrast has failed. Measured
with [the contrast audit](./theme-contrast-audit.md), which is a manual gate:
run it whenever a palette, a surface colour, or anything putting text over a
gradient changes.

This is mostly falling out of the design already — the seed-variable palettes
derive content colours from base colours with a large lightness delta, and
plainLight passed with no failures unprompted.

### Accessibility escapes

Orthogonal to theme choice: the room's theme still applies, these strip what
makes it inaccessible. **Every theme must honour both.**

| Escape             | Trigger                                   | Theme must                                                              |
| ------------------ | ----------------------------------------- | ----------------------------------------------------------------------- |
| Reduced motion     | `@media (prefers-reduced-motion: reduce)` | drop travel and scale; fades and spinners may stay                      |
| Increased contrast | `@media (prefers-contrast: more)`         | drop decorative overlays over text; full-strength foreground/background |

Both are OS-driven, so they cost no settings UI, no storage and no pre-paint
script.

### Deliberately deferred

- **`prefers-reduced-transparency`.** The natural fit for cyberdeck's blur and
  translucency, but not supported in Firefox or Safari, so it can't be relied
  on. Revisit if that changes.
- **A bespoke "reduce decoration" toggle** for noise, scanlines and glow — the
  decorative texture no standard query covers. There is no platform signal for
  it and it is not an established web pattern (it shows up in games and OS
  settings, not web apps), so it would be ours to invent, and it is the only
  option here needing storage, UI and a settings surface. Deferred until we see
  what is actually left over once motion and contrast are handled.
- **The `--decor-*` custom-property scheme** (theme writes
  `blur(calc(30px * var(--decor-blur)))`, an escape zeroes it centrally). It was
  designed for a three-escape world. With two escapes, one of which the codebase
  already handles through ordinary `motion-reduce:` variants, it is
  over-engineering. Parked with the toggle above.

## Phases

### Phase 1 — Registry and resolution ✅

- `src/styles/themes/registry.ts` holds the names, descriptors, default,
  `isThemeName` predicate and `resolveTheme`. `registry.test.ts` asserts every
  registered name has a stylesheet declaring it, and that the registered
  `polarity` matches the stylesheet's `color-scheme` — the two state the same
  fact independently and would otherwise drift.
- `resolveTheme` falls back to the default for anything unregistered. App-level
  only, no DB constraint.
- `@custom-variant dark` now keys off `data-theme-polarity`, written from the
  registry. `cupcake, dracula` dropped; daisyUI's component base styles are
  unaffected.
- **Deviation:** the pre-paint inline script is gone rather than repurposed. The
  theme is fully known server-side, so `HTML.astro` renders `data-theme` and
  `data-theme-polarity` directly — fewer moving parts and no flash. Phase 3
  reintroduces a script when there's genuinely client-only state to read.

### Phase 2 — Delivery, and the base-layer spike ✅

- `themes/index.css` imports every theme; `HTML.astro` imports that one file.
  `registry.test.ts` fails if a registered name isn't imported there.
- **Deviation:** rather than invent a throwaway spike, the orphaned
  `plainLight` was resurrected and registered. It is palette-only — no component
  styling whatsoever — which makes it a harsher base-layer test than a purpose-
  built spike, and it settles the debt-bucket question at the same time. It also
  earns its place as the permanent regression canary: base-layer bugs that
  cyberdeck's overrides hide are visible immediately in plainLight.

#### Measurements

|                           | CSS                       | Fonts           |
| ------------------------- | ------------------------- | --------------- |
| Baseline (cyberdeck only) | 209,654 B                 | 6 files, 116 KB |
| Both themes               | 211,241 B (+1,587, +0.8%) | unchanged       |
| cyberdeck in isolation    | 30,411 B                  | 116 KB          |
| plainLight (palette only) | 1,587 B                   | none            |

**The font question dissolved.** With plainLight active, 6 `@font-face` rules
are declared and **0 fonts are fetched, 0 bytes** — browsers only download a
face when something rendered actually uses it. Bundling every theme's fonts
costs CSS text, not font bytes. No per-theme font loading needed.

Budget for planning: a palette-only theme costs ~1.6 KB; a full-fat one like
cyberdeck costs ~30 KB CSS plus its own fonts, which only its own users fetch.

#### What the spike found

The base layer held up better than expected. Layout, sidebar/chat surface
separation, the heading ramp and the room name all survived a theme with zero
component styling, and a contrast audit over 33 text elements found **no WCAG AA
failures** (worst ratio 5.66) — the seed-variable palette is accessible by
construction.

One real bug, now fixed:

- **`.chat-bubble` hardcoded `oklch(20% …)`** in `global.css`, so a light theme
  got dark text on a dark bubble at **1.15:1**. It now uses `--user-colour`,
  which `ChatBubble.tsx` already sets per polarity — 11.72:1, and cyberdeck is
  unaffected because it replaces the bubble wholesale. Exactly the class of bug
  a single dark theme hides.

Still open, for Phase 3/4:

- `.header` has no separation from the chat area without a theme; cyberdeck
  supplies it via `::before`/`::after` blur edges. Cosmetic, but a theme-less
  header floats.
- Only the roll panel and chat were exercised. Modals, dropdowns, alerts,
  toasts, the file manager and the other capability panels are **untested under
  a light theme**.
- `ErrorDisplay.tsx` is still hardcoded neon-on-black and will clash badly under
  plainLight (already in the debt bucket).

### Phase 3 — Motion and contrast

Scoped down from the original three escapes: `prefers-reduced-transparency` and
the bespoke decoration toggle are [deferred](#deliberately-deferred). Everything
here is OS-driven, so the phase adds no settings UI and no storage — and the
pre-paint script Phase 1 removed stays gone.

**Motion** turned out to be nearly done already. `sidebar.module.css` guards its
width transition, backdrop fade and close button; `PanelFrame.tsx` (deck
settings pane navigation) uses `motion-reduce:transition-none` on its slide.

- ✅ `toaster.module.css` was the gap — toasts animated `translate` + `scale`
  unguarded, and unlike the sidebar they move in response to events rather than
  to something the user just did. Now fades in place under reduced motion.
- Left alone deliberately: `animate-fadein`, `animate-spin` loaders,
  `transition-colors` hovers. Reduced motion targets vestibular triggers, which
  means travel and scale; opacity and small spinners are accepted.

**Contrast**:

- ✅ [Audit procedure](./theme-contrast-audit.md) committed, now covering both a
  DOM pass and a palette pass. The palette pass exists because the DOM one only
  sees mounted elements — which is precisely why the failures below were missed.
- ✅ **cyberdeck had four AA failures**, all the same shape: near-white
  `--color-X-content` on `--color-X` fills that are themselves light. `info`
  1.62, `success` 1.64, `neutral` 1.78, `warning` 1.85; `error` 3.26. Fixed by
  deriving every `-content` from `--l-content` / `--c-content`, which is what
  primary/secondary/accent already did. All pairs now ≥ 5.24.
  - The failure was **latent**, not visible: cyberdeck overrides `.btn` to a
    transparent bevel and forces `.alert`'s background to base-100, so almost
    nothing actually painted `--color-X` behind `--color-X-content`. It would
    have bitten the first component this theme didn't override.
  - `.alert` now sets `color: var(--color-base-content)` explicitly. It replaces
    daisyUI's `--alert-color` background, so it has to own the foreground —
    otherwise the ink is chosen for a fill we aren't painting. **New contract
    rule: override a background, own the foreground.**
- ✅ `prefers-contrast: more` implemented for cyberdeck. Not a colour change —
  the palette already clears AA — but a removal of everything painted _between_
  reader and text: the scanline grid, the noise texture on `.dropdown` and
  `.alert`, bevel fills on `.modal-box` and `.chat-bubble`, the header's blur
  edges, sidebar translucency, `.frost`, and `.label`'s 80% dimming.
  plainLight needs nothing — it has no decoration to strip.

**Not done:** none of this has been looked at in a browser. The preview
connector was unavailable for the whole phase, so the palette work rests on a
static oklch→sRGB model and the built CSS, and `prefers-contrast: more` has
never been seen rendered. See below.

### Phase 4 — Theme #2, for real ✅

`libris`: aged paper and iron-gall ink. Chosen to be the opposite of cyberdeck
on every axis at once — light not dark, printed not emissive, serif not
geometric, texture not glow — because a theme that differs only in hue would not
have tested anything. Palette is the medieval scribe's: iron-gall ink on
parchment, rubric red, verdigris, ultramarine, all three pigments at one
lightness (`--l-fill`), so a single contrast check covers the whole set.

**Done:** it styles nothing outside `themes/libris.css`, `themes/index.css` and
the registry. Nothing had to be promoted into the base layer — the contract held.

#### What it cost

Two new fonts (Cinzel for display, EB Garamond for body), both variable, both
only fetched by rooms actually using this theme — as Phase 2 predicted.

#### What it found

- **daisyUI emits part of each component _outside_ its own sublayer.** `.alert`
  carries `border-width` and `border-color` in plain `@layer utilities`, so a
  theme rule in a nested sublayer loses however specific it is — and global.css's
  `all: revert-layer` doesn't clear them, because they were never in the reverted
  sublayer. The first draft had an `.alert` whose background applied and whose
  4px margin rule silently did not. This is why cyberdeck keeps most components
  in `utilities` directly and only `.btn` in a nested `components` sublayer; that
  structure is load-bearing, not stylistic, and libris now mirrors it with a
  comment saying why.
- **The contrast audit snippet was broken.** `fillRect` with a transparent
  `fillStyle` is a no-op, so `toRGB` returned the previous pixel — and since
  `bgOf()` runs immediately after the text colour is sampled, every element with
  a transparent background "measured" against its own text colour. Every row
  scored exactly 1.00. Fixed with a `clearRect`; see
  [the audit](./theme-contrast-audit.md). The recorded plainLight result predates
  the fix and should be re-run.
- **A theme can write inert rules against its own base rules.** libris's
  `prefers-contrast` block set `box-shadow: none` on `.chat-bubble`, but the
  mirrored `.group[data-is-mine] &` variant sets its own from a (0,4,0) selector
  and won. Same class of bug as the `position: relative` and `text-5xl` cases,
  but self-inflicted rather than caused by a CSS module — worth its own contract
  note: **when you override a nested variant, the escape has to name it too.**
- Two design corrections that only showed up on screen: `.btn-soft` at an 8%
  tint with no border is very nearly invisible on a light theme (now 22% with a
  fading rule), and Garamond's small x-height needs a 20px root rather than
  cyberdeck's 18px.

#### Verified in a browser

Style demo across all five backdrops, and a real room: header, chat surface,
sidebar, chat bubbles, dice faces, roll panel, toast, inputs. Contrast audit run
with the panel open and dice rolled — 40 elements, 0 AA failures, worst 6.75.
Both accessibility escapes checked.

### Phase 5 — Write path ✅

Done before Phase 4, deliberately: the base layer had already been proven by the
plainLight spike, and crafting a rich theme is far easier once you can switch
themes in the app instead of by hand-editing D1.

- **Deviation:** no Astro action. Room name and config don't use one either —
  they go over the room's WebSocket so every client sees the change at once, and
  a theme is exactly that kind of shared state. Added `updateRoomTheme`
  (client→server) and `roomTheme` (server→client) alongside the existing
  `updateRoomName` / `roomName` pair, so the theme rides the same path.
- `ThemePicker.tsx` in the Config panel. Owner-only twice over: `Sidebar.tsx`
  only offers the config tab to the owner, and the DO's `checkOwner` rejects the
  message regardless.
- `useApplyRoomTheme` swaps `data-theme` and `data-theme-polarity` on `<html>`.
  Every theme's CSS is already loaded, so that attribute swap is the whole of
  the change — which is also why there's no preview mode: picking a theme _is_
  the preview.
- The room page resolves the theme once and hands it to both the layout and the
  island, so markup and hydrated state can't disagree.

**Verified end to end:** picker reflects the stored theme, switching repaints
live, D1 shows the new value, and a reload comes back server-rendered with it.
The non-owner rejection path is not directly tested — it's the same shared
`checkOwner` used by room name and config.

### Debt bucket — do any time

Independent, none of it blocking:

- `src/components/ErrorDisplay.tsx` is a hardcoded neon cyberpunk crash screen.
  Theme it or declare it deliberately theme-exempt. It will look wrong under
  plainLight today.
- Connection dot `bg-red-500`/`bg-green-500` at `DiceRoller/Header.tsx:45`.
- ~~`havocDark` is misnamed~~ — done. `havocDark` → `cyberdeck`,
  `havocLight` → `plainLight`. No migration: `LEGACY_THEME_NAMES` in the
  registry maps the retired names at the single read path, the same trick
  `normalizeLegacyHavocCapabilities` uses for retired capability names. Those
  entries are permanent — dropping one quietly reverts affected rooms to the
  default, which is why there's a test on them.
  - Polarity is deliberately absent from `cyberdeck`, so it can grow a light
    face later without the name fighting it. `plainLight` keeps it because
    "plain" is a category rather than an identity: a `plainDark` would be a
    sibling, not a variant.
- Pick the default from `prefers-color-scheme` now a light theme exists. Needs a
  little care: `resolveTheme` runs server-side and the OS preference isn't known
  there, so this is the first thing that would bring back a pre-paint script —
  or a `@media` block that flips `data-theme-polarity`'s effect without it.
- `.header` has no separation from the chat area without a theme (found by the
  plainLight spike). Cosmetic; a base-layer border or shadow would fix it.

## Verifying theme work

Computed-style diffing beats screenshots for this. Snapshot
`getComputedStyle` over the properties a change touches, for the app base
classes plus a synthesised `h1`–`h6` ramp, before and after; a pure refactor
should come back byte-identical. Toggling `data-theme` to a nonexistent value in
the same pass shows what the base layer alone provides. This caught both the
`text-5xl` bug and the inert `position: relative`.

## Open questions

- Should the palette audit become a real test? It is pure computation, so unlike
  the DOM audit it _could_ be one — but only if it parses the theme CSS. A
  hand-maintained copy of the palette is a trap: this session produced wrong
  plainLight findings from exactly that, after the file changed underneath the
  model.
- Should themes be able to style capability UI (`src/components/capabilityComponents/`),
  or is that off-limits so capabilities stay portable?
- Is `polarity` on a theme enough, or do we eventually want light/dark _variants_
  of one identity (`havoc` with a light and dark face) rather than two entries?
