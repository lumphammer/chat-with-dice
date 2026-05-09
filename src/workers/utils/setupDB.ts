// import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import { log, logError } from "../ChatRoomDO/utils";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

// this doesn't seem to be exported, so a little type-fu is needed
type MigrationConfig = Parameters<typeof migrate>[1];

/**
 * Create a drizzle interface to the db and run migrations.
 *
 * @param ctx the Durable Object ctx object
 * @returns
 */
export function setupDB<T extends Record<string, unknown>>(
  ctx: DurableObjectState,
  migrations: MigrationConfig,
  schema: T,
) {
  const db = drizzle(ctx.storage, { schema: schema });

  const before = printSchema(ctx, schema);

  void ctx.blockConcurrencyWhile(async () => {
    // migrate the db
    try {
      log("setupDB: Attempting migration");
      migrate(db, migrations);
    } catch (e: unknown) {
      logError("FAILED MIGRATION", e);
    }
  });
  const after = printSchema(ctx, schema);
  if (before !== after) {
    log("setupDB: Schema changed after migration", before, after);
  }

  return db;
}

/**
 * Print the schema of the database, including table names and column definitions.
 *
 * @param ctx the Durable Object ctx object
 * @returns the printed schema as a string
 */
function printSchema(ctx: DurableObjectState, schema: Record<string, unknown>) {
  const tableNames = Object.keys(schema);
  const placeHolders = Array.from({ length: tableNames.length })
    .fill("?")
    .join(", ");
  const query = `SELECT sql FROM sqlite_master WHERE name IN (${placeHolders})`;
  const printedSchema = ctx.storage.sql
    .exec(query, ...tableNames)
    .toArray()
    .map((row) =>
      typeof row.sql === "string" ? row.sql : JSON.stringify(row.sql),
    )
    .join("\n");
  return printedSchema;
}
