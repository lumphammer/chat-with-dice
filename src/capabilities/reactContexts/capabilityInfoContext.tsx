import type { PatchRecord } from "#/capabilities/createClientCapability";
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
  return context?.[name] ?? { initialised: false };
};
