import { toAlphanumeric, type Alphanumeric } from "#/lib/alphanumeric";
import { maybeJSON } from "#/lib/maybeJSON";
import type {
  ActionCall,
  ActionCallMessage,
  WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import { createDraft, finishDraft, type Draft } from "immer";
import { z } from "zod/v4";

/**
 * Represents what the server gets after mounting a capability
 */
export type MountedCapability = {
  name: Alphanumeric;
  onMessage: (actionCall: ActionCall) => Promise<void>;
};

/**
 * An action function. Gets handed a bunch of tools, can do what it wants.
 */
type ActionFn<TContext, TPayloadValidator extends z.ZodTypeAny> = (tools: {
  doCtx: DurableObjectState;
  stateDraft: Draft<TContext>;
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
  TConfigValidator extends z.ZodTypeAny,
  TStateValidator extends z.ZodObject,
  // TContext extends z.infer<TContextValidator>, // xxx can we get rid of this one
  TActions extends Record<
    string,
    ActionDefinition<z.infer<TStateValidator>, z.ZodTypeAny>
  >,
> = {
  name: string;
  configValidator: TConfigValidator;
  stateValidator: TStateValidator;
  getInitialState: (tools: {
    config: z.infer<TConfigValidator>;
  }) => z.infer<TStateValidator>;
  initialise: (tools: {
    doCtx: DurableObjectState;
    draftState: Draft<z.infer<TStateValidator>>;
    // db: DBHandle;
    messageRepository: MessageRepository;
    config: z.infer<TConfigValidator>;
  }) => Promise<void>;
  buildActions: (
    createAction: CreateAction<z.infer<TStateValidator>>,
  ) => TActions;
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
  TConfigValidator extends z.ZodTypeAny,
  TStateValidator extends z.ZodObject,
  TActions extends Record<
    string,
    ActionDefinition<z.infer<TStateValidator>, z.ZodTypeAny>
  >,
>(
  def: CapabilityDefinition<TConfigValidator, TStateValidator, TActions>,
) => {
  const name = toAlphanumeric(def.name);

  // fn used to build typed actions
  const createAction: CreateAction<z.infer<TStateValidator>> = (
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
    state: z.infer<TStateValidator>,
    actionCall: ActionCall,
  ) => {
    const action = actions[actionCall.action];
    if (!action) throw new Error(`Unknown action: ${actionCall.action}`);
    const payload = action.payloadValidator.parse(actionCall.payload);
    const stateDraft = createDraft(state);
    await action.actionFn({ doCtx, stateDraft, payload });
    const finalState = finishDraft(stateDraft);
    doCtx.storage.kv.put(
      `capabilities.${def.name}.state`,
      JSON.stringify(finalState),
    );
    // the need for this cast is odd
    return finalState as z.infer<TStateValidator>;
  };

  // server-side mount handler
  const mount = async ({
    doCtx,
    messageRepository,
    config,
  }: {
    doCtx: DurableObjectState;
    messageRepository: MessageRepository;
    config: unknown;
  }): Promise<MountedCapability | null> => {
    // get config
    const configParseResult = def.configValidator.safeParse(config);
    if (configParseResult.error) {
      if (process.env.NODE_ENV !== "test") {
        console.error("Capability config failed validation", configParseResult);
      }
      return null;
    }

    // get state
    let state: z.infer<TStateValidator>;
    const parseStoredStateResult = maybeJSON(def.stateValidator).safeParse(
      doCtx.storage.kv.get(`capabilities.${def.name}.state`),
    );
    if (parseStoredStateResult.success) {
      state = parseStoredStateResult.data;
    } else {
      state = def.getInitialState({ config: configParseResult.data });
      doCtx.storage.kv.put(
        `capabilities.${def.name}.state`,
        JSON.stringify(state),
      );
    }

    // run initialise
    const draftState = createDraft(state);
    await def.initialise({
      doCtx: doCtx,
      draftState: draftState,
      messageRepository,
      config: configParseResult.data,
    });
    // the need for this cast is odd
    const finalState = finishDraft(draftState) as z.infer<TStateValidator>;
    if (finalState !== state) {
      state = finalState;
      doCtx.storage.kv.put(
        `capabilities.${def.name}.state`,
        JSON.stringify(state),
      );
    }
    return {
      name,
      onMessage: async (actionCall) => {
        state = await handleMessage(doCtx, state, actionCall);
      },
    };
  };

  return {
    name,
    creators,
    mount,
  };
};
