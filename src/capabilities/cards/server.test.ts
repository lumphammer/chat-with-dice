import { cardsServer } from "#/capabilities/cards/server";
import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import type { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
import type { MessageJiggler } from "#/workers/ChatRoomDO/MessageJiggler";
import type { NodeShareManager } from "#/workers/ChatRoomDO/NodeShareManager";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `NodeShareManager` reaches `cloudflare:workers` via `#/db`; this unit test
// never touches it, so a bare stub lets the module graph load (mirrors the
// files server test).
vi.mock("cloudflare:workers", () => ({ env: {} }));

const OWNER = "owner-user";
const DECK = "magus-deck";
const DRAWER = "drawer-user";

type ListDeckCards = NodeShareManager["listDeckCards"];

const mountWith = async (
  listDeckCards: ReturnType<typeof vi.fn<ListDeckCards>>,
) => {
  const sentMessages: unknown[] = [];
  const errors: { userId: string; error: unknown }[] = [];

  const nodeShareManager = { listDeckCards } as unknown as NodeShareManager;
  const messageJiggler = {
    sendChatMessage: (message: { capabilityData: unknown }) =>
      sentMessages.push(message.capabilityData),
  } as unknown as MessageJiggler;
  const broadcaster = {
    sendErrorToUserId: (userId: string, error: unknown) =>
      errors.push({ userId, error }),
    broadcast: () => {},
  } as unknown as Broadcaster;

  const mounted = await cardsServer.mount({
    doCtx: {} as unknown as DurableObjectState,
    messageJiggler,
    stateRepository: {} as unknown as CapabilityStateRepository,
    config: undefined,
    nodeShareManager,
    broadcaster,
    dispatchHook: async () => {},
  });
  if (!mounted) throw new Error("cards capability failed to mount");
  return { mounted, sentMessages, errors };
};

const draw = (mounted: ServerMountedCapability) =>
  mounted.onMessage({
    actionCall: {
      correlation: "c1",
      actionName: "draw",
      params: { ownerUserId: OWNER, deckNodeId: DECK, deckName: "Magus" },
    },
    userId: DRAWER,
    displayName: "Drawer",
  });

describe("cards draw action", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("draws a card and posts a Card Draw Message", async () => {
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok",
      cards: [
        { nodeId: "card-a", name: "The Fool" },
        { nodeId: "card-b", name: "The Magician" },
      ],
    });
    const { mounted, sentMessages, errors } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(listDeckCards).toHaveBeenCalledWith({
      ownerUserId: OWNER,
      deckNodeId: DECK,
    });
    // Math.random pinned to 0 → index 0.
    expect(sentMessages).toEqual([
      {
        ownerUserId: OWNER,
        deck: { nodeId: DECK, name: "Magus" },
        card: { nodeId: "card-a", name: "The Fool" },
      },
    ]);
    expect(errors).toEqual([]);
  });

  it("fails gracefully drawing from a deck with no cards", async () => {
    const listDeckCards = vi
      .fn<ListDeckCards>()
      .mockResolvedValue({ result: "ok", cards: [] });
    const { mounted, sentMessages, errors } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(sentMessages).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].userId).toBe(DRAWER);
  });

  it("surfaces an authorization error without posting a message", async () => {
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "error",
      reason: "You do not have access to this deck",
    });
    const { mounted, sentMessages, errors } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(sentMessages).toEqual([]);
    expect(errors).toEqual([
      { userId: DRAWER, error: "You do not have access to this deck" },
    ]);
  });
});
