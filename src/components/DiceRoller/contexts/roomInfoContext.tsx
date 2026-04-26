import type { RoomConfig } from "#/validators/roomConfigValidator";
import { type PropsWithChildren, createContext, memo, useContext } from "react";

type RoomInfoContextValue = {
  roomConfig: RoomConfig;
  setRoomConfig: (config: RoomConfig) => void;
  roomName: string;
  setRoomName: (newRoomName: string) => void;
  roomId: string;
  roomOwnerId: string;
};

const RoomInfoContext = createContext<RoomInfoContextValue | null>(null);

export const RoomInfoContextProvider = memo(
  ({ value, children }: PropsWithChildren<{ value: RoomInfoContextValue }>) => {
    return (
      <RoomInfoContext.Provider value={value}>
        {children}
      </RoomInfoContext.Provider>
    );
  },
);

export const useRoomInfoContext = () => {
  const context = useContext(RoomInfoContext);
  if (!context) {
    throw new Error(
      "useRoomConfigContext must be used within a RoomConfigContextProvider",
    );
  }
  return context;
};
