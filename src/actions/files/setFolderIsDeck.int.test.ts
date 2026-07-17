import { createFolder } from "#/actions/files/createFolder";
import { getNodes } from "#/actions/files/getNodes";
import { setFolderIsDeck } from "#/actions/files/setFolderIsDeck";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import {
  createTestUser,
  createUserWithDO,
} from "#/test-utils/integration/users";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

const getDO = (userDataDOId: string) =>
  env.USER_DATA_DO.get(env.USER_DATA_DO.idFromString(userDataDOId));

describe("setFolderIsDeck", () => {
  it("marks a folder as a deck", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Tarot" }, ctx);

    await callAction(setFolderIsDeck, { nodeId: folder.id, isDeck: true }, ctx);

    const nodes = await callAction(getNodes, { folderId: null }, ctx);
    expect(nodes.find((n) => n.id === folder.id)).toMatchObject({
      kind: "folder",
      isDeck: true,
    });
  });

  it("unmarks a folder as a deck, and the change persists on re-read", async () => {
    const user = await createUserWithDO();
    const ctx = makeActionContext(user);
    const folder = await callAction(createFolder, { name: "Tarot" }, ctx);
    await callAction(setFolderIsDeck, { nodeId: folder.id, isDeck: true }, ctx);

    await callAction(
      setFolderIsDeck,
      { nodeId: folder.id, isDeck: false },
      ctx,
    );

    const nodes = await callAction(getNodes, { folderId: null }, ctx);
    expect(nodes.find((n) => n.id === folder.id)).toMatchObject({
      kind: "folder",
      isDeck: false,
    });
  });

  it("rejects when the node is a file, not a folder", async () => {
    const user = await createUserWithDO();
    const userDataDO = getDO(user.userDataDOId);
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
        setFolderIsDeck,
        { nodeId: fileResult.data.id, isDeck: true },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/only folders/i);
  });

  it("rejects when the node does not exist", async () => {
    const user = await createUserWithDO();

    await expect(
      callAction(
        setFolderIsDeck,
        { nodeId: "no-such-node", isDeck: true },
        makeActionContext(user),
      ),
    ).rejects.toThrow(/not found/i);
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(
        setFolderIsDeck,
        { nodeId: "irrelevant", isDeck: true },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects with INTERNAL_SERVER_ERROR when the user has no userDataDOId", async () => {
    const user = await createTestUser(); // no DO id attached

    await expect(
      callAction(
        setFolderIsDeck,
        { nodeId: "irrelevant", isDeck: true },
        makeActionContext(user),
      ),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
