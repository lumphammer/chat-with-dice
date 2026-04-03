import type { Alphanumeric } from "#/utils/alphanumeric";
import type { ActionCall } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/DiceRollerRoom/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/DiceRollerRoom/CapabilityStateRepository";
import type { MessageRepository } from "#/workers/DiceRollerRoom/MessageRepository";
import type { Draft } from "immer";
import type { z } from "zod";

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
    Record<string, SimpleActionDefinition<TState, z.ZodTypeAny>>,
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
type SimpleActionFn<TState, TPayload> = (tools: {
  stateDraft: Draft<TState>;
  payload: TPayload;
}) => Promise<void>;

type ComplexActionFn<TState, TPayload> = (tools: {
  doCtx: DurableObjectState;
  optimisticFn: SimpleActionFn<TState, TPayload>;
  stateDraft: Draft<TState>;
  payload: TPayload;
}) => Promise<void>;

type foo = string;

type notA = Exclude<foo, "a">;

function thing(_x: notA) {}

thing("b");
thing("a");

/**
 * An action definition. Input validator plus function.
 */
export type SimpleActionDefinition<
  TState,
  TPayloadValidator extends z.ZodType,
> = {
  type: "simple";
  payloadValidator: TPayloadValidator;
  actionFn: SimpleActionFn<TState, z.infer<TPayloadValidator>>;
};

export type ComplexActionDefinition<
  TState,
  TPayloadValidator extends z.ZodType,
> = {
  type: "complex";
  payloadValidator: TPayloadValidator;
  optimisticFn: SimpleActionFn<TState, z.infer<TPayloadValidator>>;
  complexFn: ComplexActionFn<TState, z.infer<TPayloadValidator>>;
};

export type ActionDefinition<TState, TPayloadValidator extends z.ZodType> =
  | SimpleActionDefinition<TState, TPayloadValidator>
  | ComplexActionDefinition<TState, TPayloadValidator>;

export type AnyActionDefinition = ActionDefinition<any, z.ZodType>;

/**
 * Type for the builder function used when defining a capability
 */
export type CreateSimpleAction<TState> = <
  TPayloadValidator extends z.ZodType,
>(def: {
  payloadValidator: TPayloadValidator;
  actionFn: SimpleActionFn<TState, z.infer<TPayloadValidator>>;
}) => SimpleActionDefinition<TState, TPayloadValidator>;

export type CreateComplexAction<TState> = <
  TPayloadValidator extends z.ZodType,
>(def: {
  payloadValidator: TPayloadValidator;
  optimisticFn: SimpleActionFn<TState, z.infer<TPayloadValidator>>;
  complexFn: ComplexActionFn<TState, z.infer<TPayloadValidator>>;
}) => ComplexActionDefinition<TState, TPayloadValidator>;

// optimistic

/**
 * The full input definition for a capability
 */
export type CapabilityDefinition<
  TConfigValidator extends z.ZodType,
  TStateValidator extends z.ZodObject,
  TActions extends Record<
    string,
    ActionDefinition<z.infer<TStateValidator>, z.ZodType>
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
  buildActions: (tools: {
    createSimpleAction: CreateSimpleAction<z.infer<TStateValidator>>;
    createComplexAction: CreateComplexAction<z.infer<TStateValidator>>;
  }) => TActions;
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
    stateRepository: CapabilityStateRepository;

    config: unknown;
    broadcaster: Broadcaster;
  }) => Promise<ServerMountedCapability | null>;
};

export type Capability<
  // TConfig extends z.infer<z.ZodTypeAny>,
  TState extends z.infer<z.ZodObject>,
  TActions extends Record<string, ActionDefinition<TState, z.ZodType>>,
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
