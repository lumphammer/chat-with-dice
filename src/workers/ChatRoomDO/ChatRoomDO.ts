import {
  capabilityRegistry,
  isCapabilityName,
} from "#/capabilities/capabilityRegistry";
import { WS_KEEPALIVE_INTERVAL_MS } from "#/constants";
import { db as d1 } from "#/db";
import migrations from "#/durable-object-migrations/ChatRoomDO/migrations";
import * as dbSchema from "#/schemas/ChatRoomDO-schema";
import { rooms } from "#/schemas/coreD1-schema";
import { type RoomConfig } from "#/validators/roomConfigValidator";
import { webSocketClientMessageSchema } from "#/validators/webSocketMessageSchemas";
import { type ServerMountedCapability } from "../../capabilities/types";
import { setupDB } from "../utils/setupDB";
import { Broadcaster } from "./Broadcaster";
import { CapabilityStateRepository } from "./CapabilityStateRepository";
import { MessageJiggler } from "./MessageJiggler";
import { MessageRepository } from "./MessageRepository";
import { defaultRoomConfig } from "./defaultRoomConfig";
import { handleFetch } from "./handleFetch";
import { loadConfigFromD1OrDie } from "./loadConfigFromD1OrDie";
import { sessionAttachmentSchema } from "./types";
import {
  describeState,
  isClosingorClosed,
  isConnectingOrOpen,
  log,
  logError,
} from "./utils";
import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";

const WEBSOCKET_INTERNAL_ERROR = 1101;
const WEBSOCKET_GOING_AWAY = 1001;

/**
 * How often the DO wakes up to sweep for dead WebSocket connections.
 * Should be roughly the client keepalive interval (see useChatWebSocket).
 */
const SWEEP_INTERVAL_MS = WS_KEEPALIVE_INTERVAL_MS;

const STALE_SWEEP_FACTOR = 3;

/*
 * A connection is considered dead if we haven't seen an auto-ping from it for
 * this long. Set generously enough to tolerate a couple of dropped pings over
 * a flaky network before we evict the user from the online list.
 */
const STALE_THRESHOLD_MS = SWEEP_INTERVAL_MS * STALE_SWEEP_FACTOR;

export class ChatRoomDO extends DurableObject {
  private db!: DrizzleSqliteDODatabase<typeof dbSchema>;
  private messageRepository!: MessageRepository;
  private broadcaster!: Broadcaster;
  private capabilities: Map<string, ServerMountedCapability> = new Map();
  private config: RoomConfig = defaultRoomConfig;
  private stateRepository!: CapabilityStateRepository;
  private messageJiggler!: MessageJiggler;
  private createdByUserId!: string;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    log(
      "\n\n=====================================\nChatRoomDO id booting:",
      ctx.id.toString(),
    );

    // initialisation - do this in a blockConcurrencyWhile so we can check this
    // is a legitimate instantiation before we allow anything else to happen.
    void this.ctx.blockConcurrencyWhile(async () => {
      // load room from d1 or crash out
      const { config, createdByUserId } = await loadConfigFromD1OrDie(ctx);
      this.config = config;
      this.createdByUserId = createdByUserId;

      // it's now safe to init the local db
      this.db = setupDB(ctx, migrations);

      // and assemble all our helpers etc.
      this.broadcaster = new Broadcaster(ctx);
      this.messageRepository = new MessageRepository(this.db);
      this.stateRepository = new CapabilityStateRepository(ctx.storage.kv);
      this.messageJiggler = new MessageJiggler(
        this.messageRepository,
        this.broadcaster,
      );

      // Set up automatic ping/pong responses
      // This keeps connections alive without waking the DO
      this.ctx.setWebSocketAutoResponse(
        new WebSocketRequestResponsePair("ping", "pong"),
      );

      // Mount all capabilities before handling any events.
      // blockConcurrencyWhile guarantees no messages are dispatched until this resolves.
      await Promise.all(
        this.config.capabilities.map(async ({ name, config: capConfig }) => {
          const mountedCap = await this.mountCapability(name, capConfig);
          if (mountedCap) {
            this.capabilities.set(name, mountedCap);
          }
        }),
      );
      this.broadcaster.broadcastUsersOnline();
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
        console.error(
          "Error parsing attachment",
          error,
          ws.deserializeAttachment(),
        );
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
          userId: attachment.userId,
        });
      } else if (data.type === "action") {
        // handle actions
        const cap = this.capabilities.get(data.payload.capabilityName);
        if (!cap) {
          throw new Error(`Unknown capability: ${data.payload.capabilityName}`);
        }
        await cap.onMessage({
          actionCall: data.payload.actionCall,
          userId: attachment.userId,
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
              log(name, "unmounted");
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
          log("Updating room name", roomName, this.ctx.id.toString());
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
    const att = sessionAttachmentSchema.parse(ws.deserializeAttachment());
    let line = `Client disconnected: ${att.displayName} / ${att.userId}.`;
    if (isClosingorClosed(ws)) {
      line += ` Already ${describeState(ws)}.`;
      return;
    }
    try {
      ws.close(code, "Durable Object is closing WebSocket");
      line += " Closed successfully.";
    } catch (error) {
      console.error(
        "ChatRoomDO # webSocketClose: Error closing WebSocket:",
        error,
      );
      line += ` Error while closing: ${error instanceof Error ? error.message : String(error)}`;
    }
    log(line);
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

    const wses = this.ctx.getWebSockets();

    const report: string[] = [];

    for (const ws of wses) {
      const att = sessionAttachmentSchema.parse(ws.deserializeAttachment());
      // last seen time is either the last ping on the ws, or the time it was
      // created
      const lastSeen =
        this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ??
        att.createdTime;
      const timeSinceLastSeen = now - lastSeen;
      // construct a number of !s based on how it's been since we saw the ws
      const bangs = Array.from(
        {
          length: Math.floor(timeSinceLastSeen / SWEEP_INTERVAL_MS),
        },
        () => "!",
      ).join("");
      const sinceString = `${timeSinceLastSeen}ms`;
      let line = `${att.displayName} (${sinceString}${bangs})`;
      if (lastSeen && now - lastSeen > STALE_THRESHOLD_MS) {
        line += " STALE";
        if (isConnectingOrOpen(ws)) {
          line += " OPEN";
          try {
            ws.close(WEBSOCKET_GOING_AWAY, "stale connection");
            line += " Closed succesfully";
          } catch (error) {
            // already closed/closing; the sweep is best-effort
            line += ` Error while closing: ${error instanceof Error ? error.message : String(error)}`;
          }
        }
        evicted += 1;
      }
      report.push(line);
    }

    log(`Alarm: Sweep evicted ${evicted}/${wses.length} connection(s)`);
    log("\nAlarm: Eviction report:\n" + report.join("\n"));
    if (evicted > 0) {
      this.broadcaster.broadcastUsersOnline();
    }

    // Re-arm only while there's something worth watching.
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + SWEEP_INTERVAL_MS);
    } else {
      log(
        "Alarm: completed with no active connections, not rescheduling sweep",
      );
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
    log("Mounting capability: ", name);
    const capabilityInfo = capabilityRegistry[name];
    const mountedCap = await capabilityInfo.capability.mount({
      doCtx: this.ctx,
      messageJiggler: this.messageJiggler,
      stateRepository: this.stateRepository,
      config,
      broadcaster: this.broadcaster,
    });
    if (!mountedCap) {
      logError("Failed to mount", name);
    }
    return mountedCap ?? null;
  }
}
