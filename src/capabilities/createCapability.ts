import { useCapabilityInfo } from "#/capabilities/reactContexts/capabilityInfoContext";
import { useSetCapabilityStateContext } from "#/capabilities/reactContexts/setCapabilityStateContext";
import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useUserIdentityContext } from "#/components/DiceRoller/contexts/userIdentityContext";
import { toAlphanumeric } from "#/utils/alphanumeric";
import type {
  ActionCall,
  JsonValidator,
} from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/DiceRollerRoom/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/DiceRollerRoom/CapabilityStateRepository";
import { MessageJiggler } from "#/workers/DiceRollerRoom/MessageJiggler";
import type {
  Capability,
  CapabilityDefinition,
  ClientMountedCapability,
  ServerMountedCapability,
  CreateAction,
  ActionDefinition,
  AnyActionDefinition,
  inferIfZod,
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
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    ActionDefinition<
      z.infer<TStateValidator>,
      z.ZodTypeAny,
      inferIfZod<TMessageDataValidator>
    >
  >,
>(
  def: CapabilityDefinition<
    TConfigValidator,
    TStateValidator,
    TMessageDataValidator,
    TActions
  >,
): Capability<
  z.infer<TStateValidator>,
  TActions,
  z.infer<TConfigValidator>
> => {
  const name = toAlphanumeric(def.name);

  const createAction: CreateAction<
    z.infer<TStateValidator>,
    inferIfZod<TMessageDataValidator>
  > = ({ payloadValidator, pureFn, effectfulFn: complexFn }) => ({
    type: "complex",
    payloadValidator,
    pureFn: pureFn,
    effectfulFn: complexFn,
  });

  // build the actions collection
  const actions: TActions = def.buildActions({
    createAction,
  });

  // server-side message handler
  const handleMessage = async ({
    doCtx,
    messageJiggler,
    broadcaster,
    stateRepository,
    state,
    actionCall,
    chatId,
    displayName,
  }: {
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
    stateRepository: CapabilityStateRepository;
    chatId: string;
    state: z.infer<TStateValidator>;
    actionCall: ActionCall;
    broadcaster: Broadcaster;
    displayName: string;
  }) => {
    const action = actions[actionCall.actionName];
    if (!action) throw new Error(`Unknown action: ${actionCall.actionName}`);
    const payload = action.payloadValidator.parse(actionCall.params);
    const stateDraft = createDraft(state);
    if (action.effectfulFn) {
      // if we have an effectful function, call it
      await action.effectfulFn({
        doCtx,
        stateDraft,
        payload,
        pureFn: action.pureFn ?? (() => {}),
        broadcaster,
        chatId,
        displayName,
        sendChatMessage: (data: inferIfZod<TMessageDataValidator>) =>
          void messageJiggler.sendChatMessage({
            chat: "",
            chatId,
            created_time: Date.now(),
            displayName,
            formula: {},
            id: nanoid(),
            results: data ?? {},
            rollType: name,
          }),
      });
    } else if (action.pureFn) {
      // if pure and not effectful, call pure
      action.pureFn({ stateDraft, payload });
    }
    // if neither, noop
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
    messageJiggler,
    stateRepository,
  }: {
    broadcaster: Broadcaster;
    config: unknown;
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
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
      messageJiggler,
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
      onMessage: async ({ actionCall, chatId, displayName }) => {
        // XXX just for testing
        if (ARTIFICIAL_LAG_MS > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, ARTIFICIAL_LAG_MS),
          );
        }

        state = await handleMessage({
          doCtx,
          messageJiggler,
          stateRepository,
          state,
          actionCall,
          broadcaster,
          chatId,
          displayName,
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
    const userIdentity = useUserIdentityContext();

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
                  displayName: userIdentity.displayName,
                },
              });

              // run optimistic updates
              if (info.initialised) {
                const [newState, patches] = produceWithPatches(
                  info.state,
                  (draft) => {
                    actionDefinition.pureFn?.({ stateDraft: draft, payload });
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

    if (!parsedConfig.success) {
      console.error("Received a corrupt config for capability " + name);
    }
    if (!parsedState.success) {
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
    defaultConfig: def.defaultConfig,
  };
};
