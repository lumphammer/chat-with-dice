import { db as d1 } from "#/db";
import { assertRollType } from "#/rollTypes/isRollType";
import { rollTypeRegistry } from "#/rollTypes/rollTypeRegistry";
import { Rooms } from "#/schemas/chatDB-schema";
import * as dbSchema from "#/schemas/roller-schema";
import type { RollerMessage } from "#/validators/rollerMessageType";
import {
  roomConfigValidator,
  type RoomConfig,
} from "#/validators/roomConfigValidator";
import { webSocketClientMessageSchema } from "#/validators/webSocketMessageSchemas";
import { Broadcaster } from "./Broadcaster";
import { MessageRepository } from "./MessageRepository";
import { type MountedCapability } from "./capabilities";
import { counterCapability } from "./counterCapability";
import { defaultRoomConfig } from "./defaultRoomConfig";
import { handleFetch } from "./handleFetch";
import { setupDB } from "./setupDB";
import { sessionAttachmentSchema } from "./types";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const WEBSOCKET_INTERNAL_ERROR = 1101;

// All capabilities mounted by this DO
const CAPABILITIES = [counterCapability];

export class DiceRollerRoom extends DurableObject {
  private readonly db: DrizzleSqliteDODatabase<typeof dbSchema>;
  private messageRepository: MessageRepository;
  private broadcaster: Broadcaster;
  private capabilities: Map<string, MountedCapability> = new Map();
  private config: RoomConfig = defaultRoomConfig;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Set up automatic ping/pong responses
    // This keeps connections alive without waking the DO
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );

    this.db = setupDB(ctx);
    this.messageRepository = new MessageRepository(this.db);
    this.broadcaster = new Broadcaster(ctx);

    this.ctx.blockConcurrencyWhile(async () => {
      const configRows = await d1
        .select({ config: Rooms.config })
        .from(Rooms)
        .where(eq(Rooms.id, ctx.id.toString()))
        .limit(1);
      const rawConfig = configRows[0]?.config;
      const parsedConfig = roomConfigValidator.safeParse(rawConfig);
      if (parsedConfig.success) {
        this.config = parsedConfig.data;
      } else {
        console.error(
          "Room Config failed validation, falling back to defaults",
        );
      }
    });

    // Mount all capabilities before handling any events.
    // blockConcurrencyWhile guarantees no messages are dispatched until this resolves.
    this.ctx.blockConcurrencyWhile(async () => {
      const mounted = await Promise.all(
        CAPABILITIES.map((cap) =>
          cap.mount(
            this.ctx,
            this.db,
            this.config.capabilities[cap.name]?.config,
          ),
        ),
      );
      for (const cap of mounted) {
        this.capabilities.set(cap.name, cap);
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
    return handleFetch(
      request,
      this.ctx,
      this.messageRepository,
      this.broadcaster,
    );
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
      } else if (data.type === "action") {
        const cap = this.capabilities.get(data.payload.capability);
        if (!cap) {
          throw new Error(`Unknown capability: ${data.payload.capability}`);
        }
        await cap.onMessage(data.payload.payload);
      }
    } catch (error) {
      this.broadcaster.sendError(ws, error);
      console.error("Error handling message:", error);
    }
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
    await this.messageRepository.insert(rollerMessage);
    console.log("inserting into Messages", rollerMessage);
    this.broadcaster.broadcastChatMessage(rollerMessage);
  }
}
