import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { peekNode } from "#/test-utils/integration/nodes";
import { createUserWithDO } from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("deleteNode", () => {
  it("soft-deletes the node by setting deleted_time", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Doomed" }, ctx);

    const before = await peekNode(user.userDataDOId, folder.id);
    expect(before?.deleted_time).toBeNull();

    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    const after = await peekNode(user.userDataDOId, folder.id);
    expect(typeof after?.deleted_time).toBe("number");
    expect(after?.deleted_time).toBeGreaterThan(0);
  });

  it("throws when the nodeId does not exist", async () => {
    const user = await createUserWithDO();

    await expect(
      callAction(
        deleteNode,
        { nodeId: "no-such-node" },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(deleteNode, { nodeId: "irrelevant" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
