import { Link, useNavigationContext } from "#/lib/minirouter";
import { ChevronLeft } from "lucide-react";
import { type PropsWithChildren, useEffect, useRef } from "react";

/**
 * The content shell for a panel: an optional Back header and a single scrolling
 * body. When a child route is open this panel is `covered` — it stays mounted
 * (keeping its scroll position and state) but is hidden with `visibility:hidden`
 * and made `inert`, so it takes no paint (the panels have no background of their
 * own — the modal's shows through) and focus and assistive tech skip it while
 * the child panel is on top. The child route sits *outside* this body (as a
 * sibling in the {@link PanelFrame}), so it stays visible and interactive.
 */
export const PanelBody = ({
  back = false,
  children,
}: PropsWithChildren<{ back?: boolean }>) => {
  const { currentStep } = useNavigationContext();
  const covered = currentStep != null;

  // Move focus onto a sub-panel when it opens, and back onto it when its own
  // child closes, so keyboard users always sit on the panel they can see.
  // preventScroll avoids a fight with the slide transform.
  const backRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (back && !covered) {
      backRef.current?.focus({ preventScroll: true });
    }
  }, [back, covered]);

  return (
    <div
      inert={covered}
      className={`absolute inset-0 flex flex-col ${covered ? "invisible" : ""}`}
    >
      {back && (
        <div className="flex-none">
          <Link ref={backRef} to="up" className="btn btn-ghost btn-sm gap-1">
            <ChevronLeft size={18} />
            Back
          </Link>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto p-1">{children}</div>
    </div>
  );
};

PanelBody.displayName = "PanelBody";
