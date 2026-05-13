import { authClient } from "#/utils/auth-client";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas";
import {
  CapabilityInfoContextProvider,
  type CapabilityInfoContextValue,
} from "../../capabilities/reactContexts/capabilityInfoContext";
import { SetCapabilityStateContextProvider } from "../../capabilities/reactContexts/setCapabilityStateContext";
import { deriveHueFromUserId } from "../../utils/deriveHueFromUserId";
import { Sidebar } from "../Sidebar/Sidebar";
import { AnonymousEntryDialog } from "./AnonymousEntryDialog";
import { ChatBubble } from "./ChatBubble";
import { ChatForm } from "./ChatForm";
import { Header } from "./Header";
import { RoomInfoContextProvider } from "./contexts/roomInfoContext";
import { SendMessageContextProvider } from "./contexts/sendMessageContext";
import { UsersOnlineContextProvider } from "./contexts/usersOnlineContext";
import styles from "./diceRoller.module.css";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import { useSmartScroll } from "./hooks/useSmartScroll";
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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
    roomOwnerId,
  }: {
    roomId: string;
    displayName: string;
    config: RoomConfig;
    roomOwnerId: string;
  }) => {
    const outerDivRef = useRef<HTMLDivElement>(null);
    const { isPending, data: sessionData } = authClient.useSession();
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

    const handleAnonymousNameUpdateError = useCallback(
      (message: string) => {
        toaster.error({
          title: "Couldn't save your display name",
          description: `${message} You can change it on your account page.`,
        });
      },
      [toaster],
    );

    const { connectionStatus, messages, sendMessage, usersOnline } =
      useChatWebSocket({
        roomId: roomId,
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

    const hue = deriveHueFromUserId(sessionData?.user.id);

    const {
      scrollContainerRef,
      handleScroll,
      scrollToBottom,
      hasNewMessages,
      bottomRef,
    } = useSmartScroll({
      messages,
      onScroll: (_x, y) => {
        outerDivRef.current?.style.setProperty("--bg-offset", `-${y}px`);
      },
    });

    const handleNewChatMessage = useCallback(
      ({ chat }: { chat: string }) => {
        if (sessionData === null) {
          return;
        }
        const msg: WebSocketClientMessage = {
          type: "chat",
          payload: {
            formula: {},
            chat,
            displayName: sessionData.user.name,
          },
        };
        sendMessage(msg);
      },
      [sendMessage, sessionData],
    );

    // const handleScrollUpdate = useCallback(())

    return (
      <CapabilityInfoContextProvider value={capabilityInfos}>
        <SetCapabilityStateContextProvider
          value={optimisticallySetCapabilityState}
        >
          <SendMessageContextProvider value={sendMessage}>
            <RoomInfoContextProvider
              value={useMemo(
                () => ({
                  roomConfig,
                  setRoomConfig: handleSetRoomConfig,
                  roomName,
                  setRoomName: handleSetRoomName,
                  roomId,
                  roomOwnerId,
                }),
                [
                  roomConfig,
                  handleSetRoomConfig,
                  handleSetRoomName,
                  roomName,
                  roomId,
                  roomOwnerId,
                ],
              )}
            >
              <UsersOnlineContextProvider value={usersOnline}>
                <div
                  ref={outerDivRef}
                  className={`main-area ${styles.outerDiv}`}
                  data-theme="unset"
                  style={
                    { "--user-hue": hue } satisfies UserHueStyle as UserHueStyle
                  }
                >
                  {!isPending && sessionData === null && (
                    <AnonymousEntryDialog
                      onUpdateNameError={handleAnonymousNameUpdateError}
                    />
                  )}
                  {/* grid-area: header — targeted via > header rule in CSS module */}
                  <Header
                    connectionStatus={connectionStatus}
                    roomName={roomName}
                  />
                  {/* chat scrolling area — grid-area: chat */}
                  <div data-part="scroller" className={styles.chatArea}>
                    <div
                      ref={scrollContainerRef}
                      onScroll={handleScroll}
                      className="absolute inset-0 overflow-auto px-4"
                    >
                      <div className={styles.chatMessages}>
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
                  {/* chat entry bar — grid-area: entry */}
                  <div data-part="entry" className={styles.entryArea}>
                    <ChatForm onNewMessage={handleNewChatMessage} />
                  </div>
                  {/* sidebar — grid-area: sidebar, spans header+chat+entry rows */}
                  <div data-part="sidebar" className={styles.sidebarWrapper}>
                    <Sidebar />
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
              </UsersOnlineContextProvider>
            </RoomInfoContextProvider>
          </SendMessageContextProvider>
        </SetCapabilityStateContextProvider>
      </CapabilityInfoContextProvider>
    );
  },
);

DiceRoller.displayName = "DiceRoller";
