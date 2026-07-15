# Chat With Dice

Chat With Dice is a tabletop RPG chat app where room participants talk, roll dice, and share play materials during a session.

## Language

**Card**:
A **Card Image**, or a pair of **Card Images**, stored in a **Deck** and drawn from a **Pile**.

**Card Draw Message**:
A chat message recording one draw from a **Pile**: which **Card** came up, and whether it came up **Inverted** or **Face Down**.

**Card Image**:
An image used in a **Deck**. It is a front, a **Common Back**, or an **Individual Back**.

**Common Back**:
One **Card Image** used as the back of every **Card** in a **Deck**.

**Deck**:
A folder full of images plus the associated configuration, owned by one user.
_Avoid_: Card set

**Discard**:
The **Cards** already drawn from a **Pile**. Only meaningful when the **Room** has drawn **Cards** not returning to the **Pile**.

**Face Down**:
A **Card** drawn showing its back rather than its front. Requires the **Deck** to have a back for that **Card**. Face Down is a presentation choice, not a secrecy guarantee.
_Avoid_: Flipped, hidden

**Individual Back**:
A **Card Image** used as the back of exactly one **Card**, in place of the **Deck**'s **Common Back**.

**Inverted**:
A **Card** drawn rotated 180° while still showing its front, as if turned around flat on the table. Distinct from **Face Down**.
_Avoid_: Flipped, reversed, upside-down

**Pile**:
The per-room, stateful version of a **Deck**: its **Discard**, what remains, and the room's own draw rules. You draw from a **Pile**, not a **Deck**.

**Reset**:
Returning every **Card** in a **Pile**'s **Discard** to that **Pile**.
_Avoid_: Shuffle, reshuffle

**Room**:
A shared play space with a chat log and optional side-panel tools.

**Room Share**:
A live grant that lets participants in one **Room** access a user-owned file or folder until the grant is removed.
_Avoid_: Attachment, copy, upload-to-room

**Room Participant**:
A signed-in or anonymous user currently accessing a **Room**.
_Avoid_: Member

**Shared Item Message**:
A chat message that highlights a **User File** made accessible through a **Room Share**.
_Avoid_: Attachment message

**User File**:
A file or folder owned by one user in their personal file tree.
_Avoid_: Room file, shared file

## Relationships

