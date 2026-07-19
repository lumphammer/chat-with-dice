import { createFolder } from "#/actions/files/createFolder";
import { setFolderIsDeck } from "#/actions/files/setFolderIsDeck";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { createUserWithDO } from "#/test-utils/integration/users";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ROOM_ID = "room-with-the-share";
const OTHER_ROOM_ID = "room-without-the-share";
const ROOM_DO_ID = "room-do-id";
const FILE_SIZE = 100;

const getDO = (userDataDOId: string) =>
  env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(userDataDOId));

type UserDataDOStub = ReturnType<typeof getDO>;

async function addReadyFile(
  userDataDO: UserDataDOStub,
  folderId: string,
  name: string,
  contentType: string,
) {
  const created = await userDataDO.createFile(name, contentType, folderId);
  if (created.kind !== "success") {
    throw new Error(`test setup: could not create ${name}`);
  }
  await userDataDO.markFileReady(created.data.id, FILE_SIZE, folderId);
  return created.data.id;
}

/**
 * Builds a Deck folder with two ready Card images (plus a couple of non-Cards),
 * an ordinary shared folder, and shares both with `ROOM_ID`.
 */
async function setUp() {
  const user = await createUserWithDO();
  const ctx = makeActionContext(user);
  const userDataDO = getDO(user.userDataDOId);

  const deck = await callAction(createFolder, { name: "Magus" }, ctx);
  await callAction(setFolderIsDeck, { nodeId: deck.id, isDeck: true }, ctx);
  const foolId = await addReadyFile(
    userDataDO,
    deck.id,
    "fool.jpg",
    "image/jpeg",
  );
  const magicianId = await addReadyFile(
    userDataDO,
    deck.id,
    "magician.png",
    "image/png",
  );
  // A non-image and an image that never became ready: neither is a drawable
  // Card, so getDeckCards must leave them out.
  await addReadyFile(userDataDO, deck.id, "notes.txt", "text/plain");
  const pending = await userDataDO.createFile(
    "uploading.jpg",
    "image/jpeg",
    deck.id,
  );
  if (pending.kind !== "success") throw new Error("test setup: pending file");

  const plainFolder = await callAction(createFolder, { name: "Handouts" }, ctx);

  const shareWithRoom = (nodeId: string) =>
    userDataDO.shareNodeWithRoom({
      nodeId,
      roomId: ROOM_ID,
      roomDurableObjectId: ROOM_DO_ID,
      userDisplayName: "Owner",
    });
  await Promise.all([shareWithRoom(deck.id), shareWithRoom(plainFolder.id)]);

  return { userDataDO, deck, plainFolder, foolId, magicianId };
}

