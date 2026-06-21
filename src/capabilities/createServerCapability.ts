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
  PureActionFn,
  inferIfZod,
} from "./createCapabilityCommon";
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

export type ServerCapabilityDefinition<
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
  >,
> = {
  initialise: (tools: {
    doCtx: DurableObjectState;
    draftState: Draft<z.infer<TStateValidator>>;
    messageJiggler: MessageJiggler;
    config: z.infer<TConfigValidator>;
  }) => void | Promise<void>;
  actionEffects?: {
    [K in keyof TActions]?: EffectfulActionFn<
      z.infer<TStateValidator>,
      z.infer<TActions[K]["payloadValidator"]>,
      inferIfZod<TMessageDataValidator>
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
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
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
  >,
): ServerCapability {
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
    state: z.infer<TStateValidator>;
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
          z.infer<TStateValidator>,
          unknown,
          inferIfZod<TMessageDataValidator>
        >
      | undefined;
    const stateDraft = createDraft(state);
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
    const finalState = finishDraft(stateDraft) as z.infer<TStateValidator>;
    stateRepository.set(common.name, finalState);
    setTimeout(() => {
      broadcaster.broadcast({
        type: "capabilityState",
        payload: {
          capability: common.name,
          correlation: actionCall.correlation,
          state: finalState,
        },
      });
    }, ARTIFICIAL_LAG_MS);
    return finalState;
  };

  const mount: ServerCapability["mount"] = async ({
    broadcaster,
    config,
    doCtx,
    messageJiggler,
    stateRepository,
    nodeShareManager,
  }) => {
    const configParseResult = common.configValidator.safeParse(config);
    if (configParseResult.error) {
      if (process.env.NODE_ENV !== "test") {
        logger.error("Capability config failed validation", configParseResult);
      }
      return null;
    }

    let state: z.infer<TStateValidator>;
    const parseStoredStateResult = common.stateValidator.safeParse(
      stateRepository.get(common.name),
    );
    if (parseStoredStateResult.success) {
      state = parseStoredStateResult.data;
    } else {
      state = common.getInitialState({ config: configParseResult.data });
      stateRepository.set(common.name, state);
    }

    const draftState = createDraft(state);
    await def.initialise({
      doCtx,
      draftState,
      messageJiggler,
      config: configParseResult.data,
    });
    const finalState = finishDraft(draftState) as z.infer<TStateValidator>;
    if (finalState !== state) {
      state = finalState;
      stateRepository.set(common.name, state);
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
    defaultConfig: common.defaultConfig,
    mount,
  };
}
