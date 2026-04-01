import { envOrDie } from "#/utils/envOrDie";
import {
  getIdForD1Binding,
  getLocalPathForD1Binding,
} from "./scripts/d1Helpers";
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// "Args":
//
// DATABASE_BINDING should be the value of `binding` in your wrangler d1 config.
// Pass LOCAL=yes when generating migrations to avoid loading the d1 driver, or
// when launching drizzle studio on local.
// Pass ENV to work in a particular cloudflare environment

const { LOCAL, ENV } = process.env;

const { CLOUDFLARE_ACCOUNT_ID, D1_TOKEN, DATABASE_BINDING } = envOrDie([
  "CLOUDFLARE_ACCOUNT_ID",
  "D1_TOKEN",
  "DATABASE_BINDING",
]);

export default defineConfig({
  schema: `./src/schemas/${DATABASE_BINDING}-schema.ts`,
  out: `./migrations/${DATABASE_BINDING}`,
  dialect: "sqlite",
  ...(LOCAL
    ? {
        dbCredentials: {
          url: getLocalPathForD1Binding(DATABASE_BINDING),
        },
      }
    : {
        driver: "d1-http",
        dbCredentials: {
          databaseId: getIdForD1Binding(DATABASE_BINDING, ENV),
          token: D1_TOKEN,
          accountId: CLOUDFLARE_ACCOUNT_ID,
        },
      }),
});
