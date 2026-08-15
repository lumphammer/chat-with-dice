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

1. `pnpm run dev`, open a room in the theme you want to audit. `/style-demo`
   is the complementary target: it renders every button colour and style, the
   alerts and a toast over all three base surfaces, which is most of what a
   room does not have on screen.
2. Open as much UI as you can first — the audit only sees what is currently in
   the DOM. Send a chat message, roll some dice, open the sidebar panels,
   open a modal. Anything closed is anything unaudited.
3. If you have just switched theme, **wait a second before running it** — see
   [Switching theme mid-session](#switching-theme-mid-session).
4. Paste the snippet below into the devtools console.

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

  // WCAG 1.4.3 exempts "inactive user interface components", so a disabled
  // control's deliberately greyed-out label is not a failure. Without this the
  // room pass reports every disabled button at ~1.5 and the real findings
  // drown in them.
  const isDisabled = (el) =>
    !!el.closest(
      "[disabled], [aria-disabled='true'], .btn-disabled, fieldset:disabled",
    );

  // A ratio on its own is not actionable — there are five `.btn-primary`s on
  // the style demo and the number alone doesn't say which surface it was over.
  const whereOf = (el) => {
    const parts = [];
    for (let n = el; n && parts.length < 3; n = n.parentElement) {
      const cls =
        typeof n.className === "string" && n.className.trim()
          ? "." + n.className.trim().split(/\s+/).slice(0, 4).join(".")
          : "";
      parts.push(n.tagName.toLowerCase() + cls);
    }
    return parts.join(" < ");
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
      disabled: isDisabled(el),
      where: whereOf(el),
    });
  }
  rows.sort((a, b) => a.contrast - b.contrast);
  const live = rows.filter((r) => !r.passes && !r.disabled);
  console.table(live);
  console.log(
    `${live.length} failing / ${rows.length} checked`,
    `(${rows.filter((r) => !r.passes && r.disabled).length} exempt: disabled)`,
    `— worst ${live[0]?.contrast}`,
  );
  return rows;
})();
```

### Sweeping a room's panels

The audit only sees what is mounted, and a room keeps seven-eighths of its UI
in closed sidebar panels. Rather than one pass over whatever happens to be
open, click each panel in turn and union the rows — same `seen` key, so a row
measured in one panel is not re-measured in the next:

```js
window.__seen = new Map(); // then make the snippet above write into it
for (const tab of document.querySelectorAll(".sidebar-tab-button")) {
  tab.click();
  await new Promise((r) => setTimeout(r, 900));
  audit(); // adds to __seen
}
```

That takes the room from ~120 rows to ~230.

## Switching theme mid-session

Auditing several themes in one page — via the style demo's toolbar, or by
setting `data-theme` / `data-theme-polarity` by hand — is the fastest way to do
this, and it silently produces nonsense unless you wait between the switch and
the run.

`.btn` transitions `background-color` over 200ms. **Part-way through that
transition the computed background is `oklab(0 0 0 / 0)` — fully
transparent** — and `bgOf` treats alpha 0 as "nothing painted here" and walks
straight past, measuring every button label against the section behind the
button instead of against the button's own fill. Every button then scores
somewhere between 1.0 and 3.2 and the run reports a catastrophe that isn't
there. Sampled on a cyberdeck → plainLight switch:

| after | `getComputedStyle(btn).backgroundColor` |
| ----- | --------------------------------------- |
| 0ms   | `oklab(0 0 0 / 0)`                      |
| 104ms | `oklab(0.5 0.16 0 / 0.807612)`          |
| 157ms | `oklab(0.5 0.16 0 / 0.964517)`          |
| 212ms | `oklch(0.5 0.16 0)` — settled           |

So: **wait ≥ 500ms after changing the theme.** Two `requestAnimationFrame`s
are not enough, and neither is 100ms — that lands squarely in the middle of the
fade. Forcing a style recalc doesn't help either; the value is not stale, it is
a correct reading of a colour that is genuinely half-transparent right now.

The cheap way to know you got a clean run is to run the audit twice and check
the numbers match. A settled page is idempotent; a mid-transition one is not.

This is also why the manual workflow at the top has never hit the problem — a
human switching a theme and then pasting a snippet takes seconds.

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
- Disabled controls are detected and excluded, but only via `[disabled]`,
  `[aria-disabled]`, `.btn-disabled` and `fieldset:disabled`. A control greyed
  out by some other means will still be reported.

## Auditing the palette instead

The DOM snippet above only sees rendered elements, which is how the alert and
neutral-button failures below went unnoticed — those components simply weren't
on screen. The palette itself can be audited separately: check each
`--color-X` / `--color-X-content` pair, the `--color-*-text` colours against
`base-100`, and `base-content` against each base surface.

That is a strictly complementary check: it covers every pair the palette
promises regardless of what's mounted, but it can't see anything painted on top
— gradients, scanlines, noise, translucent surfaces. Run both.

Do it **in the browser**, off a probe element, rather than by resolving the
`oklch()` seeds in plain JS. Two reasons. The static model gamut-maps naively
where the engine is cleverer, so out-of-sRGB fills come out approximate; and,
more importantly, it needs a copy of the palette, which is a trap — one session
produced wrong plainLight findings from exactly that, after the theme file
changed underneath the copy. Reading the custom properties off a live element
has nothing to rot.

Paste this after the snippet above (it reuses `toRGB`, `ratio` and `over`):

```js
(() => {
  const probe = document.createElement("div");
  document.body.appendChild(probe);
  // `transparent` fallback rather than bare var(): an unresolvable custom
  // property makes `color` invalid-at-computed-value-time, so it inherits, and
  // an inherited colour would be measured as if the theme had declared it.
  // Alpha 0 is how we spot "this theme has no such variable".
  const read = (name) => {
    probe.style.color = `var(${name}, transparent)`;
    return toRGB(getComputedStyle(probe).color);
  };
  const base100 = read("--color-base-100");
  const ink = read("--color-base-content");
  const rows = [];
  for (const n of [
    "primary",
    "secondary",
    "accent",
    "neutral",
    "info",
    "success",
    "warning",
    "error",
  ]) {
    const fill = read(`--color-${n}`);
    const content = read(`--color-${n}-content`);
    if (fill[3] && content[3])
      rows.push({
        pair: `${n}-content on ${n}`,
        contrast: +ratio(over(content, fill), fill).toFixed(2),
      });
    const t = read(`--color-${n}-text`);
    if (t[3])
      rows.push({
        pair: `${n}-text on base-100`,
        contrast: +ratio(over(t, base100), base100).toFixed(2),
      });
  }
  for (const b of ["base-100", "base-200", "base-300"]) {
    const s = read(`--color-${b}`);
    rows.push({
      pair: `base-content on ${b}`,
      contrast: +ratio(over(ink, s), s).toFixed(2),
    });
  }
  probe.remove();
  rows.sort((a, b) => a.contrast - b.contrast);
  console.table(rows);
  return rows;
})();
```

This reports **15 pairs**, not the 17 you might expect from counting the
declarations: `--color-warning-text` and `--color-success-text` are declared in
global.css's `@theme` but nothing in the app uses them, so Tailwind never emits
them and at runtime they do not exist. They will start being measured the day
something renders them.

## Results so far

Last run 2026-08-15, on `/style-demo` at 1280×800, all three themes, both
passes. Numbers below supersede every earlier recorded run: those predate the
`clearRect` fix, the compositing fix and the dedup-key fix, and the DOM ones
also predate [the transition trap](#switching-theme-mid-session).

### Palette pass — clean

| Theme      | Pairs | Failing AA | Worst                                 |
| ---------- | ----- | ---------- | ------------------------------------- |
| cyberdeck  | 19    | 0 (was 4)  | 5.22 `error-content on error`         |
| libris     | 19    | 0          | 6.67 `secondary-content on secondary` |
| plainLight | 19    | 0          | 4.65 `accent-content on accent`       |

Every palette a theme declares clears AA. The failures below are all things the
palette pass cannot see, which is the argument for running both.

19 rather than the 15 noted above: fixing the outline buttons added
`--color-info-text` and `--color-neutral-text`, and gave `warning`/`success`
their first real consumers, so all four now exist at runtime and are measured.

### DOM pass

The style demo deliberately repeats its swatches over `bg-black` and `bg-white`
as well as the three base surfaces. Those two are **off-theme backdrops** — no
theme promises contrast against a colour it didn't choose — so they are counted
separately rather than mixed into the verdict.

Failures on theme surfaces, before and after the button fix below:

| Theme      | Checked | Was   | Now   | Off-theme backdrops | Worst on theme surfaces |
| ---------- | ------- | ----- | ----- | ------------------- | ----------------------- |
| cyberdeck  | 187     | **0** | **0** | 36 (all `bg-white`) | 7.06                    |
| libris     | 187     | 8     | **3** | 30 (all `bg-black`) | 3.89                    |
| plainLight | 119     | 10    | **6** | 19 (18 `bg-black`)  | 1.03                    |

The off-theme column falls out exactly as polarity predicts — the dark theme
fails only on white, the two light themes only on black — which is a decent
sanity check that the run was clean.

**cyberdeck passes outright.** Nothing on a surface it owns is below AA.

#### Fixed: the fill-less button family used the fill colour as ink

17 of the 18 original failures were one bug. daisyUI's outline, dash, soft and
ghost buttons paint their label in `--btn-color` — the _fill_ hue — and only
flip to `--btn-fg` on hover once a fill appears. A fill hue is picked to carry
white-ish `-content` text on top of it, so it is far too light to be ink on a
light page: every `.btn-outline` on libris and plainLight sat between 3.85 and
4.47 against base-100.

Fixed in `global.css` by pointing `--btn-rest-fg` — daisyUI's own hook for the
resting foreground — at `--btn-color-text`, so the whole family inherits the
`-text` ink that already existed for exactly this purpose. One rule covers all
four variants because all four read the same variable. Two supporting changes:
`--btn-color-text` now has an entry for every button colour rather than just
primary/secondary/accent, and `--color-info-text` / `--color-neutral-text` were
added to complete the `-text` family. cyberdeck is unaffected — it already
painted every `.btn` with `--btn-color-text` directly.

This also cleared plainLight's `.btn-soft.btn-accent` (4.16), which shares the
declaration.

**libris — 3 remaining, 3.89–4.47. Expected, not a defect.** All
`.text-primary` / `.text-secondary` / `.text-accent` on the demo page. Those
swatches exist precisely to show what happens _if_ you use a fill colour for
text; the page prints them next to their `.text-*-text` partners for the
comparison. Treat them as a permanent, known-failing control group — if they
ever pass, the demo has stopped demonstrating anything.

**plainLight — 6 remaining, one severe.**

- **`.alert.alert-error` at 1.03 / 1.12 / 1.23 — invisible.** Verified on
  screen, not just in the numbers: it renders as an empty red-outlined box.
  `global.css`'s blanket `.alert { all: revert-layer }` strips daisyUI's fill,
  but `color: var(--color-error-content)` survives, because daisyUI emits it
  outside the reverted sublayer — the same quirk that bites `.alert`'s
  `border-width`. cyberdeck and libris both restyle `.alert` and supply their
  own foreground, so both are fine; plainLight is palette-only by design and
  gets near-white ink on a near-white page. This is exactly the base-layer bug
  plainLight exists as a canary for, and it is a live **"override a background,
  own the foreground"** violation — committed by global.css itself, against
  every theme that doesn't restyle `.alert`.
- The other 3 are the same `.text-accent` / `.text-secondary` demo rows as
  libris, 3.85–4.40 — the same known-failing control group.

### Room pass

Run on a populated dev room, sweeping all eight sidebar panels per theme, with
a chat message sent so the `data-is-mine` bubble variant was on screen.
Disabled controls excluded per WCAG 1.4.3.

| Theme      | Checked | Was | Now   |
| ---------- | ------- | --- | ----- |
| cyberdeck  | 231     | 31  | **0** |
| libris     | 234     | 34  | **0** |
| plainLight | 233     | 41  | **0** |

Nothing found here was a palette problem — all three palettes passed
throughout — and nothing was theme CSS. **Every finding was markup reaching
past the theme tokens**, which is why the style demo missed all of it. Three
clusters, all now fixed:

1. **Alpha on ink — the whole `text-base-content/NN` family.** 116 uses across
   eight alpha levels. Fading ink toward the surface costs each theme a
   different amount, because each picks its own distance between `base-content`
   and `base-100`: at `/70`, cyberdeck read 7.46:1 and libris 4.45:1 — same
   token, 3.3x apart, one of them failing. Replaced wholesale by the muted
   token below.
2. **Avatar initials.** 2.70 libris/plainLight, 3.23 cyberdeck.
   `OnlineUserBadge.tsx` painted the initials in the bubble ink at `/0.6`. The
   bubble uses that same pair at full strength and passes, so the alpha was the
   whole problem.
3. **Fill colours used as ink.** 2.57 plainLight, 4.08 libris.
   `STORY_CARD_TONES`, `ObstructionRollMessage`, `CardDrawMessageDisplay` and
   `LaserFeelingsResultDisplay` set `text-warning` / `text-accent` /
   `text-info` / `text-neutral` — fills, over a 10% tint of themselves. Same
   bug as `.btn-outline` above, same fix: the `-text` partners. daisyUI's
   `.btn-link`, `.link-accent` and `.link-primary` were the same shape and are
   now corrected centrally in global.css.

### Secondary text: the muted token

`--color-base-content-muted`, derived from `base-content` by an absolute
lightness each theme sets (`--l-base-content-muted`), at full alpha. One class,
`.muted`, replaces all 116 alpha sites plus the `opacity-*` uses that sat on
text.

The absolute lightness is the point: it moves the decision to the theme, which
is the only place that knows how much room it has between its ink and its
surfaces. And because it is a real colour rather than a compositing trick, the
palette pass can audit it.

| Theme      | `--l-base-content-muted` | Worst measured | Body ink, for scale |
| ---------- | ------------------------ | -------------- | ------------------- |
| cyberdeck  | 0.70                     | 6.75           | 11.16               |
| libris     | 0.38                     | 6.38           | 8.86                |
| plainLight | 0.40                     | 5.20           | 15.57               |

Each theme then adds a **typographic voice**, because once the ink clears AA it
is no longer dim enough to read as secondary on colour alone: libris sets it in
italic (Garamond's italic is a separate cut, so it reads as a change of voice
rather than emphasis), cyberdeck tracks it out like HUD chrome, and plainLight
deliberately takes neither — being palette-only makes it the check that the
colour alone still works. The voice also survives `prefers-contrast: more`,
where dimming is the first thing stripped.

**Watch the chat bubble.** It is `oklch(82% 0.12 hue)` in every theme, so under
plainLight — base-100 luminance 0.91 — a bubble at 0.54 is by far the darkest
thing the app paints text on. Tuning against the base surfaces and stopping put
muted text at 4.18:1 and the story-card banners at 4.03: fine on the page, both
failing in a bubble. plainLight's `--l-colored-text` came down from 0.4 to 0.34
for the same reason. **Tune a light theme against a bubble, not against
base-100.**

### Deliberately left alone

`opacity-*` that signals **state** rather than hierarchy: `disabled:opacity-50`,
`data-offline:opacity-50`, `data-completed:opacity-50`, and `opacity-35` on
dimmed dice. Disabled controls are WCAG-exempt, and the others say "this thing
is inactive", which is what a fade is for. Icon-only `opacity-50` is left too —
no text, no requirement. Note the audit **cannot see any of these**: it ignores
`opacity` below 1 entirely, so this class has to be reasoned about rather than
measured, and it is where transparency will creep back in first.

### Still not covered

Modals and toasts. Both exist in the room (`ProtagonistEditDialog`, the toaster)
but neither was open during the sweep, so neither has ever been measured.

### Previously fixed

cyberdeck's four palette failures — `info` 1.62, `success` 1.64, `neutral` 1.78,
`warning` 1.85 — were near-white `-content` on fills that are themselves light.
Fixed by deriving every `-content` from `--l-content` / `--c-content`, as
primary/secondary/accent already did.
