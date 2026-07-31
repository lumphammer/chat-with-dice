# Chat With Dice

Chat With Dice is a tabletop RPG chat app where room participants talk, roll dice, and share play materials during a session.

## Language

**Avoid List**:
A **Room**'s whole set of **Avoided Subjects**, shown as one shared list with
each entry's author named.

**Avoided Subject**:
One subject a **Room Participant** has asked the table to steer clear of.
Attributed: the whole **Room** sees who asked for it, as a table would if you
said it out loud or wrote it on a shared sheet. Its author can remove it, and so
can the **Room** owner.
_Contrast_: a **Safety Signal**, which may be **Unattributed** — an in-the-moment
interrupt is a different act from a session-zero statement

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

**Grey Lady**:
One of the three cards the setup ritual seeds through a **Story Deck** — one
under each of its three piles. Drawing one is a beat in its own right rather than
something to roll against, and the third is always the last card in the deck.

**Individual Back**:
A **Card Image** used as the back of exactly one **Card**. It takes precedence over a **Common Back**, but does not need one to exist — plenty of sets give every **Card** its own back and have no **Common Back** at all.

**Inverted**:
A **Card** drawn rotated 180°, as if turned around flat on the table — showing its front when face up, or its back when also **Face Down**. Distinct from **Face Down**, which is about which face shows rather than orientation.
_Avoid_: Flipped, reversed, upside-down

**Obstruction**:
A **Story Card** that stands in the **Protagonist**'s way, carrying a difficulty
of 4 to 7. Beating it is a d10 roll that has to equal or beat that difficulty,
with **Resolve** spendable either before the roll (two each) or after it (one
each), never both. The last **Obstruction** drawn is the one the next roll is
made against, until another is drawn.

**Allocation**:
The ten points split between an English Eerie **Protagonist**'s **Spirit** and
**Resolve** in **Setup**, five and five to begin, three to seven on either.
Moving one moves the other, because it is one split rather than two trackers.
Only ever on a sheet that has not been played: once a **Story Deck** has been
shuffled the two are independent tracks and the ten no longer holds.

**Pause**:
The mild **Safety Signal**: hold on a moment. Same mechanism as an **X Card**,
lower severity, and dismissible with any gesture rather than a deliberate one.

**Pile**:
The per-room, stateful version of a **Deck**: its **Discard** and what remains. You draw from a **Pile**, not a **Deck**. The rules a draw follows belong to the **Deck**.

**Play**:
The second of an English Eerie **Room**'s two modes: the story being told. The
**Story Deck** is at the front, **Spirit** and **Resolve** are independent
tracks, and the **Protagonist** is prose with an editor behind a pencil. The
current **Obstruction**'s chat message carries the controls for rolling against
it. Once someone rolls, those controls are replaced by their display name; an
**Obstruction** can only be rolled against once. Entered from **Setup**, which
shuffles a **Story Deck** if the **Room** has never had one. Resetting the game
discards all of this and returns the **Room** to a blank **Setup**.

**Protagonist**:
The single character an English Eerie **Room** tells its story about: a name, an
occupation, a background, three features and three fears, plus a **Spirit** and a
**Resolve** track. One per **Room**, shared and editable by everyone in it — the
game is about one person, however many people are at the table.
_Avoid_: Character sheet (there is only ever the one)

**Reset**:
Returning every **Card** in a **Pile**'s **Discard** to that **Pile**.
_Avoid_: Shuffle, reshuffle

**Resolve**:
The **Protagonist**'s track of nerve, spent on an **Obstruction**: two points of
result for each point spent before the roll, or one for each spent after it.
_Contrast_: **Spirit**, which nothing spends automatically.

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

**Setup**:
The first of an English Eerie **Room**'s two modes, and the one it starts in: the
sheet being written. Every **Protagonist** line is editable in place and
committed on blur, and **Spirit** and **Resolve** are an **Allocation** rather
than two tracks. Left by beginning **Play**.
_Avoid_: Character creation (nothing is created — the sheet is always there)
_Contrast_: the **Story Deck**'s setup ritual, which is a shuffle, not a mode.

