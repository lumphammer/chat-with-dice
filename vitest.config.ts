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
        },
      },
      {
        plugins: [
          sqlAsString(),
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
            "astro:actions": fileURLToPath(
              new URL(
                "./src/test-utils/integration/astroActionsShim.ts",
                import.meta.url,
              ),
            ),
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
