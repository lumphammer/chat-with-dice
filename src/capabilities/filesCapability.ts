import { createCapability } from "./createCapability";
import { z } from "zod";

export const filesCapability = createCapability({
  name: "files",
  displayName: "Files",
  configValidator: z.object(),
  defaultConfig: {},
  stateValidator: z.object(),
  getInitialState: () => ({}),
  initialise: () => {},
  messageDataValidator: z.object(),
  buildActions({ createAction }) {
    return {
      shareFile: createAction({
        payloadValidator: z.object({
          nodeId: z.string(),
        }),
        effectfulFn: async ({
          payload: { nodeId },
          userId,
          nodeShareManager,
          broadcaster,
        }) => {
          const shareResult = await nodeShareManager.shareUserNodeId({
            userId,
            nodeId,
          });

          if (shareResult.result === "error") {
            broadcaster.sendErrorToUserId(userId, shareResult.reason);
            return;
          }
          console.log(shareResult);
        },
      }),
    };
  },
});
