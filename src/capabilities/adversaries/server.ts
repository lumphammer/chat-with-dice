import { createServerCapability } from "#/capabilities/createServerCapability";
import { adversariesCommon } from "./common";

export const adversariesServer = createServerCapability(adversariesCommon, {
  initialise: () => {},
  actionEffects: {
    setResilience: ({ pureFn, payload, stateDraft }) => {
      pureFn({ payload, stateDraft });
    },
  },
});
