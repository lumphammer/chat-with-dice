import { roomConfigValidator } from "./roomConfigValidator";
import { describe, expect, test } from "vitest";

describe("roomConfigValidator", () => {
  test("preserves a native Havoc Engine capability", () => {
    const config = {
      version: 1,
      capabilities: [{ name: "havoc", config: { source: "native" } }],
    };

    expect(roomConfigValidator.parse(config)).toEqual(config);
  });

  test.each(["objectives", "adversaries"])(
    "normalizes the legacy %s capability to Havoc Engine",
    (legacyName) => {
      expect(
        roomConfigValidator.parse({
          version: 1,
          capabilities: [{ name: legacyName, config: { source: legacyName } }],
        }),
      ).toEqual({
        version: 1,
        capabilities: [{ name: "havoc", config: { source: legacyName } }],
      });
    },
  );

  test("collapses both legacy capabilities and preserves the first config", () => {
    expect(
      roomConfigValidator.parse({
        version: 1,
        capabilities: [
          { name: "objectives", config: { source: "first" } },
          { name: "adversaries", config: { source: "second" } },
        ],
      }),
    ).toEqual({
      version: 1,
      capabilities: [{ name: "havoc", config: { source: "first" } }],
    });
  });

  test("deduplicates mixed native and legacy Havoc Engine entries", () => {
    expect(
      roomConfigValidator.parse({
        version: 1,
        capabilities: [
          { name: "adversaries", config: { source: "legacy" } },
          { name: "havoc", config: { source: "native" } },
          { name: "objectives", config: { source: "other legacy" } },
        ],
      }),
    ).toEqual({
      version: 1,
      capabilities: [{ name: "havoc", config: { source: "legacy" } }],
    });
  });

  test("preserves unrelated capabilities, configs, and ordering", () => {
    expect(
      roomConfigValidator.parse({
        version: 1,
        capabilities: [
          { name: "roll", config: { first: true } },
          { name: "objectives", config: { middle: true } },
          { name: "cards", config: { last: true } },
        ],
      }),
    ).toEqual({
      version: 1,
      capabilities: [
        { name: "roll", config: { first: true } },
        { name: "havoc", config: { middle: true } },
        { name: "cards", config: { last: true } },
      ],
    });
  });

  test("continues filtering invalid capability entries", () => {
    expect(
      roomConfigValidator.parse({
        version: 1,
        capabilities: [
          null,
          "invalid",
          { name: "not-a-capability", config: {} },
          { name: "havoc", config: {} },
        ],
      }),
    ).toEqual({
      version: 1,
      capabilities: [{ name: "havoc", config: {} }],
    });
  });
});
