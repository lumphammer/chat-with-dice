import type { CapabilityName } from "./capabilityNames";
import { cardsServer } from "./cards/server";
import { counterServer } from "./counter/server";
import type { ServerCapability } from "./createServerCapability";
import { feedbackServer } from "./feedback/server";
import { filesServer } from "./files/server";
import { havocServer } from "./havoc/server";
import { laserfeelingsServer } from "./laserfeelings/server";
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
  havoc: havocServer,
  roll: rollServer,
  laserfeelings: laserfeelingsServer,
  files: filesServer,
  cards: cardsServer,
  feedback: feedbackServer,
  users: usersServer,
};
