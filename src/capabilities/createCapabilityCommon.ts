import type { Alphanumeric } from "#/utils/alphanumeric";
import { toAlphanumeric } from "#/utils/alphanumeric";
import type { JsonValidator } from "#/validators/jsonObjectValidator";
import type { Draft } from "immer";
import type * as z from "zod";

/**
 * Pull the inferred type out of a Zod validator if there is one. We use this
 * for `messageDataValidator`, which is optional — capabilities that don't send
 * chat messages leave it undefined and `TMessageData` ends up as `undefined`.
 */
export type inferIfZod<T> = T extends z.ZodType ? z.infer<T> : T;

/**
 * The shared piece of an action: a payload validator and an optional pure
 * state transition. Both sides need this — the server uses `pureFn` inside
 * `handleMessage` (when there's no effectful side), and the client uses it
 * for optimistic updates while the server response is in flight.
 *
 * The server-only `effectfulFn` is intentionally NOT here. It lives in the
 * server capability definition so its closures (and their imports of
 * broadcaster/db/etc.) stay out of the client bundle.
 */
export type CommonActionDefinition<
  TState,
  TPayloadValidator extends z.ZodType,
> = {
  payloadValidator: TPayloadValidator;
  pureFn?: PureActionFn<TState, z.infer<TPayloadValidator>>;
};

export type AnyCommonActionDefinition = CommonActionDefinition<any, z.ZodType>;

export type PureActionFn<TState, TPayload> = (tools: {
  stateDraft: Draft<TState>;
  payload: TPayload;
}) => void;

/** Builder passed into `buildActions` so action declarations get inferred types. */
type CreateCommonAction<TState> = <TPayloadValidator extends z.ZodType>(def: {
  payloadValidator: TPayloadValidator;
  pureFn?: PureActionFn<TState, z.infer<TPayloadValidator>>;
}) => CommonActionDefinition<TState, TPayloadValidator>;

export type CommonCapabilityDefinition<
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
  >,
> = {
  name: string;
  displayName: string;
  configValidator: TConfigValidator;
  defaultConfig: z.infer<TConfigValidator>;
  stateValidator: TStateValidator;
  messageDataValidator?: TMessageDataValidator;
  /**
   * Pure function from config → initial state. Server uses it on first mount
   * (when there's no stored state); client uses it as a fallback when the
   * received state fails validation. Must not close over server-only deps.
   */
  getInitialState: (tools: {
    config: z.infer<TConfigValidator>;
  }) => z.infer<TStateValidator>;
  buildActions: (tools: {
    createAction: CreateCommonAction<z.infer<TStateValidator>>;
  }) => TActions;
};

/**
 * The result of running a capability definition through the common factory.
 * This is the shared kernel both `createServerCapability` and
 * `createClientCapability` consume.
 */
export type CommonCapability<
  TConfigValidator extends JsonValidator = JsonValidator,
  TStateValidator extends JsonValidator = JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined =
    | JsonValidator
    | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
  > = Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
  >,
> = {
  name: Alphanumeric;
  displayName: string;
  configValidator: TConfigValidator;
  defaultConfig: z.infer<TConfigValidator>;
  stateValidator: TStateValidator;
  messageDataValidator?: TMessageDataValidator;
  getInitialState: (tools: {
    config: z.infer<TConfigValidator>;
  }) => z.infer<TStateValidator>;
  actions: TActions;
};

/**
 * Define the bits of a capability that are needed on both server and client:
 * its identity, validators, action payload shapes, and pure state transitions.
 * The result is fed into `createServerCapability` and `createClientCapability`
 * in the sibling `server.ts` / `client.ts` files.
 */
export function createCapabilityCommon<
  TConfigValidator extends JsonValidator,
  TStateValidator extends JsonValidator,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<z.infer<TStateValidator>, z.ZodType>
  >,
>(
  def: CommonCapabilityDefinition<
    TConfigValidator,
    TStateValidator,
    TMessageDataValidator,
    TActions
  >,
): CommonCapability<
  TConfigValidator,
  TStateValidator,
  TMessageDataValidator,
  TActions
> {
  const name = toAlphanumeric(def.name);
  const createAction: CreateCommonAction<z.infer<TStateValidator>> = ({
    payloadValidator,
    pureFn,
  }) => ({ payloadValidator, pureFn });
  const actions = def.buildActions({ createAction });
  return {
    name,
    displayName: def.displayName,
    configValidator: def.configValidator,
    defaultConfig: def.defaultConfig,
    stateValidator: def.stateValidator,
    messageDataValidator: def.messageDataValidator,
    getInitialState: def.getInitialState,
    actions,
  };
}
