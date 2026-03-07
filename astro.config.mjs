import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  output: "static",
  adapter: cloudflare({}),
  integrations: [react()],
  experimental: {
    svgo: {
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
    },
  },

  vite: {
    resolve: {
      alias: {
        "#": fileURLToPath(new URL("./src", import.meta.url)),
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    plugins: [
      tailwindcss(),
      visualizer({
        emitFile: true,
        filename: "stats.html",
      }),
    ],
    server: {
      allowedHosts: [".ngrok-free.app"],
    },
  },
});
