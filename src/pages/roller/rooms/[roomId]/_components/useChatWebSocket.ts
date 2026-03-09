import { ReconnectingWebSocket } from "#/lib/ReconnectingWebSocket";
import {
  type RollerMessage,
  webSocketServerMessageSchema,
} from "#/workers/types";
import type { ConnectionStatus } from "./types";
import { useCallback, useEffect, useRef, useState } from "react";

type UseChatWebSocketArgs = {
  roomId: string;
  chatId: string;
};

const MAX_HISTORY_BUFFER_LENGTH = 100;

export const useChatWebSocket = ({ roomId, chatId }: UseChatWebSocketArgs) => {
  const [messages, setMessages] = useState<RollerMessage[]>([]);

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
          console.error(
            "unknown incoming websocket message",
            incomingWebsocketMessage.error,
          );
          return;
        }
        const data = incomingWebsocketMessage.data;
        if (data.type === "message") {
          setMessages((old) =>
            [...old, data.payload.message].slice(-MAX_HISTORY_BUFFER_LENGTH),
          );
        } else if (data.type === "catchup") {
          setMessages(data.payload.messages);
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
  }, [roomId, chatId]);

  const sendJSON = useCallback((content: any) => {
    websocketRef.current?.json(content);
  }, []);

  return { connectionStatus, messages, sendJSON };
};
