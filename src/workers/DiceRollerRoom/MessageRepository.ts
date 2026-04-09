import * as dbSchema from "#/schemas/roller-schema";
import {
  chatMessageValidator,
  type RollerMessage,
} from "#/validators/webSocketMessageSchemas";
import { desc, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const MESSAGE_CATCHUP_LENGTH = 100;

export class MessageRepository {
  constructor(private db: DrizzleSqliteDODatabase<typeof dbSchema>) {}

  async getById(id: string): Promise<RollerMessage | undefined> {
    const dbRow = (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .where(eq(dbSchema.Messages.id, id))
        .execute()
    ).at(0);
    const parsed = chatMessageValidator.parse(dbRow);
    return parsed;
  }

  async insert(message: RollerMessage): Promise<void> {
    await this.db.insert(dbSchema.Messages).values(message);
  }

  async getRecent(
    limit: number = MESSAGE_CATCHUP_LENGTH,
  ): Promise<RollerMessage[]> {
    return (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .orderBy(desc(dbSchema.Messages.created_time))
        .limit(limit)
        .execute()
    )
      .toReversed()
      .map((m) => chatMessageValidator.parse(m));
  }
}
