# DiceRollerRoom Refactoring Guide

`DiceRollerRoom` is currently 250 lines of code and mixes several distinct concerns. As you add features, this will balloon quickly. Here's a strategy for breaking it up using OOP patterns.

## The Problem

Right now, `DiceRollerRoom` would need to change if you modified:
- Your database library (SQLite → D1)
- Your WebSocket protocol
- Your dice rolling logic
- Your message format

These are all independent concerns that should be decoupled.

## Strategy: Dependency Extraction

Extract distinct responsibilities into separate classes that `DiceRollerRoom` orchestrates.

### 1. Repository Pattern (Data Access)

**Extract:** All database query logic into a dedicated repository class.

```ts
// src/workers/MessageRepository.ts
export class MessageRepository {
  constructor(private db: DrizzleSqliteDODatabase<typeof dbSchema>) {}

  async insert(message: RollerMessage): Promise<void> {
    await this.db.insert(dbSchema.Messages).values(message);
  }

  async getRecent(limit: number): Promise<RollerMessage[]> {
    return (await this.db
      .select()
      .from(dbSchema.Messages)
      .orderBy(desc(dbSchema.Messages.created_time))
      .limit(limit)
      .execute()
    ).toReversed();
  }
}
```

**Benefits:**
- Isolates DB implementation details
- Easy to swap SQLite for D1 or add caching without touching the DO
- Testable in isolation

**Currently in DiceRollerRoom:**
- The insert in `runFormula`
- The query in `sendCatchUp`

---

### 2. Broadcaster Service (WebSocket Communication)

**Extract:** All WebSocket sending logic into a broadcaster class.

```ts
// src/workers/RoomBroadcaster.ts
export class RoomBroadcaster {
  constructor(private ctx: DurableObjectState) {}

  send(ws: WebSocket, message: WebSocketServerMessage): void {
    ws.send(JSON.stringify(message));
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

  broadcastChatMessage(message: RollerMessage): void {
    for (const server of this.ctx.getWebSockets()) {
      this.sendChatMessage(server, message);
    }
  }

  private sendChatMessage(server: WebSocket, message: RollerMessage): void {
    this.send(server, {
      type: "message",
      payload: { message },
    });
  }

  async sendCatchUp(ws: WebSocket, messages: RollerMessage[]): Promise<void> {
    this.send(ws, {
      type: "catchup",
      payload: { messages },
    });
  }
}
```

**Benefits:**
- Owns all knowledge about WebSocket protocol and message formatting
- Changes to message schema only affect this class
- `DiceRollerRoom` doesn't need to know about WebSocket details

**Currently in DiceRollerRoom:**
- `send()`
- `sendError()`
- `sendChatMessage()`
- `broadcastChatMessage()`
- `sendCatchUp()`

---

### 3. Pure Functions (Message Handling)

**Extract:** Validation and transformation logic as module-level functions (no class needed).

```ts
// src/workers/parseClientMessage.ts
import { webSocketClientMessageSchema } from "#/validators/webSocketMessageSchemas";
import { sessionAttachmentSchema } from "./types";

export function parseIncomingMessage(raw: ArrayBuffer | string) {
  const parsed = webSocketClientMessageSchema.safeParse(
    typeof raw === "string" ? JSON.parse(raw) : JSON.parse(new TextDecoder().decode(raw))
  );
  if (!parsed.success) {
    throw new Error("Server received an unrecognized message", {
      cause: parsed.error,
    });
  }
  return parsed.data;
}

export function parseSessionAttachment(attachment: unknown) {
  const { data, error } = sessionAttachmentSchema.safeParse(attachment);
  if (error) {
    throw new Error("Invalid session attachment", { cause: error });
  }
  return data;
}
```

