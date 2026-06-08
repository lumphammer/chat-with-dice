import { reactSvgPlugin } from "./vitePluginReactSvg";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, svgoOptimizer } from "astro/config";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  output: "static",
  adapter: cloudflare({}),
  integrations: [react()],
  experimental: {
    // rustCompiler: true,
    svgOptimizer: svgoOptimizer({
      multipass: true,
      plugins: [
        {
          name: "preset-default",
        },
        {
          name: "removeAttrs",
          params: {
            attrs: "style",
          },
        },
      ],
    }),
  },

  vite: {
    plugins: [
      reactSvgPlugin(),
      tailwindcss(),
      visualizer({
        emitFile: true,
        filename: "stats.html",
      }),
    ],
    server: {
      allowedHosts: [
        // ngrok
        ".ngrok-free.app",
        // used in worker direct middleware when generating a 404
        "somehostname",
      ],
    },
  },
});
