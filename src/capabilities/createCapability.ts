import { useCapabilityInfo } from "#/capabilities/reactContexts/capabilityInfoContext";
import { useSetCapabilityStateContext } from "#/capabilities/reactContexts/setCapabilityStateContext";
import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { toAlphanumeric } from "#/utils/alphanumeric";
import type { ActionCall } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/DiceRollerRoom/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/DiceRollerRoom/CapabilityStateRepository";
import type { MessageRepository } from "../workers/DiceRollerRoom/MessageRepository";
import type {
  Capability,
  CapabilityDefinition,
  ClientMountedCapability,
  CreateSimpleAction,
  ServerMountedCapability,
  CreateComplexAction,
  ActionDefinition,
  AnyActionDefinition,
} from "./types";
import { createDraft, finishDraft, produceWithPatches } from "immer";
import { nanoid } from "nanoid";
import { z } from "zod/v4";

const ARTIFICIAL_LAG_MS = 500;

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
  const createSimpleAction: CreateSimpleAction<z.infer<TStateValidator>> = ({
    payloadValidator,
    actionFn,
  }) => ({
    type: "simple",
    payloadValidator,
    actionFn,
  });

  const createComplexAction: CreateComplexAction<z.infer<TStateValidator>> = ({
    payloadValidator,
    optimisticFn,
    complexFn,
  }) => ({
    type: "complex",
    payloadValidator,
    optimisticFn,
    complexFn,
  });

  // build the actions collection
  const actions: TActions = def.buildActions({
    createSimpleAction,
    createComplexAction,
  });

  // server-side message handler
  const handleMessage = async ({
    doCtx,
    stateRepository,
    state,
    actionCall,
    broadcaster,
  }: {
    doCtx: DurableObjectState;
    stateRepository: CapabilityStateRepository;

    state: z.infer<TStateValidator>;
    actionCall: ActionCall;
    broadcaster: Broadcaster;
  }) => {
    const action = actions[actionCall.actionName];
    if (!action) throw new Error(`Unknown action: ${actionCall.actionName}`);
    const payload = action.payloadValidator.parse(actionCall.params);
    const stateDraft = createDraft(state);
    if (action.type === "simple") {
      await action.actionFn({ stateDraft, payload });
    } else {
      await action.complexFn({
        doCtx,
        stateDraft,
        payload,
        optimisticFn: action.optimisticFn,
      });
    }
    const finalState = finishDraft(stateDraft) as z.infer<TStateValidator>;
    stateRepository.set(def.name, finalState);
    setTimeout(() => {
      broadcaster.broadcast({
        type: "capabilityState",
        payload: {
          capability: name,
          correlation: actionCall.correlation,
          state: finalState,
        },
      });
    }, ARTIFICIAL_LAG_MS);
    return finalState;
  };

  // server-side mount handler
  const mount = async ({
    broadcaster,
    config,
    doCtx,
    messageRepository,
    stateRepository,
  }: {
    broadcaster: Broadcaster;
    config: unknown;
    doCtx: DurableObjectState;
    messageRepository: MessageRepository;
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
        // XXX just for testing
        if (ARTIFICIAL_LAG_MS > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, ARTIFICIAL_LAG_MS),
          );
        }

        state = await handleMessage({
          doCtx,
          stateRepository,
          state,
          actionCall,
          broadcaster,
        });
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
    const setCapabilityState = useSetCapabilityStateContext();
    const info = useCapabilityInfo(name);

    // when we map over the actions, TS gives up on typing the value side,
    // presumably because it's a mapped type? Anyway, this is the type of the
    // tuple we get inside the callback to Object.entries.
    type CreatorsEntiesTuple = [string, AnyActionDefinition];

    // XXX this should be memoised
    const spicyCreators = Object.fromEntries(
      Object.entries(actions).map(
        ([action, actionDefinition]: CreatorsEntiesTuple) => {
          return [
            action,
            (payload: any): void => {
              const correlation = nanoid();
              // construct and send the message
              sendMessage({
                type: "action",
                payload: {
                  capabilityName: def.name,
                  actionCall: {
                    correlation,
                    actionName: action,
                    params: payload,
                  },
                },
              });

              // run optimistic updates
              if (actionDefinition.type === "simple" && info.initialised) {
                const [newState, patches] = produceWithPatches(
                  info.state,
                  (draft) => {
                    actionDefinition.actionFn({ stateDraft: draft, payload });
                  },
                );
                setCapabilityState(def.name, newState, correlation, patches);
              }
            },
          ];
        },
      ),
    ) as {
      [K in keyof TActions]: (
        payload: z.infer<TActions[K]["payloadValidator"]>,
      ) => void;
    };

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

    return {
      initialised: true,
      state,
      patches: info.patches,
      actions: spicyCreators,
    };
  };

  // return a defined capability
  return {
    name,
    mount,
    useMount,
  };
};
