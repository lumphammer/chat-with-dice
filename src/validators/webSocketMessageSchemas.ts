import { rollerMessageSchema } from "./rollerMessageSchema";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

export const webSocketServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    payload: z.object({ message: rollerMessageSchema }),
  }),
  z.object({
    type: z.literal("catchup"),
    payload: z.object({ messages: z.array(rollerMessageSchema) }),
  }),
  z.object({
    type: z.literal("error"),
    payload: z.object({ errorMessage: z.string(), detail: z.string() }),
  }),
]);

export type WebSocketServerMessage = z.infer<
  typeof webSocketServerMessageSchema
>;

export const webSocketClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    payload: z.object({
      // WRONG - make this use a list of known roll types
      rollType: z.string(),
      formula: z.unknown(),
      chat: z.string().nullable(),
      displayName: z.string().min(1).max(USERNAME_MAX_LENGTH),
    }),
  }),
]);

export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
