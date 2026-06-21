export function screamingSnakeToCamel(input: string): string {
  return input
    .toLowerCase()
    .split("_")
    .map((part, index) =>
      index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join("");
}
