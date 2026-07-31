import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  englishEerieStateValidator,
  getInitialEnglishEerieState,
  messageDataValidator,
  type EnglishEerieState,
  type StoryCard,
  buildNarrativeCards,
  buildStoryDeck,
} from "#/capabilities/englisheerie/common";
import { englisheerieServer } from "#/capabilities/englisheerie/server";
import type { ChatMessage } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({ env: {} }));

const RESOLVE_BEFORE_GREY_LADY = 3;
const MAX_CARD_DIFFICULTY = 7;
const CHAPTER_DIFFICULTY_BONUSES = [0, 1, 2];

const makeStateRepository = () => {
  const kv = new Map<string, unknown>();
  return new CapabilityStateRepository({
    get: (key: string) => kv.get(key),
    put: (key: string, value: unknown) => kv.set(key, value),
    delete: (key: string) => kv.delete(key),
    list: () => kv.entries(),
  } as unknown as SyncKvStorage);
};

type ObstructionCard = StoryCard & { difficulty: number };

const isObstruction = (card: StoryCard): card is ObstructionCard =>
  card.difficulty !== undefined;

const getObstruction = (): ObstructionCard => {
  const obstruction = buildNarrativeCards().find(isObstruction);
  if (!obstruction) {
    throw new Error("The English Eerie deck has no Obstruction");
  }
  return obstruction;
};

const getHardestObstruction = (): ObstructionCard => {
  const obstruction = buildNarrativeCards().find(
    (card): card is ObstructionCard => card.difficulty === MAX_CARD_DIFFICULTY,
  );
  if (!obstruction) {
    throw new Error("The English Eerie deck has no hardest Obstruction");
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

const getGreyLady = (): StoryCard => {
  const card = buildStoryDeck((items) => items).find(
    (candidate) => candidate.kind === "greyLady",
  );
  if (!card) {
    throw new Error("The English Eerie deck has no Grey Lady");
  }
  return card;
};

const mountWithState = async (stateOverrides: Partial<EnglishEerieState>) => {
  const stateRepository = makeStateRepository();
  stateRepository.set("englisheerie", {
    ...getInitialEnglishEerieState(),
    mode: "play",
    ...stateOverrides,
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
  return { mounted, sentMessages, messages, errors };
};

const mountWithObstruction = async ({
  spirit = getInitialEnglishEerieState().spirit,
}: { spirit?: number } = {}) => {
  const obstruction = getObstruction();
  const mounted = await mountWithState({
    spirit,
    stack: [getNonObstruction()],
    drawn: [obstruction],
    lastObstruction: {
      cardId: obstruction.id,
      difficulty: obstruction.difficulty,
    },
  });
  return { ...mounted, obstruction };
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

const spendResolveForGreyLady = (
  mounted: ServerMountedCapability,
  messageId: string,
) =>
  mounted.onMessage({
    actionCall: {
      correlation: crypto.randomUUID(),
      actionName: "spendResolveForGreyLady",
      params: { messageId },
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

const getDrawData = (message: ChatMessage) => {
  const data = messageDataValidator.parse(message.capabilityData);
  if (data.kind !== "draw") {
    throw new Error("Expected a Story Card draw message");
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

  it.each(CHAPTER_DIFFICULTY_BONUSES)(
    "adds a +%i Grey Lady modifier to the difficulty",
    async (difficultyBonus) => {
      const obstruction = getHardestObstruction();
      const greyLadies = Array.from({ length: difficultyBonus }, () =>
        getGreyLady(),
      );
      const { mounted, sentMessages } = await mountWithState({
        stack: [obstruction],
        drawn: greyLadies,
      });

      await draw(mounted);

      const state = englishEerieStateValidator.parse(
        mounted.getInitPayload().state,
      );
      expect(state.lastObstruction).toEqual({
        cardId: obstruction.id,
        difficulty: MAX_CARD_DIFFICULTY + difficultyBonus,
      });
      expect(getDrawData(sentMessages[0])).toMatchObject({
        card: { difficulty: MAX_CARD_DIFFICULTY },
        difficultyBonus,
      });
    },
  );
});

describe("drawing a Grey Lady", () => {
  it("deducts Spirit when any remains", async () => {
    const { mounted, sentMessages } = await mountWithState({
      spirit: 2,
      resolve: RESOLVE_BEFORE_GREY_LADY,
      stack: [getGreyLady()],
    });

    await draw(mounted);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(1);
    expect(state.resolve).toBe(RESOLVE_BEFORE_GREY_LADY);
    expect(getDrawData(sentMessages[0]).greyLadyLoss).toBe("spirit");
  });

  it("deducts Resolve when no Spirit remains", async () => {
    const { mounted, sentMessages } = await mountWithState({
      spirit: 0,
      resolve: RESOLVE_BEFORE_GREY_LADY,
      stack: [getGreyLady()],
    });

    await draw(mounted);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(0);
    expect(state.resolve).toBe(2);
    expect(getDrawData(sentMessages[0]).greyLadyLoss).toBe("resolve");
  });

  it("deducts nothing when both tracks are empty", async () => {
    const { mounted, sentMessages } = await mountWithState({
      spirit: 0,
      resolve: 0,
      stack: [getGreyLady()],
    });

    await draw(mounted);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(0);
    expect(state.resolve).toBe(0);
    expect(getDrawData(sentMessages[0]).greyLadyLoss).toBeNull();
  });

  it("can replace its Spirit loss with one Resolve exactly once", async () => {
    const { mounted, sentMessages, messages } = await mountWithState({
      spirit: 1,
      resolve: 2,
      stack: [getGreyLady()],
    });

    await draw(mounted);
    const message = sentMessages[0];
    await spendResolveForGreyLady(mounted, message.id);
    await spendResolveForGreyLady(mounted, message.id);

    const state = englishEerieStateValidator.parse(
      mounted.getInitPayload().state,
    );
    expect(state.spirit).toBe(1);
    expect(state.resolve).toBe(1);
    const updatedMessage = messages.get(message.id);
    if (!updatedMessage) {
      throw new Error("Updated Grey Lady message not found");
    }
    expect(getDrawData(updatedMessage).greyLadyLoss).toBe("resolve");
  });
});
