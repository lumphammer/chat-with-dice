import { createCapability } from "./createCapability";
import { z } from "zod";

export const filesCapabaility = createCapability({
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
          fileShareManager,
        }) => {
          const shareResult = fileShareManager.shareUserNodeId({
            userId,
            nodeId,
          });
          console.log(shareResult);
        },
      }),
    };
  },
});
