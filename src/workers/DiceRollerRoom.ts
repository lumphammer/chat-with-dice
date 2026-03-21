import migrations from "#/durable-object-migrations/roller/migrations";
import { assertRollType } from "#/rollTypes/isRollType";
import { rollTypeRegistry } from "#/rollTypes/rollTypeRegistry";
import * as dbSchema from "#/schemas/roller-schema";
import type { RollerMessage } from "#/validators/rollerMessageType";
import {
  webSocketClientMessageSchema,
  type WebSocketServerMessage,
} from "#/validators/webSocketMessageSchemas";
import { type SessionAttachment, sessionAttachmentSchema } from "./types";
import { DurableObject } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { DrizzleSqliteDODatabase, drizzle } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";

const MESSAGE_CATCHUP_LENGTH = 100;
const WEBSOCKET_INTERNAL_ERROR = 1101;

const log = console.log.bind(console, "[Roller DO]");
const logError = console.error.bind(console, "[Roller DO]");

export class DiceRollerRoom extends DurableObject {
  private readonly db: DrizzleSqliteDODatabase<typeof dbSchema>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Set up automatic ping/pong responses
    // This keeps connections alive without waking the DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );

    this.db = drizzle(ctx.storage, { schema: dbSchema });

    const tableNames = Object.keys(dbSchema);
    const placeHolders = Array.from({ length: tableNames.length })
      .fill("?")
      .join(", ");
    const query = `SELECT sql FROM sqlite_master WHERE name IN (${placeHolders})`;
    log(query, tableNames);
    const printedSchema = ctx.storage.sql
      .exec(query, ...tableNames)
      .toArray()
      .map((row) =>
        typeof row.sql === "string" ? row.sql : JSON.stringify(row.sql),
      )
      .join("\n");
    log("DB schema:", printedSchema);

    void this.ctx.blockConcurrencyWhile(async () => {
      // migrate the db
      try {
        log("attempting migration");
        await migrate(this.db, migrations);
      } catch (e: unknown) {
        logError("FAILED MIGRATION", e);
      }
    });
  }

  /**
   * Handle HTTP requests to this Durable Object
   * This is called when a client wants to establish a WebSocket connection
   * This MUST be called `fetch`: it's the original API for interacting with
   * Durable Objects and can handle returning a Response object. Calls to any
   * other method go through RPC, which requires that all arguments and return
   * values must be serializable.
   *
   * Official docs:
   * https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/#invoking-the-fetch-handler
   *
   * Blog post says the same thing but slower and louder:
   * https://flaredup.substack.com/i/161450113/synchronous-calls-with-fetch-and-rpc
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }
    const chatId = URL.parse(request.url)?.searchParams.get("chatId");
    if (!chatId) {
      return new Response("chatId is required", { status: 400 });
    }
    // Create a WebSocket pair (client and server)
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    // Accept the WebSocket connection using the Hibernation API
    // Unlike server.accept(), this allows the DO to hibernate while
    // keeping the WebSocket connection open
    this.ctx.acceptWebSocket(server);

    const attachment: SessionAttachment = { chatId };
    server.serializeAttachment(attachment);

    await this.sendCatchUp(server);

    // Return the client WebSocket in the response
    // return new Response("splat", { status: 200 });
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle incoming WebSocket messages (Hibernation API)
   * Called when a message is received, even after hibernation
   */
  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    try {
      const parsed = webSocketClientMessageSchema.safeParse(
        typeof message === "string"
          ? JSON.parse(message)
          : JSON.parse(new TextDecoder().decode(message)),
      );
      if (!parsed.success) {
        console.error("Invalid message format:", parsed.error);
        throw new Error("Server received an unrecognized message", {
          cause: parsed.error,
        });
      }
      const { data: attachment, error } = sessionAttachmentSchema.safeParse(
        ws.deserializeAttachment(),
      );
      if (error) {
        console.error("Error parsing attachment", error);
        console.log("Attachment", ws.deserializeAttachment());
        return;
      }
      const data = parsed.data;
      if (data.type === "chat") {
        await this.runFormula({
          ...data.payload,
          chatId: attachment.chatId,
        });
      }
    } catch (error) {
      this.sendError(ws, error);
      console.error("Error handling message:", error);
    }
  }

  sendError(server: WebSocket, e: unknown): void {
    this.send(server, {
      type: "error",
      payload: {
        errorMessage: e instanceof Error ? e.message : String(e),
        detail:
          e instanceof Error && e.cause
            ? e.cause instanceof Error
              ? e.cause.message
              : JSON.stringify(e.cause)
            : "",
      },
    });
  }

  /**
   * Handle WebSocket close events (Hibernation API)
   * Called when a client disconnects
   */
  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code, "Durable Object is closing WebSocket");
  }

  /**
   * Handle WebSocket errors (Hibernation API)
   */
  override async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    // Treat errors as disconnections
    await this.webSocketClose(ws, WEBSOCKET_INTERNAL_ERROR); //, "WebSocket error", false);
  }

  async runFormula({
    chat,
    chatId,
    displayName,
    formula,
    rollType,
  }: {
    chat: string | null;
    chatId: string;
    displayName: string;
    formula: string;
    rollType: string;
  }): Promise<void> {
    assertRollType(rollType);

    const rollTypeDef = rollTypeRegistry[rollType];
    const result = rollTypeDef.handler(formula);

    const rollerMessage: RollerMessage = {
      created_time: Date.now(),
      formula: formula,
      id: crypto.randomUUID(),
      // result: roll?.output ?? null,
      rollType,
      results: result,
      chat,
      chatId,
      displayName,
    };
    await this.db.insert(dbSchema.Messages).values(rollerMessage);
    console.log("inserting into Messages", rollerMessage);
    this.broadcastChatMessage(rollerMessage);
  }

  broadcastChatMessage(message: RollerMessage): void {
    for (const server of this.ctx.getWebSockets()) {
      this.sendChatMessage(server, message);
    }
  }

  send(server: WebSocket, websocketMessage: WebSocketServerMessage): void {
    server.send(JSON.stringify(websocketMessage));
  }

  sendChatMessage(server: WebSocket, message: RollerMessage): void {
    this.send(server, {
      type: "message",
      payload: {
        message,
      },
    });
  }

  async sendCatchUp(server: WebSocket): Promise<void> {
    const messages = (
      await this.db
        .select()
        .from(dbSchema.Messages)
        .orderBy(desc(dbSchema.Messages.created_time))
        .limit(MESSAGE_CATCHUP_LENGTH)
        .execute()
    ).toReversed();

    this.send(server, {
      type: "catchup",
      payload: {
        messages,
      },
    });
  }
}
