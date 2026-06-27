import { authClient } from "#/auth/authClient";
import { useCapabilityInfo } from "#/capabilities/reactContexts/capabilityInfoContext";
import { useSetCapabilityStateContext } from "#/capabilities/reactContexts/setCapabilityStateContext";
import { useSendMessageContext } from "#/components/DiceRoller/contexts/sendMessageContext";
import { useRefStash } from "#/components/useRefStash";
import type { Alphanumeric } from "#/utils/alphanumeric";
import { logger } from "#/utils/logger";
import type { JsonData, JsonValidator } from "#/validators/jsonObjectValidator";
import type {
  AnyCommonActionDefinition,
  CommonActionDefinition,
  CommonCapability,
  ConfigValue,
} from "./createCapabilityCommon";
import type { Patch } from "immer";
import { produceWithPatches } from "immer";
import { nanoid } from "nanoid";
import { type ComponentType, useMemo } from "react";
import type * as z from "zod";

export type PatchRecord = [string, Patch[]];

type ClientMountedCapability<
  TState extends JsonData = JsonData,
  TActions extends Record<string, CommonActionDefinition<TState, z.ZodType>> =
    Record<string, CommonActionDefinition<TState, z.ZodType>>,
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

type SidebarInfo = {
  key: string;
  SidebarComponent: ComponentType;
  IconComponent: ComponentType;
};

export type ClientCapabilityDefinition = {
  visibility?: "public" | "dev";
  sidebarInfos?: SidebarInfo[];
  ChatDisplayComponent?: ComponentType<{
    capabilityData: JsonData;
    messageId: string;
  }>;
};

export type ClientCapability<
  TConfigValidator extends JsonValidator | undefined = undefined,
  TStateValidator extends JsonValidator = JsonValidator,
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
  defaultConfig: ConfigValue<TConfigValidator>;
  useMount: () => ClientMountedCapability<z.infer<TStateValidator>, TActions>;
  visibility?: "public" | "dev";
  sidebarInfos?: SidebarInfo[];
  ChatDisplayComponent?: ComponentType<{
    capabilityData: JsonData;
    messageId: string;
  }>;
};

/**
 * Build the client-side half of a capability from a `CommonCapability` plus
 * the UI bindings that hang off the registry today (sidebar entries, the
 * optional in-chat display component, visibility gating).
 *
 * `useMount` is a React hook used by capability-aware components to read state
 * and send actions with optimistic updates. The optimistic update path runs
 * the common `pureFn`; nothing in this file touches a server effect.
 */
export function createClientCapability<
  TConfigValidator extends JsonValidator | undefined,
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
  def: ClientCapabilityDefinition = {},
): ClientCapability<TConfigValidator, TStateValidator, TActions> {
  const useMount = (): ClientMountedCapability<
    z.infer<TStateValidator>,
    TActions
  > => {
    const sendMessage = useSendMessageContext();
    const setCapabilityState = useSetCapabilityStateContext();
    const info = useCapabilityInfo(common.name);
    const { data: sessionData } = authClient.useSession();

    type CreatorsEntriesTuple = [string, AnyCommonActionDefinition];

    const sessionDataRef = useRefStash(sessionData);
    const capabilityInfoRef = useRefStash(info);

    const spicyCreators = useMemo(
      () =>
        Object.fromEntries(
          Object.entries(common.actions).map(
            ([action, actionDefinition]: CreatorsEntriesTuple) => {
              return [
                action,
                (payload: any): void => {
                  const correlation = nanoid();
                  if (sessionDataRef.current === null) {
                    return;
                  }
                  sendMessage?.({
                    type: "action",
                    payload: {
                      capabilityName: common.name,
                      actionCall: {
                        correlation,
                        actionName: action,
                        params: payload,
                      },
                      displayName: sessionDataRef.current.user.name,
                    },
                  });

                  if (capabilityInfoRef.current.initialised) {
                    const [newState, patches] = produceWithPatches(
                      capabilityInfoRef.current.state,
                      (draft) => {
                        actionDefinition.pureFn?.({
                          stateDraft: draft,
                          payload,
                        });
                      },
                    );
                    setCapabilityState?.(
                      common.name,
                      newState,
                      correlation,
                      patches,
                    );
                  }
                },
              ];
            },
          ),
        ) as {
          [K in keyof TActions]: (
            payload: z.infer<TActions[K]["payloadValidator"]>,
          ) => void;
        },
      [sessionDataRef, capabilityInfoRef, setCapabilityState, sendMessage],
    );

    if (!info || !info.initialised) {
      return { initialised: false };
    }
    const parsedState = common.stateValidator.safeParse(info.state);
    const parsedConfig = common.config?.validator?.safeParse(info.config);
    const config = (
      parsedConfig?.success ? parsedConfig.data : common.config?.default
    ) as ConfigValue<TConfigValidator>;
    const state = parsedState.success
      ? parsedState.data
      : common.getInitialState({ config });

    if (parsedConfig?.success === false) {
      logger.error("Received a corrupt config for capability " + common.name);
    }
    if (!parsedState.success) {
      logger.error("Received a corrupt state for capability " + common.name);
    }

    return {
      initialised: true,
      state,
      patches: info.patches,
      actions: spicyCreators,
    };
  };

  return {
    name: common.name,
    displayName: common.displayName,
    defaultConfig: common.config?.default as ConfigValue<TConfigValidator>,
    useMount,
    visibility: def.visibility,
    sidebarInfos: def.sidebarInfos,
    ChatDisplayComponent: def.ChatDisplayComponent,
  };
}
