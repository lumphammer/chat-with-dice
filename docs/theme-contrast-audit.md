# Theme contrast audit

Every theme must meet WCAG AA contrast **in its base state**, not only when a
user has asked for more contrast. See the theme contract in
[theming-plan.md](./theming-plan.md).

This is a manual gate: run it when you add a theme, or change a palette, a
surface colour, or anything that puts text over a gradient or texture.

## Why it isn't a unit test

The palettes are built from `oklch()` and relative colour syntax
(`oklch(from var(--color-primary) …)`). Resolving those to real pixels needs a
browser engine — jsdom returns the declaration unchanged, so a vitest run would
compare strings, not colours. Until there's a browser in CI this stays a
console snippet.

## Running it

1. `pnpm run dev`, open a room in the theme you want to audit.
2. Open as much UI as you can first — the audit only sees what is currently in
   the DOM. Send a chat message, roll some dice, open the sidebar panels,
   open a modal. Anything closed is anything unaudited.
3. Paste the snippet below into the devtools console.

It reports every visible text run whose contrast against its nearest opaque
ancestor background falls below AA (4.5:1, or 3:1 for text at 24px+).

```js
(() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  // canvas resolves any CSS colour — including oklch() — to real RGB
  const toRGB = (css) => {
    ctx.fillStyle = "#000";
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const lum = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  // walk up for the first ancestor that actually paints something opaque
  const bgOf = (el) => {
    for (let n = el; n; n = n.parentElement) {
      const px = toRGB(getComputedStyle(n).backgroundColor);
      if (px[3] > 0.5) return px;
    }
    return [255, 255, 255, 1];
  };

  const seen = new Set();
  const rows = [];
  for (const el of document.querySelectorAll("body *")) {
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join("")
      .trim();
    if (!text) continue;
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    const key = text + cs.color;
    if (seen.has(key)) continue;
    seen.add(key);

    const px = parseFloat(cs.fontSize);
    const contrast = ratio(toRGB(cs.color), bgOf(el));
    rows.push({
      text: text.slice(0, 30),
      px,
      contrast: Number(contrast.toFixed(2)),
      passes: contrast >= (px >= 24 ? 3 : 4.5),
    });
  }
  rows.sort((a, b) => a.contrast - b.contrast);
  console.table(rows.filter((r) => !r.passes));
  console.log(
    `${rows.filter((r) => !r.passes).length} failing / ${rows.length} checked`,
    `— worst ${rows[0]?.contrast}`,
  );
  return rows;
})();
```

## Known limits

- **Only audits what is on screen.** Closed modals, unopened panels and
  unrendered states are invisible to it. Step 2 is the important step.
- Compares against the nearest _opaque_ ancestor, so text over a translucent
  surface is measured against whatever is behind it — an approximation, and an
  optimistic one where a theme stacks several translucent layers.
- Ignores text sitting on gradients, images and the noise texture; it samples
  `background-color`, not painted pixels. havocDark's `.main-area` scanlines and
  `noisy-bg` are exactly this case, so treat its results as a floor rather than
  a guarantee.
- `font-weight` is not considered, so bold text at 18.66px–24px is judged
  against the stricter 4.5:1 rather than the 3:1 that WCAG would allow.

## Auditing the palette instead

The DOM snippet above only sees rendered elements, which is how the alert and
neutral-button failures below went unnoticed — those components simply weren't
on screen. The palette itself can be audited without a browser, by resolving the
`oklch()` seeds to sRGB in plain JS and checking each `--color-X` /
`--color-X-content` pair plus the `--color-*-text` colours against `base-100`.

That is a strictly complementary check: it covers every pair the palette
promises regardless of what's mounted, but it can't see anything painted on top
— gradients, scanlines, noise, translucent surfaces. Run both.

Caveat: naive gamut clamping. Several fills sit outside sRGB (`error` is
`oklch(80% 0.3 30)`), and browsers gamut-map more cleverly, so those ratios are
approximate — fine for catching 1.6:1, not for splitting hairs at 4.4 vs 4.6.

## Results so far

| Theme      | Palette pairs | Failing AA | Worst                             | DOM audit             |
| ---------- | ------------- | ---------- | --------------------------------- | --------------------- |
| havocDark  | 17            | 0 (was 4)  | 5.24 (`error` fill, approximate)  | not yet run           |
| havocLight | 17            | 0          | 4.65 (`accent` fill, approximate) | 33 checked, 0 failing |

havocDark's four failures — `info` 1.62, `success` 1.64, `neutral` 1.78,
`warning` 1.85 — were near-white `-content` on fills that are themselves light.
Fixed by deriving every `-content` from `--l-content` / `--c-content`, as
primary/secondary/accent already did.
