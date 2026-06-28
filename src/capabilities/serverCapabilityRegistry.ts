import { adversariesServer } from "./adversaries/server";
import type { CapabilityName } from "./capabilityNames";
import { counterServer } from "./counter/server";
import type { ServerCapability } from "./createServerCapability";
import { feedbackServer } from "./feedback/server";
import { filesServer } from "./files/server";
import { laserfeelingsServer } from "./laserfeelings/server";
import { objectivesServer } from "./objectives/server";
import { rollServer } from "./roll/server";
import { usersServer } from "./users/server";

/**
 * Server-side registry consumed by `ChatRoomDO`. Imports only the
 * `<capability>/server.ts` half of each capability — no React, no UI
 * components, no client-only deps.
 */
export const serverCapabilityRegistry: Record<
  CapabilityName,
  ServerCapability
> = {
  counter: counterServer,
  objectives: objectivesServer,
  adversaries: adversariesServer,
  roll: rollServer,
  laserfeelings: laserfeelingsServer,
  files: filesServer,
  feedback: feedbackServer,
  users: usersServer,
};
