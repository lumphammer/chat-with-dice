import type { PatchRecord } from "#/capabilities/types";
import { createContext, useContext } from "react";

type InitialisedCapabilityInfo = {
  initialised: true;
  state: unknown;
  patches: PatchRecord[];
  config: unknown;
};

type UninitialisedCapabilityInfo = {
  initialised: false;
};

type CapabilityInfo = UninitialisedCapabilityInfo | InitialisedCapabilityInfo;

export type CapabilityInfoContextValue = Record<
  string,
  InitialisedCapabilityInfo
>;

const capabilityInfoContext = createContext<CapabilityInfoContextValue | null>(
  null,
);

export const CapabilityInfoContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Record<string, InitialisedCapabilityInfo>;
}) => {
  return (
    <capabilityInfoContext.Provider value={value}>
      {children}
    </capabilityInfoContext.Provider>
  );
};

export const useCapabilityInfo = (name: string): CapabilityInfo => {
  const context = useContext(capabilityInfoContext);
  if (context === null) {
    throw new Error(
      "useCapabilityInfo must be used within a CapabilityStateContextProvider",
    );
  }
  return context[name] ?? { initialised: false };
};
