import { type PropsWithChildren, createContext, memo, useContext } from "react";

type UserIdentityContextValue = { username: string; userId: string };

const UserIdentityContext = createContext<UserIdentityContextValue | null>(
  null,
);

export const UserIdentityContextProvider = memo(
  ({
    value,
    children,
  }: PropsWithChildren<{ value: UserIdentityContextValue }>) => {
    return (
      <UserIdentityContext.Provider value={value}>
        {children}
      </UserIdentityContext.Provider>
    );
  },
);

export const useUserIdentityContext = () => {
  const context = useContext(UserIdentityContext);
  if (!context) {
    throw new Error(
      "useUserIdentity must be used within a UserIdentityContextProvider",
    );
  }
  return context;
};
