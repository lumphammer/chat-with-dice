import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { restoreNode } from "#/actions/files/restoreNode";
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

/** `/Decks/Magus`, with a share on whichever folders are named. */
async function setUpTree(shareOn: ("parent" | "child")[]) {
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
    shareOn.map((which) =>
      userDataDO.shareNodeWithRoom({
        nodeId: which === "parent" ? parent.id : child.id,
        roomId: ROOM_ID,
        roomDurableObjectId: ROOM_DO_ID,
        userDisplayName: "Owner",
      }),
    ),
  );

  return { user, ctx, parent, child };
}

describe("findSharesAtOrBelow", () => {
  it("finds a share on the node itself and reports it available", async () => {
    const { user, child } = await setUpTree(["child"]);

    const rows = await findSharesAtOrBelow(user.userDataDOId, child.id);

    expect(rows).toEqual([
      {
        node_id: child.id,
        room_id: ROOM_ID,
        room_durable_object_id: ROOM_DO_ID,
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
    expect(rows.map((row) => row.node_id).sort()).toEqual(
      [parent.id, child.id].sort(),
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
