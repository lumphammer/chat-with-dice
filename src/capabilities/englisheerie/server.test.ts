import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  englishEerieStateValidator,
  getInitialEnglishEerieState,
  messageDataValidator,
  type StoryCard,
  buildNarrativeCards,
} from "#/capabilities/englisheerie/common";
import { englisheerieServer } from "#/capabilities/englisheerie/server";
import type { ChatMessage } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

const makeStateRepository = () => {
  const kv = new Map<string, unknown>();
  return new CapabilityStateRepository({
    get: (key: string) => kv.get(key),
    put: (key: string, value: unknown) => kv.set(key, value),
    delete: (key: string) => kv.delete(key),
    list: () => kv.entries(),
  } as unknown as SyncKvStorage);
};

const getObstruction = (): StoryCard => {
  const obstruction = buildNarrativeCards().find(
    (card) => card.difficulty !== undefined,
  );
  if (!obstruction) {
    throw new Error("The English Eerie deck has no Obstruction");
  }
  return obstruction;
};

const getNonObstruction = (): StoryCard => {
  const card = buildNarrativeCards().find(
    (candidate) => candidate.difficulty === undefined,
  );
  if (!card) {
    throw new Error("The English Eerie deck has no non-Obstruction");
  }
  return card;
};

const mountWithObstruction = async ({
  spirit = getInitialEnglishEerieState().spirit,
}: { spirit?: number } = {}) => {
  const obstruction = getObstruction();
  const stateRepository = makeStateRepository();
  stateRepository.set("englisheerie", {
    ...getInitialEnglishEerieState(),
    mode: "play",
    spirit,
    stack: [getNonObstruction()],
    drawn: [obstruction],
    lastObstruction: {
      cardId: obstruction.id,
      difficulty: obstruction.difficulty,
    },
  });

  const sentMessages: ChatMessage[] = [];
  const messages = new Map<string, ChatMessage>();
  const errors: { userId: string; error: unknown }[] = [];
  const mounted = await englisheerieServer.mount({
    doCtx: {} as unknown as DurableObjectState,
    messageJiggler: {
      sendChatMessage: (message: ChatMessage) => {
        sentMessages.push(message);
        messages.set(message.id, message);
      },
      getMessage: async (id: string) => {
        const message = messages.get(id);
        if (!message) {
          throw new Error(`Message not found: ${id}`);
        }
        return message;
      },
      updateMessage: async (message: ChatMessage) => {
        messages.set(message.id, message);
      },
    } as unknown as MessageJiggler,
    stateRepository,
    config: undefined,
    nodeShareManager: {} as unknown as NodeShareManager,
    broadcaster: {
      broadcast: () => {},
      sendErrorToUserId: (userId: string, error: unknown) =>
        errors.push({ userId, error }),
    } as unknown as Broadcaster,
    getRoomOwnerUserId: async () => undefined,
    dispatchHook: async () => {},
  });
  if (!mounted) {
    throw new Error("English Eerie capability failed to mount");
  }
  return { mounted, obstruction, sentMessages, messages, errors };
};

const roll = (
  mounted: ServerMountedCapability,
  userId: string,
  displayName: string,
  resolveSpentBefore: number,
) =>
  mounted.onMessage({
    actionCall: {
      correlation: crypto.randomUUID(),
      actionName: "rollObstruction",
      params: { resolveSpentBefore },
    },
    userId,
    displayName,
  });

const draw = (mounted: ServerMountedCapability) =>
  mounted.onMessage({
    actionCall: {
      correlation: crypto.randomUUID(),
      actionName: "drawCard",
      params: {},
    },
    userId: "drawer-id",
    displayName: "Drawer",
  });

const boost = (
  mounted: ServerMountedCapability,
  messageId: string,
  spend: number,
) =>
  mounted.onMessage({
    actionCall: {
      correlation: crypto.randomUUID(),
      actionName: "boostRoll",
      params: { messageId, spend },
    },
    userId: "alice-id",
    displayName: "Alice",
  });

const getRollData = (message: ChatMessage) => {
  const data = messageDataValidator.parse(message.capabilityData);
  if (data.kind !== "roll") {
    throw new Error("Expected an Obstruction roll message");
  }
  return data;
};

describe("rolling against an Obstruction", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks the next draw until the Obstruction is rolled", async () => {
    const { mounted, sentMessages, errors } = await mountWithObstruction();

    await draw(mounted);

    let state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.stack).toHaveLength(1);
    expect(sentMessages).toHaveLength(0);
    expect(errors).toEqual([
      {
        userId: "drawer-id",
        error:
          "Roll against the current obstruction before drawing another card.",
      },
    ]);

    await roll(mounted, "alice-id", "Alice", 0);
    await draw(mounted);

    state = englishEerieStateValidator.parse(mounted.getInitPayload().state);
    expect(state.stack).toHaveLength(0);
    expect(sentMessages).toHaveLength(2);
  });

  it("records the first roller and refuses a second roll", async () => {
    const { mounted, obstruction, sentMessages, errors } =
      await mountWithObstruction();

    await roll(mounted, "alice-id", "Alice", 1);
    await roll(mounted, "bob-id", "Bob", 2);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.obstructionRollers[obstruction.id]).toBe("Alice");
    expect(state.resolve).toBe(getInitialEnglishEerieState().resolve - 1);
    expect(sentMessages).toHaveLength(1);
    expect(errors).toEqual([
      {
        userId: "bob-id",
        error: "This obstruction was already rolled by Alice.",
      },
    ]);
  });

  it("deducts one Spirit for a failed roll", async () => {
    const { mounted, sentMessages } = await mountWithObstruction({ spirit: 2 });

    await roll(mounted, "alice-id", "Alice", 0);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(1);
    expect(getRollData(sentMessages[0]).spiritLost).toBe(true);
  });

  it("reimburses Spirit when Resolve turns the failure into success", async () => {
    const { mounted, sentMessages, messages } = await mountWithObstruction({
      spirit: 1,
    });

    await roll(mounted, "alice-id", "Alice", 0);
    const message = sentMessages[0];
    const failedRoll = getRollData(message);
    await boost(mounted, message.id, failedRoll.difficulty - failedRoll.total);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(1);
    const updatedMessage = messages.get(message.id);
    if (!updatedMessage) {
      throw new Error("Updated roll message not found");
    }
    expect(getRollData(updatedMessage)).toMatchObject({
      spiritLost: false,
      success: true,
    });
  });

  it("does not reimburse Spirit that was never lost", async () => {
    const { mounted, sentMessages } = await mountWithObstruction({ spirit: 0 });

    await roll(mounted, "alice-id", "Alice", 0);
    const message = sentMessages[0];
    const failedRoll = getRollData(message);
    expect(failedRoll.spiritLost).toBe(false);
    await boost(mounted, message.id, failedRoll.difficulty - failedRoll.total);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(0);
  });
});
