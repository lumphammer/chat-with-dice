import { authClient } from "#/auth/authClient.ts";
import { generateRandomName } from "#/utils/generateRandomName";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import type { WebSocketClientMessage } from "#/validators/webSocketMessageSchemas";
import {
  CapabilityInfoContextProvider,
  type CapabilityInfoContextValue,
} from "../../capabilities/reactContexts/capabilityInfoContext";
import { SetCapabilityStateContextProvider } from "../../capabilities/reactContexts/setCapabilityStateContext";
import { deriveHueFromUserId } from "../../utils/deriveHueFromUserId";
import {
  FeedbackToasterProvider,
  useFeedbackToasterProvider,
} from "../FeedbackToaster";
import { Sidebar } from "../Sidebar/Sidebar";
import { ChatBubble } from "./ChatBubble";
import { ChatForm } from "./ChatForm";
import { Header } from "./Header";
import { RoomInfoContextProvider } from "./contexts/roomInfoContext";
import { RoomUiNavigationContextProvider } from "./contexts/roomUiNavigationContext";
import { SendMessageContextProvider } from "./contexts/sendMessageContext";
import styles from "./diceRoller.module.css";
import { useChatWebSocket } from "./hooks/useChatWebSocket";
import { useSmartScroll } from "./hooks/useSmartScroll";
import type { UserHueStyle } from "./types";
import { enablePatches, produce, type Patch } from "immer";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

const NAG_INTERVAL_MINUTES = 20;

enablePatches();

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
    const headerRef = useRef<HTMLElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const entryAreaRef = useRef<HTMLDivElement>(null);
    const sidebarBackgroundRefs = useMemo(
      () => [headerRef, chatAreaRef, entryAreaRef],
      [],
    );
    const { isPending, data: sessionData } = authClient.useSession();
    const [roomConfig, setRoomConfig] = useState(initialConfig);
    const [roomName, setRoomName] = useState(initialDisplayName);
    const [capabilityInfos, setCapabilityInfos] =
      useState<CapabilityInfoContextValue>({});

    const feedbackToasterValue = useFeedbackToasterProvider();

    const anonSignIn = useCallback(async () => {
      const name = generateRandomName();
      const { error: signInError } = await authClient.signIn.anonymous();
      if (signInError) {
        feedbackToasterValue.onError(
          signInError.message ??
            "Could not sign in anonymously. Please try refreshing.",
        );
        return;
      }

      const { error: updateError } = await authClient.updateUser({ name });
      if (updateError) {
        feedbackToasterValue.onError(
          updateError.message ??
            "Could not sign in anonymously. Please try refreshing.",
        );
        await authClient.signOut();
        return;
      }
    }, [feedbackToasterValue]);

    useEffect(() => {
      if (!isPending && sessionData === null) {
        void anonSignIn();
      }
      if (
        !isPending &&
        sessionData?.user.isAnonymous &&
        sessionData?.user.id !== roomOwnerId
      ) {
        feedbackToasterValue.onInfo(
          <>
            <p>You've joined as a guest, {sessionData?.user.name}.</p>
            <p>Create an account to keep your rolls and settings.</p>
            <a href="/signup" className="btn btn-info">
              Create account
            </a>
          </>,
        );
      }
    }, [isPending, sessionData, anonSignIn, feedbackToasterValue, roomOwnerId]);

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

    const { connectionStatus, messages, sendMessage } = useChatWebSocket({
      roomId: roomId,
      onError: useCallback(
        (error: { errorMessage: string; detail: string }) => {
          feedbackToasterValue.onError(error.errorMessage, error.detail);
        },
        [feedbackToasterValue],
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
      contentRef,
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
            chat,
            displayName: sessionData.user.name,
          },
        };
        sendMessage(msg);
      },
      [sendMessage, sessionData],
    );

    useEffect(() => {
      if (
        !isPending &&
        sessionData?.user.isAnonymous &&
        sessionData?.user.id === roomOwnerId
      ) {
        const sendWarning = () => {
          feedbackToasterValue.onWarn(
            <>
              <p>You're playing as a guest — this room won't be saved.</p>
              <p>Create an account to keep it.</p>
              <a href="/signup" className="btn btn-warning">
                Create account
              </a>
            </>,
          );
        };
        sendWarning();
        const interval = setInterval(
          sendWarning,
          1000 * 60 * NAG_INTERVAL_MINUTES,
        );
        return () => clearInterval(interval);
      }
    }, [sessionData, isPending, feedbackToasterValue, roomOwnerId]);

    return (
      <FeedbackToasterProvider feedbackToasterValue={feedbackToasterValue}>
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
                <RoomUiNavigationContextProvider>
                  <div
                    ref={outerDivRef}
                    className={`main-area ${styles.outerDiv}`}
                    data-theme="unset"
                    style={
                      {
                        "--user-hue": hue,
                      } satisfies UserHueStyle as UserHueStyle
                    }
                  >
                    {/* grid-area: header — targeted via > header rule in CSS module */}
                    <Header
                      ref={headerRef}
                      connectionStatus={connectionStatus}
                      roomName={roomName}
                    />
                    {/* chat scrolling area — grid-area: chat */}
                    <div
                      ref={chatAreaRef}
                      data-part="scroller"
                      className={styles.chatArea}
                    >
                      <div
                        ref={scrollContainerRef}
                        onScroll={handleScroll}
                        className="absolute inset-0 overflow-auto px-4"
                      >
                        <div ref={contentRef} className={styles.chatMessages}>
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
                    <div
                      ref={entryAreaRef}
                      data-part="entry"
                      className={styles.entryArea}
                    >
                      <ChatForm onNewMessage={handleNewChatMessage} />
                    </div>
                    {/* sidebar — grid-area: sidebar, spans header+chat+entry rows */}
                    <div data-part="sidebar" className={styles.sidebarWrapper}>
                      <Sidebar backgroundElementRefs={sidebarBackgroundRefs} />
                    </div>
                  </div>
                </RoomUiNavigationContextProvider>
              </RoomInfoContextProvider>
            </SendMessageContextProvider>
          </SetCapabilityStateContextProvider>
        </CapabilityInfoContextProvider>
      </FeedbackToasterProvider>
    );
  },
);

DiceRoller.displayName = "DiceRoller";
