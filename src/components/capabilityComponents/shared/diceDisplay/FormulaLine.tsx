import type { ReactNode } from "react";

type FormulaLineProps = {
  children: ReactNode;
};

export function FormulaLine({ children }: FormulaLineProps) {
  return <span className="font-mono text-xs opacity-60">{children}</span>;
}
