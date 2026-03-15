import { type WebSocketClientMessage } from "#/workers/types";
import { ChatBubble } from "./ChatBubble";
import { ChatForm } from "./ChatForm";
import { DisplayNameDialog } from "./DisplayNameDialog";
import { deriveHueFromUserId } from "./deriveHueFromUserId";
import type { UserHueStyle } from "./types";
import { useChatWebSocket } from "./useChatWebSocket";
import { useSmartScroll } from "./useSmartScroll";
import { useUserIdentityStorage } from "./useUserIdentityStorage";
import { UserIdentityContextProvider } from "./userIdentityContext";
import { memo, useCallback } from "react";

type DiceRollerProps = {
  roomId: string;
};

export const DiceRoller = memo(({ roomId }: DiceRollerProps) => {
  const { userIdentity, handleSetDisplayName, loggedIn, isPending } =
    useUserIdentityStorage();

  const { connectionStatus, messages, sendJSON } = useChatWebSocket({
    roomId: roomId,
    chatId: userIdentity.chatId,
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
    ({ formula, chat }: { formula: string; chat: string }) => {
      const msg: WebSocketClientMessage = {
        type: "chat",
        payload: {
          rollType: "formula",
          rollTypeVersion: 1,
          formula: formula.toLowerCase(),
          chat,
          displayName: userIdentity.displayName,
        },
      };
      sendJSON(msg);
    },
    [userIdentity, sendJSON], // this should be a linter warning!
  );

  return (
    <UserIdentityContextProvider value={userIdentity}>
      <div
        className="@container-[size] flex h-full w-full flex-col
          [--bubble-dark-c:0.12] [--bubble-dark-l:36%] [--bubble-light-c:0.12]
          [--bubble-light-l:82%]
          [--user-colour:oklch(var(--bubble-light-l)_var(--bubble-light-c)_var(--user-hue))]
          dark:[--user-colour:oklch(var(--bubble-dark-l)_var(--bubble-dark-c)_var(--user-hue))]"
        style={{ "--user-hue": hue } satisfies UserHueStyle as UserHueStyle}
      >
        <header className="bg-base-200 flex flex-row px-4">
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
              className="text-middle ml-4 inline-block h-3 w-3 rounded-full
                bg-red-500 align-baseline
                data-[connection-status=connected]:bg-green-500"
            ></span>
          </div>
        </header>
        <div className="relative flex-1 basis-0">
          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="absolute inset-0 overflow-auto px-4"
          >
            {messages.map((message) => (
              <ChatBubble key={message.id} message={message}></ChatBubble>
            ))}
            {messages.length === 0 && (
              <div className="font-italic">No messages yet</div>
            )}
            <div ref={bottomRef} />
          </div>
          {hasNewMessages && (
            <button
              onClick={scrollToBottom}
              className="btn btn-primary btn-sm absolute bottom-4 left-1/2
                -translate-x-1/2 shadow-lg"
            >
              ↓ New messages
            </button>
          )}
        </div>
        <ChatForm onNewMessage={handleNewMessage} />
      </div>
    </UserIdentityContextProvider>
  );
});

DiceRoller.displayName = "DiceRoller";
