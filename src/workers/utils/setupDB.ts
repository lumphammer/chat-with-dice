// import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import { sql, type TablesRelationalConfig } from "drizzle-orm";
import { drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

// this doesn't seem to be exported, so a little type-fu is needed
type MigrationConfig = Parameters<typeof migrate>[1];

const log = console.log.bind(console, "[setupDB]");
const logError = console.error.bind(console, "[setupDB]");

/**
 * Create a drizzle interface to the db and run migrations.
 *
 * @param ctx the Durable Object ctx object
 * @returns
 */
export function setupDB<
  TSchema extends Record<string, unknown>,
  TRelations extends TablesRelationalConfig,
>(
  ctx: DurableObjectState,
  migrations: MigrationConfig,
  schema: TSchema,
  relations?: TRelations,
) {
  const db = drizzle(ctx.storage, { schema, relations });

  const before = printSchema(ctx, schema);

  void ctx.blockConcurrencyWhile(async () => {
    // migrate the db
    // we wrap this in PRAGMA foreign_keys = OFF/ON so that migrations can
    // affect foreign keys without causing cascading deletions. Technically,
    // Drizzle's migration generator does add the PRAGMA calls to the
    // migrations, but PRAGMA foreign_keys is a a no-op inside a SQLite
    // transaction, and the migrations are, of course, run in a transaction.
    // https://sqlite.org/pragma.html#pragma_foreign_keys
    try {
      log("Attempting migration");
      db.run(sql`PRAGMA foreign_keys = OFF`);
      migrate(db, migrations);
      db.run(sql`PRAGMA foreign_keys = ON`);
    } catch (e: unknown) {
      logError("FAILED MIGRATION", e);
    }
  });
  const after = printSchema(ctx, schema);
  if (before !== after) {
    log("Schema changed after migration", before, after);
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
