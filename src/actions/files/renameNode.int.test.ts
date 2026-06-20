import { createFolder } from "#/actions/files/createFolder";
import { renameNode } from "#/actions/files/renameNode";
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

function getNodeName(userDataDOId: string, nodeId: string) {
  const stub = env.USER_DATA_DO.get(
    env.USER_DATA_DO.idFromString(userDataDOId),
  );
  return runInDurableObject(stub, async (_instance, state) => {
    const [row] = state.storage.sql
      .exec("SELECT name FROM nodes WHERE id = ?", nodeId)
      .toArray() as Array<{ name: string }>;
    return row?.name;
  });
}

describe("renameNode", () => {
  it("updates the name on the row", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "OldName" }, ctx);

    await callAction(
      renameNode,
      { nodeId: folder.id, newName: "NewName" },
      ctx,
    );

    expect(await getNodeName(user.userDataDOId, folder.id)).toBe("NewName");
  });

  it("rejects when a sibling already has the requested name", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);
    await callAction(createFolder, { name: "Taken" }, ctx);
    const other = await callAction(createFolder, { name: "Free" }, ctx);

    await expect(
      callAction(renameNode, { nodeId: other.id, newName: "Taken" }, ctx),
    ).rejects.toThrow(/already exists/i);
  });

  it("rejects when the node does not exist", async () => {
    const user = await attachUserDataDO(await createTestUser());

    await expect(
      callAction(
        renameNode,
        { nodeId: "no-such-node", newName: "Whatever" },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await attachUserDataDO(
      await createTestUser({ isAnonymous: true }),
    );

    await expect(
      callAction(
        renameNode,
        { nodeId: "irrelevant", newName: "Whatever" },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
