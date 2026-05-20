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

const filesStateValidatorV2 = z
  .object({
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
  })
  .catch((ctx) => {
    const v1 = filesStateValidatorV1.parse(ctx.value);
    return {
      version: 2,
      ...v1,
      shares: v1.shares.map((s) => ({ ...s, dateShared: 0 })),
    };
  });

const coreFieldsV3Validator = coreFieldsV2Validator;

const filesStateValidatorV3 = z
  .object({
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
  })
  .catch((ctx) => {
    const v2 = filesStateValidatorV2.parse(ctx.value);
    return {
      version: FILES_STATE_VERSION,
      shares: v2.shares.map((share) =>
        share.kind === "file" ? { ...share, sizeBytes: 0 } : share,
      ),
    };
  });

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
export type FilesState = z.infer<typeof filesStateValidatorV3>;
export type SharedItem = FilesState["shares"][number];

export const filesCapability = createCapability({
  name: "files",
  displayName: "Files",
  configValidator: z.object({}),
  defaultConfig: {},
  stateValidator: filesStateValidatorV3,
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
