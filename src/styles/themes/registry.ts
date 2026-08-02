const HAVOC_DARK_THEME_NAME = "havocDark";

/**
 * Every theme the app can render. A name listed here must have a matching
 * `./<name>.css` declaring a daisyUI theme of the same name — `registry.test.ts`
 * enforces that, so a typo or a rename fails the build rather than silently
 * rendering an unstyled app.
 */
export const THEME_NAMES = [HAVOC_DARK_THEME_NAME] as const;

export type ThemeName = (typeof THEME_NAMES)[number];

/**
 * Whether a theme reads as light or dark. This is what drives the `dark:`
 * variant, via the `data-theme-polarity` attribute on `<html>` — which is why
 * adding a new dark theme needs no edit to `global.css`.
 *
 * Deliberately not called a "scheme": it is not the CSS `color-scheme` value.
 * daisyUI declares that separately inside each theme block, so the two are
 * parallel declarations of the same fact and `registry.test.ts` checks they
 * agree. ("Scheme" would also sit uncomfortably close to the database
 * `schema`s — see the naming note in ADR.md.)
 */
export type ThemePolarity = "light" | "dark";

export interface ThemeInfo {
  label: string;
  description: string;
  polarity: ThemePolarity;
}

export const themes = {
  [HAVOC_DARK_THEME_NAME]: {
    label: "Havoc Dark",
    description: "Cyberpunk chrome: neon, scanlines and chamfered edges",
    polarity: "dark",
  },
} satisfies Record<ThemeName, ThemeInfo>;

export const DEFAULT_THEME_NAME: ThemeName = HAVOC_DARK_THEME_NAME;

export interface ResolvedTheme extends ThemeInfo {
  name: ThemeName;
}

export function isThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === "string" && THEME_NAMES.some((name) => name === value)
  );
}

/**
 * `rooms.theme` is unconstrained text, so it can hold anything: null for a room
 * created before themes existed, or a name we no longer ship. Resolving to the
 * default rather than throwing means a stale value costs the room its look, not
 * its usability.
 */
export function resolveTheme(value: unknown): ResolvedTheme {
  const name = isThemeName(value) ? value : DEFAULT_THEME_NAME;
  return { name, ...themes[name] };
}