describe("getDeckCards", () => {
  it("returns the deck's ready image children as cards", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    expect(result.deckName).toBe("Magus");
    // Only the two ready images — not the .txt, not the still-uploading image.
    expect(new Set(result.cards.map((card) => card.nodeId))).toEqual(
      new Set([foolId, magicianId]),
    );
  });

  it("excludes the common back and attaches it as each card's back", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    await userDataDO.setDeckCommonBack(deck.id, foolId);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    // The back stops being a Card in its own right, so only the magician
    // remains — carrying the fool as its back.
    expect(result.cards.map((card) => card.nodeId)).toEqual([magicianId]);
    expect(result.cards[0].back).toEqual({ nodeId: foolId, name: "fool.jpg" });
  });

  it("pairs a front with an individual back, dropping the back from the cards", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    // Pair the magician (front) with the fool (its own back). No Common Back.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    // The fool is now the magician's Individual Back, so it stops being a Card —
    // even though the Deck has no Common Back at all.
    expect(result.cards.map((card) => card.nodeId)).toEqual([magicianId]);
    expect(result.cards[0].back).toEqual({ nodeId: foolId, name: "fool.jpg" });
  });

  it("prefers an individual back over the common back, and mixes with common-backed cards", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );
    const towerId = await addReadyFile(
      userDataDO,
      deck.id,
      "tower.png",
      "image/png",
    );

    // Common Back = fool; the magician gets its own Individual Back (priestess).
    await userDataDO.setDeckCommonBack(deck.id, foolId);
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, priestessId);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    // fool (common back) and priestess (individual back) both drop out; magician
    // and tower remain as Cards.
    const byId = new Map(result.cards.map((card) => [card.nodeId, card.back]));
    expect(new Set(byId.keys())).toEqual(new Set([magicianId, towerId]));
    // The magician's Individual Back wins over the Common Back...
    expect(byId.get(magicianId)).toEqual({
      nodeId: priestessId,
      name: "priestess.png",
    });
    // ...while the tower, with no Individual Back, falls back to the Common Back.
    expect(byId.get(towerId)).toEqual({ nodeId: foolId, name: "fool.jpg" });
  });

  it("mixes cards that have a back with cards that have none", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    // magician gets fool as its Individual Back; priestess is left with none, and
    // there is no Common Back to fall back on.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    const byId = new Map(result.cards.map((card) => [card.nodeId, card.back]));
    expect(new Set(byId.keys())).toEqual(new Set([magicianId, priestessId]));
    expect(byId.get(magicianId)).toEqual({ nodeId: foolId, name: "fool.jpg" });
    expect(byId.get(priestessId)).toBeNull();
  });

  it("returns the back to being a card when its pairing is removed", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, null);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    // With the pairing gone, the fool is a Card again and nothing has a back.
    expect(new Set(result.cards.map((card) => card.nodeId))).toEqual(
      new Set([foolId, magicianId]),
    );
    expect(result.cards.every((card) => card.back === null)).toBe(true);
  });

  it("treats a pairing as inert once its back image is deleted", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);
    // Hard-delete the back image: the stored pairing is not a foreign key, so it
    // goes inert rather than dangling.
    await userDataDO.dangerouslyHardDeleteNodes([foolId]);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    // The magician is a Card again, with no back — the inert pairing attaches
    // nothing.
    expect(result.cards.map((card) => card.nodeId)).toEqual([magicianId]);
    expect(result.cards[0].back).toBeNull();
  });

  it("makes a pairing inert when its front is later made the common back", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    // Pair magician → fool, then make the magician the common back. The pairing's
    // front is now the common back, so it must go inert: fool returns to being a
    // Card rather than vanishing alongside the magician.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);
    await userDataDO.setDeckCommonBack(deck.id, magicianId);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    expect(result.cards.map((card) => card.nodeId)).toEqual([foolId]);
    // With the pairing inert, fool falls back to the common back (the magician).
    expect(result.cards[0].back).toEqual({
      nodeId: magicianId,
      name: "magician.png",
    });
  });

  it("revives an individual-back pairing when the common back moves off its front", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();

    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);
    await userDataDO.setDeckCommonBack(deck.id, magicianId);
    // Move the common back away from the magician: the stored pairing revives, so
    // the magician is a Card backed by fool again and fool drops out.
    await userDataDO.setDeckCommonBack(deck.id, null);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    expect(result.cards.map((card) => card.nodeId)).toEqual([magicianId]);
    expect(result.cards[0].back).toEqual({ nodeId: foolId, name: "fool.jpg" });
  });

  it("rejects using an image that is already a back as a front", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    // fool is now the magician's back, so it is no longer a Card — it cannot be
    // given a back of its own.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);

    const result = await userDataDO.setDeckIndividualBack(
      deck.id,
      foolId,
      priestessId,
    );
    expect(result.result).toBe("invalid-front");
  });

  it("rejects a back that already has its own back, preventing chains", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    // magician already has fool as its back. Pairing priestess → magician would
    // chain (priestess → magician → fool), hiding magician; reject it.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);

    const result = await userDataDO.setDeckIndividualBack(
      deck.id,
      priestessId,
      magicianId,
    );
    expect(result.result).toBe("invalid-back");
  });

  it("rejects a back already assigned to another front", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    // fool already backs the magician, so it cannot also back the priestess — a
    // back serves exactly one Card.
    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);

    const result = await userDataDO.setDeckIndividualBack(
      deck.id,
      priestessId,
      foolId,
    );
    expect(result.result).toBe("invalid-back");
  });

  it("rejects the common back as an individual back or front", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    await userDataDO.setDeckCommonBack(deck.id, foolId);

    // The Common Back is not a Card, so it can be neither a front...
    const asFront = await userDataDO.setDeckIndividualBack(
      deck.id,
      foolId,
      priestessId,
    );
    expect(asFront.result).toBe("invalid-front");
    // ...nor an Individual Back.
    const asBack = await userDataDO.setDeckIndividualBack(
      deck.id,
      magicianId,
      foolId,
    );
    expect(asBack.result).toBe("invalid-back");
  });

  it("allows re-pointing a front that already has a back", async () => {
    const { userDataDO, deck, foolId, magicianId } = await setUp();
    const priestessId = await addReadyFile(
      userDataDO,
      deck.id,
      "priestess.png",
      "image/png",
    );

    await userDataDO.setDeckIndividualBack(deck.id, magicianId, foolId);
    // Re-pointing the magician at a new back is fine: it is still a Card. The old
    // back (fool) returns to being a Card.
    const result = await userDataDO.setDeckIndividualBack(
      deck.id,
      magicianId,
      priestessId,
    );
    expect(result.result).toBe("ok");

    const cards = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(cards.result).toBe("ok");
    if (cards.result !== "ok") return;
    const byId = new Map(cards.cards.map((card) => [card.nodeId, card.back]));
    expect(new Set(byId.keys())).toEqual(new Set([magicianId, foolId]));
    expect(byId.get(magicianId)).toEqual({
      nodeId: priestessId,
      name: "priestess.png",
    });
    expect(byId.get(foolId)).toBeNull();
  });

  it("gives every card no back when the deck has no common back", async () => {
    const { userDataDO, deck } = await setUp();

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });

    // Assert success first, so a mistaken no-access/not-a-deck fails the test
    // rather than skipping the real assertion.
    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    expect(result.cards.every((card) => card.back === null)).toBe(true);
  });

  it("reports allowFaceDown, defaulting to false and travelling once set", async () => {
    const { userDataDO, deck } = await setUp();

    const before = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(before.result).toBe("ok");
    if (before.result !== "ok") return;
    expect(before.allowFaceDown).toBe(false);

    await userDataDO.setDeckAllowFaceDown(deck.id, true);

    const after = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(after.result).toBe("ok");
    if (after.result !== "ok") return;
    expect(after.allowFaceDown).toBe(true);
  });

  it("reports allowInverted, defaulting to false and travelling once set", async () => {
    const { userDataDO, deck } = await setUp();

    const before = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(before.result).toBe("ok");
    if (before.result !== "ok") return;
    expect(before.allowInverted).toBe(false);

    await userDataDO.setDeckAllowInverted(deck.id, true);

    const after = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(after.result).toBe("ok");
    if (after.result !== "ok") return;
    expect(after.allowInverted).toBe(true);
  });

  it("keeps allowFaceDown and allowInverted independent", async () => {
    const { userDataDO, deck } = await setUp();

    // Setting one leaves the other alone: the two are orthogonal Deck settings.
    await userDataDO.setDeckAllowInverted(deck.id, true);

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: ROOM_ID,
    });
    expect(result.result).toBe("ok");
    if (result.result !== "ok") return;
    expect(result.allowInverted).toBe(true);
    expect(result.allowFaceDown).toBe(false);
  });

  it("rejects a shared folder that is not a deck", async () => {
    const { userDataDO, plainFolder } = await setUp();

    const result = await userDataDO.getDeckCards({
      nodeId: plainFolder.id,
      roomId: ROOM_ID,
    });

    // The folder is shared and reachable, but not a Deck — a drawer must not be
    // able to aim `draw` at an ordinary shared folder.
    expect(result.result).toBe("not-a-deck");
  });

  it("denies a room that holds no share for the deck", async () => {
    const { userDataDO, deck } = await setUp();

    const result = await userDataDO.getDeckCards({
      nodeId: deck.id,
      roomId: OTHER_ROOM_ID,
    });

    expect(result.result).toBe("no-access");
  });
});
