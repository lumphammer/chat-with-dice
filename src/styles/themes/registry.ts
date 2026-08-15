const CYBERDECK_THEME_NAME = "cyberdeck";
const LIBRIS_THEME_NAME = "libris";
const PLAIN_LIGHT_THEME_NAME = "plainLight";

/**
 * Every theme the app can render. A name listed here must have a matching
 * `./<name>.css` declaring a daisyUI theme of the same name — `registry.test.ts`
 * enforces that, so a typo or a rename fails the build rather than silently
 * rendering an unstyled app.
 */
export const THEME_NAMES = [
  CYBERDECK_THEME_NAME,
  LIBRIS_THEME_NAME,
  PLAIN_LIGHT_THEME_NAME,
] as const;

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
  [CYBERDECK_THEME_NAME]: {
    label: "Cyberdeck",
    description: "Cyberpunk chrome: neon, scanlines and chamfered edges",
    polarity: "dark",
  },
  [LIBRIS_THEME_NAME]: {
    label: "Libris",
    description: "A refined, turn-of-the-century library.",
    polarity: "light",
  },
  [PLAIN_LIGHT_THEME_NAME]: {
    label: "Plain Light",
    description: "Clean and legible, with none of the sci-fi chrome",
    polarity: "light",
  },
} satisfies Record<ThemeName, ThemeInfo>;

export const DEFAULT_THEME_NAME: ThemeName = CYBERDECK_THEME_NAME;

export interface ResolvedTheme extends ThemeInfo {
  name: ThemeName;
}

export function isThemeName(value: unknown): value is ThemeName {
  return (
    typeof value === "string" && THEME_NAMES.some((name) => name === value)
  );
}

/**
 * Themes that have been renamed. Rooms picked their theme before the rename and
 * `rooms.theme` still holds the old string, so these are mapped rather than
 * migrated — same approach as `normalizeLegacyHavocCapabilities` takes with
 * retired capability names, and for the same reason: the read path is a single
 * choke point, so there is nothing a migration would buy.
 *
 * Entries here are permanent. Dropping one silently reverts those rooms to the
 * default.
 */
const LEGACY_THEME_NAMES: Record<string, ThemeName> = {
  havocDark: CYBERDECK_THEME_NAME,
  havocLight: PLAIN_LIGHT_THEME_NAME,
};

/**
 * `rooms.theme` is unconstrained text, so it can hold anything: null for a room
 * created before themes existed, a name we have since renamed, or a name we no
 * longer ship at all. Resolving to the default rather than throwing means a
 * stale value costs the room its look, not its usability.
 */
export function resolveTheme(value: unknown): ResolvedTheme {
  const name = isThemeName(value)
    ? value
    : ((typeof value === "string" ? LEGACY_THEME_NAMES[value] : undefined) ??
      DEFAULT_THEME_NAME);
  return { name, ...themes[name] };
}
