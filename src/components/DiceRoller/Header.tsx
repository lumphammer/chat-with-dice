import Logo from "#/assets/logo.svg?react&illustration";
import { NavBarAccount } from "../NavBarAccount";
import type { ConnectionStatus } from "./types";
import { memo } from "react";
import type { Ref } from "react";

export const Header = memo(
  ({
    connectionStatus,
    ref,
    roomName,
  }: {
    roomName: string;
    connectionStatus: ConnectionStatus;
    ref?: Ref<HTMLElement>;
  }) => {
    return (
      <header
        ref={ref}
        className="header relative top-0 left-0 z-10 flex h-auto w-full flex-row
          flex-nowrap items-center justify-between gap-4 px-4 py-1"
      >
        <a href="/" className="text-xl">
          <Logo
            aria-label="Chat with Dice logo"
            aria-description="A d6 showing sixes on all sides, with a tail like a speech bubble"
            fill={undefined}
            stroke={undefined}
            className="h-10 w-10"
          />
        </a>
        <div className="room-name min-w-0 flex-1 truncate">{roomName}</div>
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
        <NavBarAccount initialUser={null} />
      </header>
    );
  },
);

Header.displayName = "Header";
