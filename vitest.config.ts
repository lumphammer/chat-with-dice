// oxlint-disable-next-line typescript/triple-slash-reference
/// <reference types="vitest/config" />
import {
  type D1Migration,
  cloudflareTest,
} from "@cloudflare/vitest-pool-workers";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Plugin, defineConfig } from "vitest/config";

/**
 * The DO-internal migration loaders (e.g. `durable-object-migrations/.../migrations.js`)
 * `import sql from "./migration.sql"` and expect the file contents as a string.
 * In production the Cloudflare/Astro build pipeline handles this; the workers
 * vitest pool's bundler doesn't, so we provide it here.
 */
function sqlAsString(): Plugin {
  return {
    name: "sql-as-string",
    enforce: "pre",
    async load(id) {
      if (!id.endsWith(".sql")) return null;
      const content = await readFile(id, "utf8");
      return `export default ${JSON.stringify(content)};`;
    },
  };
}

/**
 * `astro/actions/runtime/entrypoints/server` (which we alias `astro:actions` to)
 * imports `virtual:astro:actions/options` — a virtual module Astro injects at
 * build time. The workers pool's bundler has no Astro context, so we stand it
 * up here with safe defaults. We only need `defineAction` + `ActionError` in
 * tests; the trailing-slash behavior the option controls is irrelevant.
 */
function stubAstroActionsVirtuals(): Plugin {
  const RESOLVED = "\0virtual:astro:actions/options";
  return {
    name: "stub-astro-actions-virtuals",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:astro:actions/options") return RESOLVED;
    },
    load(id) {
      if (id === RESOLVED) {
        return "export const shouldAppendTrailingSlash = false;";
      }
    },
  };
}

// Drizzle generates one folder per migration, each containing a `migration.sql`
// using `--> statement-breakpoint` as a statement separator. The wrangler-shaped
// `readD1Migrations` helper expects flat `*.sql` files at the top level, so we
// roll our own here.
async function readDrizzleMigrations(
  migrationsPath: string,
): Promise<D1Migration[]> {
  const entries = await readdir(migrationsPath, { withFileTypes: true });
  const dirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  return Promise.all(
    dirs.map(async (name) => {
      const sql = await readFile(
        join(migrationsPath, name, "migration.sql"),
        "utf8",
      );
      const queries = sql
        .split("--> statement-breakpoint")
        .map((query) => query.trim())
        .filter((query) => query.length > 0);
      return { name, queries };
    }),
  );
}

const migrations = await readDrizzleMigrations("./migrations/coreD1");

const sharedAlias = {
  "#": fileURLToPath(new URL("./src", import.meta.url)),
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    projects: [
      {
        resolve: { alias: sharedAlias },
        esbuild: { jsx: "automatic", jsxImportSource: "react" },
        test: {
          name: "unit",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.int.test.{ts,tsx}", "**/node_modules/**"],
          typecheck: {
            enabled: true,
          },
        },
      },
      {
        plugins: [
          sqlAsString(),
          stubAstroActionsVirtuals(),
          cloudflareTest({
            main: "./src/test-utils/integration/testWorker.ts",
            miniflare: {
              compatibilityDate: "2026-04-18",
              compatibilityFlags: ["nodejs_compat"],
              d1Databases: ["CORE_D1"],
              durableObjects: {
                USER_DATA_DO: { className: "UserDataDO", useSQLite: true },
              },
              bindings: {
                TEST_MIGRATIONS: migrations,
                BETTER_AUTH_URL: "http://localhost/",
                GITHUB_CLIENT_ID: "test",
                GITHUB_CLIENT_SECRET: "test",
                GOOGLE_CLIENT_ID: "test",
                GOOGLE_CLIENT_SECRET: "test",
                RESEND_API_KEY: "test",
                RESEND_FROM_EMAIL: "test@example.com",
              },
            },
          }),
        ],
        resolve: {
          alias: {
            ...sharedAlias,
            // Astro's `astro:actions` is a build-time virtual module. Point it
            // at the real runtime entrypoint so tests use Astro's actual
            // `defineAction` + `ActionError` — that way the `.orThrow` test
            // pattern in `callAction` runs the genuine input validator and
            // error wrapping, not a shim.
            "astro:actions": "astro/actions/runtime/entrypoints/server",
          },
        },
        test: {
          name: "integration",
          include: ["src/**/*.int.test.{ts,tsx}"],
          setupFiles: ["./src/test-utils/integration/setup.ts"],
        },
      },
    ],
  },
});
