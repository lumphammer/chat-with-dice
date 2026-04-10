import { LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  isSaving: boolean;
  children: ReactNode;
}

export const SidebarPanel = ({ title, isSaving, children }: Props) => (
  <div className="relative h-full overflow-scroll p-4">
    {isSaving && (
      <LoaderCircleIcon
        className="text-base-content/40 absolute top-4 right-4 h-5 w-5
          animate-spin"
        aria-label="Saving…"
      />
    )}
    <h2 className="text-3xl">{title}</h2>
    {children}
  </div>
);
