import migrations from "#/durable-object-migrations/roller/migrations";
import * as dbSchema from "#/schemas/roller-schema";
import { log, logError } from "./utils";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

/**
 * Create a drizzle interface to the db and run migrations.
 *
 * @param ctx the Durable Object ctx object
 * @returns
 */
export function setupDB(ctx: DurableObjectState) {
  const db = drizzle(ctx.storage, { schema: dbSchema });

  log("Schema before migrations", printSchema(ctx));

  log("Running migrations...");
  void ctx.blockConcurrencyWhile(async () => {
    // migrate the db
    try {
      log("attempting migration");
      await migrate(db, migrations);
    } catch (e: unknown) {
      logError("FAILED MIGRATION", e);
    }
  });
  log("Schema after migrations", printSchema(ctx));
  log("Database setup complete");

  return db;
}

/**
 * Print the schema of the database, including table names and column definitions.
 *
 * @param ctx the Durable Object ctx object
 * @returns the printed schema as a string
 */
function printSchema(ctx: DurableObjectState) {
  const tableNames = Object.keys(dbSchema);
  const placeHolders = Array.from({ length: tableNames.length })
    .fill("?")
    .join(", ");
  const query = `SELECT sql FROM sqlite_master WHERE name IN (${placeHolders})`;
  log(query, tableNames);
  const printedSchema = ctx.storage.sql
    .exec(query, ...tableNames)
    .toArray()
    .map((row) =>
      typeof row.sql === "string" ? row.sql : JSON.stringify(row.sql),
    )
    .join("\n");
  return printedSchema;
}
