import { adversariesClient } from "./adversaries/client";
import type { CapabilityName } from "./capabilityNames";
import { counterClient } from "./counter/client";
import type { ClientCapability } from "./createClientCapability";
import { feedbackClient } from "./feedback/client";
import { filesClient } from "./files/client";
import { laserfeelingsClient } from "./laserfeelings/client";
import { objectivesClient } from "./objectives/client";
import { rollClient } from "./roll/client";

/**
 * Client-side registry consumed by the UI (sidebars, config, chat bubbles).
 * Imports only the `<capability>/client.ts` half of each capability — React +
 * lucide components live here and stay out of `ChatRoomDO`'s import graph.
 */
// The action types differ per capability (each has its own payload shapes).
// Storing them under one `ClientCapability` slot would force a contravariant
// widening that TS refuses. The registry is only used for enumeration and the
// metadata fields — typed access to a specific capability's `useMount`/actions
// should be via direct import of its `*Client` export.
export const clientCapabilityRegistry: Record<
  CapabilityName,
  ClientCapability<any, any, any>
> = {
  counter: counterClient,
  objectives: objectivesClient,
  adversaries: adversariesClient,
  roll: rollClient,
  laserfeelings: laserfeelingsClient,
  files: filesClient,
  feedback: feedbackClient,
};
