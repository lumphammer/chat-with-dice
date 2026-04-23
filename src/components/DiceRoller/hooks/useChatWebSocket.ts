import { WS_KEEPALIVE_INTERVAL_MS } from "#/constants";
import { authClient } from "#/utils/auth-client";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import {
  webSocketServerMessageSchema,
  type ChatMessage,
  type OnlineUser,
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
import ReconnectingWebSocket from "reconnecting-websocket";
import z from "zod";

const MAX_HISTORY_BUFFER_LENGTH = 100;

export const useChatWebSocket = ({
  roomId,
  onError,
  setCapabilityInfos,
  setRoomConfig,
  setRoomName,
}: {
  roomId: string;
  onError: (error: { errorMessage: string; detail: string }) => void;
  setCapabilityInfos: Dispatch<SetStateAction<CapabilityInfoContextValue>>;
  setRoomConfig: (config: RoomConfig) => void;
  setRoomName: (roomName: string) => void;
}) => {
  const { data: sessionData } = authClient.useSession();

  // the websocket depend on the existence of a session, but not the specifics
  // of it, so we trigger the effect based on a boolean and get the details from
  // a ref. This avoids situations where
  const [hasSession, setHasSession] = useState(false);
  const sessionDataRef = useRef(sessionData);
  useEffect(() => {
    if (sessionData !== null) {
      setHasSession(true);
      sessionDataRef.current = sessionData;
    } else {
      setHasSession(false);
      sessionDataRef.current = null;
    }
  }, [sessionData]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [usersOnline, setUsersOnline] = useState<OnlineUser[]>([]);
  const websocketRef = useRef<ReconnectingWebSocket>(null);

  useEffect(() => {
    if (!hasSession || sessionDataRef.current === null) {
      return;
    }

    const url = new URL("../ws/", document.location.href);
    url.searchParams.set("roomId", roomId);

    // Create WebSocket connection
    const ws = new ReconnectingWebSocket(url.toString());

    ws.addEventListener("open", () => {
      setConnectionStatus("connected");
    });

    ws.addEventListener("message", (event) => {
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
      } else if (data.type === "usersOnline") {
        setUsersOnline(data.payload.usersOnline);
      }
    });
    ws.addEventListener("close", () => {
      setConnectionStatus("disconnected");
    });
    ws.addEventListener("error", () => {
      setConnectionStatus("error");
    });
    //   keepaliveInterval: WS_KEEPALIVE_INTERVAL_MS,
    // });

    websocketRef.current = ws;

    // A polite hint for the server when the browser is reasonably cooperative.
    // Not relied on for correctness — the DO runs a liveness sweep and will
    // evict this connection itself if the ping stream dies. `pagehide` is the
    // most reliable of the bfcache/unload events (particularly on mobile); we
    // skip `beforeunload` because its delivery is patchier and the sweep
    // already covers the cases it would catch.
    // const handlePageHide = () => {
    //   ws.close();
    // };
    // window.addEventListener("pagehide", handlePageHide);

    return () => {
      // window.removeEventListener("pagehide", handlePageHide);
      ws.close();
    };
  }, [
    roomId,
    onError,
    setCapabilityInfos,
    setRoomConfig,
    setRoomName,
    hasSession,
  ]);

  // keepalive timer
  useEffect(() => {
    const timer = setInterval(() => {
      websocketRef.current?.send("ping");
    }, WS_KEEPALIVE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const sendMessage = useCallback((content: WebSocketClientMessage) => {
    websocketRef.current?.send(JSON.stringify(content));
  }, []);

  return { connectionStatus, messages, sendMessage, usersOnline };
};
