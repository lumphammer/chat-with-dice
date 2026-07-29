import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  MAX_AVOIDED_SUBJECTS,
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
  const errors: { userId: string; error: unknown }[] = [];
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
    broadcaster: {
      broadcast: () => {},
      sendErrorToUserId: (userId: string, error: unknown) =>
        errors.push({ userId, error }),
    } as unknown as Broadcaster,
    getRoomOwnerUserId: getRoomOwner,
    dispatchHook: async () => {},
  });
  if (!mounted) throw new Error("safety capability failed to mount");
  return { mounted, sentMessages, stateRepository, errors };
};

const call = (
  mounted: ServerMountedCapability,
  actionName: string,
  params: unknown,
  userId: string,
  displayName: string = userId,
) =>
  mounted.onMessage({
    actionCall: { actionName, correlation: nanoid(), params },
    userId,
    displayName,
  });

const stateOf = (mounted: ServerMountedCapability) =>
  mounted.getInitPayload().state as SafetyState;

describe("safety Avoided Subjects", () => {
  it("stamps the author from the connection, not the payload", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(
      mounted,
      "addAvoidedSubject",
      // A hostile client putting someone else's details in the payload gets
      // them ignored: only `id` and `text` are the caller's to supply.
      {
        id,
        text: "spiders",
        authorUserId: OTHER,
        authorDisplayName: "Someone",
      },
      AUTHOR,
      AUTHOR_NAME,
    );

    expect(stateOf(mounted).entries).toEqual([
      {
        id,
        text: "spiders",
        authorUserId: AUTHOR,
        authorDisplayName: AUTHOR_NAME,
      },
    ]);
  });

  it("rejects a whitespace-only subject", async () => {
    const { mounted } = await mountSafety();

    await expect(
      call(mounted, "addAvoidedSubject", { id: nanoid(), text: "   " }, AUTHOR),
    ).rejects.toThrow();

    expect(stateOf(mounted).entries).toEqual([]);
  });

  it("trims surrounding whitespace off a subject", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "addAvoidedSubject",
      { id: nanoid(), text: "  spiders  " },
      AUTHOR,
    );

    expect(stateOf(mounted).entries[0].text).toBe("spiders");
  });

  it("ignores a reused entry id", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "addAvoidedSubject", { id, text: "snakes" }, OTHER);

    // Two entries sharing an id would be removed together by the id-based
    // filter, so the second add is dropped rather than allowed to collide.
    expect(stateOf(mounted).entries).toHaveLength(1);
    expect(stateOf(mounted).entries[0].text).toBe("spiders");
  });

  it("caps the list and tells the user who hit the cap", async () => {
    const { mounted, errors } = await mountSafety();

    for (let i = 0; i < MAX_AVOIDED_SUBJECTS; i++) {
      // oxlint-disable-next-line no-await-in-loop
      await call(
        mounted,
        "addAvoidedSubject",
        { id: nanoid(), text: `subject ${i}` },
        AUTHOR,
      );
    }
    await call(
      mounted,
      "addAvoidedSubject",
      { id: nanoid(), text: "one too many" },
      OTHER,
    );

    expect(stateOf(mounted).entries).toHaveLength(MAX_AVOIDED_SUBJECTS);
    // Silence would just look like a broken Add button.
    expect(errors).toHaveLength(1);
    expect(errors[0].userId).toBe(OTHER);
  });

  it("lets an author remove their own entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, AUTHOR);

    expect(stateOf(mounted).entries).toEqual([]);
  });

  it("refuses to remove someone else's entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, OTHER);

    expect(stateOf(mounted).entries).toHaveLength(1);
  });

  it("lets the room owner remove anyone's entry", async () => {
    const { mounted } = await mountSafety();
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, ROOM_OWNER);

    expect(stateOf(mounted).entries).toEqual([]);
  });

  it("fails closed when the room owner cannot be determined", async () => {
    // An unreadable room row must not turn into "everyone is the owner".
    const { mounted } = await mountSafety({ roomOwnerUserId: undefined });
    const id = nanoid();

    await call(mounted, "addAvoidedSubject", { id, text: "spiders" }, AUTHOR);
    await call(mounted, "removeAvoidedSubject", { id }, OTHER);

    expect(stateOf(mounted).entries).toHaveLength(1);
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
      AUTHOR_NAME,
    );

    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].userId).toBe(AUTHOR);
    expect(sentMessages[0].displayName).toBe(AUTHOR_NAME);
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

    expect(stateOf(mounted).lastSignal?.displayName).toBe(
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
    expect(stateOf(mounted).lastSignal?.displayName).toBe(AUTHOR_NAME);
    expect(JSON.stringify(stateOf(mounted).lastSignal)).not.toContain(AUTHOR);
  });

  it("changes the signal id each time so clients can spot a new one", async () => {
    const { mounted } = await mountSafety();

    await call(
      mounted,
      "raiseSignal",
      { kind: "pause", unattributed: false },
      AUTHOR,
    );
    const first = stateOf(mounted).lastSignal;

    await call(
      mounted,
      "raiseSignal",
      { kind: "pause", unattributed: false },
      AUTHOR,
    );
    const second = stateOf(mounted).lastSignal;

    expect(first?.id).toBeDefined();
    expect(second?.id).not.toBe(first?.id);
  });
});
