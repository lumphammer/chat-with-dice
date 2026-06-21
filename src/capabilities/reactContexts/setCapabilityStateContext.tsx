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

export const useSetCapabilityStateContext = () => {
  return useContext(setCapabilityStateContext);
};
