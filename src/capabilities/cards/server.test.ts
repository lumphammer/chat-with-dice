import { cardDrawMessageDataValidator } from "#/capabilities/cards/common";
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
    allowFaceDown: false,
    allowInverted: false,
    cards: [
      { nodeId: "card-a", name: "The Fool", back: null },
      { nodeId: "card-b", name: "The Magician", back: null },
    ],
  });

const BACK = { nodeId: "common-back", name: "Card back" };

// Distinct rolls for the independent decisions a draw makes: the uniform card
// pick, then the face-down coin, then the inverted coin. Kept apart so a test can
// prove each coin does not reuse an earlier roll.
const PICK_FIRST_CARD = 0; // floors the uniform index to 0 (card-a)
const FACE_DOWN_ROLL = 0.2; // < 0.5 → face down
const FACE_UP_ROLL = 0.9; // >= 0.5 → face up
const INVERTED_ROLL = 0.2; // < 0.5 → inverted
const UPRIGHT_ROLL = 0.9; // >= 0.5 → upright

// A Deck that permits Face Down draws and whose Cards all share a Common Back.
const faceDownDeck = () =>
  vi.fn<ListDeckCards>().mockResolvedValue({
    result: "ok",
    deckName: "Magus",
    allowFaceDown: true,
    allowInverted: false,
    cards: [
      { nodeId: "card-a", name: "The Fool", back: BACK },
      { nodeId: "card-b", name: "The Magician", back: BACK },
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
        faceDown: false,
        inverted: false,
      },
    ]);
    expect(errors).toEqual([]);
  });

  it("fails gracefully drawing from a deck with no cards", async () => {
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok",
      deckName: "Magus",
      allowFaceDown: false,
      allowInverted: false,
      cards: [],
    });
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

describe("face down draws", () => {
  const drawnFaceDown = (sentMessages: unknown[]) =>
    sentMessages.map(
      (data) => cardDrawMessageDataValidator.parse(data).faceDown,
    );

  it("comes up face down and records the back when the deck permits it", async () => {
    // Two independent rolls: the uniform pick (0 → card-a), then the face-down
    // coin (0.2 < 0.5 → face down). Sequencing them proves the coin is its own
    // roll, not a reuse of the pick's. The back is recorded so the message can
    // render it, and the front is still carried for the record.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(PICK_FIRST_CARD)
      .mockReturnValueOnce(FACE_DOWN_ROLL)
      .mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(faceDownDeck());

    await draw(mounted);

    expect(sentMessages).toEqual([
      {
        ownerUserId: OWNER,
        deck: { nodeId: DECK, name: "Magus" },
        card: { nodeId: "card-a", name: "The Fool" },
        faceDown: true,
        inverted: false,
        back: BACK,
      },
    ]);
    expect(errors).toEqual([]);
  });

  it("comes up face up when the face-down coin lands the other way", async () => {
    // Same pick (0 → card-a), but the face-down coin lands face up (0.9). The
    // pick and the coin are distinct values, so a card-a face-up result can only
    // come from two independent rolls — not from the coin echoing the pick.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(PICK_FIRST_CARD)
      .mockReturnValueOnce(FACE_UP_ROLL)
      .mockReturnValue(0);
    const { mounted, sentMessages } = await mountWith(faceDownDeck());

    await draw(mounted);

    expect(sentMessages).toEqual([
      {
        ownerUserId: OWNER,
        deck: { nodeId: DECK, name: "Magus" },
        card: { nodeId: "card-a", name: "The Fool" },
        faceDown: false,
        inverted: false,
      },
    ]);
  });

  it("never comes up face down for a card with no back", async () => {
    // Deck permits face down, but this card has no back — a Card with no back
    // always comes up face up, even where other cards in the deck have one.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok",
      deckName: "Magus",
      allowFaceDown: true,
      allowInverted: false,
      cards: [{ nodeId: "card-a", name: "The Fool", back: null }],
    });
    const { mounted, sentMessages } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(drawnFaceDown(sentMessages)).toEqual([false]);
    expect((sentMessages[0] as { back?: unknown }).back).toBeUndefined();
  });

  it("never comes up face down when the deck forbids it, back or not", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok",
      deckName: "Magus",
      allowFaceDown: false,
      allowInverted: false,
      cards: [{ nodeId: "card-a", name: "The Fool", back: BACK }],
    });
    const { mounted, sentMessages } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(drawnFaceDown(sentMessages)).toEqual([false]);
  });
});

