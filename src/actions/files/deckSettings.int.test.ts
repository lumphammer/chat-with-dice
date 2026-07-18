import { createFolder } from "#/actions/files/createFolder";
import { getDeckSettings } from "#/actions/files/getDeckSettings";
import { setDeckAllowFaceDown } from "#/actions/files/setDeckAllowFaceDown";
import { setDeckCommonBack } from "#/actions/files/setDeckCommonBack";
import { setFolderIsDeck } from "#/actions/files/setFolderIsDeck";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { createUserWithDO } from "#/test-utils/integration/users";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

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

/** A Deck with two ready images and one text file, owned by a fresh user. */
async function setUpDeck() {
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
  const backId = await addReadyFile(
    userDataDO,
    deck.id,
    "back.png",
    "image/png",
  );
  const notesId = await addReadyFile(
    userDataDO,
    deck.id,
    "notes.txt",
    "text/plain",
  );

  return { user, ctx, userDataDO, deck, foolId, backId, notesId };
}

describe("deck settings actions", () => {
  it("toggles allow-face-down and reads it back", async () => {
    const { ctx, deck } = await setUpDeck();

    const initial = await callAction(getDeckSettings, { nodeId: deck.id }, ctx);
    expect(initial.allowFaceDown).toBe(false);

    await callAction(
      setDeckAllowFaceDown,
      { nodeId: deck.id, allowFaceDown: true },
      ctx,
    );

    const after = await callAction(getDeckSettings, { nodeId: deck.id }, ctx);
    expect(after.allowFaceDown).toBe(true);
  });

  it("sets and clears the common back, listing every image to pick from", async () => {
    const { ctx, deck, foolId, backId } = await setUpDeck();

    await callAction(
      setDeckCommonBack,
      { nodeId: deck.id, backNodeId: backId },
      ctx,
    );

    const set = await callAction(getDeckSettings, { nodeId: deck.id }, ctx);
    expect(set.commonBack).toEqual({ nodeId: backId, name: "back.png" });
    // The picker offers every ready image, including the one now serving as the
    // back and the other card.
    expect(new Set(set.images.map((image) => image.nodeId))).toEqual(
      new Set([foolId, backId]),
    );

    await callAction(
      setDeckCommonBack,
      { nodeId: deck.id, backNodeId: null },
      ctx,
    );
    const cleared = await callAction(getDeckSettings, { nodeId: deck.id }, ctx);
    expect(cleared.commonBack).toBeNull();
  });

  it("rejects a back that is not an image in the deck", async () => {
    const { ctx, deck, notesId } = await setUpDeck();

    await expect(
      callAction(
        setDeckCommonBack,
        { nodeId: deck.id, backNodeId: notesId },
        ctx,
      ),
    ).rejects.toThrow(/ready image in this deck/i);
  });

  it("rejects deck settings on a folder that is not a deck", async () => {
    const { ctx } = await setUpDeck();
    const plain = await callAction(createFolder, { name: "Handouts" }, ctx);

    await expect(
      callAction(getDeckSettings, { nodeId: plain.id }, ctx),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // A non-deck target is a client mistake: it comes back as BAD_REQUEST, the
    // same normalisation setDeckCommonBack uses, not a generic 500.
    await expect(
      callAction(
        setDeckAllowFaceDown,
        { nodeId: plain.id, allowFaceDown: true },
        ctx,
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an anonymous caller", async () => {
    const anon = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(
        setDeckAllowFaceDown,
        { nodeId: "irrelevant", allowFaceDown: true },
        makeActionContext(anon),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
