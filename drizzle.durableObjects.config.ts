import { envOrDie } from "#/utils/envOrDie";
import { getClassNameForDOBinding } from "#/utils/getClassNameForDOBinding";
import { defineConfig } from "drizzle-kit";

// "Args":
//
// DO_BINDING should be the value of `binding` in your wrangler durable_objects config.
// Pass ENV to work in a particular cloudflare environment

const { DO_BINDING } = envOrDie(["DO_BINDING"]);

const className = getClassNameForDOBinding(DO_BINDING);

export default defineConfig({
  schema: `./src/schemas/${className}-schema.ts`,
  out: `./src/durable-object-migrations/${className}`,
  dialect: "sqlite",
  driver: "durable-sqlite",
});
