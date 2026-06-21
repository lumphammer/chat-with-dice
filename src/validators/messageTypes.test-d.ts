import type { Messages } from "#/schemas/ChatRoomDO-schema.js";
import type { ChatMessage } from "./webSocketMessageSchemas.js";
import { expectTypeOf, test } from "vitest";

// The chat message validator is defined independently of the datbase schema
// because of the way we need to inject extra validators into it. Using a zod
// validator won't actually give us compile-time warnings if the two drift, so
// we have this type test to ensure they stay in sync

// the type of rows coming directly out of the db
type DbMessageRow = typeof Messages.$inferSelect;

// keys of properties that are more narrowly typed by the validator so they
// can't be tested
type UntestableProperties = "results" | "linkPreview";

const untestableProperties = "" as UntestableProperties;

// pruned versions of both types, removing properties where the chat message
// validator asserts narrower types than the db
type PrunedDbMessageRow = RecursiveExpand<
  Omit<DbMessageRow, UntestableProperties>
>;
type PrunedChatMessage = Omit<ChatMessage, UntestableProperties>;

test("Chat message validator matches database where it can", () => {
  // first, check that both types have the three properties we're excluding from
  // testing - this is an early warning that you might need to come back here
  // and update these tests
  expectTypeOf<ChatMessage>().toHaveProperty(untestableProperties);
  expectTypeOf<DbMessageRow>().toHaveProperty(untestableProperties);
  // check that ChatMessage would be assignable to the DB type
  expectTypeOf<ChatMessage>().toExtend<DbMessageRow>();
  // check that certain properties aside, they are are otherwise identical
  expectTypeOf<PrunedChatMessage>().toEqualTypeOf<PrunedDbMessageRow>();
});
