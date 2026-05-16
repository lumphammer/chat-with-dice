import { transform as svgr } from "@svgr/core";
import { readFile } from "node:fs/promises";
import { type Config as SvgoConfig, optimize } from "svgo";
import { type Plugin, transformWithOxc } from "vite";

const { default: svgrJsxPlugin } = await import("@svgr/plugin-jsx");

/**
 * Custom Vite plugin for importing SVG files as React components when you add
 * the `?react` query parameter.
 *
 * ## Why
 *
 * Astro turns any .svg file with no query params into an Astro component. So we
 * have this plugin which processes any import tht has a .svg file
 * extension and the "?react" query parameter and turns it into a react
 * component.
 *
 * The resulting component can take any prop that a native <svg> can take.
 *
 * Example:
 *
 * ```tsx
 * import MyIcon from "my-icon.svg?react";
 *
 * export const MyComponent = () => {
 *   return (
 *     <div><MyIcon height="24" width="24"/></div>
 *   );
 * };
 * ```
 *
 * The default is to strip out all styles from the SVG, so it functions like an
 * icon. Use `&illustration` to keep the SVG's design intact.
 * ```tsx
 * import MyInfographic from "my-icon.svg?react&illustration";
 *
 * export const MyComponent = () => {
 *   return (
 *     <div><MyInfographic /></div>
 *   );
 * };
 * ```
 *
 * My favourite pattern is to design SVGs in Inkscape, not Adobe or Affinity, so
 * you can add CSS clases to elements and then target them with Tailwind:
 * ```tsx
 * <Logo
 *   width={24}
 *   height={24}
 *   className="[&_.swoosh]:fill-red-500 [&_.backdrop]:fill-pink-100"
 * />
 * ```
 *
 * Inspired by https://github.com/pd4d10/vite-plugin-svgr/blob/main/src/index.ts
 */
export function reactSvgPlugin(): Plugin {
  return {
    enforce: "pre",
    name: "react-svg",

    async load(id) {
      const [path, querystring] = id.split("?");
      const params = new URLSearchParams(querystring);
      if (!(path.endsWith(".svg") && params.has("react"))) {
        return null;
      }
      const activeConfig = params.has("illustration")
        ? illustrationConfig
        : defaultConfig;

      const rawSVGCode = await readFile(path, { encoding: "utf8" });
      const optimizedSVGCode = optimize(
        rawSVGCode,
        Object.assign({}, activeConfig, { path }),
      ).data;
      // SVGR docs: https://react-svgr.com/docs/node-api/
      const jsxCode = await svgr(
        optimizedSVGCode,
        { jsxRuntime: "automatic" },
        {
          componentName: "MyComponent",
          filePath: `${path}.tsx`,
          caller: {
            defaultPlugins: [svgrJsxPlugin],
          },
        },
      );
      const transformResult = await transformWithOxc(jsxCode, id, {
        lang: "jsx",
      });

      return {
        code: transformResult.code,
        map: null, // TODO:
      };
    },
  };
}

/**
 * Default SVGO config - strips all styles out, and sets fill and stroke to
 * `currentColor`, so it functions like an icon.
 */
const defaultConfig: SvgoConfig = {
  // these are plugins to *SVGO*
  plugins: [
    {
      name: "preset-default",
    },
    // converts `style=color:red` to color=red
    {
      name: "convertStyleToAttrs",
    },
    // and then we change every color to `currentColor` which means it
    // inherits the color from the parent element, so we can use it
    // inline with text (like an icon) or set a CSS color on the SVG
    // when we render it.
    {
      name: "convertColors",
      params: {
        currentColor: true,
      },
    },
    {
      name: "removeAttrs",
      params: {
        attrs: ["fill"],
      },
    },
    {
      name: "addAttributesToSVGElement",
      params: {
        attributes: [
          {
            fill: "currentColor",
          },
          {
            stroke: "currentColor",
          },
        ],
      },
    },
  ],
};

/**
 * SVGO config for illustration SVGs - keeps all styles intact, so the image
 * retains its design.
 */
const illustrationConfig: SvgoConfig = {
  plugins: [
    {
      name: "preset-default",
      params: {
        overrides: {
          collapseGroups: false,
          cleanupIds: false,
        },
      },
    },
  ],
};
