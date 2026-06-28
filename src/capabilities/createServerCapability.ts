import type { Alphanumeric } from "#/utils/alphanumeric";
import { logger } from "#/utils/logger";
import type { JsonValidator } from "#/validators/jsonObjectValidator";
import type { ActionCall } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import type {
  CommonActionDefinition,
  CommonCapability,
  ConfigValue,
  PureActionFn,
  StateValue,
  inferIfZod,
} from "./createCapabilityCommon";
import type { CapabilityHookEvents } from "./hooks";
import type { Draft } from "immer";
import { createDraft, finishDraft } from "immer";
import { nanoid } from "nanoid";
import type * as z from "zod";

const ARTIFICIAL_LAG_MS = 0;

export type ServerMountedCapability = {
  name: Alphanumeric;
  onMessage: (tools: {
    actionCall: ActionCall;
    userId: string;
    displayName: string;
  }) => Promise<void>;
  /**
   * Dispatch a hook by name. No-op if this capability declares no handler for
   * it. Typed against the global `CapabilityHookEvents` map (not the
   * capability's own generics), so it survives the type-erased
   * `Map<string, ServerMountedCapability>` the DO holds.
   */
  runHook: <K extends keyof CapabilityHookEvents>(
    name: K,
    event: CapabilityHookEvents[K],
  ) => Promise<void>;
  getInitPayload: () => { capability: string; state: unknown; config: unknown };
};

/**
 * An action's server-only side effect. Has full access to the DO context,
 * broadcaster, etc. The `pureFn` it receives is the same one declared on the
 * common action — the effect is expected to call it (or not) to apply the
 * shared state transition.
 */
type EffectfulActionFn<TState, TPayload, TMessageData> = (tools: {
  doCtx: DurableObjectState;
  sendChatMessage: (data: TMessageData) => void;
  broadcaster: Broadcaster;
  pureFn: PureActionFn<TState, TPayload>;
  stateDraft: Draft<TState>;
  payload: TPayload;
  userId: string;
  displayName: string;
  nodeShareManager: NodeShareManager;
}) => void | Promise<void>;

/**
 * A hook handler: a capability's reaction to a server-side event (not an action
 * call). Like an action effect it can mutate state via `stateDraft`, but
 * instead of a `payload`/`pureFn` it receives the hook's `event`. "Who" is part
 * of the event (and varies per hook), so there is no top-level `userId`.
 */
type HookFn<TState, TEvent> = (tools: {
  doCtx: DurableObjectState;
  broadcaster: Broadcaster;
  nodeShareManager: NodeShareManager;
  stateDraft: Draft<TState>;
  event: TEvent;
}) => void | Promise<void>;

export type ServerCapabilityDefinition<
  TConfigValidator extends JsonValidator | undefined,
  TStateValidator extends JsonValidator | undefined,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<StateValue<TStateValidator>, z.ZodType>
  >,
> = {
  initialise?: (tools: {
    doCtx: DurableObjectState;
    draftState: Draft<StateValue<TStateValidator>>;
    messageJiggler: MessageJiggler;
    config: ConfigValue<TConfigValidator>;
  }) => void | Promise<void>;
  actionEffects?: {
    [K in keyof TActions]?: EffectfulActionFn<
      StateValue<TStateValidator>,
      z.infer<TActions[K]["payloadValidator"]>,
      inferIfZod<TMessageDataValidator>
    >;
  };
  hooks?: {
    [K in keyof CapabilityHookEvents]?: HookFn<
      StateValue<TStateValidator>,
      CapabilityHookEvents[K]
    >;
  };
};

