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

It reports every visible text run whose contrast against its composited
ancestor background falls below AA (4.5:1, or 3:1 for text at 24px+).

```js
(() => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  // canvas resolves any CSS colour — including oklch() — to real RGB
  const toRGB = (css) => {
    // The clear is load-bearing. A transparent fillStyle makes fillRect a
    // no-op, so without it the read-back returns whatever was drawn last —
    // and since bgOf() runs straight after the text colour is sampled, every
    // element with a transparent background reported its own text colour as
    // its backdrop. That scores exactly 1.00, uniformly, for the whole page.
    ctx.clearRect(0, 0, 1, 1);
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
  // source-over: composite a (possibly translucent) colour onto an opaque one
  const over = (fg, bg) => {
    const a = fg[3];
    return [
      fg[0] * a + bg[0] * (1 - a),
      fg[1] * a + bg[1] * (1 - a),
      fg[2] * a + bg[2] * (1 - a),
      1,
    ];
  };
  // Walk up collecting every background-colour until something opaque stops the
  // stack, then composite the lot back down. Taking the first colour with alpha
  // > 0.5 and treating it as opaque — the obvious shortcut — reports a ratio
  // against a colour that was never painted: a bubble at rgba(…, 0.6) over dark
  // paper is measured as if the 0.6 were a 1.
  const bgOf = (el) => {
    const stack = [];
    for (let n = el; n; n = n.parentElement) {
      const px = toRGB(getComputedStyle(n).backgroundColor);
      if (px[3] === 0) continue;
      stack.push(px);
      if (px[3] === 1) break;
    }
    // stack is front-to-back, so fold from the back forwards, onto the page
    return stack.reduceRight((bg, fg) => over(fg, bg), [255, 255, 255, 1]);
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
    const px = parseFloat(cs.fontSize);
    const bg = bgOf(el);
    // The backdrop and the size are part of the identity of a measurement, not
    // incidental to it: the same words in the same colour can pass on the page
    // and fail in a bubble, and keying on text+colour alone lets whichever one
    // renders first hide the other.
    const key = [text, cs.color, bg.join(), px].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    const contrast = ratio(over(toRGB(cs.color), bg), bg);
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
- Translucent `background-color`s are composited, so a stack of washes is
  measured as the colour actually painted. `backdrop-filter`, `mix-blend-mode`
  and `background-blend-mode` are not — anything `frost` or the bevel's `screen`
  blending does to the result is invisible to it.
- `opacity` below 1 on an element or an ancestor is ignored (only `opacity: 0`
  is skipped outright), so faded text scores better here than it looks.
- Ignores text sitting on gradients, images and the noise texture; it samples
  `background-color`, not painted pixels. cyberdeck's `.main-area` scanlines and
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

| Theme      | Palette pairs | Failing AA | Worst                             | DOM audit                         |
| ---------- | ------------- | ---------- | --------------------------------- | --------------------------------- |
| cyberdeck  | 17            | 0 (was 4)  | 5.24 (`error` fill, approximate)  | not yet run                       |
| libris     | 17            | 0          | 5.17 (`error` fill, approximate)  | 40 checked, 0 failing, worst 6.75 |
| plainLight | 17            | 0          | 4.65 (`accent` fill, approximate) | 33 checked, 0 failing             |

Every DOM number above predates two fixes to the snippet — translucent
backgrounds are now composited rather than counted as opaque past 0.5 alpha,
and the dedup key now includes the backdrop and the font size, so a passing row
can no longer swallow a failing one. Both make the check stricter, so the runs
are due again.

libris's DOM pass was run in a room with the roll panel open, three rolled
dice, four chat bubbles and a toast on screen. Treat the earlier plainLight
number with suspicion: it predates the `clearRect` fix above, and that bug
scored every row at exactly 1.00, so "0 failing" can only have come from a run
where the snippet behaved differently than it does now. Worth re-running.

cyberdeck's four failures — `info` 1.62, `success` 1.64, `neutral` 1.78,
`warning` 1.85 — were near-white `-content` on fills that are themselves light.
Fixed by deriving every `-content` from `--l-content` / `--c-content`, as
primary/secondary/accent already did.
