import { createCapabilityCommon } from "#/capabilities/createCapabilityCommon";
import { fixStringTimestampThatShouldBeEpochMs } from "#/utils/fixStringTimestampThatShouldBeEpochMs.ts";
import { storageNodeValidator } from "#/validators/storageNodeValidator.ts";
import * as z from "zod/v4";

// oxlint-disable-next-line no-magic-numbers
const FILES_STATE_VERSION = 4 as const;

const filesStateValidatorV1 = z.object({
  shares: z.array(
    z.discriminatedUnion("kind", [
      z.object({
        name: z.string(),
        kind: z.literal("file"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      z.object({
        name: z.string(),
        kind: z.literal("folder"),
        nodeId: z.string(),
        userId: z.string(),
        userDisplayName: z.string(),
      }),
    ]),
  ),
});

const coreFieldsV2Validator = z.object({
  name: z.string(),
  nodeId: z.string(),
  userId: z.string(),
  userDisplayName: z.string(),
  dateShared: z.int(),
});

const filesStateValidatorV2 = z.object({
  version: z.literal(2),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV2Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable().nullable(),
      }),
      coreFieldsV2Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

const coreFieldsV3Validator = coreFieldsV2Validator;

const filesStateValidatorV3 = z.object({
  // oxlint-disable-next-line no-magic-numbers
  version: z.literal(3),
  shares: z.array(
    z.discriminatedUnion("kind", [
      coreFieldsV3Validator.extend({
        kind: z.literal("file"),
        r2Key: z.string(),
        thumbnailR2Key: z.string().nullable(),
        contentType: z.string().nullable(),
        sizeBytes: z.int(),
      }),
      coreFieldsV3Validator.extend({
        kind: z.literal("folder"),
      }),
    ]),
  ),
});

const filesStateValidatorV4 = z.object({
  version: z.literal(FILES_STATE_VERSION),
  shares: z.array(
    z.object({
      userId: z.string(),
      userDisplayName: z.string(),
      dateShared: z.preprocess(
        fixStringTimestampThatShouldBeEpochMs,
        z.number(),
      ),
      node: storageNodeValidator,
    }),
  ),
});

const migrateStateV1ToV2 = (
  v1: z.infer<typeof filesStateValidatorV1>,
): z.infer<typeof filesStateValidatorV2> => ({
  version: 2,
  shares: v1.shares.map((s) => ({ ...s, dateShared: 0 })),
});

const migrateStateV2ToV3 = (
  v2: z.infer<typeof filesStateValidatorV2>,
): z.infer<typeof filesStateValidatorV3> => ({
  version: 3,
  shares: v2.shares.map((s) =>
    s.kind === "file" ? { ...s, sizeBytes: 0 } : s,
  ),
});

const migrateStateV3ToV4 = (
  v3: z.infer<typeof filesStateValidatorV3>,
): z.infer<typeof filesStateValidatorV4> => ({
  version: FILES_STATE_VERSION,
  shares: v3.shares.map((v3Share) => {
    return {
      dateShared: v3Share.dateShared,
      userDisplayName: v3Share.userDisplayName,
      userId: v3Share.userId,
      node:
        v3Share.kind === "folder"
          ? {
              ...v3Share,
              kind: "folder",
              version: 1,
              id: v3Share.nodeId,
              parentFolderId: "",
              createdTime: 1,
              deletedTime: null,
              sizeBytes: 0,
            }
          : {
              ...v3Share,
              kind: "file",
              version: 1,
              id: v3Share.nodeId,
              parentFolderId: "",
              createdTime: 1,
              deletedTime: null,
              contentType: v3Share.contentType ?? "application/octet-stream",
              thumbnailContentType: v3Share.thumbnailR2Key
                ? "image/webp"
                : null,
              thumbnailSizeBytes: v3Share.thumbnailR2Key ? 1 : null,
              sizeBytes: v3Share.sizeBytes,
            },
    };
  }),
});

const filesStateValidator = z.union([
  filesStateValidatorV4,
  filesStateValidatorV3.transform(migrateStateV3ToV4),
  filesStateValidatorV2
    .transform(migrateStateV2ToV3)
    .transform(migrateStateV3ToV4),
  filesStateValidatorV1
    .transform(migrateStateV1ToV2)
    .transform(migrateStateV2ToV3)
    .transform(migrateStateV3ToV4),
]);

const sharedItemMessageDataValidatorV1 = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("file"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
    contentType: z.string().nullable(),
    sizeBytes: z.int(),
    thumbnailR2Key: z.string().nullable(),
  }),
  z.object({
    kind: z.literal("folder"),
    nodeId: z.string(),
    name: z.string(),
    userId: z.string(),
    userDisplayName: z.string(),
  }),
]);

const sharedItemMessageDataValidatorV2 =
  filesStateValidatorV3.shape.shares.element;

const sharedItemMessageDataValidatorV3 =
  filesStateValidatorV4.shape.shares.element;

const migrateMessageV1ToV2 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV1>,
): z.infer<typeof sharedItemMessageDataValidatorV2> => {
  if (data.kind === "file") {
    return {
      ...data,
      dateShared: 0,
      r2Key: "/some/fake/r2Key",
    };
  } else {
    return {
      ...data,
      dateShared: 0,
    };
  }
};

const migrateMessageV2ToV3 = (
  data: z.infer<typeof sharedItemMessageDataValidatorV2>,
): z.infer<typeof sharedItemMessageDataValidatorV3> => {
  return {
    dateShared: data.dateShared,
    userDisplayName: data.userDisplayName,
    userId: data.userId,
    node:
      data.kind === "folder"
        ? {
            version: 1,
            kind: "folder",
            id: data.nodeId,
            name: data.name,
            parentFolderId: "",
            createdTime: 1,
            deletedTime: null,
            sizeBytes: 1,
          }
        : {
            version: 1,
            kind: "file",
            name: data.name,
            parentFolderId: "",
            contentType: data.contentType ?? "application/octet-stream",
            thumbnailContentType: data.thumbnailR2Key ? "image/webp" : null,
            thumbnailSizeBytes: data.thumbnailR2Key ? 1 : null,
            createdTime: 1,
            deletedTime: null,
            id: data.nodeId,
            sizeBytes: 1,
          },
  };
};

export const sharedItemMessageDataValidator = z.union([
  sharedItemMessageDataValidatorV3,
  sharedItemMessageDataValidatorV2.transform(migrateMessageV2ToV3),
  sharedItemMessageDataValidatorV1
    .transform(migrateMessageV1ToV2)
    .transform(migrateMessageV2ToV3),
]);

type FilesState = z.infer<typeof filesStateValidator>;

export type SharedItem = FilesState["shares"][number];

export const filesCommon = createCapabilityCommon({
  name: "files",
  displayName: "Files",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: filesStateValidator,
  getInitialState: () => ({
    version: FILES_STATE_VERSION,
    shares: [],
  }),
  messageDataValidator: sharedItemMessageDataValidator,
  buildActions({ createAction }) {
    return {
      shareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
        }),
      }),
      renameShare: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
          newName: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          const share = stateDraft.shares.find(
            (s) =>
              s.userId === payload.ownerUserId && s.node.id === payload.nodeId,
          );
          if (share) share.node.name = payload.newName;
        },
      }),
      unshareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          const index = stateDraft.shares.findIndex(
            (share) =>
              share.userId === payload.ownerUserId &&
              share.node.id === payload.nodeId,
          );
          if (index !== -1) {
            stateDraft.shares.splice(index, 1);
          }
        },
      }),
    };
  },
});
