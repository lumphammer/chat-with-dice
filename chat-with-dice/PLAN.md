# Architecture Plan: Room Types + Visual Dice UI


## Background

The dice roller is currently a single generic tool where users type dice formula strings (e.g. `3d6+2`). Two major features are planned:

1. **Game-specific rooms** — specialised rooms for systems like "Blades in the Dark" or "Eat the Reich" with custom UI and roll logic
2. **Visual generic dice UI** — overhaul the generic room's input to be button-driven rather than requiring users to learn formula syntax

Both goals require the same structural change: the input form and roll result display need to become swappable per room type, while all the shared chat infrastructure stays put.

---

## Current Architecture

### Data flow
1. Client sends `{ type: "chat", payload: { formula, text, displayName } }` over WebSocket
2. Durable Object runs `new DiceRoll(formula)` via `@dice-roller/rpg-dice-roller`
3. DO stores the result in SQLite and broadcasts to all connected clients
4. Client renders structured roll data (with drop/explode/crit highlighting)

### Key files
- `workers/DiceRollerRoom.ts` — Durable Object: WebSocket lifecycle, storage, dice rolling
- `workers/types.ts` — Zod schemas for the wire protocol
- `schemas/roller-schema.ts` — Messages table schema inside the DO
- `schemas/chatDB-schema.ts` — Rooms table in the main D1 database
- `pages/roller/rooms/[roomId]/_components/DiceRoller.tsx` — main React shell
- `pages/roller/rooms/[roomId]/_components/ChatForm.tsx` — formula + annotation input
- `pages/roller/rooms/[roomId]/_components/ChatBubble.tsx` — message rendering
- `pages/roller/rooms/[roomId]/_components/DiceRollResult.tsx` — structured roll display
- `pages/roller/rooms/[roomId]/_components/useChatWebSocket.ts` — WS connection hook
- `pages/roller/rooms/[roomId]/_components/useSmartScroll.ts` — scroll behaviour hook
- `pages/roller/rooms/[roomId]/_components/useUserIdentityStorage.ts` — identity hook

### What's already clean
- The three hooks are room-type-agnostic and need no changes
- Structured roll data is already stored as JSON, enabling rich rendering
- WebSocket uses the Hibernation API correctly

### What needs to change
- `ChatForm` is hardcoded to formula + annotation text
- `DiceRollResult` is hardcoded to generic dice rendering
- No concept of room type exists anywhere in the stack

---

## Core Concept: Plugin Pattern (Strategy)

The chat shell — header, message list, scrolling, identity — is fully shared. Everything that varies per game system is pluggable.

Each room type provides:
- A React component for the **input form** (bottom of screen)
- A React component for **roll result display** (inside chat bubbles)
- A **server-side roll handler** (in the Durable Object)

This is the Strategy pattern: the same overall flow runs for every room type, but each game system supplies its own implementations of the variable parts.

---

## Phase 1: Add Room Type to the Data Model

**What changes:**

Add a `roomType` column to the `Rooms` table in `schemas/chatDB-schema.ts`, defaulting to `"generic"`.

Update `actions/createChatWithDiceRoom.ts` to accept an optional `roomType` input.

Update the "new room" page (`pages/roller/new/index.astro`) to let users pick a room type — a dropdown or a card-picker are both fine.

Update `pages/roller/rooms/[roomId]/index.astro` to pass `room.roomType` down to the React component.

Update `pages/roller/ws.ts` to forward `roomType` as a query parameter on the WebSocket URL, so the Durable Object knows which type of room it is serving.

**Risk:** Minimal. New column with a default value — no existing behaviour changes.

**Backend changes:** Yes — one D1 migration.

---

## Phase 2: Define the Room Type Plugin Interface

Create a `RoomTypeDefinition` type and a registry of all known room types.

**New files to create:**

`pages/roller/rooms/[roomId]/_components/room-types/types.ts`

Defines:
- `InputFormProps` — props given to every input form component (`onSendMessage` callback)
- `RollResultProps` — props given to every roll result component (`message: RollerMessage`)
- `RoomTypeDefinition` — the full plugin contract: `id`, `displayName`, `description`, `InputForm`, `RollResultDisplay`

`pages/roller/rooms/[roomId]/_components/room-types/registry.ts`

Exports:
- `getRoomType(id: string): RoomTypeDefinition` — looks up by ID, falls back to `"generic"`
- `listRoomTypes(): RoomTypeDefinition[]` — used by the room creation UI

**Risk:** None. Pure type definitions and an empty registry.

**Backend changes:** No.

---

## Phase 3: Extract the Shared Chat Shell

Refactor `DiceRoller.tsx` into a `ChatShell` component that is room-type-agnostic.

**What the shell owns:**
- Header (display name, connection status indicator)
- Scrollable message list with smart scroll / "new messages" button
- `useChatWebSocket`, `useSmartScroll`, `useUserIdentityStorage` (already decoupled — no changes needed)
- `UserIdentityContextProvider`

**What the shell delegates:**
- Input form → `RoomTypeDefinition.InputForm`
- Roll result display → `RoomTypeDefinition.RollResultDisplay` (passed as a prop into `ChatBubble`)

