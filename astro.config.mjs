import { reactSvgPlugin } from "./vitePluginReactSvg";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, svgoOptimizer } from "astro/config";
import { visualizer } from "rollup-plugin-visualizer";

// Hooks for the render benchmarks in bench/. Neither is set in normal builds.
// BENCH_REACT_COMPILER=off builds without React Compiler; BENCH_PROFILING=1
// swaps in React's profiling build so commit durations can be measured, and
// skips minifying so component names survive into the results.
const reactCompiler = process.env.BENCH_REACT_COMPILER !== "off";
const reactProfiling = process.env.BENCH_PROFILING === "1";

export default defineConfig({
  output: "static",
  adapter: cloudflare({}),
  integrations: [react({ compiler: reactCompiler })],
  experimental: {
    // rustCompiler: true,
    svgOptimizer: svgoOptimizer({
      multipass: true,
      plugins: [
        {
          name: "preset-default",
        },
      ],
    }),
  },

  vite: {
    resolve: reactProfiling
      ? { alias: { "react-dom/client": "react-dom/profiling" } }
      : undefined,
    build: reactProfiling ? { minify: false } : undefined,
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
        // tailscale tailnet
        ".werewolf-gharial.ts.net",
      ],
    },
  },
});
