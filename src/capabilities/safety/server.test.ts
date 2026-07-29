import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  UNATTRIBUTED_DISPLAY_NAME,
  UNATTRIBUTED_USER_ID,
  type SafetyState,
} from "#/capabilities/safety/common";
import { safetyServer } from "#/capabilities/safety/server";
import type { ChatMessage } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { nanoid } from "nanoid";
import { describe, expect, it, vi } from "vitest";

const AUTHOR = "author-user";
const AUTHOR_NAME = "Author Displayname";
const OTHER = "other-user";
const ROOM_OWNER = "room-owner-user";

/** What one viewer actually receives, redaction and strip both applied. */
type ClientSafetyState = {
  entries: { id: string; text: string; isMine: boolean }[];
  lastSignal: SafetyState["lastSignal"];
};

const makeStateRepository = () => {
  const kv = new Map<string, unknown>();
  return new CapabilityStateRepository({
    get: (key: string) => kv.get(key),
    put: (key: string, value: unknown) => kv.set(key, value),
    delete: (key: string) => kv.delete(key),
    list: () => kv.entries(),
  } as unknown as SyncKvStorage);
};

const mountSafety = async ({
  roomOwnerUserId = ROOM_OWNER,
  getRoomOwner = async () => roomOwnerUserId,
}: {
  roomOwnerUserId?: string | undefined;
  /** Override to assert on *whether* the owner lookup happened at all. */
  getRoomOwner?: () => Promise<string | undefined>;
} = {}) => {
  const sentMessages: ChatMessage[] = [];
  const messageJiggler = {
    sendChatMessage: (message: ChatMessage) => void sentMessages.push(message),
  } as unknown as MessageJiggler;
  const stateRepository = makeStateRepository();

  const mounted = await safetyServer.mount({
    doCtx: {} as unknown as DurableObjectState,
    messageJiggler,
    stateRepository,
    config: undefined,
    nodeShareManager: {} as unknown as NodeShareManager,
    // The state assertions all read through `getInitPayload`, which runs the
    // same projection the broadcast does, so the broadcast itself can no-op.
    broadcaster: {
      broadcast: () => {},
      broadcastCapabilityState: () => {},
      broadcastCapabilityStatePerViewer: () => {},
    } as unknown as Broadcaster,
    getRoomOwnerUserId: getRoomOwner,
    dispatchHook: async () => {},
  });
  if (!mounted) throw new Error("safety capability failed to mount");
  return { mounted, sentMessages, stateRepository };
};

const call = (
  mounted: ServerMountedCapability,
  actionName: string,
  params: unknown,
  userId: string,
  // Defaults to the user id so leak assertions can search for one string and
  // catch either an id or a name escaping. Pass a distinct value when the test
  // needs to tell the two apart.
  displayName: string = userId,
) =>
  mounted.onMessage({
    actionCall: { actionName, correlation: nanoid(), params },
    userId,
    displayName,
  });

const stateFor = (mounted: ServerMountedCapability, viewerUserId: string) =>
  mounted.getInitPayload(viewerUserId).state as ClientSafetyState;

describe("safety Avoided Subjects", () => {
  it("never sends authorship to anyone, including the author", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);

    for (const viewer of [AUTHOR, OTHER]) {
      const entry = stateFor(mounted, viewer).entries[0];
      expect(entry).not.toHaveProperty("authorUserId");
    }
  });

  it("keeps authorship in stored state so removal can be authorised", async () => {
    const { mounted, stateRepository } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);

    const stored = stateRepository.get("safety") as SafetyState;
    expect(stored.entries[0].authorUserId).toBe(AUTHOR);
  });

  it("marks an entry as mine only for its author", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "addAvoidedSubject",
      { id: nanoid(), text: "spiders" },
      AUTHOR,
    );

    expect(stateFor(mounted, AUTHOR).entries[0].isMine).toBe(true);
    expect(stateFor(mounted, OTHER).entries[0].isMine).toBe(false);
  });

  it("lets an author remove their own entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, AUTHOR);

    expect(stateFor(mounted, AUTHOR).entries).toEqual([]);
  });

  it("refuses to remove someone else's entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, OTHER);

    expect(stateFor(mounted, AUTHOR).entries).toHaveLength(1);
  });

  it("lets the room owner remove anyone's entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, ROOM_OWNER);

    expect(stateFor(mounted, AUTHOR).entries).toEqual([]);
  });

  it("fails closed when the room owner cannot be determined", async () => {
    // An unreadable room row must not turn into "everyone is the owner".
    const { mounted } = await mountSafety({ roomOwnerUserId: undefined });
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, OTHER);

    expect(stateFor(mounted, AUTHOR).entries).toHaveLength(1);
  });

  it("does not consult the room owner when the author is doing the removing", async () => {
    const getRoomOwner = vi.fn(async () => ROOM_OWNER);
    const { mounted } = await mountSafety({ getRoomOwner });
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, AUTHOR);

    // The owner lookup is a D1 round trip; the common case should never pay it.
    expect(getRoomOwner).not.toHaveBeenCalled();
  });
});

describe("safety Safety Signals", () => {
  it("attributes a normal signal to its raiser", async () => {
    const { mounted, sentMessages } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "xcard", unattributed: false },
      AUTHOR,
    );

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].userId).toBe(AUTHOR);
    expect(sentMessages[0].capabilityData).toEqual({
      kind: "xcard",
      unattributed: false,
    });
  });

  it("records the sentinel and nothing of the raiser when unattributed", async () => {
    const { mounted, sentMessages, stateRepository } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "xcard", unattributed: true },
      AUTHOR,
      AUTHOR_NAME,
    );

    const [message] = sentMessages;
    expect(message.userId).toBe(UNATTRIBUTED_USER_ID);
    expect(message.displayName).toBe(UNATTRIBUTED_DISPLAY_NAME);
    // Neither the raiser's id nor their name may appear anywhere that outlives
    // the frame — not on the message, and not in the state the signal wrote.
    // `lastSignal` carries a name for the overlay to show, so the name matters
    // here as much as the id does.
    for (const trace of [AUTHOR, AUTHOR_NAME]) {
      expect(JSON.stringify(message)).not.toContain(trace);
      expect(JSON.stringify(stateRepository.get("safety"))).not.toContain(
        trace,
      );
    }
  });

  it("shows the sentinel name on the overlay when unattributed", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "xcard", unattributed: true },
      AUTHOR,
      AUTHOR_NAME,
    );

    expect(stateFor(mounted, AUTHOR).lastSignal?.displayName).toBe(
      UNATTRIBUTED_DISPLAY_NAME,
    );
  });

  it("shows the raiser's name on the overlay when attributed", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "xcard", unattributed: false },
      AUTHOR,
      AUTHOR_NAME,
    );

    // The name, not the id — the overlay needs something to display, not
    // something to identify with.
    expect(stateFor(mounted, AUTHOR).lastSignal?.displayName).toBe(AUTHOR_NAME);
    expect(JSON.stringify(stateFor(mounted, AUTHOR).lastSignal)).not.toContain(
      AUTHOR,
    );
  });

  it("changes the signal id each time so clients can spot a new one", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "pause", unattributed: false },
      AUTHOR,
    );
    const first = stateFor(mounted, AUTHOR).lastSignal;

    await call(
      mounted,
      "raiseSignal",
      { kind: "pause", unattributed: false },
      AUTHOR,
    );
    const second = stateFor(mounted, AUTHOR).lastSignal;

    expect(first?.id).toBeDefined();
    expect(second?.id).not.toBe(first?.id);
  });
});
