import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { restoreNode } from "#/actions/files/restoreNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import {
  ROOM_NOTIFICATIONS_KEY,
  type RoomNotification,
} from "#/test-utils/integration/testWorker";
import { createUserWithDO } from "#/test-utils/integration/users";
import { UserDataRepository } from "#/workers/UserDataDO/UserDataRepository";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const ROOM_ID = "the-room";

/**
 * `findSharesAtOrBelow` is a repository query, so the tests reach it through a
 * repository built over the DO's own storage rather than the DO's private
 * field. `setupDB` re-runs migrations, which is idempotent.
 */
const findSharesAtOrBelow = (userDataDOId: string, nodeId: string) =>
  runInDurableObject(
    env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(userDataDOId)),
    async (_instance, state) =>
      new UserDataRepository(state).findSharesAtOrBelow(nodeId),
  );

/**
 * The RPCs the room (a `ChatRoomDOStub` in tests) has received from the owner's
 * `UserDataDO`.
 */
const roomNotifications = (roomDurableObjectId: string) =>
  runInDurableObject(
    env.CHAT_ROOM_DO.get(env.CHAT_ROOM_DO.idFromString(roomDurableObjectId)),
    async (_instance, state) =>
      (await state.storage.get<RoomNotification[]>(ROOM_NOTIFICATIONS_KEY)) ??
      [],
  );

/**
 * `/Decks/Magus`, with a share on whichever folders are named. Each tree gets
 * its own room, so one test's notifications never show up in another's.
 */
async function setUpTree(shareOn: ("parent" | "child")[]) {
  const user = await createUserWithDO();
  const roomDurableObjectId = env.CHAT_ROOM_DO.newUniqueId().toString();
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
    shareOn.map((which) =>
      userDataDO.shareNodeWithRoom({
        nodeId: which === "parent" ? parent.id : child.id,
        roomId: ROOM_ID,
        roomDurableObjectId,
        userDisplayName: "Owner",
      }),
    ),
  );

  return { user, ctx, parent, child, roomDurableObjectId };
}

describe("findSharesAtOrBelow", () => {
  it("finds a share on the node itself and reports it available", async () => {
    const { user, child, roomDurableObjectId } = await setUpTree(["child"]);

    const rows = await findSharesAtOrBelow(user.userDataDOId, child.id);

    expect(rows).toEqual([
      {
        node_id: child.id,
        room_id: ROOM_ID,
        room_durable_object_id: roomDurableObjectId,
        unavailable: 0,
      },
    ]);
  });

  it("reports the share unavailable once the node is binned", async () => {
    const { user, ctx, child } = await setUpTree(["child"]);

    await callAction(deleteNode, { nodeId: child.id }, ctx);
    const rows = await findSharesAtOrBelow(user.userDataDOId, child.id);

    expect(rows).toMatchObject([{ node_id: child.id, unavailable: 1 }]);
  });

  it("tells the room when a share is binned, and again when it is restored", async () => {
    const { user, ctx, child, roomDurableObjectId } = await setUpTree([
      "child",
    ]);

    await callAction(deleteNode, { nodeId: child.id }, ctx);
    await callAction(restoreNode, { nodeId: child.id }, ctx);

    expect(await roomNotifications(roomDurableObjectId)).toEqual([
      {
        method: "onShareAvailabilityChange",
        args: [[{ ownerUserId: user.id, nodeId: child.id, unavailable: true }]],
      },
      {
        method: "onShareAvailabilityChange",
        args: [
          [{ ownerUserId: user.id, nodeId: child.id, unavailable: false }],
        ],
      },
    ]);
  });

  it("tells the room once about every share below a binned folder", async () => {
    // Both shares go to the same room, so binning Decks should send one RPC
    // carrying both changes, including the one shadowed on Magus.
    const { user, ctx, parent, child, roomDurableObjectId } = await setUpTree([
      "parent",
      "child",
    ]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);

    const notifications = await roomNotifications(roomDurableObjectId);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      method: "onShareAvailabilityChange",
    });
    expect(notifications[0].args[0]).toEqual(
      expect.arrayContaining([
        { ownerUserId: user.id, nodeId: parent.id, unavailable: true },
        { ownerUserId: user.id, nodeId: child.id, unavailable: true },
      ]),
    );
    expect(notifications[0].args[0]).toHaveLength(2);
  });

  it("finds shares below the binned node, and reports them shadowed", async () => {
    // The grant is on Magus; binning Decks shadows it. Notifying only about
    // shares *on* the binned node would miss this one entirely.
    const { user, ctx, parent, child } = await setUpTree(["child"]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);
    const rows = await findSharesAtOrBelow(user.userDataDOId, parent.id);

    expect(rows).toMatchObject([{ node_id: child.id, unavailable: 1 }]);
  });

  it("finds every affected share when a folder holding several is binned", async () => {
    const { user, ctx, parent, child } = await setUpTree(["parent", "child"]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);
    const rows = await findSharesAtOrBelow(user.userDataDOId, parent.id);

    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.unavailable === 1)).toBe(true);
    expect(rows.map((row) => row.node_id)).toEqual(
      expect.arrayContaining([parent.id, child.id]),
    );
  });

  it("reports shares available again once the binned ancestor is restored", async () => {
    const { user, ctx, parent, child } = await setUpTree(["child"]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);
    await callAction(restoreNode, { nodeId: parent.id }, ctx);
    const rows = await findSharesAtOrBelow(user.userDataDOId, parent.id);

    expect(rows).toMatchObject([{ node_id: child.id, unavailable: 0 }]);
  });

  it("keeps a share unavailable while any other ancestor is still binned", async () => {
    // Why availability is recomputed per share rather than inferred from the
    // operation: this restore does not make Magus reachable again.
    const { user, ctx, parent, child } = await setUpTree(["child"]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);
    await callAction(deleteNode, { nodeId: child.id }, ctx);
    await callAction(restoreNode, { nodeId: parent.id }, ctx);
    const rows = await findSharesAtOrBelow(user.userDataDOId, parent.id);

    expect(rows).toMatchObject([{ node_id: child.id, unavailable: 1 }]);
  });

  it("ignores shares outside the binned subtree", async () => {
    const { user, ctx, parent, child } = await setUpTree(["parent"]);

    await callAction(deleteNode, { nodeId: parent.id }, ctx);

    // Asking about Magus finds nothing: the grant is on Decks, above it.
    expect(await findSharesAtOrBelow(user.userDataDOId, child.id)).toEqual([]);
  });
});
