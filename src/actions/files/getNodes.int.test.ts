import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { getNodes } from "#/actions/files/getNodes";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import {
  attachUserDataDO,
  createTestUser,
} from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("getNodes (self-read path)", () => {
  it("returns the caller's root-level folders, excluding soft-deleted by default", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);

    const keep = await callAction(createFolder, { name: "Keep" }, ctx);
    const drop = await callAction(createFolder, { name: "Drop" }, ctx);
    await callAction(deleteNode, { nodeId: drop.id }, ctx);

    const nodes = await callAction(getNodes, { folderId: null }, ctx);
    const names = nodes.map((n) => n.name).sort();
    const ids = nodes.map((n) => n.id);

    expect(names).toEqual(["Keep"]);
    expect(ids).toEqual([keep.id]);
  });

  it("includes soft-deleted nodes when includeDeleted=true", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);

    await callAction(createFolder, { name: "Live" }, ctx);
    const drop = await callAction(createFolder, { name: "Dead" }, ctx);
    await callAction(deleteNode, { nodeId: drop.id }, ctx);

    const nodes = await callAction(
      getNodes,
      { folderId: null, includeDeleted: true },
      ctx,
    );

    expect(nodes.map((n) => n.name).sort()).toEqual(["Dead", "Live"]);
  });

  it("returns only the children of a given folder when folderId is set", async () => {
    const user = await attachUserDataDO(await createTestUser());
    const ctx = makeActionContext(user);

    const parent = await callAction(createFolder, { name: "Parent" }, ctx);
    const child = await callAction(
      createFolder,
      { name: "Child", parentFolderId: parent.id },
      ctx,
    );
    await callAction(createFolder, { name: "Sibling" }, ctx);

    const nodes = await callAction(getNodes, { folderId: parent.id }, ctx);

    expect(nodes.map((n) => n.id)).toEqual([child.id]);
  });

  it("throws UNAUTHORIZED when there is no logged-in user", async () => {
    await expect(
      callAction(getNodes, { folderId: null }, makeActionContext(null)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
