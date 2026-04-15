import type { RoomConfig } from "#/validators/roomConfigValidator";
import { type PropsWithChildren, createContext, memo, useContext } from "react";

type RoomConfigContextValue = {
  roomConfig: RoomConfig;
  setRoomConfig: (config: RoomConfig) => void;
  roomName: string;
  setRoomName: (newRoomName: string) => void;
};

const RoomConfigContext = createContext<RoomConfigContextValue | null>(null);

export const RoomConfigContextProvider = memo(
  ({
    value,
    children,
  }: PropsWithChildren<{ value: RoomConfigContextValue }>) => {
    return (
      <RoomConfigContext.Provider value={value}>
        {children}
      </RoomConfigContext.Provider>
    );
  },
);

export const useRoomConfigContext = () => {
  const context = useContext(RoomConfigContext);
  if (!context) {
    throw new Error(
      "useRoomConfigContext must be used within a RoomConfigContextProvider",
    );
  }
  return context;
};
