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

export type UserInfo = {
  displayName: string | null;
  chatId: string | null;
  isOwner: boolean;
  isPending: boolean;
  roomOwnerId: string;
} & (
  | { loggedIn: false; handleSetDisplayName: (newDisplayName: string) => void }
  | { loggedIn: true; handleSetDisplayName: null }
);
