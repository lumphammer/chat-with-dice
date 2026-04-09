// import { rollerMessageSchema } from "./rollerMessageSchema";
// import { Messages } from "#/schemas/roller-schema";
// import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

export type JsonData = z.core.util.JSONType;
export type JsonValidator = z.ZodType<JsonData>;

/**
 * This should correspond to the Messages table, but we are defining separately
 * to avoid having a WS type that is basically "SELECT * FROM". While that would
 * be okay now, as the table gets wider we want to be selective about what we
 * send over the wire.
 */
export const chatMessageValidator = z.object({
  /** Primary key */
  id: z.string(),
  /** Display name of the user at the time they sent the message */
  displayName: z.string(),
  /** Chat ID of the user, used for differentiation */
  chatId: z.string(),
  /** When the message was created */
  created_time: z.int(),
  /** The type of the roll - none, formula, havoc etc */
  rollType: z.string(),
  /** Either a dice formula or JSON */
  formula: z.json(),
  /** Structured JSON results, either from rpg die roller, or our own */
  results: z.json(),
  /** Chat text */
  chat: z.string().nullable(),
});

export type RollerMessage = z.infer<typeof chatMessageValidator>;

export const webSocketServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    payload: z.object({ message: chatMessageValidator }),
  }),
  z.object({
    type: z.literal("messageUpdate"),
    payload: z.object({ messageId: z.string(), message: chatMessageValidator }),
  }),
  z.object({
    type: z.literal("catchup"),
    payload: z.object({ messages: z.array(chatMessageValidator) }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({ errorMessage: z.string(), detail: z.string() }),
  }),
  // we can add capabilityPatch here too
  z.object({
    type: z.literal("capabilityState"),
    payload: z.object({
      correlation: z.string(),
      capability: z.string(),
      state: z.any(),
    }),
  }),
  z.object({
    type: z.literal("capabilityInit"),
    payload: z.object({
      capability: z.string(),
      state: z.any(),
      config: z.any(),
    }),
  }),
]);

export type WebSocketServerMessage = z.infer<
  typeof webSocketServerMessageSchema
>;

export const actionCallValidator = z.object({
  actionName: z.string(),
  correlation: z.string(),
  params: z.any(),
});

export type ActionCall = z.infer<typeof actionCallValidator>;

export const actionCallMessageValidator = z.object({
  type: z.literal("action"),
  payload: z.object({
    capabilityName: z.string(),
    displayName: z.string(),
    actionCall: actionCallValidator,
  }),
});

export type ActionCallMessage = z.infer<typeof actionCallMessageValidator>;

export const webSocketClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    payload: z.object({
      // WRONG - make this use a list of known roll types
      rollType: z.string(),
      formula: z.json(),
      chat: z.string().nullable(),
      displayName: z.string().min(1).max(USERNAME_MAX_LENGTH),
    }),
  }),
  actionCallMessageValidator,
]);

export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
