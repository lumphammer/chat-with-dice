import * as dbSchema from "#/schemas/roller-schema";
import {
  anyChatMessageValidator,
  type ChatMessage,
} from "#/validators/webSocketMessageSchemas";
import { desc, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const MESSAGE_CATCHUP_LENGTH = 100;

export class MessageRepository {
  constructor(private db: DrizzleSqliteDODatabase<typeof dbSchema>) {}

  async getById(id: string): Promise<ChatMessage> {
    const dbRow = (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .where(eq(dbSchema.Messages.id, id))
        .execute()
    ).at(0);
    if (dbRow === undefined) {
      throw new Error(`Message not found: ${id}`);
    }
    const parsed = anyChatMessageValidator.parse(dbRow);
    return parsed;
  }

  async updateMessage(message: ChatMessage) {
    await this.db
      .update(dbSchema.Messages)
      .set(message)
      .where(eq(dbSchema.Messages.id, message.id));
  }

  async insert(message: ChatMessage): Promise<void> {
    await this.db.insert(dbSchema.Messages).values(message);
  }

  async getRecent(
    limit: number = MESSAGE_CATCHUP_LENGTH,
  ): Promise<ChatMessage[]> {
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
