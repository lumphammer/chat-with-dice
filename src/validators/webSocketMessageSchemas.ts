// import { rollerMessageSchema } from "./rollerMessageSchema";
// import { Messages } from "#/schemas/roller-schema";
// import { createSelectSchema } from "drizzle-orm/zod";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

export type JsonData = z.core.util.JSONType;
export type JsonValidator = z.ZodType<JsonData>;

/**
 * Create a zod validator
 */
export function chatMessageValidator<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
>(
  formulaValidator: TFormulaValidator,
  resultsValidator: TResultValidator,
): z.ZodObject<{
  id: z.ZodString;
  displayName: z.ZodString;
  chatId: z.ZodString;
  created_time: z.ZodInt;
  rollType: z.ZodString;
  formula: TFormulaValidator;
  results: TResultValidator;
  chat: z.ZodNullable<z.ZodString>;
}> {
  return z.object({
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
    /**  */
    formula: formulaValidator,
    /**  */
    results: resultsValidator,
    /** Chat text */
    chat: z.string().nullable(),
  });
}

const _v = chatMessageValidator(z.string(), z.number());

type _T = z.infer<typeof _v>;

export type ChatMessage<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
> = z.infer<
  ReturnType<typeof chatMessageValidator<TFormulaValidator, TResultValidator>>
>;

export const anyChatMessageValidator = chatMessageValidator(z.json(), z.json());

export type AnyChatMessage = z.infer<typeof anyChatMessageValidator>;

export const webSocketServerMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message"),
    payload: z.object({ message: anyChatMessageValidator }),
  }),
  z.object({
    type: z.literal("messageUpdate"),
    payload: z.object({
      messageId: z.string(),
      message: anyChatMessageValidator,
    }),
  }),
  z.object({
    type: z.literal("catchup"),
    payload: z.object({ messages: z.array(anyChatMessageValidator) }),
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
