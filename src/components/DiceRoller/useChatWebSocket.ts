import { ReconnectingWebSocket } from "#/utils/ReconnectingWebSocket";
import type { RollerMessage } from "#/validators/rollerMessageType";
import {
  webSocketServerMessageSchema,
  type WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { ConnectionStatus } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";
import z from "zod";

type UseChatWebSocketArgs = {
  roomId: string;
  chatId: string;
  onError: (error: { errorMessage: string; detail: string }) => void;
  capabilityStates: Record<string, unknown>;
  setCapabilityStates: React.Dispatch<
    React.SetStateAction<Record<string, unknown>>
  >;
};

const MAX_HISTORY_BUFFER_LENGTH = 100;

export const useChatWebSocket = ({
  roomId,
  chatId,
  onError,
  setCapabilityStates,
}: UseChatWebSocketArgs) => {
  const [messages, setMessages] = useState<RollerMessage[]>([]);
  // const [error, setError] = useState<{
  //   errorMessage: string;
  //   detail: string;
  // } | null>(null);

  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const websocketRef = useRef<ReconnectingWebSocket>(null);

  useEffect(() => {
    if (!chatId) {
      return;
    }
    // Build WebSocket URL
    const wsUrl = `../ws/?roomId=${encodeURIComponent(roomId)}&chatId=${encodeURIComponent(chatId)}`;

    // return;
    // Create WebSocket connection
    const ws = new ReconnectingWebSocket(wsUrl, {
      onopen: () => {
        setConnectionStatus("connected");
      },
      onmessage: (event) => {
        let blob: any;
        try {
          blob = JSON.parse(event.data);
        } catch (e: any) {
          console.error("Error parsing WebSocket message:", e);
          return;
        }
        const incomingWebsocketMessage =
          webSocketServerMessageSchema.safeParse(blob);
        if (!incomingWebsocketMessage.success) {
          onError({
            errorMessage: "Unknown incoming websocket message",
            detail: z.prettifyError(incomingWebsocketMessage.error),
          });
          return;
        }
        const data = incomingWebsocketMessage.data;
        if (data.type === "message") {
          setMessages((old) =>
            [...old, data.payload.message].slice(-MAX_HISTORY_BUFFER_LENGTH),
          );
        } else if (data.type === "catchup") {
          setMessages(data.payload.messages);
        } else if (data.type === "error") {
          onError({
            errorMessage: data.payload.errorMessage,
            detail: data.payload.detail,
          });
        } else if (data.type === "capabilityState") {
          setCapabilityStates((oldStates) => {
            const newStates = {
              ...oldStates,
              [data.payload.capability]: data.payload.payload.state,
            };
            console.log("newStates", newStates);
            return newStates;
          });
          console.log();
        }
      },
      onclose: () => {
        setConnectionStatus("disconnected");
      },
      onerror: () => {
        setConnectionStatus("error");
      },
      keepaliveInterval: 30_000,
    });

    websocketRef.current = ws;

    return () => {
      console.log("Closing websocket because effect re-ran");
      ws.close();
    };
  }, [roomId, chatId, onError, setCapabilityStates]);

  const sendMessage = useCallback((content: WebSocketClientMessage) => {
    websocketRef.current?.json(content);
  }, []);

  // const clearError = useCallback(() => {
  //   setError(null);
  // }, []);

  return { connectionStatus, messages, sendMessage };
};
