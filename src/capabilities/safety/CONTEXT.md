# Safety

The Safety capability provides always-on safety tools — interrupt signals and a running list of avoided subjects — available to every Room Participant regardless of role, and which the Room owner cannot switch off.

## Language

**Avoid List**:
A **Room**'s whole set of **Avoided Subjects**, shown as one shared list with each entry's author named.

**Avoided Subject**:
One subject a **Room Participant** has asked the table to steer clear of.
Attributed: the whole **Room** sees who asked for it, as a table would if you said it out loud or wrote it on a shared sheet. Its author can remove it, and so can the **Room** owner.
_Contrast_: a **Safety Signal**, which may be **Unattributed** — an in-the-moment interrupt is a different act from a session-zero statement

**Pause**:
The mild **Safety Signal**: hold on a moment. Same mechanism as an **X Card**, lower severity, and dismissible with any gesture rather than a deliberate one.

**Safety Signal**:
A room-wide interrupt raised by a **Room Participant**, which takes over every participant's screen and leaves a record in the chat log. Two kinds: **X Card** and **Pause**. May be **Unattributed**.

**Unattributed**:
Of a **Safety Signal**: raised without recording who raised it. The raiser's identity exists for the lifetime of one WebSocket frame and is then discarded — the chat log, the message store, and the **Room** owner all know only the sentinel author. There is deliberately no audit trail to consult later.
Shown to users as "anonymous".
_Avoid_: Anonymous (in code — it already means a guest account)

**X Card**:
The severe **Safety Signal**: stop, rewind, move on. No explanation is required or invited, and acknowledging it is a deliberate act rather than a stray click.

## Relationships

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
- Attribution is where a **Safety Signal** and an **Avoided Subject** deliberately differ: a signal is a momentary interrupt and may be **Unattributed**, because in the moment the cost of being seen to raise one is what stops people raising it; an **Avoided Subject** is a session-zero statement and is always attributed

## Flagged ambiguities

- "anonymous" is ambiguous between **Unattributed** (no author recorded for a **Safety Signal**) and an anonymous **Room Participant** (a guest account, `isAnonymous`). The two are independent. User-facing copy says "anonymous" for the former because it is the plainer word; code and docs say **Unattributed**.
- **Unattributed** applies only to a **Safety Signal**. An **Avoided Subject** is never unattributed, so "anonymous safety tools" is not a description of this app — say which of the two you mean.
- **Unattributed** is about what is _recorded_, not about what can be _inferred_. In a small **Room**, timing alone can give the raiser away, and no amount of server-side redaction changes that — so the tools should not be sold on their anonymity.
- "the X card" is normal speech for raising one, and is fine in user-facing copy on the same grounds as "drawing from a deck".
