import { ReconnectingWebSocket } from "#/utils/ReconnectingWebSocket";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import {
  webSocketServerMessageSchema,
  type ChatMessage,
  type WebSocketClientMessage,
} from "#/validators/webSocketMessageSchemas";
import type { CapabilityInfoContextValue } from "../../../capabilities/reactContexts/capabilityInfoContext";
import type { ConnectionStatus } from "../types";
import { applyPatches, produce } from "immer";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import z from "zod";

const MAX_HISTORY_BUFFER_LENGTH = 100;

export const useChatWebSocket = ({
  roomId,
  chatId,
  displayName,
  onError,
  setCapabilityInfos,
  setRoomConfig,
  setRoomName,
}: {
  roomId: string;
  chatId: string;
  displayName: string;
  onError: (error: { errorMessage: string; detail: string }) => void;
  setCapabilityInfos: Dispatch<SetStateAction<CapabilityInfoContextValue>>;
  setRoomConfig: (config: RoomConfig) => void;
  setRoomName: (roomName: string) => void;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const websocketRef = useRef<ReconnectingWebSocket>(null);

  useEffect(() => {
    if (!chatId) {
      return;
    }
    // Build WebSocket URL
    // const wsUrl = `../ws/?roomId=${encodeURIComponent(roomId)}&chatId=${encodeURIComponent(chatId)}&displayName=${encodeURIComponent(displayName)}`;

    const url = new URL("../ws/", document.location.href);
    url.searchParams.set("roomId", roomId);
    url.searchParams.set("chatId", chatId);
    url.searchParams.set("displayName", displayName);

    // Create WebSocket connection
    const ws = new ReconnectingWebSocket(url.toString(), {
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
          setMessages((old) => {
            const oldIndex = old.findIndex(
              (message) => message.id === data.payload.message.id,
            );
            if (oldIndex !== -1) {
              return [
                ...old.slice(0, oldIndex),
                data.payload.message,
                ...old.slice(oldIndex + 1),
              ].slice(-MAX_HISTORY_BUFFER_LENGTH);
            }
            return [...old, data.payload.message].slice(
              -MAX_HISTORY_BUFFER_LENGTH,
            );
          });
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
              const info = draft[data.payload.capability];
              // drop out if we're somehow getting state for an uninitialised
              // capability
              if (!(info && info.initialised)) {
                return;
              }

              // remove patches that pertain to this update
              // we may eventually need to make this so that it trims any and
              // all patches prior to this correlation
              info.patches = info.patches.filter(
                ([correlation]) => correlation !== data.payload.correlation,
              );
              // replay remaining patches onto the arrived state
              const newState = applyPatches(
                data.payload.state,
                info.patches.flatMap(([_, patches]) => patches),
              );
              info.state = newState;
            });
          });
        } else if (data.type === "capabilityInit") {
          setCapabilityInfos((oldInfos) => {
            return produce(oldInfos, (draft) => {
              draft[data.payload.capability] = {
                initialised: true,
                patches: [],
                state: data.payload.state,
                config: data.payload.config,
              };
            });
          });
        } else if (data.type === "roomConfig") {
          setRoomConfig(data.payload.config);
        } else if (data.type === "roomName") {
          setRoomName(data.payload.roomName);
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
  }, [
    roomId,
    chatId,
    onError,
    setCapabilityInfos,
    setRoomConfig,
    setRoomName,
    displayName,
  ]);

  const sendMessage = useCallback((content: WebSocketClientMessage) => {
    websocketRef.current?.json(content);
  }, []);

  return { connectionStatus, messages, sendMessage };
};
