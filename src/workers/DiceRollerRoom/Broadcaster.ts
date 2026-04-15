import type { RoomConfig } from "#/validators/roomConfigValidator";
import type {
  ChatMessage,
  WebSocketServerMessage,
} from "#/validators/webSocketMessageSchemas";

export class Broadcaster {
  constructor(private ctx: DurableObjectState) {}

  send(ws: WebSocket, message: WebSocketServerMessage): void {
    ws.send(JSON.stringify(message));
  }

  broadcast(message: WebSocketServerMessage): void {
    for (const server of this.ctx.getWebSockets()) {
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

  brodcastConfig(config: RoomConfig): void {
    this.broadcast({
      type: "roomConfig",
      payload: {
        config,
      },
    });
  }
}
