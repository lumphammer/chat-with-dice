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
 * How a capability surfaces to clients and the server:
 * - `"public"` — shown in the room-config toggle UI; opt-in per room.
 * - `"dev"` — only shown in the config UI in development.
 * - `"always"` — always mounted on every room, no opt-in/out; hidden from the
 *   config UI. Needs to be visible to the server (to auto-mount), which is why
 *   `visibility` lives on the common kernel rather than the client half.
 */
export type VisibilityMode = "public" | "dev" | "always";

/**
 * The runtime value handed to `getInitialState`/`initialise` as `config`:
 * the validator's output when the capability declares a config block, or
 * `undefined` when it doesn't. Centralised here so the server/client
 * definitions stay in sync.
 */
export type ConfigValue<TConfigValidator extends JsonValidator | undefined> =
  TConfigValidator extends JsonValidator
    ? z.infer<TConfigValidator>
    : undefined;

/**
 * The state a capability manages: the validator's output when it declares a
 * `state` block, or `undefined` when it doesn't. Stateless capabilities (those
 * that only fire server-side effects, e.g. dice rolls) omit `state` entirely
 * and `TState` collapses to `undefined` everywhere it's threaded.
 */
export type StateValue<TStateValidator extends JsonValidator | undefined> =
  TStateValidator extends JsonValidator ? z.infer<TStateValidator> : undefined;

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
  TConfigValidator extends JsonValidator | undefined,
  TStateValidator extends JsonValidator | undefined,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<StateValue<TStateValidator>, z.ZodType>
  >,
> = {
  // common
  name: string;
  displayName: string;
  visibility?: VisibilityMode;
  messageDataValidator?: TMessageDataValidator;
  // config
  config?: {
    validator: TConfigValidator;
    default: ConfigValue<TConfigValidator>;
  };
  // state — omitted entirely by stateless capabilities
  state?: {
    validator: TStateValidator;
    /**
     * Pure function from config → initial state. Server uses it on first mount
     * (when there's no stored state); client uses it as a fallback when the
     * received state fails validation. Must not close over server-only deps.
     */
    getInitialState: (tools: {
      config: ConfigValue<TConfigValidator>;
    }) => StateValue<TStateValidator>;
  };
  // omitted entirely by capabilities with no actions
  buildActions?: (tools: {
    createAction: CreateCommonAction<StateValue<TStateValidator>>;
  }) => TActions;
};

/**
 * The result of running a capability definition through the common factory.
 * This is the shared kernel both `createServerCapability` and
 * `createClientCapability` consume.
 */
export type CommonCapability<
  TConfigValidator extends JsonValidator | undefined,
  TStateValidator extends JsonValidator | undefined,
  TMessageDataValidator extends JsonValidator | undefined,
  TActions extends Record<
    string,
    CommonActionDefinition<StateValue<TStateValidator>, z.ZodType>
  >,
> = {
  name: Alphanumeric;
  displayName: string;
  visibility?: VisibilityMode;
  config?: {
    validator: TConfigValidator;
    default: ConfigValue<TConfigValidator>;
  };
  state?: {
    validator: TStateValidator;
    getInitialState: (tools: {
      config: ConfigValue<TConfigValidator>;
    }) => StateValue<TStateValidator>;
  };
  messageDataValidator?: TMessageDataValidator;
  actions: TActions;
};

/**
 * Define the bits of a capability that are needed on both server and client:
 * its identity, validators, action payload shapes, and pure state transitions.
 * The result is fed into `createServerCapability` and `createClientCapability`
 * in the sibling `server.ts` / `client.ts` files.
 */
export function createCapabilityCommon<
  TActions extends Record<
    string,
    CommonActionDefinition<StateValue<TStateValidator>, z.ZodType>
  > = Record<string, never>,
  TStateValidator extends JsonValidator | undefined = undefined,
  TMessageDataValidator extends JsonValidator | undefined = undefined,
  TConfigValidator extends JsonValidator | undefined = undefined,
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
  const createAction: CreateCommonAction<StateValue<TStateValidator>> = ({
    payloadValidator,
    pureFn,
  }) => ({ payloadValidator, pureFn });
  const actions = def.buildActions
    ? def.buildActions({ createAction })
    : ({} as TActions);
  return {
    name,
    displayName: def.displayName,
    visibility: def.visibility,
    config: def.config,
    state: def.state,
    messageDataValidator: def.messageDataValidator,
    actions,
  };
}
