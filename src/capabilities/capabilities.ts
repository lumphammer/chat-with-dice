import { useCapabilityInfo } from "#/components/DiceRoller/capabilityStateContext";
import { useSendMessageContext } from "#/components/DiceRoller/sendMessageContext";
import { toAlphanumeric, type Alphanumeric } from "#/utils/alphanumeric";
import type {
  ActionCall,
  ActionCallMessage,
  WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/DiceRollerRoom/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/DiceRollerRoom/CapabilityStateRepository";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import { createDraft, finishDraft, type Draft } from "immer";
import { z } from "zod/v4";

/**
 * Represents what the server gets after mounting a capability
 */
export type ServerMountedCapability = {
  name: Alphanumeric;
  onMessage: (actionCall: ActionCall) => Promise<void>;
  sendInit: (server: WebSocket) => Promise<void>;
};

export type ClientMountedCapability<
  TState extends z.infer<z.ZodObject> = z.infer<z.ZodObject>,
  TActions extends Record<string, ActionDefinition<TState, z.ZodTypeAny>> =
    Record<string, ActionDefinition<TState, z.ZodTypeAny>>,
> =
  | { initialised: false }
  | {
      initialised: true;
      state: TState;
      actions: {
        [K in keyof TActions]: (
          payload: z.core.output<TActions[K]["payloadValidator"]>,
        ) => void;
      };
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
  defaultConfig: z.infer<TConfigValidator>;
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
  mount: (tools: {
    doCtx: DurableObjectState;
    messageRepository: MessageRepository;
    config: unknown;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
};

export type Capability<
  // TConfig extends z.infer<z.ZodTypeAny>,
  TState extends z.infer<z.ZodObject>,
  TActions extends Record<string, ActionDefinition<TState, z.ZodTypeAny>>,
> = {
  name: Alphanumeric;
  mount: (tools: {
    doCtx: DurableObjectState;
    messageRepository: MessageRepository;
    stateRepository: CapabilityStateRepository;
    config: unknown;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
  useMount: () => ClientMountedCapability<TState, TActions>;
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
): Capability<
  // z.infer<TConfigValidator>,
  z.infer<TStateValidator>,
  TActions
> => {
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
  const handleMessage = async ({
    doCtx,
    state,
    actionCall,
    broadcaster,
  }: {
    doCtx: DurableObjectState;
    state: z.infer<TStateValidator>;
    actionCall: ActionCall;
    broadcaster: Broadcaster;
  }) => {
    const action = actions[actionCall.action];
    if (!action) throw new Error(`Unknown action: ${actionCall.action}`);
    const payload = action.payloadValidator.parse(actionCall.payload);
    const stateDraft = createDraft(state);
    await action.actionFn({ doCtx, stateDraft, payload });
    const finalState = finishDraft(stateDraft) as z.infer<TStateValidator>;
    doCtx.storage.kv.put(`capabilities.${def.name}.state`, finalState);
    broadcaster.broadcast({
      type: "capabilityState",
      payload: {
        capability: name,
        state: finalState,
      },
    });
    // the need for this cast is odd
    return finalState;
  };

  // server-side mount handler
  const mount = async ({
    doCtx,
    messageRepository,
    config,
    broadcaster,
    stateRepository,
  }: {
    doCtx: DurableObjectState;
    messageRepository: MessageRepository;
    config: unknown;
    broadcaster: Broadcaster;
    stateRepository: CapabilityStateRepository;
  }): Promise<ServerMountedCapability | null> => {
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
    const parseStoredStateResult = def.stateValidator.safeParse(
      stateRepository.get(def.name),
    );
    if (parseStoredStateResult.success) {
      state = parseStoredStateResult.data;
    } else {
      state = def.getInitialState({ config: configParseResult.data });
      stateRepository.set(def.name, state);
    }

    // run initialise
    const draftState = createDraft(state);
    await def.initialise({
      doCtx,
      draftState: draftState,
      messageRepository,
      config: configParseResult.data,
    });
    // the need for this cast is odd
    const finalState = finishDraft(draftState) as z.infer<TStateValidator>;
    if (finalState !== state) {
      state = finalState;
      stateRepository.set(def.name, state);
    }
    return {
      name,
      onMessage: async (actionCall) => {
        state = await handleMessage({ doCtx, state, actionCall, broadcaster });
      },
      sendInit: async (ws: WebSocket) => {
        broadcaster.send(ws, {
          type: "capabilityInit",
          payload: {
            capability: name,
            state,
            config,
          },
        });
      },
    };
  };

  const useMount = (): ClientMountedCapability<
    z.infer<TStateValidator>,
    TActions
  > => {
    const sendMessage = useSendMessageContext();
    // map creators, wrapping the return of each one in a call to sendMessage
    const creatorsWithSendMessage = Object.fromEntries(
      Object.entries(creators).map(([key, value]) => [
        key,
        (...args: Parameters<typeof value>) => {
          const result = value(...args);
          if (result) {
            sendMessage(result);
          }
        },
      ]),
    ) as {
      [K in keyof TActions]: (
        payload: z.infer<TActions[K]["payloadValidator"]>,
      ) => void;
    };
    const info = useCapabilityInfo(name);
    if (!info.initialised) {
      return { initialised: false };
    }
    const parsedState = def.stateValidator.safeParse(info.state);
    const parsedConfig = def.configValidator.safeParse(info.config);
    const config = parsedConfig.success ? parsedConfig.data : def.defaultConfig;
    const state = parsedState.success
      ? parsedState.data
      : def.getInitialState({ config });

    if (parsedConfig.success === false) {
      console.error("Received a corrupt config for capability " + name);
    }
    if (parsedState.success === false) {
      console.error("Received a corrupt state for capability " + name);
    }

    return { initialised: true, state, actions: creatorsWithSendMessage };
  };

  // return a defined capability
  return {
    name,
    mount,
    useMount,
  };
};
