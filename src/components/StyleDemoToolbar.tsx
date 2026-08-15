import {
  DEFAULT_THEME_NAME,
  isThemeName,
  THEME_NAMES,
  themes,
} from "#/styles/themes/registry";
import { useApplyTheme } from "./useApplyTheme";
import { useState } from "react";

/**
 * Toolbar for the style demo page, so the swatches below can be eyeballed in
 * every theme without editing anything.
 *
 * Unlike the room's `ThemePicker` this is purely local: nothing is persisted and
 * nobody is told, so a reload comes back to the default. That is also why the
 * initial value can be a constant — the demo page passes no theme to
 * `HTML.astro`, so the default is what the server rendered.
 */
export const StyleDemoToolbar = () => {
  const [theme, setTheme] = useState(DEFAULT_THEME_NAME);
  useApplyTheme(theme);

  // fixed rather than sticky because `body` is `h-full`, which would end a
  // sticky element's range one viewport down — the same reason the site nav is
  // fixed. The page leaves room for it.
  return (
    <div
      className="bg-base-200 border-base-300 fixed top-0 right-0 left-0 z-10
        flex flex-wrap items-baseline gap-x-4 gap-y-2 border-b px-6 py-3"
    >
      <label className="flex items-baseline gap-2">
        <span className="font-medium">Theme</span>
        <select
          className="select select-bordered"
          value={theme}
          onChange={(event) => {
            const { value } = event.target;
            if (isThemeName(value)) {
              setTheme(value);
            }
          }}
        >
          {THEME_NAMES.map((name) => (
            <option key={name} value={name}>
              {themes[name].label}
            </option>
          ))}
        </select>
      </label>
      <span className="muted text-sm">{themes[theme].description}</span>
    </div>
  );
};
