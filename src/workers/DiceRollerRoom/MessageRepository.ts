import * as dbSchema from "#/schemas/roller-schema";
import {
  anyChatMessageValidator,
  type ChatMessage,
} from "#/validators/webSocketMessageSchemas";
import { desc, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { z } from "zod";

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

  async upsertMessage(message: ChatMessage): Promise<void> {
    const upsertValues = () => {
      const { id: _, ...rest } = message;
      return rest;
    };
    await this.db.insert(dbSchema.Messages).values(message).onConflictDoUpdate({
      target: dbSchema.Messages.id,
      set: upsertValues(),
    });
  }

  async insertMessage(message: ChatMessage): Promise<void> {
    console.log("inserting into db", JSON.stringify(message, null, 2));
    await this.db.insert(dbSchema.Messages).values(message);
  }

  async getRecent(
    limit: number = MESSAGE_CATCHUP_LENGTH,
  ): Promise<ChatMessage[]> {
    const messagesFromDB = (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .orderBy(desc(dbSchema.Messages.created_time))
        .limit(limit)
        .execute()
    ).toReversed();
    const parsed = messagesFromDB
      .map((m) => {
        const parsedMessage = anyChatMessageValidator.safeParse(m);
        if (parsedMessage.success) {
          return parsedMessage.data;
        } else {
          console.log(
            "Failed parsing message from DB",
            z.prettifyError(parsedMessage.error),
          );
          return null;
        }
      })
      .filter((m): m is ChatMessage => m !== null);
    console.log("parsed", parsed);
    return parsed;
  }
}
