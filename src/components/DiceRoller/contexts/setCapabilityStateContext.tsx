import { createContext, useContext } from "react";

const setCapabilityStateContext = createContext<
  ((name: string, state: any) => void) | null
>(null);

export const SetCapabilityStateContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: (name: string, state: any) => void;
}) => {
  return (
    <setCapabilityStateContext.Provider value={value}>
      {children}
    </setCapabilityStateContext.Provider>
  );
};

export const useSetCapabilityStateContext = () => {
  const context = useContext(setCapabilityStateContext);
  if (context === null) {
    throw new Error(
      "setCapabilityStateContext must be used within a SetCapabilityStateContextProvider",
    );
  }
  return context;
};
