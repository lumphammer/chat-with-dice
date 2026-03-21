export const specials = [
  "Normal",
  "With Advantage",
  "With Disadvantage",
  "Exploding",
] as const;
export type Special = (typeof specials)[number];

export const operators = ["+", "-", "*", "/"] as const;
export type Operator = (typeof operators)[number];
