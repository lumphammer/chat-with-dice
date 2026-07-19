/**
 * The filename heuristic behind "scan a Deck for Individual Back pairings"
 * (issue #46). Pure and side-effect-free so it can be unit-tested on names
 * alone; the review UI ({@link ./DeckPairingProposals}) turns its output into
 * proposals the owner accepts or corrects, and nothing is applied without the
 * server re-validating each pairing.
 *
 * The one convention supported: two Card Image names that are identical except
 * that one carries a `front` token where the other carries a `back` token are
 * proposed as a front→back pair. Names are compared as lowercase tokens split on
 * whitespace, `.`, `_` and `-`, so the `front`/`back` word must stand as its own
 * delimited token (`ace-front.png` ↔ `ace-back.png`), not be glued into another
 * word (`acefront.png` is left alone). The extension is just another token, so a
 * front and its back must share it. The supported and unsupported conventions
 * are written up durably in `docs/deck-pairing-heuristic.md`.
 *
 * Anything the heuristic cannot crack is left for hand-pairing (issue #45),
 * which always remains available — a wrong auto-pairing nobody reviewed is worse
 * than no pairing, so this errs towards proposing nothing.
 */

export type PairingProposal = {
  front: { nodeId: string; name: string };
  back: { nodeId: string; name: string };
};

type NamedImage = { nodeId: string; name: string };

const FRONT_TOKEN = "front";
const BACK_TOKEN = "back";

/**
 * Split a name into lowercase tokens on the delimiters that separate words in
 * real filenames — whitespace, dot, underscore, hyphen — dropping the empty
 * tokens that leading or repeated delimiters would produce. Lowercasing makes
 * the comparison case-insensitive (`Card-Front.png` ↔ `card-back.png`).
 */
function tokenize(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter((token) => token.length > 0);
}

/**
 * If two token lists are identical except at exactly one position — where one
 * holds `front` and the other `back` — say which side is the front. Otherwise
 * `null`: a difference in more than one token (e.g. a different card number as
 * well) is deliberately not a match, so fronts and backs of different Cards are
 * never paired.
 */
function frontBackOrientation(a: string[], b: string[]): "a" | "b" | null {
  if (a.length !== b.length) {
    return null;
  }
  let diffIndex = -1;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      if (diffIndex !== -1) {
        return null;
      }
      diffIndex = i;
    }
  }
  if (diffIndex === -1) {
    return null;
  }
  const aToken = a[diffIndex];
  const bToken = b[diffIndex];
  if (aToken === FRONT_TOKEN && bToken === BACK_TOKEN) {
    return "a";
  }
  if (aToken === BACK_TOKEN && bToken === FRONT_TOKEN) {
    return "b";
  }
  return null;
}

/**
 * Propose front→Individual Back pairings from Card Image names. Feed it only the
 * Cards that are still unpaired, so a re-scan never disturbs pairings the owner
 * already made or corrected by hand.
 *
 * An image that front/back-matches more than one partner is ambiguous, so every
 * proposal touching it is dropped rather than guessed at — again preferring no
 * pairing to a wrong one.
 */
export function proposeIndividualBackPairings(
  cards: NamedImage[],
): PairingProposal[] {
  const tokenized = cards.map((card) => ({
    card,
    tokens: tokenize(card.name),
  }));

  const rawProposals: PairingProposal[] = [];
  for (let i = 0; i < tokenized.length; i++) {
    for (let j = i + 1; j < tokenized.length; j++) {
      const orientation = frontBackOrientation(
        tokenized[i].tokens,
        tokenized[j].tokens,
      );
      if (orientation === null) {
        continue;
      }
      const front = orientation === "a" ? tokenized[i].card : tokenized[j].card;
      const back = orientation === "a" ? tokenized[j].card : tokenized[i].card;
      rawProposals.push({ front, back });
    }
  }

  // Drop any proposal whose front or back also appears in another proposal: an
  // image with more than one candidate partner is ambiguous and left for hand.
  const participation = new Map<string, number>();
  for (const proposal of rawProposals) {
    for (const nodeId of [proposal.front.nodeId, proposal.back.nodeId]) {
      participation.set(nodeId, (participation.get(nodeId) ?? 0) + 1);
    }
  }
  return rawProposals.filter(
    (proposal) =>
      participation.get(proposal.front.nodeId) === 1 &&
      participation.get(proposal.back.nodeId) === 1,
  );
}
