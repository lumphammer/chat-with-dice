import { type PropsWithChildren, useEffect, useState } from "react";

/**
 * The sliding, absolutely-positioned shell for one panel of the Deck settings
 * dialog. Every panel covers the dialog's stage, so only the topmost is seen —
 * which is how the old three levels of nested scrolling collapse to one.
 *
 * A panel's own content goes in a {@link PanelBody} (which handles being covered
 * by a child panel); any child route is rendered as a *sibling* of that body,
 * inside this frame, so the child stays interactive while the body beneath it is
 * made inert.
 *
 * Sub-panels (`slide`) swish in from the right with a Tailwind transform
 * transition, disabled under `prefers-reduced-motion`.
 */
export const PanelFrame = ({
  slide = false,
  children,
}: PropsWithChildren<{ slide?: boolean }>) => {
  // Slide in on mount: start off to the right, then transition to rest one frame
  // later so the browser has a "from" position to animate out of.
  const [shown, setShown] = useState(!slide);
  useEffect(() => {
    if (!slide) {
      return;
    }
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, [slide]);

  const slideClasses = slide
    ? `transition-transform duration-300 ease-out motion-reduce:transition-none ${
        shown ? "translate-x-0" : "translate-x-full motion-reduce:translate-x-0"
      }`
    : "";

  return (
    <section className={`absolute inset-0 ${slideClasses}`}>{children}</section>
  );
};

PanelFrame.displayName = "PanelFrame";