**Shared Item Message**:
A chat message that highlights a **User File** made accessible through a **Room Share**.
_Avoid_: Attachment message

**Spirit**:
The **Protagonist**'s track of what the story has cost them. Crossed off by hand
as the table decides — no roll spends it — which is why it is a tracker rather
than a currency.
_Contrast_: **Resolve**, which an **Obstruction** roll spends.

**Story Card**:
One of the nineteen cards in a **Story Deck**: a type, and a difficulty when it
is an **Obstruction**. Drawing one frames a scene.
_Contrast_: a **Card**, which is a user-owned image in a **Deck**. A **Story
Card** is built into the game — there is nothing to look at and nothing to own.

**Story Deck**:
The **Room**'s stack of **Story Cards**, drawn from the top a card at a time.
Built by its setup ritual: shuffle the sixteen narrative cards, split them into
piles of five, five and six, slide a **Grey Lady** under each pile, then stack
them back up with the six-card pile at the bottom. Unlike a **Deck** it belongs
to no user and is shared with no **Room** — ADR-0001 governs decks as shared
folders, and this deliberately sits outside it.
_Contrast_: a **Pile**, which has no order; a **Story Deck** is entirely about
its order.

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
- A **Safety Signal**'s interrupt names who raised it, or says "Anonymous" when it is **Unattributed** — the same name the chat log shows, derived from a single attribution so the two cannot disagree
- An **Avoided Subject** belongs to one **Room** and names its author to everyone in that **Room**
- An **Avoided Subject** can be removed by its author or by the **Room** owner, and by nobody else
- An **Avoided Subject**'s author is stamped from the connection that added it, never from what the client sent, so nobody can add one in somebody else's name
- An **Avoided Subject** records the author's display name as it was when the entry was added, so a later rename leaves older entries reading as they were written
- A **Room** has at most one **Protagonist**, one **Story Deck**, and one pair of **Spirit** and **Resolve** tracks, all shared: any **Room Participant**, including an anonymous one, can edit the sheet, draw a **Story Card**, and roll against an **Obstruction**
- A **Story Deck** is built into the game rather than shared into the **Room**, so it needs no **Room Share**, no **User File**, and no owner
- Setting up a **Story Deck** again abandons the current one and every **Story Card** drawn from it, but leaves the **Protagonist**, **Spirit** and **Resolve** alone
- Only an **Obstruction** becomes the thing rolls are made against; drawing a **Clue** or a **Grey Lady** leaves the last **Obstruction** standing, because a roll can come well after the card that prompted it
- **Resolve** is spent before an **Obstruction** roll or after it, never both: spending up front is worth twice as much precisely because it is committed before the die is seen
- **Resolve** spent after a roll is spent by the roller alone, on their own roll, and only enough to turn a failure into a success — there is nothing to buy above the difficulty
- **Spirit** is never spent automatically: what a failed **Obstruction** costs is the table's call, so the track is crossed off by hand
- Attribution is where a **Safety Signal** and an **Avoided Subject** deliberately differ: a signal is a momentary interrupt and may be **Unattributed**, because in the moment the cost of being seen to raise one is what stops people raising it; an **Avoided Subject** is a session-zero statement and is always attributed

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
- **Unattributed** applies only to a **Safety Signal**. An **Avoided Subject** is never unattributed, so "anonymous safety tools" is not a description of this app — say which of the two you mean.
- **Unattributed** is about what is _recorded_, not about what can be _inferred_. In a small **Room**, timing alone can give the raiser away, and no amount of server-side redaction changes that — so the tools should not be sold on their anonymity.
- "the X card" is normal speech for raising one, and is fine in user-facing copy on the same grounds as "drawing from a deck".
