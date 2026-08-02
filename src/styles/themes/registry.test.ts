import {
  DEFAULT_THEME_NAME,
  THEME_NAMES,
  isThemeName,
  resolveTheme,
  themes,
} from "./registry";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const themesDir = dirname(fileURLToPath(import.meta.url));

describe("theme registry", () => {
  // The registry names themes; the stylesheets declare them. Nothing else ties
  // the two together, so a rename on one side would otherwise fall through to a
  // room rendering with no theme at all.
  it.each([...THEME_NAMES])(
    "%s has a stylesheet declaring it",
    async (name) => {
      const css = await readFile(join(themesDir, `${name}.css`), "utf8");
      expect(css).toContain(`name: "${name}"`);
    },
  );

  // A theme's polarity is stated twice: here, to drive the `dark:` variant, and
  // as `color-scheme` in the stylesheet, to drive browser-provided UI. Nothing
  // derives one from the other, so they can drift — and a mismatch means `dark:`
  // utilities firing over an inverted palette.
  it.each([...THEME_NAMES])(
    "%s declares a color-scheme matching its registered polarity",
    async (name) => {
      const css = await readFile(join(themesDir, `${name}.css`), "utf8");
      expect(css).toMatch(
        new RegExp(`color-scheme:\\s*${themes[name].polarity}\\s*;`),
      );
    },
  );

  it("defaults to a registered theme", () => {
    expect(isThemeName(DEFAULT_THEME_NAME)).toBe(true);
  });

  it("resolves a registered name to its own entry", () => {
    const resolved = resolveTheme(DEFAULT_THEME_NAME);
    expect(resolved).toEqual({
      name: DEFAULT_THEME_NAME,
      ...themes[DEFAULT_THEME_NAME],
    });
  });

  it.each([null, undefined, "", "  ", "notATheme", true, {}, []])(
    "falls back to the default for %o",
    (value) => {
      expect(resolveTheme(value).name).toBe(DEFAULT_THEME_NAME);
    },
  );
});
