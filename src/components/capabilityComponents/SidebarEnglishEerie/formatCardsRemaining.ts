/** "1 card remains" / "18 cards remain" — shared by the sidebar and the chat log. */
export function formatCardsRemaining(count: number): string {
  return count === 1 ? "1 card remains" : `${count} cards remain`;
}
