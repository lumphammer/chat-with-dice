import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { db as d1 } from "#/db";
import { rooms } from "#/schemas/chatDB-schema";
import * as dbSchema from "#/schemas/roller-schema";
import {
  roomConfigValidator,
  type RoomConfig,
} from "#/validators/roomConfigValidator";
import { webSocketClientMessageSchema } from "#/validators/webSocketMessageSchemas";
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
const WEBSOCKET_GOING_AWAY = 1001;

/**
 * How often the DO wakes up to sweep for dead WebSocket connections.
 * Should be roughly the client keepalive interval (see useChatWebSocket).
 */
const SWEEP_INTERVAL_MS = 5_000;

/**
 * A connection is considered dead if we haven't seen an auto-ping from it for
 * this long. Set generously enough to tolerate a couple of dropped pings over
 * a flaky network before we evict the user from the online list.
 */
const STALE_THRESHOLD_MS = 15_000;

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
          config: rooms.config,
          createByUserId: rooms.created_by_user_id,
        })
        .from(rooms)
        .where(eq(rooms.durableObjectId, ctx.id.toString()))
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
          const mountedCap = await this.mountCapability(name, config);
          if (mountedCap) {
            this.capabilities.set(name, mountedCap);
          }
        }),
      );
    });

    this.broadcaster.broadcastUsersOnline();
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

      const checkOwner = async (
        description: string,
        cb: () => void | Promise<void>,
      ) => {
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
          await cb();
        }
      };

      const data = parsed.data;
      if (data.type === "chat") {
        // handle chat
        await this.messageJiggler.chat({
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
        await checkOwner("update room config", async () => {
          const newConfig = data.payload.config;

          await d1
            .update(rooms)
            .set({ config: newConfig })
            .where(eq(rooms.durableObjectId, this.ctx.id.toString()));

          // Unmount capabilities that were removed
          const newCapabilityNames = new Set(
            newConfig.capabilities.map(({ name }) => name),
          );
          for (const { name } of this.config.capabilities) {
            if (!newCapabilityNames.has(name)) {
              this.capabilities.delete(name);
              console.log(name, "unmounted");
            }
          }

          // Mount capabilities that were added, and announce them to all
          // currently connected clients
          const previousCapabilityNames = new Set(
            this.config.capabilities.map(({ name }) => name),
          );
          const addedCapabilities = newConfig.capabilities.filter(
            ({ name }) => !previousCapabilityNames.has(name),
          );
          await Promise.all(
            addedCapabilities.map(async ({ name, config: capConfig }) => {
              const mountedCap = await this.mountCapability(name, capConfig);
              if (mountedCap) {
                this.capabilities.set(name, mountedCap);
                this.broadcaster.broadcastCapabilityInit(mountedCap);
              }
            }),
          );

          this.config = newConfig;
          this.broadcaster.brodcastConfig(newConfig);
        });
      } else if (data.type === "updateRoomName") {
        await checkOwner("update room config", async () => {
          const roomName = data.payload.roomName;
          console.log("Updating room name", roomName, this.ctx.id.toString());
          await d1
            .update(rooms)
            .set({ name: roomName })
            .where(eq(rooms.durableObjectId, this.ctx.id.toString()));
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
   * Called when a client disconnects cleanly. This is a *hint* — it is not
   * reliably delivered (dead TCP, mobile tab kills, DO hibernation all swallow
   * it), so we can't depend on it alone. The real source of truth for presence
   * is the liveness sweep in `alarm()` below.
   */
  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code, "Durable Object is closing WebSocket");
    this.broadcaster.broadcastUsersOnline();
  }

  /**
   * Periodic liveness sweep. Because clients ping via auto-response (which
   * intentionally does not wake the DO), the DO wouldn't otherwise notice a
   * client that just stopped talking. This alarm wakes us up, checks the last
   * auto-ping timestamp for each connected socket, and closes any that have
   * gone quiet for too long. `webSocketClose` then fires for each eviction and
   * we rebroadcast the online list.
   */
  override async alarm(): Promise<void> {
    const now = Date.now();
    let evicted = 0;

    for (const ws of this.ctx.getWebSockets()) {
      const lastPing = this.ctx.getWebSocketAutoResponseTimestamp(ws);
      // null means the client hasn't pinged yet — either brand new or never
      // will. Leave it alone; CF will eventually drop a truly dead TCP.
      if (lastPing && now - lastPing.getTime() > STALE_THRESHOLD_MS) {
        try {
          ws.close(WEBSOCKET_GOING_AWAY, "stale connection");
        } catch {
          // already closed/closing; the sweep is best-effort
        }
        evicted += 1;
      }
    }

    if (evicted > 0) {
      console.log(`Sweep evicted ${evicted} stale connection(s)`);
      this.broadcaster.broadcastUsersOnline();
    }

    // Re-arm only while there's something worth watching.
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS);
    }
  }

  /**
   * Handle WebSocket errors (Hibernation API)
   */
  override async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    // Treat errors as disconnections
    await this.webSocketClose(ws, WEBSOCKET_INTERNAL_ERROR); //, "WebSocket error", false);
  }

  private async mountCapability(
    name: string,
    config: unknown,
  ): Promise<ServerMountedCapability | null> {
    if (!isCapabilityName(name)) {
      return null;
    }
    console.log("mounting capability", name);
    const capabilityInfo = capabilityRegistry[name];
    const mountedCap = await capabilityInfo.capability.mount({
      doCtx: this.ctx,
      messageJiggler: this.messageJiggler,
      stateRepository: this.stateRepository,
      config,
      broadcaster: this.broadcaster,
    });
    if (mountedCap) {
      console.log(name, "mounted!");
    } else {
      console.log(name, "failed to mount");
    }
    return mountedCap ?? null;
  }
}
