import { createServerCapability } from "#/capabilities/createServerCapability";
import { objectivesCommon } from "./common";

export const objectivesServer = createServerCapability(objectivesCommon, {
  actionEffects: {
    setResilience: ({ pureFn, payload, stateDraft }) => {
      pureFn({ payload, stateDraft });
    },
  },
});
