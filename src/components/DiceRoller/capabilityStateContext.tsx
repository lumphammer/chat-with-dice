import { createContext, useContext } from "react";

const capabilityStateContext = createContext<Record<string, unknown> | null>(
  null,
);

export const CapabilityStateContextProvider = ({
  children,
  value,
}: {
  children: React.ReactNode;
  value: Record<string, unknown>;
}) => {
  return (
    <capabilityStateContext.Provider value={value}>
      {children}
    </capabilityStateContext.Provider>
  );
};

export const useCapabilityState = () => {
  const context = useContext(capabilityStateContext);
  if (context === null) {
    throw new Error(
      "useCapabilityState must be used within a CapabilityStateContextProvider",
    );
  }
  return context;
};
