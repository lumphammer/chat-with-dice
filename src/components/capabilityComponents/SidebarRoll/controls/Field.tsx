import type { ReactNode } from "react";

type FieldProps = {
  label: string;
  children: ReactNode;
};

// A labelled form group. The <legend> is both the visible label and the
// group's accessible name — one source of truth — so the controls inside don't
// need their own duplicate aria-label. The fieldset's UA chrome is reset so it
// doesn't disturb layout (daisyUI only styles the `.fieldset` class, not the
// bare element).
export const Field = ({ label, children }: FieldProps) => (
  <fieldset className="m-0 min-w-0 border-0 p-0">
    <legend
      className="text-base-content mb-1 p-0 text-xs font-semibold tracking-wide
        uppercase"
    >
      {label}
    </legend>
    {children}
  </fieldset>
);
