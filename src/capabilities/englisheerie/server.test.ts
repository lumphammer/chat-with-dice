import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import {
  englishEerieStateValidator,
  getInitialEnglishEerieState,
  type StoryCard,
  buildNarrativeCards,
} from "#/capabilities/englisheerie/common";
import { englisheerieServer } from "#/capabilities/englisheerie/server";
import type { ChatMessage } from "#/validators/webSocketMessageSchemas";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { describe, expect, it, vi } from "vitest";

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

const mountWithObstruction = async () => {
  const obstruction = getObstruction();
  const stateRepository = makeStateRepository();
  stateRepository.set("englisheerie", {
    ...getInitialEnglishEerieState(),
    mode: "play",
    drawn: [obstruction],
    lastObstruction: {
      cardId: obstruction.id,
      difficulty: obstruction.difficulty,
    },
  });

  const sentMessages: ChatMessage[] = [];
  const errors: { userId: string; error: unknown }[] = [];
  const mounted = await englisheerieServer.mount({
    doCtx: {} as unknown as DurableObjectState,
    messageJiggler: {
      sendChatMessage: (message: ChatMessage) =>
        void sentMessages.push(message),
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
  return { mounted, obstruction, sentMessages, errors };
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

describe("rolling against an Obstruction", () => {
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
});
