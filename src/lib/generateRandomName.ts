import { adjectives, nouns } from "#/lib/words";

export function generateRandomName() {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  // convert to title case
  const adjTitleCase = adjective.charAt(0).toUpperCase() + adjective.slice(1);
  const nounTitleCase = noun.charAt(0).toUpperCase() + noun.slice(1);
  return `${adjTitleCase} ${nounTitleCase}`;
}
