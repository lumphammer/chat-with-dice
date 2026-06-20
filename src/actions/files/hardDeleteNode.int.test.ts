import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { hardDeleteNode } from "#/actions/files/hardDeleteNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { peekNode } from "#/test-utils/integration/nodes";
import { createUserWithDO } from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("hardDeleteNode", () => {
  it("removes a soft-deleted node row entirely", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Vapor" }, ctx);
    await callAction(deleteNode, { nodeId: folder.id }, ctx);

    expect(await peekNode(user.userDataDOId, folder.id)).not.toBeNull();

    const result = await callAction(hardDeleteNode, { nodeId: folder.id }, ctx);

    expect(result).toMatchObject({ kind: "success" });
    expect(await peekNode(user.userDataDOId, folder.id)).toBeNull();
  });

  it("returns a NOT_FOUND envelope when the node has not been soft-deleted first", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "StillLive" }, ctx);

    const result = await callAction(hardDeleteNode, { nodeId: folder.id }, ctx);

    expect(result).toMatchObject({ kind: "error", code: "NOT_FOUND" });
    expect(await peekNode(user.userDataDOId, folder.id)).not.toBeNull();
  });

  it("returns a NOT_FOUND envelope when the nodeId does not exist", async () => {
    const user = await createUserWithDO();

    const result = await callAction(
      hardDeleteNode,
      { nodeId: "no-such-node" },
      makeActionContext(user),
    );

    expect(result).toMatchObject({ kind: "error", code: "NOT_FOUND" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(
        hardDeleteNode,
        { nodeId: "irrelevant" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
