import type { RollType } from "#/rollTypes/rollTypeRegistry";
import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas";
import { ChatBubble } from "./ChatBubble";
import { ChatForm } from "./ChatForm";
import { DisplayNameDialog } from "./DisplayNameDialog";
import { SidebarCounter } from "./SidebarCounter";
import {
  CapabilityInfoContextProvider,
  type CapabilityInfoContextValue,
} from "./contexts/capabilityInfoContext";
import { SendMessageContextProvider } from "./contexts/sendMessageContext";
import { SetCapabilityStateContextProvider } from "./contexts/setCapabilityStateContext";
import { UserIdentityContextProvider } from "./contexts/userIdentityContext";
import { deriveHueFromUserId } from "./deriveHueFromUserId";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import { useSmartScroll } from "./hooks/useSmartScroll";
import { useUserIdentityStorage } from "./hooks/useUserIdentityStorage";
import toastStyles from "./toast.module.css";
import type { UserHueStyle } from "./types";
import { Portal } from "@ark-ui/react/portal";
import { Toast, Toaster, createToaster } from "@ark-ui/react/toast";
import { produce } from "immer";
import {
  CircleAlertIcon,
  TriangleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";

type DiceRollerProps = {
  roomId: string;
};
const iconMap = {
  success: CircleCheckIcon,
  error: CircleAlertIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
};

export const DiceRoller = memo(({ roomId }: DiceRollerProps) => {
  const { userIdentity, handleSetDisplayName, loggedIn, isPending } =
    useUserIdentityStorage();

  const [capabilityInfos, setCapabilityInfos] =
    useState<CapabilityInfoContextValue>({});

  const setCapabilityState = useCallback(
    (name: string, state: any) => {
      setCapabilityInfos((oldInfos) => {
        return produce(
          oldInfos,
          (draft) => {
            if (draft[name] && draft[name].initialised) {
              draft[name].state = state;
            }
          },
          (_patches) => {},
        );
      });
    },
    [setCapabilityInfos],
  );

  const toaster = useMemo(
    () =>
      createToaster({
        placement: "top",
        overlap: true,
        gap: 8,
        removeDelay: 250,
        max: 10,
      }),
    [],
  );

  const { connectionStatus, messages, sendMessage } = useChatWebSocket({
    roomId: roomId,
    chatId: userIdentity.chatId,
    onError: useCallback(
      (error: { errorMessage: string; detail: string }) => {
        toaster.error({
          title: error.errorMessage,
          description: error.detail,
        });
      },
      [toaster],
    ),
    setCapabilityInfos,
  });

  const hue = deriveHueFromUserId(userIdentity.chatId);

  const {
    scrollContainerRef,
    handleScroll,
    scrollToBottom,
    hasNewMessages,
    bottomRef,
  } = useSmartScroll({ messages });

  const handleNewMessage = useCallback(
    ({
      formula,
      chat,
      rollType,
    }: {
      formula: string;
      chat: string;
      rollType: RollType;
    }) => {
      const msg: WebSocketClientMessage = {
        type: "chat",
        payload: {
          rollType,
          formula,
          chat,
          displayName: userIdentity.displayName,
        },
      };
      sendMessage(msg);
    },
    [userIdentity, sendMessage], // this should be a linter warning!
  );

  return (
    <CapabilityInfoContextProvider value={capabilityInfos}>
      <SetCapabilityStateContextProvider value={setCapabilityState}>
        <SendMessageContextProvider value={sendMessage}>
          <UserIdentityContextProvider value={userIdentity}>
            <div
              className="@container-[size] flex h-full w-full flex-col
                [--bubble-dark-c:0.12] [--bubble-dark-l:36%]
                [--bubble-light-c:0.12] [--bubble-light-l:82%]
                [--user-colour:oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]
                dark:[--user-colour:oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]"
              style={
                { "--user-hue": hue } satisfies UserHueStyle as UserHueStyle
              }
            >
              <header className="flex flex-row px-4">
                <div className="flex-1" />
                <DisplayNameDialog
                  displayName={userIdentity.displayName}
                  onSetDisplayName={handleSetDisplayName}
                  loggedIn={loggedIn}
                  isPending={isPending}
                />
                <div
                  className="text-middle ml-4 inline-flex h-(--size) flex-col
                    justify-center"
                >
                  Connection status:
                </div>
                <div
                  className="text-middle inline-flex h-(--size) flex-col
                    justify-center"
                >
                  <span
                    data-connection-status={connectionStatus}
                    aria-description={connectionStatus}
                    className="text-middle ml-4 inline-block h-3 w-3
                      rounded-full bg-red-500 align-baseline
                      data-[connection-status=connected]:bg-green-500"
                  ></span>
                </div>
              </header>
              <div
                data-part="outer expander"
                className="gap- flex flex-1 flex-row justify-start"
              >
                <div className="bg-base-100 w-sm">
                  <SidebarCounter />
                </div>
                <div
                  data-part="main"
                  className="mx-auto flex max-w-4xl flex-1 flex-col"
                >
                  <div className="relative flex-1 basis-0">
                    <div
                      ref={scrollContainerRef}
                      onScroll={handleScroll}
                      className="absolute inset-0 overflow-auto px-4"
                    >
                      {messages.map((message) => (
                        <ChatBubble
                          key={message.id}
                          message={message}
                        ></ChatBubble>
                      ))}
                      {messages.length === 0 && (
                        <div className="font-italic">No messages yet</div>
                      )}
                      <div ref={bottomRef} />
                    </div>
                    {hasNewMessages && (
                      <button
                        onClick={scrollToBottom}
                        className="btn btn-primary btn-sm absolute bottom-4
                          left-1/2 -translate-x-1/2 shadow-lg"
                      >
                        ↓ New messages
                      </button>
                    )}
                  </div>
                  <ChatForm onNewMessage={handleNewMessage} />
                </div>
              </div>
            </div>
            <Portal>
              <Toaster toaster={toaster}>
                {(toast) => {
                  const ToastIcon = toast.type
                    ? iconMap[toast.type as keyof typeof iconMap]
                    : undefined;
                  return (
                    <Toast.Root key={toast.id} className={toastStyles.toast}>
                      {ToastIcon && (
                        <div className="mt-0.5 shrink-0">
                          <ToastIcon className="h-5 w-5" />
                        </div>
                      )}
                      <details className="flex min-w-0 flex-1 flex-col gap-1">
                        <summary className="text-sm leading-snug font-semibold">
                          {toast.title}
                        </summary>
                        <Toast.Description
                          className="text-xs leading-snug opacity-80"
                        >
                          {toast.description}
                        </Toast.Description>
                      </details>

                      <Toast.CloseTrigger
                        className="hover:bg-base-300 mt-0.5 shrink-0
                          cursor-pointer rounded-md p-0.5 transition-colors"
                      >
                        <XIcon className="h-4 w-4" />
                      </Toast.CloseTrigger>
                    </Toast.Root>
                  );
                }}
              </Toaster>
            </Portal>
          </UserIdentityContextProvider>
        </SendMessageContextProvider>
      </SetCapabilityStateContextProvider>
    </CapabilityInfoContextProvider>
  );
});

DiceRoller.displayName = "DiceRoller";