export type ServerCapability = {
  name: Alphanumeric;
  displayName: string;
  defaultConfig: unknown;
  mount: (tools: {
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
    stateRepository: CapabilityStateRepository;
    config: unknown;
    nodeShareManager: NodeShareManager;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
};

/**
 * Build the server-side half of a capability from a `CommonCapability` plus
 * server-only bits (initialise, getInitialState, per-action effects).
 *
 * The DO calls `mount()` per room; mount wires up `onMessage` which routes
 * incoming action calls through the common `pureFn` and/or the server's
 * `effectfulFn`.
 */
export function createServerCapability<
  TConfigValidator extends JsonValidator | undefined,
  TStateValidator extends JsonValidator | undefined,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<StateValue<TStateValidator>, z.ZodType>
  >,
>(
  common: CommonCapability<
    TConfigValidator,
    TStateValidator,
    TMessageDataValidator,
    TActions
  >,
  def: ServerCapabilityDefinition<
    TConfigValidator,
    TStateValidator,
    TMessageDataValidator,
    TActions
  > = {},
): ServerCapability {
  /**
   * The shared tail for any server-side mutation: open a draft over the current
   * state, let `run` mutate it, then (for stateful capabilities) persist and
   * broadcast the result. Used by both `handleMessage` (action calls, with a
   * `correlation`) and `runHook` (events, without one). Stateless capabilities
   * have no draft and nothing to persist — `run` still fires for its effects.
   */
  const applyStateChange = async (
    stateRepository: CapabilityStateRepository,
    broadcaster: Broadcaster,
    state: StateValue<TStateValidator>,
    run: (
      stateDraft: Draft<StateValue<TStateValidator>>,
    ) => void | Promise<void>,
    correlation?: string,
  ): Promise<StateValue<TStateValidator>> => {
    const stateDraft = (
      common.state ? createDraft(state as object) : undefined
    ) as Draft<StateValue<TStateValidator>>;
    await run(stateDraft);
    // Nothing to persist or broadcast for stateless capabilities — any effect
    // (e.g. a chat message) has already run inside `run`.
    if (!common.state) {
      return state;
    }
    const finalState = finishDraft(stateDraft) as StateValue<TStateValidator>;
    // immer returns the same reference when `run` mutated nothing. For an
    // uncorrelated change (a hook) that means there is nothing to persist or
    // broadcast. Correlated changes (action calls) always broadcast regardless,
    // so the client can clear the optimistic patch keyed by `correlation`.
    if (finalState === state && correlation === undefined) {
      return state;
    }
    stateRepository.set(common.name, finalState);
    setTimeout(() => {
      broadcaster.broadcast({
        type: "capabilityState",
        payload: {
          capability: common.name,
          correlation,
          state: finalState,
        },
      });
    }, ARTIFICIAL_LAG_MS);
    return finalState;
  };

  const handleMessage = async ({
    doCtx,
    messageJiggler,
    broadcaster,
    stateRepository,
    state,
    actionCall,
    userId,
    displayName,
    nodeShareManager,
  }: {
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
    stateRepository: CapabilityStateRepository;
    userId: string;
    state: StateValue<TStateValidator>;
    actionCall: ActionCall;
    broadcaster: Broadcaster;
    displayName: string;
    nodeShareManager: NodeShareManager;
  }) => {
    const commonAction = common.actions[actionCall.actionName];
    if (!commonAction) {
      throw new Error(`Unknown action: ${actionCall.actionName}`);
    }
    const payload = commonAction.payloadValidator.parse(actionCall.params);
    // After the common/server split TS can't see that `common.actions[name]`
    // and `def.actionEffects?.[name]` are correlated by the runtime name, so
    // it widens both to the union over all actions. We re-narrow with one
    // cast here — runtime correctness comes from the shared key.
    const effectfulFn = def.actionEffects?.[actionCall.actionName] as
      | EffectfulActionFn<
          StateValue<TStateValidator>,
          unknown,
          inferIfZod<TMessageDataValidator>
        >
      | undefined;
    return applyStateChange(
      stateRepository,
      broadcaster,
      state,
      async (stateDraft) => {
        if (effectfulFn) {
          await effectfulFn({
            doCtx,
            stateDraft,
            payload,
            pureFn: commonAction.pureFn ?? (() => {}),
            broadcaster,
            userId,
            displayName,
            nodeShareManager,
            sendChatMessage: (data: inferIfZod<TMessageDataValidator>) =>
              void messageJiggler.sendChatMessage({
                chat: "",
                userId,
                createdTime: Date.now(),
                displayName,
                id: nanoid(),
                linkPreview: null,
                capabilityData: data ?? {},
                capabilityName: common.name,
              }),
          });
        } else if (commonAction.pureFn) {
          commonAction.pureFn({ stateDraft, payload });
        }
      },
      actionCall.correlation,
    );
  };

  const mount: ServerCapability["mount"] = async ({
    broadcaster,
    config,
    doCtx,
    messageJiggler,
    stateRepository,
    nodeShareManager,
  }) => {
    const configParseResult = common.config?.validator?.safeParse(config);
    if (configParseResult?.error) {
      if (process.env.NODE_ENV !== "test") {
        logger.error("Capability config failed validation", configParseResult);
      }
      return null;
    }
    // `undefined` for capabilities that declare no config block.
    const validatedConfig =
      configParseResult?.data as ConfigValue<TConfigValidator>;

    // `undefined` throughout for stateless capabilities.
    let state = undefined as StateValue<TStateValidator>;
    if (common.state) {
      const parseStoredStateResult = common.state.validator?.safeParse(
        stateRepository.get(common.name),
      );
      if (parseStoredStateResult?.success) {
        state = parseStoredStateResult.data as StateValue<TStateValidator>;
      } else {
        state = common.state.getInitialState({ config: validatedConfig });
        stateRepository.set(common.name, state);
      }
    }

    const draftState = (
      common.state ? createDraft(state as object) : undefined
    ) as Draft<StateValue<TStateValidator>>;
    await def.initialise?.({
      doCtx,
      draftState,
      messageJiggler,
      config: validatedConfig,
    });
    if (common.state) {
      const finalState = finishDraft(draftState) as StateValue<TStateValidator>;
      if (finalState !== state) {
        state = finalState;
        stateRepository.set(common.name, state);
      }
    }
    return {
      name: common.name,
      onMessage: async ({ actionCall, userId, displayName }) => {
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
          userId,
          displayName,
          nodeShareManager,
        });
      },
      runHook: async (name, event) => {
        // Single indexed access into `def.hooks`, so — unlike `actionEffects`
        // — no correlated-key cast is needed: `event` and the handler are keyed
        // by the same `name`.
        const hookFn = def.hooks?.[name];
        if (!hookFn) {
          return;
        }
        state = await applyStateChange(
          stateRepository,
          broadcaster,
          state,
          async (stateDraft) => {
            await hookFn({
              doCtx,
              broadcaster,
              nodeShareManager,
              stateDraft,
              event,
            });
          },
        );
      },
      getInitPayload: () => ({
        capability: common.name,
        state,
        config,
      }),
    };
  };

  return {
    name: common.name,
    displayName: common.displayName,
    defaultConfig: common.config?.default,
    mount,
  };
}
