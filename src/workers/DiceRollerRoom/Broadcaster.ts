import type { ServerMountedCapability } from "#/capabilities/types";
import type { RoomConfig } from "#/validators/roomConfigValidator";
import type {
  ChatMessage,
  OnlineUser,
  WebSocketServerMessage,
} from "#/validators/webSocketMessageSchemas";
import { sessionAttachmentSchema } from "./types";
import { describeState, isClosingorClosed } from "./utils";

export class Broadcaster {
  constructor(private ctx: DurableObjectState) {}

  send(ws: WebSocket, message: WebSocketServerMessage): void {
    if (isClosingorClosed(ws)) {
      console.error(
        new Error(
          `Broadcaster # send: Attempted to send to a socket in ${describeState(ws)} state`,
        ),
      );
      return;
    }
    ws.send(JSON.stringify(message));
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
    const users = this.ctx
      .getWebSockets()
      .map((ws) => {
        const { data: attachment, success } = sessionAttachmentSchema.safeParse(
          ws.deserializeAttachment(),
        );
        if (success && ws.readyState === WebSocket.OPEN) {
          const onlineUser: OnlineUser = {
            chatId: attachment.chatId,
            displayName: attachment.displayName,
            loggedIn: attachment.userId !== undefined,
            image: attachment.image,
          };
          return onlineUser;
        }
      })
      .filter((u): u is OnlineUser => u !== undefined)
      .reduce<OnlineUser[]>((acc, user) => {
        const existingIndex = acc.findIndex((u) => u.chatId === user.chatId);
        if (existingIndex > -1) {
          acc[existingIndex] = user;
        } else {
          acc.push(user);
        }
        return acc;
      }, []);
    console.log(JSON.stringify(users, null, 2));
    return users;
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
}
