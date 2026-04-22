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
        className="border-base-100 bg-base-100 flex flex-row gap-4 border-b px-4
          py-1"
      >
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
