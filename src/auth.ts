import { db } from "@/db";
import * as schema from "@/schemas/chatDB-schema";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite", // or "pg" or "mysql"
    schema,
    usePlural: true,
  }),
  //... the rest of your config
});
