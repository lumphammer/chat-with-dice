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
  coherent app. `havocDark` holds only the look.
- `bevel` in `src/styles/themeUtils.css` is theme-agnostic by design.
- Colour discipline in markup is good — almost no hardcoded colour.

- `rooms.theme` (text column, migration `20260419162104_amused_natasha_romanoff`)
  is read on the room page, resolved against the registry, and rendered onto
  `<html>` server-side as `data-theme` + `data-theme-polarity`.

- Two themes are registered and shipped: `havocDark` (full-fat) and `havocLight`
  (palette only). Switching between them works end to end.

- The room owner can pick a theme from the Config panel; it applies live for
  everyone in the room and persists.

Still missing:

- **A second theme with a real identity** — Phase 4, the only phase left.
  Whether havocLight grows into one or stays the deliberately-bare regression
  canary (and a third theme is written instead) is an open call.
- `prefers-contrast: more` has never been seen rendered. Reduced motion has been
  verified by eye; the contrast escape can't easily be simulated without also
  forcing the palette, so it rests on the built CSS alone.

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

### Baseline contrast

Not an escape — a property every theme has in its **base state**. A theme that
only becomes legible once the user asks for more contrast has failed. Measured
with [the contrast audit](./theme-contrast-audit.md), which is a manual gate:
run it whenever a palette, a surface colour, or anything putting text over a
gradient changes.

This is mostly falling out of the design already — the seed-variable palettes
derive content colours from base colours with a large lightness delta, and
havocLight passed with no failures unprompted.

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

- **`prefers-reduced-transparency`.** The natural fit for havocDark's blur and
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
  `havocLight` was resurrected and registered. It is palette-only — no component
  styling whatsoever — which makes it a harsher base-layer test than a purpose-
  built spike, and it settles the debt-bucket question at the same time. It also
  earns its place as the permanent regression canary: base-layer bugs that
  havocDark's overrides hide are visible immediately in havocLight.

#### Measurements

|                           | CSS                       | Fonts           |
| ------------------------- | ------------------------- | --------------- |
| Baseline (havocDark only) | 209,654 B                 | 6 files, 116 KB |
| Both themes               | 211,241 B (+1,587, +0.8%) | unchanged       |
| havocDark in isolation    | 30,411 B                  | 116 KB          |
| havocLight (palette only) | 1,587 B                   | none            |

**The font question dissolved.** With havocLight active, 6 `@font-face` rules
are declared and **0 fonts are fetched, 0 bytes** — browsers only download a
face when something rendered actually uses it. Bundling every theme's fonts
costs CSS text, not font bytes. No per-theme font loading needed.

Budget for planning: a palette-only theme costs ~1.6 KB; a full-fat one like
havocDark costs ~30 KB CSS plus its own fonts, which only its own users fetch.

#### What the spike found

The base layer held up better than expected. Layout, sidebar/chat surface
separation, the heading ramp and the room name all survived a theme with zero
component styling, and a contrast audit over 33 text elements found **no WCAG AA
failures** (worst ratio 5.66) — the seed-variable palette is accessible by
construction.

One real bug, now fixed:

- **`.chat-bubble` hardcoded `oklch(20% …)`** in `global.css`, so a light theme
  got dark text on a dark bubble at **1.15:1**. It now uses `--user-colour`,
  which `ChatBubble.tsx` already sets per polarity — 11.72:1, and havocDark is
  unaffected because it replaces the bubble wholesale. Exactly the class of bug
  a single dark theme hides.

Still open, for Phase 3/4:

- `.header` has no separation from the chat area without a theme; havocDark
  supplies it via `::before`/`::after` blur edges. Cosmetic, but a theme-less
  header floats.
- Only the roll panel and chat were exercised. Modals, dropdowns, alerts,
  toasts, the file manager and the other capability panels are **untested under
  a light theme**.
- `ErrorDisplay.tsx` is still hardcoded neon-on-black and will clash badly under
  havocLight (already in the debt bucket).

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
- ✅ **havocDark had four AA failures**, all the same shape: near-white
  `--color-X-content` on `--color-X` fills that are themselves light. `info`
  1.62, `success` 1.64, `neutral` 1.78, `warning` 1.85; `error` 3.26. Fixed by
  deriving every `-content` from `--l-content` / `--c-content`, which is what
  primary/secondary/accent already did. All pairs now ≥ 5.24.
  - The failure was **latent**, not visible: havocDark overrides `.btn` to a
    transparent bevel and forces `.alert`'s background to base-100, so almost
    nothing actually painted `--color-X` behind `--color-X-content`. It would
    have bitten the first component this theme didn't override.
  - `.alert` now sets `color: var(--color-base-content)` explicitly. It replaces
    daisyUI's `--alert-color` background, so it has to own the foreground —
    otherwise the ink is chosen for a fill we aren't painting. **New contract
    rule: override a background, own the foreground.**
- ✅ `prefers-contrast: more` implemented for havocDark. Not a colour change —
  the palette already clears AA — but a removal of everything painted _between_
  reader and text: the scanline grid, the noise texture on `.dropdown` and
  `.alert`, bevel fills on `.modal-box` and `.chat-bubble`, the header's blur
  edges, sidebar translucency, `.frost`, and `.label`'s 80% dimming.
  havocLight needs nothing — it has no decoration to strip.

**Not done:** none of this has been looked at in a browser. The preview
connector was unavailable for the whole phase, so the palette work rests on a
static oklch→sRGB model and the built CSS, and `prefers-contrast: more` has
never been seen rendered. See below.

### Phase 4 — Theme #2, for real

The actual test of everything above. Expect to promote things into the base
layer as we go; that's success, not failure — each promotion is a gap the
contract didn't cover yet.

**Done when:** theme #2 is complete and styles nothing outside its own file and
the registry.

### Phase 5 — Write path ✅

Done before Phase 4, deliberately: the base layer had already been proven by the
havocLight spike, and crafting a rich theme is far easier once you can switch
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
  havocLight today.
- Connection dot `bg-red-500`/`bg-green-500` at `DiceRoller/Header.tsx:45`.
- `havocDark` is misnamed — it's cyberpunk/dark-sci-fi, not Havoc-specific, and
  the name collides with the `havoc` capability. Renaming means migrating
  existing `rooms.theme` values.
- Pick the default from `prefers-color-scheme` now a light theme exists. Needs a
  little care: `resolveTheme` runs server-side and the OS preference isn't known
  there, so this is the first thing that would bring back a pre-paint script —
  or a `@media` block that flips `data-theme-polarity`'s effect without it.
- `.header` has no separation from the chat area without a theme (found by the
  havocLight spike). Cosmetic; a base-layer border or shadow would fix it.

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
  havocLight findings from exactly that, after the file changed underneath the
  model.
- Should themes be able to style capability UI (`src/components/capabilityComponents/`),
  or is that off-limits so capabilities stay portable?
- Is `polarity` on a theme enough, or do we eventually want light/dark _variants_
  of one identity (`havoc` with a light and dark face) rather than two entries?
