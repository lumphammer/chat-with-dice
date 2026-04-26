import { roomConfigValidator } from "./roomConfigValidator";
import { z } from "zod/v4";

const USERNAME_MAX_LENGTH = 128;

/**
 * A restricted type for JSON-serializable data which *must* be an object at the
 * top level.
 */
export type JsonData = {
  [key: string]: z.core.util.JSONType;
};

/**
 * A type for zod validators of JsonData
 * @see JsonData
 */
export type JsonValidator = z.ZodType<JsonData>;

/**
 * A type for zod validators of JsonData or null.
 */
export type JsonDataOrNullValidator = z.ZodType<JsonData | null>;

/**
 * A zod validator for JSON objects.
 */
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
  TFormulaValidator extends JsonDataOrNullValidator,
  TResultValidator extends JsonDataOrNullValidator,
>(
  formulaValidator: TFormulaValidator,
  resultsValidator: TResultValidator,
): z.ZodObject<{
  id: z.ZodString;
  displayName: z.ZodString;
  userId: z.ZodString;
  created_time: z.ZodInt;
  rollType: z.ZodNullable<z.ZodString>;
  formula: z.ZodNullable<TFormulaValidator>;
  results: z.ZodNullable<TResultValidator>;
  chat: z.ZodNullable<z.ZodString>;
}> {
  return z.object({
    /** Primary key */
    id: z.string(),
    /** Display name of the user at the time they sent the message */
    displayName: z.string(),
    /** Chat ID of the user, used for differentiation */
    userId: z.string(),
    /** When the message was created */
    created_time: z.int(),
    /** The type of the roll - none, formula, havoc etc */
    rollType: z.string().nullable(),
    /**  */
    formula: formulaValidator.nullable(),
    /**  */
    results: resultsValidator.nullable(),
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
  TFormula extends JsonData | null = JsonData | null,
  TResult extends JsonData | null = JsonData | null,
> = z.infer<
  ReturnType<
    typeof chatMessageValidator<z.ZodType<TFormula>, z.ZodType<TResult>>
  >
>;

/**
 * A zod validator for any chat message, with formula and result types
 * set to nullable JSON objects.
 */
export const anyChatMessageValidator = chatMessageValidator(
  z.record(z.string(), z.json()).nullable(),
  z.record(z.string(), z.json()).nullable(),
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

/**
 * A zod validator for an online user, with display name, chat ID, logged-in
 * status, and optional image URL.
 */
const onlineUserValidator = z.object({
  displayName: z.string(),
  chatId: z.string(),
  loggedIn: z.boolean(),
  image: z.string().optional(),
});

/**
 * A type for the inferred online user type from the zod validator.
 */
export type OnlineUser = z.infer<typeof onlineUserValidator>;

/**
 * A zod validator for a web socket server message, discriminated by type.
 */
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
  z.object({
    type: z.literal("usersOnline"),
    payload: z.object({
      usersOnline: z.array(onlineUserValidator),
    }),
  }),
  z.object({
    type: z.literal("userOffline"),
    payload: z.object({
      chatId: z.string(),
    }),
  }),
]);

/**
 * A type for the inferred web socket server message type from the zod validator.
 */
export type WebSocketServerMessage = z.infer<
  typeof webSocketServerMessageSchema
>;

/**
 * A zod validator for an action call, with action name, correlation ID, and
 * optional parameters.
 */
const actionCallValidator = z.object({
  actionName: z.string(),
  correlation: z.string(),
  params: z.any(),
});

/**
 * A type for the inferred action call type from the zod validator.
 */
export type ActionCall = z.infer<typeof actionCallValidator>;

/**
 * A zod validator for an action call message, with a type of "action" and a
 * payload containing the capability name, display name, and action call.
 */
const actionCallMessageValidator = z.object({
  type: z.literal("action"),
  payload: z.object({
    capabilityName: z.string(),
    displayName: z.string(),
    actionCall: actionCallValidator,
  }),
});

/**
 * A zod validator for a web socket client message, discriminated by type.
 */
export const webSocketClientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("chat"),
    payload: z.object({
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

/**
 * A type for the inferred web socket client message type from the zod validator.
 */
export type WebSocketClientMessage = z.infer<
  typeof webSocketClientMessageSchema
>;
