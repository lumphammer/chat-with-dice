import { LoaderCircle } from "lucide-react";

/**
 * Spinner shown over an ImagePreview while its image is still loading. It's
 * mounted only after a brief delay (see ImagePreview) so quick loads don't
 * flash it, and fades in via `animate-fadein`.
 */
export function ImageLoadingOverlay() {
  return (
    <div
      className="animate-fadein pointer-events-none absolute inset-0 flex
        items-center justify-center"
    >
      <LoaderCircle
        size={48}
        className="text-primary animate-spin"
        aria-label="Loading image"
      />
    </div>
  );
}
