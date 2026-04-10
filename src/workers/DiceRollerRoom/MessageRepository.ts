import * as dbSchema from "#/schemas/roller-schema";
import {
  anyChatMessageValidator,
  type AnyChatMessage,
} from "#/validators/webSocketMessageSchemas";
import { desc, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const MESSAGE_CATCHUP_LENGTH = 100;

export class MessageRepository {
  constructor(private db: DrizzleSqliteDODatabase<typeof dbSchema>) {}

  async getById(id: string): Promise<AnyChatMessage | undefined> {
    const dbRow = (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .where(eq(dbSchema.Messages.id, id))
        .execute()
    ).at(0);
    const parsed = anyChatMessageValidator.parse(dbRow);
    return parsed;
  }

  async updateMessage(_message: AnyChatMessage) {}

  async insert(message: AnyChatMessage): Promise<void> {
    await this.db.insert(dbSchema.Messages).values(message);
  }

  async getRecent(
    limit: number = MESSAGE_CATCHUP_LENGTH,
  ): Promise<AnyChatMessage[]> {
    return (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .orderBy(desc(dbSchema.Messages.created_time))
        .limit(limit)
        .execute()
    )
      .toReversed()
      .map((m) => anyChatMessageValidator.parse(m));
  }
}
