import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import {
  attachUserDataDO,
  createTestUser,
} from "#/test-utils/integration/users";
import { runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

type NodeRow = { id: string; deleted_time: number | null };

function getNode(userDataDOId: string, nodeId: string) {
  const stub = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(userDataDOId),
  );
  return runInDurableObject(stub, async (_instance, state) => {
    const [row] = state.storage.sql
      .exec("SELECT id, deleted_time FROM nodes WHERE id = ?", nodeId)
      .toArray() as NodeRow[];
    return row;
  });
}

describe("deleteNode", () => {
  it("soft-deletes the node by setting deleted_time", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Doomed" }, ctx);

    const before = await getNode(user.userDataDOId, folder.id);
    expect(before.deleted_time).toBeNull();

    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    const after = await getNode(user.userDataDOId, folder.id);
    expect(typeof after.deleted_time).toBe("number");
    expect(after.deleted_time).toBeGreaterThan(0);
  });

  it("throws when the nodeId does not exist", async () => {
    const user = await attachUserDataDO(await createTestUser());

    await expect(
      callAction(
        deleteNode,
        { nodeId: "no-such-node" },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await attachUserDataDO(
      await createTestUser({ isAnonymous: true }),
    );

    await expect(
      callAction(deleteNode, { nodeId: "irrelevant" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
