import type {
  ActionCall,
  ActionCallMessage,
  WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { DBHandle } from "./types";
import { z } from "zod/v4";

export type MountedCapability = {
  name: string;
  onMessage: (actionCall: ActionCall) => Promise<void>;
};

type ActionDefinition<TContext, TPayloadValidator extends z.ZodTypeAny> = {
  payloadValidator: TPayloadValidator;
  actionFn: (
    doCtx: DurableObjectState,
    capCtx: TContext,
    payload: z.infer<TPayloadValidator>,
  ) => Promise<void>;
};

type CreateAction<TContext> = <TPayloadValidator extends z.ZodTypeAny>(
  payloadValidator: TPayloadValidator,
  action: (
    doCtx: DurableObjectState,
    capCtx: TContext,
    payload: z.infer<TPayloadValidator>,
  ) => Promise<void>,
) => ActionDefinition<TContext, TPayloadValidator>;

type CapabilityDefinition<
  TContext,
  TConfigValidator extends z.ZodTypeAny,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
> = {
  name: string;
  configValidator: TConfigValidator;
  initialise: (tools: {
    doCtx: DurableObjectState;
    db: DBHandle;
    config: z.infer<TConfigValidator>;
  }) => Promise<TContext>;
  buildActions: (createAction: CreateAction<TContext>) => TActions;
};

export const createCapability = <
  TContext,
  TConfigValidator extends z.ZodTypeAny,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
>(
  def: CapabilityDefinition<TContext, TConfigValidator, TActions>,
) => {
  const actions: TActions = def.buildActions((payloadValidator, actionFn) => ({
    payloadValidator,
    actionFn,
  }));
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

  const onMessage = async (
    doCtx: DurableObjectState,
    capCtx: TContext,
    actionCall: ActionCall,
  ) => {
    const action = actions[actionCall.action];
    if (!action) throw new Error(`Unknown action: ${actionCall.action}`);
    const payload = action.payloadValidator.parse(actionCall.payload);
    await action.actionFn(doCtx, capCtx, payload);
  };

  const mount = async (
    doCtx: DurableObjectState,
    db: DBHandle,
    config: unknown,
  ): Promise<MountedCapability> => {
    const configParseResult = def.configValidator.safeParse(config);
    if (configParseResult.error) {
      throw new Error("Capability config failed validation", {
        cause: configParseResult,
      });
    }
    const capCtx = await def.initialise({
      doCtx: doCtx,
      db,
      config: configParseResult.data,
    });
    return {
      name: def.name,
      onMessage: (actionCall) => onMessage(doCtx, capCtx, actionCall),
    };
  };

  return {
    name: def.name,
    initialise: def.initialise,
    onMessage,
    creators,
    mount,
  };
};
