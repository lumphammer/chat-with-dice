// import { rollerMessageSchema } from "./rollerMessageSchema";
// import { Messages } from "#/schemas/roller-schema";
// import { createSelectSchema } from "drizzle-orm/zod";
import { roomConfigValidator } from "./roomConfigValidator";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

/**
 * A restricted type for JSON-serializable data which *must* be an at the top
 * level.
 */
export type JsonData = {
  [key: string]: z.core.util.JSONType;
};

/**
 * A type for zof validators of JsonData
 * @see JsonData
 */
export type JsonValidator = z.ZodType<JsonData>;

export const jsonObjectValidator = z.record(
  z.string(),
  z.json(),
) satisfies JsonValidator;

/**
 * Create a zod validator for chat messages.
 * Not exported — external callers should use {@link parseChatMessage} instead,
 * which returns a correctly-typed {@link ChatMessage}.
 */
function chatMessageValidator<
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
  rollType: z.ZodOptional<z.ZodString>;
  formula: z.ZodOptional<TFormulaValidator>;
  results: z.ZodOptional<TResultValidator>;
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
    rollType: z.string().optional(),
    /**  */
    formula: formulaValidator.optional(),
    /**  */
    results: resultsValidator.optional(),
    /** Chat text */
    chat: z.string().nullable(),
  });
}

/**
 * The output shape of a validated chat message.
 * Parameterised by the *data* types (not the validator types) so that
 * TypeScript never has to push generic validators through Zod's complex
 * mapped-type machinery.
 */
export type ChatMessage<
  TFormula extends JsonData = JsonData,
  TResult extends JsonData = JsonData,
> = {
  id: string;
  displayName: string;
  chatId: string;
  created_time: number;
  rollType?: string;
  formula?: TFormula;
  results?: TResult;
  chat: string | null;
};

export const anyChatMessageValidator = chatMessageValidator(
  z.record(z.string(), z.json()),
  z.record(z.string(), z.json()),
);

/**
 * Validate a candidate value against a chat message schema built from the
 * given formula/result validators, and return it typed as a {@link ChatMessage}.
 *
 * This encapsulates the single type-assertion that bridges Zod's complex
 * generic output type to our plain structural {@link ChatMessage} type.
 */
export function parseChatMessage<
  TFormulaValidator extends JsonValidator,
  TResultValidator extends JsonValidator,
>(
  formulaValidator: TFormulaValidator,
  resultValidator: TResultValidator,
  candidate: unknown,
): ChatMessage<z.infer<TFormulaValidator>, z.infer<TResultValidator>> {
  const validator = chatMessageValidator(formulaValidator, resultValidator);
  return validator.parse(candidate) as ChatMessage<
    z.infer<TFormulaValidator>,
    z.infer<TResultValidator>
  >;
}

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
  z.object({
    type: z.literal("roomConfig"),
    payload: z.object({
      config: roomConfigValidator,
    }),
  }),
  z.object({
    type: z.literal("roomName"),
    payload: z.object({
      roomName: z.string(),
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
      rollType: z.string().optional(),
      formula: jsonObjectValidator.optional(),
      chat: z.string().nullable(),
      displayName: z.string().min(1).max(USERNAME_MAX_LENGTH),
    }),
  }),
  z.object({
    type: z.literal("updateConfig"),
    payload: z.object({
      config: roomConfigValidator,
    }),
  }),
  z.object({
    type: z.literal("updateRoomName"),
    payload: z.object({
      roomName: z.string(),
    }),
  }),
  actionCallMessageValidator,
]);

export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
