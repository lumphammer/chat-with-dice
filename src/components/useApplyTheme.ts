import { themes, type ThemeName } from "#/styles/themes/registry";
import { useEffect } from "react";

/**
 * Keeps `<html>`'s theme attributes in step with a theme chosen client-side.
 *
 * `HTML.astro` renders both attributes server-side, so on first paint this hook
 * has nothing to do — it exists for the live cases: the room owner picks a
 * different theme and every connected client is told over the WebSocket, or the
 * style demo's toolbar picks one locally. Every theme's CSS is already loaded
 * (see `themes/index.css`), so swapping the attribute is the whole of the
 * change; nothing is fetched.
 *
 * `data-theme-polarity` has to move with `data-theme` or the `dark:` variant
 * ends up describing the theme we just left.
 */
export const useApplyTheme = (theme: ThemeName) => {
  useEffect(() => {
    const { documentElement } = document;
    documentElement.dataset["theme"] = theme;
    documentElement.dataset["themePolarity"] = themes[theme].polarity;
  }, [theme]);
};
