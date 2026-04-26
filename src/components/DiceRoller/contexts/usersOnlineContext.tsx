import type { OnlineUser } from "#/validators/webSocketMessageSchemas";
import { type PropsWithChildren, createContext, memo, useContext } from "react";

const UsersOnlineContext = createContext<OnlineUser[] | null>(null);

export const UsersOnlineContextProvider = memo(
  ({ value, children }: PropsWithChildren<{ value: OnlineUser[] }>) => {
    return (
      <UsersOnlineContext.Provider value={value}>
        {children}
      </UsersOnlineContext.Provider>
    );
  },
);

export const useUsersOnlineContext = () => {
  const context = useContext(UsersOnlineContext);
  if (!context) {
    throw new Error(
      "useUsersOnlineContext must be used within a UsersOnlineContextProvider",
    );
  }
  return context;
};
