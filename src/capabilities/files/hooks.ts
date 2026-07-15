import type { DeclareCapabilityHooks } from "#/capabilities/declareCapabilityHooks";

/**
 * Hooks fired by the `files` capability. Import leaf — see
 * `declareCapabilityHooks.ts`.
 */
export type FilesHookEvents = DeclareCapabilityHooks<
  "files",
  {
    /**
     * Fired when a Room Share is gone from this room: the owner's file store
     * either removed it, or reported it was already absent. Both cases share a
     * postcondition — there is no live share for this node here — so consumers
     * holding state derived from the share should drop it either way.
     *
     * Carries no share identity yet. Piles will need one to key off (see
     * ADR-0001), which arrives with the Files state version bump.
     */
    "files:onShareRemoved": { ownerUserId: string; nodeId: string };
  }
>;
