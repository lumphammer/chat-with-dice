import Logo from "#/assets/logo.svg?react";
import { authClient } from "#/utils/auth-client";
import { NavBarAccount } from "../NavBarAccount";
import { DisplayNameDialog } from "./DisplayNameDialog";
import { UsersOnline } from "./UsersOnline";
import type { ConnectionStatus } from "./types";
import { memo } from "react";

export const Header = memo(
  ({
    connectionStatus,
    roomName,
    usersOnline,
    roomOwnerId,
  }: {
    roomName: string;
    connectionStatus: ConnectionStatus;
    usersOnline: {
      displayName: string;
      chatId: string;
      loggedIn: boolean;
      image?: string | undefined;
    }[];
    roomOwnerId: string;
  }) => {
    const { isPending, data: sessionData } = authClient.useSession();
    const displayName = sessionData?.user.name;
    const loggedIn = sessionData !== null;

    return (
      <header
        className="header relative top-0 left-0 z-10 flex h-12 w-full flex-row
          items-center gap-4 px-4 py-1"
      >
        <div className="header-backdrop" />
        <div className="header-backdrop-edge" />
        <a href="/" className="text-xl">
          <Logo
            aria-label="Chat with Dice logo"
            aria-description="A d6 showing sixes on all sides, with a tail like a speech bubble"
            fill={undefined}
            stroke={undefined}
            className="h-10 w-10
              [&_.dark-part]:fill-[oklch(from_var(--color-neutral)_0.9_c_h)]
              [&_.die-pips]:fill-[oklch(from_var(--color-primary)_0.6_c_h)]
              [&_.light-part]:fill-[oklch(from_var(--color-neutral)_1_c_h)]
              [&_.stroke]:fill-none
              [&_.stroke]:stroke-[oklch(from_var(--color-neutral)_0.7_c_h)]
              [&_.stroke]:stroke-8"
          />
        </a>
        <div className="room-name">{roomName}</div>
        <div className="flex-1" />
        {displayName && (
          <DisplayNameDialog
            displayName={displayName}
            // XXX
            onSetDisplayName={() => {}}
            loggedIn={loggedIn}
            isPending={isPending}
          />
        )}
        {/*<div className="h-(--size) flex-col justify-center">
    Connection status:
  </div>*/}
        <div
          className="text-middle inline-flex h-(--size) flex-col justify-center"
        >
          <span
            data-connection-status={connectionStatus}
            aria-description={connectionStatus}
            className="text-middle inline-block h-3 w-3 rounded-full bg-red-500
              align-baseline data-[connection-status=connected]:bg-green-500"
          ></span>
        </div>
        <UsersOnline usersOnline={usersOnline} roomOwnerId={roomOwnerId} />
        <NavBarAccount initialUser={null} />
      </header>
    );
  },
);
