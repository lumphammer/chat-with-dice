import type { Alphanumeric } from "#/utils/alphanumeric";
import type {
  ActionCall,
  JsonData,
  JsonValidator,
} from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { Draft, Patch } from "immer";
import type { z } from "zod";

export type inferIfZod<T> = T extends z.ZodType ? z.infer<T> : T;

/**
 * Represents what the server gets after mounting a capability
 */
export type ServerMountedCapability = {
  name: Alphanumeric;
  onMessage: (tools: {
    actionCall: ActionCall;
    userId: string;
    displayName: string;
  }) => Promise<void>;
  getInitPayload: () => { capability: string; state: unknown; config: unknown };
};

export type ClientMountedCapability<
  TState extends JsonData = JsonData,
  TActions extends Record<
    string,
    ActionDefinition<TState, z.ZodTypeAny, JsonData | undefined>
  > = Record<
    string,
    ActionDefinition<TState, z.ZodTypeAny, JsonData | undefined>
  >,
> =
  | { initialised: false }
  | {
      initialised: true;
      state: TState;
      patches: PatchRecord[];
      actions: {
        [K in keyof TActions]: (
          payload: z.core.output<TActions[K]["payloadValidator"]>,
        ) => void;
      };
    };

/**
 * An action function. Gets handed a bunch of tools, can do what it wants.
 */
type PureActionFn<TState, TPayload> = (tools: {
  stateDraft: Draft<TState>;
  payload: TPayload;
}) => void;

type EffectfulActionFn<TState, TPayload, TMessageData> = (tools: {
  doCtx: DurableObjectState;
  // messageRepository: MessageRepository;
  sendChatMessage: (data: TMessageData) => void;
  broadcaster: Broadcaster;
  pureFn: PureActionFn<TState, TPayload>;
  stateDraft: Draft<TState>;
  payload: TPayload;
  userId: string;
  displayName: string;
}) => void | Promise<void>;

/**
 * An action definition. Input validator plus function.
 */
export type ActionDefinition<
  TState,
  TPayloadValidator extends z.ZodType,
  TMessageData extends JsonData | undefined,
> = {
  payloadValidator: TPayloadValidator;
  pureFn?: PureActionFn<TState, z.infer<TPayloadValidator>>;
  effectfulFn?: EffectfulActionFn<
    TState,
    z.infer<TPayloadValidator>,
    TMessageData
  >;
};

export type AnyActionDefinition = ActionDefinition<
  any,
  z.ZodType,
  JsonData | undefined
>;

/**
 * Type for the builder function used when defining a capability
 */
export type CreateAction<TState, TMessageData extends JsonData | undefined> = <
  TPayloadValidator extends z.ZodType,
>(def: {
  payloadValidator: TPayloadValidator;
  pureFn?: PureActionFn<TState, z.infer<TPayloadValidator>>;
  effectfulFn?: EffectfulActionFn<
    TState,
    z.infer<TPayloadValidator>,
    TMessageData
  >;
}) => ActionDefinition<TState, TPayloadValidator, TMessageData>;

/**
 * The full input definition for a capability
 */
export type CapabilityDefinition<
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    ActionDefinition<
      z.infer<TStateValidator>,
      z.ZodType,
      inferIfZod<TMessageDataValidator>
    >
  >,
> = {
  name: string;
  displayName: string;
  configValidator: TConfigValidator;
  defaultConfig: z.infer<TConfigValidator>;
  stateValidator: TStateValidator;
  messageDataValidator?: TMessageDataValidator;
  getInitialState: (tools: {
    config: z.infer<TConfigValidator>;
  }) => z.infer<TStateValidator>;
  initialise: (tools: {
    doCtx: DurableObjectState;
    draftState: Draft<z.infer<TStateValidator>>;
    // db: DBHandle;
    messageJiggler: MessageJiggler;
    config: z.infer<TConfigValidator>;
  }) => void | Promise<void>;
  buildActions: (tools: {
    createAction: CreateAction<
      z.infer<TStateValidator>,
      inferIfZod<TMessageDataValidator>
    >;
  }) => TActions;
};

/**
 * Used for the registry.
 *
 * Does not include all members, only the ones that are needed in prod
 */
export type AnyCapability = {
  name: string;
  displayName: string;
  defaultConfig: JsonData;
  mount: (tools: {
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
    stateRepository: CapabilityStateRepository;

    config: unknown;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
};

export type Capability<
  // TConfig extends z.infer<z.ZodTypeAny>,
  TState extends JsonData,
  TActions extends Record<
    string,
    ActionDefinition<TState, z.ZodType, JsonData | undefined>
  >,
  TConfig extends JsonData,
> = {
  name: Alphanumeric;
  displayName: string;
  defaultConfig: TConfig;
  mount: (tools: {
    doCtx: DurableObjectState;
    messageJiggler: MessageJiggler;
    stateRepository: CapabilityStateRepository;
    config: unknown;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
  useMount: () => ClientMountedCapability<TState, TActions>;
};

/**
 * Used in the optimistic update system. One Patch record is added every time a
 * user makes a local change; it's removed when the corresponding update comes
 * back from the server, and the remaining patch records are played back on top
 * of the server response.
 */
export type PatchRecord = [string, Patch[]];
