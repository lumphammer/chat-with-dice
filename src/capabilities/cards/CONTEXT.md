# Cards

The Cards capability turns a folder of images into a deck-of-cards-style draw mechanic, and makes that deck drawable within a Room. See the [Context Map](../../../CONTEXT-MAP.md) for how it relates to Files and English Eerie.

## Language

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

**Pile**:
The per-room, stateful version of a **Deck**: its **Discard** and what remains. You draw from a **Pile**, not a **Deck**. The rules a draw follows belong to the **Deck**.

**Reset**:
Returning every **Card** in a **Pile**'s **Discard** to that **Pile**.
_Avoid_: Shuffle, reshuffle

## Relationships

- **Card Images** are the direct children of the **Deck** folder; images nested in subfolders of it are not **Card Images**
- A **Card** has one front **Card Image** and at most one back **Card Image**
- A **Card**'s back is its **Individual Back** if it has one, otherwise the **Deck**'s **Common Back** if there is one, otherwise the **Card** has no back
- A **Deck** can mix **Cards** with backs and **Cards** without, and can give every **Card** an **Individual Back** without having a **Common Back** at all
- Pairing a front with an **Individual Back** can be proposed automatically from **Card Image** names, but a **Deck** that defeats the heuristic can be paired by hand
- A **Card** with no back cannot be drawn **Face Down**, even where other **Cards** in the same **Deck** can be
- A **Pile** belongs to exactly one **Room** and draws from exactly one **Deck**
- A **Deck** can back **Piles** in many **Rooms**, and those **Piles** are independent of each other
- Drawing from a **Pile** never changes the **Deck**
- A **Pile** has no order — a draw picks at random from the **Cards** not in its **Discard**
- A **Pile** persists until it is **Reset** or its **Deck** is unshared (see the Files-owned **Room Share** in the [Context Map](../../../CONTEXT-MAP.md)); a **Room** has no concept of a session, so nothing returns **Cards** to a **Pile** implicitly
- Changing a **Deck** to return its **Cards** lands in a **Room** at that **Room**'s next draw, not the moment the owner changes it: that draw discards the **Room**'s **Discard**. Until then the **Discard** is dormant — not shown, not drawn against — so a **Deck** switched away and back with no draw in between leaves the **Room** exactly as it was. Two **Rooms** sharing one **Deck** can land the change at different times, because the **Discard** is per-**Room**
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
- Only a signed-in, non-anonymous **Room Participant** can own a **Deck**

## Example dialogue

> **GM:** "I set my Magus deck up ages ago — backs on every card, inversions on. I just want to use it here."
> **Dev:** "So if you draw from it in two rooms at once, do they share a pile?"
> **Domain expert:** "No. The Deck is mine and travels with its config. Each room gets its own Pile."

## Flagged ambiguities

- "flip" is ambiguous between turning a **Card** **Face Down** and turning it **Inverted**; use the specific term.
- "drawing from a deck" is normal speech for drawing from a **Pile**, and is fine where context is obvious. Only the **Pile** has draw state.
- "discard pile" is normal speech for the **Discard**, and "resetting the deck" for **Reset**ting its **Pile**. Both are fine in user-facing copy, on the same grounds as "drawing from a deck" — the Deck settings dialog uses them. Keep to **Discard** and **Reset** in code and docs.
- "reversed", the usual tarot term, means **Inverted** here.
- "shuffle" is ambiguous between **Reset** and reordering what remains. A **Pile** has no order, so reordering is meaningless and the intended action is always **Reset**.
- **Face Down** is presentation, not secrecy — a **Card Image** a client can display is a **Card Image** a determined participant can find.
