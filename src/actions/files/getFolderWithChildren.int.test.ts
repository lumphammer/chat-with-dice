import { createFolder } from "#/actions/files/createFolder";
import { deleteNode } from "#/actions/files/deleteNode";
import { getFolderWithChildren } from "#/actions/files/getFolderWithChildren";
import { setFolderIsDeck } from "#/actions/files/setFolderIsDeck";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { createUserWithDO } from "#/test-utils/integration/users";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("getFolderWithChildren (self-read path)", () => {
  it("returns the caller's root-level folders, excluding soft-deleted by default", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);

    const keep = await callAction(createFolder, { name: "Keep" }, ctx);
    const drop = await callAction(createFolder, { name: "Drop" }, ctx);
    await callAction(deleteNode, { nodeId: drop.id }, ctx);

    const { folder, nodes } = await callAction(
      getFolderWithChildren,
      { folderId: null },
      ctx,
    );
    const names = nodes.map((n) => n.name).sort();
    const ids = nodes.map((n) => n.id);

    expect(folder).toBeNull();
    expect(names).toEqual(["Keep"]);
    expect(ids).toEqual([keep.id]);
  });

  it("includes soft-deleted nodes when includeDeleted=true", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);

    await callAction(createFolder, { name: "Live" }, ctx);
    const drop = await callAction(createFolder, { name: "Dead" }, ctx);
    await callAction(deleteNode, { nodeId: drop.id }, ctx);

    const { nodes } = await callAction(
      getFolderWithChildren,
      { folderId: null, includeDeleted: true },
      ctx,
    );

    expect(nodes.map((n) => n.name).sort()).toEqual(["Dead", "Live"]);
  });

  it("returns the folder itself alongside only its children when folderId is set", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);

    const parent = await callAction(createFolder, { name: "Parent" }, ctx);
    await callAction(setFolderIsDeck, { nodeId: parent.id, isDeck: true }, ctx);
    const child = await callAction(
      createFolder,
      { name: "Child", parentFolderId: parent.id },
      ctx,
    );
    await callAction(createFolder, { name: "Sibling" }, ctx);

    const { folder, nodes } = await callAction(
      getFolderWithChildren,
      { folderId: parent.id },
      ctx,
    );

    expect(folder).toMatchObject({
      id: parent.id,
      kind: "folder",
      isDeck: true,
    });
    expect(nodes.map((n) => n.id)).toEqual([child.id]);
  });

  it("throws when the id is a file, not a folder", async () => {
    const user = await createUserWithDO();
    const userDataDO = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    const fileResult = await userDataDO.createFile(
      "cover.jpg",
      "image/jpeg",
      null,
    );
    if (fileResult.kind !== "success") {
      throw new Error("test setup: file creation failed");
    }

    await expect(
      callAction(
        getFolderWithChildren,
        { folderId: fileResult.data.id },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("throws UNAUTHORIZED when there is no logged-in user", async () => {
    await expect(
      callAction(
        getFolderWithChildren,
        { folderId: null },
        makeActionContext(null),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
