import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import type {
  ChatMessage,
  WebSocketServerMessage,
} from "#/validators/webSocketMessageSchemas";
import type { OnlineUser } from "./types";
import { sessionAttachmentSchema } from "./types";
import { isConnectingOrOpen, log } from "./utils";

export class Broadcaster {
  constructor(private ctx: DurableObjectState) {}

  private send(ws: WebSocket, message: WebSocketServerMessage): void {
    if (isConnectingOrOpen(ws)) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcast(message: WebSocketServerMessage): void {
    for (const server of this.ctx
      .getWebSockets()
      .filter((ws) => ws.readyState === WebSocket.OPEN)) {
      this.send(server, message);
    }
  }

  /**
   * Run `callback` for every open socket alongside the user it belongs to.
   * Sockets whose attachment fails to parse are skipped rather than sent a
   * shared payload: the callers below build a payload *for a named viewer*, and
   * "we don't know who this is" must never degrade into "send them everyone's
   * view".
   */
  private forEachViewer(
    callback: (ws: WebSocket, viewerUserId: string) => void,
  ): void {
    for (const ws of this.ctx.getWebSockets()) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }
      const { data: attachment, success } = sessionAttachmentSchema.safeParse(
        ws.deserializeAttachment(),
      );
      if (!success) {
        continue;
      }
      callback(ws, attachment.userId);
    }
  }

  getWebsocketForUserId(userId: string): WebSocket | undefined {
    return this.ctx.getWebSockets().find((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        const attachment = sessionAttachmentSchema.parse(
          ws.deserializeAttachment(),
        );
        if (attachment.userId === userId) {
          return true;
        }
      }
      return false;
    });
  }

  sendErrorToUserId(userId: string, error: unknown): void {
    const ws = this.getWebsocketForUserId(userId);
    if (ws) {
      this.sendError(ws, error);
    }
  }

  sendError(ws: WebSocket, error: unknown): void {
    this.send(ws, {
      type: "error",
      payload: {
        errorMessage: error instanceof Error ? error.message : String(error),
        detail:
          error instanceof Error && error.cause
            ? error.cause instanceof Error
              ? error.cause.message
              : JSON.stringify(error.cause)
            : "",
      },
    });
  }

  broadcastChatMessage(message: ChatMessage): void {
    this.broadcast({
      type: "message",
      payload: { message },
    });
  }

  // private sendChatMessage(server: WebSocket, message: RollerMessage): void {
  //   this.send(server, {
  //     type: "message",
  //     payload: { message },
  //   });
  // }

  sendCatchUp(ws: WebSocket, messages: ChatMessage[]): void {
    this.send(ws, {
      type: "catchup",
      payload: { messages },
    });
  }

  sendCapabilityInit(
    ws: WebSocket,
    capability: ServerMountedCapability,
    viewerUserId: string,
  ): void {
    this.send(ws, {
      type: "capabilityInit",
      payload: capability.getInitPayload(viewerUserId),
    });
  }

  broadcastCapabilityInit(capability: ServerMountedCapability): void {
    this.forEachViewer((ws, viewerUserId) => {
      this.send(ws, {
        type: "capabilityInit",
        payload: capability.getInitPayload(viewerUserId),
      });
    });
  }

  /**
   * Send one capability-state update that every client may see in full.
   */
  broadcastCapabilityState({
    capability,
    correlation,
    state,
  }: {
    capability: string;
    correlation: string | undefined;
    state: unknown;
  }): void {
    this.broadcast({
      type: "capabilityState",
      payload: { capability, correlation, state },
    });
  }

  /**
   * As {@link broadcastCapabilityState}, but each client is sent its own
   * payload, built by `project` from that socket's user id. Used by
   * capabilities holding state one Room Participant may see and another may
   * not — the redaction happens here, on the way out, rather than being trusted
   * to the client.
   */
  broadcastCapabilityStatePerViewer({
    capability,
    correlation,
    project,
  }: {
    capability: string;
    correlation: string | undefined;
    project: (viewerUserId: string) => unknown;
  }): void {
    this.forEachViewer((ws, viewerUserId) => {
      this.send(ws, {
        type: "capabilityState",
        payload: { capability, correlation, state: project(viewerUserId) },
      });
    });
  }

  brodcastConfig(config: RoomConfig): void {
    this.broadcast({
      type: "roomConfig",
      payload: {
        config,
      },
    });
  }

  brodcastRoomName(roomName: string): void {
    this.broadcast({
      type: "roomName",
      payload: {
        roomName,
      },
    });
  }

  getUsersOnline(): OnlineUser[] {
    const sockets = this.ctx.getWebSockets();
    const onlineSockets = sockets.filter((ws) => isConnectingOrOpen(ws));

    const userObjects = onlineSockets
      .map((ws) => {
        const { data: attachment, success } = sessionAttachmentSchema.safeParse(
          ws.deserializeAttachment(),
        );
        if (success) {
          const onlineUser: OnlineUser = {
            userId: attachment.userId,
            displayName: attachment.displayName,
            isAnonymous: attachment.isAnonymous,
            image: attachment.image,
          };
          return onlineUser;
        }
      })
      .filter((u): u is OnlineUser => u !== undefined);
    // reduce list to deduplicate by userId
    const deduped = userObjects.reduce<OnlineUser[]>((acc, user) => {
      const existingIndex = acc.findIndex((u) => u.userId === user.userId);
      if (existingIndex > -1) {
        acc[existingIndex] = user;
      } else {
        acc.push(user);
      }
      return acc;
    }, []);
    log(
      `Online users: ${sockets.length} sockets /  ${onlineSockets.length} online / ${deduped.length} users after deduplication.`,
    );
    return deduped;
  }

  currentConnectionCount(): number {
    return this.ctx.getWebSockets().filter((ws) => isConnectingOrOpen(ws))
      .length;
  }
}
