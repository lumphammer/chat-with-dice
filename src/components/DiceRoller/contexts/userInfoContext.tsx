import type { UserInfo } from "../types";
import { type PropsWithChildren, createContext, memo, useContext } from "react";

const UserInfoContext = createContext<UserInfo | null>(null);

export const UserInfoContextProvider = memo(
  ({ value, children }: PropsWithChildren<{ value: UserInfo }>) => {
    return (
      <UserInfoContext.Provider value={value}>
        {children}
      </UserInfoContext.Provider>
    );
  },
);

export const useUserInfoContext = () => {
  const context = useContext(UserInfoContext);
  if (!context) {
    throw new Error(
      "useUserIdentity must be used within a UserIdentityContextProvider",
    );
  }
  return context;
};
