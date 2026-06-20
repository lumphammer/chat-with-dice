import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { restoreNode } from "#/actions/files/restoreNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { peekNode } from "#/test-utils/integration/nodes";
import { createUserWithDO } from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("restoreNode", () => {
  it("clears deleted_time on a soft-deleted node", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Phoenix" }, ctx);
    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    expect(
      (await peekNode(user.userDataDOId, folder.id))?.deleted_time,
    ).toBeGreaterThan(0);

    await callAction(restoreNode, { nodeId: folder.id }, ctx);

    expect(
      (await peekNode(user.userDataDOId, folder.id))?.deleted_time,
    ).toBeNull();
  });

  it("rejects with NOT_FOUND when the nodeId does not exist", async () => {
    const user = await createUserWithDO();

    await expect(
      callAction(
        restoreNode,
        { nodeId: "no-such-node" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(
        restoreNode,
        { nodeId: "irrelevant" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
