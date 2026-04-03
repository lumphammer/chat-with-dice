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
  // we can add capabilityPatch here too
  z.object({
    type: z.literal("capabilityState"),
    payload: z.object({
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
  params: z.any(),
});

export type ActionCall = z.infer<typeof actionCallValidator>;

export const actionCallMessageValidator = z.object({
  type: z.literal("action"),
  payload: z.object({
    capabilityName: z.string(),
    correlation: z.string(),
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
      formula: z.string(),
      chat: z.string().nullable(),
      displayName: z.string().min(1).max(USERNAME_MAX_LENGTH),
    }),
  }),
  actionCallMessageValidator,
]);

export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
