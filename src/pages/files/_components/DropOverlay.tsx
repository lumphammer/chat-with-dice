import { Upload } from "lucide-react";
import { memo } from "react";

export const DropOverlay = memo(() => {
  return (
    <div className="bg-base-300/90 absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary">
      <Upload size={48} className="text-primary" strokeWidth={1.5} />
      <p className="text-lg font-semibold">Drop files here to upload</p>
    </div>
  );
});

DropOverlay.displayName = "DropOverlay";
