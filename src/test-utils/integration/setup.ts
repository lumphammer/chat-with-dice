import type { D1Migration } from "@cloudflare/vitest-pool-workers";
import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll } from "vitest";

interface TestEnv extends Cloudflare.Env {
  TEST_MIGRATIONS: D1Migration[];
}

beforeAll(async () => {
  const testEnv = env as TestEnv;
  await applyD1Migrations(testEnv.CORE_D1, testEnv.TEST_MIGRATIONS);
});
