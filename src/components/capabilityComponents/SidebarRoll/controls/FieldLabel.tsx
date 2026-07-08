import type { ReactNode } from "react";

export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <p
    className="text-base-content/50 mb-1 text-xs font-semibold tracking-wide
      uppercase"
  >
    {children}
  </p>
);
