import { createFolder } from "#/actions/files/createFolder";
import {
  callAction,
  makeActionContext,
} from "#/test-utils/integration/actions";
import { peekNode } from "#/test-utils/integration/nodes";
import {
  createTestUser,
  createUserWithDO,
} from "#/test-utils/integration/users";
import { describe, expect, it } from "vitest";

describe("createFolder", () => {
  it("creates a folder via the user's UserDataDO and returns its id and name", async () => {
    const user = await createUserWithDO();

    const result = await callAction(
      createFolder,
      { name: "My Folder" },
      makeActionContext(user),
    );

    expect(result).toMatchObject({ name: "My Folder" });
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);

    const row = await peekNode(user.userDataDOId, result.id);
    expect(row).toMatchObject({ id: result.id, name: "My Folder" });
  });

  it("rejects with UNAUTHORIZED when the user has no userDataDOId", async () => {
    const user = await createTestUser(); // no DO id attached

    await expect(
      callAction(createFolder, { name: "Nope" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await createUserWithDO({ isAnonymous: true });

    await expect(
      callAction(createFolder, { name: "Nope" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects with a duplicate-name error when a sibling folder already exists", async () => {
    const user = await createUserWithDO();

    await callAction(createFolder, { name: "Dupes" }, makeActionContext(user));

    await expect(
      callAction(createFolder, { name: "Dupes" }, makeActionContext(user)),
    ).rejects.toThrow(/already exists/i);
  });
});
