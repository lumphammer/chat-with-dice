import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { hardDeleteNode } from "#/actions/files/hardDeleteNode";
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

function countNodeRows(userDataDOId: string, nodeId: string) {
  const stub = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(userDataDOId),
  );
  return runInDurableObject(stub, async (_instance, state) => {
    const [row] = state.storage.sql
      .exec("SELECT COUNT(*) AS count FROM nodes WHERE id = ?", nodeId)
      .toArray() as Array<{ count: number }>;
    return row.count;
  });
}

describe("hardDeleteNode", () => {
  it("removes a soft-deleted node row entirely", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Vapor" }, ctx);
    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    expect(await countNodeRows(user.userDataDOId, folder.id)).toBe(1);

    const result = await callAction(hardDeleteNode, { nodeId: folder.id }, ctx);

    expect(result).toMatchObject({ kind: "success" });
    expect(await countNodeRows(user.userDataDOId, folder.id)).toBe(0);
  });

  it("returns a NOT_FOUND envelope when the node has not been soft-deleted first", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "StillLive" }, ctx);

    const result = await callAction(hardDeleteNode, { nodeId: folder.id }, ctx);

    expect(result).toMatchObject({ kind: "error", code: "NOT_FOUND" });
    // and the row is still there
    expect(await countNodeRows(user.userDataDOId, folder.id)).toBe(1);
  });

  it("returns a NOT_FOUND envelope when the nodeId does not exist", async () => {
    const user = await attachUserDataDO(await createTestUser());

    const result = await callAction(
      hardDeleteNode,
      { nodeId: "no-such-node" },
      makeActionContext(user),
    );

    expect(result).toMatchObject({ kind: "error", code: "NOT_FOUND" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await attachUserDataDO(
      await createTestUser({ isAnonymous: true }),
    );

    await expect(
      callAction(
        hardDeleteNode,
        { nodeId: "irrelevant" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
