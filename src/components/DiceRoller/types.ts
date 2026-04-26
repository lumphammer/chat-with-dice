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
