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
export type ActionDefinition<
  TContext,
  TPayloadValidator extends z.ZodTypeAny,
> = {
  payloadValidator: TPayloadValidator;
  actionFn: ActionFn<TContext, TPayloadValidator>;
};

/**
 * Type for the builder function used when defining a capability
 */
export type CreateAction<TContext> = <
  TPayloadValidator extends z.ZodTypeAny,
>(def: {
  payloadValidator: TPayloadValidator;
  actionFn: ActionFn<TContext, TPayloadValidator>;
}) => ActionDefinition<TContext, TPayloadValidator>;

/**
 * The full input definition for a capability
 */
export type CapabilityDefinition<
  TConfigValidator extends z.ZodTypeAny,
  TStateValidator extends z.ZodObject,
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
  buildActions: (tools: {
    createAction: CreateAction<z.infer<TStateValidator>>;
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
