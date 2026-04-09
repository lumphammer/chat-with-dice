import type { JsonData } from "#/validators/webSocketMessageSchemas";
import { createContext, useContext, type PropsWithChildren } from "react";

type FormulaContextValue = {
  formula: JsonData;
  setFormula: (formula: JsonData) => void;
};

const FormulaContext = createContext<FormulaContextValue | null>(null);

export const FormulaContextProvider = ({
  value,
  children,
}: PropsWithChildren<{ value: FormulaContextValue }>) => {
  return (
    <FormulaContext.Provider value={value}>{children}</FormulaContext.Provider>
  );
};

export const useFormulaContext = () => {
  const value = useContext(FormulaContext);
  if (!value) {
    throw new Error(
      "useFormulaContext must be used within a FormulaContextProvider",
    );
  }
  return value;
};
