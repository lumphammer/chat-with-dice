import { createServerCapability } from "#/capabilities/createServerCapability";
import { objectivesCommon } from "./common";

export const objectivesServer = createServerCapability(objectivesCommon, {
  initialise: () => {},
  actionEffects: {
    setResilience: ({ pureFn, payload, stateDraft }) => {
      pureFn({ payload, stateDraft });
    },
  },
});
