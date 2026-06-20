import { createFolder } from "#/actions/files/createFolder";
import { renameNode } from "#/actions/files/renameNode";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { peekNode } from "#/test-utils/integration/nodes";
import { createUserWithDO } from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("renameNode", () => {
  it("updates the name on the row", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "OldName" }, ctx);

    await callAction(
      renameNode,
      { nodeId: folder.id, newName: "NewName" },
      ctx,
    );

    expect((await peekNode(user.userDataDOId, folder.id))?.name).toBe(
      "NewName",
    );
  });

  it("rejects when a sibling already has the requested name", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    await callAction(createFolder, { name: "Taken" }, ctx);
    const other = await callAction(createFolder, { name: "Free" }, ctx);

    await expect(
      callAction(renameNode, { nodeId: other.id, newName: "Taken" }, ctx),
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects when the node does not exist", async () => {
    const user = await createUserWithDO();

    await expect(
      callAction(
        renameNode,
        { nodeId: "no-such-node", newName: "Whatever" },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(
        renameNode,
        { nodeId: "irrelevant", newName: "Whatever" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
