# Context Map

Chat With Dice splits into five bounded domain contexts, plus a small amount
of vocabulary shared by all of them because every context sits inside a
**Room**.

## Shared vocabulary

**Room**:
A shared play space with a chat log and optional side-panel tools.

**Room Participant**:
A signed-in or anonymous user currently accessing a **Room**.
_Avoid_: Member

### Flagged ambiguities

- "member" suggests durable room membership, which the app does not currently have; use **Room Participant** for people accessing a room.

## Contexts

- [Cards](./src/capabilities/cards/CONTEXT.md) — turns a folder of images into a drawable deck of cards
- [Files](./src/capabilities/files/CONTEXT.md) — owns personal file storage and the live grants that share it into a Room
- [Safety](./src/capabilities/safety/CONTEXT.md) — always-on safety signals and the avoided-subjects list
- [English Eerie](./src/capabilities/englisheerie/CONTEXT.md) — the built-in one-shot RPG ruleset played inside a Room
- [Microscope](./src/capabilities/microscope/CONTEXT.md) — a structured notepad for the accumulating state of a game of Microscope

## Relationships

- **Cards → Files**: A Cards **Deck** is a Files **User File** folder plus configuration. It is made available to a **Room** by a Files **Room Share** pointing at that folder — Cards has no deck-sharing mechanism of its own.
- **Files → Cards**: Files owns the events that drive Cards' **Pile** lifecycle — marking/unmarking a folder as a **Deck**, and creating/removing a **Room Share** for it — Cards reacts by creating, abandoning, or (on delete/restore) hiding and restoring the corresponding **Pile**.
- **English Eerie ↔ Cards**: English Eerie's **Story Deck** is deliberately built into the game rather than shared through Files — it needs no **Room Share**, no **User File**, and no owner, unlike a Cards **Deck**. The two "deck" concepts are unrelated beyond the name.
- **Room (chat log) → Cards / Files / Safety / English Eerie**: A chat message may carry text, a dice roll (Roll capability), a Cards **Card Draw Message**, a Files **Shared Item Message**, a Safety **Safety Signal** record, or an English Eerie **Story Card** draw or **Obstruction** roll. The Room owns the log; each capability owns and formats its own message payload.
- **Microscope → Safety**: Microscope's **Palette** and Safety's **Avoided Subject** list are deliberately unrelated, and attributed differently for the same reason they are separate — a Palette entry is a fact about the fiction agreed by the table, an Avoided Subject is a request from a named person about the table (ADR-0003)
- **Microscope → Room**: alone among the capabilities, Microscope mounts three sidebar tabs on a **Room** rather than one
- **Safety → Room**: Safety Tools are mounted on every **Room** unconditionally and cannot be disabled by the Room owner — Safety's guarantees hold regardless of what Cards, Files, or English Eerie state the Room is in.
