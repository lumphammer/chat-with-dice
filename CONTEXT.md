# Chat With Dice

Chat With Dice is a tabletop RPG chat app where room participants talk, roll dice, and share play materials during a session.

## Language

**Avoid List**:
A **Room**'s whole set of **Avoided Subjects**, shown pooled and without
authorship.

**Avoided Subject**:
One subject a **Room Participant** has asked the table to steer clear of.
Authorship is held by the **Room**'s server side and never sent to any client
but the author's own, which is the only client that can remove it.

**Card**:
A **Card Image**, or a pair of **Card Images**, stored in a **Deck** and drawn from a **Pile**.

**Card Draw Message**:
A chat message recording one draw from a **Pile**: which **Card** came up, and whether it came up **Inverted** or **Face Down**.

**Card Image**:
An image used in a **Deck**. It is a front, a **Common Back**, or an **Individual Back**.

**Common Back**:
One **Card Image** used as the back of every **Card** in a **Deck** that has no **Individual Back** of its own. A **Deck** need not have one.

**Deck**:
A folder full of images plus the associated configuration, owned by one user.
_Avoid_: Card set

**Discard**:
The **Cards** already drawn from a **Pile**. Only meaningful when the **Room** has drawn **Cards** not returning to the **Pile**.

**Face Down**:
A **Card** drawn showing its back rather than its front. Only possible for a **Card** that has a back. Face Down is a presentation choice, not a secrecy guarantee.
_Avoid_: Flipped, hidden

**Individual Back**:
A **Card Image** used as the back of exactly one **Card**. It takes precedence over a **Common Back**, but does not need one to exist — plenty of sets give every **Card** its own back and have no **Common Back** at all.

**Inverted**:
A **Card** drawn rotated 180°, as if turned around flat on the table — showing its front when face up, or its back when also **Face Down**. Distinct from **Face Down**, which is about which face shows rather than orientation.
_Avoid_: Flipped, reversed, upside-down

**Pause**:
The mild **Safety Signal**: hold on a moment. Same mechanism as an **X Card**,
lower severity, and dismissible with any gesture rather than a deliberate one.

**Pile**:
The per-room, stateful version of a **Deck**: its **Discard** and what remains. You draw from a **Pile**, not a **Deck**. The rules a draw follows belong to the **Deck**.

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

**Safety Signal**:
A room-wide interrupt raised by a **Room Participant**, which takes over every
participant's screen and leaves a record in the chat log. Two kinds: **X Card**
and **Pause**. May be **Unattributed**.

**Shared Item Message**:
A chat message that highlights a **User File** made accessible through a **Room Share**.
_Avoid_: Attachment message

**Unattributed**:
Of a **Safety Signal**: raised without recording who raised it. The raiser's
identity exists for the lifetime of one WebSocket frame and is then discarded —
the chat log, the message store, and the **Room** owner all know only the
sentinel author. There is deliberately no audit trail to consult later.
Shown to users as "anonymous".
_Avoid_: Anonymous (in code — it already means a guest account)

**User File**:
A file or folder owned by one user in their personal file tree.
_Avoid_: Room file, shared file

**X Card**:
The severe **Safety Signal**: stop, rewind, move on. No explanation is required
or invited, and acknowledging it is a deliberate act rather than a stray click.

## Relationships

