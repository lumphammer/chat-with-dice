import { createCapability } from "./createCapability";
import { removeDirectRoomShare } from "./filesShareHelpers";
import * as z from "zod/v4";

// oxlint-disable-next-line no-magic-numbers
const FILES_STATE_VERSION = 3 as const;

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
  version: z.literal(FILES_STATE_VERSION),
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

const migrateV1ToV2 = (
  v1: z.infer<typeof filesStateValidatorV1>,
): z.infer<typeof filesStateValidatorV2> => ({
  version: 2,
  shares: v1.shares.map((s) => ({ ...s, dateShared: 0 })),
});

const migrateV2ToV3 = (
  v2: z.infer<typeof filesStateValidatorV2>,
): z.infer<typeof filesStateValidatorV3> => ({
  version: FILES_STATE_VERSION,
  shares: v2.shares.map((s) =>
    s.kind === "file" ? { ...s, sizeBytes: 0 } : s,
  ),
});

const filesStateValidator = z.union([
  filesStateValidatorV3,
  filesStateValidatorV2.transform(migrateV2ToV3),
  filesStateValidatorV1.transform(migrateV1ToV2).transform(migrateV2ToV3),
]);

export const sharedItemMessageDataValidator = z.discriminatedUnion("kind", [
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

export type SharedItemMessageData = z.infer<
  typeof sharedItemMessageDataValidator
>;
export type FilesState = z.infer<typeof filesStateValidator>;
export type SharedItem = FilesState["shares"][number];

export const filesCapability = createCapability({
  name: "files",
  displayName: "Files",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: filesStateValidator,
  getInitialState: () => ({
    version: FILES_STATE_VERSION,
    shares: [],
  }),
  initialise: () => {},
  messageDataValidator: sharedItemMessageDataValidator,
  buildActions({ createAction }) {
    return {
      shareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
        }),
        effectfulFn: async ({
          stateDraft,
          payload: { nodeId },
          userId,
          displayName,
          nodeShareManager,
          broadcaster,
          sendChatMessage,
        }) => {
          const shareResult = await nodeShareManager.shareUserNodeId({
            userId,
            nodeId,
          });

          if (shareResult.result === "error") {
            broadcaster.sendErrorToUserId(userId, shareResult.reason);
            return;
          }
          if (shareResult.result === "created") {
            stateDraft.shares.push(
              shareResult.kind === "file"
                ? {
                    contentType: shareResult.contentType,
                    name: shareResult.name,
                    kind: shareResult.kind,
                    nodeId: nodeId,
                    userId: userId,
                    r2Key: shareResult.r2Key,
                    thumbnailR2Key: shareResult.thumbnailR2Key,
                    sizeBytes: shareResult.sizeBytes,
                    userDisplayName: displayName,
                    dateShared: Date.now(),
                  }
                : {
                    name: shareResult.name,
                    kind: shareResult.kind,
                    nodeId: nodeId,
                    userId: userId,
                    userDisplayName: displayName,
                    dateShared: Date.now(),
                  },
            );
          }
          sendChatMessage(
            shareResult.kind === "file"
              ? {
                  contentType: shareResult.contentType,
                  name: shareResult.name,
                  kind: shareResult.kind,
                  nodeId: nodeId,
                  userId: userId,
                  thumbnailR2Key: shareResult.thumbnailR2Key,
                  sizeBytes: shareResult.sizeBytes,
                  userDisplayName: displayName,
                }
              : {
                  name: shareResult.name,
                  kind: shareResult.kind,
                  nodeId: nodeId,
                  userId: userId,
                  userDisplayName: displayName,
                },
          );
          console.log(shareResult);
        },
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
              s.kind === "file" &&
              s.userId === payload.ownerUserId &&
              s.nodeId === payload.nodeId,
          );
          if (share) share.name = payload.newName;
        },
        effectfulFn: async ({ stateDraft, payload, userId, pureFn }) => {
          pureFn({
            stateDraft,
            payload: { ...payload, ownerUserId: userId },
          });
        },
      }),
      unshareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
          ownerUserId: z.string(),
        }),
        pureFn: ({ stateDraft, payload }) => {
          removeDirectRoomShare(stateDraft.shares, payload);
        },
        effectfulFn: async ({
          stateDraft,
          payload,
          userId,
          nodeShareManager,
          broadcaster,
          pureFn,
        }) => {
          const unshareResult = await nodeShareManager.unshareUserNodeId({
            requestingUserId: userId,
            ownerUserId: payload.ownerUserId,
            nodeId: payload.nodeId,
          });

          if (unshareResult.result === "error") {
            broadcaster.sendErrorToUserId(userId, unshareResult.reason);
            return;
          }

          pureFn({ stateDraft, payload });
        },
      }),
    };
  },
});
