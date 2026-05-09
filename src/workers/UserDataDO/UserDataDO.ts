import migrations from "#/durable-object-migrations/UserDataDO/migrations.js";
import * as dbSchema from "#/schemas/UserDataDO-schema";
import { setupDB } from "../utils/setupDB";
import { log } from "./utils";
import { DurableObject } from "cloudflare:workers";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

export class UserDataDO extends DurableObject {
  private db!: DrizzleSqliteDODatabase<typeof dbSchema>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nUserDataDO id booting:",
      ctx.id.toString(),
    );

    this.db = setupDB(ctx, migrations, dbSchema);
  }

  /**
   * Handle HTTP requests to this Durable Object
   */
  // async fetch(_request: Request): Promise<Response> {
  //   // not in use
  // }
}