- A **Deck** is a **User File** folder of **Card Images** plus configuration, owned by the same user
- **Card Images** are the direct children of the **Deck** folder; images nested in subfolders of it are not **Card Images**
- A **Card** has one front **Card Image** and at most one back **Card Image**
- A **Card**'s back is the **Deck**'s **Common Back** unless that **Card** has an **Individual Back**
- Pairing a front with an **Individual Back** can be proposed automatically from **Card Image** names, but a **Deck** that defeats the heuristic can be paired by hand
- A **Deck** whose **Cards** have no backs cannot produce **Face Down** draws
- A **Deck** is made available to a **Room** by a **Room Share** pointing at its folder; there is no separate deck-sharing grant
- A shared **Deck** appears in the room **Files** sidebar as a folder, so participants can browse its **Card Images** directly
- A **Pile** belongs to exactly one **Room** and draws from exactly one **Deck**
- A **Deck** can back **Piles** in many **Rooms**, and those **Piles** are independent of each other
- Drawing from a **Pile** never changes the **Deck**
- A **Pile** has no order — a draw picks at random from the **Cards** not in its **Discard**
- A **Pile** persists until it is **Reset** or its **Deck** is unshared; a **Room** has no concept of a session, so nothing returns **Cards** to a **Pile** implicitly
- Removing the **Room Share** for a **Deck** discards that **Deck**'s **Pile**, so re-sharing the **Deck** later starts a fresh **Pile** rather than resuming an old one
- A **Card Draw Message** stays in the chat log after its **Pile** is **Reset** or discarded, but records a draw that no longer reflects the **Pile**
- **Deck** configuration is owned by the **Deck** and travels with it into any **Room**
- **Pile** configuration, such as whether drawn **Cards** return to the **Pile**, is room-level and does not travel
- Whether a **Deck** permits **Inverted** or **Face Down** draws is **Deck** configuration; whether a given draw came up **Inverted** or **Face Down** is a property of that draw
- Any **Room Participant**, including an anonymous one, can draw from a **Pile**
- Only a signed-in, non-anonymous **Room Participant** can own a **Deck** or share one with a **Room**
- A **Room Share** belongs to exactly one **Room**
- A **Room Share** points to exactly one **User File**
- A **Room Share** has its own stable identity distinct from the **User File** it grants access to
- The owner user's file store is authoritative for creating, removing, and dereferencing a **Room Share**
- **Room Shares** do not duplicate file storage or transfer storage ownership to the **Room**
- The **Room** coordinates sharing commands, room authorization, chat messages, and room-local share listings
- The **Room** may cache **Room Share** summaries for display, but cached summaries do not authorize file access
- **Room Share** summaries include owner identity for display and disambiguation
- **Room Share** browsing exposes paths relative to the shared root, not the owner's private parent folders
- **Room Share** cache drift is corrected by retrying idempotent commands, lazy validation on access, and explicit resynchronization from user file stores
- **Room Share** commands are idempotent for grants, while **Shared Item Message** creation is deduplicated by command correlation
- The room **Files** sidebar contains both room-shared files and the current user's personal file tree
- A **User File** can be granted to many **Rooms**
- A **Room** can contain many **Room Shares**
- A **Room** can have at most one active **Room Share** for a given **User File**
- A **Room Share** for a folder grants access to descendant **User Files** without creating nested **Room Shares**
- A **Room Share** persists after its creator disconnects from the **Room**
- A **Room Share** has no automatic expiry
- Room file browsing starts from a flat list of active **Room Shares**, then navigates inside one shared folder at a time
- A **Shared Item Message** references one **Room Share** and one highlighted **User File**
- The highlighted **User File** in a **Shared Item Message** can be the **Room Share** root or a descendant covered by that **Room Share**
- A **Shared Item Message** remains in the chat log if its **Room Share** is removed, but its highlighted item becomes unavailable
- A deleted **User File** makes related **Room Shares** and **Shared Item Messages** unavailable
- A file must be ready before it can be shared or highlighted in a **Shared Item Message**
- A shared folder can contain files that become visible only after they are ready
- Renaming or moving a **Room Share** root does not remove the share, but moving a descendant outside the shared folder makes descendant **Shared Item Messages** unavailable
- **Shared Item Messages** show snapshot display details while room file browsing should converge on current **User File** details
- **Shared Item Messages** store display metadata, not trust-bearing file URLs
- A chat message may contain text, a dice roll, a **Shared Item Message**, or a useful combination of those
- Creating a **Room Share** and posting a **Shared Item Message** are separate actions, even when the primary UI performs both together
- Removing a **Room Share** updates room file browsing but does not post a chat message by default
- Any **Room Participant** can view a **Room Share** in that **Room**
- Viewing a **Room Share** requires an app session and access to the **Room**, but does not require ownership of the underlying **User File**
- Viewing a shared file includes the ability to download it when the file type or browser flow allows download
- Only a signed-in, non-anonymous **Room Participant** can create a **Room Share**
- Anonymous **Room Participants** can view room-shared files but cannot access a personal file tree or create **Room Shares**
- The creator of a **Room Share** or the **Room** owner can remove it from the **Room**

## Example Dialogue

> **Player:** "I shared my wandering monsters image with this room."
> **Dev:** "So if you replace that image in your files, should the room see the new version?"
> **Domain expert:** "Yes. A Room Share is a live grant to my file, not a copied attachment."

> **GM:** "I set my Magus deck up ages ago — backs on every card, inversions on. I just want to use it here."
> **Dev:** "So if you draw from it in two rooms at once, do they share a pile?"
> **Domain expert:** "No. The Deck is mine and travels with its config. Each room gets its own Pile."

## Flagged Ambiguities

- "share a file" means creating a live **Room Share**, not copying the file into the **Room**.
- "unshare" means removing the **Room Share** grant, not deleting old chat messages.
- "member" suggests durable room membership, which the app does not currently have; use **Room Participant** for people accessing a room.
- Sharing a descendant of an already shared folder should reference the ancestor **Room Share**, not create a nested active grant.
- Room authorization belongs to the **Room** side, even though **Room Share** records belong to the owner user's file store.
- "flip" is ambiguous between turning a **Card** **Face Down** and turning it **Inverted**; use the specific term.
- "drawing from a deck" is normal speech for drawing from a **Pile**, and is fine where context is obvious. Only the **Pile** has draw state.
- "reversed", the usual tarot term, means **Inverted** here.
- "shuffle" is ambiguous between **Reset** and reordering what remains. A **Pile** has no order, so reordering is meaningless and the intended action is always **Reset**.
- **Face Down** is presentation, not secrecy — a **Card Image** a client can display is a **Card Image** a determined participant can find.
