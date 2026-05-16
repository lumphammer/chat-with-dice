import { LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title?: string;
  isSaving: boolean;
  children: ReactNode;
}

export const SidebarPanel = ({ title, isSaving, children }: Props) => (
  <div className="absolute inset-0 flex flex-col p-4">
    {isSaving && (
      <LoaderCircleIcon
        className="text-base-content/40 absolute top-4 right-4 h-5 w-5
          animate-spin"
        aria-label="Saving…"
      />
    )}
    {title && <h2 className="heading">{title}</h2>}
    <div className="relative flex-1 overflow-x-hidden overflow-y-scroll">
      {children}
    </div>
  </div>
);
