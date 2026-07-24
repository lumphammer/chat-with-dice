import type { CapabilityName } from "./capabilityNames";
import { cardsClient } from "./cards/client";
import { counterClient } from "./counter/client";
import type { ClientCapability } from "./createClientCapability";
import { feedbackClient } from "./feedback/client";
import { filesClient } from "./files/client";
import { havocClient } from "./havoc/client";
import { laserfeelingsClient } from "./laserfeelings/client";
import { rollClient } from "./roll/client";
import { usersClient } from "./users/client";

/**
 * Client-side registry consumed by the UI (sidebars, config, chat bubbles).
 * Imports only the `<capability>/client.ts` half of each capability — React +
 * lucide components live here and stay out of `ChatRoomDO`'s import graph.
 *
 * `satisfies` (rather than a type annotation) keeps each entry's specific
 * generic types: literal access like
 * `clientCapabilityRegistry.counter.useMount()` is typed
 * correctly, not widened to `unknown`.
 *
 * Indexed access (`registry[name]` where `name: CapabilityName`) still
 * resolves to the union of all entries, which is wide. For typed dynamic
 * access of a single capability, import its `*Client` export directly.
 */
export const clientCapabilityRegistry = {
  counter: counterClient,
  havoc: havocClient,
  roll: rollClient,
  laserfeelings: laserfeelingsClient,
  files: filesClient,
  cards: cardsClient,
  feedback: feedbackClient,
  users: usersClient,
} satisfies Record<CapabilityName, ClientCapability<any, any, any>>;
