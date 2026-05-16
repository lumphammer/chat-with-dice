# Chat With Dice

Chat With Dice is a tabletop RPG chat app where room participants talk, roll dice, and share play materials during a session.

## Language

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

## Flagged Ambiguities

- "share a file" means creating a live **Room Share**, not copying the file into the **Room**.
- "unshare" means removing the **Room Share** grant, not deleting old chat messages.
- "member" suggests durable room membership, which the app does not currently have; use **Room Participant** for people accessing a room.
- Sharing a descendant of an already shared folder should reference the ancestor **Room Share**, not create a nested active grant.
- Room authorization belongs to the **Room** side, even though **Room Share** records belong to the owner user's file store.
