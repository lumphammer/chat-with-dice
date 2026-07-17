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
