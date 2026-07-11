import type { ReactNode } from "react";

// A labelled form group. The <legend> is both the visible label and the
// group's accessible name — one source of truth — so the controls inside don't
// need their own duplicate aria-label. The fieldset's UA chrome is reset so it
// doesn't disturb layout (daisyUI only styles the `.fieldset` class, not the
// bare element).
export const Fieldset = ({
  label,
  children,
  showLegend = true,
  className,
  disabled,
}: {
  label: string;
  children: ReactNode;
  showLegend?: boolean;
  className?: string;
  disabled?: boolean;
}) => (
  <fieldset
    className={className}
    {...(showLegend ? {} : { "aria-label": label })}
    disabled={disabled}
  >
    {showLegend && (
      <legend className="mb-1 text-xs font-semibold tracking-wide uppercase">
        {label}
      </legend>
    )}
    {children}
  </fieldset>
);
