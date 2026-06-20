import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { restoreNode } from "#/actions/files/restoreNode";
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

function getDeletedTime(userDataDOId: string, nodeId: string) {
  const stub = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(userDataDOId),
  );
  return runInDurableObject(stub, async (_instance, state) => {
    const [row] = state.storage.sql
      .exec("SELECT deleted_time FROM nodes WHERE id = ?", nodeId)
      .toArray() as Array<{ deleted_time: number | null }>;
    return row?.deleted_time;
  });
}

describe("restoreNode", () => {
  it("clears deleted_time on a soft-deleted node", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Phoenix" }, ctx);
    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    expect(await getDeletedTime(user.userDataDOId, folder.id)).toBeGreaterThan(
      0,
    );

    await callAction(restoreNode, { nodeId: folder.id }, ctx);

    expect(await getDeletedTime(user.userDataDOId, folder.id)).toBeNull();
  });

  it("rejects with NOT_FOUND when the nodeId does not exist", async () => {
    const user = await attachUserDataDO(await createTestUser());

    await expect(
      callAction(
        restoreNode,
        { nodeId: "no-such-node" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await attachUserDataDO(
      await createTestUser({ isAnonymous: true }),
    );

    await expect(
      callAction(
        restoreNode,
        { nodeId: "irrelevant" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