describe("inverted draws", () => {
  const drawnInverted = (sentMessages: unknown[]) =>
    sentMessages.map(
      (data) => cardDrawMessageDataValidator.parse(data).inverted,
    );

  // A Deck that permits Inverted draws. Its Cards have no back, to prove Inverted
  // needs none — it rotates the front (unlike Face Down, which needs a back).
  const invertedDeck = () =>
    vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok" as const,
      deckName: "Magus",
      allowFaceDown: false,
      allowInverted: true,
      cards: [
        { nodeId: "card-a", name: "The Fool", back: null },
        { nodeId: "card-b", name: "The Magician", back: null },
      ],
    });

  it("comes up inverted and records it when the deck permits it", async () => {
    // Two rolls: the uniform pick (0 → card-a), then the inverted coin (0.2 →
    // inverted). The deck forbids Face Down, so the face-down coin is never rolled
    // and the inverted coin is the second value.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(PICK_FIRST_CARD)
      .mockReturnValueOnce(INVERTED_ROLL)
      .mockReturnValue(0);
    const { mounted, sentMessages, errors } = await mountWith(invertedDeck());

    await draw(mounted);

    expect(sentMessages).toEqual([
      {
        ownerUserId: OWNER,
        deck: { nodeId: DECK, name: "Magus" },
        card: { nodeId: "card-a", name: "The Fool" },
        faceDown: false,
        inverted: true,
      },
    ]);
    expect(errors).toEqual([]);
  });

  it("comes up upright when the inverted coin lands the other way", async () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(PICK_FIRST_CARD)
      .mockReturnValueOnce(UPRIGHT_ROLL)
      .mockReturnValue(0);
    const { mounted, sentMessages } = await mountWith(invertedDeck());

    await draw(mounted);

    expect(drawnInverted(sentMessages)).toEqual([false]);
  });

  it("never comes up inverted when the deck forbids it", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const { mounted, sentMessages } = await mountWith(twoCardDeck());

    await draw(mounted);

    expect(drawnInverted(sentMessages)).toEqual([false]);
  });

  it("can come up both face down and inverted, rendering the back rotated", async () => {
    // Inverted and Face Down are orthogonal (CONTEXT.md): three independent rolls
    // in order — pick (0 → card-a), face-down coin (0.2 → down), inverted coin
    // (0.2 → inverted). The message carries both flags and the back it renders.
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(PICK_FIRST_CARD)
      .mockReturnValueOnce(FACE_DOWN_ROLL)
      .mockReturnValueOnce(INVERTED_ROLL)
      .mockReturnValue(0);
    const listDeckCards = vi.fn<ListDeckCards>().mockResolvedValue({
      result: "ok" as const,
      deckName: "Magus",
      allowFaceDown: true,
      allowInverted: true,
      cards: [{ nodeId: "card-a", name: "The Fool", back: BACK }],
    });
    const { mounted, sentMessages, errors } = await mountWith(listDeckCards);

    await draw(mounted);

    expect(sentMessages).toEqual([
      {
        ownerUserId: OWNER,
        deck: { nodeId: DECK, name: "Magus" },
        card: { nodeId: "card-a", name: "The Fool" },
        faceDown: true,
        inverted: true,
        back: BACK,
      },
    ]);
    expect(errors).toEqual([]);
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
