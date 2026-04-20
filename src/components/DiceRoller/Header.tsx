import { DisplayNameDialog } from "./DisplayNameDialog";
import { UsersOnline } from "./UsersOnline";
import { useUserInfoContext } from "./contexts/userInfoContext";
import type { ConnectionStatus } from "./types";
import { memo } from "react";

export const Header = memo(
  ({
    connectionStatus,
    roomName,
    usersOnline,
  }: {
    roomName: string;
    connectionStatus: ConnectionStatus;
    usersOnline: {
      displayName: string;
      chatId: string;
      loggedIn: boolean;
      image?: string | undefined;
    }[];
  }) => {
    const {
      displayName,
      handleSetDisplayName,
      loggedIn,
      isPending,
      chatId,
      roomOwnerId,
    } = useUserInfoContext();

    return (
      <header
        className="border-base-100 bg-base-100 flex flex-row gap-4 border-b px-4
          py-1"
      >
        <div className="room-name">{roomName}</div>
        <div className="flex-1" />
        <DisplayNameDialog
          displayName={displayName}
          onSetDisplayName={handleSetDisplayName}
          loggedIn={loggedIn}
          isPending={isPending}
        />
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
        <UsersOnline
          usersOnline={usersOnline}
          chatId={chatId}
          roomOwnerId={roomOwnerId}
        />
      </header>
    );
  },
);
