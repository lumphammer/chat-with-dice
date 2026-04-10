import { ChevronDownIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  label: string;
  onOpen?: () => void;
  children: ReactNode;
}

export const ExpandableForm = ({ label, onOpen, children }: Props) => (
  <details
    className="bg-base-100 border-base-content/50 open:border-primary
      rounded-box group has-[summary:hover]:border-primary my-4 w-full border
      p-2 transition-colors duration-200"
    onToggle={(e) => {
      if (e.currentTarget.open) {
        onOpen?.();
      }
    }}
  >
    <summary
      className="flex cursor-pointer list-none items-center justify-between
        rounded px-1 py-0.5 text-lg transition-colors group-open:mb-4"
    >
      {label}
      <ChevronDownIcon
        className="text-base-content/60 h-5 w-5 transition-transform
          duration-200 group-open:rotate-180"
      />
    </summary>
    {children}
  </details>
);
