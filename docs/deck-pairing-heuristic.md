# Deck pairing heuristic: proposing Individual Backs from filenames

Pairing a 78-card deck by hand is miserable, so the Deck settings dialog can
**scan a Deck** and propose Individual Back pairings from Card Image names. The
owner reviews the proposals and applies them; nothing is paired automatically. A
wrong auto-pairing nobody reviewed is worse than no pairing, so the heuristic
errs towards proposing nothing.

Hand-pairing (issue #45) always remains available in the same dialog, so a Deck
the heuristic cannot crack is unharmed and still fully pairable by hand.

The implementation is `src/components/FileManager/proposeIndividualBackPairings.ts`
(pure, unit-tested). This document is the durable record of _which conventions
are supported_ — the code follows it, it does not define it.

## The rule

A name is compared as a list of **lowercase tokens**, split on whitespace, `.`,
`_` and `-`. The file extension is just another token.

Two Card Images are proposed as a **front → back** pair when their token lists
are **identical except at exactly one position**, and at that position one holds
the token `front` and the other holds `back`. The image with `front` is the
front; the image with `back` is its Individual Back.

Examples that pair:

| Front                    | Back                    |
| ------------------------ | ----------------------- |
| `ace-front.png`          | `ace-back.png`          |
| `card_01_front.jpg`      | `card_01_back.jpg`      |
| `Two of Cups front.webp` | `Two of Cups back.webp` |
| `Ace-Front.png`          | `ace-back.png`          |

That last row pairs because matching is case-insensitive on every token, not
just on `front`/`back`.

## What is deliberately _not_ supported

Each of these is left for hand-pairing rather than risk a wrong guess:

- **Glued forms** — `acefront.png` / `aceback.png`. The `front`/`back` word must
  stand as its own delimited token, not be fused into another word. This also
  keeps `affront.png` or `backpack.png` from ever being read as a back.
- **camelCase word joins** — `aceFront.png` / `aceBack.png`. There is no
  delimiter between `ace` and `Front`, so they tokenise as one word.
- **Abbreviations** — `ace-f.png` / `ace-b.png`, or `recto`/`verso`. Only the
  literal words `front` and `back` are recognised.
- **Mismatched extensions** — `ace-front.png` / `ace-back.jpg`. The extension is
  a token and must match.
- **Any other differing token** — `01-front.png` / `02-back.png` differ in the
  card number _as well as_ front/back, so they are two different Cards' faces and
  are never paired.
- **Ambiguous images** — if one image front/back-matches more than one partner,
  every proposal touching it is dropped. Ambiguity is left for the human.

## How re-scanning stays safe

Proposals are computed only from the Deck's currently **unpaired** Cards. A Card
that already has an Individual Back — proposed-and-applied earlier, or set or
corrected by hand — is not a candidate, and an image already serving as a back is
not a Card at all. So re-scanning never clobbers existing pairings; it only ever
proposes among what is still unpaired.

Applying a proposal goes through the same owner-only server action as
hand-pairing (`setDeckIndividualBack`), which re-validates every pairing against
the Deck's live state. The scan only ever _suggests_.
