import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { db as d1 } from "#/db";
import { assertRollType } from "#/rollTypes/isRollType";
import { rollTypeRegistry } from "#/rollTypes/rollTypeRegistry";
import { Rooms } from "#/schemas/chatDB-schema";
import * as dbSchema from "#/schemas/roller-schema";
import {
  roomConfigValidator,
  type RoomConfig,
} from "#/validators/roomConfigValidator";
import {
  webSocketClientMessageSchema,
  type JsonData,
  type ChatMessage,
} from "#/validators/webSocketMessageSchemas";
import { type ServerMountedCapability } from "../../capabilities/types";
import { Broadcaster } from "./Broadcaster";
import { CapabilityStateRepository } from "./CapabilityStateRepository";
import { MessageJiggler } from "./MessageJiggler";
import { MessageRepository } from "./MessageRepository";
import { defaultRoomConfig } from "./defaultRoomConfig";
import { handleFetch } from "./handleFetch";
import { setupDB } from "./setupDB";
import { sessionAttachmentSchema } from "./types";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const WEBSOCKET_INTERNAL_ERROR = 1101;

export class DiceRollerRoom extends DurableObject {
  private readonly db: DrizzleSqliteDODatabase<typeof dbSchema>;
  private messageRepository: MessageRepository;
  private broadcaster: Broadcaster;
  private capabilities: Map<string, ServerMountedCapability> = new Map();
  private config: RoomConfig = defaultRoomConfig;
  private stateRepository: CapabilityStateRepository;
  private messageJiggler: MessageJiggler;
  private createdByUserId: string = "";

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
    this.stateRepository = new CapabilityStateRepository(ctx.storage.kv);
    this.messageJiggler = new MessageJiggler(
      this.messageRepository,
      this.broadcaster,
    );

    console.log("Durable object id booting:", ctx.id.toString());

    // load config from d1
    void this.ctx.blockConcurrencyWhile(async () => {
      const roomRows = await d1
        .select({
          config: Rooms.config,
          createByUserId: Rooms.created_by_user_id,
        })
        .from(Rooms)
        .where(eq(Rooms.durableObjectId, ctx.id.toString()))
        .limit(1);
      console.log("database loaded", roomRows);
      const roomRow = roomRows[0];
      if (!roomRow) {
        throw new Error("Room not found");
      }
      const parsedConfig = roomConfigValidator.safeParse(roomRow.config);
      if (parsedConfig.success) {
        this.config = parsedConfig.data;
      } else {
        console.error(
          "Room Config failed validation, falling back to defaults",
          parsedConfig.error,
        );
      }
      this.createdByUserId = roomRow.createByUserId;
    });

    // Mount all capabilities before handling any events.
    // blockConcurrencyWhile guarantees no messages are dispatched until this resolves.
    void this.ctx.blockConcurrencyWhile(async () => {
      await Promise.all(
        this.config.capabilities.map(async ({ name, config }) => {
          console.log("mounting capability", name);
          if (!isCapabilityName(name)) {
            return;
          }
          const capabilityInfo = capabilityRegistry[name];
          const mountedCap = await capabilityInfo.capability.mount({
            doCtx: this.ctx,
            messageJiggler: this.messageJiggler,
            stateRepository: this.stateRepository,
            config,
            broadcaster: this.broadcaster,
          });
          if (mountedCap) {
            this.capabilities.set(name, mountedCap);
            console.log(name, "mounted!");
          } else {
            console.log(name, "failed to mount");
          }
        }),
      );
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
      this.capabilities,
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

      const checkOwner = (description: string, cb: () => void) => {
        if (this.createdByUserId !== attachment.userId) {
          this.broadcaster.sendError(
            ws,
            `You are not the room owner and cannot ${description}`,
          );
          console.error(`Unauthorised attempt to ${description}:`, {
            userId: attachment.userId,
            data,
          });
        } else {
          cb();
        }
      };

      const data = parsed.data;
      if (data.type === "chat") {
        // handle chat
        await this.runFormula({
          ...data.payload,
          chatId: attachment.chatId,
        });
      } else if (data.type === "action") {
        // handle actions
        const cap = this.capabilities.get(data.payload.capabilityName);
        if (!cap) {
          throw new Error(`Unknown capability: ${data.payload.capabilityName}`);
        }
        await cap.onMessage({
          actionCall: data.payload.actionCall,
          chatId: attachment.chatId,
          displayName: data.payload.displayName,
        });
      } else if (data.type === "updateConfig") {
        checkOwner("update room config", () => {
          const config = data.payload.config;
          d1.update(Rooms)
            .set({ config })
            .where(eq(Rooms.durableObjectId, this.ctx.id.toString()));
          this.broadcaster.brodcastConfig(config);
        });
      } else if (data.type === "updateRoomName") {
        checkOwner("update room config", () => {
          const roomName = data.payload.roomName;
          d1.update(Rooms)
            .set({ name: roomName })
            .where(eq(Rooms.durableObjectId, this.ctx.id.toString()));
          this.broadcaster.brodcastRoomName(roomName);
        });
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
    formula: JsonData;
    rollType: string;
  }): Promise<void> {
    assertRollType(rollType);

    const rollTypeDef = rollTypeRegistry[rollType];
    const results = await rollTypeDef.handler({
      messageJiggler: this.messageJiggler,
      formula,
      chatId,
      displayName,
    });

    const rollerMessage: ChatMessage = {
      created_time: Date.now(),
      formula: formula,
      id: crypto.randomUUID(),
      // result: roll?.output ?? null,
      rollType,
      results,
      chat,
      chatId,
      displayName,
    };
    await this.messageRepository.insert(rollerMessage);
    console.log("inserting into Messages", rollerMessage);
    this.broadcaster.broadcastChatMessage(rollerMessage);
  }
}
