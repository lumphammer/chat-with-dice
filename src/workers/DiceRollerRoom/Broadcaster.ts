import type { ServerMountedCapability } from "#/capabilities/types";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import type {
  ChatMessage,
  OnlineUser,
  WebSocketServerMessage,
} from "#/validators/webSocketMessageSchemas";
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

  sendCapabilityInit(ws: WebSocket, capability: ServerMountedCapability): void {
    this.send(ws, {
      type: "capabilityInit",
      payload: capability.getInitPayload(),
    });
  }

  broadcastCapabilityInit(capability: ServerMountedCapability): void {
    this.broadcast({
      type: "capabilityInit",
      payload: capability.getInitPayload(),
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

  private getUsersOnline(): OnlineUser[] {
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
            loggedIn: attachment.userId !== undefined,
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

  broadcastUsersOnline(): void {
    const usersOnline = this.getUsersOnline();
    this.broadcast({
      type: "usersOnline",
      payload: {
        usersOnline,
      },
    });
  }

  currentConnectionCount(): number {
    return this.ctx.getWebSockets().filter((ws) => isConnectingOrOpen(ws))
      .length;
  }
}
