import { ReconnectingWebSocket } from "#/utils/ReconnectingWebSocket";
import type { RollerMessage } from "#/validators/rollerMessageType";
import {
  webSocketServerMessageSchema,
  type WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { CapabilityInfoContextValue } from "./capabilityStateContext";
import type { ConnectionStatus } from "./types";
import { produce } from "immer";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import z from "zod";

type UseChatWebSocketArgs = {
  roomId: string;
  chatId: string;
  onError: (error: { errorMessage: string; detail: string }) => void;
  // capabilityStates: Record<string, unknown>;
  // setCapabilityState: (name: string, state: unknown, config?: unknown) => void;
  setCapabilityInfos: Dispatch<SetStateAction<CapabilityInfoContextValue>>;
};

const MAX_HISTORY_BUFFER_LENGTH = 100;

export const useChatWebSocket = ({
  roomId,
  chatId,
  onError,
  setCapabilityInfos,
}: UseChatWebSocketArgs) => {
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
          setCapabilityInfos((oldInfos) => {
            return produce(oldInfos, (draft) => {
              if (draft[data.payload.capability]) {
                draft[data.payload.capability].state = data.payload.state;
              }
            });
          });
        } else if (data.type === "capabilityInit") {
          setCapabilityInfos((oldInfos) => {
            return produce(oldInfos, (draft) => {
              draft[data.payload.capability] = {
                initialised: true,
                state: data.payload.state,
                config: data.payload.config,
              };
            });
          });
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
  }, [roomId, chatId, onError, setCapabilityInfos]);

  const sendMessage = useCallback((content: WebSocketClientMessage) => {
    websocketRef.current?.json(content);
  }, []);

  // const clearError = useCallback(() => {
  //   setError(null);
  // }, []);

  return { connectionStatus, messages, sendMessage };
};
