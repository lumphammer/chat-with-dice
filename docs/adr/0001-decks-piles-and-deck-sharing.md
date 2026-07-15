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

3. **Cards are derived, not stored.** A Card is an image that is a direct child of the Deck folder, minus the Common Back, minus any image serving as an Individual Back. Only the front→Individual Back _pairings_ are stored. This keeps the zero-config path (drop 78 images in a folder and it works) and keeps Decks live: add an image and it is drawable immediately, with no re-registration step. Pairings can be proposed by a filename heuristic (`front`/`back`) and corrected by hand; Decks that defeat the heuristic are paired manually.

4. **A Pile stores its Discard, not its remaining Cards.** Remaining is derived as `liveCards − discard` at draw time. Storing the remainder would silently snapshot the Deck and require reconciliation whenever the owner edits it; storing the Discard means an added Card is instantly drawable and a deleted one just vanishes, with no drift logic. This preserves the "Room Share is a live grant, not a copy" property `CONTEXT.md` already asserts.

5. **A Pile is keyed by Room Share id**, not by owner-plus-node. `CONTEXT.md` already states that a Room Share has a stable identity distinct from the file it points at; that identity is currently invisible to the Room, so it must be surfaced into the share summary (a version bump on the Files state validator). Unsharing and re-sharing then yields a new share id, so an old Pile can never match again and stale state cannot resurface after a gap — structurally, rather than by relying on cleanup having run.

6. **Deck configuration and Pile configuration are different things.** Whether a Deck _permits_ Inverted or Face Down draws is Deck configuration and travels. Whether drawn Cards return to the Pile is a table rule, is Pile configuration, and stays room-side. Whether a given draw _came up_ Inverted or Face Down is a property of that draw, recorded in the Card Draw Message.

7. **Face Down is presentation, not secrecy.** The client receives the front's node id regardless. This is a tool for friends playing games; if they snoop, they snoop. Real secrecy would require the server to withhold Card Images until a reveal and to make chat history per-participant, which the broadcast-everything model does not do.

8. **The Files capability remains the sole authority on shares.** Deck folders appear in the Files sidebar as folders, so participants can browse the Card Images. The `cards` capability holds only Piles, and authorizes every draw against the owner's DO via `isNodeAccessibleFromRoom` rather than trusting the room-side cache — as `CONTEXT.md` requires ("cached summaries do not authorize file access").

9. **Anonymous Room Participants can draw** from a Pile, but cannot own or share a Deck (this follows from the existing Room Share rules).

10. **Card Images are direct children only.** Images nested in subfolders of a Deck are not Cards, which gives owners an escape hatch for source art.

11. **A Pile persists indefinitely** until Reset or until its Deck is unshared. Rooms have no concept of a session, and implicit resets would be undesirable anyway — a session can end mid-fight and should resume exactly where it left off.

## Consequences

- The portability requirement stops being a feature. Share the folder; the config is already attached.
- The `cards` capability needs no new authorization code and no kernel changes to _draw_. It needs one DO RPC per draw, which is acceptable given draws are rarer than dice rolls.
- `storageNodeValidator` must carry deck-ness on folder nodes so the client can tell a Deck folder from an ordinary one. This is honest layering: the Deck lives in the file store, so the storage node is genuinely the thing that knows. It costs a version bump, handled by `versioned()`.
- The Cards sidebar reads the shared-folder list from the Files capability client-side, so a Room with `cards` also wants `files`. The kernel has no capability-dependency mechanism, so this is a room-preset convention rather than an enforced constraint.
- **Unsharing a Deck becomes destructive**, while unsharing a file is not. The same button in `FolderActionsMenu` would silently destroy a session's Discard. Unsharing a Deck with a non-empty Discard needs a confirmation.
- Dropping Pile state eagerly on unshare requires the `cards` capability to react to a `files` action. See ADR-0002. Note that decision 5 makes that cleanup _hygiene_ rather than correctness: an orphaned Pile is a few hundred bytes of dead KV, not a bug.
- Deck configuration is a new schema; per `AGENTS.md` the migration is generated with `pnpm run db:generate:UserDataDO`, and adding tables is purely additive so it avoids the not-null-on-existing-rows trap.
