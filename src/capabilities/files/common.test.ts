import { filesStateValidator } from "./common";
import { describe, expect, test } from "vitest";

// Fixture builders for each on-disk shape `filesStateValidator` must accept.
// They return plain object literals fed to `.parse(unknown)`, so the tests
// depend only on the validator's public behaviour (input shape → migrated
// output) and not on the internal per-version validators or migrations.
type Overrides = Record<string, unknown>;

// The current on-disk version `filesStateValidator` upgrades everything to.
const CURRENT_VERSION = 4;

// --- V4 (current) -----------------------------------------------------------

const v4FileNode = (overrides: Overrides = {}) => ({
  version: 1,
  id: "file-1",
  name: "report.pdf",
  parentFolderId: "",
  createdTime: 1000,
  deletedTime: null,
  sizeBytes: 42,
  kind: "file",
  contentType: "application/pdf",
  thumbnailContentType: null,
  thumbnailSizeBytes: null,
  ...overrides,
});

const v4FolderNode = (overrides: Overrides = {}) => ({
  version: 1,
  id: "folder-1",
  name: "Docs",
  parentFolderId: "",
  createdTime: 2000,
  deletedTime: null,
  sizeBytes: 0,
  kind: "folder",
  ...overrides,
});

const v4Share = (overrides: Overrides = {}) => ({
  userId: "u1",
  userDisplayName: "User One",
  dateShared: 1234,
  node: v4FileNode(),
  ...overrides,
});

// --- V3 ---------------------------------------------------------------------

const v3FileShare = (overrides: Overrides = {}) => ({
  name: "report.pdf",
  kind: "file",
  nodeId: "file-1",
  userId: "u1",
  userDisplayName: "User One",
  dateShared: 1234,
  r2Key: "r2/file-1",
  thumbnailR2Key: null,
  contentType: "application/pdf",
  sizeBytes: 99,
  ...overrides,
});

const v3FolderShare = (overrides: Overrides = {}) => ({
  name: "Docs",
  kind: "folder",
  nodeId: "folder-1",
  userId: "u2",
  userDisplayName: "User Two",
  dateShared: 4321,
  ...overrides,
});

// --- V2 (no `sizeBytes`) ----------------------------------------------------

const v2FileShare = (overrides: Overrides = {}) => ({
  name: "song.mp3",
  kind: "file",
  nodeId: "file-2",
  userId: "u1",
  userDisplayName: "User One",
  dateShared: 1234,
  r2Key: "r2/file-2",
  thumbnailR2Key: null,
  contentType: "audio/mpeg",
  ...overrides,
});

const v2FolderShare = (overrides: Overrides = {}) => ({
  name: "Music",
  kind: "folder",
  nodeId: "folder-2",
  userId: "u2",
  userDisplayName: "User Two",
  dateShared: 4321,
  ...overrides,
});

// --- V1 (no top-level `version`, no `dateShared`) ---------------------------

const v1FileShare = (overrides: Overrides = {}) => ({
  name: "old.txt",
  kind: "file",
  nodeId: "file-3",
  userId: "u1",
  userDisplayName: "User One",
  r2Key: "r2/file-3",
  thumbnailR2Key: null,
  contentType: "text/plain",
  ...overrides,
});

const v1FolderShare = (overrides: Overrides = {}) => ({
  name: "Old Folder",
  kind: "folder",
  nodeId: "folder-3",
  userId: "u2",
  userDisplayName: "User Two",
  ...overrides,
});

