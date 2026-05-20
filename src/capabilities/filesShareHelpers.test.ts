import { hasDirectRoomShare, removeDirectRoomShare } from "./filesShareHelpers";
import { describe, expect, it } from "vitest";

describe("files share helpers", () => {
  it("detects a direct room share for a matching node and owner", () => {
    expect(
      hasDirectRoomShare([{ nodeId: "node-1", userId: "owner-1" }], {
        nodeId: "node-1",
        ownerUserId: "owner-1",
      }),
    ).toBe(true);
  });

  it("does not match the same node for a different owner", () => {
    expect(
      hasDirectRoomShare([{ nodeId: "node-1", userId: "owner-2" }], {
        nodeId: "node-1",
        ownerUserId: "owner-1",
      }),
    ).toBe(false);
  });

  it("removes only the matching direct room share", () => {
    const shares = [
      { nodeId: "node-1", userId: "owner-1", label: "remove me" },
      { nodeId: "node-1", userId: "owner-2", label: "same node" },
      { nodeId: "node-2", userId: "owner-1", label: "same owner" },
    ];

    removeDirectRoomShare(shares, {
      nodeId: "node-1",
      ownerUserId: "owner-1",
    });

    expect(shares).toEqual([
      { nodeId: "node-1", userId: "owner-2", label: "same node" },
      { nodeId: "node-2", userId: "owner-1", label: "same owner" },
    ]);
  });

  it("leaves unrelated shares intact", () => {
    const shares = [
      { nodeId: "node-1", userId: "owner-2" },
      { nodeId: "node-2", userId: "owner-1" },
    ];

    removeDirectRoomShare(shares, {
      nodeId: "node-3",
      ownerUserId: "owner-1",
    });

    expect(shares).toEqual([
      { nodeId: "node-1", userId: "owner-2" },
      { nodeId: "node-2", userId: "owner-1" },
    ]);
  });
});
