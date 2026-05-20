import type { Patch } from "immer";
import { createContext, useContext } from "react";

type SetCapabilityState = (
  name: string,
  state: any,
  correlation: string,
  patches: Patch[],
) => void;

const setCapabilityStateContext = createContext<SetCapabilityState | null>(
  null,
);

export const SetCapabilityStateContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: SetCapabilityState;
}) => {
  return (
    <setCapabilityStateContext.Provider value={value}>
      {children}
    </setCapabilityStateContext.Provider>
  );
};

export const useSetCapabilityStateContextSafe = () => {
  return useContext(setCapabilityStateContext);
};

export const useSetCapabilityStateContext = () => {
  const context = useSetCapabilityStateContextSafe();
  if (context === null) {
    throw new Error(
      "setCapabilityStateContext must be used within a SetCapabilityStateContextProvider",
    );
  }
  return context;
};
