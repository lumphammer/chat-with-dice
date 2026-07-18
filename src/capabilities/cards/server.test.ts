import { cardsServer } from "#/capabilities/cards/server";
import type { ServerMountedCapability } from "#/capabilities/createServerCapability";
import type { Broadcaster } from "#/workers/ChatRoomDO/Broadcaster";
import { CapabilityStateRepository } from "#/workers/ChatRoomDO/CapabilityStateRepository";
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

// A Map-backed SyncKvStorage so the stateful capability can read and write its
// Pile state. The `as unknown` bridge is only because SyncKvStorage's methods
// are generic over the stored value, which a plain Map can't reproduce; the
// object below implements the interface's full surface so the shape is honest.
const makeStateRepository = () => {
  const kv = new Map<string, unknown>();
  const storage = {
    get: (key: string) => kv.get(key),
    put: (key: string, value: unknown) => kv.set(key, value),
    delete: (key: string) => kv.delete(key),
    list: () => kv.entries(),
  };
  return new CapabilityStateRepository(storage as unknown as SyncKvStorage);
};

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
    stateRepository: makeStateRepository(),
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
      params: { ownerUserId: OWNER, deckNodeId: DECK },
    },
    userId: DRAWER,
    displayName: "Drawer",
  });

const setReturnCards = (
  mounted: ServerMountedCapability,
  returnCards: boolean,
) =>
  mounted.onMessage({
    actionCall: {
      correlation: "c-config",
      actionName: "setReturnCards",
      params: { ownerUserId: OWNER, deckNodeId: DECK, returnCards },
    },
    userId: DRAWER,
    displayName: "Drawer",
  });

const reset = (mounted: ServerMountedCapability) =>
  mounted.onMessage({
    actionCall: {
      correlation: "c-reset",
      actionName: "reset",
      params: { ownerUserId: OWNER, deckNodeId: DECK },
    },
    userId: DRAWER,
    displayName: "Drawer",
  });

const twoCardDeck = () =>
  vi.fn<ListDeckCards>().mockResolvedValue({
    result: "ok",
    deckName: "Magus",
    cards: [
      { nodeId: "card-a", name: "The Fool" },
      { nodeId: "card-b", name: "The Magician" },
    ],
  });

const drawnCardIds = (sentMessages: unknown[]) =>
  sentMessages.map(
    (data) => (data as { card: { nodeId: string } }).card.nodeId,
  );

describe("cards draw action", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  it("draws a card and posts a Card Draw Message", async () => {
    const listDeckCards = twoCardDeck();
    const { mounted, sentMessages, errors } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(listDeckCards).toHaveBeenCalledWith({
      ownerUserId: OWNER,
      deckNodeId: DECK,
    });
    // Math.random pinned to 0 → index 0. The deck name comes from the
    // authoritative listDeckCards result, not from the draw payload.
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
      .mockResolvedValue({ result: "ok", deckName: "Magus", cards: [] });
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

describe("dwindling pile", () => {
  it("never draws the same card twice while dwindling", async () => {
    // Uniform pick over the *remaining* cards, so pinning random to 0 walks the
    // deck down one distinct card at a time rather than repeating card-a.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(twoCardDeck());

    await setReturnCards(mounted, false);
    await draw(mounted);
    await draw(mounted);

    expect(new Set(drawnCardIds(sentMessages))).toEqual(
      new Set(["card-a", "card-b"]),
    );
    expect(errors).toEqual([]);
  });

  it("does something sensible when drawing from a fully-drawn pile", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(twoCardDeck());

    await setReturnCards(mounted, false);
    await draw(mounted);
    await draw(mounted);
    // Both cards are now in the Discard; the third draw has nothing left.
    await draw(mounted);

    expect(sentMessages).toHaveLength(2);
    expect(errors).toEqual([
      {
        userId: DRAWER,
        error: "Every card has been drawn. Reset the pile to draw again.",
      },
    ]);
  });

  it("reset returns every discarded card to the pile", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(twoCardDeck());

    await setReturnCards(mounted, false);
    await draw(mounted);
    await draw(mounted);
    await reset(mounted);
    // After Reset the whole deck is drawable again: the next draw succeeds (no
    // error) and comes up card-a, the index-0 pick over the full deck. Without
    // Reset the pile would be empty and this draw would have errored instead.
    await draw(mounted);

    expect(errors).toEqual([]);
    expect(drawnCardIds(sentMessages).at(-1)).toBe("card-a");
  });

  it("keeps returning cards to the pile when not dwindling", async () => {
    // Default (returnCards) pile: every draw sees the whole deck, so a pinned
    // random repeats the same card and nothing is an error.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(twoCardDeck());

    await draw(mounted);
    await draw(mounted);

    expect(drawnCardIds(sentMessages)).toEqual(["card-a", "card-a"]);
    expect(errors).toEqual([]);
  });
});
