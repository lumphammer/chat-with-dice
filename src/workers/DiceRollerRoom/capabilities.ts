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

type CapabilityDef<
  TContext,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
> = {
  name: string;
  initialise: (ctx: DurableObjectState, db: DBHandle) => Promise<TContext>;
  buildActions: (createAction: CreateAction<TContext>) => TActions;
};

const createCapability = <
  TContext,
  TActions extends Record<string, ActionDefinition<TContext, z.ZodTypeAny>>,
>(
  def: CapabilityDef<TContext, TActions>,
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

  const dispatchAction = async (
    doCtx: DurableObjectState,
    capCtx: TContext,
    actionCall: ActionCall,
  ) => {
    const action = actions[actionCall.action];
    if (!action) throw new Error(`Unknown action: ${actionCall.action}`);
    const payload = action.payloadValidator.parse(actionCall.payload);
    await action.actionFn(doCtx, capCtx, payload);
  };

  return {
    initialise: def.initialise,
    onMessage: dispatchAction,
    creators,
    mount: async (
      doCtx: DurableObjectState,
      db: DBHandle,
    ): Promise<MountedCapability> => {
      const capCtx = await def.initialise(doCtx, db);
      return {
        name: def.name,
        onMessage: (actionCall) => dispatchAction(doCtx, capCtx, actionCall),
      };
    },
  };
};

const counterCapabilityStateValidator = z.object({ count: z.int() });

export const counterCapability = createCapability({
  name: "Counter",
  initialise: async (ctx, _db) => {
    const storedState = ctx.storage.kv.get("counter_capability");
    let state: z.infer<typeof counterCapabilityStateValidator>;
    if (storedState === undefined || typeof storedState !== "string") {
      state = { count: 0 };
      ctx.storage.kv.put("counter_capability", JSON.stringify(state));
    } else
      try {
        state = counterCapabilityStateValidator.parse(JSON.parse(storedState));
      } catch (e: unknown) {
        console.error(
          "failed to validate stored state for counter capability, defaulting",
          e instanceof Error ? e.message : String(e),
        );
        state = { count: 0 };
      }

    return state;
  },
  buildActions: (createAction) => ({
    increment: createAction(
      z.object({ by: z.number() }),
      async (doCtx, capCtx, payload) => {
        capCtx.count += payload.by;
        doCtx.storage.put("counter_capability", JSON.stringify(capCtx));
      },
    ),
  }),
});

// wrapping these pocs in a function so they don't actually get called
function _neverGetsCalled() {
  // this would get called on the client
  const actionCallMessage = counterCapability.creators.increment({ by: 2 });

  // this drilling wouldn't happen IRL - the DO would deal with find the
  // capability and passing this bit down.
  const actionCall = actionCallMessage.payload.payload;

  // this is roughly what would happen in the DO
  counterCapability.onMessage(
    null as unknown as DurableObjectState, // just to prove the types work
    { count: 3 }, // DO would be tracking these state objects per capability
    actionCall,
  );
}
