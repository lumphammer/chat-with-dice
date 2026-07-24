# 1. Decks, Piles, and deck sharing

Status: accepted

## Context

We want **Decks**: a bunch of images you can draw from at random, broadcasting the result to chat. Decks need per-deck configuration (do Cards have backs? can they be drawn Inverted or Face Down?), and — the driving requirement — a carefully configured Deck must be usable in any Room without redoing that configuration.

The obvious home for per-room feature configuration is the room's capability config (`rooms.config` in D1, validated by `roomConfigValidator`). That is exactly wrong here: it is per-room and effectively fixed at room creation, which reproduces the "set the Magus deck up again in every room" problem we are trying to avoid.

Meanwhile the file store already has the machinery a Deck needs. `roomResourceShares` lives in the owner's `UserDataDO`, so a share is owned by the user rather than the room. `UserDataRepository.isNodeReachableFromShare` does a recursive ancestor walk, so sharing a folder already grants a Room access to every file under it. Uploads, quota, thumbnails, trash/restore and the orphan purge all already work on those files.

## Decision

**A Deck is a folder in the owner's file tree**, marked as a deck, with its configuration stored alongside it in `UserDataDO`. A **Pile** is the per-room draw state for a Deck, held in the `cards` capability's ChatRoomDO state.

Specifically:

1. **Deck configuration lives with the Deck**, in a new `UserDataDO` table keyed by the folder's node id (mirroring how `files` and `folders` hang off `nodes`). It therefore travels into any Room automatically, because the Room never holds it.

2. **Sharing a Deck is an ordinary Room Share** pointing at its folder. No new grant type, and no new authorization code — Card Images serve through the existing `/api/files/[ownerUserId]/[nodeId]?roomId=` route, authorized by the existing ancestor walk.

3. **Cards are derived, not stored.** A Card is an image that is a direct child of the Deck folder, minus the Common Back, minus any image serving as an Individual Back. Only the front→Individual Back _pairings_ are stored. This keeps the zero-config path (drop 78 images in a folder and it works) and keeps Decks live: add an image and it is drawable immediately, with no re-registration step. Pairings can be proposed by a filename heuristic (`front`/`back`, written up in `docs/deck-pairing-heuristic.md`) and corrected by hand; Decks that defeat the heuristic are paired manually.

4. **A Pile stores its Discard, not its remaining Cards.** Remaining is derived as `liveCards − discard` at draw time. Storing the remainder would silently snapshot the Deck and require reconciliation whenever the owner edits it; storing the Discard means an added Card is instantly drawable and a deleted one just vanishes, with no drift logic. This preserves the "Room Share is a live grant, not a copy" property `CONTEXT.md` already asserts.

5. **A Pile is keyed by owner user id and Deck node id.**

   An earlier draft keyed Piles by Room Share id, so that unsharing and
   re-sharing would yield a new id and an old Pile could never resurface —
   structurally, rather than by relying on cleanup having run. That was
   dropped, for three reasons:

   - It is not an alternative to cleanup, but extra work on top of it.
     `files:onShareRemoved` carries `{ ownerUserId, nodeId }`, and a
     share-id-keyed Pile cannot be found from that, so adopting share ids means
     threading them through the share summary _and_ the hook payload.
   - The identity would be fabricated anyway. A state migration cannot learn
     real share ids — they live in each owner's `UserDataDO`, not the Room — so
     every share cached before the change would get an invented one.
   - The failure it prevents is recoverable by an affordance that already
     exists. A Pile that resurfaces half-drawn is fixed by Reset.

   The residual window is recorded under Consequences.

6. **Deck configuration and Pile configuration are different things.** Whether a Deck _permits_ Inverted or Face Down draws is Deck configuration and travels. Whether drawn Cards return to the Pile is a table rule, is Pile configuration, and stays room-side. Whether a given draw _came up_ Inverted or Face Down is a property of that draw, recorded in the Card Draw Message.

7. **Face Down is presentation, not secrecy.** The client receives the front's node id regardless. This is a tool for friends playing games; if they snoop, they snoop. Real secrecy would require the server to withhold Card Images until a reveal and to make chat history per-participant, which the broadcast-everything model does not do.

8. **The Files capability remains the sole authority on shares.** Deck folders appear in the Shared with room sidebar as folders, so participants can browse the Card Images. The `cards` capability holds only Piles, and authorizes every draw against the owner's DO via `isNodeAccessibleFromRoom` rather than trusting the room-side cache — as `CONTEXT.md` requires ("cached summaries do not authorize file access").

