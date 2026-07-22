import { createFolder } from "#/actions/files/createFolder";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { createUserWithDO } from "#/test-utils/integration/users";
import { UserDataRepository } from "#/workers/UserDataDO/UserDataRepository";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ROOM_ID = "the-room";
const ROOM_DO_ID = "the-room-do";
const OTHER_ROOM_ID = "other-room";
const OTHER_ROOM_DO_ID = "other-room-do";

/**
 * `findRoomsSharingNode` is a repository query, so the tests reach it through a
 * repository built over the DO's own storage rather than the DO's private
 * field, exactly as `shareAvailability.int.test.ts` does.
 */
const findRoomsSharingNode = (userDataDOId: string, nodeId: string) =>
  runInDurableObject(
    env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(userDataDOId)),
    async (_instance, state) =>
      new UserDataRepository(state).findRoomsSharingNode(nodeId),
  );

/** `/Decks/Magus`, with a share on whichever folders/rooms are named. */
async function setUpTree(
  shares: { on: "parent" | "child"; roomId: string; roomDoId: string }[],
) {
  const user = await createUserWithDO();
  const ctx = makeActionContext(user);
  const parent = await callAction(createFolder, { name: "Decks" }, ctx);
  const child = await callAction(
    createFolder,
    { name: "Magus", parentFolderId: parent.id },
    ctx,
  );
  const userDataDO = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(user.userDataDOId),
  );

  await Promise.all(
    shares.map((share) =>
      userDataDO.shareNodeWithRoom({
        nodeId: share.on === "parent" ? parent.id : child.id,
        roomId: share.roomId,
        roomDurableObjectId: share.roomDoId,
        userDisplayName: "Owner",
      }),
    ),
  );

  return { user, ctx, parent, child };
}

describe("findRoomsSharingNode", () => {
  it("finds the room DO for a share on the node itself", async () => {
    const { user, child } = await setUpTree([
      { on: "child", roomId: ROOM_ID, roomDoId: ROOM_DO_ID },
    ]);

    expect(await findRoomsSharingNode(user.userDataDOId, child.id)).toEqual([
      ROOM_DO_ID,
    ]);
  });

  it("ignores a share on an ancestor of the node", async () => {
    // The Deck-status fan-out only touches shares *on* the Deck folder: a Deck
    // shows in the Cards sidebar only when the folder itself is shared, so a
    // share on the parent is irrelevant to the child's Deck status.
    const { user, child } = await setUpTree([
      { on: "parent", roomId: ROOM_ID, roomDoId: ROOM_DO_ID },
    ]);

    expect(await findRoomsSharingNode(user.userDataDOId, child.id)).toEqual([]);
  });

  it("ignores a share on a descendant of the node", async () => {
    const { user, parent } = await setUpTree([
      { on: "child", roomId: ROOM_ID, roomDoId: ROOM_DO_ID },
    ]);

    expect(await findRoomsSharingNode(user.userDataDOId, parent.id)).toEqual(
      [],
    );
  });

  it("finds every room a node is shared with", async () => {
    const { user, child } = await setUpTree([
      { on: "child", roomId: ROOM_ID, roomDoId: ROOM_DO_ID },
      { on: "child", roomId: OTHER_ROOM_ID, roomDoId: OTHER_ROOM_DO_ID },
    ]);

    const rooms = await findRoomsSharingNode(user.userDataDOId, child.id);

    expect(rooms.sort()).toEqual([ROOM_DO_ID, OTHER_ROOM_DO_ID].sort());
  });

  it("returns nothing for a node that is not shared", async () => {
    const { user, child } = await setUpTree([]);

    expect(await findRoomsSharingNode(user.userDataDOId, child.id)).toEqual([]);
  });
});
