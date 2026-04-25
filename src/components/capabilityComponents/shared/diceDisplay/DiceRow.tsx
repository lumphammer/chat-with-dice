import type { ReactNode } from "react";

type DiceRowProps = {
  children: ReactNode;
  /** When true, the whole row is dimmed (e.g. losing series in adv/dis) */
  dimmed?: boolean;
};

export function DiceRow({ children, dimmed = false }: DiceRowProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-1 transition-opacity ${
        dimmed ? "opacity-35" : ""
      }`}
    >
      {children}
    </div>
  );
}