**Rename/move:**
- `DiceRoller.tsx` → `ChatShell.tsx`
- `ChatForm.tsx` → `room-types/generic/GenericInputForm.tsx`
- `DiceRollResult.tsx` → `room-types/generic/GenericRollResult.tsx`

**Update `ChatBubble.tsx`:**

Add a `RollResultDisplay: ComponentType<RollResultProps>` prop. The bubble renders shared chrome (name, timestamp, text) and delegates roll display to whatever component is passed in.

**Update `pages/roller/rooms/[roomId]/index.astro`:**

Render `<ChatShell client:only roomId={roomId} roomType={room.roomType} />` instead of `<DiceRoller>`.

**Risk:** Medium — this is a refactor of core UI logic. Behaviour should be identical since all defaults use the generic room type. Do this on a branch and test before merging.

**Backend changes:** No.

---

## Phase 4: Extend the Wire Protocol

The current client message type is tightly coupled to formula strings. Add a second message type for game-specific actions.

**Update `workers/types.ts`:**

Add a `game-action` variant to `webSocketClientMessageSchema`:

```typescript
z.object({
  type: z.literal("game-action"),
  payload: z.object({
    displayName: z.string().min(1).max(128),
    text: z.string().nullable(),
    action: z.string(),             // e.g. "action-roll", "fortune-roll"
    params: z.record(z.unknown()),  // game-specific, validated by the handler
  }),
})
```

The existing `chat` type stays unchanged — generic rooms keep using it.

**Add `gameData` column to the Messages table in `schemas/roller-schema.ts`:**

A nullable `text()` column holding a JSON blob of game-specific metadata.

Examples of what goes here:
- Blades in the Dark: `{ position: "risky", effect: "great", outcome: "partial", dice: [4, 3, 3] }`
- Eat the Reich: `{ pool: 5, successes: 2 }`
- Generic rolls: `null`

Each game's `RollResultDisplay` component knows how to parse its own `gameData`.

**Risk:** Low. Protocol extension is backwards compatible. New DB column defaults to `null`.

**Backend changes:** Yes — one DO migration to add the `gameData` column.

---

## Phase 5: Add Server-Side Roll Handler Strategy

Refactor `DiceRollerRoom.ts` to delegate roll logic to pluggable handlers, one per room type.

**New files to create:**

`workers/roll-handlers/types.ts`

Defines:
- `RollHandlerResult` — `{ formula, result, rolls, total, gameData }`
- `RollHandler` — `{ handleFormula?(formula): RollHandlerResult, handleGameAction?(action, params): RollHandlerResult }`

`workers/roll-handlers/generic.ts`

Extracts the current `DiceRoll`-based logic from `DiceRollerRoom.ts` into a standalone handler. No behaviour change.

`workers/roll-handlers/index.ts`

Exports `getRollHandler(roomType: string): RollHandler`, falling back to the generic handler for unknown types.

**Update `DiceRollerRoom.ts`:**

- Capture `roomType` from the WebSocket URL query parameters when a client connects, and store it on the DO instance
- Split `runFormula()` into `handleChat()` and `handleGameAction()`, each of which calls `getRollHandler(this.roomType)` to get the appropriate handler
- The WebSocket lifecycle, message storage, and broadcast logic are completely unchanged

**Why a single DO class?** The WebSocket plumbing, Hibernation API setup, catchup on connect, and SQLite storage are identical across all game types. Duplicating them into separate DO classes would be a maintenance burden. The only thing that varies is how a message gets interpreted — that's exactly what the handler strategy provides.

**Risk:** Medium — touches the core of the Durable Object. The generic handler must behave identically to the current code.

**Backend changes:** Yes — changes to the DO worker.

---

## Phase 6: Wire Up the Generic Room Type Plugin

Move the existing components into the plugin system so the registry has something to serve.

**New directory:**
`pages/roller/rooms/[roomId]/_components/room-types/generic/`

**Files:**
- `GenericInputForm.tsx` — current `ChatForm.tsx`, adapted to `InputFormProps`
- `GenericRollResult.tsx` — current `DiceRollResult.tsx`, adapted to `RollResultProps`
- `index.ts` — exports `genericRoomType: RoomTypeDefinition`

The `registry.ts` from Phase 2 gets its first entry: `generic: genericRoomType`.

At this point the app is fully refactored but functionally identical to today. All existing rooms continue to work as generic rooms.

**Risk:** Low. Moving and lightly adapting existing components.

**Backend changes:** No.

---

## Phase 7: Build the Visual Generic Dice Input Form

Now that the plugin architecture is in place, replace the formula text input with a button-driven dice builder.

**UI design:**

- **Die buttons**: d4, d6, d8, d10, d12, d20, d100 — tap to add one die of that type
- **Quantity controls**: + / − on each selected die group (e.g. "3d6 ×−")
- **Modifier**: a simple +/− number field
- **Formula preview**: shows the assembled formula string (e.g. `2d6 + 1d8 + 3`) in real time — helps users learn the syntax
- **Power-user escape hatch**: a toggle to switch to raw formula text input for advanced notation (exploding dice, keep-highest, etc.)
- **Annotation field**: unchanged from today

