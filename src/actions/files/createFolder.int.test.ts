import { createFolder } from "#/actions/files/createFolder";
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

describe("createFolder", () => {
  it("creates a folder via the user's UserDataDO and returns its id and name", async () => {
    const user = await attachUserDataDO(await createTestUser());

    const result = await callAction(
      createFolder,
      { name: "My Folder" },
      makeActionContext(user),
    );

    expect(result).toMatchObject({ name: "My Folder" });
    expect(typeof result.id).toBe("string");
    expect(result.id.length).toBeGreaterThan(0);

    const stub = env.USER_DATA_DO.get(
      env.USER_DATA_DO.idFromString(user.userDataDOId),
    );
    const nodes = await runInDurableObject(stub, async (_instance, state) => {
      return state.storage.sql
        .exec("SELECT id, name FROM nodes WHERE id = ?", result.id)
        .toArray();
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ id: result.id, name: "My Folder" });
  });

  it("rejects with UNAUTHORIZED when the user has no userDataDOId", async () => {
    const user = await createTestUser(); // no DO id attached

    await expect(
      callAction(createFolder, { name: "Nope" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects with UNAUTHORIZED when the caller is anonymous", async () => {
    const user = await attachUserDataDO(
      await createTestUser({ isAnonymous: true }),
    );

    await expect(
      callAction(createFolder, { name: "Nope" }, makeActionContext(user)),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects with a duplicate-name error when a sibling folder already exists", async () => {
    const user = await attachUserDataDO(await createTestUser());

    await callAction(createFolder, { name: "Dupes" }, makeActionContext(user));

    await expect(
      callAction(createFolder, { name: "Dupes" }, makeActionContext(user)),
    ).rejects.toThrow(/already exists/i);
  });
});