describe("filesStateValidator", () => {
  describe("V4 (current shape)", () => {
    test("parses a state with file and folder nodes", () => {
      const state = filesStateValidator.parse({
        version: 4,
        shares: [
          v4Share({ node: v4FileNode() }),
          v4Share({
            userId: "u2",
            userDisplayName: "User Two",
            node: v4FolderNode(),
          }),
        ],
      });

      expect(state.version).toBe(CURRENT_VERSION);
      expect(state.shares).toHaveLength(2);
      expect(state.shares[0]).toMatchObject({
        userId: "u1",
        userDisplayName: "User One",
        dateShared: 1234,
        node: { kind: "file", id: "file-1", contentType: "application/pdf" },
      });
      expect(state.shares[1]).toMatchObject({
        userId: "u2",
        node: { kind: "folder", id: "folder-1", sizeBytes: 0 },
      });
    });

    test("passes a numeric dateShared through unchanged", () => {
      const numericDateShared = 5555;
      const state = filesStateValidator.parse({
        version: 4,
        shares: [v4Share({ dateShared: numericDateShared })],
      });

      expect(state.shares[0].dateShared).toBe(numericDateShared);
    });

    test("coerces a string dateShared to epoch ms", () => {
      const state = filesStateValidator.parse({
        version: 4,
        shares: [v4Share({ dateShared: "2024-01-01T00:00:00Z" })],
      });

      expect(state.shares[0].dateShared).toBe(
        Date.parse("2024-01-01T00:00:00Z"),
      );
    });

    test("coerces a string node.createdTime to epoch ms", () => {
      const state = filesStateValidator.parse({
        version: 4,
        shares: [
          v4Share({
            node: v4FileNode({ createdTime: "2024-01-01T00:00:00Z" }),
          }),
        ],
      });

      expect(state.shares[0].node.createdTime).toBe(
        Date.parse("2024-01-01T00:00:00Z"),
      );
    });

    test("parses empty shares (matches getInitialState)", () => {
      expect(filesStateValidator.parse({ version: 4, shares: [] })).toEqual({
        version: 4,
        shares: [],
      });
    });
  });

  describe("V3 → V4 migration", () => {
    test("migrates a file share into a V4 node", () => {
      const state = filesStateValidator.parse({
        version: 3,
        shares: [v3FileShare()],
      });

      expect(state.version).toBe(CURRENT_VERSION);
      // toEqual (not toMatchObject): the migration must lift exactly
      // userId/userDisplayName/dateShared onto the share and build a clean node
      // with no leaked source keys (nodeId, r2Key, …).
      expect(state.shares[0]).toEqual({
        userId: "u1",
        userDisplayName: "User One",
        dateShared: 1234,
        node: {
          kind: "file",
          version: 1,
          id: "file-1",
          name: "report.pdf",
          parentFolderId: "",
          createdTime: 1,
          deletedTime: null,
          contentType: "application/pdf",
          thumbnailContentType: null,
          thumbnailSizeBytes: null,
          sizeBytes: 99,
        },
      });
    });

    test("falls back to application/octet-stream for a null contentType", () => {
      const state = filesStateValidator.parse({
        version: 3,
        shares: [v3FileShare({ contentType: null })],
      });

      expect(state.shares[0].node).toMatchObject({
        contentType: "application/octet-stream",
      });
    });

    test("derives thumbnail fields from thumbnailR2Key presence", () => {
      const withThumb = filesStateValidator.parse({
        version: 3,
        shares: [v3FileShare({ thumbnailR2Key: "r2/thumb" })],
      });
      expect(withThumb.shares[0].node).toMatchObject({
        thumbnailContentType: "image/webp",
        thumbnailSizeBytes: 1,
      });

      const noThumb = filesStateValidator.parse({
        version: 3,
        shares: [v3FileShare({ thumbnailR2Key: null })],
      });
      expect(noThumb.shares[0].node).toMatchObject({
        thumbnailContentType: null,
        thumbnailSizeBytes: null,
      });
    });

    test("migrates a folder share with sizeBytes 0", () => {
      const state = filesStateValidator.parse({
        version: 3,
        shares: [v3FolderShare()],
      });

      expect(state.shares[0].node).toEqual({
        kind: "folder",
        version: 1,
        id: "folder-1",
        name: "Docs",
        parentFolderId: "",
        createdTime: 1,
        deletedTime: null,
        sizeBytes: 0,
      });
    });
  });

  describe("V2 → V4 migration", () => {
    test("defaults a missing sizeBytes to 0 and builds the full node", () => {
      const state = filesStateValidator.parse({
        version: 2,
        shares: [v2FileShare()],
      });

      expect(state.version).toBe(CURRENT_VERSION);
      expect(state.shares[0].node).toEqual({
        kind: "file",
        version: 1,
        id: "file-2",
        name: "song.mp3",
        parentFolderId: "",
        createdTime: 1,
        deletedTime: null,
        contentType: "audio/mpeg",
        thumbnailContentType: null,
        thumbnailSizeBytes: null,
        sizeBytes: 0,
      });
    });

    test("migrates a folder share", () => {
      const state = filesStateValidator.parse({
        version: 2,
        shares: [v2FolderShare()],
      });

      expect(state.shares[0].node).toEqual({
        kind: "folder",
        version: 1,
        id: "folder-2",
        name: "Music",
        parentFolderId: "",
        createdTime: 1,
        deletedTime: null,
        sizeBytes: 0,
      });
    });
  });

  describe("V1 → V4 migration", () => {
    test("parses a state with no version field and defaults dateShared to 0", () => {
      const state = filesStateValidator.parse({
        shares: [v1FileShare(), v1FolderShare()],
      });

      expect(state.version).toBe(CURRENT_VERSION);
      expect(state.shares).toHaveLength(2);

      expect(state.shares[0].dateShared).toBe(0);
      expect(state.shares[0].node).toEqual({
        kind: "file",
        version: 1,
        id: "file-3",
        name: "old.txt",
        parentFolderId: "",
        createdTime: 1,
        deletedTime: null,
        contentType: "text/plain",
        thumbnailContentType: null,
        thumbnailSizeBytes: null,
        sizeBytes: 0,
      });

      expect(state.shares[1].dateShared).toBe(0);
      expect(state.shares[1].node).toEqual({
        kind: "folder",
        version: 1,
        id: "folder-3",
        name: "Old Folder",
        parentFolderId: "",
        createdTime: 1,
        deletedTime: null,
        sizeBytes: 0,
      });
    });
  });

  describe("rejection", () => {
    test("rejects an object with no shares", () => {
      expect(filesStateValidator.safeParse({}).success).toBe(false);
    });

    test("rejects a share missing required fields", () => {
      expect(
        filesStateValidator.safeParse({
          version: 4,
          shares: [{ userId: "u1" }],
        }).success,
      ).toBe(false);
    });

    test("rejects a V4 file node missing contentType (no silent fallback)", () => {
      const result = filesStateValidator.safeParse({
        version: 4,
        shares: [
          v4Share({
            node: {
              version: 1,
              id: "file-x",
              name: "x",
              parentFolderId: "",
              createdTime: 1,
              deletedTime: null,
              sizeBytes: 1,
              kind: "file",
              // contentType intentionally omitted
              thumbnailContentType: null,
              thumbnailSizeBytes: null,
            },
          }),
        ],
      });

      expect(result.success).toBe(false);
    });
  });
});
