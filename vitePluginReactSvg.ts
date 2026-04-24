import { transform as svgr } from "@svgr/core";
import { readFile } from "node:fs/promises";
import { type Config as SvgoConfig, loadConfig, optimize } from "svgo";
import { type Plugin, transformWithEsbuild } from "vite";

const { default: svgrJsxPlugin } = await import("@svgr/plugin-jsx");

// Inspired by https://github.com/pd4d10/vite-plugin-svgr/blob/main/src/index.ts
// SVGR docs: https://react-svgr.com/docs/node-api/

export type ReactSVGPluginConfig = {
  svgoConfig: {
    default: SvgoConfig;
    variants?: Record<string, SvgoConfig>;
  };
};

async function optimizeSvg(
  content: string,
  path: string,
  svgoConfig?: SvgoConfig,
) {
  const config = svgoConfig || (await loadConfig());
  if (config && config.datauri) {
    throw new Error(
      "datauri option for svgo is not allowed when you use vite-plugin-react-svg. Remove it or use a falsy value.",
    );
  }
  const result = optimize(content, Object.assign({}, config, { path }));
  return result.data;
}

const defaultConfig = {
  svgoConfig: {
    default: {},
  },
};

/* how this plugin works:
 * Astro turns any .svg file with no query params into an Astro component. So at
 * a minimum we need to put `?react` on the end of out import path.
 */

export function reactSvgPlugin(
  pluginconfig: ReactSVGPluginConfig = defaultConfig,
): Plugin {
  // let reactPlugin: Plugin;
  return {
    enforce: "pre",
    name: "react-svg",

    /**
     * Do what we we need to do to convert the svg source into usable solid JSX.
     */
    async load(id) {
      const [path, querystring] = id.split("?");
      const params = new URLSearchParams(querystring);
      if (!(path.endsWith(".svg") && params.has("react"))) {
        return null;
      }

      const variantId = params.get("variant") ?? "default";
      const activeConfig =
        variantId === "default"
          ? pluginconfig.svgoConfig.default
          : pluginconfig.svgoConfig.variants?.[variantId];

      if (!activeConfig) {
        throw new Error(`Invalid variant: ${variantId}`);
      }

      const code = await readFile(path, { encoding: "utf8" });
      const optimized = await optimizeSvg(code, path, activeConfig);
      const jsCode = await svgr(
        optimized,
        { jsxRuntime: "automatic" },
        {
          componentName: "MyComponent",
          filePath: `${path}.tsx`,
          caller: {
            defaultPlugins: [svgrJsxPlugin],
          },
        },
      );
      console.log("JS Code:\n=======\n\n", jsCode, "\n\n");
      const transformResult = await transformWithEsbuild(jsCode, id, {
        loader: "jsx",
        jsx: "automatic",
        // ...esbuildOptions,
      });

      return {
        code: transformResult.code,
        map: null, // TODO:
      };
    },

    /**
     * Having munged the source code, we need to transform it into a solid
     * component.
     */
    // transform(source, id, transformOptions) {
    //   const [path] = id.split("?");
    //   if (id.endsWith(".svg?react")) {
    //     console.log("Source:\n=======\n\n", source, "\n\n");
    //     const transformFn =
    //       reactPlugin &&
    //       "transform" in reactPlugin &&
    //       (typeof reactPlugin.transform === "function"
    //         ? reactPlugin.transform
    //         : reactPlugin.transform?.handler);
    //     if (transformFn) {
    //       try {
    //         return transformFn?.bind(this)(
    //           source,
    //           `${path}.tsx`,
    //           transformOptions,
    //         );
    //       } catch {
    //         console.error("final react transform shat itself");
    //       }
    //     } else {
    //       console.error("No transform function found");
    //     }
    //   }
    // },
  };
}