9. **Anonymous Room Participants can draw** from a Pile, but cannot own or share a Deck (this follows from the existing Room Share rules).

10. **Card Images are direct children only.** Images nested in subfolders of a Deck are not Cards, which gives owners an escape hatch for source art.

11. **A Pile persists indefinitely** until Reset or until its Deck is unshared. Rooms have no concept of a session, and implicit resets would be undesirable anyway — a session can end mid-fight and should resume exactly where it left off.

12. **Binning a Deck hides its Pile rather than destroying it.** Unsharing and
    binning are different, and the difference is reversibility. Unsharing
    revokes the grant, so the Pile goes. Binning puts the Deck in the owner's
    trash while the grant survives — soft delete is undoable — so the Pile must
    survive too, or restoring a Deck inside the purge window would silently cost
    the room its Discard.

    This mirrors what `files` already does with a binned share: mark it
    unavailable, keep it, restore on restore. The `onShareAvailabilityChange`
    room hook carries the news and already covers the shadowed case — a Deck
    under a binned ancestor — because availability is computed per share from
    the owner's database rather than inferred from the operation.

13. **A Deck's Cards can vanish underneath a live Pile.** Deleting individual
    Card Images inside a shared Deck fires no room notification: the grant is on
    the folder and is untouched. Nothing needs to happen. Cards are derived at
    draw time (decision 3) and the Discard stores ids (decision 4), so a deleted
    Card simply stops being drawable, and a Discard entry for it becomes inert.
    A Card Draw Message naming it goes the same way as any Shared Item Message
    whose file is gone.

## Consequences

- The portability requirement stops being a feature. Share the folder; the config is already attached.
- The `cards` capability needs no new authorization code and no kernel changes to _draw_. It needs one DO RPC per draw, which is acceptable given draws are rarer than dice rolls.
- `storageNodeValidator` must carry deck-ness on folder nodes so the client can tell a Deck folder from an ordinary one. This is honest layering: the Deck lives in the file store, so the storage node is genuinely the thing that knows. It costs a version bump, handled by `versioned()`.
- The Cards sidebar reads the shared-folder list from the Files capability client-side, so a Room with `cards` also wants `files`. The kernel has no capability-dependency mechanism, so this is a room-preset convention rather than an enforced constraint.
- **Unsharing a Deck becomes destructive**, while unsharing a file is not. The same button in `FolderActionsMenu` would silently destroy a session's Discard. Unsharing a Deck with a non-empty Discard needs a confirmation. Binning does not — see decision 12.
- The `cards` capability consumes two hooks it does not fire: `files:onShareRemoved` (drop the Pile) and `onShareAvailabilityChange` (hide or unhide it). Both exist. See ADR-0002.
- **A Pile can be orphaned, and can resurrect.** Both follow from decision 5 and neither is fatal:
  - _Orphaned_: `roomResourceShares.nodeId` cascades on node delete, and the purge runs inside the owner's `UserDataDO`, which does not notify rooms. So a Deck hard-deleted — by the 24h purge, or directly — leaves its Pile in KV with nothing behind it. Dead bytes rather than a bug: node ids are `nanoid`s and never come back, so nothing can match that Pile again. Closing this means teaching the purge to notify, which the pipeline now makes cheap.
  - _Resurrected_: if cleanup is missed, re-sharing a Deck can find its old Pile. `dispatch` only reaches _mounted_ capabilities and `onConfigChange` unmounts without purging state, so disabling `cards`, unsharing the Deck, then re-enabling and re-sharing does it. A DO evicted between commit and flush, or a throwing handler (`runHook` swallows), does it too. The Pile comes back half-drawn and Reset fixes it. If this ever bites, `dateShared` is already in the share summary and would let a Pile record which sharing it belongs to — no version bump needed.
- Deck configuration is a new schema; per `AGENTS.md` the migration is generated with `pnpm run db:generate:UserDataDO`, and adding tables is purely additive so it avoids the not-null-on-existing-rows trap.
- Sharing a Deck folder whose ancestor is later binned makes it unreachable, not just invisible: `isNodeReachableFromShare` rejects shadowed nodes. That was a bug when this ADR was written (a room could read a folder the owner had binned) and is now fixed, so decision 2's "authorized by the existing ancestor walk" can be taken at face value.
