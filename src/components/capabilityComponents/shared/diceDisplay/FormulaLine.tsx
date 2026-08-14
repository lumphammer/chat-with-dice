import type { ReactNode } from "react";

type FormulaLineProps = {
  children: ReactNode;
};

export function FormulaLine({ children }: FormulaLineProps) {
  return <span className="text-sm">{children}</span>;
}
