import type {
  ActionCall,
  ActionCallMessage,
  WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import { z } from "zod/v4";

/**
 * Represents what the server gets after mounting a capability
 */
export type MountedCapability = {
  name: string;
  onMessage: (actionCall: ActionCall) => Promise<void>;
};

/**
 * An action function. Gets handed a bunch of tools, can do what it wants.
 */
type ActionFn<TContext, TPayloadValidator extends z.ZodTypeAny> = (tools: {
  doCtx: DurableObjectState;
  capCtx: TContext;
  payload: z.infer<TPayloadValidator>;
}) => Promise<void>;

/**
 * An action definition. Input validator plus function.
 */
type ActionDefinition<TContext, TPayloadValidator extends z.ZodTypeAny> = {
  payloadValidator: TPayloadValidator;
  actionFn: ActionFn<TContext, TPayloadValidator>;
};

/**
 * Type for the builder function used when defining a capability
 */
type CreateAction<TContext> = <TPayloadValidator extends z.ZodTypeAny>(
  payloadValidator: TPayloadValidator,
  actionFn: ActionFn<TContext, TPayloadValidator>,
) => ActionDefinition<TContext, TPayloadValidator>;

/**
 * The full input definition for a capability
 */
type CapabilityDefinition<
  TContext,
  TConfigValidator extends z.ZodTypeAny,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
> = {
  name: string;
  configValidator: TConfigValidator;
  initialise: (tools: {
    doCtx: DurableObjectState;
    // db: DBHandle;
    messageRepository: MessageRepository;
    config: z.infer<TConfigValidator>;
  }) => Promise<TContext>;
  buildActions: (createAction: CreateAction<TContext>) => TActions;
};

/**
 * Used for the registry.
 *
 * Does not include all members, only the ones that are needed in prod
 */
export type AnyCapability = {
  name: string;
  creators: Record<string, (payload: any) => ActionCallMessage>;
  mount: (
    doCtx: DurableObjectState,
    messageRepository: MessageRepository,
    config: unknown,
  ) => Promise<MountedCapability | null>;
};

/**
 * Define a new capability
 * @param def The key parts of the capability
 * @returns
 */
export const createCapability = <
  TContext,
  TConfigValidator extends z.ZodTypeAny,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
>(
  def: CapabilityDefinition<TContext, TConfigValidator, TActions>,
) => {
  // fn used to build typed actions
  const createAction: CreateAction<TContext> = (
    payloadValidator,
    actionFn,
  ) => ({
    payloadValidator,
    actionFn,
  });

  // build the actions collection
  const actions: TActions = def.buildActions(createAction);

  // from actions, build message creators
  const creators = Object.fromEntries(
    Object.entries(actions).map(([action, { payloadValidator }]) => {
      return [
        action,
        (payload: unknown): WebSocketClientMessage => {
          const parsedResult = payloadValidator.safeParse(payload);
          if (parsedResult.error) {
            throw new Error("Action payload failed client-side validation", {
              cause: parsedResult,
            });
          }
          return {
            type: "action",
            payload: {
              capability: def.name,
              payload: {
                action,
                payload,
              },
            },
          };
        },
      ];
    }),
  ) as {
    [K in keyof TActions]: (
      payload: z.infer<TActions[K]["payloadValidator"]>,
    ) => ActionCallMessage;
  };

  // server-side message handler
  const handleMessage = async (
    doCtx: DurableObjectState,
    capCtx: TContext,
    actionCall: ActionCall,
  ) => {
    const action = actions[actionCall.action];
    if (!action) throw new Error(`Unknown action: ${actionCall.action}`);
    const payload = action.payloadValidator.parse(actionCall.payload);
    await action.actionFn({ doCtx, capCtx, payload });
  };

  // server-side mount handler
  const mount = async (
    doCtx: DurableObjectState,
    messageRepository: MessageRepository,
    config: unknown,
  ): Promise<MountedCapability | null> => {
    const configParseResult = def.configValidator.safeParse(config);
    if (configParseResult.error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Capability config failed validation", configParseResult);
      }
      return null;
    }
    const capCtx = await def.initialise({
      doCtx: doCtx,
      messageRepository,
      config: configParseResult.data,
    });
    return {
      name: def.name,
      onMessage: (actionCall) => handleMessage(doCtx, capCtx, actionCall),
    };
  };

  return {
    name: def.name,
    creators,
    mount,
  };
};
