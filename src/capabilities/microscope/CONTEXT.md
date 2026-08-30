# Microscope

Microscope is a structured notepad for a game of Microscope (Ben Robbins, Lame Mage Productions) played inside a Room: a fractal history built out of **Periods**, **Events** and **Scenes**, alongside a **Legacy** list and a **Palette**. It records a history; it does not referee one. See the [Context Map](../../../CONTEXT-MAP.md).

The line this context draws is between _state_ and _procedure_. Everything the table accumulates is here. Everything the table performs — whose turn it is, who holds the Lens, what the round's Focus is, whether an addition contradicts what came before — is deliberately absent, and belongs at the table.

## Language

**Big Picture**:
The single sentence covering the whole sweep of a history, shown above the timeline rather than in a tab of its own. The one thing in the game nothing else may contradict — a rule the table keeps, not one this capability enforces.

**Bookend**:
Whichever **Period** currently sits at each end of the timeline, labelled START and END. Not a property of a **Period** and not stored anywhere: making a new one before the start simply moves the label. A history with one **Period** has one card wearing both.

**Event**:
Something that happens inside a **Period**, holding **Scenes**. Called `TimelineEvent` in code, prefixed only to dodge the DOM's global `Event`.

**Legacy**:
A thread of history the table keeps returning to. A flat list, with no **Tone** and no position on the timeline, because that is what a Legacy is in the game. Making one reaches the chat log; a **Palette** entry doesn't.
_Contrast_: a **Timeline Item**, which has a place in the history and a **Tone**.

**Palette**:
The Yes and No lists agreed in setup — what this history may and may not contain. Two independent lists of plain text, unattributed on purpose: a Yes or a No is a statement about the _history_, not a request from a person.
_Contrast_: a Safety **Avoided Subject**, which is always attributed, because it is exactly the opposite — a request from a person about the table rather than a fact about the fiction (ADR-0003).

**Period**:
A broad span of a history, holding **Events**. The top level of the fractal, and the only level that can be a **Bookend**.

**Placement**:
Where a **Timeline Item** is going, said relative to another item — `before` it, `after` it, or `in` it — with `in` and no target meaning the timeline itself. Never an index. The same transition runs twice, optimistically against the caller's state and then authoritatively against the server's, and those two can differ by whatever landed in between: "after that card" survives a concurrent insert where "at index 4" quietly means something else. An item's level is implied by its **Placement** and never sent, so a payload cannot claim a level that disagrees with where it is going.

**Scene**:
A moment inside an **Event**, asking a **Question** and recording its **Answer**. The bottom of the fractal: nothing goes inside a Scene. Made with a **Question** alone — the **Answer** is written later, once the scene has been played, which is why it is the one field the create dialog doesn't show.
_Avoid_: modelling dictated vs played scenes; the distinction is in how the table plays it, and leaves no trace worth recording.

**Timeline Item**:
A **Period**, an **Event** or a **Scene**, when the level doesn't matter. Every one carries a **Tone**, an id, and the text it was written with.

**Tone**:
Light or Dark, carried by every **Timeline Item** and drawn as a hollow or filled circle. Never a colour role — a Dark period is not a warning and a Light one is not a success. Chosen by whoever made the item, and editable afterwards by anyone, because history being un-contradictable is a rule the table keeps.

## Relationships

- A **Room** has at most one Microscope history: one **Big Picture**, one ordered list of **Periods**, one **Legacy** list, and one **Palette**
- The three sidebar tabs — timeline, legacies, palette — are three views of that one history, and the only capability here to mount more than one tab
- Every **Room Participant**, anonymous ones included, may make, edit, move and delete anything: nothing records an author, and nothing is anybody's to protect
- Making a **Timeline Item** or a **Legacy** posts to the chat log; editing, moving and deleting do not, and **Palette** entries do not — what the log is for is the moment somebody adds something everyone now has to live with
- Deleting a **Timeline Item** takes its whole subtree with it; the levels are strict, so an item can never be moved inside itself and no cycle is possible
- A history is capped at 500 **Timeline Items** in total, rather than per level, because what needs bounding is the state broadcast in full to every socket on every change
- Payloads are trimmed and length-checked at the door while stored state is unconstrained: a failed state parse falls back to a blank history, which would silently discard an evening of the table's work
