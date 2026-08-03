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

Still missing:

- **Nothing writes `rooms.theme`.** No UI, no action — Phase 5.
- No accessibility escapes yet — Phase 3.
- `havocLight` is legible but plain. Whether it becomes a crafted identity or
  stays the deliberately-bare regression canary is an open call.

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
- honour the accessibility escapes below
- meet contrast targets both normally and under each escape

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

### Accessibility escapes

Orthogonal to theme choice. The room's theme still applies; these strip what
makes it inaccessible. **Every theme must honour all three.**

| Escape             | Trigger                                                   | Theme must                                                               |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| Reduced motion     | `@media (prefers-reduced-motion: reduce)`                 | drop transitions and animation                                           |
| Increased contrast | `@media (prefers-contrast: more)`                         | drop decorative overlays that sit over text; full-strength fg/bg         |
| Reduced decoration | app-level toggle, `data-decoration="reduced"` on `<html>` | drop noise, scanlines, glow, backdrop blur, and semitransparent surfaces |

Reduced decoration is the one that bites: `havocDark` leans hard on
transparency and blur, and MISSION.md says to avoid semitransparent elements
except as a way to dim.

**Proposal to validate in Phase 3** — rather than each theme hand-writing three
sets of overrides, express decorative intensity through a few registered custom
properties that the escapes zero out centrally:

```css
/* theme writes */
backdrop-filter: blur(calc(30px * var(--decor-blur)));
/* escape sets, once, globally */
--decor-blur: 0;
```

with something like `--decor-blur`, `--decor-glow`, `--decor-texture` and a
surface-alpha knob. That makes the contract mechanically enforceable instead of
aspirational, and means a new theme gets the escapes mostly for free. Unproven —
Phase 3 is where we find out whether it survives contact with a real theme.

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

### Phase 3 — Accessibility escapes

- Implement the three escapes and whatever mechanism Phase 2's spike suggests.
- Decide where the reduced-decoration preference lives. Recommend `localStorage`
  read by a pre-paint inline script in `HTML.astro` — Phase 1 removed the old
  one, so this reintroduces it, and it's the first thing here that genuinely
  can't be resolved server-side. Covered by the existing cookie banner.
- Retrofit `havocDark`. This is the proving work — it's the transparency-heavy one.

**Done when:** `havocDark` meets contrast targets under each escape, and reduced
decoration genuinely removes blur, noise, glow and transparency.

### Phase 4 — Theme #2, for real

The actual test of everything above. Expect to promote things into the base
layer as we go; that's success, not failure — each promotion is a gap the
contract didn't cover yet.

**Done when:** theme #2 is complete and styles nothing outside its own file and
the registry.

### Phase 5 — Write path

- Room settings UI to pick a theme. `src/components/Sidebar/Config.tsx` already
  edits the room name and is the natural home.
- Astro action + validation; apply live rather than building a preview mode.

**Done when:** a GM can change the room's theme and it persists for everyone.

### Debt bucket — do any time

Independent, none of it blocking:

- `.foo { color: red }` at `global.css:244`; `console.log` at `HTML.astro:28`.
- `havocLight`: resurrect as a real theme or delete it. It's colours-only, and
  with the base layer in place it might now render acceptably — worth ten minutes
  to find out.
- `src/components/ErrorDisplay.tsx` is a hardcoded neon cyberpunk crash screen.
  Theme it or declare it deliberately theme-exempt.
- Connection dot `bg-red-500`/`bg-green-500` at `DiceRoller/Header.tsx:45`.
- `havocDark` is misnamed — it's cyberpunk/dark-sci-fi, not Havoc-specific, and
  the name collides with the `havoc` capability. Renaming means migrating
  existing `rooms.theme` values.
- Restore the `prefers-color-scheme` default at `HTML.astro:32-34` once there's
  a light theme worth defaulting to.

## Verifying theme work

Computed-style diffing beats screenshots for this. Snapshot
`getComputedStyle` over the properties a change touches, for the app base
classes plus a synthesised `h1`–`h6` ramp, before and after; a pure refactor
should come back byte-identical. Toggling `data-theme` to a nonexistent value in
the same pass shows what the base layer alone provides. This caught both the
`text-5xl` bug and the inert `position: relative`.

## Open questions

- Font delivery once all themes are bundled (Phase 2 measures it).
- Where the reduced-decoration preference is stored — `localStorage` is the
  recommendation, but a signed-in user might reasonably expect it to follow them
  across devices, which would mean `UserDataDO` and a server round-trip.
- Should themes be able to style capability UI (`src/components/capabilityComponents/`),
  or is that off-limits so capabilities stay portable?
- Is `polarity` on a theme enough, or do we eventually want light/dark _variants_
  of one identity (`havoc` with a light and dark face) rather than two entries?