```ts
// src/workers/buildRollerMessage.ts
export function buildRollerMessage({
  chat,
  chatId,
  displayName,
  formula,
  rollType,
  result,
}: {
  chat: string | null;
  chatId: string;
  displayName: string;
  formula: string;
  rollType: string;
  result: unknown;
}): RollerMessage {
  return {
    created_time: Date.now(),
    formula,
    id: crypto.randomUUID(),
    rollType,
    results: result,
    chat,
    chatId,
    displayName,
  };
}
```

**Benefits:**
- Pure functions are easier to test
- No hidden dependencies or side effects
- Reusable anywhere

---

### 4. Refactored DiceRollerRoom

After extraction, the DO becomes a thin orchestrator:

```ts
// src/workers/DiceRollerRoom.ts
export class DiceRollerRoom extends DurableObject {
  private readonly repo: MessageRepository;
  private readonly broadcaster: RoomBroadcaster;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    // Setup
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair("ping", "pong"),
    );

    const db = drizzle(ctx.storage, { schema: dbSchema });
    this.repo = new MessageRepository(db);
    this.broadcaster = new RoomBroadcaster(ctx);

    // Migration in a helper
    void this.setupDatabase(db);
  }

  private async setupDatabase(db: DrizzleSqliteDODatabase<typeof dbSchema>) {
    void this.ctx.blockConcurrencyWhile(async () => {
      try {
        log("attempting migration");
        await migrate(db, migrations);
      } catch (e: unknown) {
        logError("FAILED MIGRATION", e);
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const chatId = URL.parse(request.url)?.searchParams.get("chatId");
    if (!chatId) {
      return new Response("chatId is required", { status: 400 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ chatId });

    const messages = await this.repo.getRecent(MESSAGE_CATCHUP_LENGTH);
    await this.broadcaster.sendCatchUp(server, messages);

    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(
    ws: WebSocket,
    message: ArrayBuffer | string,
  ): Promise<void> {
    try {
      const data = parseIncomingMessage(message);
      const attachment = parseSessionAttachment(ws.deserializeAttachment());

      if (data.type === "chat") {
        await this.runFormula({ ...data.payload, chatId: attachment.chatId });
      }
    } catch (error) {
      this.broadcaster.sendError(ws, error);
      console.error("Error handling message:", error);
    }
  }

  private async runFormula({
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

    const message = buildRollerMessage({
      chat,
      chatId,
      displayName,
      formula,
      rollType,
      result,
    });

    await this.repo.insert(message);
    this.broadcaster.broadcastChatMessage(message);
  }

  override async webSocketClose(ws: WebSocket, code: number): Promise<void> {
    ws.close(code, "Durable Object is closing WebSocket");
  }

  override async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    await this.webSocketClose(ws, WEBSOCKET_INTERNAL_ERROR);
  }
}
```

---

## Migration Path

You don't need to do this all at once. Start with:

1. **Phase 1:** Extract `MessageRepository` (most painful coupling right now)
2. **Phase 2:** Extract pure functions (`parseIncomingMessage`, `buildRollerMessage`)
3. **Phase 3:** Extract `RoomBroadcaster` (the most straightforward)

After each phase, the DO gets simpler and easier to reason about.

---

## File Structure

```
src/workers/
├── DiceRollerRoom.ts          (thin orchestrator, ~60-80 LOC)
├── MessageRepository.ts        (DB access, ~15-20 LOC)
├── RoomBroadcaster.ts          (WebSocket comms, ~40-50 LOC)
├── parseClientMessage.ts       (pure validation)
├── buildRollerMessage.ts       (pure transformation)
└── types.ts                    (existing)
```

---

## Key Principles

1. **Single Responsibility:** Each class has one reason to change
2. **Dependency Injection:** Pass dependencies to constructors, don't create them inside
3. **Pure Functions:** Use plain functions for logic with no side effects
4. **Testability:** Extracted classes can be tested independently with mock data

Your future self will thank you when you need to add features like message filtering, persistence layers, or protocol changes — they'll be isolated to one or two files instead of scattered throughout.