# Semantic Theme System

A Vite plugin that generates a full DaisyUI-compatible semantic colour palette from a single seed colour, using OKLCH colour theory.

## Design Decisions

- **Colour space**: OKLCH (perceptually uniform — hue rotation gives balanced results)
- **Harmony**: Triadic (H, H+120, H+240) — maps exactly to our 3 hue-varying roles
- **Chroma**: Clamped to [0.12, 0.20] — prevents washed-out or garish results
- **Dark mode**: Auto-emitted as `@media (prefers-color-scheme: dark)` block — no `dark:` modifiers needed anywhere
- **Neutral**: Follows primary hue, very low chroma (~0.04)
- **Integration**: Vite plugin (not PostCSS — project uses `@tailwindcss/vite` which bypasses PostCSS)
- **Escape hatches**: Per-role CSS value overrides passed in plugin config

## Roles & Derivation

| Variable                    | H     | C       | L (light)       | L (dark)         |
| --------------------------- | ----- | ------- | --------------- | ---------------- |
| `--color-primary`           | H     | clamped | seedL           | max(seedL, 0.65) |
| `--color-primary-content`   | H     | 0.025   | contrast-search | contrast-search  |
| `--color-secondary`         | H+120 | clamped | seedL           | max(seedL, 0.65) |
| `--color-secondary-content` | H+120 | 0.025   | contrast-search | contrast-search  |
| `--color-accent`            | H+240 | clamped | seedL           | max(seedL, 0.65) |
| `--color-accent-content`    | H+240 | 0.025   | contrast-search | contrast-search  |
| `--color-neutral`           | H     | 0.04    | 0.40            | 0.55             |
| `--color-neutral-content`   | H     | 0.025   | contrast-search | contrast-search  |
| `--color-base-100`          | H     | 0.010   | 0.98            | 0.12             |
| `--color-base-200`          | H     | 0.015   | 0.93            | 0.17             |
| `--color-base-300`          | H     | 0.020   | 0.86            | 0.22             |
| `--color-base-content`      | H     | 0.025   | contrast-search | contrast-search  |

**Contrast-search**: try dark (L=0.15) for light surfaces, light (L=0.97) for dark surfaces; fall back to the other if WCAG AA (4.5:1) fails.

All generated colours are gamut-clamped to sRGB via `clampChroma(..., 'oklch')`.

## Usage

In `global.css`:

```css
@semantic-theme oklch(0.55 0.2 240);
```

In `astro.config.mjs`:

```js
import { semanticThemePlugin } from "./src/lib/vitePluginSemanticTheme.ts";

// In vite.plugins:
semanticThemePlugin({
  overrides: {
    accent: "oklch(0.70 0.15 30)", // optional per-role override
  },
});
```

## Output shape

```css
:root {
  --color-primary: oklch(...);
  --color-primary-content: oklch(...);
  /* ... all roles ... */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: oklch(...);
    /* ... */
  }
}
```

## Files

| File                                 | Purpose                                                   |
| ------------------------------------ | --------------------------------------------------------- |
| `src/lib/vitePluginSemanticTheme.ts` | Plugin + all colour logic                                 |
| `src/styles/global.css`              | Replace DaisyUI theme declarations with `@semantic-theme` |
| `astro.config.mjs`                   | Register plugin                                           |

## Dependencies

- `culori` — OKLCH conversion, `wcagContrast`, `clampChroma`, `formatCss`

## Implementation Chunks

1. Install `culori`, create `vitePluginSemanticTheme.ts` with full palette generation
2. Wire up plugin in `astro.config.mjs`, add `@semantic-theme` to `global.css`
3. Verify output visually, tune L/C constants if needed
