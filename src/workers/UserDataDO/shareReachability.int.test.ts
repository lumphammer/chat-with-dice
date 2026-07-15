import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { restoreNode } from "#/actions/files/restoreNode";
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

const getDO = (userDataDOId: string) =>
  env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(userDataDOId));

/**
 * Builds `/Decks/Magus` for the given user and shares one of them with
 * `ROOM_ID`, returning the ids and a reachability probe. `shareAt` picks which
 * folder carries the grant, which is the axis these tests turn on.
 */
async function setUpSharedTree(shareAt: "parent" | "child") {
  const user = await createUserWithDO();
  const ctx = makeActionContext(user);
  const parent = await callAction(createFolder, { name: "Decks" }, ctx);
  const child = await callAction(
    createFolder,
    { name: "Magus", parentFolderId: parent.id },
    ctx,
  );
  const userDataDO = getDO(user.userDataDOId);

  await userDataDO.shareNodeWithRoom({
    nodeId: shareAt === "parent" ? parent.id : child.id,
    roomId: ROOM_ID,
    roomDurableObjectId: ROOM_DO_ID,
    userDisplayName: "Owner",
  });

  return {
    ctx,
    parent,
    child,
    isReachable: (nodeId: string, roomId = ROOM_ID) =>
      userDataDO.isNodeAccessibleFromRoom({ nodeId, roomId }),
  };
}

describe("share reachability", () => {
  it("grants access to a shared folder", async () => {
    const { child, isReachable } = await setUpSharedTree("child");

    expect(await isReachable(child.id)).toBe(true);
  });

  it("grants access to descendants of a shared folder", async () => {
    const { child, isReachable } = await setUpSharedTree("parent");

    expect(await isReachable(child.id)).toBe(true);
  });

  it("denies a room that holds no share", async () => {
    const { child, isReachable } = await setUpSharedTree("child");

    expect(await isReachable(child.id, OTHER_ROOM_ID)).toBe(false);
  });

  it("denies access once the shared folder is deleted", async () => {
    const { ctx, child, isReachable } = await setUpSharedTree("child");

    await callAction(deleteNode, { nodeId: child.id }, ctx);

    expect(await isReachable(child.id)).toBe(false);
  });

  it("denies access to a shared folder shadowed by a deleted ancestor", async () => {
    const { ctx, parent, child, isReachable } = await setUpSharedTree("child");

    // The grant is on Magus, but binning Decks puts Magus in the trash too.
    // The share row survives — soft delete is reversible — so reachability is
    // the only thing standing between the room and a folder the owner binned.
    await callAction(deleteNode, { nodeId: parent.id }, ctx);

    expect(await isReachable(child.id)).toBe(false);
  });

  it("restores access when the deleted ancestor is restored", async () => {
    const { ctx, parent, child, isReachable } = await setUpSharedTree("child");

    await callAction(deleteNode, { nodeId: parent.id }, ctx);
    await callAction(restoreNode, { nodeId: parent.id }, ctx);

    expect(await isReachable(child.id)).toBe(true);
  });
});
