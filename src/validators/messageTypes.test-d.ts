import type { Messages } from "#/schemas/ChatRoomDO-schema.js";
import type { ChatMessage } from "./webSocketMessageSchemas.js";
import { expectTypeOf, test } from "vitest";

// The chat message validator is defined independently of the datbase schema
// because of the way we need to inject extra validators into it. Using a zod
// validator won't actually give us compile-time warnings if the two drift, so
// we have this type test to ensure they stay in sync

// the type of rows coming out od the db
type DbMessageRow = typeof Messages.$inferSelect;

// pruned versions of both types where the chat message validator asserts
// narrower types
type PrunedDbMessageRow = RecursiveExpand<
  Omit<DbMessageRow, "formula" | "results" | "linkPreview">
>;
type PrunedChatMessage = Omit<
  ChatMessage,
  "formula" | "results" | "linkPreview"
>;

test("Chat message validator matches database where it can", () => {
  // first, check that both types have the three properties we're excluding from
  // testing - this is an early warning that you might need to come back here
  // and update these tests
  expectTypeOf<ChatMessage>().toHaveProperty("formula");
  expectTypeOf<ChatMessage>().toHaveProperty("results");
  expectTypeOf<ChatMessage>().toHaveProperty("linkPreview");
  expectTypeOf<DbMessageRow>().toHaveProperty("formula");
  expectTypeOf<DbMessageRow>().toHaveProperty("results");
  expectTypeOf<DbMessageRow>().toHaveProperty("linkPreview");
  expectTypeOf<PrunedDbMessageRow>().toEqualTypeOf<PrunedChatMessage>();
  expectTypeOf<PrunedChatMessage>().toEqualTypeOf<PrunedDbMessageRow>();
});
