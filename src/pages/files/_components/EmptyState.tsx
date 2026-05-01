import { FolderOpen } from "lucide-react";
import { memo } from "react";

export const EmptyState = memo(() => {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-base-content/50">
      <FolderOpen size={48} strokeWidth={1} />
      <p>No files or folders here yet</p>
      <p className="text-sm">Upload files or create a folder to get started</p>
    </div>
  );
});

EmptyState.displayName = "EmptyState";
