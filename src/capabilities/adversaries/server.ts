import { createServerCapability } from "#/capabilities/createServerCapability";
import { adversariesCommon } from "./common";

export const adversariesServer = createServerCapability(adversariesCommon, {
  actionEffects: {
    setResilience: ({ pureFn, payload, stateDraft }) => {
      pureFn({ payload, stateDraft });
    },
  },
});
