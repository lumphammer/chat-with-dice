export type ConnectionStatus = "connected" | "disconnected" | "error";

/**
 * type for style object with added property
 *
 * usage:
 *
 * <element
 *  style={{"--user-hue": userHue} satisfies UserHueStyle as UserHueStyle}
 * >
 */
export type UserHueStyle = React.CSSProperties & { "--user-hue": number };

export const specials = [
  "Normal",
  "With Advantage",
  "With Disadvantage",
  "Exploding",
] as const;
export type Special = (typeof specials)[number];

export const operators = ["+", "-", "*", "/"] as const;
export type Operator = (typeof operators)[number];
