import { relations } from "./schemas/coreD1-schema";
import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export const db = drizzle(env.CORE_D1, {
  relations,
});