- A **Deck** is a **User File** folder of **Card Images** plus configuration, owned by the same user
- **Card Images** are the direct children of the **Deck** folder; images nested in subfolders of it are not **Card Images**
- A **Card** has one front **Card Image** and at most one back **Card Image**
- A **Card**'s back is its **Individual Back** if it has one, otherwise the **Deck**'s **Common Back** if there is one, otherwise the **Card** has no back
- A **Deck** can mix **Cards** with backs and **Cards** without, and can give every **Card** an **Individual Back** without having a **Common Back** at all
- Pairing a front with an **Individual Back** can be proposed automatically from **Card Image** names, but a **Deck** that defeats the heuristic can be paired by hand
- A **Card** with no back cannot be drawn **Face Down**, even where other **Cards** in the same **Deck** can be
- A **Deck** is made available to a **Room** by a **Room Share** pointing at its folder; there is no separate deck-sharing grant
- A shared **Deck** appears in the room's **Shared with room** sidebar as a folder, so participants can browse its **Card Images** directly
- A **Pile** belongs to exactly one **Room** and draws from exactly one **Deck**
- A **Deck** can back **Piles** in many **Rooms**, and those **Piles** are independent of each other
- Drawing from a **Pile** never changes the **Deck**
- A **Pile** has no order — a draw picks at random from the **Cards** not in its **Discard**
- A **Pile** persists until it is **Reset** or its **Deck** is unshared; a **Room** has no concept of a session, so nothing returns **Cards** to a **Pile** implicitly
- Changing a **Deck** to return its **Cards** lands in a **Room** at that **Room**'s next draw, not the moment the owner changes it: that draw discards the **Room**'s **Discard**. Until then the **Discard** is dormant — not shown, not drawn against — so a **Deck** switched away and back with no draw in between leaves the **Room** exactly as it was. Two **Rooms** sharing one **Deck** can land the change at different times, because the **Discard** is per-**Room**
- Removing the **Room Share** for a **Deck** discards that **Deck**'s **Pile**, so re-sharing the **Deck** later starts a fresh **Pile** rather than resuming an old one
- Deleting a **Deck** hides its **Pile** rather than discarding it, and restoring the **Deck** brings the **Pile** back with its **Discard** intact — deleting is reversible where unsharing is not
- Deleting one **Card Image** from a shared **Deck** leaves the **Pile** alone: that **Card** stops being drawable, and any **Card Draw Message** naming it becomes unavailable
- A **Card Draw Message** stays in the chat log after its **Pile** is **Reset** or discarded, but records a draw that no longer reflects the **Pile**
- **Deck** configuration is owned by the **Deck** and travels with it into any **Room**
- Whether drawn **Cards** go to the **Discard** or return to the **Deck** is **Deck** configuration and travels, so one **Deck** follows the same rule in every **Room** it is shared with; only its owner can change it, and a **Deck** draws to its **Discard** unless the owner says otherwise
- A **Pile**'s **Discard** is the room-level part and does not travel: two **Rooms** sharing one **Deck** follow the same rule but keep entirely separate **Discards**
- Whether a **Deck** permits **Inverted** or **Face Down** draws is **Deck** configuration; whether a given draw came up **Inverted** or **Face Down** is a property of that draw
- **Inverted** is a three-state **Deck** setting: not permitted, permitted for **fronts** only (a face-up draw can come up rotated, a **Face Down** one is left upright), or permitted for **fronts and backs** (a **Face Down** draw can come up rotated too, showing its back rotated 180°). A rotated back is meaningful — turning a **Card** around on the table rotates it whichever way it lands — even where the back art happens to look symmetric, which is why permitting it is a deliberate choice separate from permitting front rotation
- A **Card** with no back can still be drawn **Inverted** wherever the **Deck** permits front rotation; otherwise **Inverted** and **Face Down** are independent, so a single draw can come up neither, either, or both
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
- The owner's file store tells every affected **Room** when a **Room Share** stops being viewable or becomes viewable again, so a **Room** learns a **User File** has been deleted or restored without having to ask
- The owner's file store tells every **Room** a folder is shared with when that folder is marked or unmarked as a **Deck**, so the room's **Cards** sidebar reflects the change without re-sharing; unmarking abandons the folder's **Pile** in each room rather than preserving it
- A **Room Share** whose **User File** is deleted becomes unavailable but is not removed: the grant outlives the deletion because deletion is reversible
- **Room Share** commands are idempotent for grants, while **Shared Item Message** creation is deduplicated by command correlation
- The **Files** capability provides separate sidebars for room-shared files and the current user's personal file tree
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
- Safety Tools are mounted on every **Room** and cannot be switched off: a safety tool a **Room** owner can disable is not one
- Any **Room Participant**, including an anonymous one, can raise a **Safety Signal** or add an **Avoided Subject**
- A **Safety Signal** belongs to one **Room**, interrupts every participant in it, and posts one chat message
- An **Unattributed** **Safety Signal** records no author anywhere, so nothing can later reveal who raised it — not the **Room** owner, not an admin, not the message store
- Being **Unattributed** is independent of being an anonymous **Room Participant**: a signed-in user can raise an **Unattributed** signal, and a guest can raise an attributed one
- A **Safety Signal** stays in the chat log after its interrupt is dismissed, so the table can see that one was raised even if they missed it
- An **Avoided Subject** belongs to one **Room** and one author; only its author sees it as theirs, and only its author can remove it
- The **Avoid List** is pooled rather than grouped by author, because the server sends no authorship for the client to group by
- A **Room** owner sees the **Avoid List** exactly as every other participant does, with no additional attribution

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
- "discard pile" is normal speech for the **Discard**, and "resetting the deck" for **Reset**ting its **Pile**. Both are fine in user-facing copy, on the same grounds as "drawing from a deck" — the Deck settings dialog uses them. Keep to **Discard** and **Reset** in code and docs.
- "reversed", the usual tarot term, means **Inverted** here.
- "shuffle" is ambiguous between **Reset** and reordering what remains. A **Pile** has no order, so reordering is meaningless and the intended action is always **Reset**.
- **Face Down** is presentation, not secrecy — a **Card Image** a client can display is a **Card Image** a determined participant can find.
- "anonymous" is ambiguous between **Unattributed** (no author recorded for a **Safety Signal**) and an anonymous **Room Participant** (a guest account, `isAnonymous`). The two are independent. User-facing copy says "anonymous" for the former because it is the plainer word; code and docs say **Unattributed**.
- **Unattributed** is about what is _recorded_, not about what can be _inferred_. In a small **Room**, timing alone can give the raiser away, and no amount of server-side redaction changes that — so the tools should not be sold on their anonymity.
- "the X card" is normal speech for raising one, and is fine in user-facing copy on the same grounds as "drawing from a deck".
