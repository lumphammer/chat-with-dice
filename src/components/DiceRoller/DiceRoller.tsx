import type { RoomConfig } from "#/validators/roomConfigValidator";
import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas";
import {
  CapabilityInfoContextProvider,
  type CapabilityInfoContextValue,
} from "../../capabilities/reactContexts/capabilityInfoContext";
import { SetCapabilityStateContextProvider } from "../../capabilities/reactContexts/setCapabilityStateContext";
import { deriveHueFromUserId } from "../../utils/deriveHueFromUserId";
import { Sidebar } from "../Sidebar/Sidebar";
import { ChatBubble } from "./ChatBubble";
import { ChatForm } from "./ChatForm";
import { DisplayNameDialog } from "./DisplayNameDialog";
import { RoomConfigContextProvider } from "./contexts/roomConfigContext";
import { SendMessageContextProvider } from "./contexts/sendMessageContext";
import { UserIdentityContextProvider } from "./contexts/userIdentityContext";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import { useSmartScroll } from "./hooks/useSmartScroll";
import { useUserIdentityStorage } from "./hooks/useUserIdentityStorage";
import toastStyles from "./toast.module.css";
import type { UserHueStyle } from "./types";
import { Portal } from "@ark-ui/react/portal";
import { Toast, Toaster, createToaster } from "@ark-ui/react/toast";
import { enablePatches, produce, type Patch } from "immer";
import {
  CircleAlertIcon,
  TriangleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  XIcon,
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState } from "react";

enablePatches();

const iconMap = {
  success: CircleCheckIcon,
  error: CircleAlertIcon,
  warning: TriangleAlertIcon,
  info: InfoIcon,
};

export const DiceRoller = memo(
  ({
    roomId,
    displayName: initialDisplayName,
    config: initialConfig,
    isOwner,
  }: {
    roomId: string;
    displayName: string;
    config: RoomConfig;
    isOwner: boolean;
  }) => {
    const { userIdentity, handleSetDisplayName, loggedIn, isPending } =
      useUserIdentityStorage({ isOwner });

    const [roomConfig, setRoomConfig] = useState(initialConfig);

    const [roomName, setRoomName] = useState(initialDisplayName);

    const [capabilityInfos, setCapabilityInfos] =
      useState<CapabilityInfoContextValue>({});

    const optimisticallySetCapabilityState = useCallback(
      (
        name: string,
        state: any,
        correlation: string,
        patches: Patch[] = [],
      ) => {
        setCapabilityInfos((oldInfos) => {
          return produce(
            oldInfos,
            (draft) => {
              if (draft[name] && draft[name].initialised) {
                draft[name].state = state;
                draft[name].patches.push([correlation, patches]);
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
      setRoomConfig: setRoomConfig,
      setRoomName: setRoomName,
    });

    const handleSetRoomConfig = useCallback(
      (config: RoomConfig) => {
        setRoomConfig(config);
        sendMessage({
          type: "updateConfig",
          payload: {
            config,
          },
        });
      },
      [sendMessage],
    );

    const handleSetRoomName = useCallback(
      (newRoomName: string) => {
        setRoomName(newRoomName);
        sendMessage({
          type: "updateRoomName",
          payload: {
            roomName: newRoomName,
          },
        });
      },
      [sendMessage],
    );

    // this is a hack but we need to update the astro-rendered part of the page
    // if the room name changes
    useEffect(() => {
      const h1 = document.querySelector("body > header h1");
      if (h1) {
        h1.textContent = roomName;
      }
    }, [roomName]);

    const hue = deriveHueFromUserId(userIdentity.chatId);

    const {
      scrollContainerRef,
      handleScroll,
      scrollToBottom,
      hasNewMessages,
      bottomRef,
    } = useSmartScroll({ messages });

    const handleNewMessage = useCallback(
      ({ chat }: { chat: string }) => {
        const msg: WebSocketClientMessage = {
          type: "chat",
          payload: {
            formula: {},
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
        <SetCapabilityStateContextProvider
          value={optimisticallySetCapabilityState}
        >
          <SendMessageContextProvider value={sendMessage}>
            <UserIdentityContextProvider value={userIdentity}>
              <RoomConfigContextProvider
                value={useMemo(
                  () => ({
                    roomConfig,
                    setRoomConfig: handleSetRoomConfig,
                    roomName,
                    setRoomName: handleSetRoomName,
                    roomId,
                  }),
                  [
                    roomConfig,
                    handleSetRoomConfig,
                    handleSetRoomName,
                    roomName,
                    roomId,
                  ],
                )}
              >
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
                      className="text-middle ml-4 inline-flex h-(--size)
                        flex-col justify-center"
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
                  {/* flex row for main chat and sidebar */}
                  <div
                    data-part="outer expander"
                    className="group/main @container relative flex flex-1
                      flex-row justify-start overflow-hidden"
                  >
                    {/* chat scroller and chat form */}
                    <div
                      data-part="main"
                      className="mx-auto flex max-w-4xl flex-1 flex-col
                        overflow-hidden"
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
                    {/* sidebar */}
                    <Sidebar config={roomConfig} />
                  </div>
                </div>
                <Portal>
                  <Toaster toaster={toaster}>
                    {(toast) => {
                      const ToastIcon = toast.type
                        ? iconMap[toast.type as keyof typeof iconMap]
                        : undefined;
                      return (
                        <Toast.Root
                          key={toast.id}
                          className={toastStyles.toast}
                        >
                          {ToastIcon && (
                            <div className="mt-0.5 shrink-0">
                              <ToastIcon className="h-5 w-5" />
                            </div>
                          )}
                          <details
                            className="flex min-w-0 flex-1 flex-col gap-1"
                          >
                            <summary
                              className="text-sm leading-snug font-semibold"
                            >
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
              </RoomConfigContextProvider>
            </UserIdentityContextProvider>
          </SendMessageContextProvider>
        </SetCapabilityStateContextProvider>
      </CapabilityInfoContextProvider>
    );
  },
);

DiceRoller.displayName = "DiceRoller";