**Implementation note:**

The visual builder simply assembles a formula string and sends the same `{ type: "chat", payload: { formula, text, displayName } }` message that the text input does today. Zero backend changes are required. This is purely a frontend improvement.

**Risk:** Low. Purely additive frontend work with no protocol or backend changes.

**Backend changes:** No.

---

## Phase 8: Build Game-Specific Room Types

With the full infrastructure in place, each new game system is self-contained.

**Each game type gets:**

A directory under `room-types/<game-id>/` containing:
- `<Game>InputForm.tsx` — game-appropriate input UI
- `<Game>RollResult.tsx` — game-appropriate roll display
- `index.ts` — exports the `RoomTypeDefinition`

A handler under `workers/roll-handlers/<game-id>.ts` implementing `RollHandler`.

### Example: Blades in the Dark

**Input form** (`BitDInputForm.tsx`):
- Buttons for Action Roll, Fortune Roll, Resistance Roll, Engagement Roll
- Dice count spinner (0–6)
- Position picker (Controlled / Risky / Desperate)
- Effect picker (Great / Standard / Limited)

**Roll result display** (`BitDRollResult.tsx`):
- Shows all dice rolled
- Highlights the highest die
- Displays outcome tier: Critical (two 6s) / Full Success (6) / Partial (4–5) / Failure (1–3)
- Colour-coded by position (controlled = green-ish, desperate = red-ish)
- Parses outcome from `message.gameData`

**Server-side handler** (`workers/roll-handlers/blades.ts`):
- Receives `{ action: "action-roll", params: { dice: 3 } }`
- Rolls the correct number of d6s (2d6 keep lowest for 0-dice rolls)
- Computes the BitD outcome
- Returns `gameData: { position, effect, outcome, dice, diceCount }`

**Risk:** Low per game type once the infrastructure is in place.

**Backend changes:** Yes — new handler file per game type.

---

## Proposed Directory Structure (end state)

```
src/
  pages/roller/
    new/index.astro                         updated: room type picker
    rooms/
      index.astro
      _components/
        RoomList.tsx
        RoomListWrapper.tsx
      [roomId]/
        index.astro                         updated: passes roomType to ChatShell
        _components/
          ChatShell.tsx                     renamed from DiceRoller.tsx
          ChatBubble.tsx                    updated: accepts RollResultDisplay prop
          DisplayNameDialog.tsx             unchanged
          ShowMoreDialog.tsx                unchanged
          TimeDisplay.tsx                   unchanged
          deriveHueFromUserId.ts            unchanged
          types.ts                          unchanged
          useChatWebSocket.ts               unchanged
          useSmartScroll.ts                 unchanged
          useUserIdentityStorage.ts         unchanged
          userIdentityContext.tsx           unchanged
          room-types/
            types.ts                        new: RoomTypeDefinition interface
            registry.ts                     new: getRoomType(), listRoomTypes()
            generic/
              GenericInputForm.tsx          moved+adapted from ChatForm.tsx
              GenericRollResult.tsx         moved+adapted from DiceRollResult.tsx
              VisualDiceBuilder.tsx         new: button-driven dice builder
              index.ts                      new: genericRoomType definition
            blades-in-the-dark/
              BitDInputForm.tsx             new
              BitDRollResult.tsx            new
              index.ts                      new
            eat-the-reich/
              EtRInputForm.tsx              new
              EtRRollResult.tsx             new
              index.ts                      new

  workers/
    DiceRollerRoom.ts                       updated: delegates to roll handlers
    types.ts                                updated: game-action message type, gameData field
    roll-handlers/
      types.ts                              new: RollHandler interface
      index.ts                              new: getRollHandler() registry
      generic.ts                            new: extracted DiceRoll logic
      blades.ts                             new: Blades in the Dark logic
      eat-the-reich.ts                      new: Eat the Reich logic

  schemas/
    chatDB-schema.ts                        updated: roomType column on Rooms
    roller-schema.ts                        updated: gameData column on Messages

  actions/
    createChatWithDiceRoom.ts               updated: accepts roomType
```

---

## Execution Order and Risk Summary

| Phase | What | Risk | Backend? |
|-------|------|------|----------|
| 1 | Add `roomType` to Rooms table + creation flow | Low | ✅ D1 migration |
| 2 | Define `RoomTypeDefinition` interface + registry | None | ❌ |
| 3 | Extract `ChatShell`, update `ChatBubble` | Medium | ❌ |
| 4 | Add `game-action` message type + `gameData` column | Low | ✅ DO migration |
| 5 | Roll handler strategy in DO | Medium | ✅ DO code |
| 6 | Wire up generic room type plugin | Low | ❌ |
| 7 | Build visual dice builder for generic rooms | Low | ❌ |
| 8+ | Build each game-specific room type | Low per type | ✅ handler per type |

Phases 1–3 can ship together as a pure refactor (no user-visible changes).
Phase 7 (visual dice UI) can ship as soon as Phase 6 is done — no backend work needed.
Phases 4–5 are the gate for game-specific rooms, and can be done in parallel with 6–7.
