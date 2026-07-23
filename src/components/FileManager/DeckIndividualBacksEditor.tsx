/**
 * The shape of a Card as the Deck settings dialog handles it: the front Image,
 * its name, and the Image paired as its Individual Back (if any). The old
 * stacked Individual Backs *editor* that lived here has been replaced by the
 * routed panels under {@link ../deckSettings}; this module remains the home of
 * the shared `DeckCard` type that those panels and the pairing-proposal
 * components all depend on.
 */
export type DeckCard = {
  nodeId: string;
  name: string;
  individualBack: { nodeId: string; name: string } | null;
};
